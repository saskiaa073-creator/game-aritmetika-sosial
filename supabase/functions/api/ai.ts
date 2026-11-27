// Pengaturan dan pemanggil layanan AI (DeepSeek / Gemini, endpoint kompatibel OpenAI).
// Padanan apps/api/config.py (bagian AI) dan asisten.panggil_ai. Kunci HANYA dari Supabase Secrets.
import type { PemanggilAi } from "./inti.ts";

export interface PengaturanAi { provider: string; apiKey: string; model: string; url: string; reasoningEffort: string; aktif: boolean }

type BacaEnv = (nama: string) => string | undefined;

/** Nilai rapi: spasi dibuang, dan awalan "NAMA=" yang terketik dua kali ikut dibuang (sama dengan config.py). */
function nilai(env: BacaEnv, nama: string): string {
  let v = (env(nama) ?? "").trim();
  while (v.toUpperCase().startsWith(`${nama}=`)) v = v.slice(nama.length + 1).trim();
  return v;
}

export function pengaturanAiDariEnv(env: BacaEnv): PengaturanAi {
  const provider = nilai(env, "AI_PROVIDER").toLowerCase() || "gemini";
  const kunciBaku = ({ gemini: "GEMINI_API_KEY", deepseek: "DEEPSEEK_API_KEY" } as Record<string, string>)[provider] ?? "";
  const apiKey = nilai(env, "AI_API_KEY") || (kunciBaku ? nilai(env, kunciBaku) : "");
  const model = nilai(env, "AI_MODEL") || (provider === "deepseek" ? "deepseek-flash" : "");
  const reasoningEffort = nilai(env, "AI_REASONING_EFFORT") || (provider === "deepseek" ? "none" : "");
  const bawaan = ({ gemini: "https://generativelanguage.googleapis.com/v1beta/openai", deepseek: "https://api.deepseek.com" } as Record<string, string>)[provider] ?? "";
  const url = (nilai(env, "AI_BASE_URL") || bawaan).replace(/\/+$/, "");
  return { provider, apiKey, model, url, reasoningEffort, aktif: Boolean(apiKey && model && url) };
}

const tunda = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function buatPemanggilAi(p: PengaturanAi, ambil: typeof fetch = fetch, jedaMs = 1500): PemanggilAi {
  return async (pesan) => {
    if (!p.aktif) return null;
    // deno-lint-ignore no-explicit-any
    const badan: any = { model: p.model, messages: pesan, temperature: 0.3, max_tokens: 2048 };
    if (p.reasoningEffort) badan.reasoning_effort = p.reasoningEffort;
    try {
      let r: Response | null = null;
      for (let percobaan = 0; percobaan < 2; percobaan++) { // sekali coba ulang bila sibuk (429/503)
        r = await ambil(`${p.url}/chat/completions`, {
          method: "POST", body: JSON.stringify(badan), signal: AbortSignal.timeout(30_000),
          headers: { "content-type": "application/json", authorization: `Bearer ${p.apiKey}` },
        });
        if (![429, 503].includes(r.status) || percobaan) break;
        await r.body?.cancel();
        await tunda(jedaMs);
      }
      if (!r || !r.ok) {
        const sebab = ({ 401: "kunci API salah", 402: "saldo habis", 429: "terlalu banyak permintaan" } as Record<number, string>)[r?.status ?? 0] ?? "lihat dokumentasi penyedia";
        console.warn(`Layanan AI menolak permintaan (HTTP ${r?.status}: ${sebab}).`);
        await r?.body?.cancel();
        return null;
      }
      const data = await r.json();
      const isi = String(data?.choices?.[0]?.message?.content ?? "").trim();
      return isi || null;
    } catch (e) {
      console.warn("Layanan AI gagal dihubungi:", e instanceof Error ? e.name : String(e));
      return null;
    }
  };
}
