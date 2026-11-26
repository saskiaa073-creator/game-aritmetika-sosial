"""Aturan CLT untuk konten (aturan wajib 4 dan 5), diperiksa otomatis.

- maks 70 kata per layar
- maks 6 langkah per contoh
- setiap soal punya 3 petunjuk dan pembahasan
- kunci jawaban harus diterima pemeriksa
- setiap modul mencantumkan kode wawancara; semua kode tercakup kurikulum
"""

import re
from pathlib import Path

import pytest

from apps.api.engine import parse, periksa
from apps.api.konten import Konten

AKAR = Path(__file__).resolve().parents[1]
MAKS_KATA = 70
MAKS_LANGKAH_CONTOH = 6

KONTEN = Konten(AKAR / "content")
SEMUA_MODUL = list(KONTEN.modul.values())
SEMUA_SOAL = [(m, s) for m in SEMUA_MODUL for s in m["soal"]]


def kata(*teks):
    return sum(len(re.findall(r"\S+", t)) for t in teks)


def test_ada_modul():
    assert SEMUA_MODUL, "Belum ada file modul di content/"


@pytest.mark.parametrize("modul", SEMUA_MODUL, ids=lambda m: m["id"])
def test_struktur_modul(modul):
    for kunci in ("id", "urutan", "level", "judul", "tujuan", "kode_wawancara", "langkah", "soal"):
        assert kunci in modul, f"{modul['id']} tidak punya '{kunci}'"
    assert modul["langkah"] and modul["soal"]


@pytest.mark.parametrize("modul", SEMUA_MODUL, ids=lambda m: m["id"])
def test_layar_belajar_patuh_clt(modul):
    for l in modul["langkah"]:
        if l["jenis"] == "teks":
            jumlah = kata(l["judul"], l["isi"])
        else:
            assert l["jenis"] == "contoh", l["id"]
            assert 1 <= len(l["langkah_contoh"]) <= MAKS_LANGKAH_CONTOH, f"{l['id']}: maks {MAKS_LANGKAH_CONTOH} langkah"
            jumlah = kata(l["judul"], l["soal"], *l["langkah_contoh"])
        assert jumlah <= MAKS_KATA, f"{l['id']}: {jumlah} kata (maks {MAKS_KATA})"


@pytest.mark.parametrize("modul,soal", SEMUA_SOAL, ids=lambda x: x["id"])
def test_soal_patuh_clt(modul, soal):
    assert soal["id"].startswith(modul["id"] + "-")
    assert soal["tipe"] in ("angka", "pilihan")
    assert len(soal["petunjuk"]) == 3 and all(p.strip() for p in soal["petunjuk"]), "wajib 3 petunjuk"
    assert soal["pembahasan"].strip(), "wajib ada pembahasan"
    # Layar soal sebelum menjawab: teks + pilihan + semua petunjuk terbuka.
    teks_pilihan = [p["teks"] for p in soal.get("pilihan", [])]
    jumlah = kata(soal["teks"], *teks_pilihan, *soal["petunjuk"])
    assert jumlah <= MAKS_KATA, f"{soal['id']}: {jumlah} kata"
    assert kata(soal["pembahasan"]) <= MAKS_KATA


@pytest.mark.parametrize("modul,soal", SEMUA_SOAL, ids=lambda x: x["id"])
def test_kunci_diterima_pemeriksa(modul, soal):
    assert periksa(soal, soal["kunci"])["benar"], f"Kunci {soal['id']} ditolak pemeriksa"
    if soal["tipe"] == "angka":
        assert soal.get("satuan") in ("rupiah", "persen", "angka")
        akhiran = "%" if soal["satuan"] == "persen" else ""
        awalan = "Rp" if soal["satuan"] == "rupiah" else ""
        assert periksa(soal, f"{awalan}{soal['kunci']}{akhiran}")["benar"]
    else:
        assert soal["kunci"] in [p["id"] for p in soal["pilihan"]]
    for k in soal.get("kesalahan_umum", []):
        hasil = periksa(soal, k["nilai"])
        assert not hasil["benar"] and hasil["kode"] == k["kode"], f"{soal['id']}: kesalahan umum {k['nilai']}"


@pytest.mark.parametrize("modul,soal", [x for x in SEMUA_SOAL if x[1]["tipe"] == "angka"], ids=lambda x: x["id"])
def test_petunjuk_tidak_membocorkan_jawaban(modul, soal):
    kunci = parse(soal["kunci"])
    for p in soal["petunjuk"]:
        for angka in re.findall(r"\d+(?:\.\d{3})*(?:,\d+)?", p):
            assert parse(angka) != kunci, f"{soal['id']}: petunjuk memuat jawaban ({angka})"


