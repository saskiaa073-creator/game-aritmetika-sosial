"""Tabel database (SQLAlchemy). SQLite bawaan; PostgreSQL lewat DATABASE_URL.

PRIVASI ANAK: tabel pengguna TIDAK menyimpan e-mail, nomor HP, tanggal lahir,
atau nama lengkap. Hanya nama pengguna (untuk login) dan nama panggilan.
Diuji oleh tests/test_privasi.py.
"""

from __future__ import annotations

from datetime import date, datetime
from pathlib import Path

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker


class Dasar(DeclarativeBase):
    pass


class Kelas(Dasar):
    __tablename__ = "kelas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nama: Mapped[str] = mapped_column(String(40))
    kode: Mapped[str] = mapped_column(String(6), unique=True, index=True)
    guru_id: Mapped[int] = mapped_column(ForeignKey("pengguna.id"))
    dibuat: Mapped[datetime] = mapped_column(DateTime)


class Pengguna(Dasar):
    __tablename__ = "pengguna"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    username: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    nama_panggilan: Mapped[str] = mapped_column(String(15))
    password_hash: Mapped[str] = mapped_column(String(200))
    peran: Mapped[str] = mapped_column(String(10), default="siswa")  # siswa | guru
    kelas_id: Mapped[int | None] = mapped_column(ForeignKey("kelas.id"), nullable=True)
    dibuat: Mapped[datetime] = mapped_column(DateTime)


class Jawaban(Dasar):
    __tablename__ = "jawaban"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    pengguna_id: Mapped[int] = mapped_column(ForeignKey("pengguna.id"), index=True)
    modul_id: Mapped[str] = mapped_column(String(20))
    soal_id: Mapped[str] = mapped_column(String(40), index=True)
    jawaban: Mapped[str] = mapped_column(String(40))
    status: Mapped[str] = mapped_column(String(12))  # benar | salah | tidak_valid
    kode_kesalahan: Mapped[str] = mapped_column(String(40))
    petunjuk_dipakai: Mapped[int] = mapped_column(Integer, default=0)
    poin: Mapped[int] = mapped_column(Integer, default=0)
    waktu: Mapped[datetime] = mapped_column(DateTime)  # UTC
    tanggal: Mapped[date] = mapped_column(Date, index=True)  # tanggal WIB


class PesanAsisten(Dasar):
    """Percakapan Asisten Belajar. Hanya isi pesan; identitas siswa tidak pernah dikirim ke AI."""

    __tablename__ = "pesan_asisten"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    pengguna_id: Mapped[int] = mapped_column(ForeignKey("pengguna.id"), index=True)
    soal_id: Mapped[str] = mapped_column(String(40), index=True)
    peran: Mapped[str] = mapped_column(String(10))  # siswa | asisten
    isi: Mapped[str] = mapped_column(String(800))
    status_cek: Mapped[str] = mapped_column(String(12), default="")  # hasil mesin untuk pesan siswa
    minta_bantuan: Mapped[int] = mapped_column(Integer, default=0)
    sumber: Mapped[str] = mapped_column(String(10), default="")  # ai | bawaan (untuk pesan asisten)
    waktu: Mapped[datetime] = mapped_column(DateTime)
    tanggal: Mapped[date] = mapped_column(Date, index=True)


def buat_engine(database_url: str) -> Engine:
    if database_url.startswith("sqlite:///"):
        Path(database_url.removeprefix("sqlite:///")).parent.mkdir(parents=True, exist_ok=True)
        return create_engine(database_url, connect_args={"check_same_thread": False})
    return create_engine(database_url, pool_pre_ping=True)


def siapkan_database(database_url: str) -> sessionmaker:
    engine = buat_engine(database_url)
    Dasar.metadata.create_all(engine)
    return sessionmaker(bind=engine, expire_on_commit=False)
