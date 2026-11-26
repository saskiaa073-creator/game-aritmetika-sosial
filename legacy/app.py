"""Antarmuka Streamlit untuk permainan Pasar Pintar."""

from __future__ import annotations

import csv
from datetime import datetime
from pathlib import Path
from typing import Any

import pandas as pd
import streamlit as st

try:
    from soal_generator import MATERI, buat_paket, buat_paket_tes, kategori_nilai, nilai_tahap
except ModuleNotFoundError as kesalahan:
    if kesalahan.name != "soal_generator":
        raise
    from tests.soal_generator import MATERI, buat_paket, buat_paket_tes, kategori_nilai, nilai_tahap


st.set_page_config(page_title="Pasar Pintar", page_icon="", layout="centered")
st.markdown(
    """
    <style>
    .judul-pasar { color: #155e63; font-size: 2rem; font-weight: 750; margin-bottom: 0; }
    .teks-redup { color: #667085; }
    div[data-testid="stProgressBar"] > div > div { background-color: #df8b36; }
    </style>
    """,
    unsafe_allow_html=True,
)


def _inisialisasi() -> None:
    """Menyiapkan nilai awal sesi permainan."""
    nilai_awal = {
        "halaman": "mulai",
        "nama": "",
        "identitas": "",
        "kelas": "",
        "mode": "latihan",
        "paket": None,
        "indeks_kios": 0,
        "indeks_tahap": 0,
        "skor_tahap": [],
        "koin": 0,
        "bintang": 0,
        "petunjuk_dibuka": False,
        "sudah_diperiksa": False,
        "skor_jawaban": 0.0,
        "rekap_tersimpan": False,
        "pesan_mulai": "",
    }
    for nama, nilai in nilai_awal.items():
        st.session_state.setdefault(nama, nilai)


def _mulai_permainan() -> None:
    """Memvalidasi identitas lalu menyiapkan soal sesuai mode pilihan."""
    nama = st.session_state.get("form_nama", "").strip()
    identitas = st.session_state.get("form_identitas", "").strip()
    kelas = st.session_state.get("form_kelas", "").strip()
    if not nama or not identitas or not kelas:
        st.session_state["pesan_mulai"] = "Lengkapi nama, NIM/NIS, dan kelas sebelum mulai."
        return

    mode = st.session_state.get("form_mode", "latihan")
    paket = buat_paket_tes() if mode == "tes" else buat_paket()
    st.session_state.update({
        "nama": nama,
        "identitas": identitas,
        "kelas": kelas,
        "mode": mode,
        "paket": paket,
        "halaman": "bermain",
        "indeks_kios": 0,
        "indeks_tahap": 0,
        "skor_tahap": [[0.0 for _ in soal["tahap"]] for soal in paket["soal"]],
        "koin": 0,
        "bintang": 0,
        "petunjuk_dibuka": False,
        "sudah_diperiksa": False,
        "skor_jawaban": 0.0,
        "rekap_tersimpan": False,
        "pesan_mulai": "",
    })


def _ambil_jawaban(nomor_kios: int, nomor_tahap: int, tahap: dict[str, Any]) -> Any:
    """Mengumpulkan jawaban satu bidang atau beberapa bidang dari formulir."""
    awalan = f"jawaban_{nomor_kios}_{nomor_tahap}"
    if "bidang" in tahap:
        return {
            bidang["nama"]: st.session_state.get(f"{awalan}_{bidang['nama']}", "")
            for bidang in tahap["bidang"]
        }
    return st.session_state.get(awalan, "")


def _periksa_jawaban(nomor_kios: int, nomor_tahap: int) -> None:
    """Menilai jawaban saat ini dan menambahkan koin satu kali."""
    if st.session_state.get("sudah_diperiksa"):
        return
    soal = st.session_state["paket"]["soal"][nomor_kios]
    tahap = soal["tahap"][nomor_tahap]
    jawaban = _ambil_jawaban(nomor_kios, nomor_tahap, tahap)
    skor = nilai_tahap(tahap, jawaban)
    st.session_state["skor_tahap"][nomor_kios][nomor_tahap] = skor
    st.session_state["skor_jawaban"] = skor
    st.session_state["koin"] += round(skor * 10)
    st.session_state["sudah_diperiksa"] = True


def _buka_petunjuk() -> None:
    st.session_state["petunjuk_dibuka"] = True


def _lanjut_tahap(nomor_kios: int, nomor_tahap: int) -> None:
    """Memajukan tahap, kios, atau membuka halaman hasil akhir."""
    soal = st.session_state["paket"]["soal"][nomor_kios]
    if nomor_tahap + 1 < len(soal["tahap"]):
        st.session_state["indeks_tahap"] = nomor_tahap + 1
    else:
        skor_kios = sum(st.session_state["skor_tahap"][nomor_kios])
        if skor_kios == soal["skor_maksimum"]:
            st.session_state["bintang"] += 1
        if nomor_kios + 1 < len(st.session_state["paket"]["soal"]):
            st.session_state["indeks_kios"] = nomor_kios + 1
            st.session_state["indeks_tahap"] = 0
        else:
            st.session_state["halaman"] = "hasil"
    st.session_state["petunjuk_dibuka"] = False
    st.session_state["sudah_diperiksa"] = False
    st.session_state["skor_jawaban"] = 0.0


