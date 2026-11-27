"""Membuat versi statis Pasar Pintar untuk GitHub Pages di folder docs/.

Jalankan dari folder utama proyek setiap kali tampilan atau konten berubah:
    .\\.venv\\Scripts\\python.exe -m tools.bangun_statis

Isi docs/:
- salinan apps/web (tampilan PWA), dengan MODE = "statis" di js/config.js
- data/konten.json: semua modul + glosarium (termasuk kunci, karena tidak ada server)
- .nojekyll agar GitHub Pages menyajikan semua file apa adanya
"""

from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path

AKAR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(AKAR))

from apps.api.konten import Konten  # noqa: E402

MODE_SERVER = 'export const MODE = "server";'
MODE_STATIS = 'export const MODE = "statis";'


def bangun(tujuan: Path | None = None) -> Path:
    tujuan = Path(tujuan) if tujuan else AKAR / "docs"
    if tujuan.resolve() == AKAR.resolve() or AKAR.resolve() in tujuan.resolve().parents and tujuan.name != "docs":
        raise ValueError("Tujuan di dalam proyek harus bernama docs/ (pengaman agar tidak menghapus folder lain).")
    if tujuan.exists():
        shutil.rmtree(tujuan)
    shutil.copytree(AKAR / "apps" / "web", tujuan)

    konfigurasi = tujuan / "js" / "config.js"
    teks = konfigurasi.read_text(encoding="utf-8")
    if MODE_SERVER not in teks:
        raise RuntimeError("Baris MODE di js/config.js tidak ditemukan.")
    konfigurasi.write_text(teks.replace(MODE_SERVER, MODE_STATIS), encoding="utf-8")

    konten = Konten(AKAR / "content")
    (tujuan / "data").mkdir()
    data = {"modul": list(konten.modul.values()), "glosarium": konten.glosarium}
    (tujuan / "data" / "konten.json").write_text(
        json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

    sw = tujuan / "sw.js"
    teks = sw.read_text(encoding="utf-8")
    sw.write_text(teks.replace('  "./js/app.js",', '  "./data/konten.json",\n  "./js/app.js",', 1), encoding="utf-8")

    (tujuan / ".nojekyll").write_text("", encoding="utf-8")
    return tujuan


if __name__ == "__main__":
    hasil = bangun()
    jumlah = sum(1 for p in hasil.rglob("*") if p.is_file())
    print(f"Versi statis dibuat di {hasil.relative_to(AKAR)}/ ({jumlah} file).")
