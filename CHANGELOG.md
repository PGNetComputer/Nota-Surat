# Catatan perubahan

## 2026-10-31 (f)
- Tampilan admin warna hijau (ala Google Sheets). Halaman supplier tetap biru.

## 2026-10-31 (e)
- `BM_START` 2026-10-27 (daftar tampil mulai 27 Okt) dan `WAJIB_START` 2026-11-01 (pengingat DIRECT wajib nota).

## 2026-10-31 (d)
- Rekening penjual wajib (Nama rekening, Bank, No. rekening) untuk WhatsApp & Datang Langsung, di form Barang Masuk dan Manual. Terisi otomatis dari nota sebelumnya untuk penjual yang sama.

## 2026-10-31 (c)
- Transfer lebih besar dari total barang → nota mencetak *Total barang · Ditransfer PGNet · Sisa dana di penjual*; surat pernyataan menyebut sisa dana di penjual.

## 2026-10-31 (b)
- Menu **💬 Chat ke penjual**: 1 klik **Kirim pesan + video ke WhatsApp** (pesan jadi keterangan video), Salin pesan, Download video. Video diambil dari folder Drive aplikasi & disimpan di HP (IndexedDB).
- `CHAT_TEMPLATE` di Code.gs untuk mengubah pesan bawaan.

## 2026-10-31
- Sumber data: tab **Barang Masuk** (mulai 1 Nov 2026), tampilan kartu digeser per tanggal.
- DIRECT di atas, yang sudah dibuat nota di bawah (✓). Pop-up pengingat DIRECT wajib nota.
- Total dibayar bisa diedit (potongan ongkir tercetak di nota & surat pernyataan).
- Label kanal sesuai kolom C; judul kartu sesuai kolom D.
- Optimasi: cache ±90 KB/5 menit, render per baris, simpan di latar + antrian, LockService, anti-dobel, penjaga data rusak, baca/tulis per rentang, TextFinder.
- PIN admin dipindah ke Properti skrip (`ADMIN_PIN`).

## 2026-10-20
- Tempel dari WA (isi otomatis) · kanal Marketplace / Datang Langsung / WhatsApp · No. invoice marketplace.

## 2026-10-18
- Versi awal: nota + surat pernyataan, TTD 2×, PDF ke Drive, kirim ke WA PGNet.
