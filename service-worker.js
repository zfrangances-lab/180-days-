const CACHE = '180-days-v5';
const ASSETS = ['./manifest.json','./icon-192.png','./icon-512.png','./spider-theme.css'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

const protectionScript = `
<script>
(() => {
  const KEY='avance_lineal_6_meses_v1';
  const BACKUP=KEY+'_safe_backup';
  const DB='180DaysRecovery';
  const STORE='backup';

  function openDB(){
    return new Promise((resolve,reject)=>{
      if(!('indexedDB' in window)) return reject();
      const r=indexedDB.open(DB,1);
      r.onupgradeneeded=()=>{ if(!r.result.objectStoreNames.contains(STORE)) r.result.createObjectStore(STORE); };
      r.onsuccess=()=>resolve(r.result); r.onerror=()=>reject(r.error);
    });
  }
  async function dbWrite(value){
    try{ const db=await openDB(); const tx=db.transaction(STORE,'readwrite'); tx.objectStore(STORE).put(value,'latest'); tx.oncomplete=()=>db.close(); }catch(e){}
  }
  async function dbRead(){
    try{ const db=await openDB(); return await new Promise(res=>{ const tx=db.transaction(STORE,'readonly'); const r=tx.objectStore(STORE).get('latest'); r.onsuccess=()=>{db.close();res(r.result||null)}; r.onerror=()=>{db.close();res(null)}; }); }catch(e){return null}
  }
  function snapshot(){
    try{ const v=localStorage.getItem(KEY); if(v){ localStorage.setItem(BACKUP,v); dbWrite(v); } }catch(e){}
  }
  async function recover(){
    try{
      if(localStorage.getItem(KEY)) { snapshot(); return; }
      let v=localStorage.getItem(BACKUP);
      if(!v) v=await dbRead();
      if(v){ localStorage.setItem(KEY,v); location.reload(); }
    }catch(e){}
  }
  if(navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(()=>{});
  recover();
  setInterval(snapshot,1500);
  addEventListener('pagehide',snapshot);
  document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='hidden') snapshot(); });
})();
<\/script>`;

const splashMarkup = `
<section class="splash" id="splashScreen" aria-label="Pantalla de inicio">
  <div class="city-grid"></div>
  <div class="web one"></div><div class="web two"></div>
  <div class="splash-card">
    <div class="hero-badge">🕷️ Modo héroe activado</div>
    <h1>6 MESES<br><span>DE PROGRESO</span></h1>
    <p>Cada día cuenta. Completa tus objetivos, protege tu racha y desbloquea tus recompensas.</p>
    <div class="splash-stats">
      <div class="splash-stat">🔥 Racha: <strong id="splashCurrentStreak">0 días</strong></div>
      <div class="splash-stat">🏆 Mejor: <strong id="splashBestStreak">0 días</strong></div>
      <div class="splash-stat">⚡ Progreso: <strong id="splashProgress">0%</strong></div>
    </div>
    <button class="enter-btn" id="enterAppButton">Entrar al calendario →</button>
  </div>
</section>`;

const splashScript = `
<script>
(() => {
  function syncSplash(){
    const s=document.getElementById('stats');
    const c=document.getElementById('currentStreak');
    const b=document.getElementById('bestStreak');
    const sp=document.getElementById('splashProgress');
    const sc=document.getElementById('splashCurrentStreak');
    const sb=document.getElementById('splashBestStreak');
    if(s&&sp){ const m=s.textContent.match(/(\\d+)%/); if(m) sp.textContent=m[1]+'%'; }
    if(c&&sc) sc.textContent=c.textContent;
    if(b&&sb) sb.textContent=b.textContent;
  }
  const btn=document.getElementById('enterAppButton');
  if(btn) btn.addEventListener('click',()=>{
    const splash=document.getElementById('splashScreen');
    if(splash) splash.classList.add('hidden');
    setTimeout(()=>window.scrollTo({top:0,behavior:'smooth'}),120);
  });
  syncSplash();
  setTimeout(syncSplash,100);
  setTimeout(syncSplash,500);
})();
<\/script>`;

self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);
  const isHtml = req.mode === 'navigate' || url.pathname.endsWith('/index.html') || url.pathname.endsWith('/180-days-/');

  if (isHtml) {
    event.respondWith((async () => {
      try {
        const response = await fetch(req, {cache:'no-store'});
        let text = await response.text();
        if (!text.includes('spider-theme.css')) {
          text = text.replace('</head>', '<link rel="stylesheet" href="spider-theme.css?v=5">\n</head>');
        }
        if (!text.includes('id="splashScreen"')) {
          text = text.replace('<body>', '<body>\n' + splashMarkup);
        }
        if (!text.includes('180DaysRecovery')) {
          text = text.replace('</body>', protectionScript + '\n</body>');
        }
        if (!text.includes('enterAppButton')) {
          text = text.replace('</body>', splashScript + '\n</body>');
        } else if (!text.includes('syncSplash')) {
          text = text.replace('</body>', splashScript + '\n</body>');
        }
        return new Response(text, {status: response.status, statusText: response.statusText, headers: {'content-type':'text/html; charset=utf-8','cache-control':'no-store'}});
      } catch (e) {
        const cached = await caches.match('./index.html');
        if (cached) return cached;
        return new Response('Sin conexión', {status:503});
      }
    })());
    return;
  }

  event.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(response => {
      const copy = response.clone();
      caches.open(CACHE).then(cache => cache.put(req, copy));
      return response;
    }))
  );
});