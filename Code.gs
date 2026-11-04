/**
 * NOTA & SURAT PERNYATAAN TRANSAKSI — PGNet
 * -------------------------------------------------------------
 * Alur:
 *  1. Admin buka web app (tanpa parameter) → login PIN → isi nota
 *     (tanggal, supplier, rekening, barang, kanal transaksi).
 *     Link HANYA dikirim jika barang sudah dites normal & sudah ditransfer lunas.
 *  2. Sistem membuat LINK khusus → dikirim ke supplier via WA.
 *  3. Supplier buka link → lihat Nota + Surat Pernyataan →
 *     tanda tangan 2x → PDF dibuat, disimpan di Drive,
 *     lalu supplier kirim PDF ke WA PGNet.
 *
 * Pemasangan: jalankan fungsi setup() sekali, lalu Deploy sebagai Web App
 * (Execute as: Me, Who has access: Anyone). Lihat CARA-PASANG.txt.
 */

const CONFIG = {
  NAMA_TOKO: 'PGNet',
  // Link tanda tangan untuk penjual (halaman di GitHub). Kosongkan '' untuk memakai link Google (…/exec).
  SIGN_URL: 'https://pgnetcomputer.github.io/Nota-Surat/ttd.html',
  WA_PGNET: '6289605345210',      // 089605345210
  ADMIN_PIN: '1234',               // cadangan saja. PIN asli simpan di Setelan proyek → Properti skrip: ADMIN_PIN
  KOTA: 'Bogor',
  PDF_LINK_PUBLIC: true,           // true = link PDF bisa dibuka siapa saja yg punya link
  NAMA_FOLDER: 'Nota & Surat Pernyataan PGNet',
  NAMA_SPREADSHEET: 'Nota & Surat Pernyataan Transaksi',

  // --- Sumber data: tab Barang Masuk (spreadsheet TRANSAKSI) ---
  BM_SPREADSHEET_ID: '1dg3eiQJxmiccOuBAIyOzCfBzzGricgeFiiykZZugTOw',
  BM_SHEET: 'Barang Masuk',
  BM_START: '2026-10-27',          // daftar Barang Masuk ditampilkan mulai tanggal ini
  WAJIB_START: '2026-11-01',       // DIRECT wajib nota (pop-up pengingat) mulai tanggal ini
  APP_URL: 'https://pgnetcomputer.github.io/Nota-Surat/',  // dibuka saat notifikasi diketuk
  JAM_PENGINGAT: 20,               // notifikasi harian jam 20.00 WIB

  // --- Akun admin. Password tiap akun disimpan di Properti skrip: PIN_AGDA, PIN_ERIK, PIN_RAFI, PIN_YUSWAN, PIN_FIKRI, PIN_SRI ---
  //   mode 'direct' = wajib membuat nota SEMUA transaksi DIRECT (lihat semua transaksi)
  //   cocok: '...'  = hanya transaksi Barang Masuk yang kolom D-nya memuat kata ini (nama supplier = nama dia)
  AKUN: {
    Agda:   { mode: 'direct' },
    Erik:   { cocok: 'ERIK' },
    Rafi:   { cocok: 'RAFI' },
    Yuswan: { cocok: 'YUSWAN' },
    Fikri:  { cocok: 'FIKRI' },
    Sri:    { cocok: 'SRI' },
  },
  CACHE_TTL: 300,                  // 5 menit

  // --- Template chat ke penjual (fitur "Chat ke penjual" di halaman admin) ---
  CHAT_TEMPLATE: 'Maaf bang saat ini saya perlu ada nota dan surat pernyataan, jika *selesai transaksi*\n\nNanti kita yang buat nota dan surat pernyataan, abang ttd aja',
  // Video tutorial: cukup unggah file videonya ke folder Drive NAMA_FOLDER (nama berisi "Tutorial" diutamakan).
  // Aplikasi menemukannya otomatis (tidak perlu dibagikan / dibuat publik).
  // Ganti video? Hapus video lama dari folder, unggah yang baru.
};

const KANAL_LIST = ['Marketplace', 'Datang Langsung', 'WhatsApp'];

const SHEET_NAME = 'Transaksi';
const HEADERS = [
  'ID', 'Token', 'No Nota', 'Tanggal', 'Nama Supplier', 'No WA Supplier',
  'Nama Rekening', 'Bank', 'No Rekening', 'Kanal', 'No Transaksi Marketplace',
  'Keterangan', 'Items (JSON)', 'Total',
  'Status', 'Dibuat', 'Ditandatangani', 'Link PDF',
  'Ref PUR', 'Subtotal Barang', 'Bukti TF', 'Dibuat Oleh'
];
const COL = HEADERS.reduce((o, h, i) => (o[h] = i, o), {});

const STATUS_MENUNGGU = 'Menunggu TTD';
const STATUS_SELESAI = 'Sudah TTD';

/* ============================== SETUP ============================== */

function setup() {
  const props = PropertiesService.getScriptProperties();
  let ssId = props.getProperty('SS_ID');
  let ss;
  if (ssId) {
    ss = SpreadsheetApp.openById(ssId);
  } else {
    try { ss = SpreadsheetApp.getActiveSpreadsheet(); } catch (e) { ss = null; }
    if (!ss) ss = SpreadsheetApp.create(CONFIG.NAMA_SPREADSHEET);
    props.setProperty('SS_ID', ss.getId());
  }
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) sh = ss.insertSheet(SHEET_NAME);
  sh.getRange(1, 1, sh.getMaxRows(), HEADERS.length).setNumberFormat('@'); // simpan semua sebagai teks
  sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold').setBackground('#1f3a5f').setFontColor('#ffffff');
  sh.setFrozenRows(1);

  if (!props.getProperty('FOLDER_ID')) {
    const folder = DriveApp.createFolder(CONFIG.NAMA_FOLDER);
    props.setProperty('FOLDER_ID', folder.getId());
  }
  Logger.log('Spreadsheet: ' + ss.getUrl());
  Logger.log('Folder PDF : ' + DriveApp.getFolderById(props.getProperty('FOLDER_ID')).getUrl());
}

let SHEET_CACHE_ = null;
function getSheet_() {
  if (SHEET_CACHE_) return SHEET_CACHE_;
  const id = PropertiesService.getScriptProperties().getProperty('SS_ID');
  if (!id) throw new Error('Belum setup. Jalankan fungsi setup() dulu di editor Apps Script.');
  const sh = SpreadsheetApp.openById(id).getSheetByName(SHEET_NAME);
  // pastikan judul kolom baru (Ref PUR, Subtotal Barang) ada — 1x baca/tulis per rentang
  const head = sh.getRange(1, 1, 1, HEADERS.length).getDisplayValues()[0];
  if (head.join('|') !== HEADERS.join('|')) {
    sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold').setBackground('#1f3a5f').setFontColor('#ffffff');
  }
  SHEET_CACHE_ = sh;
  return sh;
}

function getFolder_() {
  const id = PropertiesService.getScriptProperties().getProperty('FOLDER_ID');
  return DriveApp.getFolderById(id);
}

/* ============================== WEB APP ============================== */

