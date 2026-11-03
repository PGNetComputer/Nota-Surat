"""Bangun halaman GitHub (index.html = Admin, ttd.html = Penjual) dari Admin.html & Sign.html Apps Script."""
import re,sys
EXEC='https://script.google.com/macros/s/AKfycbwELr_aZoLwhSdJ-wdSGhTsxLRLleXWeGh7Ug2FzHLNtjnKVo85FnLoehtdurocfofFSA/exec'
FNS=['adminBoot','signBoot','adminLogin','createTrx','listTrx','deleteTrx','getBM','getChatKit','getVideoData','submitSignature']
SHIM=r"""<script>
/* Jembatan ke Google Apps Script: google.script.run → POST ke …/exec */
var API_URL='%s';
function apiCall(fn,args){
  return fetch(API_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({fn:fn,args:args||[]}),redirect:'follow'})
    .then(function(r){if(!r.ok)throw new Error('Server '+r.status);return r.json();})
    .then(function(j){if(!j.ok)throw new Error(j.error||'Gagal');return j.result;},function(e){throw new Error(/fetch|network|Load failed/i.test(String(e&&e.message))?'Tidak ada koneksi ke server. Cek internet lalu coba lagi.':(e&&e.message)||String(e));});
}
(function(){
  var FNS=%s;
  function mk(ok,fail){var o={withSuccessHandler:function(f){return mk(f,fail);},withFailureHandler:function(f){return mk(ok,f);}};
    FNS.forEach(function(fn){o[fn]=function(){apiCall(fn,[].slice.call(arguments)).then(function(r){if(ok)ok(r);},function(e){if(fail)fail(e);else console.error(e);});};});return o;}
  window.google={script:{run:mk()}};
})();
</script>
"""%(EXEC,str(FNS).replace("'",'"'))
def build(src,boot_js,title):
    s=open(src).read()
    s=re.sub(r'<script>/\* dibuka dari GitHub.*?</script>\n','',s,count=1,flags=re.S)
    s=s.replace('<base target="_top">\n','',1)
    s=s.replace('<meta charset="utf-8">','<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">\n<title>%s</title>\n<meta name="theme-color" content="#188038">'%title,1)
    s=s.replace('<html>','<html lang="id">',1)
    s=s.replace('<?!= payload ?>','window.__P').replace('<?!= cfg ?>','window.__C')
    assert '<?' not in s
    # skrip utama dijalankan setelah data awal diambil dari server
    i=s.rindex('<script>');j=s.index('</script>',i)
    main=s[i+8:j]
    s=s[:i]+'<script type="text/plain" id="appjs">'+main+'</script>\n'+SHIM+'<script>\n'+boot_js+'\n</script>'+s[j+9:]
    return s
ADMIN_BOOT=r"""(function(){
  function run(b){window.__P=b.payload;window.__C=b.cfg;var sc=document.createElement('script');sc.text=document.getElementById('appjs').textContent;document.body.appendChild(sc);}
  var k='nota_boot',c=null;try{c=JSON.parse(localStorage.getItem(k)||'null');}catch(_){}
  if(c){run(c);apiCall('adminBoot',[]).then(function(b){try{localStorage.setItem(k,JSON.stringify(b));}catch(_){}});return;}
  var m=document.getElementById('loginMsg');if(m){m.className='msg';m.textContent='Menghubungkan ke server…';}
  apiCall('adminBoot',[]).then(function(b){try{localStorage.setItem(k,JSON.stringify(b));}catch(_){}if(m)m.textContent='';run(b);},
    function(e){if(m){m.className='msg err';m.textContent=e.message+' (muat ulang halaman)';}});
})();"""
SIGN_BOOT=r"""(function(){
  function run(b){window.__P=b.payload;window.__C=b.cfg;var sc=document.createElement('script');sc.text=document.getElementById('appjs').textContent;document.body.appendChild(sc);}
  var app=document.getElementById('app');
  if(app)app.innerHTML='<div class="card"><p class="muted" style="text-align:center;margin:30px 0">Memuat nota…</p></div>';
  var t=(location.search.match(/[?&]t=([a-z0-9]+)/i)||[])[1]||'';
  apiCall('signBoot',[t]).then(run,function(e){if(app)app.innerHTML='<div class="card"><h2>Gagal memuat</h2><p class="muted">'+String(e.message).replace(/</g,'&lt;')+'</p><button class="btn btn-primary" onclick="location.reload()">Coba lagi</button></div>';});
})();"""
out=sys.argv[1]
open(out+'/index.html','w').write(build('Admin.html',ADMIN_BOOT,'Admin Nota PGNet'))
open(out+'/ttd.html','w').write(build('Sign.html',SIGN_BOOT,'Nota & Surat Pernyataan PGNet'))
print('built')
