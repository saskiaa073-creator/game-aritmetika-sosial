"""Menyalin mesin JavaScript dan konten ke supabase/functions/_shared/.

Edge Function memakai file mesin.js dan logika.js yang SAMA PERSIS dengan versi peramban
(apps/web/js/local/). Jalankan setiap kali mesin, logika, atau konten berubah:
    .\\.venv\\Scripts\\python.exe -m tools.siapkan_supabase
tests/test_supabase.py gagal bila salinan di _shared/ sudah usang.
"""

from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path

AKAR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(AKAR))

from apps.api.konten import Konten  # noqa: E402

BERKAS_MESIN = ("mesin.js", "logika.js")


def siapkan(tujuan: Path | None = None) -> Path:
    tujuan = Path(tujuan) if tujuan else AKAR / "supabase" / "functions" / "_shared"
    tujuan.mkdir(parents=True, exist_ok=True)
    for nama in BERKAS_MESIN:
        shutil.copyfile(AKAR / "apps" / "web" / "js" / "local" / nama, tujuan / nama)
    konten = Konten(AKAR / "content")
    data = {"modul": list(konten.modul.values()), "glosarium": konten.glosarium}
    (tujuan / "konten.json").write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    return tujuan


if __name__ == "__main__":
    hasil = siapkan()
    print(f"Mesin dan konten disalin ke {hasil.relative_to(AKAR)}/")
