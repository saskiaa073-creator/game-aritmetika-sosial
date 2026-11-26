"""Server Pasar Pintar (FastAPI).

Jalankan dari folder utama proyek (atau klik dua kali start.bat):
    .venv\\Scripts\\python.exe -m uvicorn apps.api.main:create_app --factory --reload
"""

# Catatan: sengaja TANPA "from __future__ import annotations", karena FastAPI
# perlu membaca tipe Annotated[...] yang didefinisikan di dalam create_app().
import csv
import io
import re
import secrets
from collections import Counter
from datetime import date, datetime, timedelta, timezone
from typing import Annotated, Any

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .auth import baca_token, buat_token, cocokkan_kata_sandi, hash_kata_sandi
from .config import Pengaturan, muat_pengaturan
from .db import Jawaban, Kelas, Pengguna, siapkan_database
from .engine import periksa
from .konten import Konten, modul_publik

WIB = timezone(timedelta(hours=7))
POLA_USERNAME = re.compile(r"^[a-z0-9_]{3,20}$")
POLA_PANGGILAN = re.compile(r"^[A-Za-z0-9 ]{2,15}$")
HURUF_KODE = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
BATAS_SALAH_PEMBAHASAN = 3


# ---------------------------------------------------------------- skema


class DaftarMasuk(BaseModel):
    username: str = Field(min_length=3, max_length=20)
    nama_panggilan: str = Field(min_length=2, max_length=15)
    password: str = Field(min_length=6, max_length=72)
    kode_kelas: str | None = Field(default=None, max_length=6)


class MasukMasuk(BaseModel):
    username: str = Field(max_length=20)
    password: str = Field(max_length=72)


class JawabMasuk(BaseModel):
    jawaban: str = Field(max_length=200)
    petunjuk_dipakai: int = Field(default=0, ge=0, le=3)


class KodeMasuk(BaseModel):
    kode: str = Field(min_length=6, max_length=6)


class KelasMasuk(BaseModel):
    nama: str = Field(min_length=2, max_length=40)


# ---------------------------------------------------------------- bantuan


def sekarang_utc() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def hari_ini_wib() -> date:
    return datetime.now(WIB).date()


def poin_untuk(petunjuk_dipakai: int) -> int:
    """Benar pertama kali: 10 poin, berkurang 2 per petunjuk, minimal 4."""
    return max(10 - 2 * petunjuk_dipakai, 4)


def hitung_streak(tanggal_aktif: set[date], hari_ini: date) -> int:
    """Jumlah hari berturut-turut dengan minimal satu jawaban benar."""
    hari = hari_ini if hari_ini in tanggal_aktif else hari_ini - timedelta(days=1)
    jumlah = 0
    while hari in tanggal_aktif:
        jumlah += 1
        hari -= timedelta(days=1)
    return jumlah


def kategori_nilai(nilai: int) -> str:
    """Kategori sama dengan versi Streamlit sebelumnya."""
    if nilai >= 86:
        return "Sangat Baik"
    if nilai >= 71:
        return "Baik"
    if nilai >= 56:
        return "Cukup"
    return "Perlu Bimbingan"


def hitung_hasil_tes(modul: dict[str, Any], jawaban: list[Jawaban]) -> dict[str, Any]:
    """Skor tes dari JAWABAN PERTAMA yang terbaca (bukan 'tidak_valid') untuk setiap tahap."""
    pertama: dict[str, str] = {}
    for j in sorted(jawaban, key=lambda j: j.id):
        if j.status != "tidak_valid" and j.soal_id not in pertama:
            pertama[j.soal_id] = j.status
    butir = []
    for nomor, info in modul["butir"].items():
        soal_butir = [s for s in modul["soal"] if str(s["butir"]) == nomor]
        butir.append({
            "nomor": int(nomor), "judul": info["judul"], "indikator": info["indikator"],
            "skor": sum(s["skor"] for s in soal_butir if pertama.get(s["id"]) == "benar"),
            "maks": sum(s["skor"] for s in soal_butir),
        })
    total, maks = sum(b["skor"] for b in butir), sum(b["maks"] for b in butir)
    nilai = (total * 200 + maks) // (2 * maks)  # dibulatkan setengah ke atas
    return {
        "butir": butir, "total": total, "maks": maks, "nilai": nilai, "kategori": kategori_nilai(nilai),
        "tahap_dijawab": len(pertama), "jumlah_tahap": len(modul["soal"]),
        "status_pertama": {sid: pertama[sid] for sid in pertama if any(s["id"] == sid for s in modul["soal"])},
    }


