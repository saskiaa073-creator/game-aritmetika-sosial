// Logika aplikasi untuk versi statis (tanpa server), padanan PERSIS dari Python:
//   poinUntuk, hitungStreak, kategoriNilai, hitungHasilTes  -> apps/api/main.py
//   prosesGiliranBawaan (asisten tanpa AI)                   -> apps/api/asisten.py
// Setiap perubahan di salah satu sisi WAJIB diterapkan di sisi lain (dites tests/test_versi_statis.py).
import { periksa } from "./mesin.js";

export function poinUntuk(petunjukDipakai) {
  return Math.max(10 - 2 * petunjukDipakai, 4);
}

/** tanggalAktif: Set berisi "YYYY-MM-DD"; hariIni: "YYYY-MM-DD". */
export function hitungStreak(tanggalAktif, hariIni) {
  const geser = (t, n) => {
    const d = new Date(`${t}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  };
  let hari = tanggalAktif.has(hariIni) ? hariIni : geser(hariIni, -1);
  let jumlah = 0;
  while (tanggalAktif.has(hari)) {
    jumlah += 1;
    hari = geser(hari, -1);
  }
  return jumlah;
}

export function kategoriNilai(nilai) {
  if (nilai >= 86) return "Sangat Baik";
  if (nilai >= 71) return "Baik";
  if (nilai >= 56) return "Cukup";
  return "Perlu Bimbingan";
}

/** jawaban: [{id, soal_id, status}] milik satu siswa untuk modul tes ini. */
export function hitungHasilTes(modul, jawaban) {
  const pertama = {};
  for (const j of [...jawaban].sort((a, b) => a.id - b.id)) {
    if (j.status !== "tidak_valid" && !(j.soal_id in pertama)) pertama[j.soal_id] = j.status;
  }
  const butir = Object.entries(modul.butir).map(([nomor, info]) => {
    const soalButir = modul.soal.filter((s) => String(s.butir) === nomor);
    return {
      nomor: Number(nomor), judul: info.judul, indikator: info.indikator,
      skor: soalButir.filter((s) => pertama[s.id] === "benar").reduce((t, s) => t + s.skor, 0),
      maks: soalButir.reduce((t, s) => t + s.skor, 0),
    };
  });
  const total = butir.reduce((t, b) => t + b.skor, 0);
  const maks = butir.reduce((t, b) => t + b.maks, 0);
  const nilai = Math.floor((total * 200 + maks) / (2 * maks));
  const idSoal = new Set(modul.soal.map((s) => s.id));
  const statusPertama = {};
  for (const [sid, st] of Object.entries(pertama)) if (idSoal.has(sid)) statusPertama[sid] = st;
  return {
    butir, total, maks, nilai, kategori: kategoriNilai(nilai),
    tahap_dijawab: Object.keys(pertama).length, jumlah_tahap: modul.soal.length, status_pertama: statusPertama,
  };
}

// ---------- Asisten tanpa AI (teks bawaan), padanan asisten.py ----------
export const TAHAP_RMT = ["Orientasi", "Mengenali data", "Membandingkan", "Menghitung selisih", "Menghubungkan ke persen", "Refleksi"];

const PERTANYAAN_BAWAAN = [
  "Coba baca soalnya pelan-pelan. Apa yang ditanyakan soal ini?",
  "Dari soal itu, mana harga beli (modal) dan mana harga jual? Jangan lupa biaya tambahan, kalau ada.",
  "Bandingkan harga jual dengan harga beli. Mana yang lebih besar? Jadi untung atau rugi?",
  "Berapa selisih harga jual dan harga beli dalam rupiah?",
  "Sekarang bagi selisih itu dengan harga beli, lalu kalikan 100%. Berapa hasilnya?",
  "Apakah hasilmu masuk akal? Coba jelaskan mengapa pembaginya harga beli, bukan harga jual.",
];

export const PESAN_KUOTA_HABIS = "Kuota Asisten hari ini sudah habis. Kamu masih bisa memakai tombol Petunjuk di soal. Sampai besok!";

const POLA_BANTUAN = /bingung|(tidak|gak|ga|nggak|enggak|ndak)[ \t\n\r\f\v]*(tahu|tau|ngerti|mengerti|paham)|bantu/i;
const POLA_TAMPAK_ANGKA = /^[0-9 \t\n\r\f\v.,%rRpP+\-*/x×:()]+$/;

export const mintaBantuan = (pesan) => POLA_BANTUAN.test(pesan);

export function cekJawaban(soal, pesan) {
  const teks = pesan.trim();
  if (soal.tipe !== "angka" || !POLA_TAMPAK_ANGKA.test(teks) || !/[0-9]/.test(teks)) return null;
  const hasil = periksa(soal, teks);
  return { status: hasil.status, kode: hasil.kode, pesan: hasil.pesan };
}

export function balasanBawaan(tahap, petunjuk, cek) {
  const bagian = [];
  if (cek && cek.status === "benar") {
    bagian.push("Mesin memeriksa: jawabanmu benar. Tulis jawaban itu di kotak jawaban soal untuk mendapat poin.");
  }
  if (petunjuk && !(cek && cek.status === "benar")) bagian.push(`Petunjuk: ${petunjuk}`);
  bagian.push(PERTANYAAN_BAWAAN[tahap - 1]);
  return bagian.join(" ");
}

/** riwayat: [{peran, isi, status_cek, minta_bantuan}] sebelumnya untuk soal ini. */
export function prosesGiliranBawaan(soal, pesan, riwayat) {
  const cek = cekJawaban(soal, pesan);
  const bantuan = mintaBantuan(pesan);
  const siswaSebelumnya = riwayat.filter((m) => m.peran === "siswa");
  const sudahBenar = siswaSebelumnya.some((m) => m.status_cek === "benar");
  const benarSekarang = Boolean(cek && cek.status === "benar");
  const tahap = benarSekarang || sudahBenar ? 6 : Math.min(5, siswaSebelumnya.length + 1);
  const salah = siswaSebelumnya.filter((m) => m.status_cek === "salah").length + (cek && cek.status === "salah" ? 1 : 0);
  const tingkat = Math.min(3, salah + siswaSebelumnya.reduce((t, m) => t + m.minta_bantuan, 0) + (bantuan ? 1 : 0));
  const petunjuk = tingkat ? soal.petunjuk[tingkat - 1] : null;
  return {
    balasan: balasanBawaan(tahap, petunjuk, cek), sumber: "bawaan", cek_mesin: cek, minta_bantuan: bantuan,
    tahap: { nomor: tahap, nama: TAHAP_RMT[tahap - 1], jumlah: TAHAP_RMT.length },
    tingkat_petunjuk: tingkat,
  };
}
