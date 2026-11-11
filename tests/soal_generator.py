"""Pembuat soal Pasar Pintar untuk materi Aritmetika Sosial."""

from __future__ import annotations

import math
import random
import re
from typing import Any

MATERI = """Ringkasan rumus Aritmetika Sosial

Untung = harga jual - harga beli seluruhnya.
Rugi = harga beli seluruhnya - harga jual.
Persentase untung = untung / harga beli seluruhnya x 100%.
Persentase rugi = rugi / harga beli seluruhnya x 100%.
Harga beli seluruhnya mencakup harga barang dan biaya tambahan, misalnya ongkos
angkut, perbaikan, atau pengecatan. Persentase untung atau rugi dibandingkan
dengan harga beli seluruhnya, bukan dengan harga jual.
Untuk barang yang sebagian rusak, berat yang dijual = berat awal - berat rusak;
hasil penjualan = berat yang dijual x harga jual per satuan.
"""


def format_rupiah(nilai: int | float) -> str:
    """Mengubah angka menjadi teks rupiah dengan pemisah ribuan Indonesia."""
    angka = round(nilai)
    teks = f"{abs(angka):,}".replace(",", ".")
    return f"Rp{'-' if angka < 0 else ''}{teks}"


def format_persen(nilai: int | float, desimal: int = 1) -> str:
    """Mengubah angka persentase menjadi teks dengan koma desimal Indonesia."""
    teks = f"{nilai:.{desimal}f}".rstrip("0").rstrip(".")
    return f"{teks.replace('.', ',')}%"


def parse_angka(nilai: Any) -> float | None:
    """Membaca angka umum dan format angka Indonesia; None jika tidak valid."""
    if isinstance(nilai, bool) or nilai is None:
        return None
    if isinstance(nilai, (int, float)):
        angka = float(nilai)
        return angka if math.isfinite(angka) else None
    teks = str(nilai).strip().lower()
    if not teks:
        return None
    teks = re.sub(r"rp\.?\s*", "", teks).replace("%", "").replace(" ", "")
    teks = teks.replace(".", "").replace(",", ".")
    if not re.fullmatch(r"[+-]?(?:\d+(?:\.\d*)?|\.\d+)", teks):
        return None
    try:
        angka = float(teks)
    except ValueError:
        return None
    return angka if math.isfinite(angka) else None


def _sama(jawaban: Any, kunci: Any) -> bool:
    if isinstance(kunci, (int, float)) and not isinstance(kunci, bool):
        angka = parse_angka(jawaban)
        return angka is not None and math.isclose(angka, float(kunci), rel_tol=0, abs_tol=0.01)
    return str(jawaban).strip().casefold() == str(kunci).strip().casefold()


def nilai_tahap(tahap: dict[str, Any], jawaban: Any) -> float:
    """Menghitung skor tahap, termasuk skor parsial untuk jawaban beberapa bidang."""
    skor = float(tahap.get("skor", 0))
    kunci_bagian = tahap.get("jawaban_bagian")
    if isinstance(kunci_bagian, dict):
        if not isinstance(jawaban, dict) or not kunci_bagian:
            return 0.0
        benar = sum(
            nama in jawaban and _sama(jawaban[nama], kunci)
            for nama, kunci in kunci_bagian.items()
        )
        return round(skor * benar / len(kunci_bagian), 2)
    if _sama(jawaban, tahap.get("jawaban")):
        return skor
    if any(_sama(jawaban, alternatif) for alternatif in tahap.get("alternatif", [])):
        return skor
    return 0.0


def kategori_nilai(nilai: int | float) -> str:
    """Menentukan kategori hasil belajar pada rentang nilai 0 sampai 100."""
    if nilai >= 86:
        return "Sangat Baik"
    if nilai >= 71:
        return "Baik"
    if nilai >= 56:
        return "Cukup"
    return "Perlu Bimbingan"


