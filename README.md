# Nota & Surat Pernyataan Transaksi — PGNet

Aplikasi web (Google Apps Script) untuk nota pembelian + surat pernyataan keabsahan barang dari supplier, ditandatangani 2x oleh penjual, PDF dikirim ke WA PGNet.

## Link
- **Admin (masuk dengan PIN):** https://script.google.com/macros/s/AKfycbwELr_aZoLwhSdJ-wdSGhTsxLRLleXWeGh7Ug2FzHLNtjnKVo85FnLoehtdurocfofFSA/exec
- **Simulasi:** buka `simulasi.html` di GitHub Pages

> ⚠️ `Admin.html` & `Sign.html` **hanya berjalan di Google Apps Script**. Kalau dibuka lewat github.io,
> halaman otomatis dialihkan ke link Admin di atas. Login PIN hanya bisa di link `.../exec`.

## File
| File | Dipakai di |
|---|---|
| `Code.gs`, `Admin.html`, `Sign.html`, `appsscript.json` | **Google Apps Script** (tempel ke proyek "Nota & Surat Pernyataan") |
| `index.html`, `simulasi.html`, `tutorial-20detik.mp4` | GitHub Pages (halaman depan + simulasi) |
| `CARA-UPDATE.txt`, `CHANGELOG.md` | Catatan |

## PIN admin
Simpan di Apps Script → ⚙ Setelan proyek → **Properti skrip** → `ADMIN_PIN`. Tidak ikut tersimpan di GitHub.
`ADMIN_PIN: '1234'` di Code.gs hanya cadangan kalau Properti skrip kosong.

## Update aplikasi
Tempel file yang berubah ke Apps Script → Terapkan → Kelola deployment → ✏ → **Versi baru** → Terapkan → F5.
