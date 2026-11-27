"""Tahap 6: Supabase (PostgreSQL + RLS, Edge Function TypeScript).

- Edge Function memakai mesin.js/logika.js yang SAMA dengan peramban (salinan di _shared harus terbaru).
- Semua tabel ber-RLS tanpa kebijakan publik; tidak ada kolom data pribadi anak.
- Tidak ada kunci/rahasia tertulis di kode; semuanya dari Supabase Secrets.
- Tes Deno untuk Edge Function (supabase/functions/api/inti_test.ts) ikut dijalankan.
"""

import os
import re
import shutil
import subprocess
from pathlib import Path

import pytest

from apps.api.auth import hash_kata_sandi
from tools.siapkan_supabase import BERKAS_MESIN, siapkan

AKAR = Path(__file__).resolve().parents[1]
SUPA = AKAR / "supabase"
MIGRASI = sorted((SUPA / "migrations").glob("*.sql"))
SQL = "\n".join(p.read_text(encoding="utf-8") for p in MIGRASI)
FUNGSI = SUPA / "functions" / "api"


def test_salinan_mesin_dan_konten_terbaru(tmp_path):
    baru = siapkan(tmp_path / "_shared")
    lama = SUPA / "functions" / "_shared"
    for nama in (*BERKAS_MESIN, "konten.json"):
        assert (lama / nama).read_bytes().replace(b"\r\n", b"\n") == (baru / nama).read_bytes().replace(b"\r\n", b"\n"), \
            f"_shared/{nama} usang: jalankan  python -m tools.siapkan_supabase"


def test_fungsi_mengimpor_mesin_yang_sama():
    inti = (FUNGSI / "inti.ts").read_text(encoding="utf-8")
    assert 'from "../_shared/mesin.js"' in inti and 'from "../_shared/logika.js"' in inti
    assert "periksa(" in inti  # benar/salah oleh mesin, bukan AI


def test_semua_tabel_ber_rls_tanpa_kebijakan_publik():
    tabel = re.findall(r"create table public\.(\w+)", SQL)
    assert set(tabel) == {"pengguna", "kelas", "jawaban", "pesan_asisten"}
    for t in tabel:
        assert f"alter table public.{t} enable row level security;" in SQL, f"{t} belum RLS"
    assert "create policy" not in SQL.lower(), "tidak boleh ada kebijakan akses langsung dari peramban"
    assert re.search(r"revoke all on public\.pengguna, public\.kelas, public\.jawaban, public\.pesan_asisten, public\.v_peringkat\s+from anon, authenticated", SQL)
    assert "security_invoker = true" in SQL


def test_tidak_ada_kolom_data_pribadi():
    kolom = re.findall(r"^\s+([a-z_]+)\s+(?:varchar|bigint|smallint|timestamptz|date|int)", SQL, flags=re.M)
    terlarang = ("email", "hp", "telepon", "phone", "lahir", "nama_lengkap", "alamat", "foto", "nisn", "nik")
    for k in kolom:
        assert not any(t in k.split("_") or t == k for t in terlarang), k


def test_verify_jwt_dimatikan_untuk_fungsi_api():
    cfg = (SUPA / "config.toml").read_text(encoding="utf-8")
    assert re.search(r"\[functions\.api\]\s+verify_jwt = false", cfg)


def test_tidak_ada_rahasia_di_kode():
    pola = re.compile(r"(AIza[0-9A-Za-z_\-]{20,}|sk-[0-9A-Za-z]{20,}|sbp_[0-9a-f]{20,}|eyJhbGciOi[0-9A-Za-z_\-]{20,})")
    for p in list(SUPA.rglob("*.ts")) + list(SUPA.rglob("*.sql")) + list(SUPA.rglob("*.toml")):
        assert not pola.search(p.read_text(encoding="utf-8")), p
    indeks = (FUNGSI / "index.ts").read_text(encoding="utf-8")
    assert 'env("APP_SECRET")' in indeks and "SUPABASE_SERVICE_ROLE_KEY" in indeks


def test_akun_demo_memakai_hash_pbkdf2():
    for hash_ in re.findall(r"'(pbkdf2_sha256\$[^']+)'", SQL):
        assert hash_.startswith("pbkdf2_sha256$310000$")
    assert "guru12345" not in SQL.split("--")[0]  # kata sandi tidak disimpan polos


@pytest.mark.skipif(shutil.which("npx") is None, reason="Node.js/npx belum terpasang")
def test_tes_deno_edge_function_lolos():
    lingkungan = {**os.environ, "HASH_PYTHON_UJI": hash_kata_sandi("rahasia1", 1000), "NO_COLOR": "1"}
    perintah = ["npx", "--yes", "deno@2.9.6", "test", "--allow-env", "--no-prompt",
                "--config", str(FUNGSI / "deno.json"), str(FUNGSI / "inti_test.ts")]
    hasil = subprocess.run(perintah, cwd=AKAR, env=lingkungan, capture_output=True, text=True, encoding="utf-8",
                           timeout=600, shell=os.name == "nt")
    keluaran = hasil.stdout + hasil.stderr
    assert hasil.returncode == 0, keluaran[-3000:]
    assert re.search(r"ok \| \d+ passed \| 0 failed", keluaran), keluaran[-1500:]


def test_izin_hanya_untuk_service_role():
    """Edge Function (service_role) perlu izin tabel; peran publik tidak boleh diberi izin."""
    assert re.search(r"grant select, insert, update, delete on public\.pengguna, public\.kelas, public\.jawaban, "
                     r"public\.pesan_asisten to service_role;", SQL)
    assert "grant usage, select on all sequences in schema public to service_role;" in SQL
    for baris in SQL.lower().splitlines():
        if baris.strip().startswith("grant"):
            assert "anon" not in baris and "authenticated" not in baris, baris
