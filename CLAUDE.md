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

## Asisten Belajar AI (Tahap 4)

- Kode: `apps/api/asisten.py` (logika), endpoint `/api/asisten`, `/api/asisten/status`, `/api/asisten/riwayat/{soal_id}` di `main.py`, panel `apps/web/js/views/asisten.js`, tabel `PesanAsisten` di `db.py`.
- 6 tahap RMT (`TAHAP_RMT`): Orientasi → Mengenali data → Membandingkan → Menghitung selisih → Menghubungkan ke persen → Refleksi. Naik satu tahap per giliran (maks 5); tahap 6 setelah mesin menyatakan jawaban benar. Nama tahap adalah operasionalisasi aplikasi; sesuaikan dengan sumber RMT dosen bila perlu.
- Petunjuk 3 tingkat = `petunjuk` soal; tingkat naik tiap jawaban salah (dicek mesin) atau siswa minta bantuan.
- Pesan siswa yang berupa angka saja diperiksa MESIN (`periksa`). AI hanya menyusun kalimat.
- AI tidak pernah diberi kunci, pembahasan, kesalahan umum, atau identitas siswa. Balasan yang memuat jawaban akhir (angka kunci, bentuk desimalnya, teks pilihan benar, frasa "jawabannya adalah", menyebut opsi) dibuang (`bocor`) dan diganti teks bawaan.
- Tanpa kunci atau bila layanan gagal, asisten tetap jalan dengan teks bawaan. Di modul tes: 403 sampai tahap dijawab. Kuota harian per siswa: `AI_KUOTA_HARIAN`.
- **Penyedia aktif: DeepSeek** (tugas dosen: aplikasi terintegrasi API DeepSeek). Bawaan dari dokumentasi resmi (27 Nov 2026): endpoint `https://api.deepseek.com/chat/completions`, model `deepseek-flash`, `reasoning_effort: none` (mode berpikir mati agar balasan singkat). HTTP 402 = saldo habis. `DEEPSEEK_API_KEY`/`GEMINI_API_KEY` dipakai bila `AI_API_KEY` kosong, sesuai penyedia.
- **Mathematical Literacy:** di M7 asisten terbuka hanya setelah siswa menjawab tahap itu sekali (skor = jawaban pertama tetap murni). Asisten diberi cerita soal, judul butir, dan arahan indikator (`INDIKATOR_LITERASI`, dari TABEL KISI), tetap tanpa kunci/pembahasan dan dengan penyaring bocor.
- Di folder utama ada `main.py` (chat Gemini terminal, `google-genai`), `package.json`, dan `node_modules` (Express) buatan pemilik di luar sesi. Tidak dipakai aplikasi; pemilik memilih membiarkannya. Jangan dihapus tanpa izin.
- Pengaturan di `.env`: `AI_PROVIDER` (gemini/deepseek), `AI_API_KEY`, `AI_MODEL`, `AI_KUOTA_HARIAN`, `AI_BASE_URL`, `AI_REASONING_EFFORT`. Endpoint Gemini: `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`. Nama model tidak ditebak: cek dengan `.\.venv\Scripts\python.exe -m apps.api.cek_ai`.
- Tes memakai AI palsu (`app.state.panggil_ai`); tidak ada panggilan internet di pytest.
- `siapkan_env.py` menambahkan baris baru dari `.env.example` ke `.env` lama tanpa mengubah isinya.

## Versi statis / GitHub Pages (Tahap 5)

