'use strict';
// ============================================================ gamepad
// standard mapping: 0 A/cross, 1 B/circle, 2 X/square, 3 Y/triangle, 4 LB/L1, 5 RB/R1, 6 LT/L2, 7 RT/R2, 8 view/share, 9 menu/options, 12-15 d-pad
const BTN={use:0,honk:1,tarp:2,end:3,rake:3,prev:4,next:5,view:8,pause:9,up:12,down:13,left:14,right:15};
// keys carried the game's old name; still read them so nobody loses their settings
const PAD_KEY='rakingitin-pad-v1',padPrefs={style:null,rumble:true};
try{Object.assign(padPrefs,JSON.parse(localStorage.getItem(PAD_KEY)||localStorage.getItem('curbappeal-pad-v1'))||{});}catch(e){}
function savePadPrefs(){try{localStorage.setItem(PAD_KEY,JSON.stringify(padPrefs));}catch(e){}}
const mkPad=idx=>({lx:0,ly:0,rx:0,ry:0,lt:0,rt:0,b:new Array(17).fill(false),pb:new Array(17).fill(false),lock:false,id:'',obj:null,style:'xbox',idx,startT:0,joinFired:false,startTap:false,r:{until:0,t:0,key:'',on:false}});
// ZERO_PAD stands in for "no controller"; MERGED is every pad at once, for menus
const ZERO_PAD=mkPad(-1),MERGED=mkPad(-2),pads={};let lastPadIdx=-1,pad=ZERO_PAD;
const padOwner=idx=>players.find(pl=>pl.dev.t==='pad'&&pl.dev.i===idx)||null;
// Devices: 'auto' is the keyboard and mouse plus any controller nobody else owns (whichever was used last);
// 'pad' is one particular controller; 'wait' is a second player who hasn't picked a controller up yet
const autoPl=()=>players.find(pl=>pl.dev.t==='auto')||null,waitPl=()=>players.find(pl=>pl.dev.t==='wait')||null;
function devPad(pl){const d=pl.dev;if(d.t==='pad')return pads[d.i]||ZERO_PAD;if(d.t==='auto')return pads[pl.autoPad]||ZERO_PAD;return ZERO_PAD;}
function devMode(pl){return pl.dev.t==='pad'||pl.dev.t==='net'?'pad':pl.dev.t==='auto'?pl.autoMode:'kbm';}
let padObj=null,padDetected='xbox',inputMode='kbm';
const padStyle=()=>padPrefs.style||padDetected;
const glyphStyle=()=>inputMode==='pad'?(padPrefs.style||pad.style||padDetected):'kbm';
const detectStyle=id=>!/xbox|xinput|045e/i.test(id)&&/054c|sony|playstation|dualsense|dualshock|^wireless controller/i.test(id)?'ps':'xbox';
const anyPad=()=>!!navigator.getGamepads&&[...navigator.getGamepads()].some(g=>g&&g.connected);
// whichever device was touched last decides the prompts, the aim style and the cursor
function setInputMode(m,idx){
  // the keyboard player hops between keyboard/mouse and any spare controller, whichever they touched last
  const pl=autoPl();if(!pl)return;
  if(pl.autoMode===m&&(idx==null||pl.autoPad===idx))return;
  pl.autoMode=m;if(idx!=null)pl.autoPad=idx;if(cur===pl){inputMode=m;pad=devPad(pl);padObj=pad.obj||null;}
  if(!coop())document.body.classList.toggle('pad',m==='pad');refreshGlyphs();
  if(m!=='pad')stopRumble();
  if(state==='menu'&&!ctlPicked)showCtl(m==='pad'?padStyle():'kbm');
}
// let go of the blow buttons; a trigger that's still held has to come up before it blows again
function dropInputs(){mouse.l=mouse.r=false;pad.lock=true;}
function deadzone(x,y,dz){const m=Math.hypot(x,y);if(m<dz)return[0,0];const k=Math.min(1,(m-dz)/(1-dz))/m;return[x*k,y*k];}
function pollPad(){
  const list=navigator.getGamepads?navigator.getGamepads():[],seen=new Set();
  for(const g of list){if(!g||!g.connected)continue;seen.add(g.index);
    const p=pads[g.index]||(pads[g.index]=mkPad(g.index));
    for(let i=0;i<17;i++)p.pb[i]=p.b[i];
    p.obj=g;if(g.id!==p.id){p.id=g.id;p.style=detectStyle(g.id);padDetected=p.style;refreshGlyphs();}
    const ax=g.axes,bt=g.buttons,val=i=>{const b=bt[i];return b==null?0:typeof b==='number'?b:b.value;};
    [p.lx,p.ly]=deadzone(ax[0]||0,ax[1]||0,.2);[p.rx,p.ry]=deadzone(ax[2]||0,ax[3]||0,.25);
    p.lt=val(6);p.rt=val(7);
    for(let i=0;i<17;i++){const b=bt[i];p.b[i]=b!=null&&(b.pressed||val(i)>.5);}
    if(p.lock&&p.lt<.15&&p.rt<.15)p.lock=false;
    // a controller nobody owns: a waiting player 2 claims it; otherwise it takes over from the keyboard player
    // (Start on its own doesn't count unless someone's waiting: it might be a friend holding it to join)
    const w=waitPl(),a=autoPl();
    let fresh=false;for(let i=0;i<17;i++)if(p.b[i]&&!p.pb[i]&&(i!==BTN.pause||w))fresh=true;
    if((fresh||Math.hypot(p.lx,p.ly)>.5||Math.hypot(p.rx,p.ry)>.5)&&!padOwner(g.index)){
      if(w&&!(a&&a.autoMode==='pad'&&a.autoPad===g.index)){w.dev={t:'pad',i:g.index};for(let i=0;i<17;i++)p.pb[i]=p.b[i];p.lock=true;padToast('PLAYER 2 IS READY');}
      else if(a){setInputMode('pad',g.index);if(cur===a){pad=p;padObj=g;}}}
  }
  for(const k in pads)if(!seen.has(+k))delete pads[k];
  // every pad at once, for the menus
  const M=MERGED;for(let i=0;i<17;i++){M.pb[i]=M.b[i];M.b[i]=false;}M.lx=M.ly=M.rx=M.ry=M.lt=M.rt=0;M.obj=null;
  for(const k in pads){const p=pads[k];if(!M.obj)M.obj=p.obj;for(let i=0;i<17;i++)if(p.b[i])M.b[i]=true;
    for(const a of ['lx','ly','rx','ry','lt','rt'])if(Math.abs(p[a])>Math.abs(M[a]))M[a]=p[a];}
  {const ap=autoPl();M.style=((ap&&pads[ap.autoPad])||{}).style||padDetected;}
  if(cur){pad=devPad(cur);padObj=pad.obj||null;}
}
const padHit=i=>pad.b[i]&&!pad.pb[i];
function cycleNozzle(d){if(driving)return;const list=ATT.filter(a=>owned.includes(a.id));if(list.length<2)return;let i=list.findIndex(a=>a.id===equipped);i=(i+d+list.length)%list.length;equip(list[i].id);}
function padInput(dt){
  // Start: a quick tap pauses, holding it for a moment on a pad nobody's using drops a second player in
  for(const k in pads){const p=pads[k];
    if(p.b[BTN.pause]&&!p.pb[BTN.pause])p.startIn=state;
    if(p.b[BTN.pause]){p.startT+=dt;if(p.startT>.8&&!p.joinFired&&state==='play'&&canJoinWith({t:'pad',i:p.idx})){p.joinFired=true;joinPlayer({t:'pad',i:p.idx});}}
    else{if(p.pb[BTN.pause]&&!p.joinFired&&p.startT<.6&&p.startIn==='play')p.startTap=true;p.startT=0;p.joinFired=false;}}
  if(state==='play'){
    for(const pl of players){if(devPad(pl)===ZERO_PAD)continue;withPl(pl,()=>playPad(dt));if(state!=='play')break;}
    for(const k in pads){const p=pads[k];if(!p.startTap)continue;p.startTap=false;
      if(state==='play'&&!padOwnedNow(p.idx)){if(!coop())setInputMode('pad',p.idx);openMenu(false,coop()?padOwner(p.idx)||players[0]:players[0]);}}
  }else{for(const k in pads)pads[k].startTap=false;
    if(state==='shop'&&coop()){for(const pl of players)if(devPad(pl)!==ZERO_PAD)shopPadNav(pl,dt);}
    else if(state==='title'||state==='menu'||state==='closeout'||state==='shop'||state==='joinpad'||state==='tut'){const sv=pad;pad=MERGED;menuNav(dt);pad=sv;}}
}
function shopPadNav(pl,dt){
  const ns=pl.nav||(pl.nav={focus:null,navT:0,navDir:''}),sv=[pad,padFocus,navT,navDir];
  pad=devPad(pl);padFocus=ns.focus&&ns.focus.isConnected?ns.focus:null;navT=ns.navT;navDir=ns.navDir;
  navFilter=b=>b.dataset.pl==null||+b.dataset.pl===pl.i;focusCls=pl.i?'pf1':'';navScrollEl=modalEl.querySelector('.shopcol.p'+pl.i);
  const st=inputMode;inputMode='pad';
  menuNav(dt);
  ns.focus=padFocus;ns.navT=navT;ns.navDir=navDir;inputMode=st;navFilter=null;focusCls='';navScrollEl=null;[pad,padFocus,navT,navDir]=sv;
}
// is this pad already somebody's, right now?
const padOwnedNow=idx=>players.some(pl=>pl.dev.t==='pad'?pl.dev.i===idx:pl.dev.t==='auto'&&pl.autoMode==='pad'&&pl.autoPad===idx);
function canJoinWith(dev){
  if(TUT.on)return false;
  if(players.length>=2)return false;const p1=players[0];
  if(dev.t==='pad')return !padOwnedNow(dev.i);
  const a=autoPl();return !!a&&a.autoMode==='pad';
}
function playPad(dt){
  if(!padObj)return;
  if(pad.b.some((b,i)=>b&&!pad.pb[i]))ensureAudio();
  if(padHit(BTN.pause)||padHit(BTN.view)){openMenu(false,cur);return;}
  if(padHit(BTN.use))interact();
  if(state!=='play')return;
  if(padHit(BTN.tarp))tarpAction();
  if(driving&&padHit(BTN.honk))honk();
  else if(!driving&&!cur.riding&&padHit(BTN.honk))toggleGoals();
  if(driving&&padHit(BTN.end)){endDay();return;}
  if(!driving&&padHit(BTN.rake))toggleRake();
  if(padHit(BTN.prev))cycleNozzle(-1);if(padHit(BTN.next))cycleNozzle(1);
}
// ---------- menus: d-pad / left stick move a focus ring between buttons, A presses, B backs out
let padFocus=null,navT=0,navDir='';
const navRoot=()=>state==='title'?titleEl:modalEl;
const navItems=()=>[...navRoot().querySelectorAll('button')].filter(b=>!b.disabled&&b.offsetParent!==null&&(!navFilter||navFilter(b)));
let navFilter=null,focusCls='',navScrollEl=null;
function setFocus(el){if(padFocus)padFocus.classList.remove('padfocus','pf1');padFocus=el||null;if(el){el.classList.add('padfocus');if(focusCls)el.classList.add(focusCls);const col=el.closest('.shopcol');if(col){const r=el.getBoundingClientRect(),c=col.getBoundingClientRect();if(r.top<c.top)col.scrollTop-=c.top-r.top+8;else if(r.bottom>c.bottom)col.scrollTop+=r.bottom-c.bottom+8;}else el.scrollIntoView({block:'nearest',inline:'nearest'});}}
function defaultFocus(){const it=navItems();return it.find(b=>b.classList.contains('bounce'))||it.find(b=>b.classList.contains('green'))||it[0]||null;}
function moveFocus(dx,dy,it){
  if(!padFocus){setFocus(defaultFocus());return;}
  // nearest button that way; ones sharing the row (or column) win, and nothing far off to the side counts
  const r=padFocus.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;let best=null,bs=1e9;
  for(const b of it){if(b===padFocus)continue;const q=b.getBoundingClientRect(),ex=q.left+q.width/2-cx,ey=q.top+q.height/2-cy,along=ex*dx+ey*dy;
    if(along<=4)continue;
    const side=dx?Math.max(0,q.top-r.bottom,r.top-q.bottom):Math.max(0,q.left-r.right,r.left-q.right);
    if(side>along*1.7)continue;const sc=along+side*3+(side>0?1e4:0);if(sc<bs){bs=sc;best=b;}}
  if(best){setFocus(best);blip(520,.03,'square',.03);}
}
function menuNav(dt){
  const it=navItems();
  if(inputMode==='pad'&&(!padFocus||!it.includes(padFocus)))setFocus(defaultFocus());
  let dx=0,dy=0;
  if(pad.b[BTN.left])dx=-1;else if(pad.b[BTN.right])dx=1;else if(pad.b[BTN.up])dy=-1;else if(pad.b[BTN.down])dy=1;
  else if(Math.abs(pad.lx)>.55&&Math.abs(pad.lx)>Math.abs(pad.ly))dx=Math.sign(pad.lx);else if(Math.abs(pad.ly)>.55)dy=Math.sign(pad.ly);
  const dir=dx+','+dy;
  if(!dx&&!dy)navDir='';
  else if(dir!==navDir){navDir=dir;navT=.38;moveFocus(dx,dy,it);}
  else if((navT-=dt)<=0){navT=.11;moveFocus(dx,dy,it);}
  if(state!=='title'&&Math.abs(pad.ry)>.2)(navScrollEl||modalEl).scrollTop+=pad.ry*700*dt;
  if(padHit(BTN.use)&&padFocus){padFocus.click();return;}
  if(padHit(BTN.honk)){if(state==='tut')tutModalOk();else if(state==='menu')menuBack();else if(state==='closeout')closeModal();else if(state==='joinpad')closeKeypad();return;}
  if(padHit(BTN.pause)){if(state==='menu')closeMenu();else if(state==='shop')startDay();else if(state==='joinpad')kpPress('>');else if(state==='title')(padFocus||defaultFocus())?.click();return;}
  if(padHit(BTN.prev)||padHit(BTN.next)){const d=padHit(BTN.next)?1:-1;
    if(state==='menu'){if(document.getElementById('ctlWrap')){const v=['kbm','xbox','ps'];pickCtl(v[(v.indexOf(ctlView)+d+3)%3]);}}
    else if(state==='shop'){nightTab=nightTab==='sum'?'shop':'sum';renderNight();setFocus(modalEl.querySelector('[data-tab].on'));blip(500,.04,'square',.03);}}
}
// re-rendered screens (the shop) keep the ring on the same button, or the one nearest where it was
function focusSnap(){
  if(!padFocus||!padFocus.isConnected)return null;const r=padFocus.getBoundingClientRect();
  const at=['data-up','data-buy','data-tab','data-cv','id'].find(a=>padFocus.hasAttribute(a));
  return{sel:at?`[${at}="${padFocus.getAttribute(at)}"]`:null,x:r.left+r.width/2,y:r.top+r.height/2};
}
// find the same button after the store re-renders (by what it buys), for a co-op player's own focus ring
function refocus(old){const at=['data-up','data-buy','data-tab'].find(a=>old.hasAttribute(a));if(!at)return null;
  const sel=`[${at}="${old.getAttribute(at)}"]`+(old.dataset.pl!=null?`[data-pl="${old.dataset.pl}"]`:'');const el=modalEl.querySelector(sel);
  if(el&&!el.disabled){el.classList.add('padfocus');if(old.classList.contains('pf1'))el.classList.add('pf1');return el;}return null;}
