// Router sederhana berbasis hash: #/beranda, #/modul/m1, #/guru/3, dan seterusnya.
import { sesi } from "./api.js";
import { h, memuat, pesanGalat } from "./ui.js";
import { akun } from "./views/akun.js";
import { bukaKartuRumus, glosarium, kalkulator } from "./views/alat.js";
import { beranda } from "./views/beranda.js";
import { guru } from "./views/guru.js";
import { masuk } from "./views/masuk.js";
import { modul } from "./views/modul.js";
import { peringkat } from "./views/peringkat.js";

const RUTE = { masuk, beranda, modul, kalkulator, glosarium, peringkat, guru, akun };

const MENU_SISWA = [
  ["beranda", "📚", "Belajar"], ["kalkulator", "🧮", "Kalkulator"], ["glosarium", "📖", "Glosarium"],
  ["peringkat", "🏆", "Peringkat"], ["akun", "👤", "Akun"],
];
const MENU_GURU = [["guru", "🏫", "Kelas"], ["glosarium", "📖", "Glosarium"], ["akun", "👤", "Akun"]];

const main = document.getElementById("utama");
const nav = document.getElementById("menu");
const tombolRumus = document.getElementById("tombol-rumus");
tombolRumus.addEventListener("click", bukaKartuRumus);

function renderMenu(aktif) {
  if (!sesi.token) {
    nav.replaceChildren();
    tombolRumus.hidden = true;
    return;
  }
  tombolRumus.hidden = false;
  const menu = sesi.peran === "guru" ? MENU_GURU : MENU_SISWA;
  nav.replaceChildren(...menu.map(([nama, ikon, label]) =>
    h("a", { href: `#/${nama}`, "aria-current": nama === aktif ? "page" : false },
      h("span", { "aria-hidden": "true" }, ikon), h("span", {}, label))));
}

async function tampilkan() {
  const [nama = "", param] = location.hash.replace(/^#\/?/, "").split("/");
  let tujuan = RUTE[nama] ? nama : "";
  if (!sesi.token) tujuan = "masuk";
  else if (!tujuan || tujuan === "masuk") tujuan = sesi.peran === "guru" ? "guru" : "beranda";
  if (tujuan !== nama) {
    location.replace(`#/${tujuan}`);
    return;
  }
  renderMenu(tujuan === "modul" ? "beranda" : tujuan);
  main.replaceChildren(memuat());
  try {
    await RUTE[tujuan](main, param ? decodeURIComponent(param) : undefined);
  } catch (err) {
    main.replaceChildren(pesanGalat(err));
  }
}

window.addEventListener("hashchange", tampilkan);
tampilkan();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js").catch(() => {
    /* tanpa service worker aplikasi tetap jalan, hanya tidak bisa luring */
  });
}
