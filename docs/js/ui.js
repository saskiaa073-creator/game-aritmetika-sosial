// Bantuan tampilan kecil. Semua teks dari luar di-escape sebelum masuk HTML.

/** Membuat elemen: h("button", {class: "x", onclick: fn}, "teks", anak2) */
export function h(tag, atribut = {}, ...anak) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(atribut || {})) {
    if (v === false || v == null) continue;
    if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
    else if (k === "class") el.className = v;
    else if (k === "html") el.innerHTML = v; // hanya untuk HTML yang sudah di-escape
    else if (v === true) el.setAttribute(k, "");
    else el.setAttribute(k, v);
  }
  for (const a of anak.flat()) {
    if (a == null || a === false) continue;
    el.append(a instanceof Node ? a : document.createTextNode(String(a)));
  }
  return el;
}

/** Seperti el.replaceChildren, tetapi isi false/null dibuang (tidak tampil sebagai teks "false"). */
export function ganti(el, ...anak) {
  el.replaceChildren(...anak.flat().filter((a) => a != null && a !== false));
}

export function escapeHtml(teks) {
  return String(teks)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// Sorot kata kunci soal cerita (temuan EL01, EL05): harga beli = biru, harga jual = oranye.
const KATA_KUNCI = [
  ["harga beli seluruhnya", "hb"], ["harga beli", "hb"], ["modal", "hb"], ["membeli", "hb"], ["dibeli", "hb"],
  ["ongkos", "hb"], ["biaya", "hb"],
  ["harga jual", "hj"], ["menjualnya", "hj"], ["menjual", "hj"], ["dijual", "hj"],
  ["untung", "ur"], ["rugi", "ur"], ["impas", "ur"],
];
const POLA_KUNCI = new RegExp(
  `\\b(${KATA_KUNCI.map(([k]) => k).sort((a, b) => b.length - a.length).join("|")})\\b`,
  "gi",
);
const JENIS_KUNCI = Object.fromEntries(KATA_KUNCI);
const LABEL_JENIS = { hb: "harga beli", hj: "harga jual", ur: "untung atau rugi" };

export function sorot(teks) {
  return escapeHtml(teks).replace(POLA_KUNCI, (cocok) => {
    const jenis = JENIS_KUNCI[cocok.toLowerCase()];
    return `<mark class="${jenis}" title="${LABEL_JENIS[jenis]}">${cocok}</mark>`;
  });
}

/** Teks ber-paragraf (\n\n = paragraf baru, \n = baris baru), dengan sorotan kata kunci. */
export function paragraf(teks, { denganSorot = true } = {}) {
  const ubah = denganSorot ? sorot : escapeHtml;
  const html = String(teks)
    .split(/\n{2,}/)
    .map((p) => `<p>${p.split("\n").map(ubah).join("<br>")}</p>`)
    .join("");
  return h("div", { class: "teks", html });
}

// Status benar/salah SELALU ikon + teks, bukan warna saja.
const STATUS = {
  benar: { ikon: "✔", label: "Benar" },
  salah: { ikon: "✖", label: "Belum tepat" },
  tidak_valid: { ikon: "⚠", label: "Belum bisa dibaca" },
};

export function kotakHasil(hasil) {
  const s = STATUS[hasil.status] || STATUS.salah;
  return h(
    "div",
    { class: `hasil hasil-${hasil.status}`, role: "status" },
    h("span", { class: "hasil-ikon", "aria-hidden": "true" }, s.ikon),
    h("div", {}, h("strong", {}, s.label), h("p", {}, hasil.pesan)),
  );
}

export function pesanGalat(galat) {
  return h("div", { class: "hasil hasil-salah", role: "alert" },
    h("span", { class: "hasil-ikon", "aria-hidden": "true" }, "⚠"),
    h("p", {}, galat?.message || "Terjadi kesalahan. Coba lagi."));
}

export function memuat() {
  return h("p", { class: "redup" }, "Memuat…");
}
