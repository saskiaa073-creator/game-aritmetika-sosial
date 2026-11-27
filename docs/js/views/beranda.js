// Beranda siswa: sapaan, capaian hari ini, lanjutkan belajar, akses cepat, dan tips singkat.
// Sengaja ringkas (temuan DS03): sedikit teks, satu ajakan utama.
import { api, STATIS } from "../api.js";
import { formatAngka } from "../local/mesin.js";
import { ganti, h } from "../ui.js";
import { bukaKartuRumus } from "./alat.js";
import { ikon } from "./ikon.js";
import { gambarModul, ilustrasi, kelasLevel, NAMA_LEVEL } from "./ilustrasi.js";

const TIPS = [
  "Pembagi persentase untung dan rugi selalu harga beli, bukan harga jual.",
  "Ongkos angkut dan biaya perbaikan menambah harga beli seluruhnya.",
  "Untung kecil tapi persennya ratusan? Periksa lagi pembaginya.",
  "Untung atau rugi? Bandingkan dulu harga jual dengan harga beli.",
  "Barang yang rusak tidak bisa dijual. Kurangi dulu jumlahnya.",
  "Diskon 10% dari Rp80.000 sama dengan Rp8.000.",
];

function sapaan() {
  const jam = new Date().getHours();
  if (jam < 11) return "Selamat pagi";
  if (jam < 15) return "Selamat siang";
  if (jam < 18) return "Selamat sore";
  return "Selamat malam";
}

function cincin(persen) {
  const keliling = 2 * Math.PI * 34;
  const isi = (Math.min(100, persen) / 100) * keliling;
  return h("div", {
    class: "cincin", "aria-hidden": "true",
    html: `<svg viewBox="0 0 80 80"><circle cx="40" cy="40" r="34" class="cincin-latar"/>
      <circle cx="40" cy="40" r="34" class="cincin-isi" stroke-dasharray="${isi} ${keliling}" transform="rotate(-90 40 40)"/></svg>`,
  }, h("span", {}, `${Math.min(100, persen)}%`));
}

function ubin(href, namaIkon, judul, keterangan, onclick) {
  return h(onclick ? "button" : "a", { class: "ubin", href: onclick ? false : href, type: onclick ? "button" : false, onclick },
    h("span", { class: "ubin-ikon" }, ikon(namaIkon)),
    h("strong", {}, judul),
    h("span", { class: "redup kecil" }, keterangan));
}

export async function beranda(main) {
  const [saya, daftar, kelas] = await Promise.all([
    api("/saya"), api("/modul"), api("/peringkat?lingkup=kelas").catch(() => []),
  ]);
  const persen = Math.round((saya.poin_hari_ini / saya.sasaran_harian) * 100);
  const selesai = daftar.filter((m) => m.soal_benar === m.jumlah_soal).length;
  const lanjut = daftar.find((m) => m.soal_benar < m.jumlah_soal);
  const posisi = kelas.find((b) => b.saya)?.peringkat;
  const hari = Math.floor(Date.now() / 86_400_000);

  ganti(main,
    h("section", { class: "pahlawan" },
      h("div", { class: "pahlawan-teks" },
        h("p", { class: "pahlawan-sapa" }, `${sapaan()},`),
        h("h1", {}, `${saya.nama_panggilan}!`),
        h("p", { class: "gelembung-koko" }, persen >= 100
          ? "Sasaran hari ini tercapai. Hebat!"
          : lanjut ? `Yuk, lanjutkan "${lanjut.judul}".` : "Semua modul sudah selesai!")),
      ilustrasi(persen >= 100 ? "maskot-hore" : "maskot-senang", "pahlawan-gambar")),

    h("section", { class: "capaian", "aria-label": "Capaianmu" },
      h("div", { class: "capaian-sasaran" },
        cincin(persen),
        h("div", {},
          h("strong", {}, "Sasaran hari ini"),
          h("span", { class: "redup" }, `${saya.poin_hari_ini} dari ${saya.sasaran_harian} poin`))),
      h("div", { class: "capaian-kecil" },
        h("div", { class: "angka api" }, ikon("api"), h("strong", {}, saya.streak), h("span", { class: "redup kecil" }, "hari beruntun")),
        h("div", { class: "angka bintang" }, ikon("bintang"), h("strong", {}, formatAngka(saya.poin_total)), h("span", { class: "redup kecil" }, "total poin")),
        h("div", { class: "angka piala" }, ikon("piala"), h("strong", {}, posisi ? `#${posisi}` : "–"), h("span", { class: "redup kecil" }, STATIS ? "di perangkat" : "di kelas")))),

    lanjut
      ? h("a", { class: `kartu lanjut ${kelasLevel(lanjut)}`, href: `#/modul/${lanjut.id}` },
        gambarModul(lanjut.id, "lanjut-gambar"),
        h("div", { class: "lanjut-isi" },
          h("span", { class: "lencana" }, lanjut.soal_benar ? "Lanjutkan belajar" : "Mulai belajar"),
          h("h2", {}, lanjut.judul),
          h("div", { class: "bilah" }, h("div", { style: `width:${(lanjut.soal_benar / lanjut.jumlah_soal) * 100}%` })),
          h("span", { class: "redup kecil" }, `${NAMA_LEVEL[lanjut.level] || "Tes"} · ${lanjut.soal_benar} dari ${lanjut.jumlah_soal} soal`)),
        h("span", { class: "lanjut-panah" }, ikon("panah")))
      : h("div", { class: "kartu lanjut" }, ilustrasi("maskot-hore", "lanjut-gambar"),
        h("div", {}, h("h2", {}, "Semua modul selesai!"), h("span", { class: "redup" }, "Kamu bisa mengulang modul kapan saja."))),

    h("div", { class: "judul-bagian" },
      h("h2", {}, "Jalur belajarmu"),
      h("a", { href: "#/belajar" }, "Lihat semua →")),
    h("div", { class: "jalur-mini", "aria-label": `${selesai} dari ${daftar.length} modul selesai` },
      daftar.map((m, i) => h("a", {
        href: `#/modul/${m.id}`, title: m.judul, "aria-label": m.judul,
        class: `titik ${kelasLevel(m)} ${m.soal_benar === m.jumlah_soal ? "selesai" : m.soal_benar ? "berjalan" : ""}`,
      }, m.soal_benar === m.jumlah_soal ? ikon("centang") : h("span", {}, String(i + 1))))),
    h("p", { class: "redup kecil tengah" }, `${selesai} dari ${daftar.length} modul selesai`),

    h("h2", {}, "Akses cepat"),
    h("div", { class: "kisi-ubin" },
      ubin("#/kalkulator", "kalkulator", "Kalkulator", "Hitung langkah demi langkah"),
      ubin(null, "kartu", "Kartu rumus", "Semua rumus di satu tempat", bukaKartuRumus),
      ubin("#/glosarium", "glosarium", "Glosarium", "Arti istilah jual beli"),
      ubin("#/peringkat", "piala", "Peringkat", "Lihat posisimu")),

    h("aside", { class: "tips" },
      h("span", { class: "tips-ikon" }, ikon("lampu")),
      h("div", {}, h("strong", {}, "Tahukah kamu?"), h("p", {}, TIPS[hari % TIPS.length]))),
  );
}
