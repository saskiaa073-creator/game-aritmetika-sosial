# Pasar Pintar

Aplikasi belajar (PWA) untuk materi **Menghitung Persentase Untung dan Rugi**, Matematika kelas VII SMP.
Aplikasi ini dirancang dari hasil wawancara beban kognitif (Cognitive Load Theory) dengan model pengembangan ADDIE.
Rencana modul dan pemetaan kode wawancara ada di [RENCANA_MODUL.md](RENCANA_MODUL.md).

## Coba langsung di HP

Buka **https://saskiaa073-creator.github.io/game-aritmetika-sosial/** di browser HP (versi statis: akun dan
kemajuan tersimpan di perangkat masing-masing; akun cepat `siswa_demo` / `siswa12345`). Lewat menu browser
"Tambahkan ke layar utama", aplikasi bisa dipasang seperti aplikasi biasa.

## Cara menjalankan versi lengkap di laptop (Windows)

1. Pasang Python 3.12 atau lebih baru dari python.org.
2. Klik dua kali **`start.bat`**. Saat pertama kali, start.bat membuat lingkungan Python dan memasang paket (butuh internet).
3. Browser terbuka di `http://127.0.0.1:8000`.

Akun demo: guru `guru_demo` / `guru12345`, siswa `siswa_demo` / `siswa12345`, kode kelas `DEMO77`.

## Menjalankan tes

```powershell
.\.venv\Scripts\python.exe -m pytest
```

Tes memeriksa: mesin penilaian, kesamaan mesin Python dan JavaScript, aturan CLT konten
(maks 70 kata per layar, maks 6 langkah per contoh, 3 petunjuk dan pembahasan per soal),
cakupan 21 kode wawancara, keamanan kunci jawaban, privasi data anak, dan seluruh alur API.

## Struktur

```text
apps/api/        Backend FastAPI + SQLite, mesin penilaian Python (engine/)
apps/web/        Frontend PWA tanpa build, mesin penilaian JavaScript (js/local/)
content/         Materi dan soal (JSON), kurikulum, kode wawancara, glosarium
tests/           Tes pytest
legacy/          Versi Streamlit sebelumnya
```

## Pengembang

Astri Saskia (2225250054). Dikembangkan dengan bantuan asisten AI (Claude Code); riwayat bantuan ada di
[RIWAYAT_BANTUAN.md](RIWAYAT_BANTUAN.md).
