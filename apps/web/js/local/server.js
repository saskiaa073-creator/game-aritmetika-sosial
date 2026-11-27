// "Server" di dalam peramban untuk VERSI STATIS (GitHub Pages, tanpa backend).
// Meniru endpoint apps/api/main.py dengan data di perangkat (localStorage).
// Penilaian tetap oleh mesin deterministik (mesin.js), logika poin/tes/asisten dari logika.js.
//
// Catatan jujur untuk versi statis: konten soal beserta kuncinya ikut terunduh ke perangkat
// (tidak ada server yang bisa menyembunyikannya). Versi server/Supabase tetap merahasiakannya.
import { periksa } from "./mesin.js";
import {
  hitungHasilTes, hitungStreak, PESAN_KUOTA_HABIS, poinUntuk, prosesGiliranBawaan, TAHAP_RMT, cekJawaban,
} from "./logika.js";

const KUNCI = "pasar_pintar_statis_v1";
const RAHASIA = ["kunci", "toleransi", "pembahasan", "kesalahan_umum"];
const SASARAN_HARIAN = 30;
const KUOTA_ASISTEN = 20;
const POLA_USERNAME = /^[a-z0-9_]{3,20}$/;
const POLA_PANGGILAN = /^[A-Za-z0-9 ]{2,15}$/;
const PESAN_TANPA_SERVER = "Fitur kelas dan dashboard guru hanya ada di versi online dengan server.";

class GalatApi extends Error {}

let konten = null;
async function muatKonten() {
  if (konten) return konten;
  const r = await fetch("data/konten.json");
  if (!r.ok) throw new GalatApi("Materi gagal dimuat. Periksa internet, lalu muat ulang halaman.");
  konten = await r.json();
  konten.soal = {};
  for (const m of konten.modul) for (const s of m.soal) konten.soal[s.id] = { modulId: m.id, soal: s };
  return konten;
}

function baca() {
  try {
    const d = JSON.parse(localStorage.getItem(KUNCI) || "null");
    if (d && d.akun) return d;
  } catch {
    /* data rusak / penyimpanan diblokir: mulai dari kosong */
  }
  return { akun: {}, jawaban: [], pesan: [], urutan: 0 };
}
function simpan(d) {
  try {
    localStorage.setItem(KUNCI, JSON.stringify(d));
  } catch {
    throw new GalatApi("Penyimpanan perangkat penuh atau diblokir. Kemajuan tidak tersimpan.");
  }
}

const hariIni = () => new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10); // tanggal WIB

async function hashSandi(sandi, garam) {
  const data = new TextEncoder().encode(`${garam}:${sandi}`);
  const hasil = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hasil)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function pastikanDemo(d) {
  if (d.akun.siswa_demo) return;
  const garam = "demo";
  d.akun.siswa_demo = { nama_panggilan: "Siswa Demo", garam, sandi: await hashSandi("siswa12345", garam), urutan: 0 };
  simpan(d);
}

const tanpaRahasia = (s) => Object.fromEntries(Object.entries(s).filter(([k]) => !RAHASIA.includes(k)));

function sesiDari(d, token) {
  if (!token || !d.akun[token]) throw Object.assign(new GalatApi("Silakan masuk dulu."), { status: 401 });
  return token;
}

function statistik(d, username) {
  const js = d.jawaban.filter((j) => j.u === username);
  const hari = hariIni();
  return {
    poin_total: js.reduce((t, j) => t + j.poin, 0),
    poin_hari_ini: js.filter((j) => j.tanggal === hari).reduce((t, j) => t + j.poin, 0),
    streak: hitungStreak(new Set(js.filter((j) => j.status === "benar").map((j) => j.tanggal)), hari),
  };
}

