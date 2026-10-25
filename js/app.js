/* 99 — Kilo's AlmondGold grow logger. Offline-first PWA. Data: IndexedDB on device. */
(()=>{
'use strict';
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const VERSION='1.0.0';
/* ---------------- IndexedDB ---------------- */
const DB={db:null,
 open(){return new Promise((res,rej)=>{const r=indexedDB.open('ninetynine',1);r.onupgradeneeded=()=>{const d=r.result;d.createObjectStore('kv');d.createObjectStore('photos');};r.onsuccess=()=>{DB.db=r.result;res();};r.onerror=()=>rej(r.error);});},
 tx(st,mode,fn){return new Promise((res,rej)=>{const t=DB.db.transaction(st,mode);const s=t.objectStore(st);const q=fn(s);t.oncomplete=()=>res(q&&q.result);t.onerror=()=>rej(t.error);});},
 get(st,k){return DB.tx(st,'readonly',s=>s.get(k));}, put(st,k,v){return DB.tx(st,'readwrite',s=>s.put(v,k));}, del(st,k){return DB.tx(st,'readwrite',s=>s.delete(k));},
 keys(st){return DB.tx(st,'readonly',s=>s.getAllKeys());}
};
/* ---------------- dates ---------------- */
const pd=s=>{if(!s)return null;const[y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d);};
const ymd=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const addD=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x;};
const today0=()=>{const d=new Date();d.setHours(0,0,0,0);return d;};
const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],DOW=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const fmt=d=>d?`${MON[d.getMonth()]} ${d.getDate()}`:'';
const fmtL=d=>d?`${DOW[d.getDay()]} ${MON[d.getMonth()]} ${d.getDate()}`:'';
const nowHM=()=>{const d=new Date();return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;};
/* ---------------- state ---------------- */
let S=null, RS=null;
const RES_DEFAULT=[3,10,17,24,31,38,45,52,59,66];
const DEF=()=>({v:1,
 settings:{leafOffsetF:2,remindAt:'09:00',haptics:true,lastNudge:''},
 tents:[{id:'t1',name:'Closet tent 2.3×2.3×5.2'},{id:'t2',name:'2×2 veg tent (planned)'}],
 plants:[
  {id:'p1',name:'Purple Kush Auto',strain:'Purple Kush Auto (Tastebudz, via North Atlantic Seed Co)',type:'auto',tentId:'t1',day1:'2026-10-14',gal:5.5,resDays:[...RES_DEFAULT],harvestDay:70,co2:false},
  {id:'p2',name:'Blue Mystic',strain:'Blue Mystic (fem photoperiod)',type:'photo',tentId:'t2',day1:null,gal:5.5,resDays:[...RES_DEFAULT],harvestDay:70,co2:false}
 ],
 activeId:'p1', days:{p1:{},p2:{}}, unlocked:{}
});
let saveT=0;
const save=()=>{clearTimeout(saveT);saveT=setTimeout(()=>DB.put('kv','state',S),250);};
const P=()=>S.plants.find(p=>p.id===S.activeId)||S.plants[0];
const dayOf=(p,date=today0())=>p.day1?Math.round((date-pd(p.day1))/864e5)+1:null;
const dateOf=(p,d)=>p.day1?addD(pd(p.day1),d-1):null;
const weekOf=d=>Math.max(1,Math.ceil(d/7));
const DL=(p,d,create)=>{S.days[p.id]=S.days[p.id]||{};let x=S.days[p.id][d];if(!x&&create){x=S.days[p.id][d]={checks:{},readings:[],note:'',adj:[],photo:false,mix:null,saved:null};}return x;};
/* ---------------- runsheet-derived targets ---------------- */
const nums=s=>(String(s||'').replace(/,/g,'').match(/\d+(?:\.\d+)?/g)||[]).map(Number);
function rng(s,co2){
 if(s==null)return null; let str=String(s).trim(); if(!str||str.startsWith('—')||str==='-')return null;
 if(co2){const m=str.match(/CO2\s*([\d.,]+\s*[–-]\s*[\d.,]+)/);if(m)str=m[1];}
 else str=str.replace(/\(CO2[^)]*\)/,'');
 str=str.split(/[;\/]/)[0];
 const n=nums(str);if(!n.length)return null;
 if(/^\s*~/.test(str)||n.length===1)return [n[0]-2,n[0]+2];
 return [n[0],n[1]];
}
const NUTE_KEYS=[['Armor Si','si'],['CaliMagic','cm'],['Micro','micro'],['Gro','gro'],['Bloom','bloom'],['RapidStart','rs'],['KoolBloom','kb'],['Hydroguard','hg']];
const mixWeek=w=>RS.weekly_mix.find(x=>x.week===w);
function mixWeekAt(p,d){const r=[...p.resDays].sort((a,b)=>a-b);let i=-1;r.forEach((x,k)=>{if(x<=d)i=k;});return i<0?0:Math.min(10,i+1);}
const stageRow=d=>RS.stage_targets.find(s=>d>=s.day_start&&d<=s.day_end)||RS.stage_targets[RS.stage_targets.length-1];
const ROUTINE_KEYS=['r_water','r_topoff','r_ph','r_ec','r_light','r_look'];
function dayInfo(p,d){
 const b=RS.days[Math.min(70,Math.max(1,d))-1];
 const sorted=[...p.resDays].sort((a,c)=>a-c);
 const resIdx=sorted.indexOf(d), isRes=resIdx>=0, mw=mixWeekAt(p,d), mix=mw?mixWeek(mw):null;
 let actions=b.actions||'';
 if(b.reservoir_change_day&&!isRes) actions=actions.replace(/^(FLUSH res change|Week \d+ res change)[^.]*\.\s*/i,'').replace(/Calibrate pH 7 \+ 4\.\s*/,'');
 const sents=actions.split(/(?<=\.)\s+(?=[A-Z0-9])/).map(s=>s.trim()).filter(s=>s&&!(d>=3&&/^daily check\.?$/i.test(s))).map(s=>/^PPFD \d+\.?$/.test(s)?'Set light to '+s.replace(/\.$/,'')+' at the canopy top':s);
 const checks=[];
 if(isRes){const w=Math.min(10,resIdx+1);checks.push({k:'res',t:w>=10?'FLUSH res change → RO + FloraKleen (per label) + Hydroguard 11 ml, pH 5.8':`Week ${w} res change → mix in order (Mix tab), pH 5.8, read EC`,s:'Calibrate the pH pen (7 + 4) while the bucket is open',ic:'res'});}
 else checks.push({k:'res',t:(d>2&&b.reservoir_change_day)?'Top off to the line with pH 5.8 RO, then read pH + EC':b.reservoir_task,ic:'res'});
 sents.forEach((s,i)=>checks.push({k:'a'+(i+1),t:s,ic:/LST|tie|bend/i.test(s)?'lst':/PPFD|light|dim/i.test(s)?'ppfd':/trichome|pistil|harvest|chop/i.test(s)?'event':'tip'}));
 if(d>=3) RS.daily_check_routine.forEach((r,i)=>checks.push({k:ROUTINE_KEYS[i]||('r'+i),t:r.title,s:r.detail,ic:['water','res','ph','ec','ppfd','photo'][i]||'tip',routine:true}));
 const co2=!!p.co2;
 let ec=null;
 if(d>2&&mix){ if(mw===10) ec=[0,300]; else {const n=nums(mix.ec_target_uScm);if(n.length>=2)ec=[n[0],n[1]];} }
 const ppfdT=(co2&&b.ppfd_with_co2)?nums(b.ppfd_with_co2)[0]:b.ppfd;
 const T={ph:b.ph_band?[b.ph_band[0],b.ph_band[1]]:null, ec, water:rng(b.water_temp_F), air:rng(b.env_targets&&b.env_targets.air_temp_F,co2), rh:rng(b.env_targets&&b.env_targets.rh), vpd:rng(b.env_targets&&b.env_targets.vpd_kPa), ppfd:ppfdT??null, co2:(co2&&b.ppfd_with_co2)?[1000,1200]:null};
 return {d,w:weekOf(d),b,stage:b.stage,isRes,resWeek:isRes?resIdx+1:null,mixWeek:mw,mix,checks,T,why:stageRow(d),date:dateOf(p,d)};
}
/* ---------------- metrics + grading ---------------- */
const MET=[
 {k:'ph',lab:'pH',ic:'ph',step:.05,dec:2,unit:'',tip:'ph'},
 {k:'ec',lab:'EC',ic:'ec',step:10,dec:0,unit:'µS/cm',tip:'ec'},
 {k:'water',lab:'Water',ic:'water',step:.5,dec:1,unit:'°F',tip:'water'},
 {k:'air',lab:'Air',ic:'temp',step:.5,dec:1,unit:'°F',tip:'temp'},
 {k:'rh',lab:'RH',ic:'rh',step:1,dec:0,unit:'%',tip:'rh'},
 {k:'vpd',lab:'VPD',ic:'vpd',step:.05,dec:2,unit:'kPa',auto:true,tip:'vpd'},
 {k:'ppfd',lab:'PPFD',ic:'ppfd',step:10,dec:0,unit:'',tip:'ppfd'},
 {k:'co2',lab:'CO2',ic:'co2',step:25,dec:0,unit:'ppm',tip:'co2'}
];
const svp=c=>0.61078*Math.exp(17.27*c/(c+237.3));
const f2c=f=>(f-32)*5/9;
function vpdCalc(air,rh,off){if(air==null||rh==null||air===''||rh==='')return null;const v=svp(f2c(air-off))-svp(f2c(air))*rh/100;return Math.round(v*100)/100;}
function grade(k,v,T){
 if(v==null||v===''||Number.isNaN(+v))return 'none';
 if(k==='co2'){ if(v>1500)return 'bad'; if(!T.co2)return 'none'; }
 const t=T[k]; if(t==null)return 'none';
 if(k==='ppfd'){const dlt=Math.abs(v-t);if(dlt<=Math.max(10,t*.04))return 'ok';if(dlt<=Math.max(30,t*.12))return 'warn';return 'bad';}
 const [lo,hi]=t; if(v>=lo&&v<=hi)return 'ok';
 const m={ph:.15,ec:Math.max(50,hi*.1),water:1,air:2,rh:5,vpd:.1,co2:150}[k]||0;
 return (v>=lo-m&&v<=hi+m)?'warn':'bad';
}
const tStr=(k,T)=>{const t=T[k];if(t==null)return k==='co2'?'only >1,500 ppm flagged':'no target today';if(k==='ppfd')return `target ${t}`;if(k==='ec'&&t[0]===0)return `under ${t[1]}`;const f=v=>k==="ph"?(+v).toFixed(1):v;return `target ${f(t[0])}–${f(t[1])}`;};
const lastReading=dl=>dl&&dl.readings&&dl.readings.length?dl.readings[dl.readings.length-1]:null;
function scoreDay(p,d){
 const info=dayInfo(p,d), dl=DL(p,d); const r=lastReading(dl)||{};
 let met=0,close=0,miss=0,graded=0; const g={};
 MET.forEach(m=>{const x=grade(m.k,r[m.k],info.T);g[m.k]=x;if(x!=='none'){graded++;if(x==='ok')met++;else if(x==='warn')close++;else miss++;}});
 const tot=info.checks.length, done=info.checks.filter(c=>dl&&dl.checks[c.k]).length;
 let status='none';
 const logged=!!(dl&&(dl.readings.length||done>0||dl.note||dl.saved));
 if(logged){ if(miss)status='bad'; else if(close||(tot&&done/tot<.6))status='warn'; else status='ok'; }
 else if(p.day1&&d<dayOf(p))status='miss';
 return {met,close,miss,graded,done,tot,status,g,info,logged};
}
/* ---------------- adjustments ---------------- */
function advice(k,v,T,info){
 const t=T[k]; if(t==null||v==null)return null; const st=info.why;
 const hi=k==='ppfd'?v>t:v>t[1];
 const A={
  ph:hi?['pH high','Add 0.5 ml pH Down diluted in a cup of res water, stir, wait 15 min, re-read. Drops, not squirts. A slow rise is normal in DWC.']:['pH low','Add pH Up the same way (diluted, small dose). A fast pH drop can mean root trouble: lift the lid and check the roots are white and smell earthy.'],
  ec:hi?['EC high','Too strong: top off with plain pH 5.8 RO. If it is way over, do a partial change. Next mix, use the low end of the week.']:(T.ec[0]===0?null:['EC low','She is hungry: top off with a quarter-strength mix of this week\'s recipe. Next res change, mix at the high end of the range.']),
  water:hi?['Water warm','Check the VEVOR chiller setpoint (67°F), clear its fins/filter, and make sure the airstones are running hard. Over 70°F = root-rot risk.']:['Water cool','Raise the chiller setpoint 1°F. Cold roots slow nutrient uptake.'],
  air:hi?['Air hot','Lower the AC setpoint or boost exhaust. Keep the night drop under 10°F.']:['Air cool','Raise the AC setpoint / slow the exhaust. Cold slows growth and raises RH.'],
  rh:hi?['RH high','Turn the humidifier down or off and raise exhaust a notch. High RH in flower = bud-rot risk.']:['RH low','Turn the humidifier up a step. Low RH makes the plant transpire too hard.'],
  vpd:hi?['VPD high (air too thirsty)','Raise RH (humidifier up) or drop air temp 1–2°F.']:['VPD low (air too damp)','Lower RH (humidifier down, exhaust up) or raise air temp 1–2°F.'],
  ppfd:hi?['PPFD above target','Dim back to today\'s number or raise the light. Taco/bleach = repeat yesterday\'s PPFD.']:['PPFD below target','Dim up or lower the light to hit today\'s number at the tallest top.'],
  co2:['CO2 too high','Over 1,500 ppm is unsafe: turn the tank valve down and ventilate the room.']
 }[k];
 if(!A)return null; return {k,title:A[0],text:A[1],why:st.why_title+': '+st.why};
}
const ADJ_CHIPS=['pH Down','pH Up','Topped off RO','¼-strength top-off','Chiller setpoint','AC setpoint','Humidifier ↑','Humidifier ↓','Exhaust changed','PPFD changed','Light raised','LST tie','Defoliated','Res change','CO2 changed','Pest check'];
/* ---------------- fx + haptics ---------------- */
const vib=p=>{if(S&&S.settings.haptics&&navigator.vibrate)try{navigator.vibrate(p);}catch(e){}};
const reduce=matchMedia('(prefers-reduced-motion: reduce)');
function sparkle(x,y,n=10,cols=['#ffd34d','#fff','#ff5fa2','#b78bff']){
 if(reduce.matches||x==null)return; const fx=$('#fx');
 const rp=document.createElement('i');rp.className='ripple';rp.style.left=x+'px';rp.style.top=y+'px';fx.appendChild(rp);setTimeout(()=>rp.remove(),520);
 for(let i=0;i<n;i++){const s=document.createElement('i');s.className='spk';const a=Math.random()*6.28,r=30+Math.random()*40;s.style.cssText=`left:${x}px;top:${y}px;--x:${Math.cos(a)*r}px;--y:${Math.sin(a)*r}px;--c:${cols[i%cols.length]}`;fx.appendChild(s);setTimeout(()=>s.remove(),720);}
}
function confetti(n=60){
 if(reduce.matches)return; const fx=$('#fx'),cols=['#ffd34d','#ff5fa2','#b78bff','#3ee08f','#fff','#7fd3ff'];
 for(let i=0;i<n;i++){const c=document.createElement('i');c.className='conf';const d=1.6+Math.random()*1.4;c.style.cssText=`left:${Math.random()*100}vw;background:${cols[i%6]};--x:${(Math.random()-.5)*160}px;--r:${Math.random()*900-450}deg;--d:${d}s;animation-delay:${Math.random()*.3}s`;fx.appendChild(c);setTimeout(()=>c.remove(),(d+.4)*1000);}
}
let toastT=0;
function toast(t){const el=$('#toast');el.textContent=t;el.classList.add('show');clearTimeout(toastT);toastT=setTimeout(()=>el.classList.remove('show'),2600);}
/* ---------------- Towie reactions ---------------- */
const REACT={
 home:['wave','Home base. Chill vibes only.'],day:['tilt',"Let's knock out today!"],days:['point','Every square is a day of the run!'],logbook:['tilt','Your grow diary, all in one place.'],
 mix:['mix','Shake shake… always in order!'],charts:['point','Peep that trend line!'],ph:['ph','pH check! Sweet spot is 5.8.'],ec:['ph',"EC = how hard she's eating."],
 water:['point','67–68°F keeps roots happy.'],temp:['tilt','Warm days, small night drop.'],rh:['tilt','Humidity is her breathing room.'],vpd:['tilt','VPD = how thirsty the air is.'],
 co2:['point','CO2 only with high light!'],ppfd:['point',"Here's today's light target!"],res:['mix','Fresh res = happy roots.'],lst:['wave',"Bend it, don't break it."],
 event:['cheer','Ooh, milestone!'],photos:['wave','Glow-up gallery! Say cheese.'],analysis:['point','Big-brain mode: the whole run at a glance.'],more:['spin','The rest of my toolbox!'],plants:['spin','Your plant crew!'],settings:['spin',"Tweak away, I don't mind."],tip:['tilt','Knowledge is power, my guy.'],
 streak:['cheer','Streak power!!'],photo:['wave','Say cheese, plant!'],export:['point',"Pick the days, I'll pack them up."],adjust:['ph','Small tweaks, big buds.'],bell:['wave',"I'll nudge you daily."]
};
function react(name,el,ev){
 vib(12);
 const ic=el&&(el.classList.contains('ic')?el:el.querySelector('.ic'));
 if(ic){ic.classList.remove('squish','spinme');void ic.offsetWidth;ic.classList.add(name==='settings'||name==='plants'?'spinme':'squish');setTimeout(()=>ic.classList.remove('squish','spinme'),700);}
 if(ev&&ev.clientX)sparkle(ev.clientX,ev.clientY,8);
 if(name==='harvest'){const p=P(),left=(p.harvestDay||70)-(dayOf(p)||0);Towie.smoke([[0,`${left>0?left+' days to chop':'Chop time'}! Early celebration…`],[1900,'*holds it* 😤'],[2800,'Ahhh… almost harvest ☁️']]);return;}
 const r=REACT[name]; if(r) Towie.act(r[0],r[1]);
}
document.addEventListener('click',e=>{
 const r=e.target.closest('[data-react]'); if(r) react(r.dataset.react,r,e);
 const g=e.target.closest('[data-go]'); if(g){e.preventDefault();go(g.dataset.go);}
});
/* ---------------- routing ---------------- */
const TABS=[['home','Home','home'],['day','Today','log'],['days','Days','day'],['photos','Photos','gallery'],['analysis','Analysis','analysis'],['more','More','more']];
const MORE_ROUTES=['mix','export','plants','plant','settings'];
const tabOf=n=>n==='logbook'?'days':n==='trends'?'analysis':MORE_ROUTES.includes(n)?'more':n;
const MORE_ITEMS=[['mix','Res mix','mix','Mix order + ml calculator'],['export','Export','export','Send to Grok Bot, CSV, PDF'],['logbook','Logbook','journal','Every note + change'],['plants','Plants & runs','plants','Tents, Day 1, res days'],['settings','Settings','settings','Reminder, backup, VPD'],['day','Log today','log','Jump to today\'s page']];
function openMore(){vib(10);openSheet(`<div class="row" style="margin-bottom:10px"><span>${icon('more')}</span><h2 class="grow" style="margin:0">More</h2><button class="btn sm ghost" data-close>Close</button></div><div class="more-grid">${MORE_ITEMS.map(([k,l,ic,sub],i)=>`<a class="more-tile" data-close href="#${k}" data-react="${k==='logbook'?'logbook':ic}" style="--i:${i}">${icon(ic)}<b>${l}</b><span>${sub}</span></a>`).join('')}</div>`);}
let lastIdx=0;
function go(h){ if(location.hash.slice(1)===h) route(); else location.hash=h; }
window.addEventListener('hashchange',route);
function route(){
 const h=location.hash.slice(1)||'home'; const [name,arg]=h.split('/');
 const idx=TABS.findIndex(t=>t[0]===tabOf(name));
 const v=$('#view'); v.className=''; void v.offsetWidth; v.className='view-in'+(idx>=0&&idx<lastIdx?' back':''); if(idx>=0)lastIdx=idx;
 const fn={home:vHome,day:vDay,days:vDays,logbook:vLogbook,mix:vMix,trends:vAnalysis,analysis:vAnalysis,photos:vPhotos,plants:vPlants,plant:vPlantEdit,settings:vSettings,export:vExport}[name]||vHome;
 if(name==='more'){history.replaceState(null,'','#home');vHome();renderTabs('home');renderChip();openMore();return;}
 closeSheet(); fn(arg); renderTabs(name); renderChip(); window.scrollTo(0,0);
}
function renderTabs(cur){
 const t=tabOf(cur);$('#tabs').innerHTML=TABS.map(([k,l,ic])=>k==='more'?`<button class="tab ${t===k?'on':''}" id="moreTab" data-react="more" aria-label="More">${icon(ic)}<span>${l}</span></button>`:`<a class="tab ${t===k?'on':''}" href="#${k}" data-react="${k}">${icon(ic)}<span>${l}</span></a>`).join('');
 $('#moreTab').onclick=openMore;
}
function renderChip(){
 const p=P(), d=dayOf(p);
 $('#plantChip').innerHTML=`${icon('plants')}<span class="grow" style="overflow:hidden;text-overflow:ellipsis">${esc(p.name)}</span><small>${d?(d>=1?'Day '+d:'starts '+fmt(pd(p.day1))):'no date'}</small>`;
}
/* ---------------- sheet ---------------- */
function openSheet(html){const s=$('#sheet');$('.sheet-body',s).innerHTML=html;s.classList.add('open');s.setAttribute('aria-hidden','false');}
function closeSheet(){const s=$('#sheet');if(!s.classList.contains('open'))return;s.classList.remove('open');s.setAttribute('aria-hidden','true');}
/* ---------------- streak + badges ---------------- */
function loggedDates(){const set=new Set();S.plants.forEach(p=>{const ds=S.days[p.id]||{};Object.entries(ds).forEach(([d,x])=>{if(x.saved||x.readings.length||Object.values(x.checks).some(Boolean)){const dt=dateOf(p,+d);if(dt)set.add(ymd(dt));}});});return set;}
function streak(){const set=loggedDates();let d=today0();if(!set.has(ymd(d)))d=addD(d,-1);let n=0;while(set.has(ymd(d))){n++;d=addD(d,-1);}return n;}
const allLogs=()=>S.plants.flatMap(p=>Object.entries(S.days[p.id]||{}).map(([d,x])=>[p,+d,x]));
const BADGES=[
 {id:'first',name:'First Log',ic:'log',test:()=>allLogs().some(([p,d,x])=>x.saved)},
 {id:'s3',name:'3-Day Streak',ic:'streak',test:()=>streak()>=3},
 {id:'s7',name:'7-Day Streak',ic:'streak',test:()=>streak()>=7},
 {id:'perfect',name:'Perfect Day',ic:'event',test:()=>allLogs().some(([p,d])=>{const s=scoreDay(p,d);return s.graded>=5&&s.met===s.graded&&s.done===s.tot;})},
 {id:'res',name:'Res Master',ic:'res',test:()=>allLogs().some(([p,d,x])=>x.mix&&x.saved)},
 {id:'lst',name:'Bender',ic:'lst',test:()=>allLogs().some(([p,d,x])=>x.adj.includes('LST tie'))},
 {id:'d10',name:'10 Days Logged',ic:'day',test:()=>allLogs().filter(([p,d,x])=>x.saved).length>=10},
 {id:'s30',name:'30-Day Legend',ic:'harvest',test:()=>streak()>=30}
];
function checkBadges(){let got=null;BADGES.forEach(b=>{if(!S.unlocked[b.id]&&b.test()){S.unlocked[b.id]=ymd(new Date());got=b;}});if(got){save();setTimeout(()=>{confetti(80);vib([30,40,30,40,80]);toast(`🏅 Badge unlocked: ${got.name}!`);},900);}}
const badgesHTML=()=>`<div class="badges">${BADGES.map(b=>`<div class="badge ${S.unlocked[b.id]?'':'locked'}" data-react="${S.unlocked[b.id]?'streak':'tip'}"><div class="medal">${icon(b.ic)}</div>${b.name}</div>`).join('')}</div>`;
/* ---------------- HOME ---------------- */
function prevLog(p,d){for(let i=d-1;i>=1;i--){const x=DL(p,i);if(x&&x.readings.length)return x;}return null;}
function timelineCard(p){return `<div class="card"><h2>Week 1–10 timeline</h2>${RS.stage_targets.map(s=>`<div class="list-item">${icon('day')}<div class="grow"><b>${esc(s.stage)}</b> <span class="small muted">Days ${esc(s.days)}${p.day1?' · '+fmt(dateOf(p,s.day_start))+'–'+fmt(dateOf(p,s.day_end)):''}</span><div class="small muted">PPFD ${esc(s.ppfd)} · RH ${esc(s.rh)} · VPD ${esc(s.vpd_kPa)}</div></div></div>`).join('')}</div>`;}
function vHome(){
 const p=P(), d=dayOf(p), V=$('#view');
 if(!d||d<1){V.innerHTML=`<div class="stagger"><div class="card hero" style="text-align:center"><img src="img/towie_hero.png" alt="Towie waving" style="width:160px"><div class="kicker">${esc(p.strain||p.name)}</div><h1 style="margin:6px 0">${d?'Starts '+fmtL(pd(p.day1)):'No start date yet'}</h1><p class="muted">The Day 1–70 timeline is ready${d?'':' with blank dates'}. Set Day 1 (the day the seed goes into its RO soak) when you start.</p><button class="btn" data-go="plant/${p.id}">Set Day 1</button></div>${timelineCard(p)}</div>`;Towie.mood(null);return;}
 const dd=Math.min(d,70), info=dayInfo(p,dd), sc=scoreDay(p,dd), st=streak(), dl=DL(p,dd);
 const next=[...p.resDays].sort((a,b)=>a-b).find(x=>x>=d), nd=next?dateOf(p,next):null, inDays=next?next-d:null, nIdx=next?[...p.resDays].sort((a,b)=>a-b).indexOf(next):-1;
 const hd=p.harvestDay||70, hDate=dateOf(p,hd), left=hd-d;
 const done=!!(dl&&dl.saved);
 const r=lastReading(dl)||lastReading(prevLog(p,dd));
 const todo=info.checks.filter(c=>!(dl&&dl.checks[c.k])).slice(0,4);
 V.innerHTML=`<div class="stagger">
 ${!done&&d<=70?`<button class="banner" style="width:100%;text-align:left;color:inherit" data-go="day">${icon('bell')}<div class="grow"><b>Log Day ${d}: takes 20 seconds</b><div class="small">Towie's got his clipboard ready.${st?` Keep the ${st}-day streak alive!`:''}</div></div><span style="font-size:22px">›</span></button>`:''}
 <div class="card hero">
  <div class="kicker">AlmondGold · ${esc(p.name)}</div>
  <div class="row" style="align-items:flex-end;gap:12px;margin-top:4px;flex-wrap:wrap"><div class="daynum">DAY ${d}</div><div style="padding-bottom:6px"><div class="stagechip">Week ${weekOf(dd)} · ${esc(info.stage)}</div></div></div>
  <div class="small muted" style="margin-top:6px">${fmtL(today0())} · 18/6 · ${p.gal} gal DWC${info.isRes?' · <b style="color:var(--gold2)">🪣 res change today</b>':''}</div>
  <div class="bar"><i style="width:${Math.min(100,dd/hd*100)}%"></i></div>
  <div class="row small muted" style="justify-content:space-between;margin-top:4px"><span>Day 1 · ${fmt(pd(p.day1))}</span><span>Chop ~Day ${hd} · ${fmt(hDate)}</span></div>
 </div>
 <div class="grid2">
  <button class="tile pressable" data-react="ppfd">${icon('ppfd')}<span>Today's PPFD</span><b>${info.T.ppfd??'Dark'}</b><span>${p.co2&&info.b.ppfd_with_co2?'CO2 path':'µmol/m²/s at the top'}</span></button>
  <button class="tile pressable" data-react="harvest">${icon('harvest')}<span>Harvest in</span><b>${left>0?left+' days':left===0?'TODAY':'Done'}</b><span>~${fmtL(hDate)}</span></button>
  <button class="tile pressable ${inDays===0?'alert':''}" data-react="res" data-go="mix">${icon('res')}<span>Next res change</span><b>${next?(inDays===0?'TODAY':inDays===1?'Tomorrow':'in '+inDays+' days'):'—'}</b><span>${next?`Day ${next} · ${fmt(nd)} · ${nIdx>=9?'Flush':'Week '+(nIdx+1)+' mix'}`:'none scheduled'}</span></button>
  <button class="tile pressable ${done?'done':'alert'}" data-react="streak" data-go="day">${icon('streak')}<span>Today's log</span><b>${done?'Logged ✓':'Not yet'}</b><span>🔥 ${st}-day streak${sc.graded?` · ${sc.met}/${sc.graded} met`:''}</span></button>
 </div>
 <div class="card" style="margin-top:12px"><div class="row"><h2 class="grow">Today's to-do</h2><span class="pill ${sc.done===sc.tot?'g-ok':'g-warn'}">${sc.done}/${sc.tot}</span></div>
  ${todo.length?todo.map(c=>`<div class="row small" style="padding:6px 0;border-bottom:1px solid rgba(255,255,255,.06)">${icon(c.ic)}<span class="grow">${esc(c.t)}</span></div>`).join(''):'<p class="muted small">All done today. Towie is proud. 😎</p>'}
  <button class="btn block" data-go="day" style="margin-top:10px">${icon('log')} Open Day ${dd}</button></div>
 ${r?`<div class="card"><h2>Latest readings</h2><div class="chips">${MET.filter(m=>r[m.k]!=null).map(m=>`<span class="pill g-${grade(m.k,r[m.k],info.T)}" data-react="${m.ic}">${m.lab} ${r[m.k]}${m.k==='ec'?'':m.unit}</span>`).join('')}</div></div>`:''}
 <div class="card" data-react="tip"><div class="row" style="align-items:flex-start">${icon('tip')}<div class="grow"><div class="kicker">Why it matters · ${esc(info.why.stage)}</div><b>${esc(info.why.why_title)}</b><p class="small" style="margin:4px 0 0">${esc(info.why.why)}</p></div></div></div>
 <div class="card"><h2>Badges</h2>${badgesHTML()}</div>
 </div>`;
 Towie.mood(sc.miss?'worried':sc.graded&&sc.met===sc.graded?'happy':null);
}
/* ---------------- DAY PAGE (core) ---------------- */
let DS=null;
const GL={ok:'✓ met',warn:'≈ close',bad:'✕ missed'};
function liveVpd(){return vpdCalc(DS.touched.air?DS.vals.air:null,DS.touched.rh?DS.vals.rh:null,S.settings.leafOffsetF);}
function vDay(arg){
 const p=P(); let d=arg?+arg:(dayOf(p)||1);
 d=Math.max(1,Math.min(70,d||1));
 const info=dayInfo(p,d), dl=DL(p,d,true), prevR=lastReading(prevLog(p,d))||{}, cur=lastReading(dl);
 DS={p,d,info,dl,vals:{},touched:{}};
 MET.forEach(m=>{if(m.auto)return; if(cur&&cur[m.k]!=null){DS.vals[m.k]=cur[m.k];DS.touched[m.k]=true;} else if(prevR[m.k]!=null){DS.vals[m.k]=prevR[m.k];} });
 if(DS.vals.ppfd==null&&info.T.ppfd!=null) DS.vals.ppfd=info.T.ppfd;
 const isToday=dayOf(p)===d, hasPrefill=MET.some(m=>!m.auto&&DS.vals[m.k]!=null&&!DS.touched[m.k]);
 $('#view').innerHTML=`<div class="stagger">
 <div class="card hero"><div class="dayhead">
  <button class="daynav" ${d<=1?'disabled':''} data-go="day/${d-1}" aria-label="Previous day">‹</button>
  <div class="grow" style="text-align:center"><div class="kicker">${isToday?'TODAY · ':''}Week ${info.w} · ${esc(info.stage)}</div><div class="daynum" style="font-size:40px">DAY ${d}</div><div class="small muted">${info.date?fmtL(info.date):'date appears once Day 1 is set'}${info.isRes?' · 🪣 RES CHANGE':''}${dl.saved?' · saved ✓':''}</div></div>
  <button class="daynav" ${d>=70?'disabled':''} data-go="day/${d+1}" aria-label="Next day">›</button></div>
  <div class="row" style="margin-top:12px"><div class="score" id="scoreRing"></div><div class="grow small" id="scoreTxt"></div></div>
 </div>
 <div class="card"><div class="row"><span data-react="ph">${icon('ph')}</span><h2 class="grow" style="margin:0">Targets & readings</h2>${hasPrefill?`<button class="btn sm ghost" id="sameY">Same as yesterday</button>`:''}</div>
  <div class="small muted" style="margin:6px 0 8px">${hasPrefill?'Faded = yesterday\'s value. Tap ± or type to log today\'s.':'Tap ± or type a value; it saves as you go.'}</div>
  <div id="rds"></div>
  <div class="row" style="gap:8px"><input type="time" id="rTime" value="${esc(cur&&cur.t||nowHM())}" style="width:120px" aria-label="Reading time"><span class="small muted grow">${dl.readings.length>1?dl.readings.length+' readings (latest is graded)':''}</span><button class="btn sm ghost" id="addReading">+ Reading</button></div>
 </div>
 <div class="card" id="adjCard"></div>
 <div class="card"><div class="row"><span data-react="day">${icon('day')}</span><h2 class="grow" style="margin:0">Do today</h2><span class="pill" id="taskPill"></span></div><div id="checks" style="margin-top:10px"></div>${info.isRes?`<a class="btn ghost block" href="#mix" data-react="mix" style="margin-top:8px">${icon('mix')} Open the res mix (order + ml)</a>`:''}
  <div class="why"><b>Watch for:</b> ${esc(info.b.watch_for)}</div>${info.b.notes?`<div class="why"><b>Note:</b> ${esc(info.b.notes)}</div>`:''}</div>
 <div class="card"><h2>What I did / changed</h2>
  <div class="chips" id="adjChips">${ADJ_CHIPS.map(c=>`<button class="chip ${dl.adj.includes(c)?'on':''}" data-adj="${esc(c)}">${esc(c)}</button>`).join('')}</div>
  <textarea id="note" placeholder="e.g. Raised chiller to 67, tucked two fan leaves, new pistils up top…" style="margin-top:10px">${esc(dl.note)}</textarea>
  <div class="row" style="margin-top:10px;flex-wrap:wrap"><label class="btn ghost sm" data-react="photo">${icon('photo')} Camera<input type="file" accept="image/*" capture="environment" id="photoIn" hidden></label><label class="btn ghost sm" data-react="photos">${icon('gallery')} Gallery<input type="file" accept="image/*" multiple id="photoIn2" hidden></label><a class="small muted" href="#photos" style="margin-left:auto">All photos ›</a></div>
  <div class="thumbs" id="dayThumbs"></div><div class="small muted" style="margin-top:4px">🔒 Photos are saved on this phone only.</div>
 </div>
 <div class="card" data-react="tip"><div class="row" style="align-items:flex-start">${icon('tip')}<div class="grow"><div class="kicker">Why it matters</div><b>${esc(info.why.why_title)}</b><p class="small" style="margin:4px 0 0">${esc(info.why.why)}</p></div></div></div>
 <button class="btn block" id="saveDay" style="font-size:17px;padding:16px">${icon('log')} Save Day ${d}</button>
 </div>`;
 renderReadings(); renderChecks(); renderScore();
 const drawThumbs=()=>{const ph=photosOf(p,d);$('#dayThumbs').innerHTML=ph.map((x,i)=>`<button class="thumb" data-ti="${i}"><img data-ph="${x.id}" alt="Day ${d} photo ${i+1}"></button>`).join('');fillThumbs($('#dayThumbs'));$$('#dayThumbs [data-ti]').forEach(b=>b.onclick=()=>viewer(photosOf(p,d).map(x=>({d,...x})),+b.dataset.ti));};drawThumbs();
 const sy=$('#sameY'); if(sy) sy.onclick=e=>{MET.forEach(m=>{if(!m.auto&&DS.vals[m.k]!=null)DS.touched[m.k]=true;});commitReadings();renderReadings();renderScore();sparkle(e.clientX,e.clientY,12);vib(15);sy.remove();Towie.act('cheer','Copied! Consistency is king.');};
 $('#addReading').onclick=()=>{commitReadings();if(dl.readings.length&&MET.some(m=>DS.touched[m.k])){dl.readings.push({t:nowHM()});}MET.forEach(m=>DS.touched[m.k]=false);$('#rTime').value=nowHM();save();toast('New reading: enter the values');renderReadings();renderScore();};
 $('#rTime').onchange=e=>{const r=lastReading(dl);if(r){r.t=e.target.value;save();}};
 $('#note').oninput=e=>{dl.note=e.target.value;save();};
 $$('[data-adj]').forEach(b=>b.onclick=e=>{const c=b.dataset.adj;const i=dl.adj.indexOf(c);if(i>=0)dl.adj.splice(i,1);else{dl.adj.push(c);sparkle(e.clientX,e.clientY,6);}b.classList.toggle('on');vib(8);save();if(c==='LST tie'&&i<0)Towie.act('wave',"Bend it, don't break it!");});
 const onPh=async e=>{const fs=[...e.target.files];if(!fs.length)return;try{for(const f of fs)await addPhoto(p,d,f);}catch(err){toast(err.message);}e.target.value='';drawThumbs();Towie.act('wave',"Lookin' good!");};
 $('#photoIn').onchange=onPh;$('#photoIn2').onchange=onPh;
 $('#saveDay').onclick=e=>{commitReadings();dl.saved=new Date().toISOString();save();const sc=scoreDay(p,d);
  sparkle(e.clientX,e.clientY,18);confetti(sc.miss?20:70);vib([20,40,20,40,60]);
  Towie.act('cheer',sc.miss?`Saved! ${sc.miss} reading${sc.miss>1?'s':''} off: check Adjust.`:sc.graded?`Saved! ${sc.met}/${sc.graded} met. Legend.`:'Saved! Nice work.').then(()=>Towie.smoke([[0,'Log saved… reward hit 😌'],[1900,'*holds it*'],[2800,'Ahhh… see you tomorrow ☁️']]));
  checkBadges(); toast(`Day ${d} saved ✓  ${sc.met}/${sc.graded} targets · ${sc.done}/${sc.tot} tasks`);
  const sm=$('.hero .small.muted');if(sm&&!/saved/.test(sm.textContent))sm.textContent+=' · saved ✓';};
 const sc0=scoreDay(p,d);Towie.mood(sc0.miss?'worried':sc0.graded&&sc0.met===sc0.graded?'happy':null);
}
function commitReadings(){
 const {dl,vals,touched}=DS; if(!MET.some(m=>touched[m.k]))return;
 let r=lastReading(dl); if(!r){r={t:($('#rTime')&&$('#rTime').value)||nowHM()};dl.readings.push(r);}
 MET.forEach(m=>{if(m.auto)return; r[m.k]=touched[m.k]&&vals[m.k]!=null&&vals[m.k]!==''?+vals[m.k]:null;});
 r.vpd=vpdCalc(r.air,r.rh,S.settings.leafOffsetF);
 save();
}
function rowHTML(m){
 const {info,vals,touched}=DS;
 if(m.auto){const v=liveVpd(),g=grade('vpd',v,info.T);return `<div class="rd g-${g}" data-k="vpd"><span data-react="vpd">${icon('vpd')}</span><div><div class="lab">VPD <span class="muted small">kPa</span></div><div class="tgt">${tStr('vpd',info.T)}</div></div><div style="text-align:right"><b class="vpdv" style="font-family:Bungee;font-weight:400;font-size:20px">${v??'—'}</b><div class="tgt">auto · leaf −${S.settings.leafOffsetF}°F</div></div><div class="grade"><span>${GL[g]||'needs air + RH'}</span><span></span></div></div>`;}
 const v=vals[m.k], t=touched[m.k], g=t?grade(m.k,v,info.T):'none';
 return `<div class="rd g-${g}" data-k="${m.k}"><span data-react="${m.ic}">${icon(m.ic)}</span><div><div class="lab">${m.lab} <span class="muted small">${m.unit}</span></div><div class="tgt">${tStr(m.k,info.T)}</div></div>
  <div class="stepper"><button data-st="-1" aria-label="${m.lab} down">−</button><input inputmode="decimal" type="number" step="${m.step}" value="${v??''}" placeholder="—" aria-label="${m.lab}" class="${t?'':'pre'}"><button data-st="1" aria-label="${m.lab} up">+</button></div>
  <div class="grade"><span>${GL[g]||(t?'no target today':'not logged yet')}</span><span>${!t&&v!=null?(m.k==='ppfd'&&!lastReading(prevLog(DS.p,DS.d))?'today\'s target':'yesterday'):''}</span></div></div>`;
}
function renderReadings(){
 const show=MET.filter(m=>m.k!=='co2'||DS.p.co2||DS.touched.co2);
 $('#rds').innerHTML=show.map(rowHTML).join('');
 $$('#rds .rd').forEach(bindRow);
}
function bindRow(row){
 const k=row.dataset.k,m=MET.find(x=>x.k===k),inp=$('input',row); if(!inp)return; const {info}=DS;
 const set=(nv,ev)=>{const before=grade(k,DS.touched[k]?DS.vals[k]:null,info.T);DS.vals[k]=nv;DS.touched[k]=true;commitReadings();
  const nr=document.createElement('div');nr.innerHTML=rowHTML(m);const g=grade(k,nv,info.T);row.className='rd g-'+g;$('.grade',row).innerHTML=$('.grade',nr.firstChild).innerHTML;inp.classList.remove('pre');
  if(k==='air'||k==='rh'){const vr=$('#rds .rd[data-k="vpd"]');if(vr){nr.innerHTML=rowHTML(MET.find(x=>x.k==='vpd'));vr.replaceWith(nr.firstChild);}}
  renderScore();
  if(g==='bad'&&before!=='bad')Towie.act('worry',k==='ph'?'pH is off! See Adjust 👇':`${m.lab} is outside target! 😰`);
  else if(g==='ok'&&before!=='ok'&&ev){const s=scoreDay(DS.p,DS.d);Towie.mood(s.miss?'worried':'happy');}};
 $$('button',row).forEach(b=>{let hold=0,rep=false;
  const stepOnce=()=>{const T=info.T[k];const base=inp.value===''?(DS.vals[k]??(T==null?0:Array.isArray(T)?(T[0]+T[1])/2:T)):+inp.value;const nv=+(base+(+b.dataset.st)*m.step).toFixed(m.dec);inp.value=nv;set(nv,true);vib(6);};
  b.addEventListener('click',e=>{if(rep){rep=false;return;}stepOnce();sparkle(e.clientX,e.clientY,4);});
  b.addEventListener('pointerdown',()=>{rep=false;clearTimeout(hold);hold=setTimeout(function r(){rep=true;stepOnce();hold=setTimeout(r,80);},450);});
  ['pointerup','pointerleave','pointercancel'].forEach(t=>b.addEventListener(t,()=>clearTimeout(hold)));});
 inp.addEventListener('focus',()=>inp.select());
 inp.addEventListener('change',()=>{if(inp.value==='')return;set(+inp.value,true);});
 inp.addEventListener('input',()=>{if(inp.value===''||/[.]$/.test(inp.value))return;const v=+inp.value;DS.vals[k]=v;DS.touched[k]=true;commitReadings();renderScore();row.className='rd g-'+grade(k,v,info.T);inp.classList.remove('pre');});
}
function renderChecks(){
 const {info,dl}=DS;
 $('#checks').innerHTML=info.checks.map(c=>`<button class="check ${dl.checks[c.k]?'on':''}" data-ck="${c.k}"><span class="box"></span>${icon(c.ic)}<span class="txt grow"><b style="font-weight:800">${esc(c.t)}</b>${c.s?`<small>${esc(c.s)}</small>`:''}</span></button>`).join('');
 $$('#checks .check').forEach(b=>b.onclick=e=>{const k=b.dataset.ck;dl.checks[k]=!dl.checks[k];b.classList.toggle('on',dl.checks[k]);save();renderScore();vib(dl.checks[k]?[10,30,10]:8);
  if(dl.checks[k]){sparkle(e.clientX,e.clientY,10,['#3ee08f','#fff','#ffd34d']);const c=info.checks.find(x=>x.k===k);
   if(info.checks.every(x=>dl.checks[x.k])){confetti(50);Towie.act('cheer','ALL tasks done! 🔥');}
   else if(k==='res'&&info.isRes)Towie.act('mix','Fresh res! Tap Open the res mix below.');
   else if(k==='r_ph')Towie.act('ph','pH checked. Respect.');
   else if(c.ic==='lst')Towie.act('wave','Nice bend!');}});
}
function renderScore(){
 const {p,d}=DS; const sc=scoreDay(p,d);
 const pct=sc.graded?Math.round((sc.met+sc.close*.5)/sc.graded*100):0;
 const c={ok:'var(--ok)',warn:'var(--warn)',bad:'var(--bad)',none:'#6b5a96',miss:'#6b5a96'}[sc.status];
 const ring=$('#scoreRing');ring.style.setProperty('--p',pct);ring.style.setProperty('--c',c);ring.innerHTML=`<div><b>${sc.met}/${sc.graded}</b><small>met</small></div>`;
 $('#scoreTxt').innerHTML=`<div class="chips" style="margin-bottom:6px"><span class="pill g-ok">✓ ${sc.met}</span><span class="pill g-warn">≈ ${sc.close}</span><span class="pill g-bad">✕ ${sc.miss}</span></div><b>Tasks ${sc.done}/${sc.tot}</b> <span class="muted">· ${sc.status==='ok'?'Crushing it.':sc.status==='bad'?'Something needs a tweak.':sc.logged?'Getting there.':'Nothing logged yet.'}</span>`;
 const tp=$('#taskPill');if(tp){tp.className='pill '+(sc.done===sc.tot?'g-ok':'g-warn');tp.textContent=`${sc.done}/${sc.tot}`;}
 renderAdj();
}
function renderAdj(){
 const {info,vals,touched}=DS;const el=$('#adjCard');if(!el)return;
 const items=MET.map(m=>{const v=m.auto?liveVpd():(touched[m.k]?vals[m.k]:null);const g=grade(m.k,v,info.T);if(g!=='bad'&&g!=='warn')return null;const a=advice(m.k,v,info.T,info);return a?Object.assign(a,{g}):null;}).filter(Boolean);
 el.innerHTML=`<div class="row"><span data-react="adjust">${icon('adjust')}</span><h2 class="grow" style="margin:0">Adjust</h2>${items.length?`<span class="pill g-bad">${items.length} to fix</span>`:''}</div>`+(items.length?'<div style="margin-top:10px">'+items.map(a=>`<div class="adjust g-${a.g}"><b>${esc(a.title)}</b><p>${esc(a.text)}</p><div class="why">${esc(a.why)}</div></div>`).join('')+'</div>':`<p class="small muted" style="margin:8px 0 0">Everything you've logged is on target. Nothing to change. 😎</p>`);
}
function loadImg(file){return new Promise((res,rej)=>{const img=new Image();img.onload=()=>res(img);img.onerror=()=>rej(new Error('Could not read that image'));img.src=URL.createObjectURL(file);});}
function toJpeg(img,max,q){const s=Math.min(1,max/Math.max(img.width,img.height));const c=document.createElement('canvas');c.width=Math.round(img.width*s);c.height=Math.round(img.height*s);c.getContext('2d').drawImage(img,0,0,c.width,c.height);return c.toDataURL('image/jpeg',q);}
async function shrink(file){const img=await loadImg(file);const u=toJpeg(img,1024,.8);URL.revokeObjectURL(img.src);return u;}
/* ---- photos: IndexedDB only (store 'photos'), never uploaded. Keys `${pid}:${day}:${id}` + `#t` thumbnail ---- */
const photosOf=(p,d)=>{const x=DL(p,d);if(!x)return [];if(!x.photos)x.photos=x.photo?[{id:`${p.id}:${d}`,at:x.saved||null}]:[];return x.photos;};
const allPhotos=p=>{const out=[];for(let d=1;d<=70;d++)photosOf(p,d).forEach(ph=>out.push({d,...ph}));return out;};
async function persistStorage(){try{if(navigator.storage&&navigator.storage.persist){if(await navigator.storage.persisted())return true;return await navigator.storage.persist();}}catch(_){}return false;}
async function addPhoto(p,d,file){const img=await loadImg(file);const full=toJpeg(img,1024,.8),th=toJpeg(img,360,.72);URL.revokeObjectURL(img.src);
 const id=`${p.id}:${d}:${Date.now().toString(36)}${Math.random().toString(36).slice(2,5)}`;await DB.put('photos',id,full);await DB.put('photos',id+'#t',th);
 const dl=DL(p,d,true);photosOf(p,d).push({id,at:new Date().toISOString()});dl.photo=true;save();persistStorage();return id;}
