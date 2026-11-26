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
    # Asisten Belajar AI. Kunci HANYA dari .env, tidak pernah ditulis di kode.
    ai_provider: str = "gemini"  # gemini | deepseek
    ai_api_key: str = field(default="", repr=False)  # repr=False: kunci tidak ikut tercetak di log
    ai_model: str = ""
    ai_base_url: str = ""
    ai_kuota_harian: int = 20
    ai_reasoning_effort: str = ""

    @property
    def ai_aktif(self) -> bool:
        return bool(self.ai_api_key and self.ai_model and self.ai_url)

    @property
    def ai_url(self) -> str:
        bawaan = {
            "gemini": "https://generativelanguage.googleapis.com/v1beta/openai",
            "deepseek": "https://api.deepseek.com",
        }
        return (self.ai_base_url or bawaan.get(self.ai_provider, "")).rstrip("/")


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
        ai_provider=(os.getenv("AI_PROVIDER", "").strip().lower() or "gemini"),
        ai_api_key=os.getenv("AI_API_KEY", "").strip(),
        ai_model=os.getenv("AI_MODEL", "").strip() or ("deepseek-chat" if os.getenv("AI_PROVIDER", "").strip().lower() == "deepseek" else ""),
        ai_base_url=os.getenv("AI_BASE_URL", "").strip(),
        ai_kuota_harian=int(os.getenv("AI_KUOTA_HARIAN", "20")),
        ai_reasoning_effort=os.getenv("AI_REASONING_EFFORT", "").strip(),
    )
