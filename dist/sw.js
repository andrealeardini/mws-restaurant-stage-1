const CACHE_NAME = 'MWS-restaurant-cache-v1';
const urlsToCache = ['/index.html',
    '/',
    '/restaurant.html',
    '/js/main_all.js',
    '/js/restaurant_all.js',
    '/css/main.css',
    '/css/main-media-screen.css',
    '/css/restaurants.css',
    '/css/restaurants-media-screen.css',
    '/img/1.jpg',
    '/img/2.jpg',
    '/img/3.jpg',
    '/img/4.jpg',
    '/img/5.jpg',
    '/img/6.jpg',
    '/img/7.jpg',
    '/img/8.jpg',
    '/img/9.jpg',
    '/img/10.jpg',
    '/img/1.webp',
    '/img/2.webp',
    '/img/3.webp',
    '/img/4.webp',
    '/img/5.webp',
    '/img/6.webp',
    '/img/7.webp',
    '/img/8.webp',
    '/img/9.webp',
    '/img/10.webp',
    '/img/icons-192.png',
    'img/icons-512.png',
    '/favicon.ico',
    '/favicon.png',
    '/manifest.json'
];

self.addEventListener('install', function (event) {
    // Perform install steps
    event.waitUntil(
        caches.open(CACHE_NAME)
        .then(function (cache) {
            console.log('Opened cache');
            return cache.addAll(urlsToCache);
        })
    );
});

self.addEventListener('activate', function (event) {

    const cacheWhitelist = [CACHE_NAME];

    event.waitUntil(
        caches.keys().then(function (cacheNames) {
            return Promise.all(
                cacheNames.map(function (cacheName) {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
})

self.addEventListener('fetch', function (event) {
    const requestUrl = new URL(event.request.url);
    if (requestUrl.origin === location.origin) {
        let option = {
            'ignoreSearch': false
        };
        if (requestUrl.search.startsWith("?id=")) {
            option = {
                'ignoreSearch': true
            };
        };
        event.respondWith(
            caches.match(event.request, option)
            .then(function (response) {
                // Cache hit - return response
                if (response) {
                    return response;
                }
                return fetch(event.request);
            })
        );
    }
});

self.addEventListener('message', function (event) {
    if (event.data.action === 'skipWaiting') {
        self.skipWaiting();
    }
});