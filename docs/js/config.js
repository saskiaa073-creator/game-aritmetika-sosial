// Alamat server API. Kosong = server yang sama dengan halaman ini (mode lokal start.bat).
// Nanti untuk Netlify/Supabase, isi dengan alamat server, misalnya "https://contoh.supabase.co/functions/v1".
export const API_BASE = "https://kknwhjrwmjlaeldlcurz.supabase.co/functions/v1/api";

// "server" = memakai backend FastAPI (start.bat). "statis" = versi GitHub Pages tanpa server:
// data di perangkat. Nilai ini diganti otomatis oleh tools/bangun_statis.py saat membuat folder docs/.
export const MODE = "server";