async function delPhoto(p,d,id){await DB.del('photos',id);await DB.del('photos',id+'#t');const dl=DL(p,d);if(!dl)return;dl.photos=photosOf(p,d).filter(x=>x.id!==id);dl.photo=dl.photos.length>0;save();}
const thumbOf=async id=>(await DB.get('photos',id+'#t'))||(await DB.get('photos',id));
function fillThumbs(root=document){$$('img[data-ph]',root).forEach(async im=>{const u=await thumbOf(im.dataset.ph);if(u){im.src=u;im.onload=()=>im.classList.add('in');}});}
/* lightbox viewer with swipe */
function viewer(list,i){const p=P();let k=i;const ov=document.createElement('div');ov.className='lightbox';document.body.appendChild(ov);
 const draw=async()=>{const it=list[k];const I=dayInfo(p,it.d),dt=dateOf(p,it.d);ov.innerHTML=`<div class="lb-top"><div><b>Day ${it.d}</b> · Week ${weekOf(it.d)} · ${esc(I.stage)}<div class="small muted">${dt?fmtL(dt):''} · ${k+1}/${list.length} · 🔒 on this phone only</div></div><button class="lb-x" aria-label="Close">✕</button></div>
  <div class="lb-stage"><button class="lb-nav" data-n="-1" aria-label="Previous" ${k?'':'disabled'}>‹</button><img class="lb-img" alt="Day ${it.d} photo"><button class="lb-nav" data-n="1" aria-label="Next" ${k<list.length-1?'':'disabled'}>›</button></div>
  <div class="lb-bar"><a class="btn sm" href="#day/${it.d}">${icon('log')} Open Day ${it.d}</a><button class="btn sm ghost" id="lbDel">Delete</button></div>`;
  const im=$('.lb-img',ov);im.src=(await DB.get('photos',it.id))||'';
  $('.lb-x',ov).onclick=close;$$('.lb-nav',ov).forEach(b=>b.onclick=()=>step(+b.dataset.n));$('a',ov).onclick=close;
  $('#lbDel',ov).onclick=async()=>{if(!confirm('Delete this photo from this phone?'))return;await delPhoto(p,it.d,it.id);list.splice(k,1);toast('Photo deleted');if(!list.length){close();route();return;}k=Math.min(k,list.length-1);draw();ov.dataset.dirty=1;};};
 const step=n=>{const j=k+n;if(j<0||j>=list.length)return;k=j;vib(6);draw();};
 const close=()=>{ov.classList.add('out');setTimeout(()=>ov.remove(),200);document.removeEventListener('keydown',kd);if(ov.dataset.dirty)route();};
 const kd=e=>{if(e.key==='Escape')close();if(e.key==='ArrowLeft')step(-1);if(e.key==='ArrowRight')step(1);};document.addEventListener('keydown',kd);
 let sx=null;ov.addEventListener('touchstart',e=>{sx=e.touches[0].clientX;},{passive:true});ov.addEventListener('touchend',e=>{if(sx==null)return;const dx=e.changedTouches[0].clientX-sx;sx=null;if(Math.abs(dx)>50)step(dx<0?1:-1);});
 draw();}
