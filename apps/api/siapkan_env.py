"""Membuat .env dari .env.example dan mengisi SECRET_KEY acak bila masih kosong.

Dipanggil otomatis oleh start.bat:  python -m apps.api.siapkan_env
"""

import re
import secrets
import shutil

from .config import AKAR


def main() -> None:
    env = AKAR / ".env"
    if not env.exists():
        shutil.copy(AKAR / ".env.example", env)
        print("File .env dibuat dari .env.example.")
    teks = env.read_text(encoding="utf-8")
    if re.search(r"^SECRET_KEY=\s*$", teks, flags=re.M):
        teks = re.sub(r"^SECRET_KEY=\s*$", f"SECRET_KEY={secrets.token_urlsafe(48)}", teks, count=1, flags=re.M)
        env.write_text(teks, encoding="utf-8")
        print("SECRET_KEY acak sudah diisi di .env.")


if __name__ == "__main__":
    main()