def _ulangi_permainan() -> None:
    """Menghapus data sesi permainan dan kembali ke halaman mulai."""
    kunci_hapus = [
        "nama", "identitas", "kelas", "mode", "paket", "indeks_kios",
        "indeks_tahap", "skor_tahap", "koin", "bintang", "petunjuk_dibuka",
        "sudah_diperiksa", "skor_jawaban", "rekap_tersimpan", "pesan_mulai",
        "form_nama", "form_identitas", "form_kelas", "form_mode",
    ]
    for nama in kunci_hapus:
        st.session_state.pop(nama, None)
    st.session_state["halaman"] = "mulai"


def _rekap_hasil() -> dict[str, Any]:
    """Menyusun satu baris rekap nilai pemain."""
    paket = st.session_state["paket"]
    skor_kios = [sum(nilai) for nilai in st.session_state["skor_tahap"]]
    skor_total = sum(skor_kios)
    nilai = round(skor_total / paket["skor_maksimum"] * 100)
    baris: dict[str, Any] = {
        "waktu": datetime.now().astimezone().isoformat(timespec="seconds"),
        "nama": st.session_state["nama"],
        "nim_nis": st.session_state["identitas"],
        "kelas": st.session_state["kelas"],
        "mode": "Tes" if st.session_state["mode"] == "tes" else "Latihan",
    }
    for soal, skor in zip(paket["soal"], skor_kios):
        baris[soal["indikator"]] = skor
    baris["skor_total"] = skor_total
    baris["nilai"] = nilai
    baris["kategori"] = kategori_nilai(nilai)
    return baris


def _simpan_rekap(baris: dict[str, Any]) -> None:
    """Menambahkan hasil permainan ke berkas rekap CSV."""
    lokasi = Path("hasil") / "rekap_hasil.csv"
    lokasi.parent.mkdir(parents=True, exist_ok=True)
    perlu_header = not lokasi.exists() or lokasi.stat().st_size == 0
    with lokasi.open("a", newline="", encoding="utf-8") as berkas:
        penulis = csv.DictWriter(berkas, fieldnames=list(baris))
        if perlu_header:
            penulis.writeheader()
        penulis.writerow(baris)


def _tampilkan_sidebar() -> None:
    """Menampilkan identitas, mata uang permainan, status kios, dan materi."""
    with st.sidebar:
        st.markdown("## Pasar Pintar")
        if st.session_state["paket"] is None:
            st.caption("Game Aritmetika Sosial")
            return

        st.write(f"**Pemain:** {st.session_state['nama']}")
        st.caption(f"{st.session_state['identitas']} | Kelas {st.session_state['kelas']}")
        kolom_koin, kolom_bintang = st.columns(2)
        kolom_koin.metric("Koin", st.session_state["koin"])
        kolom_bintang.metric("Bintang", st.session_state["bintang"])
        st.divider()
        st.markdown("### Status Kios")
        indeks_aktif = st.session_state["indeks_kios"]
        for indeks, soal in enumerate(st.session_state["paket"]["soal"]):
            if st.session_state["halaman"] == "hasil" or indeks < indeks_aktif:
                status = "Selesai"
            elif indeks == indeks_aktif:
                status = "Sedang dikerjakan"
            else:
                status = "Belum dibuka"
            st.write(f"**{indeks + 1}. {soal['judul']}**  \n{status}")
        st.divider()
        with st.expander("Ringkasan Materi"):
            st.markdown(MATERI)
        st.button("Ulangi permainan", on_click=_ulangi_permainan, use_container_width=True)


def _tampilkan_halaman_mulai() -> None:
    st.markdown('<p class="judul-pasar">Pasar Pintar</p>', unsafe_allow_html=True)
    st.write("Game Aritmetika Sosial untuk mengelola untung, rugi, dan persentase.")
    st.markdown("### Data Pemain")
    with st.form("form_mulai"):
        st.text_input("Nama", key="form_nama")
        st.text_input("NIM/NIS", key="form_identitas")
        st.text_input("Kelas", key="form_kelas")
        st.radio(
            "Mode permainan",
            options=["latihan", "tes"],
            format_func=lambda nilai: "Mode Latihan" if nilai == "latihan" else "Mode Tes",
            horizontal=True,
            key="form_mode",
        )
        st.form_submit_button("Mulai bermain", on_click=_mulai_permainan, type="primary")
    if st.session_state["pesan_mulai"]:
        st.error(st.session_state["pesan_mulai"])


