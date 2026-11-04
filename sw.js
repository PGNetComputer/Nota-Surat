/* Service worker Nota PGNet — menerima notifikasi Firebase saat aplikasi tertutup */
importScripts('config.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js',
              'https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');
var cfg = self.APP_CFG && self.APP_CFG.FIREBASE;
if (cfg && cfg.apiKey) { firebase.initializeApp(cfg); firebase.messaging(); }
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });
