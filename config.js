/* ==== Pengaturan Firebase untuk notifikasi Nota PGNet ====
 * Isi 7 nilai di bawah dari Firebase (lihat Panduan-Notifikasi-Nota-PGNet.pdf, langkah B & C).
 * Nilai ini boleh terlihat publik (bukan kunci rahasia). Kunci rahasia (.json) disimpan di Apps Script, BUKAN di sini.
 */
self.APP_CFG = {
  FIREBASE: {
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: '',
    vapidKey: ''          // Cloud Messaging → Web Push certificates → Key pair
  }
};
