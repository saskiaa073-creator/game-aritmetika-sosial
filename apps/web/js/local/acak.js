// Urutan tampil pilihan ganda diacak secara TETAP per soal (selalu sama untuk soal yang sama),
// supaya jawaban benar tidak selalu berada di posisi pertama.
// Hanya mengubah urutan tampilan; id pilihan, kunci, dan pemeriksaan tidak berubah.
// Diuji oleh tests/test_kesamaan_mesin.py (posisi kunci harus tersebar).

function fnv1a(teks) {
  let x = 0x811c9dc5;
  for (let i = 0; i < teks.length; i += 1) {
    x ^= teks.charCodeAt(i);
    x = Math.imul(x, 0x01000193);
  }
  // Pengaduk akhir (MurmurHash3 fmix32): id yang hanya beda satu huruf tetap teracak rata.
  x ^= x >>> 16;
  x = Math.imul(x, 0x85ebca6b);
  x ^= x >>> 13;
  x = Math.imul(x, 0xc2b2ae35);
  x ^= x >>> 16;
  return x >>> 0;
}

export function urutanPilihan(soal) {
  return [...soal.pilihan]
    .map((p) => [fnv1a(`${soal.id}:${p.id}`), p])
    .sort((a, b) => a[0] - b[0])
    .map(([, p]) => p);
}
