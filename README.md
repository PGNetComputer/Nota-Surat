# Nota & Surat Pernyataan Transaksi — PGNet

Aplikasi web (Google Apps Script) untuk nota pembelian + surat pernyataan keabsahan barang dari supplier, ditandatangani 2x oleh penjual, PDF dikirim ke WA PGNet.

## Link
- **Admin (masuk dengan PIN):** https://script.google.com/macros/s/AKfycbwELr_aZoLwhSdJ-wdSGhTsxLRLleXWeGh7Ug2FzHLNtjnKVo85FnLoehtdurocfofFSA/exec
- **Admin lewat GitHub:** https://pgnetcomputer.github.io/Nota-Surat/ (menampilkan aplikasi Google di atas)
- **Simulasi:** https://pgnetcomputer.github.io/Nota-Surat/simulasi.html

> `index.html` di GitHub hanya "jendela" ke aplikasi Google. Data, PIN & PDF tetap di Google.
> `Admin.html` & `Sign.html` adalah file Apps Script — kalau dibuka langsung di github.io, otomatis dialihkan.

## File
| File | Dipakai di |
|---|---|
| `Code.gs`, `Admin.html`, `Sign.html`, `appsscript.json` | **Google Apps Script** (tempel ke proyek "Nota & Surat Pernyataan") |
| `index.html` | GitHub Pages — membuka Admin Nota |
| `simulasi.html`, `tutorial-20detik.mp4` | GitHub Pages — simulasi |
| `CARA-UPDATE.txt`, `CHANGELOG.md` | Catatan |

## PIN admin
Simpan di Apps Script → ⚙ Setelan proyek → **Properti skrip** → `ADMIN_PIN`. Tidak ikut tersimpan di GitHub.
`ADMIN_PIN: '1234'` di Code.gs hanya cadangan kalau Properti skrip kosong.

## Update aplikasi
Tempel file yang berubah ke Apps Script → Terapkan → Kelola deployment → ✏ → **Versi baru** → Terapkan → F5.
