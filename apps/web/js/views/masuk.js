import { api, sesi, STATIS } from "../api.js";
import { h, pesanGalat } from "../ui.js";
import { ikon } from "./ikon.js";
import { ilustrasi } from "./ilustrasi.js";

export function masuk(main) {
  let mode = "masuk";
  const wadah = h("div");

  function render() {
    const galat = h("div");
    const formulir = h("form", { class: "kartu formulir", novalidate: true });
    const field = (label, nama, attr = {}, catatan) =>
      h("label", {}, h("span", {}, label), h("input", { name: nama, ...attr }), catatan && h("small", { class: "redup" }, catatan));

    // filter(Boolean): buang isian yang tidak dipakai di mode ini (nilai false/null).
    formulir.append(...[
      field("Nama pengguna", "username", { autocomplete: "username", required: true, autocapitalize: "none" },
        mode === "daftar" ? "3–20 huruf kecil atau angka, misalnya rina07." : null),
      mode === "daftar" &&
        field("Nama panggilan", "nama_panggilan", { required: true, maxlength: 15 },
          "Nama panggilan saja, bukan nama lengkap. Tampil di papan peringkat."),
      field("Kata sandi", "password", {
        type: "password", required: true,
        autocomplete: mode === "daftar" ? "new-password" : "current-password",
      }, mode === "daftar" ? "Minimal 6 karakter." : null),
      mode === "daftar" && !STATIS && field("Kode kelas (boleh dikosongkan)", "kode_kelas", { maxlength: 6, autocapitalize: "characters" }),
      galat,
      STATIS && h("p", { class: "redup kecil catatan-statis" },
        "Versi HP: akun dan kemajuanmu tersimpan di perangkat ini. Coba cepat: siswa_demo / siswa12345."),
      h("button", { class: "tombol utama", type: "submit" }, mode === "masuk" ? "Masuk" : "Daftar"),
    ].filter(Boolean));

    formulir.addEventListener("submit", async (e) => {
      e.preventDefault();
      galat.replaceChildren();
      const data = Object.fromEntries(new FormData(formulir));
      if (data.kode_kelas === "") delete data.kode_kelas;
      try {
        const hasil = await api(mode === "masuk" ? "/auth/masuk" : "/auth/daftar", { method: "POST", body: data });
        sesi.simpan(hasil);
        location.hash = hasil.peran === "guru" ? "#/guru" : "#/beranda";
      } catch (err) {
        galat.append(pesanGalat(err));
      }
    });

    wadah.replaceChildren(
      h("div", { class: "sambutan" },
        ilustrasi("kios", "sambutan-gambar"),
        h("h1", {}, "Pasar Pintar"),
        h("p", { class: "redup" }, "Belajar menghitung persentase untung dan rugi, selangkah demi selangkah."),
        h("ul", { class: "keunggulan" },
          h("li", {}, ikon("buku"), "Belajar bertahap"),
          h("li", {}, ikon("lampu"), "Petunjuk & asisten"),
          h("li", {}, ikon("kalkulator"), "Kalkulator langkah"))),
      h("div", { class: "tab", role: "tablist" },
        h("button", { role: "tab", "aria-selected": String(mode === "masuk"), onclick: () => { mode = "masuk"; render(); } }, "Masuk"),
        h("button", { role: "tab", "aria-selected": String(mode === "daftar"), onclick: () => { mode = "daftar"; render(); } }, "Daftar")),
      formulir,
    );
  }

  render();
  main.replaceChildren(wadah);
}
