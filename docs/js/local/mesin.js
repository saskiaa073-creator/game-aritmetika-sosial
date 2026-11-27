// Mesin penilaian deterministik (JavaScript).
// Padanan PERSIS dari apps/api/engine/parser.py dan checker.py.
// Setiap perubahan di sini WAJIB diterapkan juga di Python, dan sebaliknya.
// Diuji otomatis oleh tests/test_kesamaan_mesin.py.
//
// ATURAN: dilarang memakai eval, new Function, atau sejenisnya.
// Bilangan disimpan sebagai pecahan pasti {p, q} dengan BigInt.

export const MAKS_PANJANG = 40;
const KARAKTER_DIIZINKAN = new Set("0123456789.,+-*/x×:() %rp");

export const PESAN_GALAT = {
  kosong: "Jawaban masih kosong.",
  terlalu_panjang: "Jawaban terlalu panjang. Tulis angkanya saja.",
  karakter: "Ada huruf atau simbol yang tidak dikenal. Tulis angka saja, misalnya 25.000 atau 12,5.",
  titik_desimal: "Untuk desimal pakai koma, misalnya 12,5. Titik dipakai untuk ribuan, misalnya 25.000.",
  format: "Penulisan angka belum tepat. Contoh: 25.000 atau 12,5.",
  bagi_nol: "Tidak bisa dibagi dengan nol.",
};

export const PESAN = {
  benar: "Benar! Kerja bagus.",
  salah: "Belum tepat. Coba buka petunjuk, lalu periksa lagi langkahmu.",
  persen_tak_wajar: "Persentasenya lebih dari 100%. Masuk akal? Cek lagi angka pembaginya.",
  pilihan_kosong: "Pilih salah satu jawaban dulu.",
};

const POLA_ANGKA = /\d+(?:\.\d+)*(?:,\d+)?/y;
const OPERATOR = { "+": "+", "-": "-", "*": "*", x: "*", "×": "*", "/": "/", ":": "/", "(": "(", ")": ")" };

export class GalatParse extends Error {
  constructor(kode) {
    super(PESAN_GALAT[kode]);
    this.kode = kode;
    this.pesan = PESAN_GALAT[kode];
  }
}

// ---------- Pecahan pasti ----------
const abs = (a) => (a < 0n ? -a : a);
function fpb(a, b) {
  a = abs(a);
  b = abs(b);
  while (b) [a, b] = [b, a % b];
  return a;
}
export function pecahan(p, q = 1n) {
  p = BigInt(p);
  q = BigInt(q);
  if (q === 0n) throw new GalatParse("bagi_nol");
  if (q < 0n) [p, q] = [-p, -q];
  const g = fpb(p, q) || 1n;
  return { p: p / g, q: q / g };
}
export const tambah = (a, b) => pecahan(a.p * b.q + b.p * a.q, a.q * b.q);
export const kurang = (a, b) => pecahan(a.p * b.q - b.p * a.q, a.q * b.q);
export const kali = (a, b) => pecahan(a.p * b.p, a.q * b.q);
export function bagi(a, b) {
  if (b.p === 0n) throw new GalatParse("bagi_nol");
  return pecahan(a.p * b.q, a.q * b.p);
}
export const negatif = (a) => pecahan(-a.p, a.q);
/** -1, 0, atau 1 */
export const banding = (a, b) => {
  const s = a.p * b.q - b.p * a.q;
  return s < 0n ? -1 : s > 0n ? 1 : 0;
};
const mutlak = (a) => pecahan(abs(a.p), a.q);

// ---------- Tokenisasi dan parser ----------
function angkaKeRasional(teks) {
  let [bulat, pecah = ""] = teks.split(",");
  if (bulat.includes(".")) {
    const kelompok = bulat.split(".");
    if (!(kelompok[0].length >= 1 && kelompok[0].length <= 3) || kelompok.slice(1).some((k) => k.length !== 3)) {
      throw new GalatParse("titik_desimal");
    }
    bulat = kelompok.join("");
  }
  return pecahan(BigInt(bulat + pecah), 10n ** BigInt(pecah.length));
}

const adalahDigit = (c) => c >= "0" && c <= "9";

export function tokenisasi(masukan) {
  if (typeof masukan !== "string") throw new GalatParse("format");
  // Hanya spasi/tab/baris baru yang dipangkas, agar sama persis dengan versi Python.
  let teks = masukan.replace(/^[ \t\n\r]+|[ \t\n\r]+$/g, "").toLowerCase();
  if (!teks) throw new GalatParse("kosong");
  for (const c of teks) if (!KARAKTER_DIIZINKAN.has(c)) throw new GalatParse("karakter");
  if ([...teks].length > MAKS_PANJANG) throw new GalatParse("terlalu_panjang");
  teks = teks.replaceAll("rp", " ");
  if (teks.includes("r") || teks.includes("p")) throw new GalatParse("karakter");
  teks = teks.trim();
  if (teks.endsWith("%")) teks = teks.slice(0, -1).trimEnd();
  if (teks.includes("%")) throw new GalatParse("format");
  if (!teks) throw new GalatParse("kosong");

  const token = [];
  let i = 0;
  while (i < teks.length) {
    const c = teks[i];
    if (c === " ") {
      i += 1;
      continue;
    }
    if (adalahDigit(c)) {
      POLA_ANGKA.lastIndex = i;
      const cocok = POLA_ANGKA.exec(teks);
      token.push(["angka", angkaKeRasional(cocok[0])]);
      i = POLA_ANGKA.lastIndex;
      continue;
    }
    if (c in OPERATOR) {
      token.push(["op", OPERATOR[c]]);
      i += 1;
      continue;
    }
    throw new GalatParse("format");
  }
  return token;
}

