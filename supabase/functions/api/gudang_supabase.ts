// Penyimpanan di tabel PostgreSQL Supabase. Memakai kunci service role (otomatis tersedia di
// Edge Function, tidak pernah dikirim ke peramban). Semua tabel ber-RLS tanpa kebijakan publik,
// jadi tabel hanya bisa disentuh lewat fungsi ini.
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.118.0";
import type { BarisPeringkat, Gudang, Jawaban, Kelas, Pengguna, PesanAsisten } from "./gudang.ts";

const KOLOM_PENGGUNA = "id, username, nama_panggilan, password_hash, peran, kelas_id";

function cek<T>(hasil: { data: T; error: { message: string } | null }): T {
  if (hasil.error) throw new Error(`Database: ${hasil.error.message}`);
  return hasil.data;
}

export class GudangSupabase implements Gudang {
  #db: SupabaseClient;
  constructor(url: string, kunciServis: string) {
    this.#db = createClient(url, kunciServis, { auth: { persistSession: false, autoRefreshToken: false } });
  }

  async penggunaByUsername(username: string) {
    return cek(await this.#db.from("pengguna").select(KOLOM_PENGGUNA).eq("username", username).maybeSingle()) as Pengguna | null;
  }
  async penggunaById(id: number) {
    return cek(await this.#db.from("pengguna").select(KOLOM_PENGGUNA).eq("id", id).maybeSingle()) as Pengguna | null;
  }
  async tambahPengguna(p: Omit<Pengguna, "id">) {
    return cek(await this.#db.from("pengguna").insert(p).select(KOLOM_PENGGUNA).single()) as Pengguna;
  }
  async setKelasPengguna(id: number, kelasId: number) {
    cek(await this.#db.from("pengguna").update({ kelas_id: kelasId }).eq("id", id));
  }
  async kelasByKode(kode: string) {
    return cek(await this.#db.from("kelas").select("id, nama, kode, guru_id").eq("kode", kode).maybeSingle()) as Kelas | null;
  }
  async kelasById(id: number) {
    return cek(await this.#db.from("kelas").select("id, nama, kode, guru_id").eq("id", id).maybeSingle()) as Kelas | null;
  }
  async kelasGuru(guruId: number) {
    return cek(await this.#db.from("kelas").select("id, nama, kode, guru_id").eq("guru_id", guruId).order("id")) as Kelas[];
  }
  async tambahKelas(k: Omit<Kelas, "id">) {
    return cek(await this.#db.from("kelas").insert(k).select("id, nama, kode, guru_id").single()) as Kelas;
  }
  async hitungAnggotaKelas(kelasId: number) {
    const r = await this.#db.from("pengguna").select("id", { count: "exact", head: true }).eq("kelas_id", kelasId);
    if (r.error) throw new Error(`Database: ${r.error.message}`);
    return r.count ?? 0;
  }
  async siswaKelas(kelasId: number) {
    return cek(await this.#db.from("pengguna").select(KOLOM_PENGGUNA).eq("kelas_id", kelasId).eq("peran", "siswa")
      .order("nama_panggilan")) as Pengguna[];
  }
  async jawaban(f: { pengguna_id?: number; pengguna_ids?: number[]; soal_id?: string; modul_id?: string }) {
    let q = this.#db.from("jawaban")
      .select("id, pengguna_id, modul_id, soal_id, jawaban, status, kode_kesalahan, petunjuk_dipakai, poin, tanggal");
    if (f.pengguna_id !== undefined) q = q.eq("pengguna_id", f.pengguna_id);
    if (f.pengguna_ids !== undefined) q = q.in("pengguna_id", f.pengguna_ids);
    if (f.soal_id !== undefined) q = q.eq("soal_id", f.soal_id);
    if (f.modul_id !== undefined) q = q.eq("modul_id", f.modul_id);
    return cek(await q.order("id").limit(100_000)) as Jawaban[];
  }
  async tambahJawaban(j: Omit<Jawaban, "id">) { cek(await this.#db.from("jawaban").insert(j)); }
  async pesan(penggunaId: number, soalId: string) {
    return cek(await this.#db.from("pesan_asisten")
      .select("id, pengguna_id, soal_id, peran, isi, status_cek, minta_bantuan, sumber, tanggal")
      .eq("pengguna_id", penggunaId).eq("soal_id", soalId).order("id")) as PesanAsisten[];
  }
  async hitungPesanSiswaHariIni(penggunaId: number, tanggal: string) {
    const r = await this.#db.from("pesan_asisten").select("id", { count: "exact", head: true })
      .eq("pengguna_id", penggunaId).eq("peran", "siswa").eq("tanggal", tanggal);
    if (r.error) throw new Error(`Database: ${r.error.message}`);
    return r.count ?? 0;
  }
  async tambahPesan(daftar: Omit<PesanAsisten, "id">[]) { cek(await this.#db.from("pesan_asisten").insert(daftar)); }
  async peringkat(kelasId: number | null) {
    let q = this.#db.from("v_peringkat").select("id, nama_panggilan, poin");
    if (kelasId !== null) q = q.eq("kelas_id", kelasId);
    return cek(await q.order("poin", { ascending: false }).order("id").limit(20)) as BarisPeringkat[];
  }
}
