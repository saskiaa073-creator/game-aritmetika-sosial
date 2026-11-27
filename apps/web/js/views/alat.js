// Alat bantu: kalkulator langkah bertahap, kartu rumus, glosarium (temuan DS01, EL02, IL03).
import { api } from "../api.js";
import {
  banding, bagi, formatPersen, formatRupiah, GalatParse, kali, kurang, parse, pecahan, tambah,
} from "../local/mesin.js";
import { h, pesanGalat } from "../ui.js";

const SERATUS = pecahan(100n);

function baca(nilai, nama) {
  try {
    return parse(nilai);
  } catch (e) {
    if (e instanceof GalatParse) throw new Error(`${nama}: ${e.pesan}`);
    throw e;
  }
}

const hb = (t) => h("mark", { class: "hb" }, t);
const hj = (t) => h("mark", { class: "hj" }, t);

// ---------- Kalkulator ----------
function langkahPersen(hbTeks, hjTeks) {
  const beli = baca(hbTeks, "Harga beli");
  const jual = baca(hjTeks, "Harga jual");
  if (banding(beli, pecahan(0n)) <= 0) throw new Error("Harga beli harus lebih dari 0.");
  const b = banding(jual, beli);
  if (b === 0) return [h("li", {}, "Harga jual sama dengan harga beli → impas (tidak untung, tidak rugi).")];
  const jenis = b > 0 ? "Untung" : "Rugi";
  const selisih = b > 0 ? kurang(jual, beli) : kurang(beli, jual);
  const persen = kali(bagi(selisih, beli), SERATUS);
  return [
    h("li", {}, "Bandingkan: ", hj(formatRupiah(jual)), b > 0 ? " lebih besar dari " : " lebih kecil dari ", hb(formatRupiah(beli)),
      ` → ${jenis.toLowerCase()}.`),
    h("li", {}, `${jenis} = `, b > 0 ? [hj("harga jual"), " − ", hb("harga beli")] : [hb("harga beli"), " − ", hj("harga jual")],
      ` = ${formatRupiah(selisih)}.`),
    h("li", {}, `Persentase ${jenis.toLowerCase()} = ${jenis.toLowerCase()} ÷ `, hb("harga beli"), " × 100%"),
    h("li", {}, `= ${formatRupiah(selisih)} ÷ `, hb(formatRupiah(beli)), ` × 100% = ${formatPersen(persen)}.`),
  ];
}

function langkahHargaJual(hbTeks, persenTeks, jenis) {
  const beli = baca(hbTeks, "Harga beli");
  const persen = baca(persenTeks, "Persentase");
  const besar = kali(bagi(persen, SERATUS), beli);
  const jual = jenis === "untung" ? tambah(beli, besar) : kurang(beli, besar);
  return [
    h("li", {}, `Besar ${jenis} = ${formatPersen(persen)} × `, hb("harga beli"), ` = ${formatPersen(persen)} × ${formatRupiah(beli)} = ${formatRupiah(besar)}.`),
    h("li", {}, hj("Harga jual"), " = ", hb("harga beli"), jenis === "untung" ? " + untung" : " − rugi",
      ` = ${formatRupiah(beli)} ${jenis === "untung" ? "+" : "−"} ${formatRupiah(besar)} = `, hj(formatRupiah(jual)), "."),
  ];
}

export function kalkulator(main) {
  let mode = "persen";
  const wadah = h("div");

  function render() {
    const keluaran = h("div", { "aria-live": "polite" });
    const f = h("form", { class: "kartu formulir", novalidate: true });
    const isian = (label, nama, awalan, akhiran) =>
      h("label", {}, h("span", {}, label),
        h("div", { class: "isian" }, awalan && h("span", { class: "awalan" }, awalan),
          h("input", { name: nama, inputmode: "decimal", autocomplete: "off", maxlength: "40" }),
          akhiran && h("span", { class: "akhiran" }, akhiran)));

    if (mode === "persen") {
      f.append(isian("Harga beli (modal)", "hb", "Rp"), isian("Harga jual", "hj", "Rp"));
    } else {
      f.append(isian("Harga beli (modal)", "hb", "Rp"), isian("Persentase", "persen", null, "%"),
        h("fieldset", { class: "pilihan sebaris" }, h("legend", {}, "Jenis"),
          h("label", { class: "opsi" }, h("input", { type: "radio", name: "jenis", value: "untung", checked: true }), h("span", {}, "Untung")),
          h("label", { class: "opsi" }, h("input", { type: "radio", name: "jenis", value: "rugi" }), h("span", {}, "Rugi"))));
    }
    f.append(h("button", { class: "tombol utama", type: "submit" }, "Hitung langkah demi langkah"), keluaran);
    f.addEventListener("submit", (e) => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(f));
      try {
        const langkah = mode === "persen" ? langkahPersen(d.hb, d.hj) : langkahHargaJual(d.hb, d.persen, d.jenis);
        keluaran.replaceChildren(h("ol", { class: "langkah-contoh" }, langkah));
      } catch (err) {
        keluaran.replaceChildren(pesanGalat(err));
      }
    });

    wadah.replaceChildren(
      h("h1", {}, "Kalkulator langkah"),
      h("p", { class: "redup" }, "Pakai untuk memeriksa hitunganmu. Coba kerjakan sendiri dulu, ya."),
      h("div", { class: "tab", role: "tablist" },
        h("button", { role: "tab", "aria-selected": String(mode === "persen"), onclick: () => { mode = "persen"; render(); } }, "Cari persentase"),
        h("button", { role: "tab", "aria-selected": String(mode === "harga"), onclick: () => { mode = "harga"; render(); } }, "Cari harga jual")),
      f);
  }
  render();
  main.replaceChildren(wadah);
}

