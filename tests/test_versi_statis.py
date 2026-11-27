"""Tahap 5: versi statis (GitHub Pages).

- Logika JS (apps/web/js/local/logika.js) harus IDENTIK dengan Python (main.py, asisten.py).
- Skrip tools/bangun_statis.py menghasilkan folder docs/ yang lengkap dan benar.
- Folder docs/ yang tersimpan harus sama dengan hasil bangun terbaru (jangan lupa membangun ulang).
"""

import json
import random
import re
from datetime import date, timedelta
from pathlib import Path
from types import SimpleNamespace

import pytest

from apps.api import asisten
from apps.api.konten import Konten
from apps.api.main import hitung_hasil_tes, hitung_streak, kategori_nilai, poin_untuk
from tools.bangun_statis import bangun

py_mini_racer = pytest.importorskip("py_mini_racer")

AKAR = Path(__file__).resolve().parents[1]
KONTEN = Konten(AKAR / "content")


@pytest.fixture(scope="module")
def js():
    folder = AKAR / "apps" / "web" / "js" / "local"
    sumber = ""
    for nama in ("mesin.js", "logika.js"):
        teks = (folder / nama).read_text(encoding="utf-8")
        teks = re.sub(r"^import\s[\s\S]*?\sfrom\s+\"[^\"]+\";", "", teks, flags=re.M)
        sumber += re.sub(r"^export\s+", "", teks, flags=re.M) + "\n"
    ctx = py_mini_racer.MiniRacer()
    ctx.eval(sumber)
    return ctx


def jalankan(js, ekspresi):
    return json.loads(js.eval(f"JSON.stringify({ekspresi})"))


def test_poin_dan_kategori_identik(js):
    assert jalankan(js, "[0,1,2,3].map(poinUntuk)") == [poin_untuk(n) for n in range(4)]
    nilai = list(range(0, 101))
    assert jalankan(js, f"{nilai}.map(kategoriNilai)") == [kategori_nilai(n) for n in nilai]


def test_streak_identik(js):
    rng = random.Random(5)
    hari = date(2026, 11, 27)
    for _ in range(200):
        aktif = {hari - timedelta(days=rng.randint(0, 12)) for _ in range(rng.randint(0, 10))}
        teks = sorted(d.isoformat() for d in aktif)
        hasil_js = jalankan(js, f"hitungStreak(new Set({json.dumps(teks)}), {json.dumps(hari.isoformat())})")
        assert hasil_js == hitung_streak(aktif, hari), teks


def test_hasil_tes_identik(js):
    modul = KONTEN.modul["m7"]
    id_soal = [s["id"] for s in modul["soal"]] + ["m1-s1"]
    rng = random.Random(9)
    for _ in range(120):
        jawaban = [{"id": i, "soal_id": rng.choice(id_soal), "status": rng.choice(["benar", "salah", "tidak_valid"])}
                   for i in rng.sample(range(1, 500), rng.randint(0, 40))]
        hasil_js = jalankan(js, f"hitungHasilTes({json.dumps(modul)}, {json.dumps(jawaban)})")
        hasil_py = hitung_hasil_tes(modul, [SimpleNamespace(**j) for j in jawaban])
        assert hasil_js == hasil_py


def test_asisten_bawaan_identik(js):
    """Tanpa AI, balasan asisten versi statis harus sama persis dengan versi server."""
    rng = random.Random(11)
    pesan_contoh = ["aku bingung", "bantu dong", "gak tau", "20", "16,67", "12.5", "Rp3.000", "3000", "halo",
                    "kenapa salah?", "57.000", "jawabannya berapa?", "tidak paham", "25%", "0,25", "a"]
    soal_uji = [s for _, s in KONTEN.soal.values()]
    for _ in range(300):
        soal = rng.choice(soal_uji)
        riwayat = []
        for pesan in rng.sample(pesan_contoh, rng.randint(1, 6)):
            hasil_py = asisten.proses_giliran(soal, pesan, riwayat, lambda _p: None)
            hasil_js = jalankan(js, f"prosesGiliranBawaan({json.dumps(soal)}, {json.dumps(pesan)}, {json.dumps(riwayat)})")
            assert hasil_js == hasil_py, (soal["id"], pesan)
            riwayat.append({"peran": "siswa", "isi": pesan, "status_cek": (hasil_py["cek_mesin"] or {}).get("status", ""),
                            "minta_bantuan": int(hasil_py["minta_bantuan"])})
            riwayat.append({"peran": "asisten", "isi": hasil_py["balasan"], "status_cek": "", "minta_bantuan": 0})


def test_bangun_statis(tmp_path):
    hasil = bangun(tmp_path / "docs")
    assert (hasil / "index.html").exists() and (hasil / ".nojekyll").exists()
    assert 'export const MODE = "statis";' in (hasil / "js" / "config.js").read_text(encoding="utf-8")
    data = json.loads((hasil / "data" / "konten.json").read_text(encoding="utf-8"))
    assert [m["id"] for m in data["modul"]] == [f"m{i}" for i in range(8)]
    assert all("kunci" in s for m in data["modul"] for s in m["soal"])  # tanpa server, mesin butuh kunci
    assert data["glosarium"]
    assert '"./data/konten.json"' in (hasil / "sw.js").read_text(encoding="utf-8")
    # Tidak ada rahasia server yang ikut.
    nama_file = {p.name for p in hasil.rglob("*")}
    assert ".env" not in nama_file and not any(n.endswith(".db") for n in nama_file)
    for p in hasil.rglob("*.js"):
        assert not re.search(r"AIza[0-9A-Za-z_\-]{20,}|sk-[0-9A-Za-z]{20,}", p.read_text(encoding="utf-8"))
    # Sumber asli tetap mode server.
    assert 'export const MODE = "server";' in (AKAR / "apps" / "web" / "js" / "config.js").read_text(encoding="utf-8")


def test_pengaman_tujuan_bangun():
    with pytest.raises(ValueError):
        bangun(AKAR / "apps")  # tidak boleh menghapus folder proyek selain docs/


def test_halaman_utama_mengarah_ke_docs():
    teks = (AKAR / "index.html").read_text(encoding="utf-8")
    assert 'url=docs/' in teks and 'href="docs/"' in teks


def test_docs_sesuai_sumber_terbaru(tmp_path):
    """Folder docs/ yang disimpan harus hasil bangun TERBARU (jalankan tools.bangun_statis bila gagal)."""
    docs = AKAR / "docs"
    if not docs.exists():
        pytest.skip("docs/ belum dibangun")
    baru = bangun(tmp_path / "docs")
    daftar = lambda akar: sorted(p.relative_to(akar).as_posix() for p in akar.rglob("*") if p.is_file())  # noqa: E731
    assert daftar(docs) == daftar(baru), "Isi docs/ berbeda: jalankan  python -m tools.bangun_statis"
    for rel in daftar(baru):
        a = (docs / rel).read_bytes().replace(b"\r\n", b"\n")
        b = (baru / rel).read_bytes().replace(b"\r\n", b"\n")
        assert a == b, f"docs/{rel} sudah usang: jalankan  python -m tools.bangun_statis"
