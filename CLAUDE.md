# Pasar Pintar — catatan proyek untuk asisten AI

Aplikasi belajar (PWA) **Menghitung Persentase Untung dan Rugi**, Matematika kelas VII SMP.
Dirancang dari wawancara beban kognitif (Cognitive Load Theory), model pengembangan ADDIE.
Pemilik: mahasiswa Pendidikan Matematika, pemula di terminal. Jelaskan dengan bahasa Indonesia
sederhana dan tulis perintah lengkap yang tinggal disalin.

## Perintah

```powershell
# Menjalankan aplikasi (atau klik dua kali start.bat)
.\.venv\Scripts\python.exe -m uvicorn apps.api.main:create_app --factory --reload

# Menjalankan semua tes (wajib 100% lolos setiap tahap)
.\.venv\Scripts\python.exe -m pytest

# Memasang paket
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

Akun demo (bila `DEMO_SEED=1` di `.env`): `guru_demo` / `guru12345`, `siswa_demo` / `siswa12345`, kode kelas `DEMO77`.

## Struktur

| Folder/berkas | Isi |
|---|---|
| `apps/api/` | Backend FastAPI. `main.py` (endpoint, `create_app`), `db.py` (tabel), `auth.py` (PBKDF2 + JWT), `konten.py` (pemuat JSON + daftar kolom RAHASIA), `config.py` (.env) |
| `apps/api/engine/` | Mesin penilaian Python: `parser.py` (parser aman), `checker.py` (`periksa`) |
| `apps/web/` | Frontend PWA, JavaScript ES modules tanpa build. `js/app.js` (router hash), `js/views/*`, `sw.js`, `manifest.webmanifest` |
| `apps/web/js/local/mesin.js` | Mesin penilaian JavaScript, **padanan persis** mesin Python |
| `content/` | `m*.json` (satu file per modul), `kurikulum.json` (rencana M0–M7 + kode), `kode_wawancara.json` (21 kode S01), `glosarium.json` |
| `tests/` | pytest. `fixtures/kasus_mesin.json` = kasus bersama Python dan JS |
| `legacy/` | Aplikasi Streamlit lama (tidak dipakai lagi, tidak ikut dites) |
| `RENCANA_MODUL.md` | Rencana modul yang disetujui pemilik |
| `RIWAYAT_BANTUAN.md` | Catatan setiap permintaan dan ringkasan jawaban (WAJIB diperbarui) |

## Aturan wajib

1. Benar/salah SELALU diperiksa kode deterministik (`engine/` Python + `mesin.js`), BUKAN oleh AI.
2. Kunci jawaban tidak boleh terkirim ke peramban sebelum siswa menjawab. Kolom rahasia: `RAHASIA` di `apps/api/konten.py` (`kunci`, `toleransi`, `pembahasan`, `kesalahan_umum`). Pembahasan dikirim setelah benar atau setelah 3 kali salah.
3. Masukan angka/rumus hanya lewat parser dengan daftar karakter yang diizinkan. Dilarang eval/exec/sympify/new Function (dites).
4. Aturan CLT untuk konten, divalidasi `tests/test_konten.py`: maks 70 kata per layar, maks 6 langkah per contoh, setiap soal punya 3 petunjuk dan pembahasan, kunci harus diterima pemeriksa, petunjuk tidak memuat angka jawaban.
5. Setiap modul mencantumkan `kode_wawancara` yang sama dengan `kurikulum.json`; seluruh 21 kode harus tercakup.
6. Privasi anak: tidak menyimpan e-mail, nomor HP, tanggal lahir, nama lengkap. Hanya `username` + `nama_panggilan`. Papan peringkat hanya menampilkan nama panggilan.
7. Bahasa Indonesia sederhana (siswa 13–14 tahun); angka format Indonesia (koma desimal, titik ribuan); status benar/salah selalu ikon + teks (✔ Benar / ✖ Belum tepat / ⚠ Belum bisa dibaca).
8. Mesin Python dan JavaScript harus identik. Setiap perubahan diterapkan di keduanya; `tests/test_kesamaan_mesin.py` menjalankan mesin JS lewat mini-racer (V8) dan membandingkan hasilnya.

Tambahan:
- Kunci API (AI, Supabase, dll.) HANYA di `.env` atau secrets server. Jangan pernah di kode frontend, chat, atau GitHub.
- Minta izin sebelum push ke GitHub, deploy, atau mengubah layanan online.
- Data wawancara: pakai bagian E laporan (S01). Bagian H laporan adalah simulasi rekaan, jangan dipakai.
- Soal Tes Literasi (TABEL KISI) hanya untuk M7; angkanya tidak boleh dipakai di latihan.
- Setiap file baru di `apps/web/js/` harus dicantumkan di `BERKAS` pada `sw.js` (dites), dan `VERSI` dinaikkan.

## Skema konten modul (`content/mN.json`)

```json
{
  "id": "m1", "urutan": 1, "level": 1, "judul": "...", "tujuan": "...",
  "kode_wawancara": ["K03", "IL05"],
  "langkah": [
    {"id": "m1-l1", "jenis": "teks", "judul": "...", "isi": "paragraf\n\nparagraf"},
    {"id": "m1-l3", "jenis": "contoh", "judul": "...", "soal": "...", "langkah_contoh": ["maks 6"]}
  ],
  "soal": [
    {"id": "m1-s3", "tipe": "angka", "satuan": "rupiah|persen|angka", "teks": "...",
     "kunci": "3.000", "toleransi": "0", "petunjuk": ["1", "2", "3"], "pembahasan": "...",
     "kesalahan_umum": [{"nilai": "57.000", "kode": "dijumlah", "pesan": "..."}]},
    {"id": "m1-s1", "tipe": "pilihan", "teks": "...", "pilihan": [{"id": "a", "teks": "..."}], "kunci": "a", "...": "..."}
  ]
}
```

Kunci dan nilai kesalahan ditulis format Indonesia (`"12,5"`, `"3.000"`) dan dibaca dengan parser yang sama.

Kolom tambahan (opsional) pada langkah:
- `"sebelum": "m7-s1"`: layar ditampilkan tepat sebelum soal itu (cerita soal tes).
- `"tampil_jika_salah": ["m0-s1", "m0-s2"]`: layar penguatan adaptif, hanya muncul bila jawaban pertama salah satu soal itu salah. Wajib disertai `sebelum`, dan soal yang dirujuk harus muncul sebelumnya.

Modul tes (`"jenis": "tes"`, saat ini hanya M7): punya `butir` (nomor → judul + indikator), dan setiap soal punya `butir` dan `skor` (bilangan bulat). Skor tiap butir = 6, total 24, mengikuti TABEL KISI. Skor dihitung dari **jawaban pertama yang terbaca** (`hitung_hasil_tes` di `main.py`). Di tampilan, petunjuk baru terbuka setelah menjawab dan tombol Berikutnya terkunci sampai tahap dijawab. Kategori nilai: Sangat Baik ≥ 86, Baik ≥ 71, Cukup ≥ 56, Perlu Bimbingan.

Modul latihan (M0–M6) dilarang memakai angka dari soal TABEL KISI (daftar `ANGKA_KISI` di `tests/test_konten.py`).

Urutan tampil pilihan ganda diacak tetap per soal oleh `apps/web/js/local/acak.js`. Di JSON, kunci boleh selalu `"a"`; tes memastikan posisi tampilnya tersebar.

## Catatan frontend

- Pakai `h()` atau `ganti(el, ...)` dari `ui.js`. Jangan memberi isi bersyarat (`kondisi && h(...)`) langsung ke `append`/`replaceChildren` bawaan, karena `false` akan tampil sebagai teks (dites).
- Server mengirim `Cache-Control: no-cache` untuk file tampilan agar browser tidak mencampur file JS lama dan baru.

## Aturan poin

Benar pertama kali: 10 poin − 2 per petunjuk (minimal 4). Jawaban benar berikutnya untuk soal yang sama: 0 poin.
Streak = hari berturut-turut (WIB) dengan minimal satu jawaban benar. Sasaran harian: `SASARAN_HARIAN` (bawaan 30).

## Tahapan (dari PDF panduan)

1. Kerangka ✔ — 2. Konten M0–M7 ✔ — 3. Uji coba — 4. Asisten AI (RMT, Gemini via endpoint kompatibel OpenAI, DeepSeek cadangan) — 5. Versi statis GitHub Pages — 6. Supabase — 7. Netlify — 8. Pengumpulan.