async function tanganiAuth(d, jalur, body) {
  if (jalur === "/auth/daftar") {
    const username = String(body.username || "").trim().toLowerCase();
    const panggilan = String(body.nama_panggilan || "").split(/\s+/).filter(Boolean).join(" ");
    if (!POLA_USERNAME.test(username)) throw new GalatApi("Nama pengguna 3–20 karakter: huruf kecil, angka, atau garis bawah.");
    if (!POLA_PANGGILAN.test(panggilan)) throw new GalatApi("Nama panggilan 2–15 huruf atau angka. Jangan pakai nama lengkap.");
    if (String(body.password || "").length < 6) throw new GalatApi("Kata sandi minimal 6 karakter.");
    if (d.akun[username]) throw new GalatApi("Nama pengguna sudah dipakai. Coba yang lain.");
    const garam = crypto.getRandomValues(new Uint32Array(2)).join("-");
    d.akun[username] = { nama_panggilan: panggilan, garam, sandi: await hashSandi(body.password, garam), urutan: ++d.urutan };
    simpan(d);
    return { token: username, peran: "siswa", nama_panggilan: panggilan };
  }
  const username = String(body.username || "").trim().toLowerCase();
  const akun = d.akun[username];
  if (!akun || (await hashSandi(String(body.password || ""), akun.garam)) !== akun.sandi) {
    throw new GalatApi("Nama pengguna atau kata sandi salah.");
  }
  return { token: username, peran: "siswa", nama_panggilan: akun.nama_panggilan };
}

function cariSoal(k, soalId) {
  const isi = k.soal[soalId];
  if (!isi) throw new GalatApi("Soal tidak ditemukan.");
  return isi;
}

/** Padanan soal_untuk_asisten() di main.py, termasuk gerbang soal tes. */
function soalUntukAsisten(k, d, username, soalId) {
  const { modulId, soal } = cariSoal(k, soalId);
  const modul = k.modul.find((m) => m.id === modulId);
  if (modul.jenis === "tes") {
    const sudah = d.jawaban.some((j) => j.u === username && j.soal_id === soalId && j.status !== "tidak_valid");
    if (!sudah) throw new GalatApi("Jawab dulu tahap ini sendiri. Setelah itu Koko bisa membantumu memahaminya.");
  }
  return soal;
}

