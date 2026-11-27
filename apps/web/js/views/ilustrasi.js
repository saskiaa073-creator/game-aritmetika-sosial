// Ilustrasi SVG sederhana bertema pasar (dibuat sendiri, tanpa file gambar luar).
// Hiasan saja: aria-hidden, warna mengikuti tema cream. Konteks warung mendukung temuan GL01.
import { h } from "../ui.js";

const KIOS = `
<svg viewBox="0 0 320 200" xmlns="http://www.w3.org/2000/svg" role="presentation">
  <ellipse cx="160" cy="186" rx="140" ry="10" fill="#eadcc4"/>
  <rect x="62" y="40" width="10" height="140" rx="4" fill="#9c8462"/>
  <rect x="248" y="40" width="10" height="140" rx="4" fill="#9c8462"/>
  <rect x="52" y="30" width="216" height="16" rx="6" fill="#2f5d50"/>
  <g>
    <path d="M52 46h27v22a13.5 13.5 0 0 1-27 0z" fill="#2f5d50"/>
    <path d="M79 46h27v22a13.5 13.5 0 0 1-27 0z" fill="#fffbf4"/>
    <path d="M106 46h27v22a13.5 13.5 0 0 1-27 0z" fill="#2f5d50"/>
    <path d="M133 46h27v22a13.5 13.5 0 0 1-27 0z" fill="#fffbf4"/>
    <path d="M160 46h27v22a13.5 13.5 0 0 1-27 0z" fill="#2f5d50"/>
    <path d="M187 46h27v22a13.5 13.5 0 0 1-27 0z" fill="#fffbf4"/>
    <path d="M214 46h27v22a13.5 13.5 0 0 1-27 0z" fill="#2f5d50"/>
    <path d="M241 46h27v22a13.5 13.5 0 0 1-27 0z" fill="#fffbf4"/>
  </g>
  <rect x="72" y="118" width="176" height="62" rx="6" fill="#fffbf4" stroke="#9c8462" stroke-width="3"/>
  <rect x="64" y="110" width="192" height="14" rx="5" fill="#e6d9c2" stroke="#9c8462" stroke-width="3"/>
  <circle cx="98" cy="100" r="12" fill="#e8893a"/><circle cx="118" cy="102" r="10" fill="#e8893a"/>
  <circle cx="108" cy="88" r="10" fill="#f0a35a"/>
  <circle cx="150" cy="101" r="11" fill="#7a9a5b"/><circle cx="170" cy="101" r="11" fill="#6b8f5e"/>
  <circle cx="160" cy="86" r="10" fill="#8aab6a"/>
  <circle cx="204" cy="101" r="11" fill="#c2410c"/><circle cx="224" cy="102" r="10" fill="#b23a0b"/>
  <circle cx="214" cy="88" r="10" fill="#d4572a"/>
  <g transform="rotate(-12 268 128)">
    <rect x="240" y="112" width="58" height="34" rx="7" fill="#fde3c4" stroke="#9a4a0b" stroke-width="3"/>
    <circle cx="249" cy="129" r="4" fill="#9a4a0b"/>
    <text x="275" y="137" text-anchor="middle" font-family="system-ui, sans-serif" font-size="20" font-weight="800" fill="#9a4a0b">%</text>
  </g>
  <g>
    <circle cx="40" cy="170" r="13" fill="#d9a441" stroke="#a67a22" stroke-width="3"/>
    <circle cx="58" cy="176" r="10" fill="#e3b55a" stroke="#a67a22" stroke-width="3"/>
    <text x="40" y="175" text-anchor="middle" font-family="system-ui, sans-serif" font-size="12" font-weight="800" fill="#7a5a14">Rp</text>
  </g>
  <rect x="120" y="134" width="80" height="30" rx="6" fill="#f1e6d2"/>
  <text x="160" y="155" text-anchor="middle" font-family="system-ui, sans-serif" font-size="15" font-weight="800" fill="#2f5d50">PASAR</text>
</svg>`;

