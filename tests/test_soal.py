import unittest

from tests.soal_generator import (
    buat_paket,
    buat_paket_tes,
    format_persen,
    format_rupiah,
    nilai_tahap,
    parse_angka,
)


class TesSoal(unittest.TestCase):
    def test_parse_angka_format_indonesia(self):
        kasus = {
            "25000": 25000,
            "25.000": 25000,
            "Rp25.000": 25000,
            "12,5": 12.5,
            "25%": 25,
            "Rp 1.234.567,5": 1234567.5,
            "-2.500": -2500,
        }
        for masukan, hasil in kasus.items():
            with self.subTest(masukan=masukan):
                self.assertEqual(parse_angka(masukan), hasil)

        for masukan in (None, "", "dua puluh", "Rp25.000,00x", True):
            with self.subTest(masukan=masukan):
                self.assertIsNone(parse_angka(masukan))

    def test_format_rupiah_dan_persen(self):
        self.assertEqual(format_rupiah(25000), "Rp25.000")
        self.assertEqual(format_rupiah(1234567), "Rp1.234.567")
        self.assertEqual(format_rupiah(-25000), "Rp-25.000")
        self.assertEqual(format_persen(12.5), "12,5%")
        self.assertEqual(format_persen(25), "25%")
        self.assertEqual(format_persen(12.345, desimal=2), "12,35%")

    def test_lima_ratus_paket_acak(self):
        for seed in range(500):
            with self.subTest(seed=seed):
                paket = buat_paket(seed)
                self.assertEqual(paket["skor_maksimum"], 24)
                self.assertEqual(len(paket["soal"]), 4)
                self.assertEqual(buat_paket(seed), paket)

                for soal in paket["soal"]:
                    jumlah_skor = sum(tahap["skor"] for tahap in soal["tahap"])
                    self.assertEqual(soal["skor_maksimum"], 6)
                    self.assertEqual(jumlah_skor, 6)

                    for tahap in soal["tahap"]:
                        if "jawaban_bagian" in tahap:
                            kunci = tahap["jawaban_bagian"]
                        else:
                            kunci = tahap["jawaban"]
                        self.assertEqual(nilai_tahap(tahap, kunci), tahap["skor"])

                        if tahap["jenis"] == "pilihan":
                            self.assertIn("opsi", tahap)
                            self.assertEqual(len(tahap["opsi"]), len(set(tahap["opsi"])))
                            self.assertIn(tahap["jawaban"], tahap["opsi"])

    def test_skor_parsial_jawaban_beberapa_bidang(self):
        paket = buat_paket(17)
        for soal in paket["soal"]:
            for tahap in soal["tahap"]:
                kunci = tahap.get("jawaban_bagian")
                if not isinstance(kunci, dict) or len(kunci) < 2:
                    continue
                jawaban = dict(kunci)
                nama_pertama = next(iter(kunci))
                jawaban[nama_pertama] = "jawaban keliru"
                skor = nilai_tahap(tahap, jawaban)
                self.assertGreater(skor, 0)
                self.assertLess(skor, tahap["skor"])
                return
        self.fail("Tidak ditemukan tahap yang mendukung skor parsial.")

    def test_jebakan_pemasok_kios_pertama(self):
        kios = buat_paket_tes()["soal"][0]
        pemasok = kios["pemasok"]
        untung = {
            nama: data["harga_jual"] - data["modal"]
            for nama, data in pemasok.items()
        }
        persen = {
            nama: untung[nama] / data["modal"] * 100
            for nama, data in pemasok.items()
        }
        self.assertEqual(max(untung, key=untung.get), "C")
        self.assertEqual(max(persen, key=persen.get), "A")
        self.assertEqual(kios["tahap"][2]["jawaban"], "A")
        self.assertEqual(kios["tahap"][3]["jawaban"], "C")


if __name__ == "__main__":
    unittest.main()