def buat_kode_kelas(db: Session) -> str:
    while True:
        kode = "".join(secrets.choice(HURUF_KODE) for _ in range(6))
        if db.scalar(select(Kelas).where(Kelas.kode == kode)) is None:
            return kode


def isi_demo(db: Session, pengaturan: Pengaturan) -> None:
    """Akun demo untuk uji coba lokal (hanya bila DEMO_SEED=1)."""
    if db.scalar(select(Pengguna).where(Pengguna.username == "guru_demo")) is not None:
        return
    guru = Pengguna(username="guru_demo", nama_panggilan="Bu Guru", peran="guru", dibuat=sekarang_utc(),
                    password_hash=hash_kata_sandi("guru12345", pengaturan.pbkdf2_iterasi))
    db.add(guru)
    db.flush()
    kelas = Kelas(nama="VII A (demo)", kode="DEMO77", guru_id=guru.id, dibuat=sekarang_utc())
    db.add(kelas)
    db.flush()
    db.add(Pengguna(username="siswa_demo", nama_panggilan="Siswa Demo", peran="siswa", kelas_id=kelas.id,
                    dibuat=sekarang_utc(), password_hash=hash_kata_sandi("siswa12345", pengaturan.pbkdf2_iterasi)))
    db.commit()


# ---------------------------------------------------------------- aplikasi


