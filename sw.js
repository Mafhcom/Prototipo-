// sw.js

// 1. Define el nombre de la caché y los archivos esenciales
const CACHE_NAME = 'recipientes-app-v1.4'; // Importante: Cambia la versión cuando actualices archivos
const urlsToCache = [
    '/', // Generalmente para index.html
    'index.html',
    'app.js',
    'styles.css',
    // Asegúrate de incluir cualquier fuente o recurso externo crítico,
    // como los iconos de Material Icons que usas en index.html
    'https://fonts.googleapis.com/icon?family=Material+Icons',
    'https://fonts.gstatic.com/s/materialicons/v140/flUhRq6tzZclQEJ-Vdg-I2TTn7lQ.woff2' // Ejemplo de una URL de fuente comúnmente usada
];

// 2. Evento 'install': Instala el Service Worker y guarda el contenido estático
self.addEventListener('install', (event) => {
    console.log('[Service Worker] Instalando y cacheando archivos...');
    event.waitUntil(
        caches.open(CACHE_NAME)
        .then((cache) => {
            // Agrega todos los archivos esenciales a la caché
            return cache.addAll(urlsToCache);
        })
        .then(() => self.skipWaiting()) // Forzar la activación inmediata
    );
});

// 3. Evento 'activate': Limpia cachés antiguas
self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Activando y limpiando cachés antiguas...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    // Si el nombre de la caché no coincide con la actual, la borra
                    if (cacheName !== CACHE_NAME) {
                        console.log('[Service Worker] Borrando caché antigua:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim()) // Tomar control de las páginas existentes
    );
});

// 4. Evento 'fetch': Intercepta solicitudes de red
self.addEventListener('fetch', (event) => {
    // Estrategia: Cache, luego Red (Cache-First)
    // Esto asegura que si tenemos el archivo en caché, lo servimos de inmediato (offline).
    event.respondWith(
        caches.match(event.request)
        .then((response) => {
            // Si el archivo está en caché, lo devuelve
            if (response) {
                return response;
            }
            // Si no está en caché, intenta ir a la red
            return fetch(event.request).catch((error) => {
                // Aquí podrías servir una página offline por defecto si la solicitud de red falla.
                console.error('[Service Worker] Fallo en la solicitud de red:', event.request.url, error);
            });
        })
    );
});