function focusRestore(f){
  if(!f)return;const it=navItems();let el=f.sel?navRoot().querySelector(f.sel):null;
  if(!el||!it.includes(el)){let bd=1e9;el=null;for(const b of it){const q=b.getBoundingClientRect(),d=Math.hypot(q.left+q.width/2-f.x,q.top+q.height/2-f.y);if(d<bd){bd=d;el=b;}}}
  setFocus(el);
}
// ---------- button glyphs for prompts: keycaps, Xbox letters or PlayStation shapes
const KB_GLY={gas:'W',brake:'S',steer:'A',steer2:'D',goals:'G',ls:'WASD',rs:'MOUSE',use:'E',tarp:'Q',rake:'R',honk:'SPACE',end:'N',pause:'ESC',back:'ESC',ok:'ENTER',start:'ENTER',low:'L-CLICK',high:'R-CLICK',prev:'WHEEL',next:'WHEEL'};
const PAD_GLY={gas:'rt',brake:'lt',steer:'ls',goals:'b',use:'a',ok:'a',honk:'b',back:'b',tarp:'x',end:'y',rake:'y',prev:'lb',next:'rb',tabL:'lb',tabR:'rb',low:'lt',high:'rt',pause:'menu',start:'menu',ls:'ls',rs:'rs'};
const PS_FACE={a:'<path d="M3.5 3.5l7 7M10.5 3.5l-7 7" stroke="#8ab4ff"/>',b:'<circle cx="7" cy="7" r="4" stroke="#ff7070"/>',x:'<rect x="3.2" y="3.2" width="7.6" height="7.6" stroke="#ff8fd6"/>',y:'<path d="M7 2.8l4.6 8H2.4z" stroke="#4fe0b0"/>'};
const PS_NAME={lb:'L1',rb:'R1',lt:'L2',rt:'R2',menu:'OPTIONS'};
const MENU_ICON='<svg width="11" height="9" viewBox="0 0 11 9"><path d="M0 1h11M0 4.5h11M0 8h11" stroke="#fff" stroke-width="2"/></svg>';
function glyphInner(a,st=glyphStyle()){
  if(st==='kbm'){if(a==='nozzles')return`1-${ATT.length} OR THE MOUSE WHEEL`;const t=KB_GLY[a];return t?`<i class="gb kb">${t}</i>`:'';}
  if(a==='nozzles')return glyphInner('prev',st)+' / '+glyphInner('next',st);
  const b=PAD_GLY[a];if(!b)return'';
  if(b==='ls'||b==='rs')return`<i class="gb stk">${b[0].toUpperCase()}</i>`;
  if(b.length===1)return st==='ps'?`<i class="gb face ps"><svg viewBox="0 0 14 14" fill="none" stroke-width="2">${PS_FACE[b]}</svg></i>`:`<i class="gb face x${b}">${b.toUpperCase()}</i>`;
  if(st==='ps')return`<i class="gb sh">${PS_NAME[b]}</i>`;
  return`<i class="gb sh">${b==='menu'?MENU_ICON:b.toUpperCase()}</i>`;
}
const G=a=>`<span data-k="${a}">${glyphInner(a)}</span>`;
function refreshGlyphs(){document.querySelectorAll('[data-k]').forEach(el=>{el.innerHTML=glyphInner(el.dataset.k);});for(const v of views)v.cache.hot=null;}
// ---------- the controls sheet's controller pages
let ctlView='kbm',ctlPicked=false;
const ctlSeg=()=>`<div class="seg">${G('tabL')}${[['kbm','KEYBOARD &amp; MOUSE'],['xbox','XBOX'],['ps','PLAYSTATION']].map(([v,n])=>`<button class="segb ${ctlView===v?'on':''}" data-cv="${v}">${n}</button>`).join('')}${G('tabR')}</div>`;
function pickCtl(v){ctlPicked=true;if(v!=='kbm'){padPrefs.style=v;savePadPrefs();refreshGlyphs();}showCtl(v);blip(600,.04,'square',.04);}
function showCtl(v){
  ctlView=v;const w=document.getElementById('ctlWrap');if(!w)return;
  const keep=padFocus&&w.contains(padFocus)?padFocus.id:null;
  w.innerHTML=controlsHTML(v);
  modalEl.querySelectorAll('[data-cv]').forEach(b=>b.classList.toggle('on',b.dataset.cv===v));
  const rb=document.getElementById('rumbleBtn');
  if(rb)rb.onclick=()=>{padPrefs.rumble=!padPrefs.rumble;savePadPrefs();if(padPrefs.rumble&&padObj)playRumble(padObj,.45,.6,220);else stopRumble();showCtl(ctlView);};
  if(keep)setFocus(document.getElementById(keep));
}
function controlsHTML(v){return v==='kbm'?kbmHTML():padHTML(v);}
// controller pages: the pad drawn in the middle, thin callout lines out to labels on either side
const PAD_OX=210,PAD_OY=58;
const PAD_SHELL={
  ps:'M150 22C110 22 82 20 62 26C40 32 26 46 20 68C12 96 6 130 10 158C13 178 30 190 46 186C60 183 70 170 80 154C90 140 104 132 120 132H180C196 132 210 140 220 154C230 170 240 183 254 186C270 190 287 178 290 158C294 130 288 96 280 68C274 46 260 32 238 26C218 20 190 22 150 22Z',
  xbox:'M150 28C122 26 96 22 72 28C50 34 34 46 26 66C16 92 8 128 12 156C15 176 32 188 50 182C64 177 74 162 86 148C96 138 110 136 126 136H174C190 136 204 138 214 148C226 162 236 177 250 182C268 188 285 176 288 156C292 128 284 92 274 66C266 46 250 34 228 28C204 22 178 26 150 28Z'};