export async function apiLokal(jalur, { method = "GET", body } = {}, token = null) {
  const k = await muatKonten();
  const d = baca();
  await pastikanDemo(d);
  const [jalan, kueri = ""] = jalur.split("?");
  const p = jalan.split("/").filter(Boolean); // mis. ["modul", "m1", "hasil"]

  if (p[0] === "auth") return tanganiAuth(d, jalan, body || {});
  if (jalan === "/glosarium") return k.glosarium;
  if (p[0] === "guru" || jalan === "/kelas/gabung") throw new GalatApi(PESAN_TANPA_SERVER);

  const u = sesiDari(d, token);
  const akun = d.akun[u];

  if (jalan === "/saya") {
    return { username: u, nama_panggilan: akun.nama_panggilan, peran: "siswa", kelas: null,
      sasaran_harian: SASARAN_HARIAN, ...statistik(d, u) };
  }
  if (jalan === "/modul") {
    const benar = new Set(d.jawaban.filter((j) => j.u === u && j.status === "benar").map((j) => j.soal_id));
    return k.modul.map((m) => ({
      id: m.id, judul: m.judul, tujuan: m.tujuan, level: m.level, jenis: m.jenis || "latihan",
      jumlah_soal: m.soal.length, soal_benar: m.soal.filter((s) => benar.has(s.id)).length,
    }));
  }
  if (p[0] === "modul") {
    const modul = k.modul.find((m) => m.id === p[1]);
    if (!modul) throw new GalatApi("Modul tidak ditemukan.");
    if (p[2] === "hasil") {
      if (modul.jenis !== "tes") throw new GalatApi("Tes tidak ditemukan.");
      return hitungHasilTes(modul, d.jawaban.filter((j) => j.u === u && j.modul_id === modul.id));
    }
    return { ...modul, soal: modul.soal.map(tanpaRahasia) };
  }
  if (p[0] === "soal" && p[2] === "jawab") {
    const { modulId, soal } = cariSoal(k, p[1]);
    const petunjuk = Math.max(0, Math.min(3, Number(body?.petunjuk_dipakai) || 0));
    const hasil = periksa(soal, String(body?.jawaban ?? "").slice(0, 200));
    const sebelumnya = d.jawaban.filter((j) => j.u === u && j.soal_id === soal.id);
    const poin = hasil.benar && !sebelumnya.some((j) => j.status === "benar") ? poinUntuk(petunjuk) : 0;
    d.jawaban.push({ id: ++d.urutan, u, modul_id: modulId, soal_id: soal.id, status: hasil.status,
      kode: hasil.kode, petunjuk, poin, tanggal: hariIni() });
    simpan(d);
    const salah = sebelumnya.filter((j) => j.status === "salah").length + (hasil.status === "salah" ? 1 : 0);
    const respons = { ...hasil, poin };
    if (hasil.benar || salah >= 3) respons.pembahasan = soal.pembahasan;
    return respons;
  }
  if (jalan === "/peringkat") {
    return Object.entries(d.akun)
      .map(([nama, a]) => ({ nama, a, poin: d.jawaban.filter((j) => j.u === nama).reduce((t, j) => t + j.poin, 0) }))
      .sort((x, y) => y.poin - x.poin || x.a.urutan - y.a.urutan)
      .slice(0, 20)
      .map((b, i) => ({ peringkat: i + 1, nama_panggilan: b.a.nama_panggilan, poin: b.poin, saya: b.nama === u }));
  }
  if (p[0] === "asisten") {
    const pesanHariIni = d.pesan.filter((m) => m.u === u && m.peran === "siswa" && m.tanggal === hariIni()).length;
    if (p[1] === "status") {
      return { ai_aktif: false, kuota: KUOTA_ASISTEN, sisa_kuota: Math.max(0, KUOTA_ASISTEN - pesanHariIni), tahap: TAHAP_RMT };
    }
    if (p[1] === "riwayat") {
      const soal = soalUntukAsisten(k, d, u, p[2]);
      const semua = d.pesan.filter((m) => m.u === u && m.soal_id === p[2]).slice(-20);
      let cek = null;
      return semua.map((m) => {
        if (m.peran === "siswa") {
          cek = m.status_cek ? cekJawaban(soal, m.isi) : null;
          return { peran: "siswa", isi: m.isi };
        }
        const hasil = { peran: "asisten", isi: m.isi, cek_mesin: cek };
        cek = null;
        return hasil;
      });
    }
    const soal = soalUntukAsisten(k, d, u, body?.soal_id);
    const pesan = String(body?.pesan || "").trim().slice(0, 300);
    if (!pesan) throw new GalatApi("Pesan masih kosong.");
    if (pesanHariIni >= KUOTA_ASISTEN) {
      return { balasan: PESAN_KUOTA_HABIS, sumber: "bawaan", cek_mesin: null, tahap: null, tingkat_petunjuk: null,
        sisa_kuota: 0, kuota_habis: true };
    }
    const riwayat = d.pesan.filter((m) => m.u === u && m.soal_id === soal.id);
    const hasil = prosesGiliranBawaan(soal, pesan, riwayat);
    const hari = hariIni();
    d.pesan.push({ u, soal_id: soal.id, peran: "siswa", isi: pesan, status_cek: hasil.cek_mesin?.status || "",
      minta_bantuan: hasil.minta_bantuan ? 1 : 0, tanggal: hari });
    d.pesan.push({ u, soal_id: soal.id, peran: "asisten", isi: hasil.balasan, status_cek: "", minta_bantuan: 0, tanggal: hari });
    simpan(d);
    const { minta_bantuan: _, ...tanpaFlag } = hasil;
    return { ...tanpaFlag, sisa_kuota: Math.max(0, KUOTA_ASISTEN - pesanHariIni - 1), kuota_habis: false };
  }
  void kueri;
  throw new GalatApi("Halaman tidak ditemukan.");
}