def _tahap(
    pertanyaan: str,
    skor: int,
    petunjuk: str,
    pembahasan: str,
    jawaban: Any = None,
    jenis: str = "angka",
    bidang: list[dict[str, str]] | None = None,
    jawaban_bagian: dict[str, Any] | None = None,
    opsi: list[str] | None = None,
) -> dict[str, Any]:
    tahap: dict[str, Any] = {
        "pertanyaan": pertanyaan, "jenis": jenis, "skor": skor,
        "petunjuk": petunjuk, "pembahasan": pembahasan,
    }
    if bidang is not None:
        tahap["bidang"] = bidang
    if opsi is not None:
        tahap["opsi"] = opsi
    if jawaban_bagian is not None:
        tahap["jawaban_bagian"] = jawaban_bagian
    else:
        tahap["jawaban"] = jawaban
    return tahap


def _kios(nomor: int, indikator: str, judul: str, tahap: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        "id": f"kios_{nomor}", "nomor": nomor, "indikator": indikator,
        "judul": judul, "skor_maksimum": sum(item["skor"] for item in tahap),
        "tahap": tahap,
    }


def _kios_1_dengan_data(modal: dict[str, int], harga_jual: dict[str, int]) -> dict[str, Any]:
    untung = {nama: harga_jual[nama] - modal[nama] for nama in modal}
    persen = {nama: untung[nama] / modal[nama] * 100 for nama in modal}
    bidang_untung = [{"nama": n, "label": f"Untung pemasok {n} (Rp)"} for n in modal]
    bidang_persen = [{"nama": n, "label": f"Persentase untung pemasok {n} (%)"} for n in modal]
    pemasok_terbaik = max(persen, key=persen.get)
    untung_terbesar = max(untung, key=untung.get)
    tahap = [
        _tahap("Hitung untung rupiah dari setiap pemasok.", 1, "Kurangi modal dari harga jual.",
               "Untung rupiah adalah harga jual dikurangi modal.", bidang=bidang_untung, jawaban_bagian=untung),
        _tahap("Hitung persentase untung setiap pemasok terhadap modalnya.", 2,
               "Bagi untung dengan modal, lalu kalikan 100%.",
               "Persentase untung dihitung dengan rumus untung dibagi modal lalu dikalikan 100%.",
               bidang=bidang_persen, jawaban_bagian=persen),
        _tahap("Pemasok mana yang memberikan persentase untung terbesar?", 1,
               "Bandingkan persentase, bukan besar untung rupiahnya.",
               f"Pemasok {pemasok_terbaik} memiliki persentase untung terbesar.",
               jawaban=pemasok_terbaik, jenis="pilihan", opsi=list(modal)),
        _tahap("Pemasok mana yang memberikan untung rupiah terbesar?", 1,
               "Bandingkan hasil pengurangan harga jual dan modal.",
               f"Pemasok {untung_terbesar} memiliki untung rupiah terbesar; ini berbeda dari persentase terbesar.",
               jawaban=untung_terbesar, jenis="pilihan", opsi=list(modal)),
        _tahap("Ukuran apa yang tepat untuk memilih pemasok paling menguntungkan secara relatif?", 1,
               "Gunakan ukuran relatif terhadap modal.",
               "Bandingkan persentase untung karena modal setiap pemasok berbeda.",
               jawaban="persentase", jenis="pilihan", opsi=["persentase", "untung rupiah"]),
    ]
    soal = _kios(1, "Mathematical Reasoning", "Pilih Pemasok", tahap)
    soal["pemasok"] = {n: {"modal": modal[n], "harga_jual": harga_jual[n]} for n in modal}
    return soal


