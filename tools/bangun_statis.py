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
API_KOSONG = 'export const API_BASE = "";'


def api_base_situs() -> str:
    """Alamat Edge Function dari tools/situs.json ("" = versi statis)."""
    berkas = AKAR / "tools" / "situs.json"
    if not berkas.exists():
        return ""
    return json.loads(berkas.read_text(encoding="utf-8")).get("api_base", "").strip().rstrip("/")


def bangun(tujuan: Path | None = None, api_base: str | None = None) -> Path:
    """api_base kosong: versi statis (data di perangkat, kunci ikut terunduh).
    api_base terisi: versi online (Supabase); kunci jawaban TIDAK ikut ke perangkat."""
    api_base = api_base_situs() if api_base is None else api_base.strip().rstrip("/")
    tujuan = Path(tujuan) if tujuan else AKAR / "docs"
    if tujuan.resolve() == AKAR.resolve() or AKAR.resolve() in tujuan.resolve().parents and tujuan.name != "docs":
        raise ValueError("Tujuan di dalam proyek harus bernama docs/ (pengaman agar tidak menghapus folder lain).")
    if tujuan.exists():
        shutil.rmtree(tujuan)
    shutil.copytree(AKAR / "apps" / "web", tujuan)

    konfigurasi = tujuan / "js" / "config.js"
    teks = konfigurasi.read_text(encoding="utf-8")
    if MODE_SERVER not in teks or API_KOSONG not in teks:
        raise RuntimeError("Baris MODE/API_BASE di js/config.js tidak ditemukan.")
    if api_base:
        if not api_base.startswith("https://"):
            raise ValueError("api_base harus diawali https://")
        konfigurasi.write_text(teks.replace(API_KOSONG, f'export const API_BASE = "{api_base}";'), encoding="utf-8")
    else:
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
    alamat = api_base_situs()
    hasil = bangun()
    jumlah = sum(1 for p in hasil.rglob("*") if p.is_file())
    jenis = f"online (Supabase: {alamat})" if alamat else "statis (data di perangkat)"
    print(f"Versi {jenis} dibuat di {hasil.relative_to(AKAR)}/ ({jumlah} file).")