// shoulder triggers and bumpers, behind the shell
const PAD_BACK={
  ps:[['M56 24C58 10 68 2 82 2C96 2 104 10 104 24Z','M244 24C242 10 232 2 218 2C204 2 196 10 196 24Z'],['M40 36C48 24 66 18 100 18L104 28C74 26 58 30 48 40Z','M260 36C252 24 234 18 200 18L196 28C226 26 242 30 252 40Z']],
  xbox:[['M58 28C60 14 70 4 84 4C98 4 106 12 106 26Z','M242 28C240 14 230 4 216 4C202 4 194 12 194 26Z'],['M36 44C44 30 62 20 102 20L106 30C76 28 58 34 46 48Z','M264 44C256 30 238 20 198 20L194 30C224 28 242 34 254 48Z']]};
// where each callout lands on the pad (pad-local coordinates), and how far out from that point the line stops
const PAD_TGT={
  ps:{low:[80,9],prev:[70,24],ls:[112,110,19],high:[220,9],next:[230,24],pause:[202,40,7],rake:[230,54,10],goals:[246,70,10],tarp:[214,70,10],use:[230,86,10],rs:[188,110,19]},
  xbox:{low:[82,11],prev:[68,27],ls:[78,72,19],high:[218,11],next:[232,27],pause:[170,72,6],rake:[222,56,10],goals:[238,72,10],tarp:[206,72,10],use:[222,88,10],rs:[186,112,19]}};
