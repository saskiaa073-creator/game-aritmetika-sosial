import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from apps.api.config import AKAR, Pengaturan
from apps.api.main import create_app

FOLDER_TES = Path(__file__).parent


@pytest.fixture(scope="session")
def kasus_mesin():
    return json.loads((FOLDER_TES / "fixtures" / "kasus_mesin.json").read_text(encoding="utf-8"))


@pytest.fixture
def klien(tmp_path):
    pengaturan = Pengaturan(
        database_url=f"sqlite:///{(tmp_path / 'uji.db').as_posix()}",
        secret_key="kunci-rahasia-khusus-tes-yang-cukup-panjang-123",
        pbkdf2_iterasi=1_000,  # dipercepat khusus tes
        demo_seed=True,
    )
    with TestClient(create_app(pengaturan)) as c:
        yield c


def masuk(klien, username, password):
    r = klien.post("/api/auth/masuk", json={"username": username, "password": password})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


def daftar(klien, username="rina07", panggilan="Rina", password="rahasia1", kode_kelas=None):
    data = {"username": username, "nama_panggilan": panggilan, "password": password}
    if kode_kelas:
        data["kode_kelas"] = kode_kelas
    r = klien.post("/api/auth/daftar", json=data)
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


__all__ = ["AKAR", "masuk", "daftar"]
