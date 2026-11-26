"""Tes alur backend: akun, belajar, poin, peringkat, dashboard guru."""

from datetime import date

from apps.api.main import hitung_streak, poin_untuk
from tests.conftest import daftar, masuk


def test_sehat_dan_halaman_utama(klien):
    assert klien.get("/api/sehat").json()["status"] == "ok"
    r = klien.get("/")
    assert r.status_code == 200 and "Pasar Pintar" in r.text
    # File tampilan harus dicek ulang browser agar pembaruan tidak tercampur file lama.
    assert klien.get("/js/ui.js").headers["cache-control"] == "no-cache"
    assert klien.get("/api/sehat").headers["cache-control"] == "no-store"


def test_daftar_masuk_dan_profil(klien):
    h = daftar(klien, kode_kelas="demo77")
    saya = klien.get("/api/saya", headers=h).json()
    assert saya["nama_panggilan"] == "Rina" and saya["kelas"] == "VII A (demo)"
    assert saya["poin_total"] == 0 and saya["streak"] == 0
    assert masuk(klien, "RINA07", "rahasia1")


def test_validasi_pendaftaran(klien):
    daftar(klien)
    kasus = [
        ({"username": "rina07", "nama_panggilan": "Rina", "password": "rahasia1"}, 409),
        ({"username": "a b", "nama_panggilan": "Rina", "password": "rahasia1"}, 422),
        ({"username": "budi01", "nama_panggilan": "<b>Budi</b>", "password": "rahasia1"}, 422),
        ({"username": "budi01", "nama_panggilan": "Budi", "password": "123"}, 422),
        ({"username": "budi01", "nama_panggilan": "Budi", "password": "rahasia1", "kode_kelas": "XXXXXX"}, 404),
    ]
    for data, status in kasus:
        assert klien.post("/api/auth/daftar", json=data).status_code == status, data


def test_login_salah_dan_tanpa_token(klien):
    daftar(klien)
    assert klien.post("/api/auth/masuk", json={"username": "rina07", "password": "salah123"}).status_code == 401
    assert klien.get("/api/saya").status_code == 401
    assert klien.get("/api/saya", headers={"Authorization": "Bearer palsu"}).status_code == 401
    assert klien.get("/api/modul/m1").status_code == 401


def test_modul_tanpa_kolom_rahasia(klien):
    h = daftar(klien)
    daftar_modul = klien.get("/api/modul", headers=h).json()
    assert [m["id"] for m in daftar_modul] == [f"m{i}" for i in range(8)]
    assert daftar_modul[1]["soal_benar"] == 0 and daftar_modul[7]["jenis"] == "tes"
    m = klien.get("/api/modul/m1", headers=h).json()
    for s in m["soal"]:
        assert not {"kunci", "toleransi", "pembahasan", "kesalahan_umum"} & set(s), s["id"]
    assert klien.get("/api/modul/tidak-ada", headers=h).status_code == 404


def test_jawab_benar_poin_sekali(klien):
    h = daftar(klien)
    r = klien.post("/api/soal/m1-s3/jawab", headers=h, json={"jawaban": "Rp3.000", "petunjuk_dipakai": 0}).json()
    assert r["status"] == "benar" and r["poin"] == 10 and "pembahasan" in r
    r2 = klien.post("/api/soal/m1-s3/jawab", headers=h, json={"jawaban": "3000"}).json()
    assert r2["benar"] and r2["poin"] == 0
    r3 = klien.post("/api/soal/m1-s4/jawab", headers=h, json={"jawaban": "7.000", "petunjuk_dipakai": 2}).json()
    assert r3["poin"] == 6
    saya = klien.get("/api/saya", headers=h).json()
    assert saya["poin_total"] == 16 and saya["poin_hari_ini"] == 16 and saya["streak"] == 1


def test_pembahasan_baru_muncul_setelah_tiga_salah(klien):
    h = daftar(klien)
    jawab = lambda j: klien.post("/api/soal/m1-s3/jawab", headers=h, json={"jawaban": j}).json()  # noqa: E731
    r = jawab("57.000")
    assert r["status"] == "salah" and r["kode"] == "dijumlah" and "pembahasan" not in r
    assert jawab("12.5")["status"] == "tidak_valid"  # tidak dihitung sebagai salah
    assert "pembahasan" not in jawab("1")
    assert "pembahasan" in jawab("2")


def test_jawab_soal_tidak_ada(klien):
    h = daftar(klien)
    assert klien.post("/api/soal/xx/jawab", headers=h, json={"jawaban": "1"}).status_code == 404
    assert klien.post("/api/soal/m1-s3/jawab", headers=h, json={"jawaban": "1", "petunjuk_dipakai": 9}).status_code == 422


def test_aturan_poin_dan_streak():
    assert [poin_untuk(n) for n in range(4)] == [10, 8, 6, 4]
    hari = date(2026, 11, 26)
    aktif = {date(2026, 11, 24), date(2026, 11, 25), date(2026, 11, 26)}
    assert hitung_streak(aktif, hari) == 3
    assert hitung_streak(aktif - {hari}, hari) == 2  # hari ini belum aktif, streak belum putus
    assert hitung_streak({date(2026, 11, 20)}, hari) == 0


def test_peringkat_hanya_nama_panggilan(klien):
    h1 = daftar(klien, "rina07", "Rina", kode_kelas="DEMO77")
    daftar(klien, "budi01", "Budi")
    klien.post("/api/soal/m1-s1/jawab", headers=h1, json={"jawaban": "a"})
    semua = klien.get("/api/peringkat?lingkup=semua", headers=h1).json()
    assert semua[0] == {"peringkat": 1, "nama_panggilan": "Rina", "poin": 10, "saya": True}
    assert all(set(b) == {"peringkat", "nama_panggilan", "poin", "saya"} for b in semua)
    kelas = klien.get("/api/peringkat?lingkup=kelas", headers=h1).json()
    assert "Budi" not in [b["nama_panggilan"] for b in kelas]


