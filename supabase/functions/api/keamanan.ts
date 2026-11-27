// Kata sandi (PBKDF2-SHA256) dan token login (JWT HS256) memakai WebCrypto bawaan Deno.
// Format hash SAMA dengan apps/api/auth.py: "pbkdf2_sha256$<iterasi>$<garam b64>$<hash b64>",
// jadi akun bisa dipindah antar versi Python dan Supabase.

const enc = new TextEncoder();
const keB64 = (b: Uint8Array) => btoa(String.fromCharCode(...b));
const dariB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const keB64Url = (b: Uint8Array) => keB64(b).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const dariB64Url = (s: string) => dariB64(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4));

// 310.000 iterasi: aman (rekomendasi OWASP untuk PBKDF2-SHA256 dua tahun lalu) dan tetap
// di bawah batas waktu CPU Edge Function. Hash lama dengan iterasi berbeda tetap terbaca.
export const ITERASI_BAWAAN = 310_000;

async function turunkan(sandi: string, garam: Uint8Array, iterasi: number): Promise<Uint8Array> {
  const kunci = await crypto.subtle.importKey("raw", enc.encode(sandi), "PBKDF2", false, ["deriveBits"]);
  const salt = garam as Uint8Array<ArrayBuffer>;
  const bit = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: iterasi }, kunci, 256);
  return new Uint8Array(bit);
}

export async function hashKataSandi(sandi: string, iterasi = ITERASI_BAWAAN): Promise<string> {
  const garam = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2_sha256$${iterasi}$${keB64(garam)}$${keB64(await turunkan(sandi, garam, iterasi))}`;
}

function samaWaktuTetap(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let beda = 0;
  for (let i = 0; i < a.length; i++) beda |= a[i] ^ b[i];
  return beda === 0;
}

export async function cocokkanKataSandi(sandi: string, tersimpan: string): Promise<boolean> {
  const bagian = tersimpan.split("$");
  if (bagian.length !== 4 || bagian[0] !== "pbkdf2_sha256") return false;
  const iterasi = Number(bagian[1]);
  if (!Number.isInteger(iterasi) || iterasi < 1) return false;
  try {
    return samaWaktuTetap(await turunkan(sandi, dariB64(bagian[2]), iterasi), dariB64(bagian[3]));
  } catch {
    return false;
  }
}

async function kunciHmac(rahasia: string) {
  return crypto.subtle.importKey("raw", enc.encode(rahasia), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export async function buatToken(penggunaId: number, peran: string, rahasia: string, jam: number, sekarangDetik: number): Promise<string> {
  const kepala = keB64Url(enc.encode(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const muatan = keB64Url(enc.encode(JSON.stringify({ sub: String(penggunaId), peran, iat: sekarangDetik, exp: sekarangDetik + jam * 3600 })));
  const tanda = await crypto.subtle.sign("HMAC", await kunciHmac(rahasia), enc.encode(`${kepala}.${muatan}`));
  return `${kepala}.${muatan}.${keB64Url(new Uint8Array(tanda))}`;
}

/** Mengembalikan id pengguna, atau null bila token tidak sah atau kedaluwarsa. */
export async function bacaToken(token: string, rahasia: string, sekarangDetik: number): Promise<number | null> {
  const bagian = token.split(".");
  if (bagian.length !== 3) return null;
  try {
    const kepala = JSON.parse(new TextDecoder().decode(dariB64Url(bagian[0])));
    if (kepala.alg !== "HS256") return null;
    const sah = await crypto.subtle.verify("HMAC", await kunciHmac(rahasia), dariB64Url(bagian[2]), enc.encode(`${bagian[0]}.${bagian[1]}`));
    if (!sah) return null;
    const muatan = JSON.parse(new TextDecoder().decode(dariB64Url(bagian[1])));
    if (typeof muatan.exp !== "number" || muatan.exp < sekarangDetik) return null;
    const id = Number(muatan.sub);
    return Number.isInteger(id) ? id : null;
  } catch {
    return null;
  }
}
