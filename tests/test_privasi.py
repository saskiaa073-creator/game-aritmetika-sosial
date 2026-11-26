"""Aturan wajib 2 dan 6: kunci jawaban tidak bocor, data anak minimal."""

import json
import re
from pathlib import Path

from apps.api.auth import cocokkan_kata_sandi, hash_kata_sandi
from apps.api.db import Pengguna
from apps.api.konten import RAHASIA, Konten, modul_publik

AKAR = Path(__file__).resolve().parents[1]
TERLARANG = ("email", "surel", "hp", "telepon", "phone", "lahir", "nama_lengkap", "alamat", "foto", "nisn", "nik")


def test_tabel_pengguna_tanpa_data_pribadi():
    kolom = [c.name for c in Pengguna.__table__.columns]
    for k in kolom:
        assert not any(t in k.lower().split("_") or t == k.lower() for t in TERLARANG), k
    assert set(kolom) == {"id", "username", "nama_panggilan", "password_hash", "peran", "kelas_id", "dibuat"}


def _semua_kunci(obj):
    if isinstance(obj, dict):
        for k, v in obj.items():
            yield k
            yield from _semua_kunci(v)
    elif isinstance(obj, list):
        for v in obj:
            yield from _semua_kunci(v)


def test_modul_publik_tanpa_kolom_rahasia():
    konten = Konten(AKAR / "content")
    for m in konten.modul.values():
        publik = modul_publik(m)
        assert not set(RAHASIA) & set(_semua_kunci(publik)), m["id"]
        teks = json.dumps(publik, ensure_ascii=False)
        for s in m["soal"]:
            assert s["pembahasan"] not in teks
        assert m["soal"][0].get("kunci") is not None  # konten asli tidak ikut berubah


def test_hash_kata_sandi():
    h = hash_kata_sandi("rahasia1", 1000)
    assert h.startswith("pbkdf2_sha256$1000$") and "rahasia1" not in h
    assert cocokkan_kata_sandi("rahasia1", h)
    assert not cocokkan_kata_sandi("rahasia2", h)
    assert not cocokkan_kata_sandi("rahasia1", "rusak")


def test_tidak_ada_kunci_api_di_frontend():
    pola = re.compile(r"(AIza[0-9A-Za-z_\-]{20,}|sk-[0-9A-Za-z]{20,}|SECRET_KEY\s*=)")
    for path in (AKAR / "apps" / "web").rglob("*"):
        if path.suffix in {".js", ".html", ".json", ".webmanifest", ".css"}:
            assert not pola.search(path.read_text(encoding="utf-8")), path


def test_env_diabaikan_git():
    abaikan = (AKAR / ".gitignore").read_text(encoding="utf-8").splitlines()
    assert ".env" in abaikan and "data/" in abaikan
