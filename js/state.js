'use strict';
// ============================================================ state
let P={x:110,y:Y1-26,vx:0,vy:0,walk:0};
const TR={x:100,y:Y1-34,a:0,v:0,steer:0};
let aim={x:1,y:-.3};
let power=0,mode=0,battery=BATT_BASE,bed=[1,1],swapT=0,tieT=0,time=0,airCount=0;
let state='title',driving=false,money=0,day=1,hour=DAY_START,rep=0;
let today=null,bumpT=0;
// truckBundles: leaf counts of the tied tarps loaded today. Each one used up a tarp until tomorrow
const tarps=[],truckBundles=[];let bundle=null,tarpSeq=1,tarpsUsed=0,heldNet=null;
const tarpsLeft=()=>tarpsOwned()-tarpsUsed-tarps.filter(t=>t.owner===cur).length-(bundle?1:0);
const SWAP_TIME=1.4,THROW_T=.38,TIE_T=.6;
let camX=0,camY=0;
const keys={},mouse={x:innerWidth/2,y:innerHeight/2,l:false,r:false};
const streaks=[],sparks=[],puffs=[],peds=[],ripples=[];
let curLot=null,statsCache=null,statsT=0,daySummary=null,nightTab='sum';
const tdir=()=>[Math.cos(TR.a),Math.sin(TR.a)];
function toTruck(x,y){const c=Math.cos(TR.a),s=Math.sin(TR.a),dx=x-TR.x,dy=y-TR.y;return[dx*c+dy*s,-dx*s+dy*c];}
function fromTruck(lx,ly){const c=Math.cos(TR.a),s=Math.sin(TR.a);return[TR.x+lx*c-ly*s,TR.y+lx*s+ly*c];}

// ============================================================ players
// Everything that belongs to one person lives on their player object: position, aim, blower, battery, what they're
// carrying, wallet and gear. Game code works on "the current player" through the familiar globals (P, aim, power,
// battery, bundle...); usePl() loads a player into them and storePl() writes them back.
const PLAYER_PALS=[
  {shirt:['#5c141a','#c8352c','#8a2224','#e85a44'],cap:['#10284a','#2a5d9f','#3d7cc9','#1d4577']},
  {shirt:['#0f3a24','#2f9a5a','#1f6a3f','#6fd18e'],cap:['#4a3208','#d9a02a','#f0c24a','#a8761a']}];
// truck upgrades are bought once for the whole crew; everything else is personal gear
const SHARED_UPG=['spare','cap','solar'];
const players=[];let cur=null,PPAL=PLAYER_PALS[0];
// upgrade levels capped at each upgrade's current top level (older saves can have more)
const upDesc=(u,lvl)=>typeof u.desc==='function'?u.desc(lvl):u.desc;
function clampUpg(u){for(const k in UPG)u[k]=Math.min(u[k]||0,UPG[k].max);return u;}
function newPlayer(i,dev,prof){
  const pr=prof||{money:0,upg:{},owned:['std'],equipped:'std'};
  return{i,dev,pal:PLAYER_PALS[i],P:{x:0,y:0,vx:0,vy:0,walk:0},aim:{x:1,y:-.3},cam:{x:0,y:0},
    power:0,mode:0,battery:BATT_BASE,swapT:0,tieT:0,bundle:null,heldNet:null,carryPkg:null,driving:false,riding:false,
    equipped:pr.equipped||'std',owned:(pr.owned||['std']).slice(),upg:clampUpg({spare:0,cap:0,tune:0,boots:0,tarp:0,bigtarp:0,sticky:0,light:0,solar:0,rakecap:0,rakewide:0,rakeshovel:0,...pr.upg}),money:pr.money||0,tarpsUsed:0,
    bl:{nx:0,ny:0,range:0,cosH:1,tx:0,ty:0},raking:false,rakeN:0,rake:{eff:RAKE_REACH,vL:-RAKE_WIDTHS[0]/2,vR:RAKE_WIDTHS[0]/2,prev:null,hx:0,hy:0,contact:0,load:0,drop:null,fullT:-9},lastEmptyBuzz:0,wasEmpty:false,netPrev:null,netFullT:-9,curLot:null,statsCache:null,statsT:0,autoMode:'kbm',vortexD:40,autoPad:-1};
}
function usePl(pl){if(cur)storePl();cur=pl;P=pl.P;aim=pl.aim;PPAL=pl.pal;power=pl.power;mode=pl.mode;battery=pl.battery;swapT=pl.swapT;tieT=pl.tieT;bundle=pl.bundle;heldNet=pl.heldNet;
  carryPkg=pl.carryPkg;driving=pl.driving;equipped=pl.equipped;owned=pl.owned;upg=pl.upg;money=pl.money;tarpsUsed=pl.tarpsUsed;bl=pl.bl;lastEmptyBuzz=pl.lastEmptyBuzz;
  wasEmpty=pl.wasEmpty;netPrev=pl.netPrev;netFullT=pl.netFullT;curLot=pl.curLot;statsCache=pl.statsCache;statsT=pl.statsT;
  pad=devPad(pl);padObj=pad.obj||null;inputMode=devMode(pl);}
