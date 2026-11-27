// Edge Function "api" Pasar Pintar.
// Semua rahasia dari Supabase Secrets (Deno.env), tidak pernah ditulis di kode:
//   APP_SECRET            kunci tanda tangan token login (wajib)
//   AI_PROVIDER, AI_API_KEY (atau DEEPSEEK_API_KEY / GEMINI_API_KEY), AI_MODEL, AI_REASONING_EFFORT, AI_KUOTA_HARIAN
//   ALLOWED_ORIGINS       alamat frontend yang boleh memanggil, dipisah koma
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  disediakan otomatis oleh Supabase
// Deploy:  npx supabase@2.122.1 functions deploy api --no-verify-jwt
// (--no-verify-jwt karena fungsi ini memeriksa token loginnya sendiri.)
import konten from "../_shared/konten.json" with { type: "json" };
import { buatPemanggilAi, pengaturanAiDariEnv } from "./ai.ts";
import { GudangSupabase } from "./gudang_supabase.ts";
import { buatHandler } from "./inti.ts";

const env = (nama: string) => Deno.env.get(nama);
const ai = pengaturanAiDariEnv(env);
const kunciServis = env("SUPABASE_SERVICE_ROLE_KEY") ?? env("SUPABASE_SECRET_KEY") ?? "";
const appSecret = env("APP_SECRET") ?? "";

const handler = buatHandler({
  gudang: new GudangSupabase(env("SUPABASE_URL") ?? "", kunciServis),
  konten,
  panggilAi: buatPemanggilAi(ai),
  pengaturan: {
    appSecret,
    tokenJam: 24 * 7,
    sasaranHarian: Number(env("SASARAN_HARIAN") ?? 30),
    kuotaAi: Number(env("AI_KUOTA_HARIAN") ?? 20),
    aiAktif: ai.aktif,
    asalDiizinkan: (env("ALLOWED_ORIGINS") ?? "https://saskiaa073-creator.github.io")
      .split(",").map((s) => s.trim()).filter(Boolean),
  },
});

Deno.serve((req) => {
  if (!appSecret) {
    return Response.json({ detail: "Server belum siap: APP_SECRET belum diatur di Supabase Secrets." }, { status: 500 });
  }
  return handler(req);
});
