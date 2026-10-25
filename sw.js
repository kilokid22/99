/* 99 service worker: offline cache + daily-log reminder */
const CACHE='ninetynine-v2';
const ASSETS=['./','index.html','manifest.webmanifest','fonts.css','css/app.css','css/towie.css','js/data.js','js/towie.js','js/icons.js','js/app.js','data/runsheet.json','vendor/jspdf.umd.min.js','img/towie_hero.png','icons/icon-192.png','icons/icon-512.png','icons/maskable-512.png','icons/apple-touch-icon.png','icons/badge-96.png','fonts/Bungee-400.woff2','fonts/MPLUSRounded1c-500.woff2','fonts/MPLUSRounded1c-800.woff2'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
  const r=e.request; if(r.method!=='GET'||new URL(r.url).origin!==location.origin) return;
  e.respondWith(caches.match(r,{ignoreSearch:true}).then(hit=>hit||fetch(r).then(res=>{if(res.ok){const cp=res.clone();caches.open(CACHE).then(c=>c.put(r,cp));}return res;}).catch(()=>r.mode==='navigate'?caches.match('index.html'):undefined)));
});
self.addEventListener('notificationclick',e=>{
  e.notification.close();
  const url=(e.notification.data&&e.notification.data.url)||'./#day';
  e.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(cs=>{for(const c of cs){if('focus' in c){c.navigate&&c.navigate(url).catch(()=>{});return c.focus();}}return self.clients.openWindow(url);}));
});
function readState(){return new Promise(res=>{const q=indexedDB.open('ninetynine',1);q.onupgradeneeded=()=>{const d=q.result;if(!d.objectStoreNames.contains('kv'))d.createObjectStore('kv');if(!d.objectStoreNames.contains('photos'))d.createObjectStore('photos');};q.onerror=()=>res(null);q.onsuccess=()=>{try{const g=q.result.transaction('kv').objectStore('kv').get('state');g.onsuccess=()=>res(g.result||null);g.onerror=()=>res(null);}catch(_){res(null);}};});}
async function dailyCheck(){
  const S=await readState(); if(!S) return;
  const p=S.plants.find(x=>x.id===S.activeId)||S.plants[0]; if(!p||!p.day1) return;
  const [y,m,d]=p.day1.split('-').map(Number); const t=new Date();t.setHours(0,0,0,0);
  const day=Math.round((t-new Date(y,m-1,d))/864e5)+1; if(day<1||day>70) return;
  const [hh,mm]=((S.settings&&S.settings.remindAt)||'09:00').split(':').map(Number); const now=new Date();
  if(now.getHours()*60+now.getMinutes()<hh*60+mm) return;
  const x=(S.days[p.id]||{})[day]; if(x&&x.saved) return;
  return self.registration.showNotification(`99 · Day ${day} check-in 🧺`,{body:`Towie: "${p.name} needs her daily log. 20 seconds, my guy."`,icon:'icons/icon-192.png',badge:'icons/badge-96.png',tag:'daily-log',data:{url:'./#day'}});
}
self.addEventListener('periodicsync',e=>{if(e.tag==='daily-log')e.waitUntil(dailyCheck());});
