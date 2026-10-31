# Nota & Surat Pernyataan Transaksi — PGNet

Web app Google Apps Script untuk membuat **Nota Pembelian + Surat Pernyataan** keabsahan barang
bagi supplier PGNet. Supplier cukup membuka link, **tanda tangan 2×**, lalu mengirim PDF ke WhatsApp PGNet.

| | Link |
|---|---|
| **Admin Nota** (pakai PIN) | https://script.google.com/macros/s/AKfycbwELr_aZoLwhSdJ-wdSGhTsxLRLleXWeGh7Ug2FzHLNtjnKVo85FnLoehtdurocfofFSA/exec |
| Link supplier | dibuat otomatis per transaksi: `…/exec?t=<kode>` |
| Simulasi (tanpa server) | `docs/simulasi.html` (bisa dibuka lewat GitHub Pages) |

> ⚠️ Simpan repo ini sebagai **Private**. Kode berisi ID spreadsheet sumber data.
> PIN admin **tidak** disimpan di kode — isi lewat *Setelan proyek → Properti skrip → `ADMIN_PIN`*.

## Aturan pakai
1. Link dikirim hanya jika barang **sudah dites normal** dan **sudah ditransfer lunas**.
2. Sejak **1 November 2026**, setiap transaksi **DIRECT wajib** dikirim nota (ada pop-up pengingat).
3. Admin memilih transaksi dari tab **Barang Masuk** (spreadsheet TRANSAKSI), menyesuaikan **total dibayar**
   bila ada potongan ongkir, memilih kanal (WhatsApp / Datang Langsung untuk DIRECT), lalu **Buat Link**.
4. Supplier tanda tangan nota + surat pernyataan → PDF tersimpan di Drive & dikirim ke WA PGNet (0896-0534-5210).

## Fitur
- Daftar **Barang Masuk** digeser per tanggal; DIRECT di atas, yang sudah dibuat nota (✓) di bawah.
- Nama & kanal otomatis dari kolom C (Shopee/Tokopedia/TOCO/DIRECT) dan kolom D; awalan SP/TC/TP dibuang.
- Rekening penjual (nama, bank, no.) wajib untuk non-marketplace; isi otomatis dari nota sebelumnya.
- Total bisa diedit → nota mencetak *Subtotal barang · Potongan (ongkir) · Total Dibayar*.
- Transfer lebih dari total barang → tercetak *Ditransfer PGNet · Sisa dana di penjual* (nota & surat pernyataan).
- Simpan di latar belakang (antrian di browser), lencana status, kirim ulang hanya yang gagal.
- Cache data referensi 5 menit (dipotong ±90 KB), dipanaskan tiap 4 menit selama tab terlihat.
- Pengaman: LockService, anti-dobel per No. PUR & token, pakai data lama jika sumber berisi #REF!/#N/A atau anjlok > 50%.
- **💬 Chat ke penjual**: 1 klik kirim pesan + video tutorial 20 detik ke WhatsApp (menu bagikan HP), plus Salin pesan / Download video. Video = file video di folder Drive aplikasi, disimpan di HP setelah diunduh sekali.
- Tab **Manual** (tempel dari WA) untuk transaksi di luar Barang Masuk.

## Struktur
```
src/
  Code.gs           server: web app, sheet, cache, PDF
  Admin.html        halaman admin
  Sign.html         halaman tanda tangan supplier
  appsscript.json   manifest (zona waktu Jakarta, web app: Saya / Siapa saja)
docs/
  index.html        halaman GitHub Pages (tombol ke Admin & Simulasi)
  simulasi.html     simulasi alur admin → supplier (data contoh)
  tutorial-20detik.mp4  video tutorial supplier (dipakai simulasi)
.clasp.json.example contoh konfigurasi clasp (opsional)
```

## Konfigurasi (`src/Code.gs` → `CONFIG`)
| Kunci | Isi |
|---|---|
| `WA_PGNET` | `6289605345210` |
| `BM_SPREADSHEET_ID` | ID spreadsheet TRANSAKSI |
| `BM_SHEET` | `Barang Masuk` |
| `BM_START` | `2026-11-01` (transaksi sebelum tanggal ini diabaikan) |
| `PDF_LINK_PUBLIC` | `true` = link PDF bisa dibuka siapa saja yang punya link |

Kolom Barang Masuk yang dibaca: **B** tanggal · **C** jenis · **D** nama · **E** No. PUR · **I** barang · **J** qty · **M** harga.

## Pasang / update

### Cara A — salin-tempel (tanpa install apa pun)
1. Buka proyek di script.google.com (akun PGNet).
2. Tempel isi `src/Code.gs`, `src/Admin.html` → file **Admin**, `src/Sign.html` → file **Sign**. Simpan.
3. Pertama kali saja: jalankan fungsi `setup`, lalu isi *Properti skrip* `ADMIN_PIN`.
4. **Terapkan → Kelola deployment → Aplikasi web → ✏ → Versi baru → Terapkan** (URL tetap sama).
5. **Refresh (F5) semua tab/HP** yang membuka halaman admin.

### Cara B — clasp (dari komputer)
```bash
npm i -g @google/clasp
clasp login
cp .clasp.json.example .clasp.json   # isi scriptId (Setelan proyek → ID Skrip)
clasp push                            # unggah isi folder src/
clasp deploy -i <DEPLOYMENT_ID> -d "update"   # versi baru di URL yang sama
```
`DEPLOYMENT_ID` = bagian `AKfycb…` dari link admin.

## GitHub Pages (opsional)
Settings → Pages → *Deploy from a branch* → branch `main`, folder `/docs`.
Halaman berisi tombol ke Admin Nota dan simulasi.
