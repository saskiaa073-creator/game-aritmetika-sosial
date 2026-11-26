import { api, sesi } from "../api.js";
import { ganti, h, pesanGalat } from "../ui.js";

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

  ganti(main,
    h("h1", {}, "Akun"),
    h("section", { class: "kartu" },
      h("p", {}, "Nama panggilan: ", h("strong", {}, saya.nama_panggilan)),
      h("p", {}, "Nama pengguna: ", h("strong", {}, saya.username)),
      h("p", {}, "Kelas: ", h("strong", {}, saya.kelas || "belum bergabung"))),
    saya.peran === "siswa" && h("section", {}, h("h2", {}, "Gabung kelas"), form, info),
    h("button", { class: "tombol", onclick: () => { sesi.keluar(); location.hash = "#/masuk"; } }, "Keluar"),
    h("p", { class: "redup kecil" }, "Aplikasi ini tidak menyimpan e-mail, nomor HP, tanggal lahir, atau nama lengkap."),
  );
}
