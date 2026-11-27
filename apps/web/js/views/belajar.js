// Jalur Belajar: semua modul berurutan dari Bekal sampai Tes, dengan status tiap modul.
// Urutan bertahap mengikuti temuan EL04 (jangan loncat ke diskon sebelum dasar dikuasai).
import { api } from "../api.js";
import { h } from "../ui.js";
import { IKON_MODUL, NAMA_LEVEL } from "./ilustrasi.js";

function status(m) {
  if (m.soal_benar === m.jumlah_soal) return { kelas: "selesai", teks: "✔ Selesai" };
  if (m.soal_benar > 0) return { kelas: "berjalan", teks: `◐ ${m.soal_benar} dari ${m.jumlah_soal} soal` };
  return { kelas: "", teks: `○ ${m.jumlah_soal} soal` };
}

export async function belajar(main) {
  const daftar = await api("/modul");
  const selesai = daftar.filter((m) => m.soal_benar === m.jumlah_soal).length;
  let levelSebelumnya = null;
  const butir = [];
  for (const m of daftar) {
    const grup = m.jenis === "tes" ? "Tes akhir" : NAMA_LEVEL[m.level];
    if (grup !== levelSebelumnya) {
      butir.push(h("li", { class: "jalur-grup" }, grup));
      levelSebelumnya = grup;
    }
    const st = status(m);
    butir.push(h("li", { class: `jalur-modul ${st.kelas}` },
      h("span", { class: "jalur-simpul", "aria-hidden": "true" }, IKON_MODUL[m.id] || "📘"),
      h("a", { class: "kartu jalur-kartu", href: `#/modul/${m.id}` },
        h("h3", {}, m.judul),
        h("p", { class: "redup" }, m.tujuan),
        h("div", { class: "bilah" }, h("div", { style: `width:${(m.soal_benar / m.jumlah_soal) * 100}%` })),
        h("span", { class: "kemajuan" }, st.teks))));
  }

  main.replaceChildren(
    h("h1", {}, "Jalur Belajar"),
    h("p", { class: "redup" }, "Kerjakan dari atas ke bawah, selangkah demi selangkah."),
    h("div", { class: "ringkas-jalur" },
      h("strong", {}, `${selesai} / ${daftar.length}`), h("span", {}, " modul selesai"),
      h("div", { class: "bilah" }, h("div", { style: `width:${(selesai / daftar.length) * 100}%` }))),
    h("ol", { class: "jalur" }, butir),
  );
}