const PIALA = `
<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" role="presentation">
  <ellipse cx="60" cy="110" rx="34" ry="5" fill="#eadcc4"/>
  <path d="M38 20h44v22c0 14-10 26-22 26S38 56 38 42z" fill="#d9a441" stroke="#a67a22" stroke-width="3"/>
  <path d="M38 28H24c0 14 8 22 16 22M82 28h14c0 14-8 22-16 22" fill="none" stroke="#a67a22" stroke-width="4"/>
  <rect x="54" y="68" width="12" height="16" fill="#a67a22"/>
  <rect x="40" y="84" width="40" height="14" rx="4" fill="#2f5d50"/>
  <path d="M60 30l4 8 9 1-7 6 2 9-8-5-8 5 2-9-7-6 9-1z" fill="#fffbf4"/>
</svg>`;

// ---------- Maskot "Koko si Koin" (karakter buatan sendiri) ----------
const BADAN_KOKO = `
  <ellipse cx="60" cy="113" rx="30" ry="5" fill="#eadcc4"/>
  <circle cx="60" cy="60" r="44" fill="#e3b55a" stroke="#a67a22" stroke-width="4"/>
  <circle cx="60" cy="60" r="35" fill="none" stroke="#c99a3a" stroke-width="3" stroke-dasharray="3 6"/>
  <circle cx="37" cy="71" r="6" fill="#e8893a" opacity=".45"/><circle cx="83" cy="71" r="6" fill="#e8893a" opacity=".45"/>`;

const WAJAH = {
  senang: `
    <circle cx="46" cy="55" r="5.5" fill="#3a2e24"/><circle cx="74" cy="55" r="5.5" fill="#3a2e24"/>
    <circle cx="48" cy="53" r="1.8" fill="#fff"/><circle cx="76" cy="53" r="1.8" fill="#fff"/>
    <path d="M48 69q12 12 24 0" fill="none" stroke="#3a2e24" stroke-width="4" stroke-linecap="round"/>
    <path d="M17 68q-11 5-7 17" fill="none" stroke="#a67a22" stroke-width="5" stroke-linecap="round"/>
    <path d="M103 62q12-5 11-19" fill="none" stroke="#a67a22" stroke-width="5" stroke-linecap="round"/>`,
  hore: `
    <path d="M40 57q6-8 12 0M68 57q6-8 12 0" fill="none" stroke="#3a2e24" stroke-width="4" stroke-linecap="round"/>
    <path d="M45 67q15 19 30 0z" fill="#7a3b1e"/><path d="M52 73q8 5 16 0" fill="#e8893a"/>
    <path d="M19 52q-13-9-9-25" fill="none" stroke="#a67a22" stroke-width="5" stroke-linecap="round"/>
    <path d="M101 52q13-9 9-25" fill="none" stroke="#a67a22" stroke-width="5" stroke-linecap="round"/>
    <path d="M14 8l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#2f5d50"/><path d="M106 4l1.6 4 4 1.6-4 1.6-1.6 4-1.6-4-4-1.6 4-1.6z" fill="#b8892b"/>`,
  mikir: `
    <path d="M40 45q6-4 12-1M68 44q6-3 12 1" fill="none" stroke="#3a2e24" stroke-width="3" stroke-linecap="round"/>
    <circle cx="47" cy="54" r="5.5" fill="#3a2e24"/><circle cx="75" cy="54" r="5.5" fill="#3a2e24"/>
    <circle cx="49" cy="51" r="1.8" fill="#fff"/><circle cx="77" cy="51" r="1.8" fill="#fff"/>
    <path d="M52 75q8-3 16 0" fill="none" stroke="#3a2e24" stroke-width="4" stroke-linecap="round"/>
    <path d="M17 70q-10 6-6 16" fill="none" stroke="#a67a22" stroke-width="5" stroke-linecap="round"/>
    <path d="M100 82q-8 9-21 3" fill="none" stroke="#a67a22" stroke-width="5" stroke-linecap="round"/>
    <circle cx="103" cy="17" r="13" fill="#fffbf4" stroke="#9c8462" stroke-width="3"/>
    <text x="103" y="23.5" text-anchor="middle" font-family="system-ui, sans-serif" font-size="18" font-weight="800" fill="#2f5d50">?</text>`,
};