// ---------- Kartu rumus (selalu bisa dibuka, tanpa bolak-balik halaman) ----------
export function bukaKartuRumus() {
  let dialog = document.getElementById("kartu-rumus");
  if (!dialog) {
    const rumus = (judul, ...isi) => h("div", { class: "rumus" }, h("strong", {}, judul), h("p", {}, ...isi));
    dialog = h("dialog", { id: "kartu-rumus", "aria-labelledby": "judul-rumus" },
      h("h2", { id: "judul-rumus" }, "Kartu rumus"),
      rumus("Untung", hj("harga jual"), " − ", hb("harga beli")),
      rumus("Rugi", hb("harga beli"), " − ", hj("harga jual")),
      rumus("Persentase untung", "untung ÷ ", hb("harga beli"), " × 100%"),
      rumus("Persentase rugi", "rugi ÷ ", hb("harga beli"), " × 100%"),
      h("p", { class: "catatan" }, "Pembagi persentase selalu ", hb("harga beli"), ", bukan harga jual."),
      h("form", { method: "dialog" }, h("button", { class: "tombol utama" }, "Tutup")));
    document.body.append(dialog);
  }
  dialog.showModal();
}

// ---------- Halaman Alat (kumpulan alat bantu) ----------
export function alat(main) {
  const ubin = (ikon, judul, keterangan, atribut) =>
    h(atribut.href ? "a" : "button", { class: "ubin ubin-lebar", type: atribut.href ? false : "button", ...atribut },
      h("span", { class: "ubin-ikon", "aria-hidden": "true" }, ikon),
      h("span", { class: "ubin-teks" }, h("strong", {}, judul), h("span", { class: "redup kecil" }, keterangan)));
  main.replaceChildren(
    h("h1", {}, "Alat bantu"),
    h("p", { class: "redup" }, "Pakai saat kamu perlu bantuan. Coba kerjakan sendiri dulu, ya."),
    h("div", { class: "daftar-ubin" },
      ubin("🧮", "Kalkulator langkah", "Cari persentase atau harga jual, lengkap dengan langkahnya.", { href: "#/kalkulator" }),
      ubin("📋", "Kartu rumus", "Rumus untung, rugi, dan persentase dalam satu kartu.", { onclick: bukaKartuRumus }),
      ubin("📖", "Glosarium", "Arti istilah: harga beli, harga jual, modal, diskon, dan lainnya.", { href: "#/glosarium" })),
  );
}

// ---------- Glosarium ----------
export async function glosarium(main) {
  const daftar = await api("/glosarium");
  const hasil = h("dl", { class: "glosarium" });
  const tampil = (q = "") => {
    const kecil = q.trim().toLowerCase();
    hasil.replaceChildren(...daftar
      .filter((g) => !kecil || g.istilah.toLowerCase().includes(kecil) || g.arti.toLowerCase().includes(kecil))
      .flatMap((g) => [h("dt", {}, g.istilah), h("dd", {}, g.arti, h("br"), h("span", { class: "redup" }, `Contoh: ${g.contoh}`))]));
  };
  tampil();
  main.replaceChildren(
    h("h1", {}, "Glosarium"),
    h("label", { class: "cari" }, h("span", { class: "sr-only" }, "Cari istilah"),
      h("input", { type: "search", placeholder: "Cari istilah…", oninput: (e) => tampil(e.target.value) })),
    hasil);
}
