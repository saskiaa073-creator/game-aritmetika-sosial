import { api } from "../api.js";
import { formatAngka } from "../local/mesin.js";
import { h } from "../ui.js";

const NAMA_LEVEL = ["Bekal", "Level 1", "Level 2", "Level 3"];

export async function beranda(main) {
  const [saya, daftar] = await Promise.all([api("/saya"), api("/modul")]);
  const persenSasaran = Math.min(100, Math.round((saya.poin_hari_ini / saya.sasaran_harian) * 100));

  main.replaceChildren(
    h("h1", {}, `Halo, ${saya.nama_panggilan}!`),
    h("section", { class: "statistik", "aria-label": "Capaianmu" },
      h("div", { class: "stat" }, h("strong", {}, formatAngka(saya.poin_total)), h("span", {}, "poin")),
      h("div", { class: "stat" }, h("strong", {}, `${saya.streak} hari`), h("span", {}, "berturut-turut")),
      h("div", { class: "stat lebar" },
        h("span", {}, `Sasaran hari ini: ${saya.poin_hari_ini} dari ${saya.sasaran_harian} poin`),
        h("div", { class: "bilah", role: "progressbar", "aria-valuemin": "0", "aria-valuemax": "100", "aria-valuenow": String(persenSasaran) },
          h("div", { style: `width:${persenSasaran}%` })),
        persenSasaran >= 100 && h("span", {}, "✔ Sasaran tercapai!"))),
    h("h2", {}, "Modul belajar"),
    h("div", { class: "daftar-modul" },
      daftar.map((m) =>
        h("a", { class: "kartu modul", href: `#/modul/${m.id}` },
          h("span", { class: "lencana" }, m.jenis === "tes" ? "Tes" : NAMA_LEVEL[m.level] || `Level ${m.level}`),
          h("h3", {}, m.judul),
          h("p", { class: "redup" }, m.tujuan),
          h("span", { class: "kemajuan" },
            m.soal_benar === m.jumlah_soal ? "✔ Selesai" : `${m.soal_benar} dari ${m.jumlah_soal} soal benar`)))),
  );
}