const PAD_FACE={ps:[230,70],xbox:[222,72]};
const PAD_LBL={goals:['GOALS','r','IN THE TRUCK: HONK'],low:['LOW SPEED','b','IN THE TRUCK: BRAKE / REVERSE'],prev:['PREV NOZZLE','p'],ls:['MOVE','g','IN THE TRUCK: STEER'],high:['HIGH SPEED','r','IN THE TRUCK: GAS'],next:['NEXT NOZZLE','p'],tarp:['TARP','o'],rake:['RAKE','y'],use:['USE','b'],rs:['AIM','w','TURN TO FACE'],pause:['PAUSE','w']};
const PAD_ROWS={ps:{L:[['low',56],['prev',92],['ls',176]],R:[['pause',12],['high',34],['next',62],['rake',88],['goals',114],['tarp',146],['use',172],['rs',212]]},
  xbox:{L:[['low',56],['prev',92],['ls',136]],R:[['pause',12],['high',34],['next',62],['rake',88],['goals',114],['tarp',146],['use',172],['rs',212]]}};
const FACE_COL={a:'#4bc26a',b:'#fe5f55',x:'#009dff',y:'#ffcf4a'};
// a button glyph drawn in SVG for the callout labels: [markup, width]
function svgGlyph(a,st,cx,cy){
  const b=PAD_GLY[a],ps=st==='ps';
  if(b==='ls'||b==='rs')return[`<circle cx="${cx}" cy="${cy}" r="8" fill="#1d2326" stroke="#9fb5b8" stroke-width="1.5"/><text x="${cx}" y="${cy+3.5}" class="ptx">${b[0].toUpperCase()}</text>`,16];
  if(b.length===1)return[ps?`<circle cx="${cx}" cy="${cy}" r="8.5" fill="#1d2326"/><g transform="translate(${cx-7} ${cy-7})" fill="none" stroke-width="2">${PS_FACE[b]}</g>`
    :`<circle cx="${cx}" cy="${cy}" r="8.5" fill="${FACE_COL[b]}"/><text x="${cx}" y="${cy+3.5}" class="ptx">${b.toUpperCase()}</text>`,17];
  if(b==='menu'&&!ps)return[`<rect x="${cx-11}" y="${cy-7}" width="22" height="14" rx="4" fill="#1d2326" stroke="#9fb5b8"/><path d="M${cx-5} ${cy-3}h10M${cx-5} ${cy}h10M${cx-5} ${cy+3}h10" stroke="#fff" stroke-width="1.5"/>`,22];
  const t=ps?PS_NAME[b]:b.toUpperCase(),w=t.length*7+10;
  return[`<rect x="${cx-w/2}" y="${cy-7}" width="${w}" height="14" rx="4" fill="#1d2326" stroke="#9fb5b8"/><text x="${cx}" y="${cy+3.5}" class="ptx">${t}</text>`,w];
}
const glyphW=(a,st)=>svgGlyph(a,st,0,0)[1];
function padSVG(st){
  const ps=st==='ps',T=PAD_TGT[st],[fx,fy]=PAD_FACE[st],well='#1b2023',cap='#3b454a';
  const back=PAD_BACK[st],trig=back[0].map((d,i)=>`<path class="${i?'trR':'trL'}" d="${d}" fill="#464f54" stroke="#161e20" stroke-width="2"/>`).join('')
    +back[1].map(d=>`<path d="${d}" fill="#59646a" stroke="#161e20" stroke-width="2"/>`).join('');
  const stick=(x,y,cls)=>`<circle cx="${x}" cy="${y}" r="19" fill="${well}"/><g class="${cls}"><circle cx="${x}" cy="${y}" r="14" fill="${cap}" stroke="#161e20" stroke-width="1.5"/><circle cx="${x}" cy="${y}" r="9.5" fill="none" stroke="#2c3438" stroke-width="2"/></g>`;
  const face=`<circle cx="${fx}" cy="${fy}" r="25" fill="#20262a"/>`+[['y',0,-16],['x',-16,0],['b',16,0],['a',0,16]].map(([k,dx,dy])=>{
    const x=fx+dx,y=fy+dy,cls=k==='a'?'fpA':k==='x'?'fpX':'';
    const mark=ps?`<g transform="translate(${x-7} ${y-7})" fill="none" stroke-width="2">${PS_FACE[k]}</g>`:`<text x="${x}" y="${y+3.5}" class="ptx" style="fill:${FACE_COL[k]}">${k.toUpperCase()}</text>`;
    return`<g class="${cls}"><circle cx="${x}" cy="${y}" r="9" fill="#343e43" stroke="#161e20" stroke-width="1.5"/>${mark}</g>`;}).join('');
  const parts=ps
    ?`<rect x="110" y="26" width="80" height="48" rx="7" fill="${well}" stroke="#3c474c" stroke-width="1.5"/>
      <circle cx="70" cy="70" r="23" fill="#20262a"/>${[0,90,180,270].map(r=>`<path d="M64 50h12v11l-6 7l-6-7z" fill="${cap}" stroke="#161e20" stroke-width="1.2" transform="rotate(${r} 70 70)"/>`).join('')}
      <rect x="95" y="34" width="6" height="12" rx="3" fill="#59646a"/><rect x="199" y="34" width="6" height="12" rx="3" fill="#2a3033"/>
      ${[144,148,152,156].map(x=>`<circle cx="${x}" cy="90" r="1" fill="#161e20"/>`).join('')}<circle cx="150" cy="106" r="6" fill="${well}" stroke="#8d969d" stroke-width="1.5"/>
      ${stick(112,110,'stkL')}${stick(188,110,'stkR')}`
    :`<circle cx="150" cy="46" r="10" fill="${cap}" stroke="#8fa3a8" stroke-width="1.5"/><circle cx="150" cy="46" r="6" fill="none" stroke="#cfe3e6" stroke-width="1.5"/><path d="M147 43l6 6M153 43l-6 6" stroke="#cfe3e6" stroke-width="1.5"/>
      <rect x="125" y="69" width="10" height="7" rx="3" fill="#59646a"/><rect x="165" y="69" width="10" height="7" rx="3" fill="#cfe3e6"/><rect x="146" y="86" width="8" height="5" rx="2" fill="#59646a"/>
      <circle cx="114" cy="112" r="18" fill="#20262a"/><path d="M108 98h12v8h8v12h-8v8h-12v-8h-8v-12h8z" fill="${cap}" stroke="#161e20" stroke-width="1.2"/>
      ${stick(78,72,'stkL')}${stick(186,112,'stkR')}`;
  // callouts: label, glyph, then a line that runs level and bends in to its button
  let lines='',dots='',labels='';
  for(const side of ['L','R'])for(const [a,y] of PAD_ROWS[st][side]){
    const [tx,ty,rr=0]=T[a],cx=PAD_OX+tx,cy=PAD_OY+ty,L=side==='L',sx=L?196:524,w=glyphW(a,st),bx=L?sx-4-w/2:sx+4+w/2;
    const ex=a==='pause'?cx:L?Math.max(sx+6,cx-30):Math.min(sx-6,cx+30),dl=Math.hypot(ex-cx,y-cy)||1,gx=cx+(ex-cx)/dl*rr,gy=cy+(y-cy)/dl*rr;
    const pts=`${sx},${y} ${ex},${y} ${gx.toFixed(1)},${gy.toFixed(1)}`;lines+=`<polyline class="cline o" points="${pts}"/><polyline class="cline" points="${pts}"/>`;
    dots+=`<circle cx="${gx.toFixed(1)}" cy="${gy.toFixed(1)}" r="2.2" fill="#fff" stroke="#161e20" stroke-width=".8"/>`;
    const [lbl,cls,sub]=PAD_LBL[a],tx2=L?bx-w/2-7:bx+w/2+7,anc=L?'end':'start';
    labels+=svgGlyph(a,st,bx,y)[0]+`<text x="${tx2}" y="${y+4}" class="clab ${cls}" text-anchor="${anc}">${lbl}</text>`+(sub?`<text x="${tx2}" y="${y+16}" class="csub" text-anchor="${anc}">${sub}</text>`:'');
  }
  const shell=PAD_SHELL[st];
  return`<svg class="padsvg" viewBox="0 0 720 256" width="720" height="256">
    <g transform="translate(${PAD_OX} ${PAD_OY})">${trig}<path d="${shell}" fill="rgba(0,0,0,.3)" transform="translate(0 6)"/><path d="${shell}" fill="${ps?'#e4e7eb':'#2c3437'}" stroke="${ps?'#8d969d':'#4d5a5f'}" stroke-width="2"/></g>
    ${lines}<g transform="translate(${PAD_OX} ${PAD_OY})">${parts}${face}</g>${dots}${labels}</svg>`;
}
function padHTML(st){
  const conn=anyPad();
  return`<div class="ctl"><div class="ctlbox wide"><div class="ctlhead">${st==='ps'?'PLAYSTATION':'XBOX'} CONTROLLER</div>
    ${padSVG(st)}
    <div class="pfoot"><button class="segb ${padPrefs.rumble?'on':''}" id="rumbleBtn">VIBRATION ${padPrefs.rumble?'ON':'OFF'}</button><span class="pstat ${conn?'on':''}">${conn?'CONTROLLER CONNECTED':'NO CONTROLLER YET &middot; CONNECT ONE AND PRESS A BUTTON'}</span></div>
  </div></div>`;
}
// ---------- vibration
function playRumble(g,st,wk,ms,lt=0,rt=0){
  try{const va=g.vibrationActuator;
    if(va&&va.playEffect){const trig=(lt||rt)&&va.effects&&va.effects.includes('trigger-rumble');
      va.playEffect(trig?'trigger-rumble':'dual-rumble',{duration:ms,startDelay:0,strongMagnitude:clamp(st,0,1),weakMagnitude:clamp(wk,0,1),leftTrigger:clamp(lt,0,1),rightTrigger:clamp(rt,0,1)}).catch(()=>{});}
    else if(g.hapticActuators&&g.hapticActuators[0])g.hapticActuators[0].pulse(clamp(Math.max(st,wk),0,1),ms);
  }catch(e){}
}
function stopRumble(){const r=pad.r;r.on=false;r.key='';r.until=0;try{const va=padObj&&padObj.vibrationActuator;if(va&&va.reset)va.reset().catch(()=>{});}catch(e){}}
// a one-off jolt: crashes, broken pots, pickups
function rumble(st,wk,ms){if(!padObj||!padPrefs.rumble||inputMode!=='pad')return;playRumble(padObj,st,wk,ms);const r=pad.r;r.until=performance.now()+ms;r.on=true;r.key='';}
// a steady hum under the running blower (in the triggers too, where supported) and the moving truck
function updateRumble(){for(const pl of players)withPl(pl,rumbleOne);}
// a steady hum under each player's running blower (in the triggers too, where supported) and the moving truck
function rumbleOne(){
  const r=pad.r;
  if(!padObj||!padPrefs.rumble||inputMode!=='pad'||state!=='play'){if(r.on)stopRumble();return;}
  const now=performance.now();if(now<r.until)return;
  let st=0,wk=0,lt=0,rt=0;
  if(power>.02){wk=.05+Math.min(1,power)*.07;if(power>1)st=(power-1)*.14;if(mode===1)lt=.1+power*.12;if(mode===2)rt=.12+(power-1)*.3;}
  const sp=driving||cur.riding?Math.abs(TR.v)/160:0;if(sp>.03){st=Math.max(st,.03+sp*.1);wk=Math.max(wk,.02+sp*.05);}
  if(st+wk+lt+rt<.01){if(r.on)stopRumble();return;}
  const key=[st,wk,lt,rt].map(v=>v.toFixed(2)).join();
  if(key!==r.key||now-r.t>110){r.key=key;r.t=now;r.on=true;playRumble(padObj,st,wk,180,lt,rt);}
}
let toastT=0;
function padToast(txt){const el=document.getElementById('padToast');el.textContent=txt;el.classList.add('on');clearTimeout(toastT);toastT=setTimeout(()=>el.classList.remove('on'),2600);}
addEventListener('gamepadconnected',e=>{padDetected=detectStyle(e.gamepad.id);padToast((padDetected==='ps'?'PLAYSTATION':'XBOX')+' CONTROLLER CONNECTED');if(state==='menu')showCtl(ctlView);});
addEventListener('gamepaddisconnected',()=>{setTimeout(()=>{
  if(!anyPad()){padToast('CONTROLLER DISCONNECTED');if(inputMode==='pad'&&state==='play')openMenu();setInputMode('kbm');}
  if(state==='menu')showCtl(ctlView);},0);});
