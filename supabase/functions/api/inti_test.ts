// Tes Edge Function di laptop (tanpa Supabase): npx deno@2.9.6 test supabase/functions/api/
// Memakai GudangMemori dan AI palsu. Skenario mengikuti tes Python (tests/test_api.py, test_asisten.py).
import { assert, assertEquals } from "jsr:@std/assert@1.0.14";
import konten from "../_shared/konten.json" with { type: "json" };
import { buatPemanggilAi, pengaturanAiDariEnv } from "./ai.ts";
import { GudangMemori } from "./gudang.ts";
import { buatHandler, type PemanggilAi } from "./inti.ts";
import { bacaToken, buatToken, cocokkanKataSandi, hashKataSandi } from "./keamanan.ts";

const ASAL = "https://saskiaa073-creator.github.io";

async function siapkan(ai: PemanggilAi = async () => null) {
  const db = new GudangMemori();
  const guru = await db.tambahPengguna({ username: "guru_demo", nama_panggilan: "Bu Guru", peran: "guru", kelas_id: null,
    password_hash: await hashKataSandi("guru12345", 1000) });
  const kelas = await db.tambahKelas({ nama: "VII A (demo)", kode: "DEMO77", guru_id: guru.id });
  const handler = buatHandler({ gudang: db, konten, panggilAi: ai, pengaturan: { appSecret: "rahasia-uji-yang-panjang-sekali",
    tokenJam: 24, sasaranHarian: 30, kuotaAi: 20, aiAktif: true, asalDiizinkan: [ASAL], iterasi: 1000 } });
  // deno-lint-ignore no-explicit-any
  const minta = async (metode: string, jalur: string, badan?: unknown, token?: string): Promise<{ status: number; data: any; res: Response }> => {
    const res = await handler(new Request(`https://x.supabase.co/functions/v1/api/api${jalur}`, {
      method: metode, body: badan === undefined ? undefined : JSON.stringify(badan),
      headers: { "content-type": "application/json", origin: ASAL, ...(token ? { authorization: `Bearer ${token}` } : {}) },
    }));
    const teks = await res.text();
    let data: unknown = teks;
    try { data = JSON.parse(teks); } catch { /* CSV */ }
    return { status: res.status, data, res };
  };
  const daftar = async (username = "rina07", panggilan = "Rina", kode?: string) => {
    const r = await minta("POST", "/auth/daftar", { username, nama_panggilan: panggilan, password: "rahasia1", ...(kode ? { kode_kelas: kode } : {}) });
    assertEquals(r.status, 200, JSON.stringify(r.data));
    return r.data.token as string;
  };
  return { db, kelas, minta, daftar };
}

Deno.test("keamanan: hash cocok dengan format Python dan token bisa dibaca", async () => {
  const h = await hashKataSandi("rahasia1", 1000);
  assert(h.startsWith("pbkdf2_sha256$1000$"));
  assert(await cocokkanKataSandi("rahasia1", h));
  assert(!(await cocokkanKataSandi("rahasia2", h)));
  assert(!(await cocokkanKataSandi("rahasia1", "rusak")));
  const t = await buatToken(7, "siswa", "k", 1, 1000);
  assertEquals(await bacaToken(t, "k", 1000), 7);
  assertEquals(await bacaToken(t, "k-lain", 1000), null);
  assertEquals(await bacaToken(t, "k", 1000 + 3601), null); // kedaluwarsa
});

Deno.test("keamanan: hash buatan Python (apps/api/auth.py) terbaca", async () => {
  const dariPython = Deno.env.get("HASH_PYTHON_UJI");
  if (!dariPython) return; // diisi oleh tests/test_supabase.py
  assert(await cocokkanKataSandi("rahasia1", dariPython));
});

Deno.test("sehat, CORS, dan alamat dari peramban", async () => {
  const { minta } = await siapkan();
  const r = await minta("GET", "/sehat");
  assertEquals(r.data, { status: "ok", jumlah_modul: 8 });
  assertEquals(r.res.headers.get("access-control-allow-origin"), ASAL);
});

Deno.test("akun: daftar, masuk, validasi, tanpa token", async () => {
  const { minta, daftar } = await siapkan();
  const t = await daftar("rina07", "Rina", "demo77");
  const saya = (await minta("GET", "/saya", undefined, t)).data;
  assertEquals([saya.nama_panggilan, saya.kelas, saya.poin_total, saya.streak], ["Rina", "VII A (demo)", 0, 0]);
  assertEquals((await minta("POST", "/auth/daftar", { username: "rina07", nama_panggilan: "Rina", password: "rahasia1" })).status, 409);
  assertEquals((await minta("POST", "/auth/daftar", { username: "a b", nama_panggilan: "Rina", password: "rahasia1" })).status, 422);
  assertEquals((await minta("POST", "/auth/daftar", { username: "budi01", nama_panggilan: "<b>Budi</b>", password: "rahasia1" })).status, 422);
  assertEquals((await minta("POST", "/auth/daftar", { username: "budi01", nama_panggilan: "Budi", password: "123" })).status, 422);
  assertEquals((await minta("POST", "/auth/daftar", { username: "budi01", nama_panggilan: "Budi", password: "rahasia1", kode_kelas: "XXXXXX" })).status, 404);
  assertEquals((await minta("POST", "/auth/masuk", { username: "RINA07", password: "rahasia1" })).status, 200);
  assertEquals((await minta("POST", "/auth/masuk", { username: "rina07", password: "salah123" })).status, 401);
  assertEquals((await minta("GET", "/saya")).status, 401);
  assertEquals((await minta("GET", "/saya", undefined, "palsu")).status, 401);
});