const koko = (ekspresi) =>
  `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" role="presentation">${BADAN_KOKO}${WAJAH[ekspresi]}</svg>`;

// ---------- Gambar tiap modul ----------
const T = 'font-family="system-ui, sans-serif" font-weight="800" text-anchor="middle"';
const GAMBAR_MODUL = {
  m0: `<rect x="28" y="30" width="54" height="60" rx="14" fill="#c99a3a" stroke="#8a6420" stroke-width="3"/>
    <path d="M43 30v-6a12 12 0 0 1 24 0v6" fill="none" stroke="#8a6420" stroke-width="4"/>
    <rect x="39" y="57" width="32" height="22" rx="6" fill="#e3b55a" stroke="#8a6420" stroke-width="3"/>
    <circle cx="117" cy="56" r="27" fill="#fffbf4" stroke="#9c8462" stroke-width="3"/>
    <path d="M117 56V29a27 27 0 0 1 27 27z" fill="#5f8a6a"/><text x="110" y="72" ${T} font-size="18" fill="#3a2e24">%</text>`,
  m1: `<rect x="76" y="26" width="8" height="58" rx="3" fill="#9c8462"/><path d="M54 92h52l-7-9H61z" fill="#9c8462"/>
    <path d="M30 26 130 40" stroke="#3a2e24" stroke-width="4" stroke-linecap="round"/><circle cx="80" cy="33" r="5" fill="#3a2e24"/>
    <path d="M30 26 17 54M30 26l13 28M130 40l-13 28M130 40l13 28" stroke="#9c8462" stroke-width="2"/>
    <path d="M11 54h38a19 9 0 0 1-38 0z" fill="#dbeafe" stroke="#1d4ed8" stroke-width="3"/>
    <path d="M111 68h38a19 9 0 0 1-38 0z" fill="#fde3c4" stroke="#9a4a0b" stroke-width="3"/>
    <text x="30" y="83" ${T} font-size="13" fill="#1d4ed8">beli</text><text x="130" y="97" ${T} font-size="13" fill="#9a4a0b">jual</text>`,
  m2: `<rect x="36" y="10" width="88" height="28" rx="9" fill="#e2ece3" stroke="#4e7a5a" stroke-width="3"/>
    <text x="80" y="29.5" ${T} font-size="15" fill="#2f5d50">untung</text>
    <path d="M26 50h108" stroke="#3a2e24" stroke-width="4" stroke-linecap="round"/>
    <rect x="26" y="62" width="108" height="28" rx="9" fill="#dbeafe" stroke="#1d4ed8" stroke-width="3"/>
    <text x="80" y="81.5" ${T} font-size="15" fill="#1d4ed8">harga beli</text>`,
  m3: `<path d="M22 12v74h120" fill="none" stroke="#9c8462" stroke-width="3" stroke-linecap="round"/>
    <rect x="34" y="24" width="18" height="62" rx="3" fill="#8a6a86"/><rect x="60" y="40" width="18" height="46" rx="3" fill="#a5859f"/>
    <rect x="86" y="54" width="18" height="32" rx="3" fill="#bfa2b9"/><rect x="112" y="66" width="18" height="20" rx="3" fill="#d6c0d1"/>
    <path d="M40 14q46 6 88 42" fill="none" stroke="#9f1239" stroke-width="4" stroke-linecap="round"/>
    <path d="M118 58l12 0-3-11" fill="none" stroke="#9f1239" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`,
  m4: `<path d="M26 8h58v84l-7-5-7 5-7-5-8 5-7-5-7 5-8-5z" fill="#fffbf4" stroke="#9c8462" stroke-width="3" stroke-linejoin="round"/>
    <path d="M36 24h38M36 36h38M36 48h24M36 62h38" stroke="#c9b79a" stroke-width="4" stroke-linecap="round"/>
    <path d="M97 22v14M90 29h14" stroke="#2f5d50" stroke-width="4" stroke-linecap="round"/>
    <rect x="102" y="46" width="40" height="34" rx="4" fill="#e3b55a" stroke="#8a6420" stroke-width="3"/>
    <path d="M102 58h40M122 46v12" stroke="#8a6420" stroke-width="3"/>`,
  m5: `<path d="M58 34h32l15 16-15 16H58z" fill="#f6ead0" stroke="#b8892b" stroke-width="3" stroke-linejoin="round"/>
    <circle cx="94" cy="50" r="4" fill="#b8892b"/><text x="74" y="56" ${T} font-size="16" fill="#8a6420">Rp</text>
    <path d="M36 32a48 48 0 0 1 88 0" fill="none" stroke="#2f5d50" stroke-width="4" stroke-linecap="round"/>
    <path d="M114 26l10 6-2-12" fill="none" stroke="#2f5d50" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M124 68a48 48 0 0 1-88 0" fill="none" stroke="#8a6a86" stroke-width="4" stroke-linecap="round"/>
    <path d="M46 74l-10-6 2 12" fill="none" stroke="#8a6a86" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`,
  m6: `<g transform="rotate(-10 86 50)"><path d="M54 20h50l28 30-28 30H54z" fill="#f6ead0" stroke="#b8892b" stroke-width="3" stroke-linejoin="round"/>
    <circle cx="112" cy="50" r="5" fill="#fffbf4" stroke="#b8892b" stroke-width="3"/>
    <text x="80" y="58" ${T} font-size="22" fill="#8a6420">-20%</text></g>
    <path d="M52 52q-22-12-30 8" fill="none" stroke="#9c8462" stroke-width="3" stroke-linecap="round"/>`,
  m7: `<rect x="46" y="12" width="66" height="82" rx="8" fill="#fffbf4" stroke="#9c8462" stroke-width="3"/>
    <rect x="63" y="6" width="32" height="14" rx="4" fill="#2f5d50"/>
    <path d="M56 38l5 5 9-10M56 58l5 5 9-10" fill="none" stroke="#166534" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M78 39h24M78 59h24M58 79h44" stroke="#c9b79a" stroke-width="4" stroke-linecap="round"/>
    <path d="M122 28l12 12-30 30-14 4 4-14z" fill="#e3b55a" stroke="#8a6420" stroke-width="3" stroke-linejoin="round"/>`,
};