/* ---------------- DAYS (calendar) ---------------- */
const subnav=cur=>`<div class="chips" style="margin-bottom:12px"><a class="chip ${cur==='days'?'on':''}" href="#days" data-react="days">Calendar</a><a class="chip ${cur==='logbook'?'on':''}" href="#logbook" data-react="logbook">Logbook</a><a class="chip" href="#export" data-react="export">Export</a></div>`;
function vDays(){
 const p=P(), td=dayOf(p); let html=''; const counts={ok:0,warn:0,bad:0,miss:0};
 for(let w=1;w<=10;w++){
  html+=`<div class="wk">WEEK ${w}<span>${p.day1?fmt(dateOf(p,w*7-6))+' – '+fmt(dateOf(p,w*7)):'Days '+(w*7-6)+'–'+(w*7)} · ${esc(stageRow(w*7-3).stage)}</span></div>`;
  for(let d=w*7-6;d<=w*7;d++){const sc=scoreDay(p,d);if(counts[sc.status]!=null)counts[sc.status]++;
   html+=`<a class="cd ${sc.status==='none'?'':'s-'+sc.status} ${d===td?'today':''} pressable" href="#day/${d}" aria-label="Day ${d} ${sc.status}">${p.resDays.includes(d)?'<span class="resdot">🪣</span>':''}${d}<small>${p.day1?fmt(dateOf(p,d)):''}</small></a>`;}
 }
 $('#view').innerHTML=`<div class="stagger">${subnav('days')}
 <div class="card"><div class="row"><span data-react="days">${icon('day')}</span><h2 class="grow" style="margin:0">Run calendar</h2><span class="small muted">${esc(p.name)}</span></div>
  <div class="cal">${html}</div>
  <div class="legend"><span><i class="dot g-ok"></i> met ${counts.ok}</span><span><i class="dot g-warn"></i> close ${counts.warn}</span><span><i class="dot g-bad"></i> missed ${counts.bad}</span><span><i class="dot" style="--c:#ff4d6d55"></i> not logged ${counts.miss}</span><span>🪣 res change</span></div></div>
 <div class="card"><h2>Harvest · dry · cure</h2>${RS.harvest_dry_cure.map(h=>`<div class="list-item">${icon(/chop/i.test(h.phase)?'harvest':/dry/i.test(h.phase)?'rh':'event')}<div class="grow"><b>${esc(h.phase)}</b> <span class="small muted">Day ${esc(h.days)}${p.day1&&h.day_start?' · '+fmt(dateOf(p,h.day_start)):''}</span><div class="small">${esc(h.do||h.what||'')}</div><div class="small muted">${esc(h.conditions||'')}</div></div></div>`).join('')}</div>
 </div>`;
}
/* ---------------- LOGBOOK ---------------- */
let lbFilter='all';
function vLogbook(){
 const p=P(); const ds=Object.keys(S.days[p.id]||{}).map(Number).filter(d=>scoreDay(p,d).logged).sort((a,b)=>b-a);
 const list=ds.filter(d=>{const x=DL(p,d),s=scoreDay(p,d);return lbFilter==='all'||(lbFilter==='res'&&(x.mix||x.adj.includes('Res change')))||(lbFilter==='train'&&x.adj.some(a=>/LST|Defol/.test(a)))||(lbFilter==='miss'&&s.miss)||(lbFilter==='adj'&&x.adj.length);});
 $('#view').innerHTML=`<div class="stagger">${subnav('logbook')}
 <div class="scrollx" style="margin-bottom:10px">${[['all','All'],['res','Res changes'],['train','Training'],['adj','Adjustments'],['miss','Missed targets']].map(([k,l])=>`<button class="chip ${lbFilter===k?'on':''}" data-lb="${k}">${l}</button>`).join('')}</div>
 ${list.length?list.map(d=>{const x=DL(p,d),s=scoreDay(p,d),r=lastReading(x)||{};return `<a class="card pressable" style="display:block;color:inherit;text-decoration:none" href="#day/${d}"><div class="row" style="align-items:flex-start"><div class="score" style="--p:${s.graded?Math.round(s.met/s.graded*100):0};--c:${{ok:'var(--ok)',warn:'var(--warn)',bad:'var(--bad)'}[s.status]||'#6b5a96'};width:58px;height:58px"><b style="font-size:13px">${s.met}/${s.graded}</b></div><div class="grow"><b style="font-family:Bungee;font-weight:400">DAY ${d}</b> <span class="small muted">${s.info.date?fmtL(s.info.date):''} · ${esc(s.info.stage)}</span>
  <div class="chips" style="margin-top:4px">${MET.filter(m=>r[m.k]!=null).map(m=>`<span class="pill g-${s.g[m.k]}">${m.lab} ${r[m.k]}</span>`).join('')}</div>
  ${x.adj.length?`<div class="small" style="margin-top:4px">🔧 ${esc(x.adj.join(' · '))}</div>`:''}${x.mix?`<div class="small">🪣 Week ${x.mix.week} mix · ${x.mix.gal} gal</div>`:''}${x.note?`<div class="small muted" style="margin-top:4px">“${esc(x.note.slice(0,160))}”</div>`:''}<div class="small muted">Tasks ${s.done}/${s.tot}${x.photo?' · 📷':''}</div></div></div></a>`;}).join(''):`<div class="card" style="text-align:center"><p class="muted">Nothing here yet. Log a day and it shows up in your logbook.</p><button class="btn" data-go="day">Log today</button></div>`}
 </div>`;
 $$('[data-lb]').forEach(b=>b.onclick=()=>{lbFilter=b.dataset.lb;vib(8);vLogbook();});
}
/* ---------------- MIX ---------------- */
let MX={week:null,gal:5.5,done:{}};
function vMix(){
 const p=P(), d=dayOf(p)||1, r=[...p.resDays].sort((a,b)=>a-b);
 const nextI=r.findIndex(x=>x>=d), defW=Math.min(10,(nextI<0?r.length:nextI+1))||1;
 if(!MX.week)MX.week=defW;
 const w=MX.week, mx=mixWeek(w), k=MX.gal/(mx.ro_gal||5.5), resDay=r[w-1];
 const steps=[{t:RS.mixing_order[0].title.replace(/5\.5 gal/,MX.gal+' gal'),s:RS.mixing_order[0].detail,ml:null,ic:'water',why:'Clean start = no salt carryover and no root slime.'}];
 G.NUTES.forEach(n=>{const v=mx.ml[n.name]??mx.ml[n.name.replace('Flora','')];if(v==null)return;steps.push({t:n.name,ml:typeof v==='number'?+(v*k).toFixed(1):v,ic:n.k==='hg'?'res':n.k==='si'?'ec':'mix',why:n.why,s:n.k==='si'?'Stir 1 min, wait ~5 min':n.k==='micro'?'Always before Bloom':''});});
 if(mx.ml.FloraKleen)steps.push({t:'FloraKleen',ml:mx.ml.FloraKleen,ic:'mix',why:'Pulls leftover salts off the roots for a clean finish.',s:''});
 steps.push({t:`Wait 5–10 min → pH ${mx.ph_target} → read EC`,s:`EC target ${mx.ec_target_uScm} µS/cm`,ml:null,ic:'ph',why:'Nutrients shift pH as they settle. Adjust last and it stays put.'});
 const key=w+':'+MX.gal;
 $('#view').innerHTML=`<div class="stagger">
 <div class="card hero"><div class="row"><span data-react="mix">${icon('mix')}</span><div class="grow"><div class="kicker">Reservoir mix · ${esc(mx.stage)}</div><h1 style="margin:2px 0">Week ${w} ${w===10?'flush':'mix'}</h1><div class="small muted">${resDay?`Res change Day ${resDay}${p.day1?' · '+fmtL(dateOf(p,resDay)):''}`:''} · EC ${esc(mx.ec_target_uScm)} · pH ${mx.ph_target}</div></div></div>
  <div class="scrollx" style="margin-top:10px">${Array.from({length:10},(_,i)=>`<button class="chip ${w===i+1?'on':''}" data-wk="${i+1}">${i+1===defW?'★ ':''}Wk ${i+1}</button>`).join('')}</div>
  <div class="row" style="margin-top:10px"><span class="grow"><b>Gallons of RO</b><div class="small muted">ml scale with gallons (base 5.5)</div></span><div class="stepper"><button id="galDn" aria-label="Fewer gallons">−</button><input id="gal" type="number" step="0.5" value="${MX.gal}" inputmode="decimal" aria-label="Gallons"><button id="galUp" aria-label="More gallons">+</button></div></div>
 </div>
 <div class="card"><div class="row"><h2 class="grow" style="margin:0">Mix in this order</h2><span class="pill" id="mixPill"></span></div><div id="steps" style="margin-top:10px">
 ${steps.map((s,i)=>`<button class="step ${MX.done[key+':'+i]?'on':''}" data-i="${i}"><span class="n">${i+1}</span><span class="grow"><b>${esc(s.t)}</b>${s.s?`<small>${esc(s.s)}</small>`:''}<span class="swhy">${esc(s.why||'')}</span></span>${s.ml!=null?`<span class="ml">${esc(s.ml)}${typeof s.ml==='number'?'<small> ml</small>':''}</span>`:''}</button>`).join('')}
 </div></div>
 <button class="btn block" id="logMix">${icon('res')} Log this res change ${resDay?'on Day '+resDay:''}</button>
 <p class="small muted" style="text-align:center;margin-top:8px">${esc(mx.recipe_line)}</p></div>`;
 const pill=()=>{const n=steps.filter((_,i)=>MX.done[key+':'+i]).length;$('#mixPill').textContent=`${n}/${steps.length}`;$('#mixPill').className='pill '+(n===steps.length?'g-ok':'g-warn');};pill();
 $$('[data-wk]').forEach(b=>b.onclick=e=>{MX.week=+b.dataset.wk;vib(8);Towie.act('mix',`Week ${MX.week}! ${MX.week===10?'Flush time.':'Shakin\' it.'}`);vMix();});
 const setG=v=>{MX.gal=Math.max(.5,Math.min(50,+(+v).toFixed(1)));vMix();};
 $('#galDn').onclick=()=>{vib(6);setG(MX.gal-.5);};$('#galUp').onclick=()=>{vib(6);setG(MX.gal+.5);};$('#gal').onchange=e=>setG(e.target.value||5.5);
 $$('#steps .step').forEach(b=>b.onclick=e=>{const id=key+':'+b.dataset.i;MX.done[id]=!MX.done[id];b.classList.toggle('on',MX.done[id]);vib(MX.done[id]?[10,30,10]:6);pill();
  if(MX.done[id]){sparkle(e.clientX,e.clientY,8,['#7ad7ff','#fff','#ffd34d']);if(steps.every((_,i)=>MX.done[key+':'+i])){confetti(50);Towie.act('mix','Mixed to perfection! 🧪');}}});
 $('#logMix').onclick=e=>{const day=resDay||d;const dl=DL(p,day,true);dl.mix={week:w,gal:MX.gal,ml:Object.fromEntries(steps.filter(s=>s.ml!=null).map(s=>[s.t,s.ml]))};dl.checks.res=true;if(!dl.adj.includes('Res change'))dl.adj.push('Res change');save();sparkle(e.clientX,e.clientY,14);Towie.act('cheer','Res logged! Now pH + EC 👇');setTimeout(()=>go('day/'+day),700);};
}
/* ---------------- TRENDS / charts ---------------- */
let TR={k:'ph'};
const EVC={res:'#5fb8ff',flush:'#8dff9a',harvest:'#ffd34d',adj:'#ff7fc0'};
function seriesFor(p,k){const out=[];for(let d=1;d<=70;d++){const x=DL(p,d);const info=dayInfo(p,d);const r=x?lastReading(x):null;const v=r?r[k]:null;out.push({d,v:v==null?null:+v,T:info.T[k],g:grade(k,v,info.T)});}return out;}
function drawChart(cv,pts,m,td,animate,opts={}){
 const dpr=opts.dpr||window.devicePixelRatio||1, W=opts.w||cv.clientWidth||340, H=opts.h||220; cv.width=W*dpr; cv.height=H*dpr; if(!opts.static){cv.style.height=H+'px';}
 const c=cv.getContext('2d'); c.setTransform(dpr,0,0,dpr,0,0);
 const L=38,R=10,Tp=12,B=24, light=opts.light;
 if(light){c.fillStyle='#fff';c.fillRect(0,0,W,H);}
 const vals=[];pts.forEach(p=>{if(p.v!=null)vals.push(p.v);if(p.T!=null){if(Array.isArray(p.T))vals.push(p.T[0],p.T[1]);else vals.push(p.T);}});
 if(opts.cmp)opts.cmp.forEach(p=>{if(p.v!=null)vals.push(p.v);});
 if(!vals.length){c.fillStyle=light?'#666':'#b9a8e6';c.font='13px Nunito, sans-serif';c.fillText('No data yet: log a day to see it here.',L,H/2);return {x:()=>0,y:()=>0};}
 let lo=Math.min(...vals),hi=Math.max(...vals);const pad=(hi-lo)*.15||Math.abs(hi)*.05||1;lo-=pad;hi+=pad;
 const x=d=>L+(d-1)/(69)*(W-L-R), y=v=>Tp+(1-(v-lo)/(hi-lo))*(H-Tp-B);
 const grid=light?'#ddd':'rgba(255,255,255,.08)', txt=light?'#555':'#b9a8e6';
 c.font='10px Nunito, sans-serif';c.fillStyle=txt;c.strokeStyle=grid;c.lineWidth=1;
 for(let i=0;i<=4;i++){const v=lo+(hi-lo)*i/4,yy=y(v);c.beginPath();c.moveTo(L,yy);c.lineTo(W-R,yy);c.stroke();c.fillText(v.toFixed(m.dec>1?2:m.dec?1:0),2,yy+3);}
 for(let w=0;w<=10;w++){const xx=x(w*7+1);c.fillText(w<10?'W'+(w+1):'',xx+2,H-8);c.beginPath();c.moveTo(xx,Tp);c.lineTo(xx,H-B);c.stroke();}
 // target band
 c.fillStyle=light?'rgba(230,170,20,.22)':'rgba(255,200,60,.16)';c.strokeStyle=light?'#d9a400':'rgba(255,211,77,.7)';
 let band=[];pts.forEach(p=>{if(p.T!=null)band.push([p.d,Array.isArray(p.T)?p.T:[p.T,p.T]]);});
 if(band.length){c.beginPath();band.forEach(([d,t],i)=>{const xx=x(d),yy=y(t[1]);i?c.lineTo(xx,yy):c.moveTo(xx,yy);});for(let i=band.length-1;i>=0;i--){const [d,t]=band[i];c.lineTo(x(d),y(t[0]));}c.closePath();c.fill();
  c.setLineDash([4,4]);c.beginPath();band.forEach(([d,t],i)=>{const yy=y((t[0]+t[1])/2);i?c.lineTo(x(d),yy):c.moveTo(x(d),yy);});c.stroke();c.setLineDash([]);}
 if(opts.events)opts.events.forEach(ev=>{const xx=x(ev.d),col=EVC[ev.k]||'#fff';c.fillStyle=col;c.strokeStyle=col;
  if(ev.k==='adj'){c.beginPath();c.moveTo(xx,Tp-1);c.lineTo(xx+4,Tp+4);c.lineTo(xx,Tp+9);c.lineTo(xx-4,Tp+4);c.closePath();c.fill();return;}
  c.globalAlpha=.4;c.setLineDash([3,3]);c.beginPath();c.moveTo(xx,Tp);c.lineTo(xx,H-B);c.stroke();c.setLineDash([]);c.globalAlpha=1;c.beginPath();c.moveTo(xx,H-B-7);c.lineTo(xx-5,H-B+1);c.lineTo(xx+5,H-B+1);c.closePath();c.fill();});
 if(opts.cmp){const Q=opts.cmp.filter(p=>p.v!=null);c.strokeStyle='#5fe3ff';c.lineWidth=2;c.setLineDash([6,4]);c.beginPath();Q.forEach((p,i)=>{i?c.lineTo(x(p.d),y(p.v)):c.moveTo(x(p.d),y(p.v));});c.stroke();c.setLineDash([]);Q.forEach(p=>{c.fillStyle='#5fe3ff';c.beginPath();c.arc(x(p.d),y(p.v),3,0,7);c.fill();});}
 if(td&&td>=1&&td<=70){c.strokeStyle=light?'#7a3cff':'rgba(184,140,255,.8)';c.setLineDash([2,3]);c.beginPath();c.moveTo(x(td),Tp);c.lineTo(x(td),H-B);c.stroke();c.setLineDash([]);c.fillStyle=c.strokeStyle;c.fillText('today',Math.min(x(td)+3,W-R-28),Tp+9);}
 const P2=pts.filter(p=>p.v!=null);
 const draw=f=>{const n=Math.max(1,Math.ceil(P2.length*f));
  const gr=c.createLinearGradient(L,0,W,0);gr.addColorStop(0,'#ffd34d');gr.addColorStop(1,'#b26bff');c.strokeStyle=gr;c.lineWidth=2.5;c.lineJoin='round';
  c.beginPath();P2.slice(0,n).forEach((p,i)=>{i?c.lineTo(x(p.d),y(p.v)):c.moveTo(x(p.d),y(p.v));});c.stroke();
  P2.slice(0,n).forEach(p=>{c.fillStyle={ok:'#3ee08f',warn:'#ffc145',bad:'#ff4d6d'}[p.g]||'#c9b8ff';c.beginPath();c.arc(x(p.d),y(p.v),4,0,7);c.fill();c.strokeStyle=light?'#fff':'#1a0f33';c.lineWidth=1.5;c.stroke();});};
 if(animate&&!reduce.matches&&P2.length>1){const snap=c.getImageData(0,0,cv.width,cv.height);let t0=null;const step=ts=>{if(!t0)t0=ts;const f=Math.min(1,(ts-t0)/700);c.putImageData(snap,0,0);c.setTransform(dpr,0,0,dpr,0,0);draw(f);if(f<1)requestAnimationFrame(step);};requestAnimationFrame(step);}else draw(1);
 return {x,y,L,R,W};
}
/* ---------------- ANALYSIS (full run) ---------------- */
const AN={k:'ph',cmp:null,ck:'ph'};
const NUTC=['#9de3ff','#ff9dd1','#ffd34d','#8dff9a','#c39bff','#ff9d7a','#7ad7ff','#f2a91e','#ffffff'];
function runEvents(p){const ev=[];const r=[...p.resDays].sort((a,b)=>a-b);r.forEach((d,i)=>ev.push({d,k:i===r.length-1?'flush':'res'}));ev.push({d:Math.min(70,p.harvestDay||70),k:'harvest'});
 for(let d=1;d<=70;d++){const x=DL(p,d);if(x&&x.adj&&x.adj.filter(a=>a!=='Res change').length)ev.push({d,k:'adj'});}return ev;}