- `tools/bangun_statis.py` → folder `docs/` (salinan `apps/web`, `MODE = "statis"`, `data/konten.json` berisi semua modul + glosarium **termasuk kunci**, karena tanpa server). Jalankan `.\.venv\Scripts\python.exe -m tools.bangun_statis` setiap kali tampilan/konten berubah; `tests/test_versi_statis.py` gagal bila `docs/` usang.
- `index.html` di folder utama mengalihkan ke `docs/`, jadi GitHub Pages dari cabang `main` (root) langsung membuka aplikasi: `https://saskiaa073-creator.github.io/game-aritmetika-sosial/`.
- Mode statis: `api.js` memanggil `js/local/server.js` (meniru endpoint dengan localStorage; akun demo `siswa_demo`). Logika `js/local/logika.js` (poin, streak, skor tes, asisten teks bawaan) harus identik dengan Python (dites dengan ratusan kasus acak). Fitur kelas/dashboard guru dan AI tidak ada di versi statis.
- Koneksi ke layanan AI dipaksa IPv4 (`kirim_http`), karena di Wi-Fi kampus alamat IPv6 membuat Python tampak macet. Satu kali coba ulang untuk 429/503.
- Gemini aktif saat ini: `gemini-3.1-flash-lite` + `reasoning_effort: minimal` (±2–5 detik). `gemini-3.5-flash`/`3.8-flash` terlalu lambat (>50 detik) untuk chat.

## Catatan frontend

- Tema warna **cream** (permintaan pemilik): token di `:root` pada `apps/web/css/app.css` (latar `#f7f0e3`, kartu `#fffbf4`, utama hijau zaitun `#2f5d50`, teks cokelat `#3a2e24`). Pakai token, jangan warna langsung. `tests/test_tampilan.py` memeriksa kontras WCAG AA semua pasangan penting dan bahwa harga beli tetap biru / harga jual tetap oranye.

- Halaman siswa (menu bawah): **Beranda** (`beranda.js`: sapaan, cincin sasaran, lanjutkan belajar, jalur mini, akses cepat, tips), **Belajar** (`belajar.js`: jalur modul per level), **Alat** (`alat` di `alat.js`: kalkulator, kartu rumus, glosarium), **Peringkat** (medali 3 besar), **Akun** (profil, gabung kelas, tentang). `MENU_INDUK` di `app.js` menyalakan menu induk untuk halaman turunan (modul → Belajar, kalkulator/glosarium → Alat).
- Gaya aplikasi belajar: maskot buatan sendiri **Koko si Koin** (`ilustrasi("maskot-senang"|"maskot-hore"|"maskot-mikir")`), gambar SVG per modul (`gambarModul(id)`), ikon garis seragam (`views/ikon.js`, `ikon(nama)`), warna per level (`kelasLevel(m)` → `.lvl-0…3/.lvl-tes`, token `--lvlN`; tidak boleh biru/oranye, dites). Modul punya layar pembuka, umpan balik bermaskot, dan layar "Modul selesai!" (bintang dari soal benar di server). Gambar/maskot hanya di pembuka, umpan balik, layar akhir, dan beranda; layar materi dan soal tetap bersih (EL03).
- Ilustrasi SVG buatan sendiri dan ikon modul ada di `views/ilustrasi.js` (`IKON_MODUL`, `NAMA_LEVEL`). Hindari emoji Unicode 13+ (mis. 🪜) karena tampil sebagai kotak kosong di Windows 10/HP lama.
- Pakai `h()` atau `ganti(el, ...)` dari `ui.js`. Jangan memberi isi bersyarat (`kondisi && h(...)`) langsung ke `append`/`replaceChildren` bawaan, karena `false` akan tampil sebagai teks (dites).
- Server mengirim `Cache-Control: no-cache` untuk file tampilan agar browser tidak mencampur file JS lama dan baru.

## Aturan poin

Benar pertama kali: 10 poin − 2 per petunjuk (minimal 4). Jawaban benar berikutnya untuk soal yang sama: 0 poin.
Streak = hari berturut-turut (WIB) dengan minimal satu jawaban benar. Sasaran harian: `SASARAN_HARIAN` (bawaan 30).

## Tahapan (dari PDF panduan)

1. Kerangka ✔ — 2. Konten M0–M7 ✔ — 3. Uji coba (dilewati pemilik, diuji otomatis) — 4. Asisten AI ✔ (RMT, Gemini via endpoint kompatibel OpenAI, DeepSeek cadangan) — 5. Versi statis GitHub Pages ✔ — 6. Supabase — 7. Netlify — 8. Pengumpulan.