const SVG = {
  kios: KIOS, piala: PIALA,
  "maskot-senang": koko("senang"), "maskot-hore": koko("hore"), "maskot-mikir": koko("mikir"),
};

export function ilustrasi(nama, kelas = "") {
  return h("div", { class: `ilustrasi ${kelas}`.trim(), "aria-hidden": "true", html: SVG[nama] });
}

/** Gambar khas modul (latar warna mengikuti level lewat CSS). */
export function gambarModul(id, kelas = "") {
  const isi = GAMBAR_MODUL[id] || GAMBAR_MODUL.m1;
  return h("div", { class: `gambar-modul ${kelas}`.trim(), "aria-hidden": "true",
    html: `<svg viewBox="0 0 160 100" xmlns="http://www.w3.org/2000/svg" role="presentation">${isi}</svg>` });
}

/** Kelas CSS warna level: lvl-0 … lvl-3, atau lvl-tes. */
export const kelasLevel = (m) => (m.jenis === "tes" ? "lvl-tes" : `lvl-${m.level}`);

// Ikon kecil tiap modul (dipakai di jalur mini dan daftar ringkas).
export const IKON_MODUL = { m0: "🎒", m1: "⚖️", m2: "➗", m3: "📉", m4: "🧾", m5: "🔄", m6: "🏷️", m7: "📝" };

export const NAMA_LEVEL = { 0: "Bekal", 1: "Level 1 · Dasar", 2: "Level 2 · Persentase", 3: "Level 3 · Soal cerita" };