/* ============================== API untuk halaman GitHub ==============================
 * Halaman admin (index.html) & penjual (ttd.html) di GitHub memanggil fungsi di bawah lewat POST.
 * Hanya fungsi di daftar API_ yang bisa dipanggil; fungsi admin tetap dicek PIN-nya. */
const API_ = {
  adminBoot: adminBoot, signBoot: signBoot, adminLogin: adminLogin, createTrx: createTrx, listTrx: listTrx,
  deleteTrx: deleteTrx, getBM: getBM, getChatKit: getChatKit, getVideoData: getVideoData, submitSignature: submitSignature,
  uploadBukti: uploadBukti, simpanTokenPush: simpanTokenPush, tesNotif: tesNotif
};
function doPost(e) {
  let out;
  try {
    const req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const fn = API_[req.fn];
    if (!fn) throw new Error('Fungsi tidak dikenal.');
    out = { ok: true, result: fn.apply(null, req.args || []) };
  } catch (err) {
    out = { ok: false, error: String(err && err.message || err) };
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}
function cfgPublic_() { return { nama: CONFIG.NAMA_TOKO, wa: CONFIG.WA_PGNET, kota: CONFIG.KOTA }; }
function adminBoot() {
  return { payload: { kanal: KANAL_LIST, url: signBase_(), start: CONFIG.BM_START, wajib: CONFIG.WAJIB_START, akun: Object.keys(CONFIG.AKUN) }, cfg: cfgPublic_() };
}
function signBoot(token) {
  const trx = token ? findByToken_(String(token)) : null;
  return { payload: trx ? publicView_(trx) : null, cfg: cfgPublic_() };
}

function doGet(e) {
  const token = e && e.parameter && e.parameter.t;
  let t;
  if (token) {
    const trx = findByToken_(String(token));
    t = HtmlService.createTemplateFromFile('Sign');
    t.payload = safeJson_(trx ? publicView_(trx) : null);
  } else {
    t = HtmlService.createTemplateFromFile('Admin');
    t.payload = safeJson_({ kanal: KANAL_LIST, url: signBase_(), start: CONFIG.BM_START, wajib: CONFIG.WAJIB_START, akun: Object.keys(CONFIG.AKUN) });
  }
  t.cfg = safeJson_({ nama: CONFIG.NAMA_TOKO, wa: CONFIG.WA_PGNET, kota: CONFIG.KOTA });
  return t.evaluate()
    .setTitle(token ? 'Nota & Surat Pernyataan' : 'Admin Nota ' + CONFIG.NAMA_TOKO)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/* ============================== ADMIN API ============================== */

function checkPin_(pin) {
  pin = String(pin || '');
  const i = pin.indexOf('|');
  if (i > 0) {                                   // akun bernama: "Nama|password"
    const nama = pin.slice(0, i), kode = pin.slice(i + 1), cfg = CONFIG.AKUN[nama];
    if (!cfg) throw new Error('Akun tidak dikenal.');
    const real = PropertiesService.getScriptProperties().getProperty('PIN_' + nama.toUpperCase());
    if (!real) throw new Error('Password akun ' + nama + ' belum dibuat. Minta Kak Sri mengisi PIN_' + nama.toUpperCase() + ' di Properti skrip.');
    if (kode !== String(real)) throw new Error('Password salah.');
    return { nama: nama, mode: cfg.mode || 'nama', cocok: cfg.cocok || '' };
  }
  // PIN admin utama (Pak Hani) — lihat semua
  const real = PropertiesService.getScriptProperties().getProperty('ADMIN_PIN') || CONFIG.ADMIN_PIN;
  if (pin !== String(real)) throw new Error('PIN salah.');
  return { nama: 'Admin', mode: 'semua', cocok: '' };
}

function milikAkun_(akun, t) {
  if (!akun || akun.mode !== 'nama') return true;
  return new RegExp('\\b' + akun.cocok.replace(/[^\w ]/g, '') + '\\b', 'i').test(String(t.d || ''));
}
function wajibAkun_(akun, t) {
  return akun.mode === 'nama' ? milikAkun_(akun, t) : /^direct$/i.test(t.jenis || '');
}

function adminLogin(pin) {
  const a = checkPin_(pin);
  return { nama: a.nama, mode: a.mode };
}

function createTrx(pin, d) {
  const akun = checkPin_(pin);
  d = d || {};
  if (d.konfirmasi !== true) throw new Error('Centang konfirmasi: barang sudah dites normal & sudah ditransfer.');
  const token = /^[a-z0-9]{16,40}$/.test(String(d.token || '')) ? String(d.token) : Utilities.getUuid().replace(/-/g, '').slice(0, 20);
  let rec;
  if (d.pur) {
    // --- dari Barang Masuk: server penentu akhir (data barang diambil ulang dari sumber) ---
    const tx = findBMTx_(String(d.pur));
    if (!tx) throw new Error('Transaksi ' + d.pur + ' tidak ditemukan di Barang Masuk (mulai ' + CONFIG.BM_START + ').');
    if (!milikAkun_(akun, tx)) throw new Error('Transaksi ini bukan atas nama ' + akun.nama + '.');
    const info = deriveBM_(tx);
    let kanal = info.kanal;
    if (!kanal) {
      if (['WhatsApp', 'Datang Langsung'].indexOf(d.kanal) < 0) throw new Error('Pilih kanal: WhatsApp atau Datang Langsung.');
      kanal = d.kanal;
    }
    const items = tx.items.map(i => ({ nama: i.nama, qty: i.qty, harga: i.harga, subtotal: i.qty * i.harga }));
    const subtotal = items.reduce((s, i) => s + i.subtotal, 0);
    const total = Math.round(Number(d.totalBayar) || subtotal);
    let namaRek = info.rek, bank = '', noRek = '';
    if (kanal !== 'Marketplace') {
      namaRek = String(d.namaRek || '').trim();
      bank = String(d.bank || '').trim();
      noRek = String(d.noRek || '').replace(/[^\d]/g, '');
      if (!namaRek) throw new Error('Nama rekening wajib diisi.');
      if (!bank) throw new Error('Bank wajib diisi.');
      if (noRek.length < 6) throw new Error('No. rekening wajib diisi (minimal 6 angka).');
    }
    rec = { tanggal: tx.tgl, supplier: info.nama, namaRek: namaRek, bank: bank, noRek: noRek, kanal: kanal,
            noTrxMp: info.inv, keterangan: info.platform, items: items, subtotal: subtotal, total: total, pur: tx.pur };
  } else {
    // --- input manual / tempel dari WA ---
    const tanggal = String(d.tanggal || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) throw new Error('Tanggal wajib diisi.');
    if (KANAL_LIST.indexOf(d.kanal) < 0) throw new Error('Pilih kanal transaksi dulu.');
    const isMp = d.kanal === 'Marketplace';
    const supplier = String(d.supplier || '').trim();
    if (!supplier && !isMp) throw new Error('Nama supplier wajib diisi.');
    const namaRek = String(d.namaRek || '').trim() || (isMp ? 'Rekening Marketplace' : '');
    if (!namaRek) throw new Error('Nama rekening wajib diisi.');
    if (!isMp) {
      if (!String(d.bank || '').trim()) throw new Error('Bank wajib diisi.');
      if (String(d.noRek || '').replace(/[^\d]/g, '').length < 6) throw new Error('No. rekening wajib diisi (minimal 6 angka).');
    }
    if (isMp && !String(d.noTrxMp || '').trim()) throw new Error('No. invoice marketplace wajib diisi.');
    const items = (d.items || [])
      .map(it => ({ nama: String(it.nama || '').trim(), qty: Number(it.qty) || 0, harga: Number(it.harga) || 0 }))
      .filter(it => it.nama && it.qty > 0);
    if (!items.length) throw new Error('Minimal 1 barang dengan qty > 0.');
    items.forEach(it => it.subtotal = it.qty * it.harga);
    const subtotal = items.reduce((s, it) => s + it.subtotal, 0);
    rec = { tanggal: tanggal, supplier: supplier, namaRek: namaRek, bank: String(d.bank || '').trim(), noRek: String(d.noRek || '').replace(/[^\d]/g, ''),
            kanal: d.kanal, noTrxMp: isMp ? String(d.noTrxMp || '').trim() : '', keterangan: '', items: items,
            subtotal: subtotal, total: subtotal, pur: '' };
  }
  if (!(rec.total > 0)) throw new Error('Total dibayar harus lebih dari 0.');
  rec.bukti = cleanBukti_(d.bukti);

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sh = getSheet_();
    // penjaga entri kembar: token sama = kiriman ulang (kembalikan hasil lama), PUR sama = sudah pernah dibuat
    const sameTok = findRow_(sh, COL['Token'], token);
    if (sameTok) return resultFromRow_(sameTok.values);
    if (rec.pur) {
      const samePur = findRow_(sh, COL['Ref PUR'], rec.pur);
      if (samePur) throw new Error('DUPLIKAT: ' + rec.pur + ' sudah dibuat nota (' + samePur.values[COL['No Nota']] + ').');
    }
    const noNota = nextNoNota_(sh, rec.tanggal);
    const now = Utilities.formatDate(new Date(), tz_(), 'yyyy-MM-dd HH:mm:ss');
    const row = new Array(HEADERS.length).fill('');
    row[COL['ID']] = Utilities.getUuid();
    row[COL['Token']] = token;
    row[COL['No Nota']] = noNota;
    row[COL['Tanggal']] = rec.tanggal;
    row[COL['Nama Supplier']] = rec.supplier;
    row[COL['No WA Supplier']] = normWa_(d.waSupplier);
    row[COL['Nama Rekening']] = rec.namaRek;
    row[COL['Bank']] = rec.bank;
    row[COL['No Rekening']] = rec.noRek;
    row[COL['Kanal']] = rec.kanal;
    row[COL['No Transaksi Marketplace']] = rec.noTrxMp;
    row[COL['Keterangan']] = rec.keterangan;
    row[COL['Items (JSON)']] = JSON.stringify(rec.items);
    row[COL['Total']] = String(rec.total);
    row[COL['Status']] = STATUS_MENUNGGU;
    row[COL['Dibuat']] = now;
    row[COL['Ref PUR']] = rec.pur;
    row[COL['Subtotal Barang']] = String(rec.subtotal);
    row[COL['Bukti TF']] = rec.bukti.length ? JSON.stringify(rec.bukti) : '';
    row[COL['Dibuat Oleh']] = akun.nama;
    const at = sh.getLastRow() + 1;
    sh.getRange(at, 1, 1, HEADERS.length).setNumberFormat('@').setValues([row]); // tulis 1 rentang
    return resultFromRow_(row);
  } finally {
    lock.releaseLock();
  }
}

function resultFromRow_(v) {
  return { noNota: v[COL['No Nota']], link: signBase_() + '?t=' + v[COL['Token']], token: v[COL['Token']],
           waSupplier: v[COL['No WA Supplier']], pur: v[COL['Ref PUR']] || '' };
}

function listTrx(pin) {
  const akun = checkPin_(pin);
  const sh = getSheet_();
  const last = sh.getLastRow();
  if (last < 2) return [];
  const from = Math.max(2, last - 299);                 // cukup 300 nota terakhir
  const vals = sh.getRange(from, 1, last - from + 1, HEADERS.length).getDisplayValues();
  const base = signBase_();
  return vals.filter(r => r[COL['ID']]).map(r => ({
    id: r[COL['ID']],
    noNota: r[COL['No Nota']],
    tanggal: r[COL['Tanggal']],
    supplier: r[COL['Nama Supplier']],
    waSupplier: r[COL['No WA Supplier']],
    kanal: r[COL['Kanal']],
    noTrxMp: r[COL['No Transaksi Marketplace']],
    total: Number(r[COL['Total']]) || 0,
    pur: r[COL['Ref PUR']] || '',
    status: r[COL['Status']],
    signedAt: r[COL['Ditandatangani']],
    pdf: r[COL['Link PDF']],
    link: base + '?t=' + r[COL['Token']],
    oleh: r[COL['Dibuat Oleh']] || '',
  })).filter(x => akun.mode !== 'nama' || x.oleh === akun.nama || milikPur_(akun, x.pur)).reverse();
}
function milikPur_(akun, pur) {
  if (!pur) return false;
  if (!milikPur_.set) { const s = {}; getBMData_(false).tx.forEach(t => { if (milikAkun_(akun, t)) s[t.pur] = 1; }); milikPur_.set = s; }
  return !!milikPur_.set[pur];
}

function deleteTrx(pin, id) {
  if (checkPin_(pin).mode === 'nama') throw new Error('Hapus nota hanya bisa oleh Agda / admin.');
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sh = getSheet_();
    const found = findRow_(sh, COL['ID'], id);
    if (!found) throw new Error('Transaksi tidak ditemukan.');
    if (found.values[COL['Status']] === STATUS_SELESAI) throw new Error('Transaksi yang sudah ditandatangani tidak bisa dihapus.');
    sh.deleteRow(found.row);
    return true;
  } finally {
    lock.releaseLock();
  }
}

