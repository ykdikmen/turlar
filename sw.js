// Turlar uygulaması · çevrimdışı açılış: uygulama dosyaları telefonda saklanır. Google'a giden istekler buraya uğramaz.
const KABUK = "turlar-kabuk-37967b3137";
const PAKET = "turlar-paket";
const DOSYALAR = ["./", "index.html", "manifest.webmanifest", "ikon-180.png", "ikon-192.png", "ikon-512.png"];
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(KABUK).then((c) => c.addAll(DOSYALAR)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((l) => Promise.all(l.filter((k) => k.startsWith("turlar-kabuk-") && k !== KABUK).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const r = e.request;
  if (r.method !== "GET") return;
  const u = new URL(r.url);
  if (u.origin !== self.location.origin) return;
  const ad = u.pathname.split("/").pop();
  if (/^uyg(-[\w-]+)?\.bin$/.test(ad)) { // değişmez: önce telefondaki kopya; en son ikisi dışındakiler silinir
    e.respondWith(caches.open(PAKET).then(async (c) => {
      const var_ = await c.match(r);
      if (var_) return var_;
      const y = await fetch(r);
      if (y.ok) {
        await c.put(r, y.clone());
        const l = await c.keys();
        if (l.length > 2) for (const k of l.slice(0, l.length - 2)) if (k.url !== r.url) await c.delete(k);
      }
      return y;
    }));
    return;
  }
  if (ad === "surum.json") { // her zaman güncel; internet yoksa son bilinen
    e.respondWith(fetch(r).then((y) => { const k = y.clone(); caches.open(KABUK).then((c) => c.put("surum.json", k)); return y; }).catch(() => caches.match("surum.json")));
    return;
  }
  // kabuk: telefondaki kopya hemen, arkadan güncellenir
  e.respondWith(caches.open(KABUK).then(async (c) => {
    const anahtar = r.mode === "navigate" ? "index.html" : r;
    const var_ = await c.match(anahtar, { ignoreSearch: r.mode === "navigate" });
    const ag = fetch(r).then((y) => { if (y.ok) c.put(anahtar, y.clone()); return y; }).catch(() => null);
    if (var_) { e.waitUntil(ag); return var_; }
    return (await ag) || new Response("Çevrimdışı", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }));
});