def test_gabung_kelas(klien):
    h = daftar(klien)
    assert klien.post("/api/kelas/gabung", headers=h, json={"kode": "ZZZZZZ"}).status_code == 404
    assert klien.post("/api/kelas/gabung", headers=h, json={"kode": "demo77"}).json()["kelas"] == "VII A (demo)"


def test_dashboard_guru(klien):
    hs = daftar(klien, kode_kelas="DEMO77")
    assert klien.get("/api/guru/kelas", headers=hs).status_code == 403
    klien.post("/api/soal/m1-s3/jawab", headers=hs, json={"jawaban": "57.000"})
    klien.post("/api/soal/m1-s3/jawab", headers=hs, json={"jawaban": "3.000"})

    hg = masuk(klien, "guru_demo", "guru12345")
    kelas = klien.get("/api/guru/kelas", headers=hg).json()
    demo = next(k for k in kelas if k["kode"] == "DEMO77")
    assert demo["jumlah_siswa"] == 2  # siswa_demo + rina07

    r = klien.get(f"/api/guru/kelas/{demo['id']}/ringkasan", headers=hg).json()
    rina = next(s for s in r["siswa"] if s["username"] == "rina07")
    assert rina["poin"] == 10 and rina["soal_benar"] == 1 and rina["kesalahan_terbanyak"] == "dijumlah"
    assert r["kesalahan_umum"][0]["kode"] == "dijumlah" and r["kesalahan_umum"][0]["jumlah"] == 1

    csv = klien.get(f"/api/guru/kelas/{demo['id']}/ekspor.csv", headers=hg)
    assert csv.status_code == 200 and csv.text.startswith("﻿nama_panggilan;username;poin")
    assert "skor_tes_dari_24" in csv.text.splitlines()[0]
    assert "Rina;rina07;10;1;2;dijumlah;0" in csv.text

    baru = klien.post("/api/guru/kelas", headers=hg, json={"nama": "VII B"}).json()
    assert len(baru["kode"]) == 6


def test_guru_lain_tidak_bisa_melihat_kelas(klien, tmp_path):
    hg = masuk(klien, "guru_demo", "guru12345")
    kelas_id = klien.get("/api/guru/kelas", headers=hg).json()[0]["id"]
    # Jadikan akun kedua guru langsung lewat database (tidak ada pendaftaran guru terbuka).
    daftar(klien, "guru2", "Pak Guru")
    from sqlalchemy import create_engine, text
    engine = create_engine(f"sqlite:///{(tmp_path / 'uji.db').as_posix()}")
    with engine.begin() as c:
        c.execute(text("UPDATE pengguna SET peran='guru' WHERE username='guru2'"))
    hg2 = masuk(klien, "guru2", "rahasia1")
    assert klien.get(f"/api/guru/kelas/{kelas_id}/ringkasan", headers=hg2).status_code == 404
    assert klien.get(f"/api/guru/kelas/{kelas_id}/ekspor.csv", headers=hg2).status_code == 404


def test_hasil_tes_dari_jawaban_pertama(klien):
    h = daftar(klien, kode_kelas="DEMO77")
    jawab = lambda sid, j: klien.post(f"/api/soal/{sid}/jawab", headers=h, json={"jawaban": j}).json()  # noqa: E731
    assert klien.get("/api/modul/m1/hasil", headers=h).status_code == 404  # bukan modul tes

    awal = klien.get("/api/modul/m7/hasil", headers=h).json()
    assert awal["total"] == 0 and awal["maks"] == 24 and awal["kategori"] == "Perlu Bimbingan"
    assert [b["maks"] for b in awal["butir"]] == [6, 6, 6, 6]

    jawab("m7-s1", "a")          # benar, skor 1
    jawab("m7-s2", "12.5")       # tidak terbaca: tidak dihitung
    jawab("m7-s2", "25")         # jawaban pertama yang terbaca, benar, skor 1
    jawab("m7-s3", "18,03")      # salah (bagi harga jual)
    jawab("m7-s3", "22")         # benar, tapi bukan jawaban pertama: skor 0
    jawab("m7-s14", "180.000")   # benar, skor 2
    r = klien.get("/api/modul/m7/hasil", headers=h).json()
    assert [b["skor"] for b in r["butir"]] == [2, 0, 2, 0]
    assert r["total"] == 4 and r["nilai"] == 17 and r["tahap_dijawab"] == 4
    assert r["status_pertama"] == {"m7-s1": "benar", "m7-s2": "benar", "m7-s3": "salah", "m7-s14": "benar"}

    hg = masuk(klien, "guru_demo", "guru12345")
    kelas_id = klien.get("/api/guru/kelas", headers=hg).json()[0]["id"]
    ringkas = klien.get(f"/api/guru/kelas/{kelas_id}/ringkasan", headers=hg).json()
    assert ringkas["skor_tes_maks"] == 24
    assert next(s for s in ringkas["siswa"] if s["username"] == "rina07")["skor_tes"] == 4


def test_kategori_nilai():
    from apps.api.main import kategori_nilai
    assert [kategori_nilai(n) for n in (100, 86, 85, 71, 70, 56, 55, 0)] == [
        "Sangat Baik", "Sangat Baik", "Baik", "Baik", "Cukup", "Cukup", "Perlu Bimbingan", "Perlu Bimbingan"]