def _tampilkan_masukan(tahap: dict[str, Any], nomor_kios: int, nomor_tahap: int) -> None:
    """Menampilkan bidang angka, bidang jamak, atau pilihan dalam formulir."""
    awalan = f"jawaban_{nomor_kios}_{nomor_tahap}"
    terkunci = st.session_state["sudah_diperiksa"]
    if "bidang" in tahap:
        for bidang in tahap["bidang"]:
            st.text_input(
                bidang["label"],
                key=f"{awalan}_{bidang['nama']}",
                disabled=terkunci,
            )
    elif tahap["jenis"] == "pilihan":
        st.radio(
            "Pilih jawaban",
            options=tahap["opsi"],
            key=awalan,
            disabled=terkunci,
        )
    else:
        st.text_input("Jawaban", key=awalan, disabled=terkunci,
                      placeholder="Contoh: 25.000, 12,5, atau 25%")


def _tampilkan_halaman_bermain() -> None:
    paket = st.session_state["paket"]
    nomor_kios = st.session_state["indeks_kios"]
    nomor_tahap = st.session_state["indeks_tahap"]
    soal = paket["soal"][nomor_kios]
    tahap = soal["tahap"][nomor_tahap]
    jumlah_tahap = sum(len(item["tahap"]) for item in paket["soal"])
    tahap_selesai = sum(len(item["tahap"]) for item in paket["soal"][:nomor_kios]) + nomor_tahap

    st.progress(tahap_selesai / jumlah_tahap, text=f"Progres permainan: {tahap_selesai} dari {jumlah_tahap} tahap")
    st.markdown(f"### Kios {nomor_kios + 1}: {soal['judul']}")
    st.caption(f"Indikator: {soal['indikator']} | Skor kios: {sum(st.session_state['skor_tahap'][nomor_kios]):g}/{soal['skor_maksimum']}")
    with st.container(border=True):
        st.write(soal["cerita"])
        st.markdown(f"**Tahap {nomor_tahap + 1} dari {len(soal['tahap'])}**  ")
        st.write(tahap["pertanyaan"])
        st.caption(f"Nilai tahap ini: maksimum {tahap['skor']} poin")

    st.button("Lihat petunjuk", on_click=_buka_petunjuk, key="tombol_petunjuk")
    if st.session_state["petunjuk_dibuka"]:
        st.info(tahap["petunjuk"])

    with st.form(f"form_jawaban_{nomor_kios}_{nomor_tahap}"):
        _tampilkan_masukan(tahap, nomor_kios, nomor_tahap)
        if not st.session_state["sudah_diperiksa"]:
            st.form_submit_button(
                "Periksa jawaban",
                on_click=_periksa_jawaban,
                args=(nomor_kios, nomor_tahap),
                type="primary",
            )

    if st.session_state["sudah_diperiksa"]:
        skor = st.session_state["skor_jawaban"]
        if skor == tahap["skor"]:
            st.success(f"Jawaban benar. Kamu mendapat {skor:g} poin dan {round(skor * 10)} koin.")
        elif skor > 0:
            st.warning(f"Sebagian jawaban benar. Skor tahap: {skor:g} dari {tahap['skor']} poin.")
        else:
            st.error("Jawaban belum tepat. Simak pembahasan berikut.")
        st.info(tahap["pembahasan"])
        st.button(
            "Lanjut",
            on_click=_lanjut_tahap,
            args=(nomor_kios, nomor_tahap),
            type="primary",
            key="tombol_lanjut",
        )


def _tampilkan_halaman_hasil() -> None:
    baris = _rekap_hasil()
    if not st.session_state["rekap_tersimpan"]:
        _simpan_rekap(baris)
        st.session_state["rekap_tersimpan"] = True

    skor_total = baris["skor_total"]
    nilai = baris["nilai"]
    st.markdown('<p class="judul-pasar">Permainan Selesai</p>', unsafe_allow_html=True)
    st.write(f"Hasil untuk **{st.session_state['nama']}**")
    kolom_skor, kolom_nilai, kolom_kategori = st.columns(3)
    kolom_skor.metric("Skor", f"{skor_total:g}/24")
    kolom_nilai.metric("Nilai", f"{nilai}/100")
    kolom_kategori.metric("Kategori", baris["kategori"])

    soal = st.session_state["paket"]["soal"]
    rincian = pd.DataFrame([
        {"Indikator": item["indikator"], "Skor": sum(skor)}
        for item, skor in zip(soal, st.session_state["skor_tahap"])
    ])
    st.markdown("### Skor per Indikator")
    st.dataframe(rincian, hide_index=True, use_container_width=True)
    st.bar_chart(rincian, x="Indikator", y="Skor", use_container_width=True)

    data_unduh = pd.DataFrame([baris]).to_csv(index=False).encode("utf-8-sig")
    st.download_button(
        "Unduh hasil CSV",
        data=data_unduh,
        file_name=f"hasil_{st.session_state['identitas']}.csv",
        mime="text/csv",
    )
    st.caption("Hasil permainan juga tersimpan di hasil/rekap_hasil.csv pada perangkat ini.")


def main() -> None:
    _inisialisasi()
    _tampilkan_sidebar()
    if st.session_state["halaman"] == "mulai":
        _tampilkan_halaman_mulai()
    elif st.session_state["halaman"] == "bermain":
        _tampilkan_halaman_bermain()
    else:
        _tampilkan_halaman_hasil()


main()