/* ============================== SUPPLIER API ============================== */

function submitSignature(token, sigNota, sigPernyataan) {
  const re = /^data:image\/png;base64,[A-Za-z0-9+/=]+$/;
  if (!re.test(sigNota || '') || !re.test(sigPernyataan || '')) throw new Error('Tanda tangan belum lengkap.');
  if (sigNota.length > 1500000 || sigPernyataan.length > 1500000) throw new Error('Ukuran tanda tangan terlalu besar.');

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sh = getSheet_();
    const found = findRow_(sh, COL['Token'], token);
    if (!found) throw new Error('Link tidak valid.');
    const trx = rowToTrx_(found.values);
    if (trx.status === STATUS_SELESAI) {
      return { already: true, url: trx.pdf, fileName: fileName_(trx) };
    }
    const signedAt = Utilities.formatDate(new Date(), tz_(), 'yyyy-MM-dd HH:mm:ss');
    trx.buktiImgs = buktiImgs_(trx.bukti);
    const html = buildPdfHtml_(trx, sigNota, sigPernyataan, signedAt);
    const blob = Utilities.newBlob(html, 'text/html', 'nota.html').getAs('application/pdf').setName(fileName_(trx));
    const file = getFolder_().createFile(blob);
    if (CONFIG.PDF_LINK_PUBLIC) {
      try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) { /* domain policy */ }
    }
    const url = file.getUrl();
    // tulis Status..Link PDF sekaligus (1 rentang, bukan per sel)
    const c0 = COL['Status'], seg = found.values.slice(c0, COL['Link PDF'] + 1);
    seg[0] = STATUS_SELESAI;
    seg[COL['Ditandatangani'] - c0] = signedAt;
    seg[COL['Link PDF'] - c0] = url;
    sh.getRange(found.row, c0 + 1, 1, seg.length).setValues([seg]);
    return {
      already: false,
      url: url,
      fileName: fileName_(trx),
      base64: Utilities.base64Encode(blob.getBytes()),
    };
  } finally {
    lock.releaseLock();
  }
}