def create_app(pengaturan: Pengaturan | None = None) -> FastAPI:
    pengaturan = pengaturan or muat_pengaturan()
    SesiDB = siapkan_database(pengaturan.database_url)
    konten = Konten(pengaturan.folder_konten)
    if pengaturan.demo_seed:
        with SesiDB() as db:
            isi_demo(db, pengaturan)

    app = FastAPI(title="Pasar Pintar API", docs_url="/api/docs", openapi_url="/api/openapi.json")
    app.state.pengaturan = pengaturan
    app.state.konten = konten
    if pengaturan.allowed_origins:
        app.add_middleware(CORSMiddleware, allow_origins=pengaturan.allowed_origins,
                           allow_methods=["GET", "POST"], allow_headers=["Authorization", "Content-Type"])

    bearer = HTTPBearer(auto_error=False)

    def ambil_db():
        with SesiDB() as db:
            yield db

    DB = Annotated[Session, Depends(ambil_db)]

    def pengguna_saat_ini(db: DB, kred: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)]) -> Pengguna:
        pid = baca_token(kred.credentials, pengaturan.secret_key) if kred else None
        pengguna = db.get(Pengguna, pid) if pid is not None else None
        if pengguna is None:
            raise HTTPException(401, "Silakan masuk dulu.")
        return pengguna

    Saya = Annotated[Pengguna, Depends(pengguna_saat_ini)]

    def hanya_guru(saya: Saya) -> Pengguna:
        if saya.peran != "guru":
            raise HTTPException(403, "Halaman ini khusus guru.")
        return saya

    Guru = Annotated[Pengguna, Depends(hanya_guru)]

    def kelas_milik(db: Session, guru: Pengguna, kelas_id: int) -> Kelas:
        kelas = db.get(Kelas, kelas_id)
        if kelas is None or kelas.guru_id != guru.id:
            raise HTTPException(404, "Kelas tidak ditemukan.")
        return kelas

    def token_untuk(p: Pengguna) -> dict[str, Any]:
        return {"token": buat_token(p.id, p.peran, pengaturan.secret_key, pengaturan.token_jam),
                "peran": p.peran, "nama_panggilan": p.nama_panggilan}

    # ----------------------------------------------------------- akun

    @app.post("/api/auth/daftar")
    def daftar(data: DaftarMasuk, db: DB):
        username = data.username.strip().lower()
        panggilan = " ".join(data.nama_panggilan.split())
        if not POLA_USERNAME.fullmatch(username):
            raise HTTPException(422, "Nama pengguna 3–20 karakter: huruf kecil, angka, atau garis bawah.")
        if not POLA_PANGGILAN.fullmatch(panggilan):
            raise HTTPException(422, "Nama panggilan 2–15 huruf atau angka. Jangan pakai nama lengkap.")
        if db.scalar(select(Pengguna).where(Pengguna.username == username)) is not None:
            raise HTTPException(409, "Nama pengguna sudah dipakai. Coba yang lain.")
        kelas_id = None
        if data.kode_kelas:
            kelas = db.scalar(select(Kelas).where(Kelas.kode == data.kode_kelas.strip().upper()))
            if kelas is None:
                raise HTTPException(404, "Kode kelas tidak ditemukan.")
            kelas_id = kelas.id
        p = Pengguna(username=username, nama_panggilan=panggilan, peran="siswa", kelas_id=kelas_id,
                     password_hash=hash_kata_sandi(data.password, pengaturan.pbkdf2_iterasi), dibuat=sekarang_utc())
        db.add(p)
        db.commit()
        return token_untuk(p)

    @app.post("/api/auth/masuk")
    def masuk(data: MasukMasuk, db: DB):
        p = db.scalar(select(Pengguna).where(Pengguna.username == data.username.strip().lower()))
        if p is None or not cocokkan_kata_sandi(data.password, p.password_hash):
            raise HTTPException(401, "Nama pengguna atau kata sandi salah.")
        return token_untuk(p)

    @app.get("/api/saya")
    def saya_info(saya: Saya, db: DB):
        jawaban = db.scalars(select(Jawaban).where(Jawaban.pengguna_id == saya.id)).all()
        hari_ini = hari_ini_wib()
        kelas = db.get(Kelas, saya.kelas_id) if saya.kelas_id else None
        return {
            "username": saya.username,
            "nama_panggilan": saya.nama_panggilan,
            "peran": saya.peran,
            "kelas": kelas.nama if kelas else None,
            "poin_total": sum(j.poin for j in jawaban),
            "poin_hari_ini": sum(j.poin for j in jawaban if j.tanggal == hari_ini),
            "sasaran_harian": pengaturan.sasaran_harian,
            "streak": hitung_streak({j.tanggal for j in jawaban if j.status == "benar"}, hari_ini),
        }

    @app.post("/api/kelas/gabung")
    def gabung_kelas(data: KodeMasuk, saya: Saya, db: DB):
        kelas = db.scalar(select(Kelas).where(Kelas.kode == data.kode.strip().upper()))
        if kelas is None:
            raise HTTPException(404, "Kode kelas tidak ditemukan.")
        saya.kelas_id = kelas.id
        db.add(saya)
        db.commit()
        return {"kelas": kelas.nama}

    # ----------------------------------------------------------- belajar

    @app.get("/api/modul")
    def daftar_modul(saya: Saya, db: DB):
        benar = set(db.scalars(select(Jawaban.soal_id).where(Jawaban.pengguna_id == saya.id,
                                                             Jawaban.status == "benar")).all())
        return [{
            "id": m["id"], "judul": m["judul"], "tujuan": m["tujuan"], "level": m["level"],
            "jenis": m.get("jenis", "latihan"), "jumlah_soal": len(m["soal"]),
            "soal_benar": sum(1 for s in m["soal"] if s["id"] in benar),
        } for m in konten.modul.values()]

    @app.get("/api/modul/{modul_id}")
    def ambil_modul(modul_id: str, saya: Saya):
        modul = konten.modul.get(modul_id)
        if modul is None:
            raise HTTPException(404, "Modul tidak ditemukan.")
        return modul_publik(modul)

    @app.get("/api/modul/{modul_id}/hasil")
    def hasil_tes(modul_id: str, saya: Saya, db: DB):
        modul = konten.modul.get(modul_id)
        if modul is None or modul.get("jenis") != "tes":
            raise HTTPException(404, "Tes tidak ditemukan.")
        jawaban = db.scalars(select(Jawaban).where(Jawaban.pengguna_id == saya.id, Jawaban.modul_id == modul_id)).all()
        return hitung_hasil_tes(modul, list(jawaban))

    @app.post("/api/soal/{soal_id}/jawab")
    def jawab(soal_id: str, data: JawabMasuk, saya: Saya, db: DB):
        if soal_id not in konten.soal:
            raise HTTPException(404, "Soal tidak ditemukan.")
        modul_id, soal = konten.soal[soal_id]
        hasil = periksa(soal, data.jawaban)
        sebelumnya = db.scalars(select(Jawaban).where(Jawaban.pengguna_id == saya.id,
                                                      Jawaban.soal_id == soal_id)).all()
        sudah_benar = any(j.status == "benar" for j in sebelumnya)
        poin = poin_untuk(data.petunjuk_dipakai) if hasil["benar"] and not sudah_benar else 0
        db.add(Jawaban(pengguna_id=saya.id, modul_id=modul_id, soal_id=soal_id, jawaban=data.jawaban[:40],
                       status=hasil["status"], kode_kesalahan=hasil["kode"], petunjuk_dipakai=data.petunjuk_dipakai,
                       poin=poin, waktu=sekarang_utc(), tanggal=hari_ini_wib()))
        db.commit()
        jumlah_salah = sum(1 for j in sebelumnya if j.status == "salah") + (hasil["status"] == "salah")
        respons = {**hasil, "poin": poin}
        # Pembahasan (berisi jawaban) baru dikirim setelah benar atau setelah 3 kali salah.
        if hasil["benar"] or jumlah_salah >= BATAS_SALAH_PEMBAHASAN:
            respons["pembahasan"] = soal["pembahasan"]
        return respons

    @app.get("/api/glosarium")
    def glosarium():
        return konten.glosarium

    @app.get("/api/peringkat")
    def peringkat(saya: Saya, db: DB, lingkup: str = "kelas"):
        q = (select(Pengguna.id, Pengguna.nama_panggilan, func.coalesce(func.sum(Jawaban.poin), 0).label("poin"))
             .join(Jawaban, Jawaban.pengguna_id == Pengguna.id, isouter=True)
             .where(Pengguna.peran == "siswa").group_by(Pengguna.id, Pengguna.nama_panggilan))
        if lingkup == "kelas" and saya.kelas_id:
            q = q.where(Pengguna.kelas_id == saya.kelas_id)
        baris = db.execute(q.order_by(func.coalesce(func.sum(Jawaban.poin), 0).desc(), Pengguna.id).limit(20)).all()
        return [{"peringkat": i + 1, "nama_panggilan": b.nama_panggilan, "poin": int(b.poin), "saya": b.id == saya.id}
                for i, b in enumerate(baris)]

    # ----------------------------------------------------------- guru

    @app.get("/api/guru/kelas")
    def kelas_guru(guru: Guru, db: DB):
        daftar = db.scalars(select(Kelas).where(Kelas.guru_id == guru.id).order_by(Kelas.id)).all()
        return [{"id": k.id, "nama": k.nama, "kode": k.kode,
                 "jumlah_siswa": db.scalar(select(func.count()).where(Pengguna.kelas_id == k.id))} for k in daftar]

    @app.post("/api/guru/kelas")
    def buat_kelas(data: KelasMasuk, guru: Guru, db: DB):
        kelas = Kelas(nama=data.nama.strip(), kode=buat_kode_kelas(db), guru_id=guru.id, dibuat=sekarang_utc())
        db.add(kelas)
        db.commit()
        return {"id": kelas.id, "nama": kelas.nama, "kode": kelas.kode}

    def data_ringkasan(db: Session, kelas: Kelas) -> dict[str, Any]:
        siswa = db.scalars(select(Pengguna).where(Pengguna.kelas_id == kelas.id, Pengguna.peran == "siswa")
                           .order_by(Pengguna.nama_panggilan)).all()
        semua = db.scalars(select(Jawaban).where(Jawaban.pengguna_id.in_([s.id for s in siswa]))).all()
        per_siswa: dict[int, list[Jawaban]] = {s.id: [] for s in siswa}
        for j in semua:
            per_siswa[j.pengguna_id].append(j)

        def pesan_kesalahan(soal_id: str, kode: str) -> str:
            _, soal = konten.soal.get(soal_id, ("", {}))
            for k in soal.get("kesalahan_umum", []):
                if k["kode"] == kode:
                    return k["pesan"]
            return {"salah": "Jawaban salah lainnya", "persen_tak_wajar": "Persentase lebih dari 100%"}.get(kode, kode)

        hitung = Counter((j.soal_id, j.kode_kesalahan) for j in semua if j.status == "salah")
        kesalahan = [{"soal_id": sid, "soal": konten.soal[sid][1]["teks"] if sid in konten.soal else sid,
                      "kode": kode, "pesan": pesan_kesalahan(sid, kode), "jumlah": n}
                     for (sid, kode), n in hitung.most_common(10)]
        modul_tes = [m for m in konten.modul.values() if m.get("jenis") == "tes"]
        skor_tes_maks = sum(s["skor"] for m in modul_tes for s in m["soal"])
        baris = []
        for s in siswa:
            js = per_siswa[s.id]
            salah_siswa = Counter(j.kode_kesalahan for j in js if j.status == "salah")
            baris.append({
                "nama_panggilan": s.nama_panggilan, "username": s.username,
                "poin": sum(j.poin for j in js),
                "soal_benar": len({j.soal_id for j in js if j.status == "benar"}),
                "jumlah_jawaban": len(js),
                "kesalahan_terbanyak": salah_siswa.most_common(1)[0][0] if salah_siswa else "-",
                "skor_tes": sum(hitung_hasil_tes(m, [j for j in js if j.modul_id == m["id"]])["total"]
                                for m in modul_tes),
            })
        return {"kelas": {"id": kelas.id, "nama": kelas.nama, "kode": kelas.kode},
                "jumlah_soal": len(konten.soal), "skor_tes_maks": skor_tes_maks,
                "siswa": baris, "kesalahan_umum": kesalahan}

    @app.get("/api/guru/kelas/{kelas_id}/ringkasan")
    def ringkasan_kelas(kelas_id: int, guru: Guru, db: DB):
        return data_ringkasan(db, kelas_milik(db, guru, kelas_id))

    @app.get("/api/guru/kelas/{kelas_id}/ekspor.csv")
    def ekspor_csv(kelas_id: int, guru: Guru, db: DB):
        data = data_ringkasan(db, kelas_milik(db, guru, kelas_id))
        buf = io.StringIO()
        # Titik koma: agar langsung terbaca rapi di Excel berbahasa Indonesia.
        tulis = csv.writer(buf, delimiter=";")
        tulis.writerow(["nama_panggilan", "username", "poin", "soal_benar", "jumlah_jawaban",
                        "kesalahan_terbanyak", f"skor_tes_dari_{data['skor_tes_maks']}"])
        for b in data["siswa"]:
            tulis.writerow([b["nama_panggilan"], b["username"], b["poin"], b["soal_benar"],
                            b["jumlah_jawaban"], b["kesalahan_terbanyak"], b["skor_tes"]])
        nama_berkas = f"rekap_{data['kelas']['kode']}.csv"
        return Response("﻿" + buf.getvalue(), media_type="text/csv; charset=utf-8",
                        headers={"Content-Disposition": f'attachment; filename="{nama_berkas}"'})

    @app.get("/api/sehat")
    def sehat():
        return {"status": "ok", "jumlah_modul": len(konten.modul)}

    @app.middleware("http")
    async def header_keamanan(request: Request, call_next):
        respons = await call_next(request)
        respons.headers.setdefault("X-Content-Type-Options", "nosniff")
        respons.headers.setdefault("Referrer-Policy", "no-referrer")
        # Browser wajib mengecek ulang file tampilan (pakai ETag, tetap ringan), supaya setelah
        # aplikasi diperbarui tidak tercampur file JS lama dan baru.
        respons.headers.setdefault("Cache-Control", "no-store" if request.url.path.startswith("/api/") else "no-cache")
        return respons

    # Frontend PWA (tanpa build) dilayani dari folder apps/web.
    app.mount("/", StaticFiles(directory=pengaturan.folder_web, html=True), name="web")
    return app
