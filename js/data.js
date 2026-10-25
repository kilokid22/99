/* Grow knowledge for Kilo's AlmondGold run (from his guide build files at /workspace/pdf/gi/p7.py, p3.py, p8.py) */
window.G = {
NUTES: [ // mixing order
  {k:'si',   name:'Armor Si',    why:'Silica goes FIRST into plain water. Added after other nutrients it can bind with them and drop out as a cloudy precipitate. It also makes the water very alkaline, which is why pH is adjusted last.'},
  {k:'cm',   name:'CaliMagic',   why:'RO water is stripped of calcium and magnesium, so CaliMagic puts them back. It goes in before the Flora trio so the calcium is diluted before it meets phosphate.'},
  {k:'micro',name:'FloraMicro',  why:'Micro carries calcium and trace elements. It must be diluted BEFORE Gro and Bloom, or calcium can lock up with Bloom\'s phosphate/sulfate as insoluble gunk.'},
  {k:'gro',  name:'FloraGro',    why:'Mostly nitrogen for leafy growth. It tapers in late flower because the plant stops building leaves and starts building flowers.'},
  {k:'bloom',name:'FloraBloom',  why:'Phosphorus and potassium for flowers. It climbs through flower as P/K demand peaks.'},
  {k:'rs',   name:'RapidStart',  why:'Root enhancer for Weeks 1-4. Strong roots early mean faster growth for the rest of the run.'},
  {k:'kb',   name:'KoolBloom',   why:'Late-flower P/K booster (Weeks 7-9) for bud density. Not used early because young plants cannot use that much P/K.'},
  {k:'hg',   name:'Hydroguard',  why:'Live Bacillus bacteria that protect roots from rot. Always LAST, after the strong concentrates are diluted, so the bacteria survive. Never mix with H2O2 or bleach.'}
],
// ml per 5.5 gal RO (null = none). EC targets in uS/cm.
WEEKS: [
  {w:1, si:1.5, cm:3,   micro:4,    gro:4,   bloom:1.5,  rs:5.5, kb:null, hg:11, ec:[300,500],   stage:'Seedling'},
  {w:2, si:3,   cm:5.5, micro:8,    gro:8,   bloom:3,    rs:5.5, kb:null, hg:11, ec:[650,850],   stage:'Early veg'},
  {w:3, si:5.5, cm:8,   micro:14,   gro:14,  bloom:5.5,  rs:5.5, kb:null, hg:11, ec:[1000,1300], stage:'Early veg'},
  {w:4, si:5.5, cm:8,   micro:16.5, gro:14,  bloom:11,   rs:5.5, kb:null, hg:11, ec:[1200,1500], stage:'Pre-flower'},
  {w:5, si:5.5, cm:8,   micro:16.5, gro:8,   bloom:19,   rs:null,kb:null, hg:11, ec:[1400,1700], stage:'Stretch'},
  {w:6, si:5.5, cm:8,   micro:19,   gro:5.5, bloom:25,   rs:null,kb:null, hg:11, ec:[1500,1800], stage:'Stretch'},
  {w:7, si:3,   cm:8,   micro:19,   gro:5.5, bloom:27.5, rs:null,kb:5.5,  hg:11, ec:[1600,1800], stage:'Bulk'},
  {w:8, si:null,cm:5.5, micro:16.5, gro:3,   bloom:27.5, rs:null,kb:8,    hg:11, ec:[1500,1800], stage:'Bulk'},
  {w:9, si:null,cm:5.5, micro:11,   gro:null,bloom:16.5, rs:null,kb:5.5,  hg:11, ec:[1000,1300], stage:'Ripen'},
  {w:10,si:null,cm:null,micro:null, gro:null,bloom:null, rs:null,kb:null, hg:11, ec:[0,300],     stage:'Flush', note:'RO + FloraKleen (per label) + Hydroguard. EC under 300.'}
],
// environment targets by stage
ENV: {
  'Seedling':  {temp:[75,80], rh:[65,75], vpd:[0.6,1.0], ppfd:'150-250'},
  'Early veg': {temp:[75,77], rh:[60,70], vpd:[0.8,1.1], ppfd:'ramp +20/day to 450, hold'},
  'Pre-flower':{temp:[72,80], rh:[50,65], vpd:[1.0,1.3], ppfd:'450 → ramp toward 700 once pistils show'},
  'Stretch':   {temp:[72,80], rh:[45,55], vpd:[1.2,1.5], ppfd:'700-900 (CO2: up to ~1,000)'},
  'Bulk':      {temp:[72,78], rh:[40,50], vpd:[1.2,1.5], ppfd:'700-900, CO2 ~1,000'},
  'Ripen':     {temp:[72,77], rh:[40,50], vpd:[1.2,1.5], ppfd:'700-800'},
  'Flush':     {temp:[72,77], rh:[40,50], vpd:[1.2,1.5], ppfd:'700-800'}
},
PH:{lo:5.6, hi:6.0, target:5.8}, WATER:{lo:66, hi:68, target:67.5},
TIMELINE: [
  {w:1, title:'Sprout + Seedling', items:['Rapid Rooter in net pot, keep it moist','PPFD 150-250, RH 65-75%','Week 1 half-strength mix (EC 300-500)','Water just touching the bottom of the net pot']},
  {w:2, title:'Roots Hit the Water', items:['Week 2 mix, EC 650-850','Day 10: PPFD 250, then +20/day','Lower the water line once roots dangle','Watch for first true-leaf sets']},
  {w:3, title:'Early Veg + LST', items:['PPFD reaches ~450 by ~Day 19-20, hold','Start LST at 3-4 nodes','Week 3 mix, EC 1,000-1,300','RH 60-70%, VPD 0.9-1.0']},
  {w:4, title:'Pre-Flower', items:['First pistils appear','Week 4 mix (last RapidStart)','Ramp PPFD toward 700 once pistils show','Install + leak-test CO2 rig']},
  {w:5, title:'Stretch I', items:['Week 5 mix, EC 1,400-1,700','PPFD 700-900, re-measure at the tallest top','CO2 1,000-1,200 ppm lights-on only','RH 45-55%']},
  {w:6, title:'Stretch II', items:['Week 6 mix, EC 1,500-1,800','Finish canopy shaping','No foliar sprays from here on','Expect 1.5-2x stretch']},
  {w:7, title:'Bulk I', items:['Week 7 mix + KoolBloom 5.5 ml','RH 40-50% to protect buds','Buds fatten every 2-3 days','Check for rot daily']},
  {w:8, title:'Bulk II', items:['Week 8: no Si, KoolBloom 8 ml','Slight lower-leaf yellowing is OK','Keep PPFD steady','Watch leaf tips for burn']},
  {w:9, title:'Ripen', items:['Week 9 ripening mix (no Gro, no Si)','Nights 62-65°F, day ~75°F','Trichome checks every 2-3 days','EC 1,000-1,300']},
  {w:10,title:'Flush + Harvest', items:['RO + FloraKleen + Hydroguard, EC < 300','CO2 off, PPFD 700-800','Chop at mostly cloudy, 10-20% amber','Slow 10-14 day dry, 4+ week cure']}
],
TIPS: {
  ph:'pH controls which nutrients roots can actually absorb. In DWC the sweet spot is 5.6-6.0 (target 5.8). Outside it, nutrients lock out even if they are in the water.',
  ec:'EC measures how much fertilizer is dissolved. It tells you if the mix is right and how the plant is eating: EC rising = plant drinking more water than food; EC falling = eating more than drinking.',
  water:'Warm water holds less oxygen and grows root-rot bugs. 66-68°F keeps dissolved oxygen high. Your VEVOR chiller holding 67-68°F is doing exactly the right job.',
  temp:'Air temp drives how fast the plant works. Too hot and it closes up; too cold and growth slows. A small night drop (under 10°F) is ideal.',
  rh:'Humidity sets how hard the plant "breathes" water out. Seedlings like it humid; flowers want it drier so buds do not rot.',
  vpd:'VPD (vapor pressure deficit) combines temp + RH into one number for how thirsty the air is. Leaves run a bit cooler than air, so we subtract a leaf offset before calculating.',
  co2:'Extra CO2 only helps when light is strong (700+ PPFD). Dose 1,000-1,200 ppm lights-on only, never above ~1,500, and never with lights off.',
  ppfd:'PPFD is the light actually hitting the canopy. Ramping slowly (+20/day) lets the plant adapt without bleaching. 18/6 stays the same all run.',
  res:'A full weekly reservoir change resets the nutrient balance. Plants eat some elements faster than others, so after a week the ratios drift even if EC looks fine.',
  lst:'Low-stress training bends the main stem so all the tops get even light. More tops at the same height = more, bigger buds from the same 150W light.',
  streak:'Daily logs catch problems 2-3 days before leaves show them. A pH drift you log on Tuesday is a lockout you avoid by Friday.',
  photo:'Photos side by side show slow changes (color, leaf posture) your eyes miss day to day.'
}
};
