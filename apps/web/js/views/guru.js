// Dashboard guru: kelas, kode kelas, kesalahan umum, ekspor CSV.
import { api, unduh } from "../api.js";
import { formatAngka } from "../local/mesin.js";
import { h, pesanGalat } from "../ui.js";
import { ikon } from "./ikon.js";

export async function guru(main, kelasId) {
  const daftar = await api("/guru/kelas");
  const galat = h("div");
  const form = h("form", { class: "sebaris-form" },
    h("label", {}, h("span", { class: "sr-only" }, "Nama kelas baru"), h("input", { name: "nama", placeholder: "Nama kelas, mis. VII B", required: true, maxlength: 40 })),
    h("button", { class: "tombol utama", type: "submit" }, "Buat kelas"));
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const k = await api("/guru/kelas", { method: "POST", body: { nama: new FormData(form).get("nama") } });
      location.hash = `#/guru/${k.id}`;
    } catch (err) {
      galat.replaceChildren(pesanGalat(err));
    }
  });

  main.replaceChildren(
    h("h1", {}, "Kelas saya"),
    h("div", { class: "daftar-modul" },
      daftar.map((k) =>
        h("a", { class: `kartu modul${String(k.id) === kelasId ? " aktif" : ""}`, href: `#/guru/${k.id}` },
          h("h3", {}, k.nama),
          h("p", {}, "Kode kelas: ", h("strong", { class: "kode" }, k.kode)),
          h("span", { class: "kemajuan" }, `${k.jumlah_siswa} siswa`)))),
    form, galat,
    kelasId ? await ringkasan(kelasId) : h("p", { class: "redup" }, "Pilih kelas untuk melihat ringkasan."),
  );
}

async function ringkasan(kelasId) {
  const r = await api(`/guru/kelas/${encodeURIComponent(kelasId)}/ringkasan`);
  const tabel = h("div", { class: "gulir-x" },
    h("table", {},
      h("thead", {}, h("tr", {}, ["Nama panggilan", "Poin", "Soal benar", "Skor tes", "Jawaban", "Kesalahan terbanyak"].map((t) => h("th", { scope: "col" }, t)))),
      h("tbody", {}, r.siswa.map((s) =>
        h("tr", {},
          h("td", {}, s.nama_panggilan, h("br"), h("small", { class: "redup" }, s.username)),
          h("td", {}, formatAngka(s.poin)),
          h("td", {}, `${s.soal_benar} / ${r.jumlah_soal}`),
          h("td", {}, `${s.skor_tes} / ${r.skor_tes_maks}`),
          h("td", {}, formatAngka(s.jumlah_jawaban)),
          h("td", {}, s.kesalahan_terbanyak))))));

  return h("section", {},
    h("h2", {}, `Ringkasan ${r.kelas.nama}`),
    h("p", {}, "Bagikan kode ini ke siswa: ", h("strong", { class: "kode" }, r.kelas.kode)),
    h("button", { class: "tombol", onclick: () => unduh(`/guru/kelas/${r.kelas.id}/ekspor.csv`, `rekap_${r.kelas.kode}.csv`) }, ikon("unduh"), "Unduh CSV"),
    r.siswa.length ? tabel : h("p", { class: "redup" }, "Belum ada siswa di kelas ini."),
    h("h2", {}, "Kesalahan umum"),
    r.kesalahan_umum.length
      ? h("ol", { class: "kesalahan" }, r.kesalahan_umum.map((k) =>
        h("li", {}, h("strong", {}, `${k.jumlah}× `), k.pesan, h("br"), h("small", { class: "redup" }, `${k.soal_id}: ${k.soal}`))))
      : h("p", { class: "redup" }, "Belum ada jawaban salah yang tercatat."));
}
