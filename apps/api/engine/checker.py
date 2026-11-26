"""Pemeriksa jawaban deterministik. Benar/salah TIDAK PERNAH ditentukan AI.

Padanan JavaScript: fungsi periksa() di apps/web/js/local/mesin.js.
"""

from __future__ import annotations

from typing import Any

from .parser import GalatParse, parse

PESAN = {
    "benar": "Benar! Kerja bagus.",
    "salah": "Belum tepat. Coba buka petunjuk, lalu periksa lagi langkahmu.",
    "persen_tak_wajar": "Persentasenya lebih dari 100%. Masuk akal? Cek lagi angka pembaginya.",
    "pilihan_kosong": "Pilih salah satu jawaban dulu.",
}


def _hasil(status: str, kode: str, pesan: str) -> dict[str, Any]:
    return {"status": status, "benar": status == "benar", "kode": kode, "pesan": pesan}


def periksa(soal: dict[str, Any], jawaban: Any) -> dict[str, Any]:
    """Memeriksa jawaban siswa terhadap kunci soal.

    Hasil: {status: 'benar'|'salah'|'tidak_valid', benar: bool, kode: str, pesan: str}
    """
    if soal["tipe"] == "pilihan":
        id_pilihan = [p["id"] for p in soal["pilihan"]]
        if not isinstance(jawaban, str) or jawaban not in id_pilihan:
            return _hasil("tidak_valid", "pilihan_kosong", PESAN["pilihan_kosong"])
        if jawaban == soal["kunci"]:
            return _hasil("benar", "benar", PESAN["benar"])
        for k in soal.get("kesalahan_umum", []):
            if jawaban == k["nilai"]:
                return _hasil("salah", k["kode"], k["pesan"])
        return _hasil("salah", "salah", PESAN["salah"])

    try:
        nilai = parse(jawaban)
    except GalatParse as galat:
        return _hasil("tidak_valid", galat.kode, galat.pesan)

    toleransi = parse(soal.get("toleransi", "0"))
    if abs(nilai - parse(soal["kunci"])) <= toleransi:
        return _hasil("benar", "benar", PESAN["benar"])
    for k in soal.get("kesalahan_umum", []):
        if abs(nilai - parse(k["nilai"])) <= toleransi:
            return _hasil("salah", k["kode"], k["pesan"])
    if soal.get("satuan") == "persen" and nilai > 100:
        return _hasil("salah", "persen_tak_wajar", PESAN["persen_tak_wajar"])
    return _hasil("salah", "salah", PESAN["salah"])
