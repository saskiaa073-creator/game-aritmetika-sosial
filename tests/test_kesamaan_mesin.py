"""Aturan wajib 8: mesin Python dan JavaScript harus memberi hasil IDENTIK.

Mesin JS (apps/web/js/local/mesin.js) dijalankan di dalam pytest memakai
mini-racer (V8), jadi tidak perlu memasang Node.js.
"""

import json
import random
import re
from pathlib import Path

import pytest

from apps.api.engine import GalatParse, format_angka, parse, periksa
from apps.api.konten import Konten

py_mini_racer = pytest.importorskip("py_mini_racer")

AKAR = Path(__file__).resolve().parents[1]

PEMBUNGKUS = """
function ujiParse(s) {
  try { const r = parse(s); return { nilai: r.p.toString() + "/" + r.q.toString() }; }
  catch (e) { if (e instanceof GalatParse) return { galat: e.kode }; return { crash: String(e) }; }
}
function ujiFormat(p, q, d) { return formatAngka(pecahan(BigInt(p), BigInt(q)), d); }
"""


@pytest.fixture(scope="module")
def js():
    sumber = (AKAR / "apps" / "web" / "js" / "local" / "mesin.js").read_text(encoding="utf-8")
    assert "import " not in sumber, "mesin.js harus mandiri (tanpa import)"
    ctx = py_mini_racer.MiniRacer()
    ctx.eval(re.sub(r"^export\s+", "", sumber, flags=re.M) + PEMBUNGKUS)
    return ctx


def jalankan(js, fungsi, daftar_argumen):
    return json.loads(js.eval(f"JSON.stringify({json.dumps(daftar_argumen)}.map(a => {fungsi}(...a)))"))


def parse_py(s):
    try:
        r = parse(s)
        return {"nilai": f"{r.p}/{r.q}"}
    except GalatParse as g:
        return {"galat": g.kode}


def masukan_acak(jumlah=3000, benih=20261126):
    rng = random.Random(benih)
    huruf = "0123456789.,+-*/x×:() %rpRPa\t" + "0123456789" * 3 + "..,,"
    hasil = []
    for _ in range(jumlah):
        hasil.append("".join(rng.choice(huruf) for _ in range(rng.randint(0, 45))))
    return hasil


def test_parse_identik(js, kasus_mesin):
    masukan = [k["masukan"] for k in kasus_mesin["parse"]] + masukan_acak()
    hasil_js = jalankan(js, "ujiParse", [[s] for s in masukan])
    for s, hj in zip(masukan, hasil_js):
        assert hj == parse_py(s), f"Beda untuk masukan {s!r}"


def test_format_identik(js, kasus_mesin):
    rng = random.Random(7)
    argumen = [[*k["nilai"].split("/"), k["desimal"]] for k in kasus_mesin["format_angka"]]
    argumen += [[str(rng.randint(-10**9, 10**9)), str(rng.randint(1, 10**4)), rng.randint(0, 3)] for _ in range(1500)]
    hasil_js = jalankan(js, "ujiFormat", argumen)
    for (p, q, d), hj in zip(argumen, hasil_js):
        from sympy import Rational
        assert hj == format_angka(Rational(int(p), int(q)), d), (p, q, d)


def test_periksa_identik_untuk_semua_soal(js, kasus_mesin):
    konten = Konten(AKAR / "content")
    soal_uji = [s for _, s in konten.soal.values()]
    soal_uji.append({"tipe": "angka", "satuan": "persen", "kunci": "12,5", "toleransi": "0,05",
                     "kesalahan_umum": [{"nilai": "11,11", "kode": "bagi_hj", "pesan": "Pembaginya harga jual."}]})
    jawaban_umum = [k["masukan"] for k in kasus_mesin["parse"]] + masukan_acak(300, benih=3) + ["800", "12,54", "11,1"]
    argumen = []
    for s in soal_uji:
        kandidat = list(jawaban_umum) + [s["kunci"]] + [k["nilai"] for k in s.get("kesalahan_umum", [])]
        if s["tipe"] == "pilihan":
            kandidat += [p["id"] for p in s["pilihan"]] + ["", "z"]
        argumen += [[s, j] for j in kandidat]
    hasil_js = jalankan(js, "periksa", argumen)
    for (s, j), hj in zip(argumen, hasil_js):
        assert hj == periksa(s, j), f"Beda pada soal {s.get('id')} jawaban {j!r}"


def test_posisi_kunci_pilihan_tersebar():
    """Jawaban benar pilihan ganda tidak boleh menumpuk di satu posisi tampilan."""
    from collections import Counter

    sumber = (AKAR / "apps" / "web" / "js" / "local" / "acak.js").read_text(encoding="utf-8")
    ctx = py_mini_racer.MiniRacer()
    ctx.eval(re.sub(r"^export\s+", "", sumber, flags=re.M))
    konten = Konten(AKAR / "content")
    pilihan = [s for _, s in konten.soal.values() if s["tipe"] == "pilihan"]
    urutan = json.loads(ctx.eval(f"JSON.stringify({json.dumps(pilihan)}.map(s => urutanPilihan(s).map(p => p.id)))"))
    posisi = Counter(u.index(s["kunci"]) for s, u in zip(pilihan, urutan))
    for s, u in zip(pilihan, urutan):
        assert sorted(u) == sorted(p["id"] for p in s["pilihan"]), s["id"]
    assert max(posisi.values()) <= 0.5 * len(pilihan), f"Kunci menumpuk: {dict(posisi)}"
    assert len(posisi) == 3, f"Kunci harus pernah muncul di setiap posisi: {dict(posisi)}"
