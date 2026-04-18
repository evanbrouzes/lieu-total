// ─── SERVICE WORKER — Lieu Total ──────────────────────────────────────────────
// Mise en cache des ressources principales pour fonctionnement hors ligne.
// Version : changer ce numéro force la mise à jour du cache sur tous les appareils.
const CACHE_NAME = 'lieu-total-v1';

// Fichiers à mettre en cache au premier chargement
const BASE = '/lieu-total';
const PRECACHE = [
  BASE + '/',
  BASE + '/index.html',
  BASE + '/APPLI/manifest.json',
  BASE + '/APPLI/icons/icon-192.png',
  BASE + '/APPLI/icons/icon-512.png',
  BASE + '/APPLI/icons/apple-touch-icon.png',
  BASE + '/icons/logo.svg',
  BASE + '/icons/oeil.svg',
  BASE + '/icons/son.svg',
  BASE + '/icons/video.svg',
  BASE + '/icons/photo.svg',
  BASE + '/icons/texte.svg',
  BASE + '/icons/mounas.svg',
  // GeoJSON (mis en cache pour usage hors ligne)
  BASE + '/RESSOURCES/COUCHES/GEOJSON/cimetiere.geojson',
  BASE + '/RESSOURCES/COUCHES/GEOJSON/equipements_sportifs.geojson',
  BASE + '/RESSOURCES/COUCHES/GEOJSON/mounas.geojson',
  BASE + '/RESSOURCES/COUCHES/GEOJSON/ressources_et_materiaux.geojson',
  BASE + '/RESSOURCES/COUCHES/GEOJSON/terres_agricoles.geojson',
  BASE + '/RESSOURCES/COUCHES/GEOJSON/topographie.geojson',
];

// ── Installation : mise en cache initiale ─────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // On ignore les erreurs individuelles (fichiers absents = pas bloquant)
      return Promise.allSettled(
        PRECACHE.map(url => cache.add(url).catch(() => {}))
      );
    }).then(() => self.skipWaiting())
  );
});

// ── Activation : suppression des anciens caches ───────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch : stratégie Cache First, réseau en fallback ────────────────────────
// Pour les tuiles de carte (Leaflet/CartoDB) : réseau d'abord, cache ensuite
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Tuiles Leaflet et fonts CDN → réseau d'abord (toujours à jour)
  if (
    url.hostname.includes('basemaps.cartocdn.com') ||
    url.hostname.includes('unpkg.com') ||
    url.hostname.includes('fontshare.com') ||
    url.hostname.includes('cdnjs.cloudflare.com')
  ) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // Tout le reste → cache d'abord, réseau en fallback
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Mettre en cache les nouvelles réponses valides
        if (response && response.status === 200 && response.type !== 'opaque') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
