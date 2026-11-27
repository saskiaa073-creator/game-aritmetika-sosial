"""Kontras warna tema (WCAG AA): teks >= 4,5:1, garis isian dan fokus >= 3:1.

Membaca token warna langsung dari apps/web/css/app.css, jadi perubahan palet
yang membuat teks sulit dibaca akan langsung ketahuan.
"""

import re
from pathlib import Path

import pytest

AKAR = Path(__file__).resolve().parents[1]
CSS = (AKAR / "apps" / "web" / "css" / "app.css").read_text(encoding="utf-8")
TOKEN = dict(re.findall(r"--([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})", CSS))


def luminans(hex_warna):
    c = [int(hex_warna[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    c = [x / 12.92 if x <= 0.03928 else ((x + 0.055) / 1.055) ** 2.4 for x in c]
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]


def kontras(a, b):
    la, lb = luminans(a), luminans(b)
    return (max(la, lb) + 0.05) / (min(la, lb) + 0.05)


PASANGAN = [
    ("teks", "latar", 4.5), ("teks", "kartu", 4.5), ("teks", "latar-tua", 4.5),
    ("redup", "latar", 4.5), ("redup", "kartu", 4.5), ("redup", "latar-tua", 4.5), ("redup", "kartu-lembut", 4.5),
    ("utama", "latar", 4.5), ("utama", "kartu", 4.5), ("utama", "latar-tua", 4.5), ("utama", "utama-pudar", 4.5),
    ("utama-teks", "utama", 4.5), ("teks", "utama-pudar", 4.5),
    ("hb", "hb-latar", 4.5), ("hj", "hj-latar", 4.5), ("teks", "ur-latar", 4.5),
    ("benar", "benar-latar", 4.5), ("salah", "salah-latar", 4.5), ("peringatan", "peringatan-latar", 4.5),
    ("lvl0", "lvl0-pudar", 4.5), ("lvl1", "lvl1-pudar", 4.5), ("lvl2", "lvl2-pudar", 4.5),
    ("lvl3", "lvl3-pudar", 4.5), ("lvltes", "lvltes-pudar", 4.5),
    ("lvl0", "kartu", 4.5), ("lvl1", "kartu", 4.5), ("lvl2", "kartu", 4.5), ("lvl3", "kartu", 4.5),
    ("lvl0", "latar", 4.5), ("lvl1", "latar", 4.5), ("lvl2", "latar", 4.5), ("lvl3", "latar", 4.5),
    ("teks", "lvl0-pudar", 4.5), ("teks", "lvl2-pudar", 4.5), ("teks", "lvl3-pudar", 4.5),
    ("garis-isian", "kartu", 3.0), ("garis-isian", "latar", 3.0), ("fokus", "latar", 3.0), ("fokus", "kartu", 3.0),
]


@pytest.mark.parametrize("depan,belakang,minimum", PASANGAN, ids=lambda x: str(x))
def test_kontras_warna(depan, belakang, minimum):
    assert depan in TOKEN and belakang in TOKEN, f"token --{depan} atau --{belakang} tidak ada"
    nilai = kontras(TOKEN[depan], TOKEN[belakang])
    assert nilai >= minimum, f"--{depan} di atas --{belakang}: {nilai:.2f}:1 (minimal {minimum}:1)"


def test_harga_beli_dan_harga_jual_berbeda_jelas():
    """Warna khusus harga beli (biru) dan harga jual (oranye) tidak boleh mirip (temuan EL03)."""
    hb, hj = TOKEN["hb"], TOKEN["hj"]
    biru = int(hb[5:7], 16) > int(hb[1:3], 16)
    oranye = int(hj[1:3], 16) > int(hj[5:7], 16)
    assert biru and oranye


def test_warna_level_tidak_memakai_biru_atau_oranye():
    """Biru dan oranye khusus harga beli dan harga jual; warna level harus lain (temuan EL03)."""
    for nama in ("lvl0", "lvl1", "lvl2", "lvl3"):
        assert TOKEN[nama].lower() not in {TOKEN["hb"].lower(), TOKEN["hj"].lower()}
        r, g, b = (int(TOKEN[nama][i:i + 2], 16) for i in (1, 3, 5))
        assert not (b > r and b > g), f"--{nama} kebiruan, bisa tertukar dengan harga beli"
