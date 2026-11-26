"""Parser angka dan ekspresi format Indonesia yang aman.

ATURAN: dilarang memakai eval/exec/sympify. Masukan dibaca karakter demi
karakter dengan daftar karakter yang diizinkan, lalu dihitung dengan parser
rekursif sederhana. Hasilnya bilangan rasional pasti (sympy.Rational).

Padanan JavaScript: apps/web/js/local/mesin.js. Setiap perubahan di sini
WAJIB diterapkan juga di sana (diuji oleh tests/test_kesamaan_mesin.py).

Format yang diterima:
  25000, 25.000, Rp25.000, Rp 25.000   -> titik = pemisah ribuan
  12,5, 12,5%                          -> koma = desimal, % di akhir diabaikan
  5.000/20.000 x 100                   -> operasi + - x × * : / dan kurung
"""

from __future__ import annotations

import re

from sympy import Integer, Rational

MAKS_PANJANG = 40
KARAKTER_DIIZINKAN = frozenset("0123456789.,+-*/x×:() %rp")

PESAN_GALAT = {
    "kosong": "Jawaban masih kosong.",
    "terlalu_panjang": "Jawaban terlalu panjang. Tulis angkanya saja.",
    "karakter": "Ada huruf atau simbol yang tidak dikenal. Tulis angka saja, misalnya 25.000 atau 12,5.",
    "titik_desimal": "Untuk desimal pakai koma, misalnya 12,5. Titik dipakai untuk ribuan, misalnya 25.000.",
    "format": "Penulisan angka belum tepat. Contoh: 25.000 atau 12,5.",
    "bagi_nol": "Tidak bisa dibagi dengan nol.",
}

_POLA_ANGKA = re.compile(r"\d+(?:\.\d+)*(?:,\d+)?")
_OPERATOR = {"+": "+", "-": "-", "*": "*", "x": "*", "×": "*", "/": "/", ":": "/", "(": "(", ")": ")"}


class GalatParse(ValueError):
    """Masukan tidak bisa dibaca sebagai angka."""

    def __init__(self, kode: str):
        self.kode = kode
        self.pesan = PESAN_GALAT[kode]
        super().__init__(self.pesan)


def _angka_ke_rasional(teks: str) -> Rational:
    if "," in teks:
        bulat, pecahan = teks.split(",")
    else:
        bulat, pecahan = teks, ""
    if "." in bulat:
        kelompok = bulat.split(".")
        if not (1 <= len(kelompok[0]) <= 3) or any(len(k) != 3 for k in kelompok[1:]):
            raise GalatParse("titik_desimal")
        bulat = "".join(kelompok)
    return Rational(int(bulat + pecahan), 10 ** len(pecahan))


def tokenisasi(masukan: str) -> list[tuple[str, object]]:
    """Mengubah teks menjadi daftar token ('angka', Rational) atau ('op', simbol)."""
    if not isinstance(masukan, str):
        raise GalatParse("format")
    # Hanya spasi/tab/baris baru yang dipangkas, agar sama persis dengan versi JS.
    teks = masukan.strip(" \t\n\r").lower()
    if not teks:
        raise GalatParse("kosong")
    if any(c not in KARAKTER_DIIZINKAN for c in teks):
        raise GalatParse("karakter")
    if len(teks) > MAKS_PANJANG:
        raise GalatParse("terlalu_panjang")
    teks = teks.replace("rp", " ")
    if "r" in teks or "p" in teks:
        raise GalatParse("karakter")
    teks = teks.strip()
    if teks.endswith("%"):
        teks = teks[:-1].rstrip()
    if "%" in teks:
        raise GalatParse("format")
    if not teks:
        raise GalatParse("kosong")

    token: list[tuple[str, object]] = []
    i = 0
    while i < len(teks):
        c = teks[i]
        if c == " ":
            i += 1
            continue
        if c.isdigit():
            cocok = _POLA_ANGKA.match(teks, i)
            assert cocok is not None
            token.append(("angka", _angka_ke_rasional(cocok.group())))
            i = cocok.end()
            continue
        if c in _OPERATOR:
            token.append(("op", _OPERATOR[c]))
            i += 1
            continue
        raise GalatParse("format")  # titik atau koma yang berdiri sendiri
    return token


class _Parser:
    def __init__(self, token: list[tuple[str, object]]):
        self.token = token
        self.posisi = 0

    def _lihat(self):
        return self.token[self.posisi] if self.posisi < len(self.token) else None

    def _ambil_op(self, *simbol: str) -> str | None:
        t = self._lihat()
        if t is not None and t[0] == "op" and t[1] in simbol:
            self.posisi += 1
            return t[1]  # type: ignore[return-value]
        return None

    def ekspresi(self) -> Rational:
        nilai = self.suku()
        while (op := self._ambil_op("+", "-")) is not None:
            kanan = self.suku()
            nilai = nilai + kanan if op == "+" else nilai - kanan
        return nilai

    def suku(self) -> Rational:
        nilai = self.faktor()
        while (op := self._ambil_op("*", "/")) is not None:
            kanan = self.faktor()
            if op == "*":
                nilai = nilai * kanan
            else:
                if kanan == 0:
                    raise GalatParse("bagi_nol")
                nilai = nilai / kanan
        return nilai

    def faktor(self) -> Rational:
        if self._ambil_op("-") is not None:
            return -self.faktor()
        if self._ambil_op("+") is not None:
            return self.faktor()
        if self._ambil_op("(") is not None:
            nilai = self.ekspresi()
            if self._ambil_op(")") is None:
                raise GalatParse("format")
            return nilai
        t = self._lihat()
        if t is None or t[0] != "angka":
            raise GalatParse("format")
        self.posisi += 1
        return t[1]  # type: ignore[return-value]


def parse(masukan: str) -> Rational:
    """Membaca teks jawaban menjadi bilangan rasional. Melempar GalatParse bila tidak valid."""
    p = _Parser(tokenisasi(masukan))
    nilai = p.ekspresi()
    if p.posisi != len(p.token):
        raise GalatParse("format")
    return Rational(nilai)


def format_angka(nilai: Rational | int, desimal: int = 2) -> str:
    """Format Indonesia: titik ribuan, koma desimal; dibulatkan setengah menjauhi nol."""
    r = Rational(nilai)
    skala = Integer(10) ** desimal
    pembilang, penyebut = abs(r.p) * skala, r.q
    dibulatkan = (2 * pembilang + penyebut) // (2 * penyebut)
    bulat, sisa = divmod(int(dibulatkan), int(skala))
    teks_bulat = f"{bulat:,}".replace(",", ".")
    teks_sisa = str(sisa).rjust(desimal, "0").rstrip("0") if desimal else ""
    tanda = "-" if r < 0 and dibulatkan != 0 else ""
    return f"{tanda}{teks_bulat}" + (f",{teks_sisa}" if teks_sisa else "")


def format_rupiah(nilai: Rational | int) -> str:
    """Contoh: 25000 -> 'Rp25.000'."""
    teks = format_angka(nilai, 0)
    return f"-Rp{teks[1:]}" if teks.startswith("-") else f"Rp{teks}"


def format_persen(nilai: Rational | int, desimal: int = 2) -> str:
    """Contoh: 12.5 -> '12,5%'."""
    return f"{format_angka(nilai, desimal)}%"