/* ============================== PDF ============================== */

function buildPdfHtml_(t, sigNota, sigPernyataan, signedAt) {
  const rows = t.items.map((it, i) =>
    '<tr><td class="c">' + (i + 1) + '</td><td>' + esc_(it.nama) + '</td><td class="c">' + it.qty +
    '</td><td class="r">' + rp_(it.harga) + '</td><td class="r">' + rp_(it.subtotal) + '</td></tr>').join('');


  const rekLine = esc_(t.namaRek) + (t.bank ? ' — ' + esc_(t.bank) : '') + (t.noRek ? ' ' + esc_(t.noRek) : '');
  const kanalLine = kanalText_(t);

  const css =
    'body{font-family:Arial,Helvetica,sans-serif;font-size:11pt;color:#111;margin:0}' +
    '.page{padding:6px 4px}' +
    'h1{font-size:16pt;margin:0 0 2px 0;letter-spacing:1px}' +
    '.muted{color:#555;font-size:9.5pt}' +
    '.hdr{border-bottom:2px solid #1f3a5f;padding-bottom:6px;margin-bottom:12px}' +
    'table{border-collapse:collapse;width:100%}' +
    '.info td{padding:3px 4px;vertical-align:top}' +
    '.items th{background:#e3e8ef;color:#111;padding:6px;font-size:10pt;border:1px solid #888}' +
    '.items td{border:1px solid #bbb;padding:5px 6px;font-size:10pt}' +
    '.c{text-align:center}.r{text-align:right}' +
    '.sig{width:240px;text-align:center;margin-left:auto;margin-top:18px}' +
    '.sig img{width:200px;height:auto}' +
    '.line{border-top:1px solid #111;padding-top:3px;font-weight:bold}' +
    'ol li{margin-bottom:6px}' +
    'p{line-height:1.5;margin:6px 0}';

  const sigBlock = (img, label) =>
    '<div class="sig"><div>' + label + '</div><img src="' + img + '"/><div class="line">' + (esc_(t.supplier) || '&nbsp;') + '</div></div>';
  const isMp = t.kanal === 'Marketplace';
  const nTf = (t.bukti || []).length;
  const bayarLine = (isMp ? '<b>LUNAS</b>, dibayar melalui marketplace' : '<b>LUNAS</b>, ditransfer ke rekening di atas') +
    (nTf ? ' (' + (nTf > 1 ? nTf + '× transfer, ' : '') + 'bukti terlampir)' : '');
  const supLabel = isMp ? 'Nama Toko' : 'Nama Supplier / Penjual';

  const nota =
    '<div class="page">' +
    '<div class="hdr"><h1>NOTA PEMBELIAN</h1><div class="muted">' + esc_(CONFIG.NAMA_TOKO) + ' · ' + esc_(CONFIG.KOTA) + '</div></div>' +
    '<table class="info">' +
    '<tr><td width="34%">No. Nota</td><td>: <b>' + esc_(t.noNota) + '</b>' + (t.pur ? ' <span class="muted">(Ref. ' + esc_(t.pur) + ')</span>' : '') + '</td></tr>' +
    '<tr><td>Tanggal</td><td>: ' + tglIndo_(t.tanggal) + '</td></tr>' +
    (t.supplier ? '<tr><td>' + supLabel + '</td><td>: ' + esc_(t.supplier) + '</td></tr>' : '') +
    '<tr><td>Nama Rekening</td><td>: ' + rekLine + '</td></tr>' +
    '<tr><td>Transaksi melalui</td><td>: ' + kanalLine + '</td></tr>' +
    '<tr><td>Pembayaran</td><td>: ' + bayarLine + '</td></tr>' +
    '</table><br/>' +
    '<table class="items"><tr><th width="6%">No</th><th>Nama Barang</th><th width="8%">Qty</th><th width="20%">Harga</th><th width="22%">Subtotal</th></tr>' +
    rows +
    (t.subtotal && t.total > t.subtotal
      ? '<tr><td colspan="4" class="r"><b>Total barang</b></td><td class="r"><b>' + rp_(t.subtotal) + '</b></td></tr>' +
        '<tr><td colspan="4" class="r">Ditransfer PGNet</td><td class="r">' + rp_(t.total) + '</td></tr>' +
        '<tr><td colspan="4" class="r">Sisa dana di penjual</td><td class="r">' + rp_(t.total - t.subtotal) + '</td></tr>'
      : t.subtotal && t.subtotal !== t.total
      ? '<tr><td colspan="4" class="r">Subtotal barang</td><td class="r">' + rp_(t.subtotal) + '</td></tr>' +
        '<tr><td colspan="4" class="r">' + (t.total < t.subtotal ? 'Potongan (ongkir, dll.)' : 'Tambahan') + '</td><td class="r">' + (t.total < t.subtotal ? '−' : '+') + rp_(Math.abs(t.subtotal - t.total)) + '</td></tr>' +
        '<tr><td colspan="4" class="r"><b>Total Dibayar</b></td><td class="r"><b>' + rp_(t.total) + '</b></td></tr>'
      : '<tr><td colspan="4" class="r"><b>Total</b></td><td class="r"><b>' + rp_(t.total) + '</b></td></tr>') +
    '</table>' +
    sigBlock(sigNota, 'Penjual,') +
    '<p class="muted" style="margin-top:20px">Ditandatangani secara elektronik pada ' + esc_(signedAt) + ' WIB.</p>' +
    '</div>';

  const pernyataan =
    '<div class="page" style="page-break-before:always">' +
    '<div class="hdr" style="text-align:center"><h1>SURAT PERNYATAAN</h1><div class="muted">Keabsahan Barang yang Dijual</div></div>' +
    '<p>Saya yang bertanda tangan di bawah ini:</p>' +
    '<table class="info">' +
    (t.supplier ? '<tr><td width="34%">' + supLabel + '</td><td>: ' + esc_(t.supplier) + '</td></tr>' : '') +
    (t.waSupplier ? '<tr><td>No. WhatsApp</td><td>: ' + esc_(t.waSupplier) + '</td></tr>' : '') +
    '<tr><td>Nama Rekening</td><td>: ' + rekLine + '</td></tr>' +
    '</table>' +
    '<p>menyatakan dengan sebenarnya bahwa barang yang saya jual kepada <b>' + esc_(CONFIG.NAMA_TOKO) +
    '</b> sebagaimana tercantum dalam <b>Nota No. ' + esc_(t.noNota) + '</b> tanggal ' + tglIndo_(t.tanggal) +
    ' (transaksi melalui ' + kanalLine + ') adalah:</p>' +
    '<ol>' +
    '<li>Milik saya yang sah atau saya peroleh dengan cara yang sah;</li>' +
    '<li><b>Bukan barang hasil curian</b>, penggelapan, penipuan, penadahan, atau hasil tindak pidana lainnya;</li>' +
    '<li>Tidak sedang dalam sengketa, dijaminkan, atau disita oleh pihak mana pun.</li>' +
    '</ol>' +
    (t.subtotal && t.total > t.subtotal
      ? '<p>Saya telah menerima pembayaran sebesar <b>' + rp_(t.total) + '</b> ' + (isMp ? 'melalui marketplace' : 'melalui transfer ke rekening di atas') + ' untuk barang senilai <b>' + rp_(t.subtotal) + '</b>, dengan <b>sisa dana di penjual sebesar ' + rp_(t.total - t.subtotal) + '</b>.</p>'
      : '<p>Saya telah menerima pembayaran atas barang tersebut secara <b>lunas</b> sebesar <b>' + rp_(t.total) + '</b> ' + (isMp ? 'melalui marketplace' : 'melalui transfer ke rekening di atas') + '.</p>') +
    '<p>Apabila di kemudian hari terbukti pernyataan ini tidak benar, saya bersedia bertanggung jawab sepenuhnya secara hukum ' +
    'dan membebaskan ' + esc_(CONFIG.NAMA_TOKO) + ' dari segala tuntutan pihak mana pun.</p>' +
    '<p>Demikian surat pernyataan ini saya buat dengan sadar, sebenar-benarnya, dan tanpa paksaan dari pihak mana pun.</p>' +
    '<div class="sig"><div>' + esc_(CONFIG.KOTA) + ', ' + tglIndo_(t.tanggal) + '</div><div>Yang membuat pernyataan,</div>' +
    '<img src="' + sigPernyataan + '"/><div class="line">' + (esc_(t.supplier) || '&nbsp;') + '</div></div>' +
    '<p class="muted" style="margin-top:20px">Ditandatangani secara elektronik pada ' + esc_(signedAt) + ' WIB.</p>' +
    '</div>';

  return '<html><head><meta charset="utf-8"><style>' + css + '</style></head><body>' + nota + pernyataan + lampiranHtml_(t) + '</body></html>';
}