function metricStats(p,k){const pts=seriesFor(p,k).filter(x=>x.v!=null);if(!pts.length)return null;const g=pts.filter(x=>x.g!=='none');
 let mn=pts[0],mx=pts[0];pts.forEach(x=>{if(x.v<mn.v)mn=x;if(x.v>mx.v)mx=x;});
 return {n:pts.length,avg:pts.reduce((a,b)=>a+b.v,0)/pts.length,min:mn.v,minD:mn.d,max:mx.v,maxD:mx.d,graded:g.length,inR:g.length?g.filter(x=>x.g==='ok').length/g.length:null,close:g.filter(x=>x.g==='warn').length,off:g.filter(x=>x.g==='bad').length};}
function drifts(p,n=5){const out=[];for(let d=1;d<=70;d++){const r=lastReading(DL(p,d));if(!r)continue;const T=dayInfo(p,d).T;
 MET.forEach(m=>{const v=r[m.k];if(v==null||v===''||m.k==='co2'&&!p.co2)return;const t=T[m.k];if(t==null)return;const [lo,hi]=Array.isArray(t)?t:[t,t];
  const dv=v<lo?v-lo:v>hi?v-hi:0;if(!dv)return;const span=(hi-lo)||Math.abs(hi)*.1||1;out.push({d,m,v:+v,t,dv,rel:Math.abs(dv)/span});});}
 return out.sort((a,b)=>b.rel-a.rel).slice(0,n);}
