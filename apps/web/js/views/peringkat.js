import { api } from "../api.js";
import { formatAngka } from "../local/mesin.js";
import { h } from "../ui.js";
import { ilustrasi } from "./ilustrasi.js";

const MEDALI = { 1: "🥇", 2: "🥈", 3: "🥉" };

export async function peringkat(main, lingkup = "kelas") {
  const daftar = await api(`/peringkat?lingkup=${lingkup === "semua" ? "semua" : "kelas"}`);
  main.replaceChildren(
    h("div", { class: "kepala-peringkat" },
      ilustrasi("piala", "piala"),
      h("div", {}, h("h1", {}, "Papan peringkat"), h("p", { class: "redup kecil" }, "Hanya nama panggilan yang ditampilkan."))),
    h("div", { class: "tab", role: "tablist" },
      h("a", { role: "tab", href: "#/peringkat/kelas", "aria-selected": String(lingkup !== "semua") }, "Kelasku"),
      h("a", { role: "tab", href: "#/peringkat/semua", "aria-selected": String(lingkup === "semua") }, "Semua")),
    daftar.length === 0
      ? h("div", { class: "kosong" }, ilustrasi("maskot-senang", "kosong-maskot"), h("p", { class: "redup" }, "Belum ada data. Ayo kerjakan soal pertama!"))
      : h("ol", { class: "peringkat" },
        daftar.map((b) =>
          h("li", { class: `${b.saya ? "saya" : ""} ${b.peringkat <= 3 ? "tiga-besar" : ""}`.trim() },
            h("span", { class: "nomor", "aria-label": `Peringkat ${b.peringkat}` }, MEDALI[b.peringkat] || `${b.peringkat}.`),
            h("span", { class: "nama" }, b.nama_panggilan, b.saya && " (kamu)"),
            h("span", { class: "poin" }, `${formatAngka(b.poin)} poin`)))),
  );
}