function storePl(){const pl=cur;if(!pl)return;pl.power=power;pl.mode=mode;pl.battery=battery;pl.swapT=swapT;pl.tieT=tieT;pl.bundle=bundle;pl.heldNet=heldNet;pl.carryPkg=carryPkg;
  pl.driving=driving;pl.equipped=equipped;pl.owned=owned;pl.upg=upg;pl.money=money;pl.tarpsUsed=tarpsUsed;pl.bl=bl;pl.lastEmptyBuzz=lastEmptyBuzz;pl.wasEmpty=wasEmpty;
  pl.netPrev=netPrev;pl.netFullT=netFullT;pl.curLot=curLot;pl.statsCache=statsCache;pl.statsT=statsT;}
// run fn as another player, then put everything back
function withPl(pl,fn){const prev=cur;if(!pl||prev===pl)return fn();usePl(pl);try{return fn();}finally{usePl(prev);}}
const onFoot=pl=>!pl.driving&&!pl.riding;
const coop=()=>players.length>1,split=()=>views.length>1;
// is (x,y) inside this player's blower cone? Returns the distance, or -1
function inBlast(pl,x,y,rk=1,cosAdd=0){
  for(const b of blCones(pl)){const dx=x-b.nx,dy=y-b.ny,d=Math.hypot(dx,dy);if(d<b.range*rk&&d>0&&(dx*b.ax+dy*b.ay)/d>b.cosH+cosAdd)return d;}return -1;}
// a player's blower cones: the front one, plus the back one on the twin nozzle
const blCones=pl=>{const b=pl.bl,c=[{nx:b.nx,ny:b.ny,range:b.range,cosH:b.cosH,ax:pl.aim.x,ay:pl.aim.y}];if(pl.bl2)c.push(pl.bl2);return c;};
const blowers=(min)=>players.filter(pl=>pl.power>min&&onFoot(pl));
// spare batteries live in the truck bed, each with its own charge (0..1). A swap takes the fullest one and leaves
// yours in its place, where the solar panel (if you have one) can top it back up
const bestSpare=()=>bed.length?Math.max(...bed):0;
function swapBattery(){const i=bed.indexOf(bestSpare());if(i<0)return;tutEv('swap');const got=bed[i];bed[i]=clamp(battery/capacity(),0,1);battery=got*capacity();}
const SOLAR_RATE=.25;
// sunlight on the panels: nothing before 7 AM or after 7 PM, strongest at 1 PM
const sunAt=h=>clamp(Math.sin(Math.PI*(h-7)/12),0,1);
const charging=()=>players[0].upg.solar>0&&sunAt(hour)>.02&&bed.some(c=>c<1);
const SUN_SVG='<svg class="px" width="14" height="14" viewBox="0 0 7 7"><path d="M3 0h1v1H3zM0 3h1v1H0zM6 3h1v1H6zM3 6h1v1H3zM1 1h1v1H1zM5 1h1v1H5zM1 5h1v1H1zM5 5h1v1H5z" fill="#ffcf4a"/><path d="M2 2h3v3H2z" fill="#ffe38a"/></svg>';
const levelCol=c=>c>.6?'#4bc26a':c>.25?'#ffcf4a':'#fe5f55';
// player 2's wallet and gear, kept (and saved) while they're not playing
let p2Profile=null;
function joinPlayer(dev){
  if(players.length>=2||(state!=='play'&&dev.t!=='net'))return;
  const p1=players[0];storePl();
  // player one keeps the keyboard and any spare controller; if player 2 is joining on the keyboard, player one
  // stays on the controller they're holding and player 2 gets the keyboard (and spare controllers) instead
  let d=dev;if(dev.t==='kbm'){const a=autoPl();if(a)a.dev={t:'pad',i:a.autoPad};d={t:'auto'};}
  const pl=newPlayer(1,d,p2Profile);if(d.t==='auto'){pl.autoMode='kbm';pl.autoPad=-1;}for(const k of SHARED_UPG)pl.upg[k]=p1.upg[k];
  players.push(pl);
  withPl(pl,()=>{const [x,y]=onFoot(p1)?[p1.P.x+12,p1.P.y+4]:fromTruck(-6,-(TRUCK_HW+8));P.x=x;P.y=y;collidePlayer();battery=capacity();});
  pl.cam={...p1.cam};
  if(d.t!=='net'){const root=views[0].root.cloneNode(true);root.id='view1';root.querySelector('#fx').innerHTML='';views[0].root.after(root);
    const v=makeView(root);v.pl=pl;pl.view=v;views.push(v);layoutViews();}
  // from here the day's money goes in one pot, split at the end of the day
  today.coop=true;
  padToast(d.t==='wait'?'PLAYER 2: PICK UP A CONTROLLER':d.t==='net'?'YOUR ONLINE FRIEND JOINED':'PLAYER 2 JOINED');blip(660,.08,'square',.05);setTimeout(()=>blip(880,.12,'square',.05),90);
  usePl(players[0]);
}
function leavePlayer(pl){
  if(!pl||pl===players[0])return;
  withPl(pl,()=>{if(carryPkg)putDownPkg();if(heldNet)putNetDown();stopRake(true);if(bundle)tarpAction();if(driving){driving=false;TR.v=0;}cur.riding=false;});
  p2Profile={money:pl.money,upg:{...pl.upg},owned:pl.owned.slice(),equipped:pl.equipped};
  for(const t of tarps)if(t.owner===pl)t.owner=players[0];
  if(pl.dev.t==='net'){padToast('YOUR ONLINE FRIEND LEFT');}
  for(const p of peds.concat(couriers))if(p.bub){p.bub.el.remove();p.bub=null;}
  for(const f of floats)if(f.els[1])f.els[1].remove();
  for(const e of pl.fullEls||[])if(e)e.remove();
  players.splice(players.indexOf(pl),1);const v=pl.view;if(v){v.root.remove();views.splice(views.indexOf(v),1);}
  const p1=players[0],was=p1.dev;if(was.t==='pad'){p1.autoPad=was.i;p1.autoMode='pad';}p1.dev={t:'auto'};
  layoutViews();usePl(p1);padToast('PLAYER 2 LEFT');save();
}
// money in: straight to your bank on your own; into the shared pot in co-op
function earn(n){if(today.coop)today.pot+=n;else money+=n;}
function charge(cost){if(today.coop){today.pot-=cost;return cost;}const paid=Math.min(cost,Math.max(0,Math.floor(money)));money-=paid;return paid;}