export function parse(masukan) {
  const token = tokenisasi(masukan);
  let posisi = 0;
  const lihat = () => token[posisi];
  const ambilOp = (...simbol) => {
    const t = lihat();
    if (t && t[0] === "op" && simbol.includes(t[1])) {
      posisi += 1;
      return t[1];
    }
    return null;
  };
  function ekspresi() {
    let nilai = suku();
    let op;
    while ((op = ambilOp("+", "-")) !== null) {
      const kanan = suku();
      nilai = op === "+" ? tambah(nilai, kanan) : kurang(nilai, kanan);
    }
    return nilai;
  }
  function suku() {
    let nilai = faktor();
    let op;
    while ((op = ambilOp("*", "/")) !== null) {
      const kanan = faktor();
      nilai = op === "*" ? kali(nilai, kanan) : bagi(nilai, kanan);
    }
    return nilai;
  }
  function faktor() {
    if (ambilOp("-") !== null) return negatif(faktor());
    if (ambilOp("+") !== null) return faktor();
    if (ambilOp("(") !== null) {
      const nilai = ekspresi();
      if (ambilOp(")") === null) throw new GalatParse("format");
      return nilai;
    }
    const t = lihat();
    if (!t || t[0] !== "angka") throw new GalatParse("format");
    posisi += 1;
    return t[1];
  }
  const nilai = ekspresi();
  if (posisi !== token.length) throw new GalatParse("format");
  return nilai;
}

// ---------- Format angka Indonesia ----------
function ribuan(n) {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** Titik ribuan, koma desimal; dibulatkan setengah menjauhi nol. */
export function formatAngka(nilai, desimal = 2) {
  const r = typeof nilai === "object" ? nilai : pecahan(BigInt(nilai));
  const skala = 10n ** BigInt(desimal);
  const pembilang = abs(r.p) * skala;
  const dibulatkan = (2n * pembilang + r.q) / (2n * r.q);
  const bulat = dibulatkan / skala;
  const sisa = dibulatkan % skala;
  const teksSisa = desimal ? sisa.toString().padStart(desimal, "0").replace(/0+$/, "") : "";
  const tanda = r.p < 0n && dibulatkan !== 0n ? "-" : "";
  return `${tanda}${ribuan(bulat)}` + (teksSisa ? `,${teksSisa}` : "");
}

export function formatRupiah(nilai) {
  const teks = formatAngka(nilai, 0);
  return teks.startsWith("-") ? `-Rp${teks.slice(1)}` : `Rp${teks}`;
}

export function formatPersen(nilai, desimal = 2) {
  return `${formatAngka(nilai, desimal)}%`;
}

// ---------- Pemeriksa jawaban ----------
const hasil = (status, kode, pesan) => ({ status, benar: status === "benar", kode, pesan });

export function periksa(soal, jawaban) {
  if (soal.tipe === "pilihan") {
    const idPilihan = soal.pilihan.map((p) => p.id);
    if (typeof jawaban !== "string" || !idPilihan.includes(jawaban)) {
      return hasil("tidak_valid", "pilihan_kosong", PESAN.pilihan_kosong);
    }
    if (jawaban === soal.kunci) return hasil("benar", "benar", PESAN.benar);
    for (const k of soal.kesalahan_umum || []) {
      if (jawaban === k.nilai) return hasil("salah", k.kode, k.pesan);
    }
    return hasil("salah", "salah", PESAN.salah);
  }

  let nilai;
  try {
    nilai = parse(jawaban);
  } catch (galat) {
    if (galat instanceof GalatParse) return hasil("tidak_valid", galat.kode, galat.pesan);
    throw galat;
  }
  const toleransi = parse(soal.toleransi ?? "0");
  const dekat = (target) => banding(mutlak(kurang(nilai, parse(target))), toleransi) <= 0;
  if (dekat(soal.kunci)) return hasil("benar", "benar", PESAN.benar);
  for (const k of soal.kesalahan_umum || []) {
    if (dekat(k.nilai)) return hasil("salah", k.kode, k.pesan);
  }
  if (soal.satuan === "persen" && banding(nilai, pecahan(100n)) > 0) {
    return hasil("salah", "persen_tak_wajar", PESAN.persen_tak_wajar);
  }
  return hasil("salah", "salah", PESAN.salah);
}
