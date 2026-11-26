"""Memeriksa pengaturan Asisten Belajar AI tanpa pernah menampilkan kunci.

Jalankan dari folder utama proyek:
    .\\.venv\\Scripts\\python.exe -m apps.api.cek_ai

Yang dilakukan:
1. Memastikan AI_API_KEY terbaca dari .env (hanya panjangnya yang ditampilkan).
2. Menampilkan daftar model yang tersedia untuk kuncimu (untuk mengisi AI_MODEL).
3. Bila AI_MODEL sudah diisi, mencoba satu pesan pendek.
"""

import sys

import httpx

from .config import muat_pengaturan


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8")
    p = muat_pengaturan()
    print(f"Penyedia AI : {p.ai_provider}")
    print(f"Alamat      : {p.ai_url or '(tidak dikenal, isi AI_BASE_URL)'}")
    if not p.ai_api_key:
        print("\n✖ AI_API_KEY belum diisi di file .env.")
        print("  Buka file .env, lalu isi baris  AI_API_KEY=  dengan kuncimu (tanpa spasi, tanpa tanda kutip).")
        return 1
    print(f"Kunci       : ✔ terbaca ({len(p.ai_api_key)} karakter, isinya tidak ditampilkan)")

    kepala = {"Authorization": f"Bearer {p.ai_api_key}"}
    try:
        r = httpx.get(f"{p.ai_url}/models", headers=kepala, timeout=30)
    except httpx.HTTPError as e:
        print(f"\n✖ Tidak bisa menghubungi layanan AI ({type(e).__name__}). Periksa internet.")
        return 1
    if r.status_code in (401, 403):
        print(f"\n✖ Kunci ditolak (HTTP {r.status_code}). Buat kunci baru, lalu ganti isi AI_API_KEY di .env.")
        return 1
    if r.is_success:
        model = sorted(m.get("id", "").removeprefix("models/") for m in r.json().get("data", []))
        cocok = [m for m in model if "flash" in m or "chat" in m] or model
        print("\nModel yang bisa dipakai (pilih satu untuk AI_MODEL, disarankan yang mengandung 'flash'):")
        for m in cocok[:30]:
            print(f"  - {m}")
    else:
        print(f"\n⚠ Daftar model tidak bisa diambil (HTTP {r.status_code}).")

    if not p.ai_model:
        print("\n⚠ AI_MODEL belum diisi. Salin salah satu nama model di atas ke baris  AI_MODEL=  di .env,")
        print("  lalu jalankan perintah ini lagi.")
        return 1
    print(f"\nMencoba model {p.ai_model} ...")
    badan = {"model": p.ai_model, "max_tokens": 2048,
             "messages": [{"role": "user", "content": "Balas dengan satu kata saja: siap"}]}
    if p.ai_reasoning_effort:
        badan["reasoning_effort"] = p.ai_reasoning_effort
    try:
        r = httpx.post(f"{p.ai_url}/chat/completions", json=badan, headers=kepala, timeout=60)
    except httpx.HTTPError as e:
        print(f"✖ Gagal: {type(e).__name__}")
        return 1
    if not r.is_success:
        print(f"✖ Gagal (HTTP {r.status_code}). Periksa nama model di AI_MODEL.")
        return 1
    isi = (r.json()["choices"][0]["message"].get("content") or "").strip()
    print(f"✔ Berhasil. Balasan AI: {isi[:80] or '(kosong)'}")
    print("\nAsisten Belajar siap. Nyalakan ulang aplikasi (start.bat) agar pengaturan baru terbaca.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