Deno.test("modul tanpa kolom rahasia; jawab: poin sekali, pembahasan setelah benar / 3 salah", async () => {
  const { minta, daftar } = await siapkan();
  const t = await daftar();
  const m = (await minta("GET", "/modul/m1", undefined, t)).data;
  for (const s of m.soal) for (const k of ["kunci", "toleransi", "pembahasan", "kesalahan_umum"]) assert(!(k in s), `${s.id}.${k}`);
  let r = (await minta("POST", "/soal/m1-s3/jawab", { jawaban: "Rp3.000", petunjuk_dipakai: 0 }, t)).data;
  assertEquals([r.status, r.poin, "pembahasan" in r], ["benar", 10, true]);
  r = (await minta("POST", "/soal/m1-s3/jawab", { jawaban: "3000" }, t)).data;
  assertEquals(r.poin, 0);
  r = (await minta("POST", "/soal/m1-s4/jawab", { jawaban: "7.000", petunjuk_dipakai: 2 }, t)).data;
  assertEquals(r.poin, 6);
  const saya = (await minta("GET", "/saya", undefined, t)).data;
  assertEquals([saya.poin_total, saya.poin_hari_ini, saya.streak], [16, 16, 1]);
  r = (await minta("POST", "/soal/m2-s2/jawab", { jawaban: "16,67" }, t)).data;
  assertEquals([r.kode, "pembahasan" in r], ["bagi_harga_jual", false]);
  assertEquals((await minta("POST", "/soal/m2-s2/jawab", { jawaban: "12.5" }, t)).data.status, "tidak_valid");
  assert(!("pembahasan" in (await minta("POST", "/soal/m2-s2/jawab", { jawaban: "1" }, t)).data));
  assert("pembahasan" in (await minta("POST", "/soal/m2-s2/jawab", { jawaban: "2" }, t)).data);
  assertEquals((await minta("POST", "/soal/xx/jawab", { jawaban: "1" }, t)).status, 404);
  assertEquals((await minta("POST", "/soal/m1-s3/jawab", { jawaban: "1", petunjuk_dipakai: 9 }, t)).status, 422);
});

Deno.test("tes literasi: skor dari jawaban pertama", async () => {
  const { minta, daftar } = await siapkan();
  const t = await daftar();
  for (const [sid, j] of [["m7-s1", "a"], ["m7-s2", "12.5"], ["m7-s2", "25"], ["m7-s3", "18,03"], ["m7-s3", "22"], ["m7-s14", "180.000"]]) {
    await minta("POST", `/soal/${sid}/jawab`, { jawaban: j }, t);
  }
  const r = (await minta("GET", "/modul/m7/hasil", undefined, t)).data;
  // deno-lint-ignore no-explicit-any
  assertEquals(r.butir.map((b: any) => b.skor), [2, 0, 2, 0]);
  assertEquals([r.total, r.nilai, r.tahap_dijawab], [4, 17, 4]);
  assertEquals((await minta("GET", "/modul/m1/hasil", undefined, t)).status, 404);
});

Deno.test("asisten: AI dipakai bila aman, bocor dibuang, tes dikunci, kuota", async () => {
  let balasan: string | null = "Coba bandingkan harga jual dan harga beli dulu. Mana yang lebih besar?";
  const ditangkap: unknown[] = [];
  const { minta, daftar } = await siapkan(async (p) => { ditangkap.push(p); return balasan; });
  const t = await daftar("rina07", "Rina");
  let r = (await minta("POST", "/asisten", { soal_id: "m2-s2", pesan: "aku bingung" }, t)).data;
  assertEquals([r.sumber, r.tahap.nama, r.tingkat_petunjuk, r.sisa_kuota], ["ai", "Orientasi", 1, 19]);
  const teks = JSON.stringify(ditangkap.at(-1));
  assert(!teks.includes("rina07") && !teks.includes("Rina"), "identitas siswa tidak boleh terkirim ke AI");
  balasan = "Untungnya 20%.";
  r = (await minta("POST", "/asisten", { soal_id: "m2-s2", pesan: "jawabannya?" }, t)).data;
  assertEquals(r.sumber, "bawaan");
  r = (await minta("POST", "/asisten", { soal_id: "m2-s2", pesan: "16,67" }, t)).data;
  assertEquals(r.cek_mesin.kode, "bagi_harga_jual");
  assertEquals((await minta("POST", "/asisten", { soal_id: "m7-s2", pesan: "bantu" }, t)).status, 403);
  await minta("POST", "/soal/m7-s2/jawab", { jawaban: "20" }, t);
  balasan = "Coba lihat lagi modal Pemasok A. Untung dibagi apa?";
  r = (await minta("POST", "/asisten", { soal_id: "m7-s2", pesan: "kenapa salah?" }, t)).data;
  assertEquals(r.sumber, "ai");
  // deno-lint-ignore no-explicit-any
  const sistem = (ditangkap.at(-1) as any)[0].content as string;
  assert(sistem.includes("Mathematical Reasoning") && sistem.includes("Pemasok C: modal Rp50.000"));
  const riwayat = (await minta("GET", "/asisten/riwayat/m2-s2", undefined, t)).data;
  assertEquals(riwayat.length, 6);
  assertEquals(riwayat[5].cek_mesin.kode, "bagi_harga_jual");
  const lain = await daftar("budi01", "Budi");
  assertEquals((await minta("GET", "/asisten/riwayat/m2-s2", undefined, lain)).data, []);
});

