"""Pengaturan aplikasi, dibaca dari berkas .env di folder utama proyek."""

from __future__ import annotations

import os
import secrets
import warnings
from dataclasses import dataclass, field
from pathlib import Path

from dotenv import load_dotenv

AKAR = Path(__file__).resolve().parents[2]


def _bool(nilai: str | None, bawaan: bool) -> bool:
    if nilai is None or nilai == "":
        return bawaan
    return nilai.strip().lower() in {"1", "ya", "true", "yes"}


@dataclass
class Pengaturan:
    database_url: str
    secret_key: str
    pbkdf2_iterasi: int = 600_000
    token_jam: int = 24 * 7
    sasaran_harian: int = 30
    allowed_origins: list[str] = field(default_factory=list)
    demo_seed: bool = False
    folder_konten: Path = AKAR / "content"
    folder_web: Path = AKAR / "apps" / "web"


def muat_pengaturan() -> Pengaturan:
    """Membaca pengaturan dari variabel lingkungan (.env)."""
    load_dotenv(AKAR / ".env")
    secret = os.getenv("SECRET_KEY", "").strip()
    if not secret:
        warnings.warn("SECRET_KEY kosong; memakai kunci acak sementara (semua login hilang saat server mati).")
        secret = secrets.token_urlsafe(48)
    asal = [a.strip() for a in os.getenv("ALLOWED_ORIGINS", "").split(",") if a.strip()]
    return Pengaturan(
        database_url=os.getenv("DATABASE_URL", "").strip() or f"sqlite:///{(AKAR / 'data' / 'pasar_pintar.db').as_posix()}",
        secret_key=secret,
        pbkdf2_iterasi=int(os.getenv("PBKDF2_ITERASI", "600000")),
        token_jam=int(os.getenv("TOKEN_JAM", str(24 * 7))),
        sasaran_harian=int(os.getenv("SASARAN_HARIAN", "30")),
        allowed_origins=asal,
        demo_seed=_bool(os.getenv("DEMO_SEED"), False),
    )
