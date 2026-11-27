// Service worker: menyimpan tampilan aplikasi agar cepat dibuka dan bisa dipasang di HP.
// Data dari /api/ selalu diambil langsung dari server (tidak disimpan).
// Naikkan VERSI setiap kali file tampilan berubah.
const VERSI = "pasar-pintar-v9";
const BERKAS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./css/app.css",
  "./icons/ikon.svg",
  "./icons/ikon-192.png",
  "./icons/ikon-512.png",
  "./js/app.js",
  "./js/api.js",
  "./js/config.js",
  "./js/ui.js",
  "./js/local/acak.js",
  "./js/local/mesin.js",
  "./js/views/akun.js",
  "./js/views/alat.js",
  "./js/views/asisten.js",
  "./js/views/belajar.js",
  "./js/views/beranda.js",
  "./js/views/guru.js",
  "./js/views/ikon.js",
  "./js/views/ilustrasi.js",
  "./js/views/masuk.js",
  "./js/views/modul.js",
  "./js/views/peringkat.js",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSI).then((c) => c.addAll(BERKAS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((kunci) => Promise.all(kunci.filter((k) => k !== VERSI).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin || url.pathname.startsWith("/api/")) return;
  // Ambil dari jaringan dulu; bila luring, pakai salinan tersimpan.
  e.respondWith(
    fetch(e.request)
      .then((respons) => {
        const salinan = respons.clone();
        if (respons.ok) caches.open(VERSI).then((c) => c.put(e.request, salinan));
        return respons;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match("./index.html"))),
  );
});
