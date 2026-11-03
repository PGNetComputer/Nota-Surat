# Nota & Surat Pernyataan Transaksi — PGNet

Nota pembelian + surat pernyataan keabsahan barang dari supplier, ditandatangani 2× oleh penjual, PDF dikirim ke WA PGNet.

## Link
- **Admin:** https://pgnetcomputer.github.io/Nota-Surat/
- **Penjual (tanda tangan):** https://pgnetcomputer.github.io/Nota-Surat/ttd.html?t=… — dibuat otomatis per transaksi
- **Simulasi:** https://pgnetcomputer.github.io/Nota-Surat/simulasi.html
- Server (Google Apps Script): https://script.google.com/macros/s/AKfycbwELr_aZoLwhSdJ-wdSGhTsxLRLleXWeGh7Ug2FzHLNtjnKVo85FnLoehtdurocfofFSA/exec

## Cara kerja
Tampilan ada di GitHub. Data, PIN, Sheet & PDF tetap di Google: halaman GitHub memanggil Apps Script lewat `doPost` (fungsi yang boleh dipanggil ada di daftar `API_` di Code.gs).

## File
| File | Dipakai di |
|---|---|
| `index.html` | GitHub — halaman **Admin** |
| `ttd.html` | GitHub — halaman **penjual** tanda tangan |
| `simulasi.html`, `tutorial-20detik.mp4`, PDF | GitHub — simulasi & panduan |
| `Code.gs`, `Admin.html`, `Sign.html`, `appsscript.json` | **Google Apps Script** (tempel ke proyek "Nota & Surat Pernyataan") |
| `build_github.py` | membuat ulang `index.html` & `ttd.html` dari `Admin.html` & `Sign.html` |

## PIN admin
Apps Script → ⚙ Setelan proyek → **Properti skrip** → `ADMIN_PIN` (tidak terlihat di GitHub).

## Update
1. Apps Script: tempel file yang berubah → Terapkan → Kelola deployment → ✏ → **Versi baru**.
2. GitHub: upload `index.html` / `ttd.html` terbaru.
