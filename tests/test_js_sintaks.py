"""Memastikan semua file JavaScript frontend bebas salah ketik (syntax error).

Dicek dengan V8 (mini-racer): baris import/export dibuang, lalu kode dibungkus
fungsi yang tidak dijalankan, sehingga hanya tata bahasanya yang diperiksa.
"""

import json
import re
from pathlib import Path

import pytest

py_mini_racer = pytest.importorskip("py_mini_racer")

AKAR = Path(__file__).resolve().parents[1]
BERKAS_JS = sorted((AKAR / "apps" / "web").rglob("*.js"))


@pytest.mark.parametrize("path", BERKAS_JS, ids=lambda p: p.relative_to(AKAR).as_posix())
def test_sintaks_js(path):
    sumber = path.read_text(encoding="utf-8")
    sumber = re.sub(r"^import\s[\s\S]*?\sfrom\s+\"[^\"]+\";", "", sumber, flags=re.M)
    sumber = re.sub(r"^export\s+", "", sumber, flags=re.M)
    ctx = py_mini_racer.MiniRacer()
    hasil = ctx.eval(
        "(() => { try { new Function(" + json.dumps(sumber) + "); return 'ok'; }"
        " catch (e) { return String(e); } })()"
    )
    assert hasil == "ok", f"{path.name}: {hasil}"


def test_service_worker_mencantumkan_semua_berkas():
    sw = (AKAR / "apps" / "web" / "sw.js").read_text(encoding="utf-8")
    for path in BERKAS_JS:
        rel = "./" + path.relative_to(AKAR / "apps" / "web").as_posix()
        if rel != "./sw.js":
            assert f'"{rel}"' in sw, f"{rel} belum dicantumkan di sw.js"


def _argumen_atas(sumber, awal):
    """Teks argumen tingkat teratas dari panggilan fungsi yang dimulai di indeks 'awal' (tepat setelah '(')."""
    kedalaman, i, hasil = 1, awal, []
    while i < len(sumber) and kedalaman:
        c = sumber[i]
        if c in "([{":
            kedalaman += 1
        elif c in ")]}":
            kedalaman -= 1
        if kedalaman == 1:
            hasil.append(c)
        i += 1
    return "".join(hasil)


@pytest.mark.parametrize("path", BERKAS_JS, ids=lambda p: p.relative_to(AKAR).as_posix())
def test_tidak_ada_false_tampil_sebagai_teks(path):
    """append/replaceChildren bawaan browser menampilkan false sebagai teks "false".
    Argumen bersyarat (&&) wajib lewat h() atau ganti()."""
    sumber = path.read_text(encoding="utf-8")
    for cocok in re.finditer(r"\.(append|replaceChildren)\(", sumber):
        argumen = _argumen_atas(sumber, cocok.end())
        assert "&&" not in argumen, f"{path.name}: pakai ganti() untuk isi bersyarat (posisi {cocok.start()})"
