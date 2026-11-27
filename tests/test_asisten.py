"""Tes Asisten Belajar (RMT). Semua memakai AI palsu: tidak ada panggilan internet."""

import json

import httpx
import pytest

from apps.api import asisten
from apps.api.config import Pengaturan
from apps.api.konten import Konten
from tests.conftest import AKAR, daftar

KONTEN = Konten(AKAR / "content")
SOAL = {sid: s for sid, (_, s) in KONTEN.soal.items()}


class AIPalsu:
    def __init__(self, balasan="Coba bandingkan harga jual dan harga beli dulu. Mana yang lebih besar?"):
        self.balasan = balasan
        self.panggilan = []

    def __call__(self, pesan):
        self.panggilan.append(pesan)
        if isinstance(self.balasan, Exception):
            raise self.balasan
        return self.balasan


def tanya(klien, h, soal_id, pesan):
    r = klien.post("/api/asisten", headers=h, json={"soal_id": soal_id, "pesan": pesan})
    assert r.status_code == 200, r.text
    return r.json()


def test_tanpa_kunci_tetap_jalan_dengan_teks_bawaan(klien):
    h = daftar(klien)
    status = klien.get("/api/asisten/status", headers=h).json()
    assert status["ai_aktif"] is False and status["sisa_kuota"] == 20 and len(status["tahap"]) == 6
    r = tanya(klien, h, "m2-s2", "aku bingung mulai dari mana")
    assert r["sumber"] == "bawaan" and r["tahap"]["nomor"] == 1 and r["tahap"]["nama"] == "Orientasi"
    assert r["tingkat_petunjuk"] == 1  # minta bantuan membuka petunjuk tingkat 1
    assert SOAL["m2-s2"]["petunjuk"][0] in r["balasan"]


def test_balasan_ai_dipakai_bila_aman(klien):
    h = daftar(klien)
    klien.app.state.panggil_ai = ai = AIPalsu()
    r = tanya(klien, h, "m2-s2", "halo")
    assert r["sumber"] == "ai" and r["balasan"] == ai.balasan and r["sisa_kuota"] == 19
    assert ai.panggilan[0][0]["role"] == "system" and ai.panggilan[0][-1] == {"role": "user", "content": "halo"}


@pytest.mark.parametrize("soal_id,balasan", [
    ("m2-s2", "Untungnya 20%."),                      # angka jawaban akhir
    ("m2-s2", "Hasilnya 0,2 kalau ditulis desimal."),  # bentuk desimal dari 20%
    ("m4-s3", "Untung seluruhnya Rp34.000, ya."),      # rupiah
    ("m2-s3", "Jadi hasilnya 12,5%"),                  # desimal koma
    ("m2-s1", "Pembaginya adalah harga beli."),        # teks pilihan yang benar
    ("m2-s2", "Jawaban yang benar sudah dekat!"),      # frasa jawaban
    ("m3-s6", "Pilih jawaban A saja."),                # menyebut opsi
])
def test_balasan_bocor_diganti_teks_bawaan(klien, soal_id, balasan):
    h = daftar(klien)
    klien.app.state.panggil_ai = AIPalsu(balasan)
    r = tanya(klien, h, soal_id, "jawabannya berapa? kasih tahu saja")
    assert r["sumber"] == "bawaan" and r["balasan"] != balasan


def test_ai_gagal_atau_terlalu_panjang_memakai_teks_bawaan(klien):
    h = daftar(klien)
    for balasan in (None, "", RuntimeError("putus"), "kata " * 300):
        klien.app.state.panggil_ai = AIPalsu(balasan)
        assert tanya(klien, h, "m1-s3", "halo")["sumber"] == "bawaan"


