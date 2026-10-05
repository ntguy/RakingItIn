'use strict';
// ============================================================ dev: performance overlay
// F3 (or SETTINGS > PERFORMANCE OVERLAY) shows where each frame's time goes: every subsystem's milliseconds per frame,
// averaged over the last second, as a tree (a row's time includes the rows under it), plus frame times and counts.
// F4 copies the report (it's also perfReport() in the console). Timing works by wrapping the listed functions while
// the overlay is on, and putting the originals back when it's off, so it costs nothing when hidden
const PERF_KEY='rakingitin-perf-v1';
const PERF={on:false,orig:{},acc:{},calls:{},max:{},frames:0,winT:0,snap:null,ft:new Float32Array(240),fi:0,lastNow:0,jsMax:0,el:null,cv:null,txt:''};
// [function, parent]. '*' = called from all over (shown on its own, already counted inside whoever called it)
const PERF_FUNCS=[
  ['update',''],['updatePlayer','update'],['updateTraffic','update'],['trafficObstacles','updateTraffic'],['driveVehicle','updateTraffic'],['updateCouriers','updateTraffic'],['updatePackages','updateTraffic'],
  ['updateCritters','update'],['updateRakes','update'],['updateLeaves','update'],['updatePool','update'],['updatePots','update'],['updateTarps','update'],['updateTrees','update'],
  ['updateParticles','update'],['updatePeds','update'],['updateCamera','update'],['goalsTick','update'],['countBeds','goalsTick'],['tutUpdate','update'],
  ['render',''],['drawLeaves','render'],['drawTarpsGround','render'],['drawPools','render'],['drawZoneHints','render'],['drawPlayer','render'],['drawTraffic','render'],['drawCar','render'],
  ['drawPot','render'],['drawStreetlight','render'],['drawPed','render'],['drawCameo','render'],['drawTruck','render'],['drawLighting','render'],['drawDoorBadges','render'],
  ['drawPackageCues','render'],['drawCursor','render'],
  ['updateHUD',''],['hudView','updateHUD'],['goalRows','updateHUD'],['updateFx',''],['updateAudio',''],['netHostTick',''],['guestFrame',''],['pollPad',''],['padInput',''],['updateRumble',''],
  ['lotStats','*'],
];
let leafActive=0;
function perfSet(on){
  PERF.on=on;try{localStorage.setItem(PERF_KEY,on?'1':'');}catch(e){}
  for(const [name] of PERF_FUNCS){
    if(on&&!PERF.orig[name]){const f=window[name];if(typeof f!=='function')continue;PERF.orig[name]=f;
      window[name]=function(){const t=performance.now();try{return f.apply(this,arguments);}finally{const d=performance.now()-t;PERF.acc[name]=(PERF.acc[name]||0)+d;PERF.calls[name]=(PERF.calls[name]||0)+1;if(d>(PERF.max[name]||0))PERF.max[name]=d;}};}
    else if(!on&&PERF.orig[name]){window[name]=PERF.orig[name];delete PERF.orig[name];}}
  PERF.acc={};PERF.calls={};PERF.max={};PERF.frames=0;PERF.winT=0;PERF.jsMax=0;PERF.snap=null;
  if(!PERF.el){PERF.el=document.createElement('div');PERF.el.id='perf';document.body.appendChild(PERF.el);}
  PERF.el.style.display=on?'block':'none';if(on)PERF.el.innerHTML='<div class="ph">MEASURING...</div>';
}
// called at the end of every frame with the frame's start time and how long its JavaScript took
function perfFrame(now,js){
  if(!PERF.on)return;
  const gap=PERF.lastNow?now-PERF.lastNow:16.7;PERF.lastNow=now;PERF.ft[PERF.fi]=gap;PERF.fi=(PERF.fi+1)%PERF.ft.length;
  PERF.frames++;PERF.js=(PERF.js||0)+js;PERF.gap=(PERF.gap||0)+gap;if(js>PERF.jsMax)PERF.jsMax=js;if(gap>(PERF.gapMax||0))PERF.gapMax=gap;
  PERF.winT+=gap;if(PERF.winT<1000)return;
  // a second's worth: average it all per frame and draw the panel
  const f=PERF.frames,rows={};for(const [name] of PERF_FUNCS)if(PERF.calls[name])rows[name]={ms:PERF.acc[name]/f,calls:PERF.calls[name]/f,max:PERF.max[name]||0};
  PERF.snap={fps:f*1000/PERF.winT,js:PERF.js/f,jsMax:PERF.jsMax,gap:PERF.gap/f,gapMax:PERF.gapMax,rows,
    counts:{leaves:N,moving:leafActive,airborne:airCount,traffic:traffic.length,peds:peds.length,players:players.length,views:views.length,
      canvas:views.map(v=>v.w+'x'+v.h+'@'+v.sc).join(' '),dpr:devicePixelRatio,trees:TREES.length,pots:POTS.length,cars:CARS.length,state}};
  PERF.acc={};PERF.calls={};PERF.max={};PERF.frames=0;PERF.winT=0;PERF.js=0;PERF.gap=0;PERF.jsMax=0;PERF.gapMax=0;
  perfDraw();
}
// the report as text: the same tree the overlay shows (min: leave out rows under that many ms per frame)
function perfText(min=0){
  const S=PERF.snap;if(!S)return'(no measurements yet: turn the overlay on with F3)';
  const out=[`FPS ${S.fps.toFixed(1)}   FRAME ${S.gap.toFixed(1)}ms (worst ${S.gapMax.toFixed(1)})   JS ${S.js.toFixed(2)}ms/frame (worst ${S.jsMax.toFixed(1)})`];
  const kids=p=>PERF_FUNCS.filter(([n,q])=>q===p&&S.rows[n]&&S.rows[n].ms>=min).sort((a,b)=>S.rows[b[0]].ms-S.rows[a[0]].ms);
  const walk=(p,d)=>{for(const [n] of kids(p)){const r=S.rows[n];out.push(`${'  '.repeat(d)}${n.padEnd(22-d*2)} ${r.ms.toFixed(3).padStart(7)}ms ${(r.ms/S.js*100).toFixed(1).padStart(5)}%  x${r.calls.toFixed(r.calls<10?1:0).padStart(4)}  worst ${r.max.toFixed(2)}`);walk(n,d+1);}};
  walk('',0);
  const sh=kids('*');if(sh.length){out.push('(inside the above)');walk('*',1);}
  const c=S.counts;out.push(`LEAVES ${c.leaves} (moving ${c.moving}, airborne ${c.airborne})  TRAFFIC ${c.traffic}  PEOPLE ${c.peds}  TREES ${c.trees}  POTS ${c.pots}  PARKED CARS ${c.cars}`);
  out.push(`VIEWS ${c.views}  CANVAS ${c.canvas}  DPR ${c.dpr}  STATE ${c.state}`);
  return out.join('\n');
}
window.perfReport=()=>{const t=perfText();console.log(t);return t;};
function perfDraw(){
  const S=PERF.snap,el=PERF.el;if(!el)return;
  const col=S.fps>=55?'#4bc26a':S.fps>=40?'#ffcf4a':'#fe5f55';
  el.innerHTML=`<div class="ph"><b style="color:${col}">${S.fps.toFixed(0)} FPS</b> &middot; F3 HIDE &middot; F4 COPY</div><canvas width="240" height="40"></canvas><pre>${perfText(.01)}</pre>`;
  const g=el.querySelector('canvas').getContext('2d');g.fillStyle='rgba(0,0,0,.4)';g.fillRect(0,0,240,40);
  // frame times, newest on the right: the line is a 60 FPS frame (16.7ms), the top edge 33ms
  const y=v=>40-clamp(v/33.3,0,1)*40;g.fillStyle='rgba(255,255,255,.25)';g.fillRect(0,Math.round(y(16.7)),240,1);
  for(let k=0;k<240;k++){const v=PERF.ft[(PERF.fi+k)%240];g.fillStyle=v>20?'#fe5f55':v>17.5?'#ffcf4a':'#4bc26a';g.fillRect(k,y(v),1,40-y(v));}
}
addEventListener('keydown',e=>{
  if(e.code==='F3'){e.preventDefault();perfSet(!PERF.on);}
  else if(e.code==='F4'&&PERF.on){e.preventDefault();const t=perfText();try{navigator.clipboard.writeText(t);padToast('PERFORMANCE REPORT COPIED');}catch(err){}console.log(t);}
});
try{if(localStorage.getItem(PERF_KEY))setTimeout(()=>perfSet(true),0);}catch(e){}
