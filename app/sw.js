const C='gia-dat-v6';
const F=['./','index.html','style.css','calc.js','app.js','manifest.json','data/data.json','icon-192.png','icon-512.png'];
// reload: bỏ qua cache HTTP để lấy bản mới thật khi cập nhật
self.addEventListener('install',e=>e.waitUntil(caches.open(C).then(c=>c.addAll(F.map(u=>new Request(u,{cache:'reload'})))).then(()=>self.skipWaiting())));
// chỉ xóa cache cũ CỦA APP (tiền tố gia-dat-), không đụng cache khác cùng tên miền
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x.startsWith('gia-dat-')&&x!==C).map(x=>caches.delete(x)))).then(()=>clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).catch(()=>e.request.mode==='navigate'?caches.match('index.html'):Response.error())));
});
