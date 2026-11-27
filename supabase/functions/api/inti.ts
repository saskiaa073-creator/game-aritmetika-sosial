// Inti Edge Function "api": padanan endpoint apps/api/main.py untuk Supabase.
// Benar/salah SELALU oleh mesin deterministik (mesin.js); poin, skor tes, dan asisten dari logika.js,
// keduanya file yang SAMA dengan versi peramban (disalin ke _shared oleh tools/siapkan_supabase.py).
// Kunci jawaban tidak pernah dikirim ke peramban sebelum siswa menjawab (kolom RAHASIA dibuang).
import { periksa } from "../_shared/mesin.js";
import {
  cekJawaban, hitungHasilTes, hitungStreak, PESAN_KUOTA_HABIS, poinUntuk, rencanaGiliran, selesaikanGiliran, TAHAP_RMT,
} from "../_shared/logika.js";
import type { Gudang, Jawaban, Kelas, Pengguna } from "./gudang.ts";
import { bacaToken, buatToken, cocokkanKataSandi, hashKataSandi, ITERASI_BAWAAN } from "./keamanan.ts";

// deno-lint-ignore no-explicit-any
type Apa = any;
export interface Konten { modul: Apa[]; glosarium: Apa[] }
export type PemanggilAi = (pesan: { role: string; content: string }[]) => Promise<string | null>;
export interface Pengaturan {
  appSecret: string;
  tokenJam: number;
  sasaranHarian: number;
  kuotaAi: number;
  aiAktif: boolean;
  asalDiizinkan: string[];
  iterasi?: number;
}
export interface Ketergantungan {
  gudang: Gudang;
  konten: Konten;
  pengaturan: Pengaturan;
  panggilAi: PemanggilAi;
  sekarang?: () => Date;
}

const RAHASIA = new Set(["kunci", "toleransi", "pembahasan", "kesalahan_umum"]);
const POLA_USERNAME = /^[a-z0-9_]{3,20}$/;
const POLA_PANGGILAN = /^[A-Za-z0-9 ]{2,15}$/;
const HURUF_KODE = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const BATAS_SALAH_PEMBAHASAN = 3;

class GalatHttp extends Error {
  constructor(public status: number, public detail: string) { super(detail); }
}

const tanpaRahasia = (s: Apa) => Object.fromEntries(Object.entries(s).filter(([k]) => !RAHASIA.has(k)));

