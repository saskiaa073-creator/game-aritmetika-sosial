# Pasar Pintar

Pasar Pintar adalah game pembelajaran berbasis Python dan Streamlit untuk materi Aritmetika Sosial tingkat SMP. Pemain berlatih memahami untung, rugi, dan persentase melalui empat kios dengan soal bertahap.

## Kios dan Indikator Literasi Matematis

| Kios | Materi dan tantangan | Indikator |
|---|---|---|
| 1. Pilih Pemasok | Membandingkan persentase untung beberapa pemasok, termasuk membedakan persentase terbesar dari untung rupiah terbesar. | Mathematical Reasoning |
| 2. Buah untuk Dijual | Memodelkan modal dan ongkos angkut, menghitung sisa buah setelah busuk, pendapatan, serta untung/rugi dan persentasenya. | Formulating Situations Mathematically |
| 3. Barang Bekas | Menghitung modal setelah perbaikan, besar untung/rugi, dan harga jual. | Employing Concepts, Facts, and Procedures |
| 4. Periksa Klaim | Mengevaluasi klaim persentase untung dengan membandingkan penyebut harga jual dan modal. | Interpreting, Applying, and Evaluating |

Setiap kios memiliki skor maksimum 6, dengan total skor maksimum 24.

## Fitur

- Mode Latihan menggunakan angka soal acak; seed yang sama menghasilkan paket yang sama.
- Mode Tes menggunakan angka tetap dari instrumen soal.
- Soal dikerjakan tahap demi tahap, dengan petunjuk, pembahasan, umpan balik, skor parsial, koin, bintang, dan progres kios.
- Jawaban mendukung penulisan angka Indonesia, misalnya `25.000`, `Rp25.000`, `12,5`, dan `25%`.
- Halaman hasil menampilkan skor per indikator, nilai, kategori, grafik, dan unduhan CSV.
- Rekap permainan disimpan di `hasil/rekap_hasil.csv`.

## Menjalankan di VS Code

1. Buka folder proyek di VS Code.
2. Buka terminal terintegrasi dengan profil PowerShell.
3. Buat dan aktifkan lingkungan virtual:

   ```powershell
   py -m venv .venv
   .\.venv\Scripts\Activate.ps1
   ```

4. Pasang dependensi:

   ```powershell
   python -m pip install -r requirements.txt
   ```

5. Pilih interpreter `.venv` melalui **Python: Select Interpreter** di Command Palette VS Code bila belum terpilih.
6. Jalankan aplikasi:

   ```powershell
   python -m streamlit run app.py
   ```

7. Buka alamat lokal yang ditampilkan di terminal, biasanya `http://localhost:8501`.

Jika PowerShell menolak aktivasi lingkungan virtual, jalankan perintah Streamlit melalui interpreter virtual secara langsung:

```powershell
.\.venv\Scripts\python.exe -m streamlit run app.py
```

## Menjalankan Tes

Dari folder utama proyek, jalankan:

```powershell
python -m unittest discover tests
```

## Struktur Proyek

```text
.
├── app.py
├── requirements.txt
├── README.md
└── tests/
    ├── soal_generator.py
    └── test_soal.py
```

Logika pembentukan dan penilaian soal berada di `tests/soal_generator.py`, sedangkan `app.py` menangani antarmuka Streamlit. Berkas rekap `hasil/rekap_hasil.csv` dibuat otomatis setelah hasil permainan disimpan.

## Pengembang

Astri Saskia (2225250054)