function runSummary(p){const td=dayOf(p)||0,end=Math.min(70,Math.max(0,td));let logged=0,scoreSum=0,scored=0,tDone=0,tTot=0;const st={ok:0,warn:0,bad:0,miss:0};const adj={};
 for(let d=1;d<=70;d++){const s=scoreDay(p,d);if(s.logged){logged++;if(s.graded){scoreSum+=s.met/s.graded;scored++;}tDone+=s.done;tTot+=s.tot;}if(st[s.status]!=null)st[s.status]++;
  const x=DL(p,d);if(x&&x.adj)x.adj.forEach(a=>adj[a]=(adj[a]||0)+1);}
 const resPlanned=p.resDays.filter(d=>d<=end).length,resDone=p.resDays.filter(d=>{if(d>end)return false;const x=DL(p,d);return x&&(x.mix||x.checks.res||(x.adj||[]).includes('Res change'));}).length;
 const allG=MET.reduce((a,m)=>{const q=metricStats(p,m.k);if(q&&q.graded){a.ok+=Math.round(q.inR*q.graded);a.n+=q.graded;}return a;},{ok:0,n:0});
 return {td,end,logged,avgScore:scored?scoreSum/scored:null,tasks:tTot?tDone/tTot:null,st,adj,resPlanned,resDone,inRange:allG.n?allG.ok/allG.n:null,dayLog:end?logged/end:null};}
function mixBars(p){const r=[...p.resDays].sort((a,b)=>a-b);return r.map((d,i)=>{const w=Math.min(10,i+1);let got=null;
 for(let dd=1;dd<=70;dd++){const x=DL(p,dd);if(x&&x.mix&&x.mix.week===w){got=x.mix;break;}}
 const plan=mixWeek(w),k=p.gal/((plan&&plan.ro_gal)||5.5),parts={};
 if(got)Object.entries(got.ml).forEach(([n,v])=>{if(typeof v==='number')parts[n.replace(/^Flora(?=Micro|Gro|Bloom)/,'Flora')]=v;});
 if(!Object.keys(parts).length){got=null;if(plan)Object.entries(plan.ml).forEach(([n,v])=>{if(typeof v==='number')parts[/^(Micro|Gro|Bloom)$/.test(n)?'Flora'+n:n]=+(v*k).toFixed(1);});}
 return {d,w,logged:!!got,parts};});}
function drawStack(cv,bars,names,opts={}){const dpr=window.devicePixelRatio||1,W=cv.clientWidth||340,H=opts.h||200;cv.width=W*dpr;cv.height=H*dpr;cv.style.height=H+'px';const c=cv.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);
 const L=34,R=6,Tp=10,B=22,tot=bars.map(b=>Object.values(b.parts).reduce((a,v)=>a+v,0)),mx=Math.max(10,...tot)*1.1,bw=(W-L-R)/bars.length;
 c.font='10px Nunito, sans-serif';c.fillStyle='#b9a8e6';c.strokeStyle='rgba(255,255,255,.08)';
 for(let i=0;i<=4;i++){const v=mx*i/4,yy=Tp+(1-i/4)*(H-Tp-B);c.beginPath();c.moveTo(L,yy);c.lineTo(W-R,yy);c.stroke();c.fillText(Math.round(v),2,yy+3);}
 const geo=[];bars.forEach((b,i)=>{const x0=L+i*bw+bw*.16,w=bw*.68;let y0=H-B;c.globalAlpha=b.logged?1:.42;
  names.forEach((n,j)=>{const v=b.parts[n];if(!v)return;const h=v/mx*(H-Tp-B);c.fillStyle=NUTC[j%NUTC.length];c.fillRect(x0,y0-h,w,h);c.strokeStyle='#1a0f33';c.lineWidth=1;c.strokeRect(x0,y0-h,w,h);y0-=h;});
  c.globalAlpha=1;if(!b.logged){c.setLineDash([3,3]);c.strokeStyle='rgba(255,255,255,.55)';c.strokeRect(x0,y0,w,H-B-y0);c.setLineDash([]);}
  c.fillStyle=b.logged?'#ffd34d':'#b9a8e6';c.fillText(b.w===10?'F':'W'+b.w,x0+w/2-7,H-8);geo.push({x0,w,b});});
 return geo;}
function drawCompliance(cv,p){const dpr=window.devicePixelRatio||1,W=cv.clientWidth||340,H=150;cv.width=W*dpr;cv.height=H*dpr;cv.style.height=H+'px';const c=cv.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);
 const L=30,R=6,Tp=8,B=20,bw=(W-L-R)/70,td=dayOf(p)||0;c.font='10px Nunito, sans-serif';c.fillStyle='#b9a8e6';c.strokeStyle='rgba(255,255,255,.08)';
 [0,50,100].forEach(v=>{const yy=Tp+(1-v/100)*(H-Tp-B);c.beginPath();c.moveTo(L,yy);c.lineTo(W-R,yy);c.stroke();c.fillText(v+'%',0,yy+3);});
 for(let w=0;w<10;w++)c.fillText('W'+(w+1),L+w*7*bw+2,H-6);
 const col={ok:'#3ee08f',warn:'#ffc145',bad:'#ff4d6d',miss:'rgba(255,77,109,.35)'},line=[];
 for(let d=1;d<=70;d++){const s=scoreDay(p,d),x0=L+(d-1)*bw;if(s.status==='miss'){c.fillStyle=col.miss;c.fillRect(x0+.5,H-B-4,Math.max(1,bw-1),4);continue;}if(!s.logged)continue;
  const pct=s.graded?s.met/s.graded:(s.tot?s.done/s.tot:0),h=Math.max(3,pct*(H-Tp-B));c.fillStyle=col[s.status]||'#c9b8ff';c.fillRect(x0+.5,H-B-h,Math.max(1,bw-1),h);
  if(s.tot)line.push([x0+bw/2,Tp+(1-s.done/s.tot)*(H-Tp-B)]);}
 if(line.length>1){c.strokeStyle='#ffd34d';c.lineWidth=2;c.beginPath();line.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();}
 line.forEach(([x,y])=>{c.fillStyle='#ffd34d';c.beginPath();c.arc(x,y,2.2,0,7);c.fill();});
 if(td>=1&&td<=70){const xx=L+(td-.5)*bw;c.strokeStyle='rgba(184,140,255,.8)';c.setLineDash([2,3]);c.beginPath();c.moveTo(xx,Tp);c.lineTo(xx,H-B);c.stroke();c.setLineDash([]);}
 return d=>L+(d-.5)*bw;}
