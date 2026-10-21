// Turlar uygulaması · çevrimdışı açılış: uygulama dosyaları telefonda saklanır. Google'a giden istekler buraya uğramaz.
const KABUK = "turlar-kabuk-a9a2cced65";
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
  if (ad === "sunucu.bin") return; // Google kodu: her seferinde doğrudan, saklanmaz
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

// ---- bildirimler: Google'dan gelen (şifreli) bildirim telefonda gösterilir; dokununca uygulama ilgili sayfada açılır ----
self.addEventListener("push", (e) => {
  let v = {};
  try { v = e.data ? e.data.json() : {}; } catch (x) { try { v = { metin: e.data.text() }; } catch (y) {} }
  const secenek = { body: v.metin || "", icon: "ikon-192.png", badge: "ikon-192.png", data: { url: v.url || "./", t: v.t || "", api: v.api || "" }, timestamp: v.zaman || Date.now() };
  if (Array.isArray(v.eylemler) && v.eylemler.length) secenek.actions = v.eylemler.slice(0, 2).map((x) => ({ action: x.action, title: x.title })); // Android: Onayla / Reddet
  if (v.etiket) { secenek.tag = v.etiket; secenek.renotify = true; }
  e.waitUntil(self.registration.showNotification(v.baslik || "Turlar", secenek));
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const d = e.notification.data || {};
  // bildirimin üstündeki Onayla / Reddet (Android): uygulamayı açmadan cevap
  if ((e.action === "evet" || e.action === "hayir") && d.t && d.api) {
    e.waitUntil(fetch(d.api, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ islem: "uygOnay", islev: "cevap", t: d.t, cevap: e.action }), redirect: "follow", credentials: "omit" })
      .then((r) => r.json()).then((j) => {
        if (j && j.hata) throw new Error(j.hata);
        return self.registration.showNotification(e.action === "evet" ? "Onaylandı ✓" : "Reddedildi", { body: (j && j.atayan ? j.atayan + " haberdar edildi." : "Cevabın kaydedildi."), icon: "ikon-192.png", tag: "cevap" });
      }).catch((x) => self.registration.showNotification("Cevap kaydedilemedi", { body: String((x && x.message) || x).slice(0, 120) + " · Uygulamayı açıp tekrar dene.", icon: "ikon-192.png", data: { url: d.url || "./" } })));
    return;
  }
  const hedef = new URL((e.notification.data && e.notification.data.url) || "./", self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((l) => {
    for (const c of l) {
      if (c.url.indexOf(self.registration.scope) === 0) { c.postMessage({ tur: "bildirim", url: hedef }); return c.focus(); }
    }
    return self.clients.openWindow(hedef);
  }));
});