def test_mesin_memeriksa_jawaban_angka(klien):
    h = daftar(klien)
    klien.app.state.panggil_ai = ai = AIPalsu()
    r = tanya(klien, h, "m2-s2", "16,67")
    assert r["cek_mesin"]["status"] == "salah" and r["cek_mesin"]["kode"] == "bagi_harga_jual"
    assert r["tingkat_petunjuk"] == 1
    sistem = ai.panggilan[0][0]["content"]
    assert SOAL["m2-s2"]["petunjuk"][0] in sistem and SOAL["m2-s2"]["petunjuk"][1] not in sistem
    assert "bagi_harga_jual" not in sistem and "Sepertinya kamu membagi dengan harga jual" in sistem

    r = tanya(klien, h, "m2-s2", "12.5")
    assert r["cek_mesin"]["status"] == "tidak_valid"  # tetap mesin, bukan AI

    r = tanya(klien, h, "m2-s2", "aku tidak tahu")
    assert r["cek_mesin"] is None and r["tingkat_petunjuk"] == 2


def test_jawaban_benar_masuk_tahap_refleksi(klien):
    h = daftar(klien)
    klien.app.state.panggil_ai = AIPalsu("Hebat, 20% sudah benar. Mengapa pembaginya harga beli?")
    r = tanya(klien, h, "m2-s2", "20%")
    assert r["cek_mesin"]["status"] == "benar" and r["tahap"]["nama"] == "Refleksi"
    assert r["sumber"] == "ai"  # siswa sudah menemukan jawabannya sendiri, jadi boleh disebut


def test_ai_tidak_pernah_diberi_kunci_pembahasan_atau_identitas(klien):
    h = daftar(klien, "rina07", "Rina")
    klien.app.state.panggil_ai = ai = AIPalsu()
    for soal_id in ("m4-s3", "m5-s5", "m2-s1"):
        tanya(klien, h, soal_id, "bingung")
        teks = json.dumps(ai.panggilan[-1], ensure_ascii=False)
        soal = SOAL[soal_id]
        assert soal["pembahasan"] not in teks
        for k in soal.get("kesalahan_umum", []):
            assert k["pesan"] not in teks
        if soal["tipe"] == "angka":
            assert soal["kunci"] not in teks
        assert "rina07" not in teks and "Rina" not in teks


def test_tahap_maju_satu_per_giliran(klien):
    h = daftar(klien)
    tahap = [tanya(klien, h, "m1-s3", f"pesan {i}")["tahap"]["nomor"] for i in range(7)]
    assert tahap == [1, 2, 3, 4, 5, 5, 5]


def test_tidak_tersedia_saat_tes(klien):
    h = daftar(klien)
    r = klien.post("/api/asisten", headers=h, json={"soal_id": "m7-s1", "pesan": "bantu"})
    assert r.status_code == 403
    assert klien.get("/api/asisten/riwayat/m7-s1", headers=h).status_code == 403
    assert klien.post("/api/asisten", headers=h, json={"soal_id": "xx", "pesan": "a"}).status_code == 404
    assert klien.post("/api/asisten", json={"soal_id": "m1-s1", "pesan": "a"}).status_code == 401
    assert klien.post("/api/asisten", headers=h, json={"soal_id": "m1-s1", "pesan": "a" * 301}).status_code == 422


def test_kuota_harian(klien):
    h = daftar(klien)
    klien.app.state.pengaturan.ai_kuota_harian = 2
    klien.app.state.panggil_ai = ai = AIPalsu()
    assert tanya(klien, h, "m1-s3", "satu")["sisa_kuota"] == 1
    assert tanya(klien, h, "m1-s4", "dua")["sisa_kuota"] == 0
    r = tanya(klien, h, "m1-s3", "tiga")
    assert r["kuota_habis"] is True and r["balasan"] == asisten.PESAN_KUOTA_HABIS
    assert len(ai.panggilan) == 2  # AI tidak dipanggil setelah kuota habis


def test_riwayat_hanya_milik_sendiri(klien):
    h1 = daftar(klien, "rina07", "Rina")
    h2 = daftar(klien, "budi01", "Budi")
    tanya(klien, h1, "m1-s3", "halo asisten")
    r = tanya(klien, h1, "m1-s3", "57.000")
    assert r["cek_mesin"]["pesan"] not in r["balasan"]  # diagnosis mesin tidak diulang di teks
    r1 = klien.get("/api/asisten/riwayat/m1-s3", headers=h1).json()
    assert [m["peran"] for m in r1] == ["siswa", "asisten", "siswa", "asisten"] and r1[0]["isi"] == "halo asisten"
    assert r1[1]["cek_mesin"] is None and r1[3]["cek_mesin"]["kode"] == "dijumlah"
    assert klien.get("/api/asisten/riwayat/m1-s3", headers=h2).json() == []


