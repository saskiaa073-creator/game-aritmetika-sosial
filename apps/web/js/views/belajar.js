// Jalur Belajar: semua modul berurutan dari Bekal sampai Tes, dengan gambar dan status tiap modul.
// Urutan bertahap mengikuti temuan EL04 (jangan loncat ke diskon sebelum dasar dikuasai).
import { api } from "../api.js";
import { h } from "../ui.js";
import { ikon } from "./ikon.js";
import { gambarModul, kelasLevel, NAMA_LEVEL } from "./ilustrasi.js";

function status(m) {
  if (m.soal_benar === m.jumlah_soal) return { kelas: "selesai", teks: "Selesai", ikon: "centang" };
  if (m.soal_benar > 0) return { kelas: "berjalan", teks: `${m.soal_benar} dari ${m.jumlah_soal} soal`, ikon: "target" };
  return { kelas: "", teks: `${m.jumlah_soal} soal`, ikon: "buku" };
}

export async function belajar(main) {
  const daftar = await api("/modul");
  const selesai = daftar.filter((m) => m.soal_benar === m.jumlah_soal).length;
  let grupSebelumnya = null;
  const butir = [];
  daftar.forEach((m, i) => {
    const grup = m.jenis === "tes" ? "Tes akhir" : NAMA_LEVEL[m.level];
    if (grup !== grupSebelumnya) {
      butir.push(h("li", { class: `jalur-grup ${kelasLevel(m)}` }, grup));
      grupSebelumnya = grup;
    }
    const st = status(m);
    butir.push(h("li", { class: `jalur-modul ${kelasLevel(m)} ${st.kelas}`.trim() },
      h("span", { class: "jalur-simpul", "aria-hidden": "true" }, st.kelas === "selesai" ? ikon("centang") : String(i + 1)),
      h("a", { class: "kartu jalur-kartu", href: `#/modul/${m.id}` },
        gambarModul(m.id, "jalur-gambar"),
        h("div", { class: "jalur-isi" },
          h("h3", {}, m.judul),
          h("p", { class: "redup" }, m.tujuan),
          h("div", { class: "bilah" }, h("div", { style: `width:${(m.soal_benar / m.jumlah_soal) * 100}%` })),
          h("span", { class: "kemajuan" }, ikon(st.ikon), st.teks)))));
  });

  main.replaceChildren(
    h("h1", {}, "Jalur Belajar"),
    h("p", { class: "redup" }, "Kerjakan dari atas ke bawah, selangkah demi selangkah."),
    h("div", { class: "ringkas-jalur" },
      h("div", {}, h("strong", {}, `${selesai} / ${daftar.length}`), h("span", {}, " modul selesai")),
      h("div", { class: "bilah" }, h("div", { style: `width:${(selesai / daftar.length) * 100}%` }))),
    h("ol", { class: "jalur" }, butir),
  );
}