// ============================================================ canvas
let cvs=document.getElementById('game'),ctx=cvs.getContext('2d');
let scale=3,VW=480,VH=270,gCan,aCan,lCan,gCtx,aCtx,lCtx,gImg,aImg,gBuf,aBuf;
// The screen is one view, or two side by side. Each has its own canvas, leaf/lighting buffers and camera; the
// drawing code runs once per view with that view's buffers loaded into the usual globals
const views=[];let HV=null;
function makeView(root){const cv=root.querySelector('canvas');cv.classList.add('gamecv');
  return{root,cvs:cv,ctx:cv.getContext('2d'),fx:root.querySelector('#fx'),cache:{},els:{},canOff:{x:-1,y:-1},left:0,pw:innerWidth,w:VW,h:VH,sc:3,pl:null};}
function layoutViews(){
  const n=views.length,W=innerWidth,Hh=innerHeight,base=Math.max(2,Math.round(Math.min(W/390,Hh/245)));
  // two players each see a touch more of the world: about 10% further out than full screen
  const sc=n>1?base/1.1:base;
  views.forEach((v,i)=>{const pw=n>1?Math.floor(W/2):W;v.pw=pw;v.left=i?W-pw:0;v.root.style.left=v.left+'px';v.root.style.width=pw+'px';
    v.sc=sc;v.w=Math.ceil(pw/sc)+1;v.h=Math.ceil(Hh/sc)+1;v.cvs.width=v.w;v.cvs.height=v.h;v.cvs.style.width=v.w*sc+'px';v.cvs.style.height=v.h*sc+'px';v.ctx.imageSmoothingEnabled=false;
    v.gCan=mk(v.w,v.h);v.aCan=mk(v.w,v.h);v.lCan=mk(v.w,v.h);v.gCtx=v.gCan.getContext('2d');v.aCtx=v.aCan.getContext('2d');v.lCtx=v.lCan.getContext('2d');
    v.gImg=v.gCtx.createImageData(v.w,v.h);v.aImg=v.aCtx.createImageData(v.w,v.h);v.gBuf=new Uint32Array(v.gImg.data.buffer);v.aBuf=new Uint32Array(v.aImg.data.buffer);
    v.canOff={x:-1,y:-1};v.cache={};});
  document.body.classList.toggle('coop',n>1);
  useView(views[0]);
}
function useView(v){HV=v;cvs=v.cvs;ctx=v.ctx;VW=v.w;VH=v.h;scale=v.sc;gCan=v.gCan;aCan=v.aCan;lCan=v.lCan;gCtx=v.gCtx;aCtx=v.aCtx;lCtx=v.lCtx;
  gImg=v.gImg;aImg=v.aImg;gBuf=v.gBuf;aBuf=v.aBuf;canOff=v.canOff;if(v.pl){camX=v.pl.cam.x;camY=v.pl.cam.y;}}
