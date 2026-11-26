"""Tes mesin penilaian Python: parser aman, format angka Indonesia, pemeriksa."""

import re
from pathlib import Path

import pytest
from sympy import Rational

from apps.api.engine import GalatParse, format_angka, format_persen, format_rupiah, parse, periksa

AKAR = Path(__file__).resolve().parents[1]


def _rasional(teks):
    p, q = teks.split("/")
    return Rational(int(p), int(q))


def test_kasus_parse(kasus_mesin):
    for k in kasus_mesin["parse"]:
        if "nilai" in k:
            assert parse(k["masukan"]) == _rasional(k["nilai"]), k
        else:
            with pytest.raises(GalatParse) as info:
                parse(k["masukan"])
            assert info.value.kode == k["galat"], k


def test_kasus_format(kasus_mesin):
    for k in kasus_mesin["format_angka"]:
        assert format_angka(_rasional(k["nilai"]), k["desimal"]) == k["hasil"], k


def test_format_rupiah_persen():
    assert format_rupiah(25000) == "Rp25.000"
    assert format_rupiah(-25000) == "-Rp25.000"
    assert format_persen(Rational(25, 2)) == "12,5%"


def test_masukan_bukan_teks_ditolak():
    for nilai in (None, 25, 1.5, ["1"]):
        with pytest.raises(GalatParse):
            parse(nilai)


SOAL_ANGKA = {
    "tipe": "angka", "satuan": "persen", "kunci": "12,5", "toleransi": "0,05",
    "kesalahan_umum": [{"nilai": "11,11", "kode": "bagi_harga_jual", "pesan": "Pembaginya harga jual."}],
}


def test_periksa_angka():
    assert periksa(SOAL_ANGKA, "12,5")["status"] == "benar"
    assert periksa(SOAL_ANGKA, "12,54%")["status"] == "benar"  # dalam toleransi
    assert periksa(SOAL_ANGKA, "1/8 x 100")["status"] == "benar"
    assert periksa(SOAL_ANGKA, "12,6")["status"] == "salah"
    assert periksa(SOAL_ANGKA, "11,1")["kode"] == "bagi_harga_jual"
    assert periksa(SOAL_ANGKA, "800")["kode"] == "persen_tak_wajar"
    hasil = periksa(SOAL_ANGKA, "12.5")
    assert hasil["status"] == "tidak_valid" and hasil["kode"] == "titik_desimal"


def test_periksa_pilihan():
    soal = {"tipe": "pilihan", "pilihan": [{"id": "a"}, {"id": "b"}], "kunci": "a",
            "kesalahan_umum": [{"nilai": "b", "kode": "tertukar", "pesan": "x"}]}
    assert periksa(soal, "a")["benar"] is True
    assert periksa(soal, "b")["kode"] == "tertukar"
    assert periksa(soal, "z")["status"] == "tidak_valid"
    assert periksa(soal, None)["status"] == "tidak_valid"


def test_kode_tidak_memakai_eval():
    """Aturan wajib 3: dilarang eval/exec/sympify untuk masukan pengguna."""
    terlarang_py = re.compile(r"\b(eval|exec|sympify|parse_expr)\s*\(")
    terlarang_js = re.compile(r"\beval\s*\(|\bFunction\s*\(|set(Timeout|Interval)\s*\(\s*[\"'`]")
    for path in (AKAR / "apps").rglob("*.py"):
        assert not terlarang_py.search(path.read_text(encoding="utf-8")), f"Pemakaian terlarang di {path}"
    for path in (AKAR / "apps").rglob("*.js"):
        assert not terlarang_js.search(path.read_text(encoding="utf-8")), f"Pemakaian terlarang di {path}"