/* ============================== HELPERS ============================== */

function rowToTrx_(r) {
  let items = [];
  try { items = JSON.parse(r[COL['Items (JSON)']] || '[]'); } catch (e) {}
  return {
    id: r[COL['ID']],
    token: r[COL['Token']],
    noNota: r[COL['No Nota']],
    tanggal: toIso_(r[COL['Tanggal']]),
    supplier: r[COL['Nama Supplier']],
    waSupplier: r[COL['No WA Supplier']],
    namaRek: r[COL['Nama Rekening']],
    bank: r[COL['Bank']],
    noRek: r[COL['No Rekening']],
    kanal: r[COL['Kanal']],
    noTrxMp: r[COL['No Transaksi Marketplace']],
    keterangan: r[COL['Keterangan']],
    items: items,
    total: Number(r[COL['Total']]) || 0,
    subtotal: Number(r[COL['Subtotal Barang']]) || 0,
    pur: r[COL['Ref PUR']] || '',
    status: r[COL['Status']],
    signedAt: String(r[COL['Ditandatangani']] || ''),
    pdf: r[COL['Link PDF']],
    bukti: parseBukti_(r[COL['Bukti TF']]),
  };
}

function publicView_(t) {
  const v = Object.assign({}, t);
  delete v.id;            // token tetap dikirim (dipakai saat submit TTD)
  v.bukti = (t.bukti || []).map(b => ({ bank: b.bank, nama: b.nama, noRek: b.noRek, jumlah: b.jumlah }));
  v.kanalText = kanalTextPlain_(t);
  return v;
}

function findByToken_(token) {
  const sh = getSheet_();
  const found = findRow_(sh, COL['Token'], token);
  if (!found) return null;
  const t = rowToTrx_(found.values);
  t.token = token;
  return t;
}

function findRow_(sh, colIdx, value) {
  const last = sh.getLastRow();
  if (last < 2 || !value) return null;
  // cari pakai TextFinder (cepat), lalu baca 1 baris saja
  const cell = sh.getRange(2, colIdx + 1, last - 1, 1).createTextFinder(String(value)).matchEntireCell(true).matchCase(true).findNext();
  if (!cell) return null;
  const row = cell.getRow();
  return { row: row, values: sh.getRange(row, 1, 1, HEADERS.length).getDisplayValues()[0] };
}

function nextNoNota_(sh, tanggalIso) {
  const prefix = 'PGN-' + tanggalIso.replace(/-/g, '') + '-';
  const last = sh.getLastRow();
  let max = 0;
  if (last >= 2) {
    const from = Math.max(2, last - 999);                 // nomor per tanggal: cukup 1000 baris terakhir
    sh.getRange(from, COL['No Nota'] + 1, last - from + 1, 1).getDisplayValues().forEach(r => {
      if (r[0].indexOf(prefix) === 0) max = Math.max(max, Number(r[0].slice(prefix.length)) || 0);
    });
  }
  return prefix + ('00' + (max + 1)).slice(-3);
}

function kanalTextPlain_(t) {
  // Keterangan = nama platform dari kolom C Barang Masuk (Shopee, Tokopedia, TOCO, ...)
  let s = t.kanal === 'Marketplace' && t.keterangan ? t.keterangan : (t.kanal || '-');
  if (t.noTrxMp) s += ', No. Invoice ' + t.noTrxMp;
  return s;
}

function kanalText_(t) { return esc_(kanalTextPlain_(t)); }

