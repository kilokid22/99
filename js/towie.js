/* Towie: layered SVG mascot for the 99 app (original character). */
(function(){
const INK='#2a1250', FUR='#b597ea', FUR2='#9474d6', GOLD='#f2c14e', GOLD2='#d99a1e';
const star=(x,y,s,c)=>`<path class="tw-spark" style="--sx:${x}px;--sy:${y}px" d="M${x} ${y-s} Q${x+s*.18} ${y-s*.18} ${x+s} ${y} Q${x+s*.18} ${y+s*.18} ${x} ${y+s} Q${x-s*.18} ${y+s*.18} ${x-s} ${y} Q${x-s*.18} ${y-s*.18} ${x} ${y-s}Z" fill="${c}"/>`;
let tassels='';
for(let x=64;x<=156;x+=13){tassels+=`<g class="tw-tassel"><circle cx="${x}" cy="66" r="4.5" fill="${FUR}" stroke="${INK}" stroke-width="2"/><path d="M${x-5} 69 Q${x} 96 ${x+5} 69Z" fill="${FUR}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/><path d="M${x} 72 L${x} 88" stroke="${FUR2}" stroke-width="1.5"/></g>`;}
const eye=(cx)=>`<g class="tw-eye"><ellipse cx="${cx}" cy="122" rx="10.5" ry="12.5" fill="#fff" stroke="${INK}" stroke-width="2.6"/>
<g class="tw-pupils"><circle cx="${cx}" cy="123" r="8" fill="url(#twIris)"/><circle cx="${cx}" cy="124" r="3.6" fill="#3a1e00"/><circle cx="${cx-3}" cy="118.5" r="2.8" fill="#fff"/><circle cx="${cx+3.2}" cy="127" r="1.3" fill="#fff"/></g>
<path class="tw-lid" d="M${cx-12} 108 L${cx+12} 108 L${cx+12} 117 Q${cx} 112 ${cx-12} 117Z" fill="${FUR}"/><path class="tw-lid" d="M${cx-11} 117 Q${cx} 111.5 ${cx+11} 117" stroke="${INK}" stroke-width="2.6" fill="none" stroke-linecap="round"/></g>`;
const SVG=`<svg class="towie-svg" viewBox="0 0 220 260" role="img" aria-label="Towie, the 99 mascot" overflow="visible">
<defs>
<clipPath id="twClip"><rect x="55" y="62" width="110" height="150" rx="42"/></clipPath>
<radialGradient id="twIris" cx=".5" cy=".35" r=".7"><stop offset="0" stop-color="#ffe9a3"/><stop offset=".55" stop-color="#f5b52e"/><stop offset="1" stop-color="#a86a00"/></radialGradient>
<linearGradient id="twFur" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#c8b0f5"/><stop offset="1" stop-color="#9677d8"/></linearGradient>
<radialGradient id="twGlow"><stop offset="0" stop-color="#ffd27a" stop-opacity=".95"/><stop offset=".45" stop-color="#ff7a1a" stop-opacity=".6"/><stop offset="1" stop-color="#ff3b00" stop-opacity="0"/></radialGradient>
<radialGradient id="twSmoke" cx=".45" cy=".4" r=".6"><stop offset="0" stop-color="#ffffff"/><stop offset=".7" stop-color="#e6ddf7"/><stop offset="1" stop-color="#cdbfee" stop-opacity="0"/></radialGradient>
</defs>
<ellipse class="tw-shadow" cx="110" cy="230" rx="54" ry="8" fill="#12002b" opacity=".28"/>
<g class="tw-all">
 <g class="tw-feet"><ellipse cx="88" cy="214" rx="20" ry="13" fill="${FUR}" stroke="${INK}" stroke-width="3"/><ellipse cx="132" cy="214" rx="20" ry="13" fill="${FUR}" stroke="${INK}" stroke-width="3"/>
 <path d="M80 222 l0 -5 M88 223 l0 -5 M124 222 l0 -5 M132 223 l0 -5" stroke="${FUR2}" stroke-width="2" stroke-linecap="round"/></g>
 <g class="tw-body">
  <rect x="55" y="62" width="110" height="150" rx="42" fill="url(#twFur)"/>
  <g clip-path="url(#twClip)">
   <rect x="50" y="88" width="120" height="13" fill="${GOLD}"/><rect x="50" y="99" width="120" height="2.5" fill="${GOLD2}"/>
   <rect x="50" y="190" width="120" height="15" fill="${GOLD}"/><rect x="50" y="203" width="120" height="2.5" fill="${GOLD2}"/>
   <path d="M64 140 q3 4 0 8 M150 150 q3 4 0 8 M70 175 q3 4 0 8 M146 120 q3 4 0 8 M100 214 l0 -6 M120 214 l0 -6" stroke="${FUR2}" stroke-width="1.6" fill="none" stroke-linecap="round"/>
  </g>
  <rect x="55" y="62" width="110" height="150" rx="42" fill="none" stroke="${INK}" stroke-width="3.2"/>
  <path class="tw-coat" d="M57 130 Q51 170 58 210 L86 212 L82 164 L76 136 Z" fill="#fff" stroke="${INK}" stroke-width="2.8" stroke-linejoin="round"/>
  <path class="tw-coat" d="M163 130 Q169 170 162 210 L134 212 L138 164 L144 136 Z" fill="#fff" stroke="${INK}" stroke-width="2.8" stroke-linejoin="round"/>
  <path d="M76 136 L86 152 M144 136 L134 152" stroke="${INK}" stroke-width="2.2"/>
  <rect x="141" y="170" width="14" height="10" rx="2" fill="none" stroke="${INK}" stroke-width="1.8"/>
  <text x="110" y="182" text-anchor="middle" font-family="Bungee, Impact, sans-serif" font-size="25" fill="${GOLD}" stroke="${GOLD2}" stroke-width="1.2">99</text>
  ${tassels}
  <g class="tw-goggles"><path d="M70 64 Q110 54 150 64" stroke="#d9dbe6" stroke-width="6" fill="none"/><ellipse cx="96" cy="56" rx="15" ry="10" fill="#e8f6ff" fill-opacity=".75" stroke="#8b90a8" stroke-width="3"/><ellipse cx="124" cy="56" rx="15" ry="10" fill="#e8f6ff" fill-opacity=".75" stroke="#8b90a8" stroke-width="3"/><path d="M89 52 l6 -3 M117 52 l6 -3" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/></g>
  <g class="tw-face">
   <path class="tw-brow tw-browL" d="M83 103 Q92 99 101 103" stroke="${INK}" stroke-width="2.6" fill="none" stroke-linecap="round"/>
   <path class="tw-brow tw-browR" d="M119 103 Q128 99 137 103" stroke="${INK}" stroke-width="2.6" fill="none" stroke-linecap="round"/>
   <g class="tw-eyes">${eye(92)}${eye(128)}</g>
   <g class="tw-happyeyes"><path d="M82 125 Q92 112 102 125" stroke="${INK}" stroke-width="3.4" fill="none" stroke-linecap="round"/><path d="M118 125 Q128 112 138 125" stroke="${INK}" stroke-width="3.4" fill="none" stroke-linecap="round"/></g>
   <g class="tw-blush"><ellipse cx="80" cy="140" rx="7" ry="4" fill="#ff7fa8" opacity=".55"/><ellipse cx="140" cy="140" rx="7" ry="4" fill="#ff7fa8" opacity=".55"/></g>
   <g class="tw-puff"><circle cx="92" cy="144" r="10" fill="${FUR}" stroke="${INK}" stroke-width="2.2"/><circle cx="128" cy="144" r="10" fill="${FUR}" stroke="${INK}" stroke-width="2.2"/><path d="M104 147 Q110 144 116 147" stroke="${INK}" stroke-width="2.6" fill="none" stroke-linecap="round"/></g>
   <path class="tw-m tw-m-smile" d="M97 141 Q110 156 123 141 Q110 148 97 141Z" fill="#e8667a" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>
   <g class="tw-m tw-m-grin"><path d="M93 139 Q110 166 127 139 Z" fill="#9c2944" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/><path d="M101 151 Q110 146 119 151 Q110 160 101 151Z" fill="#ff8aa0"/></g>
   <ellipse class="tw-m tw-m-o" cx="110" cy="147" rx="5" ry="6" fill="#6b1830" stroke="${INK}" stroke-width="2.4"/>
   <path class="tw-m tw-m-worry" d="M97 151 Q103 143 110 149 Q117 143 123 151" stroke="${INK}" stroke-width="2.8" fill="none" stroke-linecap="round"/>
   <path class="tw-sweat" d="M146 100 Q153 112 146 118 Q139 112 146 100Z" fill="#7fd3ff" stroke="${INK}" stroke-width="2"/>
  </g>
 </g>
 <g class="tw-armL">
  <rect x="43" y="122" width="22" height="52" rx="11" fill="#fff" stroke="${INK}" stroke-width="2.8"/>
  <g class="tw-beakwrap"><g class="tw-prop tw-beaker"><path d="M47 146 L47 160 L36 178 Q34 184 40 184 L68 184 Q74 184 72 178 L61 160 L61 146 Z" fill="#fff" fill-opacity=".8" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/><path d="M41 172 L67 172 L71 179 Q72 182 68 182 L40 182 Q36 182 37 179Z" fill="${GOLD}"/><circle class="tw-bub" cx="50" cy="170" r="2.5" fill="#fff"/><circle class="tw-bub b2" cx="58" cy="168" r="2" fill="#fff"/><circle class="tw-bub b3" cx="54" cy="172" r="1.6" fill="#fff"/><rect x="45" y="143" width="18" height="4" rx="2" fill="#fff" stroke="${INK}" stroke-width="2"/></g></g>
  <g class="tw-bagwrap"><g class="tw-prop tw-bag">
   <path d="M36 142 L72 142 L74 176 Q74 180 70 180 L38 180 Q34 180 34 176 Z" fill="#f4fbff" fill-opacity=".7" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>
   <rect x="35" y="140" width="38" height="6" rx="2" fill="#5ec27a" stroke="${INK}" stroke-width="2"/>
   <g><circle cx="46" cy="168" r="7" fill="#4c9a3a" stroke="#1f4d17" stroke-width="1.6"/><circle cx="58" cy="166" r="8" fill="#5fb447" stroke="#1f4d17" stroke-width="1.6"/><circle cx="64" cy="172" r="6" fill="#3f8a32" stroke="#1f4d17" stroke-width="1.6"/><circle cx="51" cy="157" r="6" fill="#6cc24f" stroke="#1f4d17" stroke-width="1.6"/>
   <path d="M44 165 l3 2 M57 162 l2 3 M50 155 l2 2 M62 170 l2 1" stroke="#f29a3a" stroke-width="1.6" stroke-linecap="round"/><circle cx="54" cy="163" r="1" fill="#fff"/><circle cx="47" cy="170" r=".9" fill="#fff"/><circle cx="61" cy="168" r=".9" fill="#fff"/></g>
   <path d="M39 148 L41 174" stroke="#fff" stroke-width="2.5" stroke-linecap="round" opacity=".9"/>
  </g></g>
  <g class="tw-clipwrap"><g class="tw-prop tw-clip">
   <rect x="30" y="146" width="40" height="50" rx="5" fill="#c98a4b" stroke="${INK}" stroke-width="2.6"/>
   <rect x="34" y="152" width="32" height="40" rx="2" fill="#fffaf0" stroke="${INK}" stroke-width="1.6"/>
   <rect x="42" y="142" width="16" height="9" rx="3" fill="${GOLD}" stroke="${INK}" stroke-width="2"/>
   <path d="M38 160 l3 3 5-6 M38 170 l3 3 5-6 M38 180 l3 3 5-6" stroke="#3ee08f" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
   <path d="M50 161 h12 M50 171 h12 M50 181 h9" stroke="#8a78b8" stroke-width="2" stroke-linecap="round"/>
  </g></g>
  <circle cx="54" cy="178" r="11.5" fill="${FUR}" stroke="${INK}" stroke-width="2.8"/>
 </g>
 <g class="tw-armR">
  <rect x="155" y="122" width="22" height="52" rx="11" fill="#fff" stroke="${INK}" stroke-width="2.8"/>
  <g class="tw-prop tw-joint"><line x1="166" y1="176" x2="181" y2="152" stroke="${INK}" stroke-width="8.5" stroke-linecap="round"/><line x1="166" y1="176" x2="181" y2="152" stroke="#fffaf0" stroke-width="5" stroke-linecap="round"/><line x1="166" y1="176" x2="170.5" y2="169" stroke="#d9a35a" stroke-width="5" stroke-linecap="round"/>
   <circle class="tw-glow" cx="181" cy="152" r="9" fill="url(#twGlow)"/><circle class="tw-ember" cx="181" cy="152" r="3.6" fill="#ff5a1a" stroke="#7a1c00" stroke-width="1.2"/></g>
  <g class="tw-penwrap"><g class="tw-prop tw-pen"><rect x="161" y="134" width="11" height="40" rx="4" fill="#26222e" stroke="${INK}" stroke-width="2"/><rect x="162.8" y="139" width="7.4" height="9" rx="1.5" fill="#9ef2a8"/><text x="166.5" y="146.3" font-size="5.5" text-anchor="middle" font-family="sans-serif" font-weight="700" fill="#16351a">5.8</text><rect x="164" y="126" width="5" height="9" rx="2" fill="#cfd3dd" stroke="${INK}" stroke-width="1.5"/></g></g>
  <circle cx="166" cy="178" r="11.5" fill="${FUR}" stroke="${INK}" stroke-width="2.8"/>
 </g>
</g>
<g class="tw-smoke">
 ${[0,1,2,3,4].map(i=>`<circle class="tw-puffc p${i}" cx="${110+(i%2?6:-4)}" cy="146" r="${9+i*1.5}" fill="url(#twSmoke)"/>`).join('')}
 <ellipse class="tw-ring" cx="110" cy="146" rx="7" ry="3.5" fill="none" stroke="#efe8ff" stroke-width="2.6"/>
</g>
<g class="tw-sparks">${star(12,60,9,GOLD)}${star(44,40,7,'#fff6c4')}${star(6,104,6,'#ff9de0')}${star(196,70,8,GOLD)}${star(205,120,6,'#fff6c4')}${star(176,40,6,'#ff9de0')}</g>
</svg>`;

const DUR={joint:5000,bag:3000,ph:2400,mix:2200,cheer:1600,point:1800,worry:2200,wave:1600,spin:1000,tilt:1400};
const reduce=matchMedia('(prefers-reduced-motion: reduce)');
let root,svg,bubble,timer=0,bubbleTimers=[],current=null,idleTimer=0,blinkTimer=0;

function say(text,ms){
  if(!bubble) return;
  bubbleTimers.forEach(clearTimeout);bubbleTimers=[];
  if(Array.isArray(text)){ // [[delay,text],...]
    text.forEach(([d,t])=>bubbleTimers.push(setTimeout(()=>say(t,ms),d)));return;
  }
  bubble.textContent=text;bubble.classList.remove('show');void bubble.offsetWidth;bubble.classList.add('show');
  bubbleTimers.push(setTimeout(()=>bubble.classList.remove('show'),ms||3200));
}
function act(name,line){
  if(!svg) return Promise.resolve();
  if(current){svg.classList.remove('a-'+current);clearTimeout(timer);}
  void svg.getBoundingClientRect();
  current=name;svg.classList.add('a-'+name);
  if(line) say(line, Math.max(2600,DUR[name]||2000));
  scheduleIdle();
  return new Promise(res=>{timer=setTimeout(()=>{svg.classList.remove('a-'+name);current=null;res();},DUR[name]||1500);});
}
function mood(m){ if(!svg)return; svg.classList.remove('mood-happy','mood-worried'); if(m) svg.classList.add('mood-'+m); }
function blink(){
  clearTimeout(blinkTimer);
  if(!reduce.matches && !current){svg.classList.add('blink');setTimeout(()=>svg.classList.remove('blink'),160);}
  blinkTimer=setTimeout(blink,2400+Math.random()*3800);
}
function scheduleIdle(){
  clearTimeout(idleTimer);
  if(reduce.matches) return;
  idleTimer=setTimeout(()=>{ if(!current && document.visibilityState==='visible'){ Math.random()<.75? Towie.smoke() : act('wave','Yo! Still here, still chill.'); } else scheduleIdle(); }, 45000+Math.random()*60000);
}
function mount(el){
  root=el;root.innerHTML=`<div class="tw-bubble" aria-live="polite"></div>`+SVG;
  svg=root.querySelector('svg');bubble=root.querySelector('.tw-bubble');
  if(!reduce.matches) svg.classList.add('idle');
  blink();scheduleIdle();
}
window.Towie={mount,act,say,mood,smoke(line){act('joint');say(line||[[0,"Lil' break time…"],[1900,'*holds it in* 😤'],[2800,'Ahhhh… chill vibes ☁️']],2400);},
  bag(){act('bag');say([[0,'Check out my premium stash 😏✨'],[2300,'…aaand tucked away.']],2000);},
  SVG, DUR, get busy(){return !!current;}};
})();
