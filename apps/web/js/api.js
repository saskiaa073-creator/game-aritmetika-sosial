// Pemanggil API backend. Token login disimpan di perangkat (localStorage).
import { API_BASE } from "./config.js";

const KUNCI = "pasar_pintar_sesi";

function baca() {
  try {
    return JSON.parse(localStorage.getItem(KUNCI) || "null");
  } catch {
    return null;
  }
}

export const sesi = {
  get data() {
    return baca();
  },
  get token() {
    return baca()?.token || null;
  },
  get peran() {
    return baca()?.peran || null;
  },
  simpan(data) {
    try {
      localStorage.setItem(KUNCI, JSON.stringify(data));
    } catch {
      /* penyimpanan diblokir: sesi hanya bertahan selama halaman terbuka */
    }
  },
  keluar() {
    try {
      localStorage.removeItem(KUNCI);
    } catch {
      /* abaikan */
    }
  },
};

function pesanDari(isi, status) {
  if (typeof isi?.detail === "string") return isi.detail;
  if (Array.isArray(isi?.detail)) {
    return "Periksa lagi isianmu: nama pengguna minimal 3 karakter dan kata sandi minimal 6 karakter.";
  }
  if (status >= 500) return "Server sedang bermasalah. Coba lagi sebentar.";
  return "Terjadi kesalahan. Coba lagi.";
}

export async function api(jalur, { method = "GET", body } = {}) {
  const header = { Accept: "application/json" };
  if (body !== undefined) header["Content-Type"] = "application/json";
  if (sesi.token) header.Authorization = `Bearer ${sesi.token}`;
  let respons;
  try {
    respons = await fetch(`${API_BASE}/api${jalur}`, {
      method,
      headers: header,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new Error("Tidak terhubung ke server. Periksa internet atau pastikan server menyala.");
  }
  if (respons.status === 401 && sesi.token) {
    sesi.keluar();
    location.hash = "#/masuk";
  }
  const isi = await respons.json().catch(() => null);
  if (!respons.ok) throw new Error(pesanDari(isi, respons.status));
  return isi;
}

/** Mengunduh berkas (mis. CSV) yang butuh token login. */
export async function unduh(jalur, namaBerkas) {
  const respons = await fetch(`${API_BASE}/api${jalur}`, { headers: { Authorization: `Bearer ${sesi.token}` } });
  if (!respons.ok) throw new Error("Gagal mengunduh berkas.");
  const url = URL.createObjectURL(await respons.blob());
  const a = document.createElement("a");
  a.href = url;
  a.download = namaBerkas;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