function fileName_(t) {
  const who = t.supplier || t.noTrxMp || '';
  return 'Nota & Pernyataan ' + t.noNota + (who ? ' - ' + String(who).replace(/[\\/:*?"<>|]/g, '') : '') + '.pdf';
}

function webAppUrl_() { return ScriptApp.getService().getUrl(); }
function signBase_() { return CONFIG.SIGN_URL || webAppUrl_(); }
function tz_() { return Session.getScriptTimeZone() || 'Asia/Jakarta'; }

function toIso_(v) {
  if (!v) return '';
  if (v instanceof Date) return Utilities.formatDate(v, tz_(), 'yyyy-MM-dd');
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); // dd/mm/yyyy
  if (m) return m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
  return s;
}

function tglIndo_(iso) {
  const BLN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return esc_(iso);
  return Number(m[3]) + ' ' + BLN[Number(m[2]) - 1] + ' ' + m[1];
}

function rp_(n) {
  return 'Rp ' + Math.round(Number(n) || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function normWa_(v) {
  let s = String(v || '').replace(/[^\d]/g, '');
  if (!s) return '';
  if (s.indexOf('0') === 0) s = '62' + s.slice(1);
  else if (s.indexOf('8') === 0) s = '62' + s;
  return s;
}

function esc_(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function safeJson_(o) {
  return JSON.stringify(o).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}


/* ============================== BARANG MASUK (sumber data) ============================== */

/** Dipanggil halaman admin saat buka & tiap 4 menit (hanya kalau tab terlihat). */
function getBM(pin, force) {
  const akun = checkPin_(pin);
  const data = getBMData_(!!force);
  const notes = notaByPur_();
  // semua transaksi dikirim; yang sudah dibuat nota diberi info nota (untuk tab "Sudah dibuat")
  const tx = data.tx.filter(t => milikAkun_(akun, t)).map(t => notes[t.pur] ? Object.assign({}, t, { nota: notes[t.pur] }) : t);
  return { tx: tx, at: data.at, stale: data.stale || '', start: CONFIG.BM_START, wajib: CONFIG.WAJIB_START, rek: notes.__rek || {}, akun: { nama: akun.nama, mode: akun.mode } };
}

/** Info nota per Ref PUR — dibaca per rentang sempit (2 blok kolom), bukan per sel. */
function notaByPur_() {
  const sh = getSheet_();
  const last = sh.getLastRow(), out = {};
  if (last < 2) return out;
  const a0 = COL['Token'], a1 = COL['Kanal'];                   // Token..Kanal
  const b0 = COL['Total'], b1 = COL['Ref PUR'];                 // Total..Ref PUR
  const A = sh.getRange(2, a0 + 1, last - 1, a1 - a0 + 1).getDisplayValues();
  const B = sh.getRange(2, b0 + 1, last - 1, b1 - b0 + 1).getDisplayValues();
  const base = signBase_(), rek = {};
  for (let i = 0; i < B.length; i++) {
    // rekening terakhir per nama (untuk isi otomatis di form admin)
    // ingatan no. WA penjual: berdasarkan nama penjual & no. rekening (dari screenshot)
    const nr = A[i][COL['No Rekening'] - a0], wa = A[i][COL['No WA Supplier'] - a0];
    if (wa) {
      const v = { wa: wa, kanal: A[i][COL['Kanal'] - a0], noNota: A[i][COL['No Nota'] - a0] };
      [A[i][COL['Nama Supplier'] - a0], nr ? 'rek:' + nr : ''].forEach(k => { k = String(k || '').trim().toLowerCase(); if (k) rek[k] = v; });
    }
    const pur = B[i][b1 - b0];
    if (!pur) continue;
    out[pur] = { noNota: A[i][COL['No Nota'] - a0], token: A[i][0], wa: A[i][COL['No WA Supplier'] - a0], link: base + '?t=' + A[i][0],
                 total: Number(B[i][0]) || 0, status: B[i][COL['Status'] - b0] };
  }
  Object.defineProperty(out, '__rek', { value: rek, enumerable: false });
  return out;
}

function findBMTx_(pur) {
  let data = getBMData_(false);
  let t = data.tx.filter(x => x.pur === pur)[0];
  if (!t) { data = getBMData_(true); t = data.tx.filter(x => x.pur === pur)[0]; }
  return t || null;
}

/** Cache 5 menit (dipotong ±90 KB) + salinan "data baik terakhir" 6 jam untuk pengaman. */
function getBMData_(force) {
  const cache = CacheService.getScriptCache();
  if (!force) {
    const c = getChunked_(cache, 'bm_' + CONFIG.BM_START);
    if (c) return JSON.parse(c);
  }
  let fresh = null, bad = '';
  try { fresh = readBMFresh_(); } catch (e) { bad = 'Gagal membaca Barang Masuk: ' + e.message; }
  const goodStr = getChunked_(cache, 'bm_good_' + CONFIG.BM_START);
  const good = goodStr ? JSON.parse(goodStr) : null;
  if (fresh && fresh.corrupt) bad = 'Data sumber berisi ' + fresh.corrupt;
  if (fresh && !bad && good && good.tx.length >= 4 && fresh.tx.length < good.tx.length * 0.5)
    bad = 'Jumlah transaksi anjlok (' + fresh.tx.length + ' dari ' + good.tx.length + ')';
  let out;
  if (bad) {
    if (!good) throw new Error(bad + '. Coba lagi sebentar.');
    out = { tx: good.tx, at: good.at, stale: bad + ' — memakai data terakhir yang baik.' };
  } else {
    out = { tx: fresh.tx, at: fresh.at };
    putChunked_(cache, 'bm_good_' + CONFIG.BM_START, JSON.stringify(out), 21600);
  }
  putChunked_(cache, 'bm_' + CONFIG.BM_START, JSON.stringify(out), CONFIG.CACHE_TTL);
  return out;
}

/** Baca dari bawah ke atas per blok 1.500 baris (B:M sekaligus) sampai tanggal < BM_START. */
function readBMFresh_() {
  const sh = SpreadsheetApp.openById(CONFIG.BM_SPREADSHEET_ID).getSheetByName(CONFIG.BM_SHEET);
  if (!sh) throw new Error('Tab "' + CONFIG.BM_SHEET + '" tidak ditemukan');
  const BAD = /^(#REF!|#N\/A|#VALUE!|#ERROR!|#NAME\?|#DIV\/0!|Loading)/i;
  let end = sh.getLastRow(), rows = [], corrupt = '';
  const CHUNK = 1500;
  outer:
  while (end >= 2) {
    const start = Math.max(2, end - CHUNK + 1);
    const vals = sh.getRange(start, 2, end - start + 1, 12).getDisplayValues(); // kolom B..M
    for (let i = vals.length - 1; i >= 0; i--) {
      const r = vals[i];
      if (!r[3]) continue;                                   // kolom E (No. PUR) kosong → lewati
      const iso = parseTglId_(r[0]);
      if (!iso) { if (BAD.test(r[0])) corrupt = r[0]; continue; }
      if (iso < CONFIG.BM_START) break outer;
      for (let k = 0; k < r.length; k++) if (BAD.test(r[k])) { corrupt = r[k]; break; }
      rows.push(r);
    }
    end = start - 1;
  }
  rows.reverse();
  const tx = [], idx = {};
  rows.forEach(r => {
    // r: 0=B tgl, 1=C jenis, 2=D nama, 3=E PUR, 4=F kode, 5=G, 6=H kategori, 7=I barang, 8=J qty, 9=K, 10=L, 11=M harga
    const pur = r[3].trim();
    if (!(pur in idx)) { idx[pur] = tx.length; tx.push({ pur: pur, tgl: parseTglId_(r[0]), tglText: r[0], jenis: r[1].trim(), d: r[2].trim(), items: [], total: 0 }); }
    const t = tx[idx[pur]];
    const qty = numId_(r[8]), harga = numId_(r[11]);
    t.items.push({ nama: r[7].trim(), qty: qty, harga: harga });
    t.total += qty * harga;
  });
  return { tx: tx, at: Date.now(), corrupt: corrupt };
}

/** Aturan nama/kanal dari kolom C & D (sama persis dengan di halaman admin). */
function deriveBM_(t) {
  const platform = String(t.jenis || '').trim();
  const isDirect = !platform || /^direct$/i.test(platform);
  const parts = String(t.d || '').split('/').map(s => s.trim()).filter(Boolean);
  const first = parts[0] || '';
  const PRE = /^(SP|TC|TP)\s+(.+)$/i;
  const isInv = /^[A-Za-z0-9]{8,}$/.test(first) && /\d/.test(first) && !/^[A-Za-z]+$/.test(first);
  if (isInv) {
    let toko = '';
    parts.slice(1).forEach(p => { const m = p.match(PRE); if (m && !toko) toko = m[2].trim(); });
    return { kanal: 'Marketplace', platform: isDirect ? '' : platform, inv: first, nama: toko, rek: 'Rekening Marketplace' };
  }
  if (!isDirect) {
    const m = first.match(PRE);
    return { kanal: 'Marketplace', platform: platform, inv: '', nama: m ? m[2].trim() : first, rek: 'Rekening Marketplace' };
  }
  return { kanal: '', platform: '', inv: '', nama: first, rek: first };
}

function parseTglId_(s) {
  const BL = { januari: 1, februari: 2, maret: 3, april: 4, mei: 5, juni: 6, juli: 7, agustus: 8, september: 9, oktober: 10, november: 11, desember: 12 };
  s = String(s || '').trim();
  let m = s.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  if (m && BL[m[2].toLowerCase()]) return m[3] + '-' + ('0' + BL[m[2].toLowerCase()]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? m[0] : '';
}

function numId_(s) { return Number(String(s || '').replace(/[^\d]/g, '')) || 0; }

function putChunked_(cache, key, str, ttl) {
  const SIZE = 30000;                                   // ≤ ±90 KB per potong (aman untuk huruf non-ASCII)
  const n = Math.max(1, Math.ceil(str.length / SIZE)), obj = {};
  for (let i = 0; i < n; i++) obj[key + '_' + i] = str.substr(i * SIZE, SIZE);
  obj[key + '_n'] = String(n);
  cache.putAll(obj, ttl);
}

function getChunked_(cache, key) {
  const n = Number(cache.get(key + '_n'));
  if (!n) return null;
  const keys = [];
  for (let i = 0; i < n; i++) keys.push(key + '_' + i);
  const got = cache.getAll(keys);
  let s = '';
  for (let i = 0; i < keys.length; i++) { if (got[keys[i]] == null) return null; s += got[keys[i]]; }
  return s;
}


/* ============================== CHAT KE PENJUAL ============================== */

function getChatKit(pin) {
  checkPin_(pin);
  const f = findVideo_();
  return { msg: CONFIG.CHAT_TEMPLATE, video: f ? { id: f.getId() + '_' + f.getLastUpdated().getTime(), name: f.getName() } : null };
}

// Isi video (base64) — diambil sekali, lalu disimpan di HP admin.
function getVideoData(pin) {
  checkPin_(pin);
  const f = findVideo_();
  if (!f) throw new Error('Video belum ada di folder Drive.');
  const b = f.getBlob();
  return { name: f.getName(), mime: b.getContentType() || 'video/mp4', b64: Utilities.base64Encode(b.getBytes()) };
}

function findVideo_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('VIDEO_ID');
  if (id) {
    try { const f = DriveApp.getFileById(id); if (!f.isTrashed()) return f; } catch (e) { /* file dihapus → cari ulang */ }
  }
  const folder = getFolder_();
  let it = folder.searchFiles("mimeType contains 'video/' and title contains 'Tutorial' and trashed = false");
  if (!it.hasNext()) it = folder.searchFiles("mimeType contains 'video/' and trashed = false"); // video apa saja di folder
  if (!it.hasNext()) return null;
  const f = it.next();
  props.setProperty('VIDEO_ID', f.getId());
  return f;
}


/* ============================== BUKTI TRANSFER ============================== */

// Simpan 1 gambar bukti transfer (JPEG/PNG base64) ke folder Drive "Bukti TF". Dipanggil admin saat SS ditambahkan.
function uploadBukti(pin, f) {
  checkPin_(pin);
  f = f || {};
  const m = String(f.b64 || '').match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!m) throw new Error('Format gambar tidak dikenali.');
  if (m[2].length > 4000000) throw new Error('Gambar terlalu besar.');
  const name = 'TF-' + Utilities.formatDate(new Date(), tz_(), 'yyyyMMdd-HHmmss') + '-' + String(f.name || 'bukti').replace(/[^\w.-]/g, '').slice(0, 40);
  const file = buktiFolder_().createFile(Utilities.newBlob(Utilities.base64Decode(m[2]), m[1], name));
  return { id: file.getId() };
}

function buktiFolder_() {
  const parent = getFolder_();
  const it = parent.getFoldersByName('Bukti TF');
  return it.hasNext() ? it.next() : parent.createFolder('Bukti TF');
}

function cleanBukti_(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.slice(0, 8).map(b => ({
    id: /^[\w-]{10,}$/.test(String(b && b.id || '')) ? String(b.id) : '',
    bank: String(b && b.bank || '').slice(0, 40),
    nama: String(b && b.nama || '').slice(0, 80),
    noRek: String(b && b.noRek || '').replace(/[^\d]/g, '').slice(0, 20),
    jumlah: Math.max(0, Math.round(Number(b && b.jumlah) || 0)),
  })).filter(b => b.id || b.jumlah);
}

function parseBukti_(v) {
  if (!v) return [];
  try { const a = JSON.parse(v); return Array.isArray(a) ? a : []; } catch (e) { return []; }
}

function buktiImgs_(bukti) {
  return (bukti || []).map(b => {
    let src = '';
    if (b.id) {
      try { const bl = DriveApp.getFileById(b.id).getBlob(); src = 'data:' + bl.getContentType() + ';base64,' + Utilities.base64Encode(bl.getBytes()); } catch (e) { /* file hilang */ }
    }
    return { src: src, bank: b.bank, nama: b.nama, noRek: b.noRek, jumlah: b.jumlah };
  });
}

// Halaman terakhir PDF: daftar transfer + gambar bukti
function lampiranHtml_(t) {
  const L = t.buktiImgs || [];
  if (!L.length) return '';
  const tot = L.reduce((s, b) => s + (Number(b.jumlah) || 0), 0);
  const rows = L.map((b, i) => '<tr><td class="c">' + (i + 1) + '</td><td>' + esc_(b.bank || '-') + '</td><td>' + esc_(b.nama || '-') +
    '</td><td>' + esc_(b.noRek || '-') + '</td><td class="r">' + rp_(b.jumlah) + '</td></tr>').join('');
  const imgs = L.filter(b => b.src).map((b, i) => '<div style="display:inline-block;width:31%;margin:0 1% 10px;vertical-align:top;text-align:center">' +
    '<img src="' + b.src + '" style="width:100%;border:1px solid #bbb"/><div class="muted">Bukti ' + (i + 1) + '</div></div>').join('');
  return '<div class="page" style="page-break-before:always">' +
    '<div class="hdr"><h1>LAMPIRAN · BUKTI TRANSFER</h1><div class="muted">Nota No. ' + esc_(t.noNota) + '</div></div>' +
    '<table class="items"><tr><th width="6%">No</th><th>Bank / Aplikasi</th><th>Nama Rekening</th><th>No. Rekening</th><th width="22%">Jumlah</th></tr>' + rows +
    '<tr><td colspan="4" class="r"><b>Total transfer</b></td><td class="r"><b>' + rp_(tot) + '</b></td></tr></table><br/>' + imgs + '</div>';
}


/* ============================== NOTIFIKASI (Firebase Cloud Messaging) ==============================
 * Persiapan (sekali, lihat Panduan Notifikasi):
 *  1. Properti skrip NOTA_FCM_SA = isi file kunci akun layanan Firebase (.json)
 *  2. Jalankan pasangPengingat() sekali dari editor → notifikasi tiap hari ±20.00 WIB
 *  3. Di HP: buka aplikasi dari GitHub → tab Daftar → Aktifkan notifikasi
 */
function simpanTokenPush(pin, token) {
  const akun = checkPin_(pin);
  token = String(token || '').trim();
  if (!/^[\w:\-]{20,}$/.test(token)) throw new Error('Token notifikasi tidak valid.');
  const list = daftarToken_().filter(x => x.t !== token);
  list.unshift({ t: token, a: akun.nama });
  PropertiesService.getScriptProperties().setProperty('NOTA_PUSH', JSON.stringify(list.slice(0, 40)));
  return { jumlah: list.length, akun: akun.nama };
}
function daftarToken_() {
  let list = [];
  try { list = JSON.parse(PropertiesService.getScriptProperties().getProperty('NOTA_PUSH') || '[]'); } catch (e) {}
  return list.map(x => typeof x === 'string' ? { t: x, a: 'Admin' } : x);
}

function tesNotif(pin) {
  const akun = checkPin_(pin);
  const n = kirimPush_('🔔 Tes notifikasi Nota PGNet', 'Halo ' + akun.nama + ', notifikasi di HP ini sudah jalan.', x => x.a === akun.nama);
  return { terkirim: n };
}

// Dipanggil pemicu harian (lihat pasangPengingat)
function pengingatHarian() {
  const data = getBMData_(true);
  const notes = notaByPur_();
  const akunList = [{ nama: 'Admin', mode: 'semua', cocok: '' }].concat(Object.keys(CONFIG.AKUN).map(n => ({ nama: n, mode: CONFIG.AKUN[n].mode || 'nama', cocok: CONFIG.AKUN[n].cocok || '' })));
  let total = 0;
  akunList.forEach(akun => {
    const belum = data.tx.filter(t => t.tgl >= CONFIG.WAJIB_START && !notes[t.pur] && wajibAkun_(akun, t));
    if (!belum.length) return;
    belum.sort((a, b) => a.tgl < b.tgl ? -1 : 1);
    const nama = belum.slice(0, 3).map(t => t.d.split('/').pop().trim()).join(', ') + (belum.length > 3 ? ', dll.' : '');
    const judul = akun.mode === 'nama' ? '📝 ' + akun.nama + ', ' + belum.length + ' barang masuk atas namamu belum dibuat nota'
                                       : '📝 ' + belum.length + ' transaksi DIRECT belum dibuat nota';
    total += kirimPush_(judul, nama + ' — ketuk untuk buat nota sekarang.', x => x.a === akun.nama);
  });
  return total;
}

// Jalankan SEKALI dari editor Apps Script (pilih fungsi ini → Jalankan)
function pasangPengingat() {
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'pengingatHarian').forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('pengingatHarian').timeBased().everyDays(1).atHour(CONFIG.JAM_PENGINGAT).nearMinute(0).inTimezone('Asia/Jakarta').create();
  return 'Pengingat harian terpasang: setiap hari sekitar jam ' + CONFIG.JAM_PENGINGAT + '.00 WIB.';
}

function kirimPush_(judul, isi, saring) {
  const sa = fcmAkun_();
  if (!sa) throw new Error('Kunci Firebase belum diisi (Properti skrip NOTA_FCM_SA).');
  const props = PropertiesService.getScriptProperties();
  const semua = daftarToken_();
  const list = saring ? semua.filter(saring) : semua;
  if (!list.length) return 0;
  const akses = fcmAksesToken_(sa);
  const url = 'https://fcm.googleapis.com/v1/projects/' + sa.project_id + '/messages:send';
  const reqs = list.map(x => x.t).map(tok => ({
    url: url, method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    headers: { Authorization: 'Bearer ' + akses },
    payload: JSON.stringify({ message: { token: tok,
      webpush: { notification: { title: judul, body: isi, icon: CONFIG.APP_URL + 'icon-192.png', badge: CONFIG.APP_URL + 'icon-192.png', tag: 'nota-pgnet', renotify: true },
                 fcm_options: { link: CONFIG.APP_URL } } } })
  }));
  const res = UrlFetchApp.fetchAll(reqs);
  let ok = 0; const buang = {};
  res.forEach((r, i) => {
    const c = r.getResponseCode();
    if (c === 200) ok++;
    else if (c === 404 || /UNREGISTERED|INVALID_ARGUMENT/.test(r.getContentText())) buang[list[i].t] = 1;   // token kedaluwarsa
  });
  props.setProperty('NOTA_PUSH', JSON.stringify(semua.filter(x => !buang[x.t])));
  return ok;
}

function fcmAkun_() {
  const raw = PropertiesService.getScriptProperties().getProperty('NOTA_FCM_SA');
  if (!raw) return null;
  try { const j = JSON.parse(raw); return j.private_key && j.client_email ? j : null; } catch (e) { return null; }
}

function fcmAksesToken_(sa) {
  const cache = CacheService.getScriptCache();
  const c = cache.get('fcm_at');
  if (c) return c;
  const now = Math.floor(Date.now() / 1000);
  const b64 = o => Utilities.base64EncodeWebSafe(JSON.stringify(o)).replace(/=+$/, '');
  const head = b64({ alg: 'RS256', typ: 'JWT' });
  const claim = b64({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/firebase.messaging',
                      aud: sa.token_uri || 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 });
  const sig = Utilities.base64EncodeWebSafe(Utilities.computeRsaSha256Signature(head + '.' + claim, sa.private_key)).replace(/=+$/, '');
  const r = UrlFetchApp.fetch(sa.token_uri || 'https://oauth2.googleapis.com/token', {
    method: 'post', muteHttpExceptions: true,
    payload: { grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: head + '.' + claim + '.' + sig } });
  const j = JSON.parse(r.getContentText() || '{}');
  if (!j.access_token) throw new Error('Gagal masuk ke Firebase: ' + (j.error_description || j.error || r.getResponseCode()));
  cache.put('fcm_at', j.access_token, 3000);
  return j.access_token;
}

// Tes dari editor: kirim notifikasi ke semua HP yang sudah mengaktifkan
function cobaNotifikasi() { return kirimPush_('🔔 Tes notifikasi Nota PGNet', 'Notifikasi dari editor Apps Script berhasil.'); }