export function buatHandler(dep: Ketergantungan) {
  const { gudang: db, konten, pengaturan } = dep;
  const sekarang = dep.sekarang ?? (() => new Date());
  const modulById = new Map<string, Apa>(konten.modul.map((m) => [m.id, m]));
  const soalById = new Map<string, { modulId: string; soal: Apa }>();
  for (const m of konten.modul) for (const s of m.soal) soalById.set(s.id, { modulId: m.id, soal: s });
  const modulTes = konten.modul.filter((m) => m.jenis === "tes");
  const skorTesMaks = modulTes.reduce((t, m) => t + m.soal.reduce((u: number, s: Apa) => u + s.skor, 0), 0);

  const hariIni = () => new Date(sekarang().getTime() + 7 * 3600 * 1000).toISOString().slice(0, 10); // WIB
  const detik = () => Math.floor(sekarang().getTime() / 1000);

  async function tokenUntuk(p: Pengguna) {
    return { token: await buatToken(p.id, p.peran, pengaturan.appSecret, pengaturan.tokenJam, detik()),
      peran: p.peran, nama_panggilan: p.nama_panggilan };
  }

  async function penggunaSaatIni(req: Request): Promise<Pengguna> {
    const auth = req.headers.get("authorization") ?? "";
    const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7) : "";
    const id = token ? await bacaToken(token, pengaturan.appSecret, detik()) : null;
    const p = id === null ? null : await db.penggunaById(id);
    if (!p) throw new GalatHttp(401, "Silakan masuk dulu.");
    return p;
  }

  async function hanyaGuru(req: Request) {
    const p = await penggunaSaatIni(req);
    if (p.peran !== "guru") throw new GalatHttp(403, "Halaman ini khusus guru.");
    return p;
  }

  async function kelasMilik(guru: Pengguna, kelasId: number): Promise<Kelas> {
    const k = Number.isInteger(kelasId) ? await db.kelasById(kelasId) : null;
    if (!k || k.guru_id !== guru.id) throw new GalatHttp(404, "Kelas tidak ditemukan.");
    return k;
  }

  async function buatKodeKelas() {
    for (;;) {
      const acak = crypto.getRandomValues(new Uint32Array(6));
      const kode = [...acak].map((n) => HURUF_KODE[n % HURUF_KODE.length]).join("");
      if (!(await db.kelasByKode(kode))) return kode;
    }
  }

  /** Padanan soal_untuk_asisten(): soal + konteks literasi; soal tes baru terbuka setelah dijawab sekali. */
  async function soalUntukAsisten(soalId: string, saya: Pengguna) {
    const isi = soalById.get(soalId);
    if (!isi) throw new GalatHttp(404, "Soal tidak ditemukan.");
    const modul = modulById.get(isi.modulId);
    if (modul.jenis !== "tes") return { soal: isi.soal, literasi: null };
    const js = await db.jawaban({ pengguna_id: saya.id, soal_id: soalId });
    if (!js.some((j) => j.status !== "tidak_valid")) {
      throw new GalatHttp(403, "Jawab dulu tahap ini sendiri. Setelah itu Koko bisa membantumu memahaminya.");
    }
    const nomor = String(isi.soal.butir);
    const tahapPertama = modul.soal.find((s: Apa) => String(s.butir) === nomor).id;
    const cerita = modul.langkah.find((l: Apa) => l.sebelum === tahapPertama)?.isi ?? "";
    const info = modul.butir[nomor];
    return { soal: isi.soal, literasi: { indikator: info.indikator, judul: info.judul, cerita } };
  }

  async function dataRingkasan(kelas: Kelas) {
    const siswa = await db.siswaKelas(kelas.id);
    const semua = siswa.length ? await db.jawaban({ pengguna_ids: siswa.map((s) => s.id) }) : [];
    const pesanKesalahan = (soalId: string, kode: string) => {
      const s = soalById.get(soalId)?.soal;
      const k = (s?.kesalahan_umum ?? []).find((x: Apa) => x.kode === kode);
      if (k) return k.pesan;
      return ({ salah: "Jawaban salah lainnya", persen_tak_wajar: "Persentase lebih dari 100%" } as Record<string, string>)[kode] ?? kode;
    };
    const hitung = new Map<string, { soal_id: string; kode: string; jumlah: number }>();
    for (const j of semua) {
      if (j.status !== "salah") continue;
      const kunci = `${j.soal_id}\u0000${j.kode_kesalahan}`;
      const ada = hitung.get(kunci) ?? { soal_id: j.soal_id, kode: j.kode_kesalahan, jumlah: 0 };
      ada.jumlah += 1;
      hitung.set(kunci, ada);
    }
    const kesalahan = [...hitung.values()].sort((a, b) => b.jumlah - a.jumlah).slice(0, 10).map((x) => ({
      soal_id: x.soal_id, soal: soalById.get(x.soal_id)?.soal.teks ?? x.soal_id, kode: x.kode,
      pesan: pesanKesalahan(x.soal_id, x.kode), jumlah: x.jumlah,
    }));
    const baris = siswa.map((s) => {
      const js = semua.filter((j) => j.pengguna_id === s.id);
      const salah = new Map<string, number>();
      for (const j of js) if (j.status === "salah") salah.set(j.kode_kesalahan, (salah.get(j.kode_kesalahan) ?? 0) + 1);
      let terbanyak = "-";
      let maks = 0;
      for (const [kode, n] of salah) if (n > maks) { maks = n; terbanyak = kode; }
      return {
        nama_panggilan: s.nama_panggilan, username: s.username,
        poin: js.reduce((t, j) => t + j.poin, 0),
        soal_benar: new Set(js.filter((j) => j.status === "benar").map((j) => j.soal_id)).size,
        jumlah_jawaban: js.length,
        kesalahan_terbanyak: terbanyak,
        skor_tes: modulTes.reduce((t, m) => t + hitungHasilTes(m, js.filter((j) => j.modul_id === m.id)).total, 0),
      };
    });
    return { kelas: { id: kelas.id, nama: kelas.nama, kode: kelas.kode }, jumlah_soal: soalById.size,
      skor_tes_maks: skorTesMaks, siswa: baris, kesalahan_umum: kesalahan };
  }

  async function bacaBadan(req: Request): Promise<Apa> {
    try {
      const b = await req.json();
      return b && typeof b === "object" ? b : {};
    } catch {
      throw new GalatHttp(422, "Isian tidak terbaca.");
    }
  }

  const teks = (v: unknown) => (typeof v === "string" ? v : "");

  async function rute(req: Request, jalan: string, kueri: URLSearchParams): Promise<Apa> {
    const m = req.method;
    const p = jalan.split("/").filter(Boolean);

    if (m === "GET" && jalan === "/sehat") return { status: "ok", jumlah_modul: konten.modul.length };
    if (m === "GET" && jalan === "/glosarium") return konten.glosarium;

    if (m === "POST" && jalan === "/auth/daftar") {
      const b = await bacaBadan(req);
      const username = teks(b.username).trim().toLowerCase();
      const panggilan = teks(b.nama_panggilan).split(/\s+/).filter(Boolean).join(" ");
      const sandi = teks(b.password);
      if (!POLA_USERNAME.test(username)) throw new GalatHttp(422, "Nama pengguna 3–20 karakter: huruf kecil, angka, atau garis bawah.");
      if (!POLA_PANGGILAN.test(panggilan)) throw new GalatHttp(422, "Nama panggilan 2–15 huruf atau angka. Jangan pakai nama lengkap.");
      if (sandi.length < 6 || sandi.length > 72) throw new GalatHttp(422, "Kata sandi 6–72 karakter.");
      if (await db.penggunaByUsername(username)) throw new GalatHttp(409, "Nama pengguna sudah dipakai. Coba yang lain.");
      let kelasId: number | null = null;
      const kode = teks(b.kode_kelas).trim().toUpperCase();
      if (kode) {
        const k = await db.kelasByKode(kode);
        if (!k) throw new GalatHttp(404, "Kode kelas tidak ditemukan.");
        kelasId = k.id;
      }
      const baru = await db.tambahPengguna({ username, nama_panggilan: panggilan, peran: "siswa", kelas_id: kelasId,
        password_hash: await hashKataSandi(sandi, pengaturan.iterasi ?? ITERASI_BAWAAN) });
      return tokenUntuk(baru);
    }
    if (m === "POST" && jalan === "/auth/masuk") {
      const b = await bacaBadan(req);
      const pg = await db.penggunaByUsername(teks(b.username).trim().toLowerCase());
      if (!pg || !(await cocokkanKataSandi(teks(b.password), pg.password_hash))) {
        throw new GalatHttp(401, "Nama pengguna atau kata sandi salah.");
      }
      return tokenUntuk(pg);
    }

    const saya = await penggunaSaatIni(req);

    if (m === "GET" && jalan === "/saya") {
      const js = await db.jawaban({ pengguna_id: saya.id });
      const hari = hariIni();
      const kelas = saya.kelas_id ? await db.kelasById(saya.kelas_id) : null;
      return {
        username: saya.username, nama_panggilan: saya.nama_panggilan, peran: saya.peran, kelas: kelas?.nama ?? null,
        poin_total: js.reduce((t, j) => t + j.poin, 0),
        poin_hari_ini: js.filter((j) => j.tanggal === hari).reduce((t, j) => t + j.poin, 0),
        sasaran_harian: pengaturan.sasaranHarian,
        streak: hitungStreak(new Set(js.filter((j) => j.status === "benar").map((j) => j.tanggal)), hari),
      };
    }
    if (m === "POST" && jalan === "/kelas/gabung") {
      const b = await bacaBadan(req);
      const kode = teks(b.kode).trim().toUpperCase();
      if (kode.length !== 6) throw new GalatHttp(422, "Kode kelas 6 huruf.");
      const k = await db.kelasByKode(kode);
      if (!k) throw new GalatHttp(404, "Kode kelas tidak ditemukan.");
      await db.setKelasPengguna(saya.id, k.id);
      return { kelas: k.nama };
    }
    if (m === "GET" && jalan === "/modul") {
      const benar = new Set((await db.jawaban({ pengguna_id: saya.id })).filter((j) => j.status === "benar").map((j) => j.soal_id));
      return konten.modul.map((md) => ({
        id: md.id, judul: md.judul, tujuan: md.tujuan, level: md.level, jenis: md.jenis ?? "latihan",
        jumlah_soal: md.soal.length, soal_benar: md.soal.filter((s: Apa) => benar.has(s.id)).length,
      }));
    }
    if (m === "GET" && p[0] === "modul" && p.length === 2) {
      const md = modulById.get(p[1]);
      if (!md) throw new GalatHttp(404, "Modul tidak ditemukan.");
      return { ...md, soal: md.soal.map(tanpaRahasia) };
    }
    if (m === "GET" && p[0] === "modul" && p[2] === "hasil" && p.length === 3) {
      const md = modulById.get(p[1]);
      if (!md || md.jenis !== "tes") throw new GalatHttp(404, "Tes tidak ditemukan.");
      return hitungHasilTes(md, await db.jawaban({ pengguna_id: saya.id, modul_id: md.id }));
    }
    if (m === "POST" && p[0] === "soal" && p[2] === "jawab" && p.length === 3) {
      const isi = soalById.get(p[1]);
      if (!isi) throw new GalatHttp(404, "Soal tidak ditemukan.");
      const b = await bacaBadan(req);
      const jawaban = teks(b.jawaban);
      const petunjuk = b.petunjuk_dipakai ?? 0;
      if (jawaban.length > 200 || !Number.isInteger(petunjuk) || petunjuk < 0 || petunjuk > 3) {
        throw new GalatHttp(422, "Isian jawaban tidak sesuai.");
      }
      const hasil = periksa(isi.soal, jawaban);
      const sebelumnya = await db.jawaban({ pengguna_id: saya.id, soal_id: isi.soal.id });
      const poin = hasil.benar && !sebelumnya.some((j) => j.status === "benar") ? poinUntuk(petunjuk) : 0;
      await db.tambahJawaban({ pengguna_id: saya.id, modul_id: isi.modulId, soal_id: isi.soal.id,
        jawaban: [...jawaban].slice(0, 40).join(""), status: hasil.status, kode_kesalahan: hasil.kode,
        petunjuk_dipakai: petunjuk, poin, tanggal: hariIni() });
      const salah = sebelumnya.filter((j) => j.status === "salah").length + (hasil.status === "salah" ? 1 : 0);
      const respons: Apa = { ...hasil, poin };
      // Pembahasan (berisi jawaban) baru dikirim setelah benar atau setelah 3 kali salah.
      if (hasil.benar || salah >= BATAS_SALAH_PEMBAHASAN) respons.pembahasan = isi.soal.pembahasan;
      return respons;
    }
    if (m === "GET" && jalan === "/peringkat") {
      const kelasId = (kueri.get("lingkup") ?? "kelas") === "kelas" && saya.kelas_id ? saya.kelas_id : null;
      const baris = await db.peringkat(kelasId);
      return baris.map((b, i) => ({ peringkat: i + 1, nama_panggilan: b.nama_panggilan, poin: b.poin, saya: b.id === saya.id }));
    }

    // ------------------------------------------------ asisten belajar (RMT)
    if (p[0] === "asisten") {
      const hari = hariIni();
      if (m === "GET" && p[1] === "status") {
        const terpakai = await db.hitungPesanSiswaHariIni(saya.id, hari);
        return { ai_aktif: pengaturan.aiAktif, kuota: pengaturan.kuotaAi,
          sisa_kuota: Math.max(0, pengaturan.kuotaAi - terpakai), tahap: TAHAP_RMT };
      }
      if (m === "GET" && p[1] === "riwayat" && p.length === 3) {
        const { soal } = await soalUntukAsisten(p[2], saya);
        const semua = (await db.pesan(saya.id, p[2])).slice(-20);
        let cek: Apa = null;
        return semua.map((x) => {
          if (x.peran === "siswa") {
            cek = x.status_cek ? cekJawaban(soal, x.isi) : null;
            return { peran: "siswa", isi: x.isi };
          }
          const h = { peran: "asisten", isi: x.isi, cek_mesin: cek };
          cek = null;
          return h;
        });
      }
      if (m === "POST" && p.length === 1) {
        const b = await bacaBadan(req);
        const pesan = teks(b.pesan).trim();
        if (!pesan || teks(b.pesan).length > 300 || teks(b.soal_id).length > 40) throw new GalatHttp(422, "Pesan 1–300 karakter.");
        const { soal, literasi } = await soalUntukAsisten(teks(b.soal_id), saya);
        const terpakai = await db.hitungPesanSiswaHariIni(saya.id, hari);
        if (terpakai >= pengaturan.kuotaAi) {
          return { balasan: PESAN_KUOTA_HABIS, sumber: "bawaan", cek_mesin: null, tahap: null,
            tingkat_petunjuk: null, sisa_kuota: 0, kuota_habis: true };
        }
        const riwayat = (await db.pesan(saya.id, soal.id)).map((x) => ({
          peran: x.peran, isi: x.isi, status_cek: x.status_cek, minta_bantuan: x.minta_bantuan }));
        const rencana = (rencanaGiliran as Apa)(soal, pesan, riwayat, literasi);
        let balasanAi: string | null = null;
        try {
          balasanAi = await dep.panggilAi(rencana.pesanAi);
        } catch {
          balasanAi = null; // layanan AI apa pun yang gagal tidak boleh menjatuhkan server
        }
        const hasil = selesaikanGiliran(soal, rencana, balasanAi);
        await db.tambahPesan([
          { pengguna_id: saya.id, soal_id: soal.id, peran: "siswa", isi: pesan, status_cek: hasil.cek_mesin?.status ?? "",
            minta_bantuan: hasil.minta_bantuan ? 1 : 0, sumber: "", tanggal: hari },
          { pengguna_id: saya.id, soal_id: soal.id, peran: "asisten", isi: [...hasil.balasan].slice(0, 800).join(""),
            status_cek: "", minta_bantuan: 0, sumber: hasil.sumber, tanggal: hari },
        ]);
        const { minta_bantuan: _abaikan, ...tanpaBendera } = hasil;
        return { ...tanpaBendera, sisa_kuota: Math.max(0, pengaturan.kuotaAi - terpakai - 1), kuota_habis: false };
      }
    }

    // ------------------------------------------------ guru
    if (p[0] === "guru") {
      const guru = await hanyaGuru(req);
      if (m === "GET" && jalan === "/guru/kelas") {
        const daftar = await db.kelasGuru(guru.id);
        return Promise.all(daftar.map(async (k) => ({ id: k.id, nama: k.nama, kode: k.kode,
          jumlah_siswa: await db.hitungAnggotaKelas(k.id) })));
      }
      if (m === "POST" && jalan === "/guru/kelas") {
        const b = await bacaBadan(req);
        const nama = teks(b.nama).trim();
        if (nama.length < 2 || nama.length > 40) throw new GalatHttp(422, "Nama kelas 2–40 karakter.");
        const k = await db.tambahKelas({ nama, kode: await buatKodeKelas(), guru_id: guru.id });
        return { id: k.id, nama: k.nama, kode: k.kode };
      }
      if (m === "GET" && p[1] === "kelas" && p[3] === "ringkasan" && p.length === 4) {
        return dataRingkasan(await kelasMilik(guru, Number(p[2])));
      }
      if (m === "GET" && p[1] === "kelas" && p[3] === "ekspor.csv" && p.length === 4) {
        const data = await dataRingkasan(await kelasMilik(guru, Number(p[2])));
        const sel = (v: unknown) => {
          const s = String(v);
          return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        };
        const baris = [["nama_panggilan", "username", "poin", "soal_benar", "jumlah_jawaban", "kesalahan_terbanyak",
          `skor_tes_dari_${data.skor_tes_maks}`]];
        for (const s of data.siswa) {
          baris.push([s.nama_panggilan, s.username, s.poin, s.soal_benar, s.jumlah_jawaban, s.kesalahan_terbanyak, s.skor_tes]
            .map(String));
        }
        // Titik koma dan BOM: langsung terbaca rapi di Excel berbahasa Indonesia.
        const isi = "﻿" + baris.map((r) => r.map(sel).join(";")).join("\r\n") + "\r\n";
        return new Response(isi, { headers: { "content-type": "text/csv; charset=utf-8",
          "content-disposition": `attachment; filename="rekap_${data.kelas.kode}.csv"` } });
      }
    }
    throw new GalatHttp(404, "Halaman tidak ditemukan.");
  }

  function kepalaCors(req: Request): Record<string, string> {
    const asal = req.headers.get("origin");
    if (!asal || !pengaturan.asalDiizinkan.includes(asal)) return {};
    return { "access-control-allow-origin": asal, "access-control-allow-methods": "GET, POST, OPTIONS",
      "access-control-allow-headers": "authorization, content-type, apikey, x-client-info", "vary": "Origin" };
  }

  return async function handler(req: Request): Promise<Response> {
    const cors = kepalaCors(req);
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    const url = new URL(req.url);
    // Alamat bisa berupa /api/..., /api/api/..., atau /functions/v1/api/api/... (dari peramban).
    const jalan = url.pathname.replace(/^(\/functions\/v1)?\/api(\/api)?(?=\/|$)/, "") || "/";
    const kepala = { ...cors, "x-content-type-options": "nosniff", "cache-control": "no-store" };
    try {
      const hasil = await rute(req, jalan, url.searchParams);
      if (hasil instanceof Response) {
        for (const [k, v] of Object.entries(kepala)) hasil.headers.set(k, v);
        return hasil;
      }
      return Response.json(hasil, { headers: kepala });
    } catch (e) {
      if (e instanceof GalatHttp) return Response.json({ detail: e.detail }, { status: e.status, headers: kepala });
      console.error("Galat tak terduga:", e instanceof Error ? e.message : e);
      return Response.json({ detail: "Server sedang bermasalah. Coba lagi sebentar." }, { status: 500, headers: kepala });
    }
  };
}

export type { Jawaban };
