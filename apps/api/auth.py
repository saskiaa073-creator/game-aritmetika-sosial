"""Login: kata sandi di-hash PBKDF2-SHA256, sesi memakai token JWT."""

from __future__ import annotations

import base64
import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone

import jwt


def hash_kata_sandi(sandi: str, iterasi: int) -> str:
    garam = secrets.token_bytes(16)
    turunan = hashlib.pbkdf2_hmac("sha256", sandi.encode("utf-8"), garam, iterasi)
    b64 = lambda b: base64.b64encode(b).decode("ascii")  # noqa: E731
    return f"pbkdf2_sha256${iterasi}${b64(garam)}${b64(turunan)}"


def cocokkan_kata_sandi(sandi: str, tersimpan: str) -> bool:
    try:
        algoritma, iterasi, garam, turunan = tersimpan.split("$")
    except ValueError:
        return False
    if algoritma != "pbkdf2_sha256":
        return False
    hitung = hashlib.pbkdf2_hmac("sha256", sandi.encode("utf-8"), base64.b64decode(garam), int(iterasi))
    return hmac.compare_digest(hitung, base64.b64decode(turunan))


def buat_token(pengguna_id: int, peran: str, kunci: str, jam: int) -> str:
    sekarang = datetime.now(timezone.utc)
    muatan = {"sub": str(pengguna_id), "peran": peran, "iat": sekarang, "exp": sekarang + timedelta(hours=jam)}
    return jwt.encode(muatan, kunci, algorithm="HS256")


def baca_token(token: str, kunci: str) -> int | None:
    """Mengembalikan id pengguna, atau None bila token tidak sah/kedaluwarsa."""
    try:
        muatan = jwt.decode(token, kunci, algorithms=["HS256"])
        return int(muatan["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        return None
