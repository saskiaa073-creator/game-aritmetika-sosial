// Antarmuka penyimpanan data. Dua penerapan:
//   - GudangSupabase (gudang_supabase.ts): tabel PostgreSQL di Supabase (dipakai saat online)
//   - GudangMemori (di bawah): di memori, untuk tes di laptop tanpa koneksi
// PRIVASI ANAK: Pengguna hanya punya username + nama_panggilan (tanpa e-mail/HP/tanggal lahir/nama lengkap).

export interface Pengguna {
  id: number;
  username: string;
  nama_panggilan: string;
  password_hash: string;
  peran: "siswa" | "guru";
  kelas_id: number | null;
}
export interface Kelas { id: number; nama: string; kode: string; guru_id: number }
export interface Jawaban {
  id: number;
  pengguna_id: number;
  modul_id: string;
  soal_id: string;
  jawaban: string;
  status: string;
  kode_kesalahan: string;
  petunjuk_dipakai: number;
  poin: number;
  tanggal: string; // YYYY-MM-DD (WIB)
}
export interface PesanAsisten {
  id: number;
  pengguna_id: number;
  soal_id: string;
  peran: "siswa" | "asisten";
  isi: string;
  status_cek: string;
  minta_bantuan: number;
  sumber: string;
  tanggal: string;
}
export interface BarisPeringkat { id: number; nama_panggilan: string; poin: number }

export interface Gudang {
  penggunaByUsername(username: string): Promise<Pengguna | null>;
  penggunaById(id: number): Promise<Pengguna | null>;
  tambahPengguna(p: Omit<Pengguna, "id">): Promise<Pengguna>;
  setKelasPengguna(id: number, kelasId: number): Promise<void>;
  kelasByKode(kode: string): Promise<Kelas | null>;
  kelasById(id: number): Promise<Kelas | null>;
  kelasGuru(guruId: number): Promise<Kelas[]>;
  tambahKelas(k: Omit<Kelas, "id">): Promise<Kelas>;
  hitungAnggotaKelas(kelasId: number): Promise<number>;
  siswaKelas(kelasId: number): Promise<Pengguna[]>; // urut nama_panggilan
  jawaban(filter: { pengguna_id?: number; pengguna_ids?: number[]; soal_id?: string; modul_id?: string }): Promise<Jawaban[]>; // urut id
  tambahJawaban(j: Omit<Jawaban, "id">): Promise<void>;
  pesan(penggunaId: number, soalId: string): Promise<PesanAsisten[]>; // urut id
  hitungPesanSiswaHariIni(penggunaId: number, tanggal: string): Promise<number>;
  tambahPesan(daftar: Omit<PesanAsisten, "id">[]): Promise<void>;
  peringkat(kelasId: number | null): Promise<BarisPeringkat[]>; // 20 teratas: poin turun, lalu id naik
}

export class GudangMemori implements Gudang {
  pengguna: Pengguna[] = [];
  kelas: Kelas[] = [];
  semuaJawaban: Jawaban[] = [];
  semuaPesan: PesanAsisten[] = [];
  #id = 0;
  #baru = () => ++this.#id;

  async penggunaByUsername(u: string) { return this.pengguna.find((p) => p.username === u) ?? null; }
  async penggunaById(id: number) { return this.pengguna.find((p) => p.id === id) ?? null; }
  async tambahPengguna(p: Omit<Pengguna, "id">) {
    if (this.pengguna.some((x) => x.username === p.username)) throw new Error("username ganda");
    const baru = { ...p, id: this.#baru() };
    this.pengguna.push(baru);
    return baru;
  }
  async setKelasPengguna(id: number, kelasId: number) { const p = await this.penggunaById(id); if (p) p.kelas_id = kelasId; }
  async kelasByKode(kode: string) { return this.kelas.find((k) => k.kode === kode) ?? null; }
  async kelasById(id: number) { return this.kelas.find((k) => k.id === id) ?? null; }
  async kelasGuru(guruId: number) { return this.kelas.filter((k) => k.guru_id === guruId).sort((a, b) => a.id - b.id); }
  async tambahKelas(k: Omit<Kelas, "id">) { const baru = { ...k, id: this.#baru() }; this.kelas.push(baru); return baru; }
  async hitungAnggotaKelas(kelasId: number) { return this.pengguna.filter((p) => p.kelas_id === kelasId).length; }
  async siswaKelas(kelasId: number) {
    return this.pengguna.filter((p) => p.kelas_id === kelasId && p.peran === "siswa")
      .sort((a, b) => (a.nama_panggilan < b.nama_panggilan ? -1 : a.nama_panggilan > b.nama_panggilan ? 1 : 0));
  }
  async jawaban(f: { pengguna_id?: number; pengguna_ids?: number[]; soal_id?: string; modul_id?: string }) {
    return this.semuaJawaban.filter((j) =>
      (f.pengguna_id === undefined || j.pengguna_id === f.pengguna_id) &&
      (f.pengguna_ids === undefined || f.pengguna_ids.includes(j.pengguna_id)) &&
      (f.soal_id === undefined || j.soal_id === f.soal_id) &&
      (f.modul_id === undefined || j.modul_id === f.modul_id));
  }
  async tambahJawaban(j: Omit<Jawaban, "id">) { this.semuaJawaban.push({ ...j, id: this.#baru() }); }
  async pesan(penggunaId: number, soalId: string) {
    return this.semuaPesan.filter((m) => m.pengguna_id === penggunaId && m.soal_id === soalId);
  }
  async hitungPesanSiswaHariIni(penggunaId: number, tanggal: string) {
    return this.semuaPesan.filter((m) => m.pengguna_id === penggunaId && m.peran === "siswa" && m.tanggal === tanggal).length;
  }
  async tambahPesan(daftar: Omit<PesanAsisten, "id">[]) { for (const m of daftar) this.semuaPesan.push({ ...m, id: this.#baru() }); }
  async peringkat(kelasId: number | null) {
    return this.pengguna
      .filter((p) => p.peran === "siswa" && (kelasId === null || p.kelas_id === kelasId))
      .map((p) => ({ id: p.id, nama_panggilan: p.nama_panggilan,
        poin: this.semuaJawaban.filter((j) => j.pengguna_id === p.id).reduce((t, j) => t + j.poin, 0) }))
      .sort((a, b) => b.poin - a.poin || a.id - b.id)
      .slice(0, 20);
  }
}
