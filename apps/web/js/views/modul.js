// Modul belajar: satu layar per langkah, maju-mundur sesuai tempo siswa (temuan EL04).
//
// Urutan layar:
//   - langkah biasa tampil di awal;
//   - langkah dengan "sebelum": "<id soal>" tampil tepat sebelum soal itu (cerita tes);
//   - langkah dengan "tampil_jika_salah": [...] hanya muncul bila jawaban pertama
//     pada salah satu soal itu salah (jalur penguatan adaptif, temuan IL03);
//   - modul tes (jenis "tes") diakhiri layar hasil.
import { api } from "../api.js";
import { urutanPilihan } from "../local/acak.js";
import { ganti, h, kotakHasil, paragraf, pesanGalat, sorot } from "../ui.js";

export async function modul(main, id) {
  const m = await api(`/modul/${encodeURIComponent(id)}`);
  const tes = m.jenis === "tes";
  // keadaan per id: { petunjuk, jawaban, hasil, pembahasan, langkahTerlihat, pertama }
  const keadaan = {};
  const ambil = (kunci) =>
    (keadaan[kunci] ??= { petunjuk: 0, jawaban: "", hasil: null, pembahasan: null, langkahTerlihat: 1, pertama: null });

  if (tes) {
    // Tahap yang sudah pernah dijawab tidak dikunci lagi (mis. setelah halaman dimuat ulang).
    const hasil = await api(`/modul/${encodeURIComponent(id)}/hasil`);
    for (const [sid, status] of Object.entries(hasil.status_pertama)) ambil(sid).pertama = status;
  }

  const nomorSoal = Object.fromEntries(m.soal.map((s, i) => [s.id, i + 1]));
  const tampil = (l) => !l.tampil_jika_salah || l.tampil_jika_salah.some((sid) => keadaan[sid]?.pertama === "salah");

  function susunLayar() {
    const sebelum = {};
    const awal = [];
    for (const l of m.langkah) (l.sebelum ? (sebelum[l.sebelum] ??= []) : awal).push(l);
    const layar = awal.filter(tampil).map((data) => ({ jenis: "langkah", data }));
    for (const s of m.soal) {
      for (const l of sebelum[s.id] || []) if (tampil(l)) layar.push({ jenis: "langkah", data: l });
      layar.push({ jenis: "soal", data: s, nomor: nomorSoal[s.id] });
    }
    if (tes) layar.push({ jenis: "hasil" });
    return layar;
  }

  let posisi = 0;

  function render() {
    const layar = susunLayar();
    posisi = Math.min(posisi, layar.length - 1);
    const item = layar[posisi];
    let isi;
    if (item.jenis === "hasil") isi = layarHasil();
    else if (item.jenis === "soal") isi = layarSoal(item);
    else isi = item.data.jenis === "contoh" ? layarContoh(item.data) : layarTeks(item.data);

    const terakhir = posisi === layar.length - 1;
    // Mode tes: tahap harus dijawab dulu sebelum lanjut.
    const terkunci = tes && item.jenis === "soal" && !ambil(item.data.id).pertama;
    main.replaceChildren(
      h("div", { class: "kepala-modul" },
        h("a", { href: "#/beranda", class: "kembali" }, "← Daftar modul"),
        h("h1", {}, m.judul),
        h("div", { class: "bilah", role: "progressbar", "aria-label": `Layar ${posisi + 1} dari ${layar.length}`,
          "aria-valuemin": "1", "aria-valuemax": String(layar.length), "aria-valuenow": String(posisi + 1) },
          h("div", { style: `width:${((posisi + 1) / layar.length) * 100}%` })),
        h("p", { class: "redup kecil" }, `Layar ${posisi + 1} dari ${layar.length}`)),
      isi,
      h("nav", { class: "navigasi-layar" },
        h("button", { class: "tombol", disabled: posisi === 0, onclick: () => pindah(-1) }, "← Sebelumnya"),
        terakhir
          ? h("a", { class: "tombol utama", href: "#/beranda" }, "Selesai ✔")
          : h("button", { class: "tombol utama", disabled: terkunci, onclick: () => pindah(1),
            title: terkunci ? "Jawab dulu tahap ini" : false }, "Berikutnya →")),
    );
    main.querySelector("h2")?.focus({ preventScroll: true });
  }

  function pindah(arah) {
    posisi = Math.max(0, posisi + arah);
    render();
    window.scrollTo({ top: 0 });
  }

  function layarTeks(l) {
    return h("section", { class: "kartu" }, h("h2", { tabindex: "-1" }, l.judul), paragraf(l.isi));
  }

  // Contoh langkah demi langkah (temuan GL03): langkah dibuka satu per satu.
  function layarContoh(l) {
    const st = ambil(l.id);
    const daftar = h("ol", { class: "langkah-contoh" },
      l.langkah_contoh.slice(0, st.langkahTerlihat).map((t) => h("li", { html: sorot(t) })));
    const masihAda = st.langkahTerlihat < l.langkah_contoh.length;
    return h("section", { class: "kartu" },
      h("h2", { tabindex: "-1" }, l.judul),
      h("div", { class: "soal-cerita", html: sorot(l.soal) }),
      daftar,
      masihAda && h("button", { class: "tombol", onclick: () => { st.langkahTerlihat += 1; render(); } },
        `Tampilkan langkah ${st.langkahTerlihat + 1}`));
  }

  function layarSoal(item) {
    const s = item.data;
    const st = ambil(s.id);
    const areaHasil = h("div", { "aria-live": "polite" },
      st.hasil && kotakHasil(st.hasil),
      st.hasil?.poin > 0 && h("p", { class: "poin-baru" }, `+${st.hasil.poin} poin`),
      st.pembahasan && h("div", { class: "pembahasan" }, h("strong", {}, "Pembahasan"), paragraf(st.pembahasan)));

    let masukan;
    if (s.tipe === "pilihan") {
      masukan = h("fieldset", { class: "pilihan" },
        h("legend", { class: "sr-only" }, "Pilih jawaban"),
        urutanPilihan(s).map((p) =>
          h("label", { class: "opsi" },
            h("input", { type: "radio", name: s.id, value: p.id, checked: st.jawaban === p.id,
              onchange: (e) => { st.jawaban = e.target.value; } }),
            h("span", {}, p.teks))));
    } else {
      const input = h("input", {
        id: `jawab-${s.id}`, inputmode: "decimal", autocomplete: "off", maxlength: "40", value: st.jawaban,
        oninput: (e) => { st.jawaban = e.target.value; },
        onkeydown: (e) => { if (e.key === "Enter") periksaJawaban(); },
      });
      masukan = h("div", {},
        h("label", { for: `jawab-${s.id}` }, "Jawabanmu"),
        h("div", { class: "isian" },
          s.satuan === "rupiah" && h("span", { class: "awalan" }, "Rp"),
          input,
          s.satuan === "persen" && h("span", { class: "akhiran" }, "%")),
        h("small", { class: "redup" }, "Tulis angka saja. Contoh: 25.000 atau 12,5"));
    }

    async function periksaJawaban() {
      try {
        const hasil = await api(`/soal/${encodeURIComponent(s.id)}/jawab`, {
          method: "POST", body: { jawaban: st.jawaban, petunjuk_dipakai: st.petunjuk },
        });
        st.hasil = hasil;
        if (!st.pertama && hasil.status !== "tidak_valid") st.pertama = hasil.status;
        if (hasil.pembahasan) st.pembahasan = hasil.pembahasan;
      } catch (err) {
        areaHasil.replaceChildren(pesanGalat(err));
        return;
      }
      render();
    }

    // Petunjuk 3 tingkat, dibuka bertahap (temuan DS02). Mode tes: baru terbuka setelah menjawab.
    const bolehPetunjuk = !tes || st.pertama;
    const petunjuk = h("div", { class: "petunjuk" },
      s.petunjuk.slice(0, st.petunjuk).map((t, i) => h("p", {}, h("strong", {}, `Petunjuk ${i + 1}: `), t)));

    return h("section", { class: "kartu" },
      h("h2", { tabindex: "-1" }, tes ? `Tahap ${item.nomor} (skor ${s.skor})` : `Soal ${item.nomor}`),
      h("div", { class: "soal-cerita", html: sorot(s.teks) }),
      masukan,
      petunjuk,
      h("div", { class: "aksi" },
        h("button", { class: "tombol utama", onclick: periksaJawaban }, "Periksa"),
        bolehPetunjuk && st.petunjuk < s.petunjuk.length &&
          h("button", { class: "tombol", onclick: () => { st.petunjuk += 1; render(); } },
            `Petunjuk (${st.petunjuk + 1}/${s.petunjuk.length})`)),
      tes && !st.pertama && h("p", { class: "redup kecil" }, "Petunjuk terbuka setelah kamu menjawab tahap ini."),
      areaHasil);
  }

  function layarHasil() {
    const wadah = h("section", { class: "kartu" }, h("h2", { tabindex: "-1" }, "Hasil tes"), h("p", { class: "redup" }, "Menghitung…"));
    api(`/modul/${encodeURIComponent(id)}/hasil`).then((r) => {
      ganti(wadah,
        h("h2", { tabindex: "-1" }, "Hasil tes"),
        h("p", { class: "nilai-besar" }, h("strong", {}, `${r.total} / ${r.maks}`), ` · nilai ${r.nilai} · ${r.kategori}`),
        r.tahap_dijawab < r.jumlah_tahap &&
          h("p", { class: "hasil hasil-tidak_valid" }, `⚠ Masih ada ${r.jumlah_tahap - r.tahap_dijawab} tahap yang belum dijawab.`),
        h("div", { class: "gulir-x" },
          h("table", {},
            h("thead", {}, h("tr", {}, ["Soal", "Indikator", "Skor"].map((t) => h("th", { scope: "col" }, t)))),
            h("tbody", {}, r.butir.map((b) =>
              h("tr", {}, h("td", {}, `${b.nomor}. ${b.judul}`), h("td", {}, b.indikator), h("td", {}, `${b.skor} / ${b.maks}`)))))),
        h("p", { class: "redup kecil" }, "Skor dihitung dari jawaban pertama setiap tahap."));
    }).catch((err) => wadah.replaceChildren(pesanGalat(err)));
    return wadah;
  }

  render();
}