// every camera, for things that spawn or despawn just out of sight
const CAMS=()=>{const c=views.map(v=>({x:v.pl?v.pl.cam.x:camX,y:v.pl?v.pl.cam.y:camY,w:v.w,h:v.h}));const g=typeof NET!=='undefined'&&NET.role==='host'&&NET.ready&&NET.in.cam;if(g)c.push({x:g[0],y:g[1],w:g[2],h:g[3]});return c;};
const randCam=()=>{const c=CAMS();return c[(rnd()*c.length)|0];};
const inAnyCam=(x,y,m)=>CAMS().some(c=>x>c.x-m&&x<c.x+c.w+m&&y>c.y-m&&y<c.y+c.h+m);
function resize(){if(!views.length)views.push(makeView(document.getElementById('view0')));layoutViews();}
addEventListener('resize',resize);

// ============================================================ DOM fx
const floats=[];
function floatText(x,y,txt,col,big){const els=views.map(v=>{const el=document.createElement('div');el.className='float';el.textContent=txt;el.style.color=col;if(big)el.style.fontSize='22px';v.fx.appendChild(el);return el;});floats.push({els,x,y,t:0,life:1.4});}
function bubble(p,txt){if(p.bub)p.bub.el.remove();const els=views.map(v=>{const el=document.createElement('div');el.className='bubble';el.textContent=txt;v.fx.appendChild(el);return el;});
  p.bub={els,t:2.2,el:{remove:()=>els.forEach(e=>e.remove()),get textContent(){return els[0].textContent;}}};}
// a full rake or pool net: the button that empties it pulses slowly on the head of the rake or net, fading up to
// FULLCUE_MAX opacity and back over FULLCUE_FADE seconds, then staying hidden for FULLCUE_GAP. It shows the key, or
// the controller button if that's what they're playing with
const FULLCUE_MAX=.7,FULLCUE_FADE=1.6,FULLCUE_GAP=.5;
function updateFullCues(){
  for(const pl of players){
    const full=onFoot(pl)&&((pl.heldNet&&pl.heldNet.n>=NET_CAP)||(pl.raking&&pl.rakeN>=rakeCap(pl))),els=pl.fullEls||(pl.fullEls=[]);
    views.forEach((v,j)=>{let el=els[j];
      if(!full||!v.pl){if(el)el.style.display='none';return;}
      if(!el||!el.isConnected){el=document.createElement('div');el.className='fullcue';v.fx.appendChild(el);els[j]=el;}
      const g=withPl(pl,()=>glyphInner('tarp'));if(el.dataset.g!==g){el.dataset.g=g;el.innerHTML=g;}
      const t=time%(FULLCUE_FADE+FULLCUE_GAP),o=t<FULLCUE_FADE?FULLCUE_MAX*.5*(1-Math.cos(t*Math.PI*2/FULLCUE_FADE)):0;
      // the middle of the rake head (as drawn, stopped short of fences), or of the net's hoop
      const net=!!pl.heldNet,d=net?NET_REACH:pl.rake.eff,hx=pl.P.x+pl.aim.x*d,hy=pl.P.y+pl.aim.y*d-(net?4:0);
      el.style.display='block';el.style.opacity=o.toFixed(3);
      el.style.transform=`translate(${(hx-v.pl.cam.x)*v.sc}px,${(hy-v.pl.cam.y)*v.sc}px) translate(-50%,-50%)`;});
  }
}
function updateFx(dt){
  updateFullCues();
  for(let i=floats.length-1;i>=0;i--){const f=floats[i];f.t+=dt;if(f.t>f.life){f.els.forEach(e=>e.remove());floats.splice(i,1);continue;}
    views.forEach((v,j)=>{const el=f.els[j];if(!el||!v.pl)return;const sx=(f.x-v.pl.cam.x)*v.sc,sy=(f.y-v.pl.cam.y-f.t*18)*v.sc;
      el.style.transform=`translate(${sx}px,${sy}px) translate(-50%,-50%) scale(${1+Math.max(0,.3-f.t)})`;el.style.opacity=f.t>f.life-.4?(f.life-f.t)/.4:1;});}
  for(const p of peds.concat(couriers)){if(!p.bub)continue;p.bub.t-=dt;if(p.bub.t<=0){p.bub.el.remove();p.bub=null;continue;}
    views.forEach((v,j)=>{const el=p.bub.els[j];if(!el||!v.pl)return;el.style.transform=`translate(${(p.x-v.pl.cam.x)*v.sc}px,${(p.y-v.pl.cam.y-16)*v.sc}px) translate(-50%,-100%)`;});}
}
