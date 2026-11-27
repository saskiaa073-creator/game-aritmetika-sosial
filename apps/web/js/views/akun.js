import { api, sesi } from "../api.js";
import { formatAngka } from "../local/mesin.js";
import { ganti, h, pesanGalat } from "../ui.js";
import { ikon } from "./ikon.js";

export async function akun(main) {
  const saya = await api("/saya");
  const info = h("div");
  const form = h("form", { class: "sebaris-form" },
    h("label", {}, h("span", { class: "sr-only" }, "Kode kelas"), h("input", { name: "kode", placeholder: "Kode kelas (6 huruf)", maxlength: 6, required: true })),
    h("button", { class: "tombol utama", type: "submit" }, "Gabung"));
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const r = await api("/kelas/gabung", { method: "POST", body: { kode: new FormData(form).get("kode") } });
      info.replaceChildren(h("p", {}, `✔ Berhasil bergabung ke kelas ${r.kelas}.`));
    } catch (err) {
      info.replaceChildren(pesanGalat(err));
    }
  });

  const siswa = saya.peran === "siswa";
  ganti(main,
    h("section", { class: "kartu profil" },
      h("span", { class: "avatar", "aria-hidden": "true" }, saya.nama_panggilan.trim().charAt(0).toUpperCase()),
      h("div", {},
        h("h1", {}, saya.nama_panggilan),
        h("p", { class: "redup" }, `@${saya.username} · ${siswa ? "Siswa" : "Guru"}`),
        h("p", {}, "Kelas: ", h("strong", {}, saya.kelas || "belum bergabung")))),
    siswa && h("section", { class: "capaian-kecil" },
      h("div", { class: "angka bintang" }, ikon("bintang"), h("strong", {}, formatAngka(saya.poin_total)), h("span", { class: "redup kecil" }, "total poin")),
      h("div", { class: "angka api" }, ikon("api"), h("strong", {}, saya.streak), h("span", { class: "redup kecil" }, "hari beruntun")),
      h("div", { class: "angka" }, ikon("target"), h("strong", {}, saya.sasaran_harian), h("span", { class: "redup kecil" }, "sasaran/hari"))),
    siswa && h("section", { class: "kartu" }, h("h2", {}, "Gabung kelas"),
      h("p", { class: "redup kecil" }, "Minta kode kelas 6 huruf dari gurumu."), form, info),
    h("section", { class: "kartu tentang" },
      h("h2", {}, "Tentang Pasar Pintar"),
      h("p", {}, "Aplikasi belajar persentase untung dan rugi untuk SMP kelas VII. ",
        "Dirancang dari wawancara pengalaman belajar siswa dengan model pengembangan ADDIE."),
      h("p", { class: "redup kecil" }, "Dikembangkan oleh Astri Saskia, dibantu asisten AI."),
      h("p", { class: "redup kecil privasi" }, ikon("kunci"), "Aplikasi ini tidak menyimpan e-mail, nomor HP, tanggal lahir, atau nama lengkap.")),
    h("button", { class: "tombol keluar", onclick: () => { sesi.keluar(); location.hash = "#/masuk"; } }, ikon("keluar"), "Keluar"),
  );
}
