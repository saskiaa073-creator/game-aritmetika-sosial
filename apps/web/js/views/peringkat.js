import { api } from "../api.js";
import { formatAngka } from "../local/mesin.js";
import { h } from "../ui.js";

export async function peringkat(main, lingkup = "kelas") {
  const daftar = await api(`/peringkat?lingkup=${lingkup === "semua" ? "semua" : "kelas"}`);
  main.replaceChildren(
    h("h1", {}, "Papan peringkat"),
    h("div", { class: "tab", role: "tablist" },
      h("a", { role: "tab", href: "#/peringkat/kelas", "aria-selected": String(lingkup !== "semua") }, "Kelasku"),
      h("a", { role: "tab", href: "#/peringkat/semua", "aria-selected": String(lingkup === "semua") }, "Semua")),
    daftar.length === 0
      ? h("p", { class: "redup" }, "Belum ada data. Ayo kerjakan soal pertama!")
      : h("ol", { class: "peringkat" },
        daftar.map((b) =>
          h("li", { class: b.saya ? "saya" : "" },
            h("span", { class: "nomor" }, `${b.peringkat}.`),
            h("span", { class: "nama" }, b.nama_panggilan, b.saya && " (kamu)"),
            h("span", { class: "poin" }, `${formatAngka(b.poin)} poin`)))),
  );
}
