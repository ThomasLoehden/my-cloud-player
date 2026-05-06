const CACHE_NAME = 'cloudaudio-cache-v4';
const AUDIO_CACHE_NAME = 'cloudaudio-audio-v3';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Install event: cache the app shell
self.addEventListener('install', event => {
  self.skipWaiting(); // Force the waiting service worker to become the active service worker.
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Listen for messages from the main app (e.g., to download a track)
self.addEventListener('message', event => {
  if (event.data.type === 'DOWNLOAD_TRACK') {
    const { track, token } = event.data;
    if (!track || !token) return;

    const mediaUrl = `https://www.googleapis.com/drive/v3/files/${track.id}?alt=media`;

    event.waitUntil(
      caches.open(AUDIO_CACHE_NAME).then(cache => {
        console.log(`SW: Downloading track ${track.name}`);
        return fetch(mediaUrl, { headers: { 'Authorization': `Bearer ${token}` } })
          .then(response => {
            if (!response.ok) {
              throw new Error('Download failed: ' + response.statusText);
            }
            // Key the cache with the URL and store the full response
            return cache.put(mediaUrl, response);
          })
          .then(() => {
            // Send a message back to all clients on success
            self.clients.matchAll().then(clients => {
              clients.forEach(client => client.postMessage({ type: 'DOWNLOAD_COMPLETE', trackId: track.id }));
            });
          }).catch(error => console.error('SW Download Error:', error));
      })
    );
  } else if (event.data.type === 'DOWNLOAD_FOLDER') {
    const { tracks, token } = event.data;
    if (!tracks || !token || !Array.isArray(tracks)) return;

    event.waitUntil(
      (async () => {
        const audioCache = await caches.open(AUDIO_CACHE_NAME);
        console.log(`SW: Starting bulk download of ${tracks.length} tracks.`);
        for (const track of tracks) {
          const mediaUrl = `https://www.googleapis.com/drive/v3/files/${track.id}?alt=media`;
          
          // Check if already cached to avoid re-downloading
          const cachedResponse = await audioCache.match(mediaUrl);
          if (cachedResponse) {
            console.log(`SW: Track ${track.name} already cached. Skipping.`);
            // Still notify the client so the UI can update if it was out of sync
            self.clients.matchAll().then(clients => {
              clients.forEach(client => client.postMessage({ type: 'DOWNLOAD_COMPLETE', trackId: track.id }));
            });
            continue;
          }

          try {
            console.log(`SW: Downloading track ${track.name}`);
            const response = await fetch(mediaUrl, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) throw new Error(`Download failed for ${track.name}: ${response.statusText}`);
            
            await audioCache.put(mediaUrl, response);
            self.clients.matchAll().then(clients => {
              clients.forEach(client => client.postMessage({ type: 'DOWNLOAD_COMPLETE', trackId: track.id }));
            });
          } catch (error) {
            console.error(error);
          }
        }
      })()
    );
  } else if (event.data.type === 'DELETE_TRACK') {
    const { track } = event.data;
    if (!track) return;
    const mediaUrl = `https://www.googleapis.com/drive/v3/files/${track.id}?alt=media`;
    event.waitUntil(
      caches.open(AUDIO_CACHE_NAME).then(async (cache) => {
        const result = await cache.delete(mediaUrl);
        if (result) {
          console.log(`SW: Deleted track ${track.name}`);
          self.clients.matchAll().then(clients => {
            clients.forEach(client => client.postMessage({ type: 'DELETE_COMPLETE', trackId: track.id }));
          });
        } else {
          console.log(`SW: Track ${track.name} not found in cache for deletion.`);
        }
      })
    );
  } else if (event.data.type === 'DELETE_FOLDER') {
    const { tracks } = event.data;
    if (!tracks || !Array.isArray(tracks)) return;

    event.waitUntil(
      (async () => {
        const audioCache = await caches.open(AUDIO_CACHE_NAME);
        console.log(`SW: Starting bulk deletion of ${tracks.length} tracks.`);
        for (const track of tracks) {
          const mediaUrl = `https://www.googleapis.com/drive/v3/files/${track.id}?alt=media`;
          const result = await audioCache.delete(mediaUrl);
          if (result) {
            console.log(`SW: Deleted track ${track.name}`);
            self.clients.matchAll().then(clients => {
              clients.forEach(client => client.postMessage({ type: 'DELETE_COMPLETE', trackId: track.id }));
            });
          }
        }
      })()
    );
  }
});

// Activate event: clean up old caches
self.addEventListener('activate', event => {
  self.clients.claim(); // Become the service worker for all open clients.
  const currentCaches = [CACHE_NAME, AUDIO_CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (!currentCaches.includes(cacheName)) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch event: serve from cache or fetch from network
self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);

  // Ignore Google API and GSI calls.
  if (requestUrl.hostname === 'www.googleapis.com' || requestUrl.hostname === 'accounts.google.com') {
    return;
  }

  // For navigation requests (the HTML page), use a Network First strategy.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        // If the network fails, serve from the cache.
        return caches.match('/');
      })
    );
    return;
  }

  // For all other requests (assets like manifest.json), use a Cache First strategy.
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});