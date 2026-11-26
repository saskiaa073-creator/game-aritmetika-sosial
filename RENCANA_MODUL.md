# Rencana Modul — Pasar Pintar (PWA)

Materi: **Menghitung Persentase Untung dan Rugi**, Matematika kelas VII SMP
Dasar: wawancara beban kognitif (CLT), model ADDIE, tahap Design
Sumber data: *Laporan Wawancara Astri Saskia 2225250054.docx* (bagian E, informan S01, 4 November 2026) dan *TABEL KISI.docx*

> Catatan: hanya jawaban di **bagian E** yang dipakai. Bagian H (contoh simulasi) di laporan
> tertulis sebagai "jawaban rekaan", jadi tidak dipakai sebagai dasar desain.

## 1. Kode temuan wawancara (21 kode)

| Kode | Ringkasan temuan S01 |
|---|---|
| K01 | Paham untung/rugi secara nominal, bingung saat masuk rumus persen: takut terbalik pembagi HB/HJ. |
| K02 | Guru menulis rumus di papan + contoh soal cerita; paham saat mendengar, ragu saat latihan sendiri. |
| K03 | Ingat untung = HJ − HB; ragu pembagi persen; bingung langkah pertama soal diskon dan persentase rugi. |
| IL01 | Paling sulit: rumus persentase rugi dan mencari harga beli dari HJ + persentase untung. |
| IL02 | Harus memisahkan HB, HJ, hitung selisih, lalu persen — banyak langkah berurutan. |
| IL03 | Prasyarat: operasi pecahan, menyederhanakan, pecahan → persen; pembagian angka besar lama. |
| IL04 | Kesulitan naik saat yang diketahui persentase lalu ditanya HJ atau HB. |
| IL05 | Kesalahan umum: salah pembagi pada rumus persen, salah hitung selisih HJ − HB. |
| EL01 | Soal cerita panjang/bertele-tele → bingung angka mana HB dan mana HJ. |
| EL02 | Tabel rumus di buku terlalu padat; harus bolak-balik halaman rumus dan contoh. |
| EL03 | Warna ramai dan teks panjang mengganggu; ingin tampilan bersih, warna khusus HB dan HJ. |
| EL04 | Penjelasan terlalu cepat, langsung loncat ke diskon → tertinggal; ingin bertahap. |
| EL05 | Sulit mengubah kalimat cerita menjadi angka; takut salah memasukkan nilai ke rumus. |
| GL01 | Paham jika dikaitkan dengan jual-beli nyata (warung): untung rupiah dulu, baru persen. |
| GL02 | Mengecek kewajaran: untung kecil tapi persen ratusan → pembagi salah, hitung ulang. |
| GL03 | Terbantu contoh langkah demi langkah: (1) cari untung, (2) masukkan ke rumus dengan penyebut HB. |
| GL04 | Menjelaskan ke teman membuatnya ingat: pembagi selalu harga beli. |
| GL05 | Mengenali pola kata kunci: besar untung / persentase / harga awal. |
| DS01 | Ingin ringkasan rumus interaktif, kalkulator langkah bertahap, latihan dasar → lanjut. |
| DS02 | Penentuan pembagi dan soal cerita rumit dijelaskan pelan, dengan petunjuk saat salah. |
| DS03 | Jangan banyak teks teori; tampilan rapi, rumus dipisah jelas, warna tidak mencolok. |

## 2. Rencana modul

