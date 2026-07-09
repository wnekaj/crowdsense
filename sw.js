// Crowdsense service worker.
// HTML and JS are network-first so the daily question is never stale;
// the cache is only a fallback for offline. Static assets are cache-first.
var CACHE = "crowdsense-v1";

self.addEventListener("install", function(){
  self.skipWaiting();
});

self.addEventListener("activate", function(e){
  e.waitUntil(
    caches.keys()
      .then(function(keys){ return Promise.all(keys.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); })); })
      .then(function(){ return self.clients.claim(); })
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
      fetch(req).then(function(res){
        var copy = res.clone();
        caches.open(CACHE).then(function(c){ c.put(req, copy); });
        return res;
      }).catch(function(){
        return caches.match(req).then(function(hit){ return hit || caches.match("./index.html"); });
      })
    );
  } else {
    e.respondWith(
      caches.match(req).then(function(hit){
        return hit || fetch(req).then(function(res){
          var copy = res.clone();
          caches.open(CACHE).then(function(c){ c.put(req, copy); });
          return res;
        });
      })
    );
  }
});
