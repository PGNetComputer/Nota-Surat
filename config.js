/* ==== Pengaturan Firebase untuk notifikasi Nota PGNet ====
 * Isi 7 nilai di bawah dari Firebase (lihat Panduan-Notifikasi-Nota-PGNet.pdf, langkah B & C).
 * Nilai ini boleh terlihat publik (bukan kunci rahasia). Kunci rahasia (.json) disimpan di Apps Script, BUKAN di sini.
 */
self.APP_CFG = {
  FIREBASE: {
    apiKey: 'AIzaSyCqN58SYyk9hrINY2eephk7zABvPYCe3Us',
    authDomain: 'nota-pgnet.firebaseapp.com',
    projectId: 'nota-pgnet',
    storageBucket: 'nota-pgnet.firebasestorage.app',
    messagingSenderId: '908183426096',
    appId: '1:908183426096:web:176ccf6bced3b4b4f889f5',
    vapidKey: 'BBJ08CehdD5fbZgrnjDAaWOx_r1j9EX9lBNai2P6dYz57BY-8PEn6e6HYJdG6-H77VUMGYeCE48a6R8i7RidmL4'          // Cloud Messaging → Web Push certificates → Key pair
  }
};