| No | Judul | Tujuan belajar | Kode yang dijawab |
|---|---|---|---|
| M0 | **Cek Bekal** | Diagnostik singkat pecahan → persen dan pembagian. Jika belum lancar, muncul jalur penguatan singkat sebelum M1. | K01, K02, IL03 |
| M1 | **Untung atau Rugi?** | Membedakan HB dan HJ (warna tetap: HB biru, HJ oranye), menentukan untung/rugi dan besarnya dalam rupiah, konteks warung. | K03, IL05, GL01, EL03 |
| M2 | **Penyebutnya Selalu Harga Beli** | Menghitung persentase untung; menjelaskan mengapa pembaginya HB; cek kewajaran hasil; memeriksa klaim teman yang membagi dengan HJ. | IL05, GL02, GL04, DS02, EL02 |
| M3 | **Persentase Rugi** | Menghitung persentase rugi dengan pola yang sama seperti M2 (rugi ÷ HB × 100%). | IL01, K03 |
| M4 | **Modal Lengkap** | Soal cerita dengan biaya tambahan (ongkos angkut, perbaikan) dan barang rusak; sorot kata kunci; ubah cerita menjadi tabel "Diketahui". | IL02, EL01, EL05, DS03 |
| M5 | **Dibalik: Mencari HJ atau HB** | Diketahui persentase untung/rugi, ditanya harga jual atau harga beli. Dimulai dari contoh lengkap, lalu langkahnya dikurangi bertahap (*fading*). | IL01, IL04, GL03 |
| M6 | **Diskon** | Transfer ke diskon setelah M1–M5 selesai; latihan mengenali kata kunci soal (besar untung / persen / harga awal / diskon). | GL05, EL04, K03 |
| M7 | **Tes Literasi Matematis** | 4 soal dari TABEL KISI (Pemasok Kue, Mangga, Sepeda Bekas, Klaim Andi), dinilai per tahap, skor maks 24. Angkanya **tidak** dipakai di latihan. | GL03, DS01 |

Semua 21 kode tercakup. Tes otomatis akan memeriksa hal ini.

Tingkat latihan mengikuti matriks analisis bagian F laporan:
Level 1 = Hitung untung/rugi (M1) · Level 2 = Hitung persentase (M2–M3) · Level 3 = Soal cerita gabungan (M4–M6).

## 3. Fitur dan kode yang menjadi alasannya

| Fitur | Kode |
|---|---|
| Sorot otomatis kata kunci (harga beli, harga jual, untung, rugi, ongkos) pada soal cerita | EL01, EL05 |
| Kartu rumus ringkas yang bisa dibuka di layar mana pun (tidak perlu bolak-balik halaman) | EL02, DS01 |
| Tampilan bersih, warna tetap HB biru dan HJ oranye, maksimal 70 kata per layar | EL03, DS03 |
| Maju/mundur sendiri, satu langkah per layar | EL04, K02 |
| Petunjuk 3 tingkat + pembahasan di setiap soal | GL03, DS02 |
| Kalkulator langkah bertahap (untung → persen; persen → HJ/HB) | DS01, IL03 |
| Umpan balik yang menyebut kesalahan khas, misalnya "Sepertinya kamu membagi dengan harga jual" | IL05, K01 |
| Cek kewajaran: peringatan bila persen yang dimasukkan tidak masuk akal | GL02 |
| Asisten Belajar AI (model RMT), tidak pernah memberi jawaban akhir | GL04, GL02, DS02 |
| Poin, streak, sasaran harian, papan peringkat (nama panggilan) | — (permintaan arahan) |
| Dashboard guru: kelas, kode kelas, kesalahan umum, ekspor CSV | IL05 |
| Glosarium: HB, HJ, modal, untung, rugi, persentase, diskon, bruto/neto | EL01 |

## 4. Hal yang perlu dikonfirmasi

1. Data wawancara hanya dari **1 informan (S01)**, padahal pedoman meminta minimal 2. Apakah ada S02?
2. Belum ada **jawaban siswa uji coba** untuk soal Mathematical Literacy. Untuk sementara, daftar kesalahan umum diambil dari wawancara (IL05, K01).
3. Arahan dosen yang dipakai: chatbot RMT, kunci API hanya di backend, Gemini (DeepSeek sebagai cadangan). Ada arahan lain?
4. Aplikasi Streamlit yang lama (`app.py`, `tests/soal_generator.py`) akan dipindah ke folder `legacy/`, dan aplikasi baru dibuat di `apps/` dalam repo yang sama.
