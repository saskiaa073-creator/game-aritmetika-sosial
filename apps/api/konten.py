"""Pemuat konten JSON dan penyaring kolom rahasia.

Kolom di RAHASIA tidak boleh terkirim ke peramban sebelum siswa menjawab.
"""

from __future__ import annotations

import copy
import json
from pathlib import Path
from typing import Any

RAHASIA = ("kunci", "toleransi", "pembahasan", "kesalahan_umum")


def _baca(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


class Konten:
    def __init__(self, folder: Path):
        self.folder = folder
        self.kode_wawancara: dict[str, str] = _baca(folder / "kode_wawancara.json")["kode"]
        self.kurikulum: dict[str, Any] = _baca(folder / "kurikulum.json")
        self.glosarium: list[dict[str, str]] = _baca(folder / "glosarium.json")["istilah"]
        modul = [_baca(p) for p in sorted(folder.glob("m[0-9]*.json"))]
        self.modul: dict[str, dict[str, Any]] = {m["id"]: m for m in sorted(modul, key=lambda m: m["urutan"])}
        self.soal: dict[str, tuple[str, dict[str, Any]]] = {}
        for m in self.modul.values():
            for s in m["soal"]:
                self.soal[s["id"]] = (m["id"], s)


def soal_publik(soal: dict[str, Any]) -> dict[str, Any]:
    return {k: copy.deepcopy(v) for k, v in soal.items() if k not in RAHASIA}


def modul_publik(modul: dict[str, Any]) -> dict[str, Any]:
    hasil = {k: copy.deepcopy(v) for k, v in modul.items() if k != "soal"}
    hasil["soal"] = [soal_publik(s) for s in modul["soal"]]
    return hasil
