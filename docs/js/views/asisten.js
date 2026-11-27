// Panel Asisten Belajar (model RMT) di bawah soal latihan.
// Benar/salah tetap diperiksa MESIN di server; AI hanya menyusun kalimat bimbingan.
import { api } from "../api.js";
import { h, kotakHasil, pesanGalat } from "../ui.js";
import { ikon } from "./ikon.js";
import { ilustrasi } from "./ilustrasi.js";

export function panelAsisten(soal, st, render) {
  if (!st.asistenBuka) {
    return h("button", { class: "tombol asisten-buka", onclick: () => buka() }, ikon("obrolan"), "Tanya Koko, Asisten Belajar");
  }

  async function buka() {
    st.asistenBuka = true;
    st.galatAsisten = null;
    if (!st.obrolan) {
      try {
        const riwayat = await api(`/asisten/riwayat/${encodeURIComponent(soal.id)}`);
        st.obrolan = riwayat.map((p) => ({ peran: p.peran, isi: p.isi, cek: p.cek_mesin }));
      } catch (err) {
        st.obrolan = [];
        st.galatAsisten = err;
      }
    }
    render();
    document.getElementById(`asisten-${soal.id}`)?.focus();
  }

  async function kirim(e) {
    e.preventDefault();
    const input = e.target.elements.pesan;
    const pesan = input.value.trim();
    if (!pesan || st.asistenMengirim) return;
    st.asistenMengirim = true;
    st.galatAsisten = null;
    st.obrolan.push({ peran: "siswa", isi: pesan });
    render();
    try {
      const r = await api("/asisten", { method: "POST", body: { soal_id: soal.id, pesan } });
      st.obrolan.push({ peran: "asisten", isi: r.balasan, cek: r.cek_mesin });
      st.tahapAsisten = r.tahap;
      st.sisaKuota = r.sisa_kuota;
    } catch (err) {
      st.galatAsisten = err;
    }
    st.asistenMengirim = false;
    render();
    document.getElementById(`asisten-${soal.id}`)?.focus();
  }

  const t = st.tahapAsisten;
  return h("section", { class: "asisten", "aria-label": "Asisten Belajar" },
    h("div", { class: "asisten-kepala" },
      ilustrasi("maskot-senang", "avatar-koko"), h("strong", {}, "Koko, Asisten Belajar"),
      t && h("span", { class: "lencana" }, `Tahap ${t.nomor} dari ${t.jumlah}: ${t.nama}`),
      h("button", { class: "tombol kecil", onclick: () => { st.asistenBuka = false; render(); } }, "Tutup")),
    h("p", { class: "redup kecil" },
      "Asisten membantumu berpikir selangkah demi selangkah, tapi tidak memberi jawaban akhir. ",
      "Ketik angkanya saja agar diperiksa mesin. Jangan menulis data pribadi."),
    h("div", { class: "obrolan", "aria-live": "polite" },
      (st.obrolan || []).length === 0 &&
        h("p", { class: "redup" }, "Mulai dengan bertanya, misalnya: \"Aku bingung mulai dari mana.\""),
      (st.obrolan || []).map((m) =>
        h("div", { class: `gelembung ${m.peran}` },
          h("span", { class: "sr-only" }, m.peran === "siswa" ? "Kamu: " : "Asisten: "),
          m.cek && kotakHasil(m.cek),
          h("p", {}, m.isi))),
      st.asistenMengirim && h("p", { class: "redup kecil" }, "Asisten sedang menulis…")),
    st.galatAsisten && pesanGalat(st.galatAsisten),
    h("form", { class: "sebaris-form", onsubmit: kirim },
      h("label", {}, h("span", { class: "sr-only" }, "Pesan untuk asisten"),
        h("input", { id: `asisten-${soal.id}`, name: "pesan", maxlength: "300", autocomplete: "off",
          placeholder: "Tulis pertanyaan atau jawabanmu…", disabled: st.asistenMengirim })),
      h("button", { class: "tombol utama", type: "submit", disabled: st.asistenMengirim }, "Kirim")),
    st.sisaKuota != null && h("p", { class: "redup kecil" }, `Sisa kuota hari ini: ${st.sisaKuota} pesan`));
}