def test_id_unik():
    semua_id = [m["id"] for m in SEMUA_MODUL]
    semua_id += [l["id"] for m in SEMUA_MODUL for l in m["langkah"]]
    semua_id += [s["id"] for _, s in SEMUA_SOAL]
    assert len(semua_id) == len(set(semua_id))


def test_kode_wawancara_valid_dan_sesuai_kurikulum():
    rencana = {m["id"]: m for m in KONTEN.kurikulum["modul"]}
    for m in SEMUA_MODUL:
        assert m["kode_wawancara"], f"{m['id']} belum mencantumkan kode wawancara"
        assert set(m["kode_wawancara"]) <= set(KONTEN.kode_wawancara), f"{m['id']}: kode tidak dikenal"
        assert m["id"] in rencana, f"{m['id']} tidak ada di kurikulum.json"
        assert m["kode_wawancara"] == rencana[m["id"]]["kode_wawancara"]
        assert m["judul"] == rencana[m["id"]]["judul"]


def test_semua_modul_kurikulum_tersedia():
    rencana = [m["id"] for m in KONTEN.kurikulum["modul"]]
    assert list(KONTEN.modul) == rencana, "Urutan/daftar file modul harus sama dengan kurikulum.json"


def test_semua_kode_wawancara_tercakup_modul():
    tercakup = {k for m in SEMUA_MODUL for k in m["kode_wawancara"]}
    assert tercakup == set(KONTEN.kode_wawancara)


@pytest.mark.parametrize("modul", SEMUA_MODUL, ids=lambda m: m["id"])
def test_rujukan_layar_adaptif(modul):
    """'sebelum' menunjuk soal di modul yang sama; 'tampil_jika_salah' menunjuk soal SEBELUM layar itu."""
    urutan = [s["id"] for s in modul["soal"]]
    for l in modul["langkah"]:
        if "sebelum" in l:
            assert l["sebelum"] in urutan, f"{l['id']}: soal '{l['sebelum']}' tidak ada"
        if "tampil_jika_salah" in l:
            assert "sebelum" in l, f"{l['id']}: layar adaptif harus punya 'sebelum'"
            batas = urutan.index(l["sebelum"])
            for sid in l["tampil_jika_salah"]:
                assert sid in urutan[:batas], f"{l['id']}: '{sid}' harus muncul sebelum layar ini"


# Angka dari soal TABEL KISI (instrumen tes). Tidak boleh dipakai di modul latihan.
ANGKA_KISI = ["20.000", "25.000", "40.000", "48.000", "50.000", "61.000", "300.000",
              "16.000", "1.200.000", "200.000", "250.000"]


@pytest.mark.parametrize("modul", [m for m in SEMUA_MODUL if m.get("jenis") != "tes"], ids=lambda m: m["id"])
def test_latihan_tidak_memakai_angka_tes(modul):
    import json
    teks = json.dumps(modul, ensure_ascii=False)
    nilai_kisi = {parse(a) for a in ANGKA_KISI}
    for angka in re.findall(r"\d+(?:\.\d{3})+(?:,\d+)?", teks):
        assert parse(angka) not in nilai_kisi, f"{modul['id']} memakai angka soal tes: {angka}"


def test_modul_tes_sesuai_kisi():
    tes = [m for m in SEMUA_MODUL if m.get("jenis") == "tes"]
    assert [m["id"] for m in tes] == ["m7"]
    m = tes[0]
    assert set(m["butir"]) == {"1", "2", "3", "4"}
    for nomor in m["butir"]:
        soal = [s for s in m["soal"] if str(s["butir"]) == nomor]
        assert soal and sum(s["skor"] for s in soal) == 6, f"butir {nomor}: skor maksimum harus 6"
    assert sum(s["skor"] for s in m["soal"]) == 24
    assert all(isinstance(s["skor"], int) and s["skor"] > 0 for s in m["soal"])
    # Setiap butir punya layar cerita tepat sebelum tahap pertamanya.
    for nomor in m["butir"]:
        pertama = next(s["id"] for s in m["soal"] if str(s["butir"]) == nomor)
        assert any(l.get("sebelum") == pertama for l in m["langkah"]), f"butir {nomor} belum punya cerita"


def test_semua_kode_wawancara_tercakup_kurikulum():
    tercakup = {k for m in KONTEN.kurikulum["modul"] for k in m["kode_wawancara"]}
    belum = set(KONTEN.kode_wawancara) - tercakup
    assert not belum, f"Kode wawancara belum tercakup: {sorted(belum)}"
    assert len(KONTEN.kode_wawancara) == 21


def test_glosarium():
    assert KONTEN.glosarium
    for g in KONTEN.glosarium:
        assert g["istilah"] and g["arti"] and g["contoh"]
        assert kata(g["istilah"], g["arti"], g["contoh"]) <= MAKS_KATA