def test_kunci_api_tidak_pernah_keluar_dari_server(klien):
    klien.app.state.pengaturan.ai_api_key = "kunci-palsu-rahasia-123"
    klien.app.state.pengaturan.ai_model = "model-tes"
    klien.app.state.panggil_ai = AIPalsu()
    h = daftar(klien)
    teks = klien.get("/api/asisten/status", headers=h).text + json.dumps(tanya(klien, h, "m1-s3", "halo"))
    assert "kunci-palsu-rahasia-123" not in teks
    assert "kunci-palsu-rahasia-123" not in repr(klien.app.state.pengaturan)


def test_panggil_ai_mengirim_permintaan_yang_benar(monkeypatch):
    tangkap = {}

    def post_palsu(url, json, headers, timeout):
        tangkap.update(url=url, json=json, headers=headers)
        return httpx.Response(200, json={"choices": [{"message": {"content": " Halo! "}}]},
                              request=httpx.Request("POST", url))

    monkeypatch.setattr(asisten.httpx, "post", post_palsu)
    p = Pengaturan(database_url="sqlite://", secret_key="x", ai_api_key="kunci-uji", ai_model="model-uji")
    assert asisten.panggil_ai(p, [{"role": "user", "content": "hai"}]) == "Halo!"
    assert tangkap["url"] == "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
    assert tangkap["headers"]["Authorization"] == "Bearer kunci-uji"
    assert tangkap["json"]["model"] == "model-uji" and "reasoning_effort" not in tangkap["json"]

    p.ai_provider, p.ai_model = "deepseek", "deepseek-chat"
    asisten.panggil_ai(p, [])
    assert tangkap["url"] == "https://api.deepseek.com/chat/completions"


def test_panggil_ai_gagal_mengembalikan_none(monkeypatch):
    p = Pengaturan(database_url="sqlite://", secret_key="x", ai_api_key="k", ai_model="m")
    monkeypatch.setattr(asisten.httpx, "post", lambda url, **kw: httpx.Response(429, request=httpx.Request("POST", url)))
    assert asisten.panggil_ai(p, []) is None

    def putus(url, **kw):
        raise httpx.ConnectError("putus")

    monkeypatch.setattr(asisten.httpx, "post", putus)
    assert asisten.panggil_ai(p, []) is None
    assert asisten.panggil_ai(Pengaturan(database_url="sqlite://", secret_key="x"), []) is None  # tanpa kunci


def test_env_example_tanpa_kunci_asli():
    teks = (AKAR / ".env.example").read_text(encoding="utf-8")
    for baris in teks.splitlines():
        if baris.startswith(("AI_API_KEY=", "SECRET_KEY=")):
            assert baris.split("=", 1)[1].strip() == "", baris


def test_gemini_api_key_dipakai_bila_ai_api_key_kosong(monkeypatch):
    from apps.api.config import muat_pengaturan

    monkeypatch.setenv("AI_API_KEY", "")
    monkeypatch.setenv("GEMINI_API_KEY", "kunci-gemini-uji")
    monkeypatch.setenv("AI_PROVIDER", "gemini")
    assert muat_pengaturan().ai_api_key == "kunci-gemini-uji"
    monkeypatch.setenv("AI_API_KEY", "kunci-utama-uji")
    assert muat_pengaturan().ai_api_key == "kunci-utama-uji"  # AI_API_KEY diutamakan
    monkeypatch.setenv("AI_API_KEY", "")
    monkeypatch.setenv("AI_PROVIDER", "deepseek")
    assert muat_pengaturan().ai_api_key == ""  # kunci Gemini tidak dikirim ke DeepSeek