Deno.test("peringkat hanya nama panggilan; guru: kelas, ringkasan, CSV, akses", async () => {
  const { minta, daftar, kelas } = await siapkan();
  const t = await daftar("rina07", "Rina", "DEMO77");
  await daftar("budi01", "Budi");
  await minta("POST", "/soal/m1-s3/jawab", { jawaban: "57.000" }, t);
  await minta("POST", "/soal/m1-s3/jawab", { jawaban: "3.000" }, t);
  const semua = (await minta("GET", "/peringkat?lingkup=semua", undefined, t)).data;
  assertEquals(semua[0], { peringkat: 1, nama_panggilan: "Rina", poin: 10, saya: true });
  // deno-lint-ignore no-explicit-any
  assert(!(await minta("GET", "/peringkat?lingkup=kelas", undefined, t)).data.some((b: any) => b.nama_panggilan === "Budi"));
  assertEquals((await minta("GET", "/guru/kelas", undefined, t)).status, 403);
  const tg = (await minta("POST", "/auth/masuk", { username: "guru_demo", password: "guru12345" })).data.token;
  const daftarKelas = (await minta("GET", "/guru/kelas", undefined, tg)).data;
  assertEquals([daftarKelas[0].kode, daftarKelas[0].jumlah_siswa], ["DEMO77", 1]);
  const ring = (await minta("GET", `/guru/kelas/${kelas.id}/ringkasan`, undefined, tg)).data;
  assertEquals([ring.siswa[0].poin, ring.siswa[0].kesalahan_terbanyak, ring.kesalahan_umum[0].kode], [10, "dijumlah", "dijumlah"]);
  const csv = await minta("GET", `/guru/kelas/${kelas.id}/ekspor.csv`, undefined, tg);
  assert(String(csv.data).startsWith("﻿nama_panggilan;username;poin"));
  assert(String(csv.data).includes("Rina;rina07;10;1;2;dijumlah;0"));
  assertEquals(csv.res.headers.get("access-control-allow-origin"), ASAL);
  assertEquals((await minta("POST", "/guru/kelas", { nama: "VII B" }, tg)).data.kode.length, 6);
  assertEquals((await minta("GET", "/guru/kelas/9999/ringkasan", undefined, tg)).status, 404);
});

Deno.test("AI: pengaturan dari Secrets dan pemanggil (DeepSeek, 503 lalu berhasil)", async () => {
  const env = (n: string) => ({ AI_PROVIDER: "deepseek", DEEPSEEK_API_KEY: "kunci-uji", AI_MODEL: " AI_MODEL=deepseek-flash" } as Record<string, string>)[n];
  const p = pengaturanAiDariEnv(env);
  assertEquals([p.apiKey, p.model, p.reasoningEffort, p.url, p.aktif], ["kunci-uji", "deepseek-flash", "none", "https://api.deepseek.com", true]);
  const panggilan: { url: string; badan: { model: string; reasoning_effort: string }; auth: string }[] = [];
  let ke = 0;
  const ambilPalsu = (async (url: string, init: RequestInit) => {
    panggilan.push({ url, badan: JSON.parse(String(init.body)), auth: new Headers(init.headers).get("authorization") ?? "" });
    ke += 1;
    return ke === 1 ? new Response("{}", { status: 503 }) : Response.json({ choices: [{ message: { content: " Halo! " } }] });
  }) as unknown as typeof fetch;
  assertEquals(await buatPemanggilAi(p, ambilPalsu, 0)([{ role: "user", content: "hai" }]), "Halo!");
  assertEquals(panggilan.length, 2);
  assertEquals(panggilan[1].url, "https://api.deepseek.com/chat/completions");
  assertEquals([panggilan[1].badan.model, panggilan[1].badan.reasoning_effort, panggilan[1].auth], ["deepseek-flash", "none", "Bearer kunci-uji"]);
  const saldoHabis = (async () => new Response("{}", { status: 402 })) as unknown as typeof fetch;
  assertEquals(await buatPemanggilAi(p, saldoHabis, 0)([]), null);
  assertEquals(await buatPemanggilAi({ ...p, aktif: false }, ambilPalsu, 0)([]), null);
});