const pctS=v=>v==null?'—':Math.round(v*100)+'%';
const fx=(m,v)=>v==null?'—':(+v).toFixed(m.k==='ph'||m.k==='vpd'?2:m.dec);
function tipAt(box,html,x,y){let t=$('.an-tip',box);if(!t){t=document.createElement('div');t.className='an-tip';box.appendChild(t);}t.innerHTML=html;t.classList.remove('show');const w=t.offsetWidth,h=t.offsetHeight,bw=box.clientWidth;t.style.left=Math.min(bw-w-4,Math.max(4,x-w/2))+'px';t.style.top=(y-h-12<0?y+14:y-h-12)+'px';void t.offsetWidth;t.classList.add('show');return t;}
function vAnalysis(){
 const p=P(),td=dayOf(p),mets=MET.filter(x=>x.k!=='co2'||p.co2);if(!mets.find(x=>x.k===AN.k))AN.k='ph';
 const m=MET.find(x=>x.k===AN.k),pts=seriesFor(p,AN.k),ms=metricStats(p,AN.k),sum=runSummary(p),ev=runEvents(p),dr=drifts(p);
 const names=[...G.NUTES.map(n=>n.name),'FloraKleen'],bars=mixBars(p),usedN=names.filter(n=>bars.some(b=>b.parts[n]));
 const others=S.plants.filter(q=>q.id!==p.id);if(!others.find(q=>q.id===AN.cmp))AN.cmp=(others.find(q=>Object.keys(S.days[q.id]||{}).length)||others[0]||{}).id||null;
 const q=others.find(x=>x.id===AN.cmp),hv=p.harvest||{};
 const hD=p.harvestDay||70,hDate=dateOf(p,hD);
 const rowStats=mets.map(mm=>{const z=metricStats(p,mm.k);return `<tr><td><b>${mm.lab}</b></td><td>${z?fx(mm,z.avg):'—'}</td><td>${z?fx(mm,z.min):'—'}</td><td>${z?fx(mm,z.max):'—'}</td><td class="${z&&z.inR!=null?(z.inR>=.8?'t-ok':z.inR>=.5?'t-warn':'t-bad'):''}">${z?pctS(z.inR):'—'}</td><td>${z?z.n:0}</td></tr>`;}).join('');
 const cmpRows=q?(()=>{const a=runSummary(p),b=runSummary(q),f=(x,k)=>{const z=metricStats(x,k);return z?fx(MET.find(m=>m.k===k),z.avg):'—';},adjN=s=>Object.entries(s.adj).filter(([k])=>k!=='Res change').reduce((t,[,v])=>t+v,0);
  const rows=[['Days logged',a.logged,b.logged],['Readings in range',pctS(a.inRange),pctS(b.inRange)],['Avg day score',pctS(a.avgScore),pctS(b.avgScore)],['Tasks done',pctS(a.tasks),pctS(b.tasks)],['Avg pH',f(p,'ph'),f(q,'ph')],['Avg EC',f(p,'ec'),f(q,'ec')],['Avg VPD',f(p,'vpd'),f(q,'vpd')],['Adjustments',adjN(a),adjN(b)],['Dry yield',(p.harvest||{}).dry?p.harvest.dry+' g':'—',(q.harvest||{}).dry?q.harvest.dry+' g':'—']];
  return rows.map(([l,x,y])=>`<tr><td>${l}</td><td class="c-a">${x}</td><td class="c-b">${y}</td></tr>`).join('');})():'';
 $('#view').innerHTML=`<div class="stagger">
 <div class="card hero an-hero"><div class="row"><span data-react="analysis">${icon('analysis')}</span><div class="grow"><div class="kicker">Analysis · ${esc(p.name)}</div><h1 style="margin:2px 0">Full run</h1><div class="small muted">Day 1–${hD}${td?` · today is Day ${td}`:' · no Day 1 set yet'}</div></div><a class="btn sm ghost" href="#export" data-react="export">${icon('export')} Export</a></div>
  <div class="an-kpis"><div><b>${sum.logged}</b><span>days logged</span></div><div><b>${pctS(sum.inRange)}</b><span>in range</span></div><div><b>${pctS(sum.avgScore)}</b><span>avg score</span></div><div><b>${pctS(sum.tasks)}</b><span>tasks done</span></div></div></div>
 <div class="card"><div class="row"><span data-react="${m.ic}">${icon(m.ic)}</span><h2 class="grow" style="margin:0">${m.lab} over the run</h2></div>
  <div class="scrollx" style="margin-top:10px">${mets.map(x=>`<button class="chip ${x.k===AN.k?'on':''}" data-m="${x.k}" data-react="${x.ic}">${x.lab}</button>`).join('')}</div>
  <div class="chartbox" id="cbox"><canvas id="cv" aria-label="${m.lab} over the whole run"></canvas></div>
  <div class="legend"><span><i class="dot" style="--c:#ffd34d"></i> target</span><span><i class="dot g-ok"></i> met</span><span><i class="dot g-warn"></i> close</span><span><i class="dot g-bad"></i> off</span><span><i class="tri" style="--c:${EVC.res}"></i> res</span><span><i class="tri" style="--c:${EVC.flush}"></i> flush</span><span><i class="tri" style="--c:${EVC.harvest}"></i> chop</span><span><i class="dia"></i> adjusted</span></div>
  <div class="small muted" style="margin-top:6px">Tap a point to see it, then tap "Open day".</div>
  <div class="an-stats"><div><span>Avg</span><b>${ms?fx(m,ms.avg):'—'}</b></div><div><span>Min</span><b>${ms?fx(m,ms.min):'—'}</b><small>${ms?'Day '+ms.minD:''}</small></div><div><span>Max</span><b>${ms?fx(m,ms.max):'—'}</b><small>${ms?'Day '+ms.maxD:''}</small></div><div><span>In range</span><b>${ms?pctS(ms.inR):'—'}</b><small>${ms?`≈${ms.close} ✕${ms.off}`:''}</small></div></div></div>
 <div class="card"><div class="row"><span data-react="streak">${icon('streak')}</span><h2 class="grow" style="margin:0">Compliance & score</h2><span class="pill ${sum.st.miss?'g-bad':'g-ok'}">${sum.st.miss} missed</span></div>
  <div class="chartbox short" id="ccbox"><canvas id="cc" aria-label="Daily score chart"></canvas></div>
  <div class="legend"><span><i class="dot g-ok"></i> all in range</span><span><i class="dot g-warn"></i> close</span><span><i class="dot g-bad"></i> off</span><span><i class="dot" style="--c:rgba(255,77,109,.4)"></i> missed day</span><span><i class="ln"></i> tasks %</span></div></div>
 <div class="card"><div class="row"><span data-react="mix">${icon('mix')}</span><h2 class="grow" style="margin:0">Nutrients per res</h2><span class="small muted">ml · ${p.gal} gal</span></div>
  <div class="chartbox short" id="nbox"><canvas id="nc" aria-label="Nutrient ml per res change"></canvas></div>
  <div class="legend">${usedN.map(n=>`<span><i class="dot" style="--c:${NUTC[names.indexOf(n)%NUTC.length]}"></i> ${esc(n)}</span>`).join('')}</div>
  <div class="small muted" style="margin-top:6px">Solid = logged mix · faded = run-sheet plan. Tap a bar for the ml.</div></div>
 <div class="card report"><div class="row"><span data-react="harvest">${icon('harvest')}</span><h2 class="grow" style="margin:0">End-of-run report</h2><button class="btn sm ghost" id="cpRep">Copy</button></div>
  <table class="rtab"><thead><tr><th></th><th>Avg</th><th>Min</th><th>Max</th><th>In range</th><th>n</th></tr></thead><tbody>${rowStats}</tbody></table>
  <h3>Biggest drifts</h3>${dr.length?dr.map(z=>`<a class="drift" href="#day/${z.d}"><span class="dd">D${z.d}</span><b>${z.m.lab}</b> ${fx(z.m,z.v)} <span class="muted">vs ${Array.isArray(z.t)?z.t.join('–'):z.t}</span><span class="dv">${z.dv>0?'+':''}${fx(z.m,z.dv)}</span></a>`).join(''):'<p class="small muted">No drifts out of range yet. 😎</p>'}
  <h3>Adjustments</h3><div class="chips">${Object.keys(sum.adj).length?Object.entries(sum.adj).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<span class="pill">${esc(k)} ×${v}</span>`).join(''):'<span class="small muted">None logged yet.</span>'}</div>
  <div class="small muted" style="margin-top:6px">Res changes logged: ${sum.resDone}/${sum.resPlanned} due so far · days logged ${sum.logged}/${sum.end||0}</div>
  <h3>Harvest summary</h3><div class="hv">
   <label class="field">Chop date<input type="date" data-hv="date" value="${esc(hv.date||(hDate?ymd(hDate):''))}"></label>
   <label class="field">Wet weight (g)<input type="number" inputmode="decimal" data-hv="wet" value="${esc(hv.wet??'')}"></label>
   <label class="field">Dry weight (g)<input type="number" inputmode="decimal" data-hv="dry" value="${esc(hv.dry??'')}"></label>
   <label class="field">Dry days<input type="number" inputmode="numeric" data-hv="dryDays" value="${esc(hv.dryDays??'')}"></label>
   <label class="field">Trichomes at chop<input type="text" placeholder="e.g. cloudy + 15% amber" data-hv="trich" value="${esc(hv.trich||'')}"></label>
   <label class="field">Cure start<input type="date" data-hv="cure" value="${esc(hv.cure||'')}"></label>
   <label class="field wide">Smell / taste / effect<input type="text" data-hv="notes" value="${esc(hv.notes||'')}"></label>
   <div class="field wide">Rating<div class="stars">${[1,2,3,4,5].map(i=>`<button data-star="${i}" class="${(hv.rating||0)>=i?'on':''}" aria-label="${i} stars">★</button>`).join('')}</div></div></div>
  <div class="small muted" id="hvCalc">${hv.wet&&hv.dry?`Dry/wet ${Math.round(hv.dry/hv.wet*100)}% · ${(hv.dry/p.gal).toFixed(1)} g per gal of res`:''}</div></div>
 <div class="card"><div class="row"><span data-react="plants">${icon('plants')}</span><h2 class="grow" style="margin:0">Run vs run</h2></div>
  ${q?`<div class="scrollx" style="margin-top:10px">${others.map(o=>`<button class="chip ${o.id===AN.cmp?'on':''}" data-cmp="${o.id}">vs ${esc(o.name)}</button>`).join('')}</div>
  <div class="scrollx" style="margin-top:6px">${mets.map(x=>`<button class="chip sm ${x.k===AN.ck?'on':''}" data-ck="${x.k}">${x.lab}</button>`).join('')}</div>
  <div class="chartbox short"><canvas id="rc" aria-label="Run comparison"></canvas></div>
  <div class="legend"><span><i class="ln"></i> ${esc(p.name)}</span><span><i class="ln dash"></i> ${esc(q.name)}</span><span><i class="dot" style="--c:#ffd34d"></i> ${esc(p.name)} target</span></div>
  <table class="rtab cmp"><thead><tr><th></th><th class="c-a">${esc(p.name)}</th><th class="c-b">${esc(q.name)}</th></tr></thead><tbody>${cmpRows}</tbody></table>
  ${Object.keys(S.days[q.id]||{}).length?'':`<p class="small muted">${esc(q.name)} has no logs yet; its column fills in as you log it.</p>`}`
  :`<p class="small muted">Add another plant or run in Plants & runs to compare them side by side.</p>`}
  <a class="btn ghost block" href="#plants" style="margin-top:10px">${icon('plants')} Plants & runs</a></div>
 </div>`;
 // metric chart + tap -> day
 const cv=$('#cv'),geo=drawChart(cv,pts,m,td,true,{events:ev});const box=$('#cbox');
 cv.onclick=e=>{const r=cv.getBoundingClientRect(),xx=e.clientX-r.left;let best=null,bd=1e9;pts.filter(x=>x.v!=null).forEach(z=>{const dd=Math.abs(geo.x(z.d)-xx);if(dd<bd){bd=dd;best=z;}});
  const evs=ev.filter(z=>Math.abs(geo.x(z.d)-xx)<8);
  if(!best||bd>22){if(evs.length){const z=evs[0];tipAt(box,`<b>Day ${z.d}</b> · ${{res:'Res change',flush:'Flush',harvest:'Chop',adj:'Adjusted'}[z.k]}<a class="go" href="#day/${z.d}">Open day ›</a>`,geo.x(z.d),18);}return;}
  vib(6);tipAt(box,`<b>Day ${best.d}</b> · ${m.lab} ${fx(m,best.v)} <span class="g-${best.g}">●</span><div class="muted">target ${best.T==null?'—':Array.isArray(best.T)?best.T.join('–'):best.T}</div><a class="go" href="#day/${best.d}">Open day ›</a>`,geo.x(best.d),geo.y(best.v));};
 cv.ondblclick=e=>{const r=cv.getBoundingClientRect();const d=Math.round((e.clientX-r.left-geo.L)/(geo.W-geo.L-geo.R)*69)+1;if(d>=1&&d<=70)go('day/'+d);};
 // compliance
 const cc=$('#cc'),cx=drawCompliance(cc,p);cc.onclick=e=>{const r=cc.getBoundingClientRect();let d=1,bd=1e9;for(let i=1;i<=70;i++){const dd=Math.abs(cx(i)-(e.clientX-r.left));if(dd<bd){bd=dd;d=i;}}const s=scoreDay(p,d);vib(6);
  tipAt($('#ccbox'),`<b>Day ${d}</b> · ${s.logged?`${s.met}/${s.graded} in range · tasks ${s.done}/${s.tot}`:s.status==='miss'?'missed':'not logged'}<a class="go" href="#day/${d}">Open day ›</a>`,cx(d),30);};
 // nutrients
 const nc=$('#nc'),ng=drawStack(nc,bars,names);nc.onclick=e=>{const r=nc.getBoundingClientRect(),xx=e.clientX-r.left;const g=ng.find(z=>xx>=z.x0-4&&xx<=z.x0+z.w+4);if(!g)return;vib(6);
  tipAt($('#nbox'),`<b>${g.b.w===10?'Flush':'Week '+g.b.w} · Day ${g.b.d}</b> ${g.b.logged?'(logged)':'(plan)'}<div class="muted">${Object.entries(g.b.parts).map(([k,v])=>`${esc(k)} ${v}`).join(' · ')||'plain RO'}</div><a class="go" href="#day/${g.b.d}">Open day ›</a>`,g.x0+g.w/2,20);};
 // compare
 if(q){const mk=MET.find(x=>x.k===AN.ck);drawChart($('#rc'),seriesFor(p,AN.ck),mk,null,false,{cmp:seriesFor(q,AN.ck),h:180});}
 $$('[data-m]').forEach(b=>b.addEventListener('click',()=>{AN.k=b.dataset.m;vAnalysis();}));
 $$('[data-cmp]').forEach(b=>b.onclick=()=>{AN.cmp=b.dataset.cmp;vib(8);vAnalysis();});
 $$('[data-ck]').forEach(b=>b.onclick=()=>{AN.ck=b.dataset.ck;vib(6);vAnalysis();});
 $$('[data-hv]').forEach(i=>i.onchange=()=>{p.harvest=p.harvest||{};const k=i.dataset.hv;p.harvest[k]=i.type==='number'?(i.value===''?null:+i.value):i.value;save();const h=p.harvest;$('#hvCalc').textContent=h.wet&&h.dry?`Dry/wet ${Math.round(h.dry/h.wet*100)}% · ${(h.dry/p.gal).toFixed(1)} g per gal of res`:'';toast('Saved ✓');});
 $$('[data-star]').forEach(b=>b.onclick=e=>{p.harvest=p.harvest||{};p.harvest.rating=+b.dataset.star;save();$$('[data-star]').forEach(x=>x.classList.toggle('on',+x.dataset.star<=p.harvest.rating));sparkle(e.clientX,e.clientY,10);vib(10);if(p.harvest.rating===5)Towie.act('cheer','Five stars?! Legendary run!');});
 $('#cpRep').onclick=async()=>{const t=buildReport(p);try{await navigator.clipboard.writeText(t);}catch(_){const ta=document.createElement('textarea');ta.value=t;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();}toast('Report copied ✓');Towie.act('cheer','Report copied! Paste it to Grok Bot.');};
}
function buildReport(p){const s=runSummary(p),h=p.harvest||{},L=[`99 · AlmondGold · ${p.name} · end-of-run report`,`Day 1 = ${p.day1||'not set'} · ${p.gal} gal DWC · days logged ${s.logged}/${s.end} · readings in range ${pctS(s.inRange)} · avg score ${pctS(s.avgScore)} · tasks ${pctS(s.tasks)}`,'','Metric: avg / min / max / % in range / n'];
 MET.filter(m=>m.k!=='co2'||p.co2).forEach(m=>{const z=metricStats(p,m.k);L.push(`  ${m.lab}: ${z?`${fx(m,z.avg)} / ${fx(m,z.min)} (D${z.minD}) / ${fx(m,z.max)} (D${z.maxD}) / ${pctS(z.inR)} / ${z.n}`:'no data'}`);});
 const dr=drifts(p);L.push('','Biggest drifts:');dr.length?dr.forEach(z=>L.push(`  Day ${z.d} ${z.m.lab} ${fx(z.m,z.v)} vs ${Array.isArray(z.t)?z.t.join('-'):z.t} (${z.dv>0?'+':''}${fx(z.m,z.dv)})`)):L.push('  none');
 L.push('','Adjustments: '+(Object.entries(s.adj).map(([k,v])=>`${k} x${v}`).join(', ')||'none'),`Res changes logged: ${s.resDone}/${s.resPlanned}`);
 L.push('','Harvest: '+[h.date&&'chop '+h.date,h.wet!=null&&h.wet!==''&&`wet ${h.wet} g`,h.dry!=null&&h.dry!==''&&`dry ${h.dry} g`,h.dryDays&&`${h.dryDays} dry days`,h.trich&&`trichomes ${h.trich}`,h.cure&&`cure from ${h.cure}`,h.rating&&`${h.rating}/5`,h.notes].filter(Boolean).join(' · ')||'Harvest: not filled in yet');
 return L.join('\n');}
/* ---------------- PHOTOS (IndexedDB only) ---------------- */
const PH={mode:'day',tag:null,tl:null,play:null};
function vPhotos(){
 const p=P(),td=dayOf(p),all=allPhotos(p);if(PH.play){clearInterval(PH.play);PH.play=null;}
 if(PH.tag==null||PH.tag<1||PH.tag>70)PH.tag=Math.min(70,Math.max(1,td||1));
 const byDay={};all.forEach(x=>(byDay[x.d]=byDay[x.d]||[]).push(x));const days=Object.keys(byDay).map(Number).sort((a,b)=>a-b);
 const latest=days.map(d=>byDay[d][byDay[d].length-1]&&{d,...byDay[d][byDay[d].length-1]});
 const head=`<div class="card hero ph-hero"><div class="row"><span data-react="photos">${icon('gallery')}</span><div class="grow"><div class="kicker">Photos · ${esc(p.name)}</div><h1 style="margin:2px 0">Grow gallery</h1><div class="small muted">${all.length} photo${all.length===1?'':'s'} · ${days.length} day${days.length===1?'':'s'}</div></div></div>
  <div class="lock-pill">🔒 Saved on this phone only<span id="stInfo"></span></div>
  <div class="ph-add"><div class="stepper"><button id="tagM" aria-label="Earlier day">‹</button><div><small>tag as</small><b id="tagL">Day ${PH.tag}</b></div><button id="tagP" aria-label="Later day">›</button></div>
   <label class="btn sm">${icon('photo')} Camera<input type="file" accept="image/*" capture="environment" id="phCam" hidden></label>
   <label class="btn sm ghost">🖼️ Gallery<input type="file" accept="image/*" multiple id="phGal" hidden></label></div></div>`;
 const tabs=`<div class="scrollx seg">${[['day','By day'],['week','By week'],['tl','Timeline']].map(([k,l])=>`<button class="chip ${PH.mode===k?'on':''}" data-mode="${k}">${l}</button>`).join('')}</div>`;
 let body='';
 if(!all.length)body=`<div class="card" style="text-align:center"><img src="img/towie_hero.png" alt="Towie" style="width:140px" class="bob"><h2>No photos yet</h2><p class="muted small">Snap her every day or two: Towie lines them up into a growth timeline you can swipe through. Photos stay in this browser on this phone and are never uploaded.</p></div>`;
 else if(PH.mode==='tl')body=`<div class="card tl-card"><div class="tl" id="tl">${latest.map(x=>`<figure class="tl-item" data-d="${x.d}"><img data-ph="${esc(x.id)}" alt="Day ${x.d}"><figcaption><b>Day ${x.d}</b><span>W${weekOf(x.d)} · ${esc(dayInfo(p,x.d).stage)}</span></figcaption></figure>`).join('')}</div>
   <div class="row" style="margin-top:10px"><button class="btn sm" id="tlPlay">▶ Play</button><input type="range" id="tlR" min="0" max="${latest.length-1}" value="${PH.tl!=null?Math.min(PH.tl,latest.length-1):latest.length-1}" class="grow" aria-label="Scrub timeline"><b id="tlL" class="tl-l"></b></div>
   <div class="small muted" style="margin-top:6px">Swipe sideways: latest photo of each day, Day ${days[0]} → Day ${days[days.length-1]}.</div></div>`;
 else{const groups=PH.mode==='week'?[...new Set(days.map(d=>weekOf(d)))].map(w=>({t:`Week ${w}`,s:esc(dayInfo(p,(w-1)*7+1).stage),items:days.filter(d=>weekOf(d)===w).flatMap(d=>byDay[d])})):days.slice().reverse().map(d=>{const dt=dateOf(p,d);return {t:`Day ${d}`,s:`W${weekOf(d)}${dt?' · '+fmt(dt):''}`,d,items:byDay[d]};});
  body=groups.map(g=>`<div class="card ph-group"><div class="row"><h3 class="grow" style="margin:0">${g.t} <span class="small muted">${g.s}</span></h3>${g.d?`<a class="chip sm" href="#day/${g.d}">Open ›</a>`:''}</div><div class="ph-grid">${g.items.map(x=>`<button class="ph-cell" data-open="${esc(x.id)}" aria-label="Day ${x.d} photo"><img data-ph="${esc(x.id)}" alt=""><span>D${x.d}</span></button>`).join('')}</div></div>`).join('');}
 $('#view').innerHTML=`<div class="stagger">${head}${all.length?tabs:''}${body}</div>`;
 fillThumbs($('#view'));
 const ordered=all.slice().sort((a,b)=>a.d-b.d);
 $$('[data-open]').forEach(b=>b.onclick=()=>{vib(6);viewer(ordered.slice(),ordered.findIndex(x=>x.id===b.dataset.open));});
 $$('[data-mode]').forEach(b=>b.onclick=()=>{PH.mode=b.dataset.mode;vib(6);vPhotos();});
 const setTag=n=>{PH.tag=Math.min(70,Math.max(1,n));$('#tagL').textContent='Day '+PH.tag;vib(4);};$('#tagM').onclick=()=>setTag(PH.tag-1);$('#tagP').onclick=()=>setTag(PH.tag+1);
 const onAdd=async e=>{const fs=[...e.target.files];if(!fs.length)return;let n=0;try{for(const f of fs){await addPhoto(p,PH.tag,f);n++;}}catch(err){toast(err.message);}e.target.value='';if(n){toast(`${n} photo${n>1?'s':''} saved to Day ${PH.tag} 🔒`);Towie.act('cheer',"Lookin' good! Saved on this phone.");confetti(20);}vPhotos();};
 $('#phCam').onchange=onAdd;$('#phGal').onchange=onAdd;
 (async()=>{const ok=await persistStorage();let t=ok?' · kept safe from auto-cleanup':' · browser may clear it if storage runs low';try{const e=await navigator.storage.estimate();t=` · ${(e.usage/1048576).toFixed(1)} MB used`+t;}catch(_){}const el=$('#stInfo');if(el)el.textContent=t;})();
 const tl=$('#tl');if(tl){const R=$('#tlR'),Lb=$('#tlL'),items=$$('.tl-item',tl);
  const lab=i=>{Lb.textContent='D'+latest[i].d;};const to=(i,sm)=>{const it=items[i];if(it)tl.scrollTo({left:it.offsetLeft-tl.offsetLeft-(tl.clientWidth-it.clientWidth)/2,behavior:sm&&!reduce.matches?'smooth':'auto'});lab(i);PH.tl=i;};
  to(+R.value,false);R.oninput=()=>to(+R.value,true);
  let tmr;tl.addEventListener('scroll',()=>{clearTimeout(tmr);tmr=setTimeout(()=>{const c=tl.scrollLeft+tl.clientWidth/2;let bi=0,bd=1e9;items.forEach((it,i)=>{const m=it.offsetLeft-tl.offsetLeft+it.clientWidth/2;if(Math.abs(m-c)<bd){bd=Math.abs(m-c);bi=i;}});R.value=bi;lab(bi);PH.tl=bi;},90);},{passive:true});
  items.forEach((it,i)=>it.onclick=()=>{const L2=latest.map(x=>({d:x.d,id:x.id}));viewer(L2,i);});
  $('#tlPlay').onclick=()=>{if(PH.play){clearInterval(PH.play);PH.play=null;$('#tlPlay').textContent='▶ Play';return;}let i=+R.value>=latest.length-1?0:+R.value;to(i,false);R.value=i;$('#tlPlay').textContent='❚❚ Pause';
   PH.play=setInterval(()=>{if(!document.body.contains(tl)){clearInterval(PH.play);PH.play=null;return;}i++;if(i>=latest.length){clearInterval(PH.play);PH.play=null;$('#tlPlay').textContent='▶ Play';return;}R.value=i;to(i,true);},reduce.matches?1400:700);};}
}
/* ---------------- PLANTS ---------------- */
function vPlants(){
 $('#view').innerHTML=`<div class="stagger"><div class="card"><div class="row"><span data-react="plants">${icon('plants')}</span><h2 class="grow" style="margin:0">Plants & tents</h2><button class="btn sm" id="addP">+ Plant</button></div></div>
 ${S.tents.map(t=>`<div class="card"><div class="kicker">⛺ ${esc(t.name)}</div>${S.plants.filter(p=>p.tentId===t.id).map(p=>{const d=dayOf(p);return `<div class="list-item"><button class="grow" style="text-align:left;color:inherit;background:none;border:0;padding:0;font:inherit" data-pick="${p.id}"><b>${esc(p.name)}</b> ${p.id===S.activeId?'<span class="pill g-ok">active</span>':''}<div class="small muted">${p.type==='photo'?'Photoperiod':'Auto'} · ${p.gal} gal · ${d?(d>=1?'Day '+d+' · Week '+weekOf(Math.min(d,70)):'starts '+fmt(pd(p.day1))):'dates blank: set Day 1 when you start'}</div></button><a class="btn sm ghost" href="#plant/${p.id}">Edit</a></div>`;}).join('')||'<p class="small muted">No plants in this tent.</p>'}</div>`).join('')}
 <div class="card"><button class="btn ghost block" id="addT">+ Add tent</button></div></div>`;
 $$('[data-pick]').forEach(b=>b.onclick=e=>{S.activeId=b.dataset.pick;save();sparkle(e.clientX,e.clientY,10);vib(12);Towie.act('spin',`Switched to ${P().name}!`);go('home');});
 $('#addP').onclick=()=>{const id='p'+Date.now().toString(36);S.plants.push({id,name:'New plant',strain:'',type:'auto',tentId:S.tents[0].id,day1:null,gal:5.5,resDays:[...RES_DEFAULT],harvestDay:70,co2:false});S.days[id]={};save();go('plant/'+id);};
 $('#addT').onclick=()=>{const n=prompt('Tent name?','New tent');if(n){S.tents.push({id:'t'+Date.now().toString(36),name:n});save();vPlants();}};
}
function vPlantEdit(id){
 const p=S.plants.find(x=>x.id===id)||P();
 $('#view').innerHTML=`<div class="stagger"><div class="card"><div class="row"><span data-react="plants">${icon('plants')}</span><h2 class="grow" style="margin:0">Edit plant</h2></div>
 <label class="field">Name<input id="pN" value="${esc(p.name)}"></label>
 <label class="field">Strain / notes<input id="pS" value="${esc(p.strain||'')}"></label>
 <div class="grid2"><label class="field">Type<select id="pT"><option value="auto" ${p.type==='auto'?'selected':''}>Autoflower</option><option value="photo" ${p.type==='photo'?'selected':''}>Photoperiod</option></select></label>
 <label class="field">Tent<select id="pTe">${S.tents.map(t=>`<option value="${t.id}" ${t.id===p.tentId?'selected':''}>${esc(t.name)}</option>`).join('')}</select></label></div>
 <label class="field">Day 1 (seed goes into its RO soak)<input type="date" id="pD" value="${p.day1||''}"></label>
 <div class="grid2"><label class="field">Reservoir (gal)<input type="number" step="0.5" id="pG" value="${p.gal}"></label><label class="field">Chop ~Day<input type="number" id="pH" value="${p.harvestDay||70}"></label></div>
 <label class="field">Res change days (comma list, last = flush)<input id="pR" value="${p.resDays.join(', ')}" inputmode="numeric"></label>
 <div class="small muted" style="margin:-4px 0 8px">Run sheet default: ${RES_DEFAULT.join(', ')}. Mix week = position in this list.</div>
 <button class="toggle" id="pC"><span class="grow" style="text-align:left"><b>CO2 supplementation</b><div class="small muted">Uses the higher PPFD + 1000–1200 ppm path from the run sheet</div></span><span class="sw ${p.co2?'on':''}"></span></button>
 <div class="row" style="margin-top:12px"><button class="btn grow" id="pSave">Save</button><button class="btn ghost" id="pDel">Delete</button></div></div></div>`;
 $('#pC').onclick=()=>{$('#pC .sw').classList.toggle('on');vib(8);};
 $('#pSave').onclick=e=>{p.name=$('#pN').value.trim()||'Plant';p.strain=$('#pS').value;p.type=$('#pT').value;p.tentId=$('#pTe').value;p.day1=$('#pD').value||null;p.gal=+$('#pG').value||5.5;p.harvestDay=Math.max(1,Math.min(70,+$('#pH').value||70));
  const rd=$('#pR').value.split(/[^\d]+/).map(Number).filter(x=>x>=1&&x<=70);p.resDays=[...new Set(rd)].sort((a,b)=>a-b);if(!p.resDays.length)p.resDays=[...RES_DEFAULT];p.co2=$('#pC .sw').classList.contains('on');
  save();sparkle(e.clientX,e.clientY,12);Towie.act('cheer','Saved!');scheduleReminder();go('plants');};
 $('#pDel').onclick=()=>{if(S.plants.length<2)return toast('Keep at least one plant');if(!confirm(`Delete ${p.name} and all its logs?`))return;S.plants=S.plants.filter(x=>x!==p);delete S.days[p.id];if(S.activeId===p.id)S.activeId=S.plants[0].id;save();go('plants');};
}
/* ---------------- SETTINGS ---------------- */
function vSettings(){
 const st=S.settings, perm=('Notification' in window)?Notification.permission:'unsupported';
 $('#view').innerHTML=`<div class="stagger">
 <div class="card"><div class="row"><span data-react="bell">${icon('bell')}</span><h2 class="grow" style="margin:0">Daily reminder</h2><span class="pill ${perm==='granted'?'g-ok':'g-warn'}">${perm==='granted'?'on':perm==='denied'?'blocked':perm==='unsupported'?'n/a':'off'}</span></div>
  <label class="field">Remind me at<input type="time" id="sT" value="${st.remindAt}"></label>
  <div class="row"><button class="btn grow" id="sEn">${perm==='granted'?'Notifications on ✓':'Enable notifications'}</button><button class="btn ghost" id="sTest">Test</button></div>
  <p class="small muted">Android shows the reminder while 99 is open or recently used. Installed apps also get a best-effort background check. Every time you open the app, Towie nudges you if today isn't logged.</p></div>
 <div class="card"><div class="row"><span data-react="settings">${icon('settings')}</span><h2 class="grow" style="margin:0">Preferences</h2></div>
  <button class="toggle" id="sH"><span class="grow" style="text-align:left"><b>Haptics</b><div class="small muted">Little buzzes on taps</div></span><span class="sw ${st.haptics?'on':''}"></span></button>
  <label class="field">VPD leaf offset (°F below air)<input type="number" step="0.5" id="sL" value="${st.leafOffsetF}"></label></div>
 <div class="card"><div class="row"><span data-react="export">${icon('export')}</span><h2 class="grow" style="margin:0">Data</h2></div>
  <p class="small muted">Everything stays on this phone. Back it up now and then.</p>
  <div class="grid2"><button class="btn ghost" id="sBk">Backup file</button><label class="btn ghost">Restore<input type="file" id="sRs" accept=".json,application/json" hidden></label></div>
  <a class="btn block" href="#export" style="margin-top:8px">${icon('export')} Export for analysis</a>
  <div class="grid2" style="margin-top:8px"><label class="btn ghost sm">Load run sheet<input type="file" id="sRun" accept=".json" hidden></label><button class="btn ghost sm" id="sRunR">Reset run sheet</button></div>
  <button class="btn ghost block sm" id="sWipe" style="margin-top:8px;color:var(--bad)">Erase everything</button></div>
 <div class="card"><h2>About</h2><p class="small"><b class="logo99" style="font-size:18px">99</b> v${VERSION}: Kilo's grow logger for the AlmondGold run. Timeline: ${esc(RS.meta.title)}. ${esc(RS.meta.day_1_definition||'')}</p><p class="small muted">Towie is 99's original mascot. Offline-first: works without signal once installed.</p></div></div>`;
 $('#sT').onchange=e=>{st.remindAt=e.target.value;save();scheduleReminder();toast('Reminder set for '+st.remindAt);};
 $('#sEn').onclick=async()=>{if(!('Notification' in window))return toast('Notifications not supported here');const r=await Notification.requestPermission();if(r==='granted'){registerPeriodic();scheduleReminder();Towie.act('cheer',"I'll nudge you daily!");}vSettings();};
 $('#sTest').onclick=()=>notify('99 · Towie here 🧺','Test reminder. This is what your daily nudge looks like.');
 $('#sH').onclick=()=>{st.haptics=!st.haptics;$('#sH .sw').classList.toggle('on',st.haptics);save();vib(20);};
 $('#sL').onchange=e=>{st.leafOffsetF=+e.target.value||0;save();};
 $('#sBk').onclick=async()=>{const photos={};for(const k of await DB.keys('photos'))photos[k]=await DB.get('photos',k);const blob=new Blob([JSON.stringify({app:'99',backup:1,at:new Date().toISOString(),state:S,photos})],{type:'application/json'});shareOrDownload(blob,`99-backup-${ymd(new Date())}.json`,'99 backup');};
 $('#sRs').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const j=JSON.parse(await f.text());if(!j.state||!j.state.plants)throw 0;if(!confirm('Replace all data on this phone with this backup?'))return;S=j.state;for(const [k,v] of Object.entries(j.photos||{}))await DB.put('photos',k,v);save(true);toast('Backup restored ✓');go('home');}catch(_){toast('That file is not a 99 backup');}};
 $('#sRun').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const j=JSON.parse(await f.text());if(!j.days||j.days.length<70)throw 0;S.runsheet=j;RS=clean(j);save();toast('Run sheet loaded ✓');}catch(_){toast('Not a valid run sheet (needs 70 days)');}};
 $('#sRunR').onclick=async()=>{delete S.runsheet;RS=clean(await (await fetch('data/runsheet.json')).json());save();toast('Back to the bundled run sheet');};
 $('#sWipe').onclick=async()=>{if(!confirm('Erase ALL plants, logs and photos?'))return;S=DEF();for(const k of await DB.keys('photos'))await DB.del('photos',k);save(true);go('home');};
}
const clean=j=>JSON.parse(JSON.stringify(j).replace(/Dr\.\s?99(?:'s)?/g,'Towie'));
/* ---------------- EXPORT ---------------- */
const EX={mode:'week',weeks:[],stage:null,from:1,to:7,days:[],fmt:'ai',inc:{readings:true,checks:true,mix:true,notes:true,adj:true,targets:true,photos:false}};
function exDays(p){
 const td=Math.min(70,Math.max(1,dayOf(p)||70));
 let ds=[];
 if(EX.mode==='days')ds=[...EX.days];
 else if(EX.mode==='week')EX.weeks.forEach(w=>{for(let d=w*7-6;d<=w*7;d++)ds.push(d);});
 else if(EX.mode==='stage'){const s=RS.stage_targets.find(x=>x.stage===EX.stage);if(s)for(let d=s.day_start;d<=Math.min(70,s.day_end);d++)ds.push(d);}
 else if(EX.mode==='range'){const a=Math.max(1,Math.min(EX.from,EX.to)),b=Math.min(70,Math.max(EX.from,EX.to));for(let d=a;d<=b;d++)ds.push(d);}
 else {const mx=Math.max(td,...Object.keys(S.days[p.id]||{}).map(Number).filter(d=>scoreDay(p,d).logged));for(let d=1;d<=mx;d++)ds.push(d);}
 return [...new Set(ds)].filter(d=>d>=1&&d<=70).sort((a,b)=>a-b);
}
const FMTS=[['ai','Send to Grok Bot (optimized)','Compact JSON built for analysis','export'],['csv','CSV spreadsheet','One row per reading','log'],['pdf','PDF report','Charts + colored day table','charts'],['txt','Plain text','Readable summary','journal']];
function vExport(){
 const p=P(), td=dayOf(p)||1;
 if(!EX.weeks.length)EX.weeks=[Math.min(10,weekOf(Math.min(70,Math.max(1,td))))];
 if(!EX.stage)EX.stage=stageRow(Math.min(70,Math.max(1,td))).stage;
 if(!EX.days.length)EX.days=[Math.min(70,Math.max(1,td))];
 const ds=exDays(p), nR=ds.reduce((a,d)=>a+((DL(p,d)||{readings:[]}).readings.length),0), nL=ds.filter(d=>scoreDay(p,d).logged).length;
 const stages=[...new Set(RS.stage_targets.map(s=>s.stage))];
 $('#view').innerHTML=`<div class="stagger">
 <div class="card hero"><div class="row"><div class="tw-mini" id="exTowie" aria-hidden="true"></div><div class="grow"><div class="kicker">Export · ${esc(p.name)}</div><h1 style="margin:2px 0">Pack up your data</h1><div class="small muted">Pick days, choose what to include, then share it straight to Grok Bot or save it.</div></div></div></div>
 <div class="card"><h2>1 · Which days</h2>
  <div class="scrollx">${[['week','Weeks'],['days','Pick days'],['stage','Stage'],['range','Range'],['all','All']].map(([k,l])=>`<button class="chip ${EX.mode===k?'on':''}" data-mode="${k}">${l}</button>`).join('')}</div>
  <div style="margin-top:10px">${
   EX.mode==='week'?`<div class="chips">${Array.from({length:10},(_,i)=>`<button class="chip ${EX.weeks.includes(i+1)?'on':''}" data-w="${i+1}">Week ${i+1}</button>`).join('')}</div>`:
   EX.mode==='days'?`<div class="sel-days">${Array.from({length:70},(_,i)=>{const d=i+1,s=scoreDay(p,d);return `<button class="${EX.days.includes(d)?'on':''}" data-d="${d}" style="${s.logged&&!EX.days.includes(d)?'box-shadow:inset 0 -3px 0 var(--'+(s.status==='bad'?'bad':s.status==='warn'?'warn':'ok')+')':''}">${d}</button>`;}).join('')}</div><div class="row small" style="margin-top:6px;gap:6px"><button class="chip" id="dAllLogged">All logged</button><button class="chip" id="dClear">Clear</button></div>`:
   EX.mode==='stage'?`<div class="chips">${stages.map(s=>`<button class="chip ${EX.stage===s?'on':''}" data-stage="${esc(s)}">${esc(s)}</button>`).join('')}</div>`:
   EX.mode==='range'?`<div class="grid2"><label class="field">From day<input type="number" id="rF" min="1" max="70" value="${EX.from}"></label><label class="field">To day<input type="number" id="rT" min="1" max="70" value="${EX.to}"></label></div>`:
   `<p class="small muted">Every day from Day 1 through today${td>70?'':' (Day '+td+')'}.</p>`}</div>
  <div class="small" style="margin-top:8px"><b>${ds.length} day${ds.length===1?'':'s'}</b> selected · ${nL} logged · ${nR} reading${nR===1?'':'s'}${ds.length?` · Day ${ds[0]}${ds.length>1?'–'+ds[ds.length-1]:''}`:''}</div></div>
 <div class="card"><h2>2 · What to include</h2>${[['readings','Readings','pH, EC, temps, RH, VPD, PPFD, CO2'],['checks','Checks + score','Tasks done / missed'],['mix','Res mixes','ml per nutrient'],['notes','Notes',''],['adj','Adjustments','What you changed'],['targets','Targets','Run sheet targets per day'],['photos','Photos','Makes the file much bigger']].map(([k,l,s])=>`<button class="toggle" data-inc="${k}"><span class="grow" style="text-align:left"><b>${l}</b>${s?`<div class="small muted">${s}</div>`:''}</span><span class="sw ${EX.inc[k]?'on':''}"></span></button>`).join('')}</div>
 <div class="card"><h2>3 · Format</h2>${FMTS.map(([k,l,s,ic])=>`<button class="list-item pressable" data-fmt="${k}" style="width:100%;text-align:left;color:inherit;background:${EX.fmt===k?'rgba(255,211,77,.14)':'none'};border:1px solid ${EX.fmt===k?'var(--gold)':'transparent'};border-radius:14px">${icon(ic)}<span class="grow"><b>${l}</b>${k==='ai'?' <span class="pill g-ok">default</span>':''}<div class="small muted">${s}</div></span><span>${EX.fmt===k?'●':'○'}</span></button>`).join('')}</div>
 <div class="row" style="gap:8px"><button class="btn grow" id="exGo" ${ds.length?'':'disabled'}>${icon('export')} ${EX.fmt==='ai'?'Send to Grok Bot':'Share / save'}</button><button class="btn alt" id="exCopy" ${ds.length?'':'disabled'}>Copy as text</button></div>
 <p class="small muted" style="text-align:center;margin-top:8px">Opens Android's share sheet. If sharing isn't available, the file downloads instead.</p></div>`;
 const tw=$('#exTowie');tw.innerHTML=Towie.SVG;const tsv=$('svg',tw);tsv.classList.add('hold-clip');if(!reduce.matches)tsv.classList.add('idle');
 $$('[data-mode]').forEach(b=>b.onclick=()=>{EX.mode=b.dataset.mode;vib(8);vExport();});
 $$('[data-w]').forEach(b=>b.onclick=()=>{const w=+b.dataset.w,i=EX.weeks.indexOf(w);i>=0?EX.weeks.splice(i,1):EX.weeks.push(w);vib(6);vExport();});
 $$('[data-d]').forEach(b=>b.onclick=()=>{const d=+b.dataset.d,i=EX.days.indexOf(d);i>=0?EX.days.splice(i,1):EX.days.push(d);vib(6);vExport();});
 const al=$('#dAllLogged');if(al)al.onclick=()=>{EX.days=Array.from({length:70},(_,i)=>i+1).filter(d=>scoreDay(p,d).logged);vExport();};
 const dc=$('#dClear');if(dc)dc.onclick=()=>{EX.days=[];vExport();};
 $$('[data-stage]').forEach(b=>b.onclick=()=>{EX.stage=b.dataset.stage;vib(6);vExport();});
 const rf=$('#rF'),rt=$('#rT');if(rf){rf.onchange=()=>{EX.from=+rf.value||1;vExport();};rt.onchange=()=>{EX.to=+rt.value||1;vExport();};}
 $$('[data-inc]').forEach(b=>b.onclick=()=>{const k=b.dataset.inc;EX.inc[k]=!EX.inc[k];$('.sw',b).classList.toggle('on',EX.inc[k]);vib(6);});
 $$('[data-fmt]').forEach(b=>b.onclick=()=>{EX.fmt=b.dataset.fmt;vib(8);vExport();});
 $('#exGo').onclick=async e=>{const btn=e.currentTarget;btn.disabled=true;sparkle(e.clientX,e.clientY,10);Towie.act('point','Packing it up…');
  try{const ds2=exDays(p),stamp=`d${ds2[0]}-${ds2[ds2.length-1]}`;let blob,name;
   if(EX.fmt==='ai'){blob=new Blob([JSON.stringify(await buildAI(p,ds2))],{type:'application/json'});name=`99-growdata-${stamp}.json`;}
   else if(EX.fmt==='csv'){blob=new Blob(['\ufeff'+buildCSV(p,ds2)],{type:'text/csv'});name=`99-almondgold-${stamp}.csv`;}
   else if(EX.fmt==='pdf'){blob=await buildPDF(p,ds2);name=`99-almondgold-${stamp}.pdf`;}
   else {blob=new Blob([buildText(p,ds2)],{type:'text/plain'});name=`99-almondgold-${stamp}.txt`;}
   await shareOrDownload(blob,name,'AlmondGold grow data');confetti(30);}
  catch(err){console.error(err);toast('Export failed: '+(err.message||err));}
  btn.disabled=false;};
 $('#exCopy').onclick=async()=>{const ds2=exDays(p);const t=EX.fmt==='ai'?JSON.stringify(await buildAI(p,ds2)):EX.fmt==='csv'?buildCSV(p,ds2):buildText(p,ds2);
  try{await navigator.clipboard.writeText(t);toast(`Copied ${Math.round(t.length/1024*10)/10} KB ✓ Paste it into Grok Bot`);Towie.act('cheer','Copied! Paste away.');}catch(_){const ta=document.createElement('textarea');ta.value=t;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();toast('Copied ✓');}};
}
const R2=(v,n=2)=>v==null||v===''||Number.isNaN(+v)?null:Math.round(+v*10**n)/10**n;
const tgt=v=>v==null?null:Array.isArray(v)?[v[0],v[1]]:v;
async function buildAI(p,ds){
 const inc=EX.inc, tent=(S.tents.find(t=>t.id===p.tentId)||{}).name||null;
 const out={format:'99-growdata',schema_version:1,exported_at:new Date().toISOString(),note:'AlmondGold run data for analysis',
  selection:{mode:EX.mode,days:ds,include:Object.keys(inc).filter(k=>inc[k])},
  run_meta:{app:'99',app_version:VERSION,grow:'AlmondGold',plant:p.name,strain:p.strain||null,type:p.type,tent,system:`${p.gal} gal DWC, RO water`,light:'18/6',day1:p.day1,today_day:dayOf(p),harvest_day:p.harvestDay||70,res_change_days:p.resDays,co2:!!p.co2,leaf_offset_F:S.settings.leafOffsetF,source:RS.meta.title},
  units:{t:'HH:MM local',ph:'pH',ec_uScm:'uS/cm',water_F:'F',air_F:'F',rh:'%',vpd:'kPa (leaf-air, auto from air_F/rh with leaf_offset_F)',co2:'ppm',ppfd:'umol/m2/s at canopy top',mix_ml:'ml per gal_total',ranges:'[min,max]; single number = exact target'}};
 if(inc.checks)out.check_keys={res:'reservoir task (res change on res_change days, else top-off)',a1_aN:'that day\'s run-sheet actions in order (text in targets_by_day[d].tasks)',r_water:'check water level',r_topoff:'top off',r_ph:'read pH',r_ec:'read EC',r_light:'check light/PPFD',r_look:'look over the plant'};
 if(inc.checks&&RS.daily_check_routine)RS.daily_check_routine.forEach((r,i)=>{if(ROUTINE_KEYS[i])out.check_keys[ROUTINE_KEYS[i]]=r.title;});
 if(inc.targets){out.targets_by_day={};ds.forEach(d=>{const I=dayInfo(p,d),T=I.T;const o={stage:I.stage,ph:tgt(T.ph),ec_uScm:tgt(T.ec),water_F:tgt(T.water),air_F:tgt(T.air),rh:tgt(T.rh),vpd:tgt(T.vpd),ppfd:tgt(T.ppfd),co2:tgt(T.co2)};if(inc.checks)o.tasks=I.checks.filter(c=>/^a\d+$/.test(c.k)).map(c=>c.t);out.targets_by_day[d]=o;});}
 out.days=[];
 for(const d of ds){const I=dayInfo(p,d),x=DL(p,d)||{checks:{},readings:[],note:'',adj:[],photo:false,mix:null},s=scoreDay(p,d);
  const o={day:d,week:I.w,date:I.date?ymd(I.date):null,stage:I.stage,res_change:I.isRes,mix_week_in_res:I.mixWeek||null};
  if(inc.readings){o.readings=x.readings.map(r=>({t:r.t||null,ph:R2(r.ph),ec_uScm:R2(r.ec,0),water_F:R2(r.water,1),air_F:R2(r.air,1),rh:R2(r.rh,0),vpd:R2(r.vpd),co2:R2(r.co2,0),ppfd:R2(r.ppfd,0)}));
   o.grades=Object.fromEntries(MET.map(m=>[m.k==='ec'?'ec_uScm':m.k==='water'?'water_F':m.k==='air'?'air_F':m.k,s.g[m.k]==='none'?null:s.g[m.k]]));}
  if(inc.checks){o.checks={done:I.checks.filter(c=>x.checks[c.k]).map(c=>c.k),missed:I.checks.filter(c=>!x.checks[c.k]).map(c=>c.k)};o.score={met:s.met,close:s.close,missed:s.miss,graded:s.graded,tasks_done:s.done,tasks_total:s.tot,status:s.status};}
  if(inc.mix)o.mix_ml=x.mix?{week:x.mix.week,gal_total:x.mix.gal,ml:x.mix.ml}:null;
  if(inc.adj)o.adjustments=x.adj.length?x.adj:[];
  if(inc.notes)o.notes=x.note?x.note:null;
  if(inc.photos){const ph=DL(p,d)?photosOf(p,d):[];o.photo_count=ph.length;if(ph.length){const u=await DB.get('photos',ph[ph.length-1].id);o.photo_jpeg_b64=u?u.split(',')[1]:null;}}
  out.days.push(o);}
 return out;
}
function buildCSV(p,ds){
 const q=v=>{v=v==null?'':String(v);return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;};
 const H=['day','date','week','stage','time','ph','ec_uScm','water_F','air_F','rh','vpd','co2','ppfd','ph_target','ec_target','water_target','air_target','rh_target','vpd_target','ppfd_target','score_met','score_graded','tasks_done','tasks_total','status','res_change','mix_week','adjustments','note'];
 const rows=[H.join(',')];const ts=t=>t==null?'':Array.isArray(t)?t.join('-'):t;
 ds.forEach(d=>{const I=dayInfo(p,d),x=DL(p,d)||{readings:[],adj:[],note:'',mix:null,checks:{}},s=scoreDay(p,d);const rs=x.readings.length&&EX.inc.readings?x.readings:[{}];
  rs.forEach(r=>rows.push([d,I.date?ymd(I.date):'',I.w,I.stage,r.t,r.ph,r.ec,r.water,r.air,r.rh,r.vpd,r.co2,r.ppfd,ts(I.T.ph),ts(I.T.ec),ts(I.T.water),ts(I.T.air),ts(I.T.rh),ts(I.T.vpd),ts(I.T.ppfd),s.met,s.graded,s.done,s.tot,s.status,I.isRes?'Y':'',x.mix?x.mix.week:'',EX.inc.adj?x.adj.join('; '):'',EX.inc.notes?x.note:''].map(q).join(',')));});
 return rows.join('\n');
}
function buildText(p,ds){
 const L=[`99 · AlmondGold · ${p.name}`,`Day 1 = ${p.day1||'not set'} · ${p.gal} gal DWC · res days ${p.resDays.join(',')}`,`Days ${ds[0]}–${ds[ds.length-1]} (${ds.length})`,''];
 ds.forEach(d=>{const I=dayInfo(p,d),x=DL(p,d),s=scoreDay(p,d);L.push(`DAY ${d}${I.date?' · '+fmtL(I.date):''} · Wk ${I.w} ${I.stage}${I.isRes?' · RES CHANGE':''} · ${s.logged?`${s.met}/${s.graded} met, tasks ${s.done}/${s.tot}`:'not logged'}`);
  if(!x)return;
  if(EX.inc.readings)x.readings.forEach(r=>L.push('  '+[r.t,...MET.filter(m=>r[m.k]!=null).map(m=>`${m.lab} ${r[m.k]}${m.unit?' '+m.unit:''} (${grade(m.k,r[m.k],I.T)})`)].filter(Boolean).join(' · ')));
  if(EX.inc.targets)L.push('  targets: '+MET.filter(m=>I.T[m.k]!=null).map(m=>`${m.lab} ${tStr(m.k,I.T)}`).join(' · '));
  if(EX.inc.checks){const miss=I.checks.filter(c=>!x.checks[c.k]);if(miss.length)L.push('  missed: '+miss.map(c=>c.t).join('; '));}
  if(EX.inc.mix&&x.mix)L.push(`  mix: Wk ${x.mix.week}, ${x.mix.gal} gal: `+Object.entries(x.mix.ml).map(([k,v])=>`${k} ${v}`).join(', '));
  if(EX.inc.adj&&x.adj.length)L.push('  changed: '+x.adj.join(', '));
  if(EX.inc.notes&&x.note)L.push('  note: '+x.note);});
 return L.join('\n');
}
let jsPDFp=null;
function loadJsPDF(){return jsPDFp||(jsPDFp=new Promise((res,rej)=>{if(window.jspdf)return res(window.jspdf);const s=document.createElement('script');s.src='vendor/jspdf.umd.min.js';s.onload=()=>res(window.jspdf);s.onerror=()=>{jsPDFp=null;rej(new Error('PDF engine failed to load'));};document.head.appendChild(s);}));}
async function buildPDF(p,ds){
 const {jsPDF}=await loadJsPDF();const doc=new jsPDF({unit:'pt',format:'letter'});const W=612;
 doc.setFillColor(42,18,80);doc.rect(0,0,W,70,'F');doc.setFillColor(242,193,78);doc.rect(0,70,W,4,'F');
 doc.setTextColor(255,211,77);doc.setFontSize(26);doc.setFont('helvetica','bold');doc.text('99',36,46);
 doc.setTextColor(255,255,255);doc.setFontSize(14);doc.text(`AlmondGold · ${p.name}`,82,36);doc.setFontSize(10);doc.setFont('helvetica','normal');
 doc.text(`Days ${ds[0]}-${ds[ds.length-1]} · Day 1 = ${p.day1||'not set'} · ${p.gal} gal DWC · exported ${new Date().toLocaleString()}`,82,54);
 doc.setTextColor(30,20,50);
 const ms=['ph','ec','water','vpd'];let y=92;
 ms.forEach((k,i)=>{const m=MET.find(x=>x.k===k);const cv=document.createElement('canvas');const pts=seriesFor(p,k).filter(x=>x.d>=ds[0]-0&&x.d<=ds[ds.length-1]);
  const full=seriesFor(p,k).map(x=>pts.find(q=>q.d===x.d)?x:{d:x.d,v:null,T:x.T,g:'none'});
  drawChart(cv,full,m,null,false,{w:520,h:150,dpr:2,light:true,static:true});
  const cx=36+(i%2)*276,cy=y+Math.floor(i/2)*170;doc.setFontSize(10);doc.setFont('helvetica','bold');doc.text(`${m.lab} ${m.unit?'('+m.unit.replace('µ','u')+')':''}`,cx,cy);doc.addImage(cv.toDataURL('image/jpeg',.85),'JPEG',cx,cy+4,264,76);});
 y+=350;
 const cols=[['Day',30],['Date',44],['Stage',70],['pH',34],['EC',40],['Water',38],['Air',34],['RH',30],['VPD',34],['PPFD',38],['Score',38],['Tasks',38],['Note',72]];
 const head=()=>{doc.setFillColor(242,193,78);doc.rect(36,y-10,540,14,'F');doc.setFontSize(8);doc.setFont('helvetica','bold');let x=38;cols.forEach(([h,w])=>{doc.text(h,x,y);x+=w;});y+=14;doc.setFont('helvetica','normal');};
 head();
 const col={ok:[62,180,120],warn:[230,160,30],bad:[220,60,90]};
 ds.forEach(d=>{if(y>760){doc.addPage();y=40;head();}const I=dayInfo(p,d),x=DL(p,d),s=scoreDay(p,d),r=lastReading(x)||{};
  if(s.status!=='none'&&s.status!=='miss'){const c=col[s.status];doc.setFillColor(c[0],c[1],c[2]);doc.rect(36,y-9,3,12,'F');}
  const cells=[d,I.date?fmt(I.date):'',I.stage.slice(0,14),r.ph,r.ec,r.water,r.air,r.rh,r.vpd,r.ppfd,s.graded?`${s.met}/${s.graded}`:'',`${s.done}/${s.tot}`,x&&x.note&&EX.inc.notes?x.note.slice(0,18):''];
  let xx=42;cells.forEach((v,i)=>{const k=['','','','ph','ec','water','air','rh','vpd','ppfd'][i];const g=k&&v!=null?grade(k,v,I.T):'none';if(col[g])doc.setTextColor(...col[g]);else doc.setTextColor(30,20,50);doc.text(v==null?'—':String(v),xx,y);xx+=cols[i][1];});
  doc.setTextColor(30,20,50);y+=13;});
 doc.setFontSize(8);doc.setTextColor(120,110,150);doc.text('Colors: green = on target, amber = close, red = off. Targets from the AlmondGold run sheet.',36,780);
 return doc.output('blob');
}
async function shareOrDownload(blob,name,title){
 const file=new File([blob],name,{type:blob.type});
 try{if(navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file],title,text:title});toast('Shared ✓');return;}}catch(e){if(e.name==='AbortError')return;}
 const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},2000);toast('Saved '+name);
}
/* ---------------- reminders ---------------- */
async function notify(title,body){
 if(!('Notification' in window))return toast(body);
 if(Notification.permission!=='granted'){const r=await Notification.requestPermission();if(r!=='granted')return toast('Notifications are off. Enable them in Settings.');}
 const opt={body,icon:'icons/icon-192.png',badge:'icons/badge-96.png',tag:'daily-log',renotify:true,vibrate:[60,40,60],data:{url:'./#day'}};
 try{const reg=await navigator.serviceWorker.getRegistration();if(reg)return reg.showNotification(title,opt);}catch(_){}
 new Notification(title,opt);
}
const loggedToday=()=>{const p=P(),d=dayOf(p);if(!d||d<1||d>70)return true;const x=DL(p,d);return !!(x&&x.saved);};
let remT=0;
function scheduleReminder(){
 clearTimeout(remT);const [h,m]=(S.settings.remindAt||'09:00').split(':').map(Number);
 const now=new Date(),t=new Date();t.setHours(h,m,0,0);if(t<=now)t.setDate(t.getDate()+1);
 remT=setTimeout(()=>{if(!loggedToday()){const p=P();notify(`99 · Day ${dayOf(p)} check-in 🧺`,`Towie: "Yo, ${p.name} needs her daily log. 20 seconds, my guy."`);}scheduleReminder();},Math.min(t-now,2147000000));
}
async function registerPeriodic(){
 try{const reg=await navigator.serviceWorker.ready;if(!reg.periodicSync)return;const st=await navigator.permissions.query({name:'periodic-background-sync'});if(st.state!=='granted')return;await reg.periodicSync.register('daily-log',{minInterval:12*3600*1000});}catch(_){}
}
function nudge(){
 const p=P(),d=dayOf(p),st=streak();
 if(!d||d<1||d>70)return;
 if(!loggedToday()){
  const [h,m]=(S.settings.remindAt||'09:00').split(':').map(Number),now=new Date();
  setTimeout(()=>Towie.act('wave',`Day ${d} isn't logged yet${st?` (${st}-day streak on the line!)`:''}. Tap Today 👇`),600);
  if(now.getHours()*60+now.getMinutes()>=h*60+m&&S.settings.lastNudge!==ymd(now)&&'Notification' in window&&Notification.permission==='granted'){S.settings.lastNudge=ymd(now);save();notify(`99 · Day ${d} check-in 🧺`,"Today's log is still open. Towie's waiting with his clipboard.");}
 } else setTimeout(()=>Towie.act('cheer',`Day ${d} logged. ${st}-day streak! 🔥`),600);
}
/* ---------------- boot ---------------- */
async function boot(){
 try{await DB.open();S=await DB.get('kv','state');}catch(e){console.warn('IDB unavailable',e);}
 if(!S){S=DEF();
  save();}
 {const o=S.days&&S.days.p1&&S.days.p1[10];if(o&&o.saved==='2026-10-23T19:35:00'&&o.note==='Week 2 res change done. Roots white.'){delete S.days.p1[10];save();}} // drop old sample log from early builds
 S.settings=Object.assign(DEF().settings,S.settings||{});S.unlocked=S.unlocked||{};S.tents=S.tents||DEF().tents;S.plants.forEach(p=>{S.days[p.id]=S.days[p.id]||{};p.resDays=p.resDays&&p.resDays.length?p.resDays:[...RES_DEFAULT];});
 try{RS=clean(S.runsheet||await (await fetch('data/runsheet.json')).json());}catch(e){$('#view').innerHTML='<div class="card">Could not load the run sheet. Reopen 99 once with signal.</div>';return;}
 Towie.mount($('#companion'));
 $('#companion').addEventListener('click',e=>{if(e.target.closest('.tw-bubble'))return;vib([15,30,15]);sparkle(e.clientX,e.clientY,10);Towie.bag();});
 $('.sheet-back')&&$('.sheet-back').addEventListener('click',closeSheet);
 $('#sheet').addEventListener('click',e=>{if(e.target.closest('[data-close]'))closeSheet();});
 $('#plantChip').addEventListener('click',()=>{vib(10);openSheet(`<h2>Switch plant</h2>${S.plants.map(p=>`<button class="list-item pressable" data-sw="${p.id}" style="width:100%;text-align:left;color:inherit;background:none;border:0">${icon('plants')}<span class="grow"><b>${esc(p.name)}</b><div class="small muted">${p.day1?'Day '+dayOf(p):'dates blank'} · ${esc((S.tents.find(t=>t.id===p.tentId)||{}).name||'')}</div></span>${p.id===S.activeId?'<span class="pill g-ok">active</span>':''}</button>`).join('')}<a class="btn ghost block" href="#plants" style="margin-top:8px">Manage plants & tents</a>`);
  $$('[data-sw]').forEach(b=>b.onclick=e=>{S.activeId=b.dataset.sw;save();sparkle(e.clientX,e.clientY,10);closeSheet();Towie.act('spin',`Switched to ${P().name}!`);route();});});
 $$('.top-actions [data-go]').forEach(b=>{const n=b.dataset.go==='plants'?'plants':'settings';if(!b.querySelector('.ic'))b.innerHTML=icon(n);});
 route();
 setTimeout(()=>{const sp=$('#splash');if(sp){sp.classList.add('gone');setTimeout(()=>sp.remove(),700);}nudge();},1300);
 scheduleReminder();
 let scT=0;window.addEventListener('scroll',()=>{const c=$('#companion');c.classList.add('scrolling');clearTimeout(scT);scT=setTimeout(()=>c.classList.remove('scrolling'),700);},{passive:true});
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){scheduleReminder();}});
 if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').then(()=>{if(typeof Notification!=='undefined'&&Notification.permission==='granted')registerPeriodic();}).catch(e=>console.warn('sw',e));
 window.__99={get S(){return S;},get RS(){return RS;},dayInfo,scoreDay,buildAI:(ds)=>buildAI(P(),ds||exDays(P())),go,EX,save,DB,addPhoto,P,DL,route,runSummary,buildReport};
}
boot();
})();