def buat_soal_kios_1(acak: random.Random | None = None) -> dict[str, Any]:
    """Membuat soal memilih pemasok dengan persentase untung terbesar."""
    acak = acak or random.Random()
    modal = {"A": acak.randint(2, 5) * 100_000,
             "B": acak.randint(18, 30) * 100_000,
             "C": acak.randint(8, 12) * 100_000}
    persen = {"A": 30, "B": 20, "C": 25}
    harga_jual = {nama: modal[nama] * (100 + persen[nama]) // 100 for nama in modal}
    soal = _kios_1_dengan_data(modal, harga_jual)
    soal["cerita"] = "Bandingkan tiga pemasok kue bolu. Perhatikan untung rupiah dan persentase untung."
    return soal


def _kios_2_dengan_data(jumlah_peti: int, harga_peti: int, angkut: int,
                         kg_per_peti: int, kg_busuk: int, harga_per_kg: int) -> dict[str, Any]:
    kg_awal = jumlah_peti * kg_per_peti
    kg_jual = kg_awal - kg_busuk
    modal = jumlah_peti * harga_peti + angkut
    pendapatan = kg_jual * harga_per_kg
    untung = pendapatan - modal
    jenis = "untung" if untung >= 0 else "rugi"
    besar = abs(untung)
    persen = round(besar / modal * 100, 1)
    tahap = [
        _tahap("Berapa modal seluruhnya, termasuk ongkos angkut?", 1,
               "Jumlahkan harga semua peti dan ongkos angkut.",
               f"Modal seluruhnya = {jumlah_peti} x {format_rupiah(harga_peti)} + {format_rupiah(angkut)} = {format_rupiah(modal)}.", jawaban=modal),
        _tahap("Berapa kilogram buah yang dibeli sebelum ada yang busuk?", 1,
               "Kalikan jumlah peti dengan berat per peti.",
               f"Berat awal = {jumlah_peti} x {kg_per_peti} kg = {kg_awal} kg.", jawaban=kg_awal),
        _tahap("Berapa kilogram buah yang dapat dijual?", 1,
               "Kurangi berat awal dengan berat buah yang busuk.",
               f"Berat yang dijual = {kg_awal} - {kg_busuk} = {kg_jual} kg.", jawaban=kg_jual),
        _tahap("Berapa hasil penjualan seluruh buah yang tidak busuk?", 1,
               "Kalikan berat yang dapat dijual dengan harga per kilogram.",
               f"Pendapatan = {kg_jual} x {format_rupiah(harga_per_kg)} = {format_rupiah(pendapatan)}.", jawaban=pendapatan),
        _tahap("Apakah pedagang untung atau rugi, dan berapa besarannya?", 1,
               "Bandingkan pendapatan dengan modal seluruhnya.",
               f"Pedagang {jenis} {format_rupiah(besar)}.",
               bidang=[{"nama": "jenis", "label": "Ketik untung atau rugi"},
                       {"nama": "nilai", "label": "Besar untung/rugi (Rp)"}],
               jawaban_bagian={"jenis": jenis, "nilai": besar}),
        _tahap(f"Berapa persentase {jenis} terhadap modal seluruhnya?", 1,
               "Bagi besar untung atau rugi dengan modal, lalu kalikan 100%.",
               f"Persentase {jenis} = {format_rupiah(besar)} / {format_rupiah(modal)} x 100% = {format_persen(persen)}.", jawaban=persen),
    ]
    soal = _kios(2, "Formulating Situations Mathematically", "Buah untuk Dijual", tahap)
    soal["cerita"] = (f"Pedagang membeli {jumlah_peti} peti mangga seharga {format_rupiah(harga_peti)} per peti. "
                      f"Ongkos angkut {format_rupiah(angkut)}. Setiap peti berisi {kg_per_peti} kg, "
                      f"{kg_busuk} kg busuk, dan sisanya dijual {format_rupiah(harga_per_kg)} per kg.")
    soal["data"] = {"jumlah_peti": jumlah_peti, "harga_per_peti": harga_peti,
                    "ongkos_angkut": angkut, "kg_per_peti": kg_per_peti,
                    "kg_busuk": kg_busuk, "harga_jual_per_kg": harga_per_kg}
    return soal


def buat_soal_kios_2(acak: random.Random | None = None) -> dict[str, Any]:
    """Membuat soal situasi buah dengan biaya, buah busuk, dan hasil penjualan."""
    acak = acak or random.Random()
    data = None
    for _ in range(500):
        peti = acak.choice([2, 3, 4])
        harga = acak.choice([100_000, 150_000, 200_000, 250_000, 300_000])
        angkut = acak.choice([10_000, 20_000, 30_000, 40_000, 50_000])
        berat = acak.choice([20, 25, 30])
        busuk = acak.randint(2, min(8, peti * berat - 1))
        berat_jual = peti * berat - busuk
        modal = peti * harga + angkut
        persen = acak.choice([10, 12.5, 20, 25])
        pendapatan = modal * (100 + persen) / 100
        if pendapatan.is_integer() and int(pendapatan) % berat_jual == 0:
            data = (peti, harga, angkut, berat, busuk, int(pendapatan) // berat_jual)
            break
    if data is None:
        data = (2, 300_000, 40_000, 25, 5, 16_000)
    return _kios_2_dengan_data(*data)


def _kios_3_dengan_data(harga_beli: int, biaya: int, persen: int, jenis: str) -> dict[str, Any]:
    modal = harga_beli + biaya
    perubahan = modal * persen // 100
    harga_jual = modal - perubahan if jenis == "rugi" else modal + perubahan
    tahap = [
        _tahap("Berapa modal seluruhnya setelah biaya perbaikan dan pengecatan?", 1,
               "Tambahkan harga beli dengan semua biaya perbaikan.",
               f"Modal seluruhnya = {format_rupiah(harga_beli)} + {format_rupiah(biaya)} = {format_rupiah(modal)}.", jawaban=modal),
        _tahap(f"Jika {jenis} {format_persen(persen)}, berapa besar {jenis} dalam rupiah?", 2,
               "Kalikan persentase dengan modal seluruhnya.",
               f"{jenis.capitalize()} = {format_rupiah(modal)} x {format_persen(persen)} = {format_rupiah(perubahan)}.", jawaban=perubahan),
        _tahap("Tentukan harga jual barang bekas tersebut.", 2,
               "Untuk rugi, kurangi modal dengan rugi. Untuk untung, tambahkan untung ke modal.",
               f"Karena pedagang {jenis}, harga jualnya adalah {format_rupiah(harga_jual)}.", jawaban=harga_jual),
        _tahap("Apakah harga jual lebih kecil atau lebih besar daripada modal?", 1,
               "Gunakan hubungan antara rugi/untung dan harga jual.",
               f"Karena pedagang {jenis}, harga jual {'lebih kecil' if jenis == 'rugi' else 'lebih besar'} daripada modal.",
               jawaban="lebih kecil" if jenis == "rugi" else "lebih besar", jenis="pilihan",
               opsi=["lebih kecil", "lebih besar"]),
    ]
    soal = _kios(3, "Employing Concepts, Facts, and Procedures", "Barang Bekas", tahap)
    soal["cerita"] = (f"Barang bekas dibeli seharga {format_rupiah(harga_beli)}. Biaya perbaikan dan pengecatan "
                      f"{format_rupiah(biaya)}. Barang dijual dengan {jenis} {format_persen(persen)} "
                      "dari modal seluruhnya.")
    return soal


def buat_soal_kios_3(acak: random.Random | None = None) -> dict[str, Any]:
    """Membuat soal harga jual barang bekas setelah perbaikan."""
    acak = acak or random.Random()
    return _kios_3_dengan_data(acak.randint(8, 20) * 100_000,
                               acak.randint(1, 5) * 100_000,
                               acak.choice([10, 12, 15, 20, 25]),
                               acak.choice(["rugi", "untung"]))


def _kios_4_dengan_data(modal: int, harga_jual: int, klaim: int | float) -> dict[str, Any]:
    untung = harga_jual - modal
    persen_benar = untung / modal * 100
    persen_klaim = round(untung / harga_jual * 100, 2)
    tahap = [
        _tahap("Berapa untung dalam rupiah?", 1, "Kurangi harga beli dari harga jual.",
               f"Untung = {format_rupiah(harga_jual)} - {format_rupiah(modal)} = {format_rupiah(untung)}.", jawaban=untung),
        _tahap("Hitung persentase jika untung dibagi harga jual.", 1,
               "Lakukan pembagian sesuai klaim, lalu kalikan 100%.",
               f"Perhitungan tersebut menghasilkan {format_persen(persen_klaim)}.", jawaban=persen_klaim),
        _tahap("Dalam rumus yang benar, untung dibagi dengan apa?", 1,
               "Gunakan nilai awal sebelum barang dijual.",
               "Penyebut persentase untung yang benar adalah harga beli atau modal.",
               jawaban="modal", jenis="pilihan", opsi=["modal", "harga jual"]),
        _tahap("Berapa persentase untung yang benar?", 1,
               "Bagi untung dengan harga beli, bukan harga jual.",
               f"Persentase yang benar = {format_rupiah(untung)} / {format_rupiah(modal)} x 100% = {format_persen(persen_benar)}.", jawaban=persen_benar),
        _tahap(f"Apakah klaim untung {format_persen(klaim)} benar?", 1,
               "Bandingkan klaim dengan persentase menggunakan penyebut yang benar.",
               f"Tidak. Persentase yang benar adalah {format_persen(persen_benar)}.",
               jawaban="tidak", jenis="pilihan", opsi=["ya", "tidak"]),
        _tahap("Mengapa harga beli atau modal menjadi penyebut yang benar?", 1,
               "Persentase untung mengukur pertambahan terhadap nilai awal.",
               "Untung dibandingkan dengan modal awal; harga jual sudah mencakup modal dan untung.",
               jawaban="modal", jenis="pilihan", opsi=["modal", "harga jual"]),
    ]
    soal = _kios(4, "Interpreting, Applying, and Evaluating", "Periksa Klaim", tahap)
    soal["cerita"] = (f"Seseorang membeli barang seharga {format_rupiah(modal)} dan menjualnya "
                      f"seharga {format_rupiah(harga_jual)}. Ia mengklaim untung "
                      f"{format_persen(klaim)} karena membagi untung dengan harga jual.")
    return soal


def buat_soal_kios_4(acak: random.Random | None = None) -> dict[str, Any]:
    """Membuat soal evaluasi klaim persentase untung yang keliru."""
    acak = acak or random.Random()
    modal = acak.randint(2, 10) * 100_000
    persen = acak.choice([20, 25, 30])
    harga_jual = modal * (100 + persen) // 100
    klaim = round((harga_jual - modal) / harga_jual * 100, 2)
    return _kios_4_dengan_data(modal, harga_jual, klaim)


def buat_paket(seed: int | None = None) -> dict[str, Any]:
    """Membuat empat soal latihan; seed sama menghasilkan paket yang sama."""
    acak = random.Random(seed)
    soal = [buat_soal_kios_1(acak), buat_soal_kios_2(acak),
            buat_soal_kios_3(acak), buat_soal_kios_4(acak)]
    return {"mode": "latihan", "soal": soal, "skor_maksimum": 24}


def buat_paket_tes() -> dict[str, Any]:
    """Membuat paket tes dengan angka instrumen yang diberikan."""
    soal_1 = _kios_1_dengan_data(
        {"A": 20_000, "B": 40_000, "C": 50_000},
        {"A": 25_000, "B": 48_000, "C": 61_000},
    )
    soal_1["cerita"] = (
        "Bu Dina memilih pemasok kue bolu: A bermodal Rp20.000 dijual Rp25.000, "
        "B bermodal Rp40.000 dijual Rp48.000, dan C bermodal Rp50.000 dijual Rp61.000."
    )
    soal_2 = _kios_2_dengan_data(2, 300_000, 40_000, 25, 5, 16_000)
    soal_2["cerita"] = (
        "Pedagang membeli 2 peti mangga seharga Rp300.000 per peti, ongkos angkut Rp40.000. "
        "Setiap peti berisi 25 kg, 5 kg busuk, dan sisanya dijual Rp16.000 per kg."
    )
    soal_3 = _kios_3_dengan_data(1_200_000, 300_000, 12, "rugi")
    soal_3["cerita"] = (
        "Pak Budi membeli sepeda bekas Rp1.200.000. Biaya perbaikan dan pengecatan Rp300.000. "
        "Sepeda dijual dengan rugi 12% dari modal seluruhnya."
    )
    soal_4 = _kios_4_dengan_data(200_000, 250_000, 20)
    soal_4["cerita"] = (
        "Andi membeli jam tangan Rp200.000 dan menjualnya Rp250.000, lalu mengklaim untung 20%."
    )
    return {"mode": "tes", "soal": [soal_1, soal_2, soal_3, soal_4], "skor_maksimum": 24}
