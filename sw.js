// Crowdsense service worker.
// HTML and JS are network-first (bypassing the HTTP cache) so the daily
// question is never stale; the cache is only a fallback for offline.
// Static assets are cache-first. Bumping CACHE purges every old cache on
// activate, and open tabs are reloaded so nobody is left on a stale bundle.
var CACHE = "crowdsense-v2";

// true when this worker replaces an older one (an update), false on the
// very first install — new visitors must never get reloaded mid-visit
var IS_UPDATE = false;

self.addEventListener("install", function(){
  IS_UPDATE = !!self.registration.active;
  self.skipWaiting();
});

self.addEventListener("activate", function(e){
  e.waitUntil(
    caches.keys()
      .then(function(keys){ return Promise.all(keys.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); })); })
      .then(function(){ return self.clients.claim(); })
      .then(function(){ return IS_UPDATE ? self.clients.matchAll({ type: "window" }) : []; })
      .then(function(clients){
        // One-time self-heal on updates: any page that was served by an older
        // worker (or its stale cache) reloads and picks up the fresh bundle.
        clients.forEach(function(client){
          if (client.url && client.url.indexOf(self.location.origin) === 0){
            client.navigate(client.url).catch(function(){});
          }
        });
      })
  );
});

self.addEventListener("fetch", function(e){
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  // Leave cross-origin requests (fonts, crowd API) to the browser.
  if (url.origin !== self.location.origin) return;

  var mustBeFresh = req.mode === "navigate" || /\.(js|html|webmanifest)$/.test(url.pathname) || url.pathname.endsWith("/");
  if (mustBeFresh){
    e.respondWith(
      // no-store skips the HTTP cache too, so a CDN/browser-cached copy
      // can never resurrect an old question schedule
      fetch(req, { cache: "no-store" }).then(function(res){
        if (res && res.ok){
          var copy = res.clone();
          caches.open(CACHE).then(function(c){ c.put(req, copy); });
        }
        return res;
      }).catch(function(){
        return caches.match(req).then(function(hit){ return hit || caches.match("./index.html"); });
      })
    );
  } else {
    e.respondWith(
      caches.match(req).then(function(hit){
        return hit || fetch(req).then(function(res){
          if (res && res.ok){
            var copy = res.clone();
            caches.open(CACHE).then(function(c){ c.put(req, copy); });
          }
          return res;
        });
      })
    );
  }
});
