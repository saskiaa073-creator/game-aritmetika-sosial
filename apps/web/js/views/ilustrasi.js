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

const SVG = { kios: KIOS, piala: PIALA };

export function ilustrasi(nama, kelas = "") {
  return h("div", { class: `ilustrasi ${kelas}`.trim(), "aria-hidden": "true", html: SVG[nama] });
}

// Ikon tiap modul, dipakai di Beranda dan Jalur Belajar.
export const IKON_MODUL = { m0: "🎒", m1: "⚖️", m2: "➗", m3: "📉", m4: "🧾", m5: "🔄", m6: "🏷️", m7: "📝" };

export const NAMA_LEVEL = { 0: "Bekal", 1: "Level 1 · Dasar", 2: "Level 2 · Persentase", 3: "Level 3 · Soal cerita" };
