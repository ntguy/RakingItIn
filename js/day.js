'use strict';
// ============================================================ day cycle + night screens
const newToday=()=>({coop:players.length>1,pot:0,goalEarn:0,goals:0,stolen:0,stealEarn:0,h90:0,houseEarn:0,hauled:0,bundles:0,houses:0,complaints:0,damage:0,pots:0,potDamage:0,crashes:0,damageRep:0,lateHigh:0,tickets:0,ticketCost:0,mailSent:false,copSent:false,vanSent:false,vanHour:7+rnd()*4,courierHits:0,pkgReturns:0,copHour:9.5+rnd()*9,carHour:DAY_START+.4+rnd()*.8,startMoney:money});
function resetDay(){
  N=0;for(const L of ALL_LOTS)L.potsBroken=0;
  for(const p of POTS){p.broken=false;p.stress=0;p.wob=0;p.touch=false;}
  for(const n of NETS){n.x=n.hx;n.y=n.hy;n.a=n.ha;n.held=false;n.n=0;}heldNet=null;ripples.length=0;
  clearVisitors();traffic.length=0;officers.length=0;envelopes.length=0;pendingTraffic.length=0;for(const o of couriers)if(o.bub)o.bub.el.remove();couriers.length=0;packages.length=0;squirrels.length=0;birds.length=0;truckTicket=false;for(const m of MAILBOXES)m.flag=false;
  for(const L of LOTS){L.done=false;L.hauled=0;L.paidAmt=0;L.paidPct=0;spawnLot(L);}
  for(const t of TREES){t.timer=rnd()*2;}
  tarps.length=0;truckBundles.length=0;bed=Array.from({length:spareMax()},()=>1);hour=DAY_START;
  today=newToday();roadLeaves=0;roadT=0;repShown=null;carryPkg=null;
  for(const p of peds)if(p.bub)p.bub.el.remove();peds.length=0;spawnCameo();
  TR.v=0;TR.steer=0;
  for(const pl of players)withPl(pl,()=>{bundle=null;tarpsUsed=0;battery=capacity();swapT=0;tieT=0;driving=false;cur.riding=false;heldNet=null;carryPkg=null;
    cur.raking=false;cur.rakeN=0;Object.assign(cur.rake,{eff:RAKE_REACH,prev:null,drop:null,contact:0,load:0});
    const [x,y]=fromTruck(SPAWN_AT-pl.i*14,-(TRUCK_HW+8));P.x=x;P.y=y;P.vx=P.vy=0;collidePlayer();
    const v=pl.view||views[0];pl.cam.x=clamp(P.x-v.w/2,0,WORLD_W-v.w);pl.cam.y=clamp(P.y-v.h/2,0,H-v.h);});
  camX=players[0].cam.x;camY=players[0].cam.y;
  statsCache=null;statsT=1;for(const v of views)v.cache.hot=null;
  goalsDayStart();
}
const menuBtn=document.getElementById('menuBtn');
menuBtn.addEventListener('mousedown',e=>e.stopPropagation());
menuBtn.addEventListener('click',e=>{e.stopPropagation();openMenu();});
// the controls, drawn as keys and a mouse. Shared by the pause menu and the first-play screen
function kbmHTML(){
  const k=(c,t,cls='',anim)=>`<i class="key ${cls}${anim!=null?' kanim" style="animation-delay:'+anim+'s':''}">${t}</i>`;
  const sk=(t,cls='')=>`<i class="key sm ${cls}">${t}</i>`;
  return `<div class="ctl">
    <div class="ctlbox"><div class="ctlhead">KEYBOARD</div>
      <div class="kbd">
        <div class="krow">
          <div class="kc"><span class="klab o">TARP</span>${k('Q','Q','o')}</div>
          <div class="kc"><span class="klab">&nbsp;</span>${k('W','W','g',0)}</div>
          <div class="kc"><span class="klab b">USE</span>${k('E','E','b')}</div>
          <div class="kc"><span class="klab y">RAKE</span>${k('R','R','y')}</div>
        </div>
        <div class="krow home">${k('A','A','g',.6)}${k('S','S','g',1.2)}${k('D','D','g',1.8)}<i class="key" style="visibility:hidden"></i><div class="kc"><span class="klab r">GOALS</span>${k('G','G')}</div></div>
        <div class="klab g">MOVE<small>IN THE TRUCK: W GAS &middot; S BRAKE</small></div>
      </div>
      <div class="krow" style="gap:4px;margin-top:4px">${[1,2,3,4,5,6].map(n=>sk(n,'p')).join('')}</div>
      <div class="klab p" style="margin-top:-6px">NOZZLES</div>
    </div>
    <div class="ctlbox"><div class="ctlhead">MOUSE</div>
      <div class="mwrap">
        <div class="lft"><div class="klab b">LEFT CLICK<small>LOW SPEED</small></div><div class="klab y" style="margin-top:16px">WHEEL<small>SWAP NOZZLE</small></div></div>
        <div class="mgrid"><div class="mcord"></div><div class="mouse"><div class="mb l"></div><div class="mb r"></div><div class="mw"></div></div></div>
        <div class="rgt"><div class="klab r">RIGHT CLICK<small>HIGH SPEED</small></div><div class="klab" style="margin-top:16px;color:#fff">MOVE<small>AIM THE BLOWER</small></div></div>
      </div>
    </div>
  </div>`;
}
let menuFirst=false;
let menuOwner=null;
function openMenu(first,owner){
  if(state!=='play')return;
  menuOwner=owner||players[0];return withPl(menuOwner,()=>openMenuAs(first));
}
// the pause menu has three pages: the main list, the controls sheet and settings (the first-play screen is just the controls)
let menuPage='main';
function openMenuAs(first){
  state='menu';menuFirst=!!first;dropInputs();for(const k in keys)keys[k]=false;document.body.style.cursor='default';
  ctlView=inputMode==='pad'?padStyle():'kbm';ctlPicked=false;menuPage='main';
  if(NET.role==='guest')NET.localMenu=true;
  renderMenuAs();
}
const renderMenu=()=>withPl(menuOwner,renderMenuAs);
function menuGo(page){const from=menuPage;menuPage=page;renderMenu();blip(560,.04,'square',.04);
  if(page==='main'&&inputMode==='pad'){const b=document.getElementById(from==='controls'?'mCtl':from==='settings'?'mSet':'mResume');if(b)setFocus(b);}}
// Escape / B: back to the main list, or out of the menu from there
function menuBack(){if(menuFirst||menuPage==='main')closeMenu();else menuGo('main');}
function volRow(k,label,note){const v=Math.round(settings[k]*100);
  return`<div class="setrow"><span class="setlab">${label}${note?`<small>${note}</small>`:''}</span><button class="btn small" data-vol="${k}" data-d="-1">&minus;</button>
    <input type="range" min="0" max="100" step="5" value="${v}" data-vr="${k}"><button class="btn small" data-vol="${k}" data-d="1">+</button><b class="setval" id="vv_${k}">${v}%</b></div>`;}
function renderMenuAs(){
  const first=menuFirst,guest=NET.role==='guest',back=`<div class="btns"><button class="btn" id="mBack">BACK ${G('back')}</button></div>`;
  let html;
  if(first)html=`<h2>HOW TO PLAY</h2><div class="goal">GET LEAVES INTO THE <span style="color:var(--green)">MULCH BEDS</span> AND OUT OF <span style="color:var(--red)">FANCY AREAS</span>.<br>DON'T BREAK ANYTHING! KNOCK ON THE FRONT DOOR TO GET PAID.</div>
    ${ctlSeg()}<div id="ctlWrap"></div><div class="btns"><button class="btn green bounce" id="mResume">GOT IT! ${G('ok')}</button></div>`;
  else if(menuPage==='controls')html=`<h2>CONTROLS</h2>${ctlSeg()}<div id="ctlWrap"></div>${back}`;
  else if(menuPage==='settings')html=`<h2>SETTINGS</h2><div class="setlist">${volRow('music','MUSIC','NO MUSIC YET')}${volRow('sfx','SOUND EFFECTS')}
    ${guest?'':'<button class="btn gold" id="mCheat">DEV CHEAT: +1K$</button>'}<button class="btn" id="mPerf">PERFORMANCE OVERLAY: ${PERF.on?'ON':'OFF'} (F3)</button></div>${back}`;
  else if(TUT.on)html=`<h2>PAUSED</h2><div class="sub">TUTORIAL</div><div class="mlist">
    <button class="btn green" id="mResume">RESUME ${G('back')}</button><button class="btn" id="mCtl">CONTROLS</button>
    <button class="btn" id="mSet">SETTINGS</button><button class="btn red" id="mExitTut">EXIT TUTORIAL</button></div>`;
  else html=`<h2>PAUSED</h2><div class="sub">DAY ${day} &middot; ${fmtHour(hour)}</div><div class="mlist">
    <button class="btn green" id="mResume">RESUME ${G('back')}</button>
    <button class="btn" id="mCtl">CONTROLS</button>
    <button class="btn" id="mSet">SETTINGS</button>
    ${guest?'':'<button class="btn" id="mNet">HOST ONLINE</button><div class="netbox" id="netBox"></div>'}
    ${players.length<2&&!NET.role?'<button class="btn gold" id="mAdd">LOCAL SPLITSCREEN</button>':''}
    ${cur!==players[0]&&!guest?'<button class="btn gold" id="mLeave">LEAVE GAME</button>':''}
    ${guest?'<button class="btn red" id="mNetLeave">LEAVE ONLINE GAME</button>':'<button class="btn red" id="mEnd">END THE DAY</button>'}</div>`;
  modalEl.innerHTML=`<div class="panel pause">${html}</div>`;
  modalEl.classList.remove('hide');
  const on=(id,fn)=>{const b=document.getElementById(id);if(b)b.onclick=fn;};
  if(document.getElementById('ctlWrap')){modalEl.querySelectorAll('[data-cv]').forEach(b=>b.onclick=()=>pickCtl(b.dataset.cv));showCtl(ctlView);}
  on('mResume',closeMenu);on('mExitTut',exitTutorial);on('mBack',()=>menuGo('main'));on('mCtl',()=>menuGo('controls'));on('mSet',()=>menuGo('settings'));
  on('mEnd',()=>{modalEl.classList.add('hide');state='play';endDay();});on('mNetLeave',guestLeave);
  on('mAdd',()=>{modalEl.classList.add('hide');state='play';document.body.style.cursor='none';joinPlayer({t:'wait'});});
  {const who=cur;on('mLeave',()=>{modalEl.classList.add('hide');state='play';leavePlayer(who);});}
  {const who=cur;on('mCheat',()=>{withPl(who,()=>{money+=1000;});chaChing();});}
  on('mPerf',()=>{perfSet(!PERF.on);renderMenu();});
  const setVol=(k,v)=>{settings[k]=clamp(Math.round(v*20)/20,0,1);saveSettings();applyVolumes();const r=modalEl.querySelector(`[data-vr="${k}"]`);if(r)r.value=Math.round(settings[k]*100);
    const t=document.getElementById('vv_'+k);if(t)t.textContent=Math.round(settings[k]*100)+'%';};
  modalEl.querySelectorAll('[data-vol]').forEach(b=>b.onclick=()=>{const k=b.dataset.vol;setVol(k,settings[k]+.1*b.dataset.d);if(k==='sfx')blip(660,.05,'square',.05);});
  modalEl.querySelectorAll('[data-vr]').forEach(r=>{r.oninput=()=>setVol(r.dataset.vr,r.value/100);if(r.dataset.vr==='sfx')r.onchange=()=>blip(660,.05,'square',.05);});
  refreshMenuNet();
}
function closeMenu(){if(state!=='menu')return;menuPage='main';NET.localMenu=false;modalEl.classList.add('hide');state='play';document.body.style.cursor='none';}
function endDay(){
  if(state!=='play'||TUT.on)return;
  state='shop';storePl();for(const pl of players)withPl(pl,()=>{dropInputs();driving=false;cur.riding=false;});document.body.style.cursor='default';
  goalsDayEnd();
  // co-op: the day's pot is split down the middle (a loss comes out of both banks, never below zero)
  if(today.coop){const half=Math.round(today.pot/2),sh=[half,today.pot-half];today.shares=sh;
    players.forEach((pl,i)=>withPl(pl,()=>{money=Math.max(0,money+sh[i]);}));if(players.length<2&&p2Profile)p2Profile.money=Math.max(0,p2Profile.money+sh[1]);}
  daySummary=LOTS.map(L=>{const s=lotStats(L);return{name:L.name,tag:L.tag,k:L.k,s:L.style,done:L.done,paid:L.paidAmt,pct:L.done?L.paidPct:s.pct,hauled:L.hauled,rep:L.done?repForPct(L.paidPct):0};});
  scoreRep();
  blip(523,.15,'triangle',.06);setTimeout(()=>blip(392,.15,'triangle',.06),150);setTimeout(()=>blip(262,.3,'triangle',.06),300);
  nightTab='sum';renderNight();modalEl.classList.remove('hide');
}
// today's reputation so far. Live in the HUD (leaves in the road are recounted once a second), and final at day end
let roadLeaves=0,roadT=0;
function countRoadLeaves(){let n=0;for(let i=0;i<N;i++){if(ST[i]!==0||LZ[i]>1)continue;const x=LX[i]|0,y=LY[i]|0;if(x>=0&&y>=0&&x<WORLD_W&&y<H&&REG[y*WORLD_W+x]===1)n++;}return n;}
function repTally(){
  const done=LOTS.filter(L=>L.done),hr=done.map(L=>repForPct(L.paidPct)),astray=packages.filter(k=>k.far&&k.moved).length;
  const r={houses:hr.reduce((a,v)=>a+v,0),houseN:hr.filter(v=>v>0).length,
    damage:-today.damageRep,damageN:today.crashes+today.pots,
    peds:-today.complaints*REP_PED,pedN:today.complaints,
    road:-Math.min(REP_ROAD_CAP,Math.floor(roadLeaves/REP_ROAD_PER)),roadN:roadLeaves,
    late:-Math.round(today.lateHigh*REP_LATE_PER_SEC),lateSec:today.lateHigh,
    tickets:-today.tickets*REP_TICKET,ticketN:today.tickets,
    courier:-today.courierHits*REP_COURIER,courierN:today.courierHits,
    pkgBack:today.pkgReturns*REP_PKG_RETURN,pkgBackN:today.pkgReturns,
    pkg:-astray*REP_PACKAGE,pkgN:astray,
    steal:-(today.stolen||0)*REP_STEAL,stealN:today.stolen||0};
  r.total=r.houses+r.damage+r.peds+r.road+r.late+r.tickets+r.courier+r.pkgBack+r.pkg+r.steal;
  return r;
}
function scoreRep(){
  roadLeaves=countRoadLeaves();const r=repTally();
  r.before=rep;rep+=r.total;today.rep=r;
}
function statBars(a){
  const rows=[['REACH',a.range/1.5],['WIDTH',a.coneLo/60],['POWER',a.force/2.2],['LIFT',a.lift/1.7],['BATTERY',(1/a.drain)/1.9]];
  return `<div class="stats">${rows.map(([n,v])=>`<span>${n}</span><div class="sbar"><i style="width:${Math.round(clamp(v,.05,1)*100)}%;background:${a.tip}"></i></div>`).join('')}</div>`;
}
function renderNight(){
  storePl();const fs=focusSnap(),scr={m:modalEl.scrollTop,c:[...modalEl.querySelectorAll('.shopcol')].map(e=>e.scrollTop)};
  const tabs=`<div class="tabs">${G('tabL')}<button class="tab ${nightTab==='sum'?'on':''}" data-tab="sum">DAY SUMMARY</button><button class="tab ${nightTab==='shop'?'on':''}" data-tab="shop">HARDWARE STORE</button>${G('tabR')}</div>`;
  let body='';
  if(nightTab==='sum'){
    // only what actually happened today: a chip per thing, nothing for zeros, houses you never touched left out
    const r=today.rep,sg=v=>(v>0?'+':'&minus;')+Math.abs(v),net=Math.round(today.coop?today.pot:players[0].money-today.startMoney);
    const chip=(ic,label,val,cls,i)=>`<div class="chip" style="animation-delay:${.25+i*.07}s">${pxIcon(ic)}<span class="cl">${label}</span>${val!=null?`<b class="${cls}">${val}</b>`:''}</div>`;
    const money$=[
      today.houseEarn&&['house',`${today.houses} PAID`,'+'+fmt$(today.houseEarn),'pos'],
      today.hauled&&['bag',`${today.hauled} HAULED`,null],
      today.damage&&['crash',today.crashes>1?`DENTS &times;${today.crashes}`:'DENT',fmt$(-today.damage),'neg'],
      today.potDamage&&['pot',today.pots>1?`POTS &times;${today.pots}`:'POT',fmt$(-today.potDamage),'neg'],
      today.ticketCost&&['ticket','TICKET',fmt$(-today.ticketCost),'neg'],
      today.goalEarn&&['flag',today.goals>1?`GOALS &times;${today.goals}`:'GOAL','+'+fmt$(today.goalEarn),'pos'],
      today.stealEarn&&['box',today.stolen>1?`STOLEN &times;${today.stolen}`:'STOLEN','+'+fmt$(today.stealEarn),'pos'],
    ].filter(Boolean);
    const x=n=>n>1?` &times;${n}`:'';
    const repC=[
      r.houses&&['house','HOUSES'+x(r.houseN),sg(r.houses),'pos'],
      r.pkgBack&&['box','PACKAGES'+x(r.pkgBackN),sg(r.pkgBack),'pos'],
      r.damage&&['crash','DAMAGE'+x(r.damageN),sg(r.damage),'neg'],
      r.peds&&['face','SCARED'+x(r.pedN),sg(r.peds),'neg'],
      r.road&&['road',`${r.roadN} IN ROAD`,sg(r.road),'neg'],
      r.late&&['moon','LATE NOISE',sg(r.late),'neg'],
      r.tickets&&['ticket','TICKET'+x(r.ticketN),sg(r.tickets),'neg'],
      r.courier&&['courier','COURIER'+x(r.courierN),sg(r.courier),'neg'],
      r.pkg&&['lostbox','LOST'+x(r.pkgN),sg(r.pkg),'neg'],
      r.steal&&['lostbox','STOLEN'+x(r.stealN),sg(r.steal),'neg'],
    ].filter(Boolean);
    // where reputation sits in its rank, and how far to the next one
    const lv=repLevel(rep),lv0=repLevel(r.before),lo=rep<0?-100:REP_LEVELS[lv],nxt=REP_LEVELS[lv+1],fill=v=>nxt!=null?clamp((v-lo)/(nxt-lo),0,1):1;
    // newly reached levels open up bigger houses
    const opened=lv>lv0?LOTS.filter(L=>L.level>lv0&&L.level<=lv):[];
    const worked=daySummary.filter(h=>h.done||h.pct>=.01);
    const tiles=worked.map((h,i)=>{const pct=Math.round(h.pct*100),col=pct>=90?'#4bc26a':pct>=70?'#ffcf4a':pct>=50?'#ff9800':'#fe5f55';
      return`<div class="htile ${h.done?'paid':''}" style="animation-delay:${.4+i*.08}s">${pxIcon(h.done?'house':'housegray',4+Math.round((h.s??h.k)/2.5))}
        <div class="hn">${h.name.replace(/^THE /,'')}</div>
        ${h.done?`<div class="hp"><span class="pos">${fmt$(h.paid)}</span>${h.rep?` <span class="gold">+${h.rep}&#9733;</span>`:''}</div>`:`<div class="hb"><i style="width:${pct}%;background:${col}"></i></div><div class="hp dim">${pct}%</div>`}</div>`;}).join('');
    body=`<div class="sum2">
      <div class="heroes">
        <div class="panel hero"><div class="big ${net>0?'gold':net<0?'neg':'gold'}"><span data-count="${net}" data-fmt="money">$0</span></div>
          <div class="small">${today.coop?`SPLIT ${fmt$(today.shares[0])} EACH &middot; BANKS ${fmt$(players[0].money)} / ${fmt$(players[1]?players[1].money:p2Profile?p2Profile.money:0)}`:`BANK ${fmt$(players[0].money)}`}</div>
          ${money$.length?`<div class="chips">${money$.map((c,i)=>chip(c[0],c[1],c[2],c[3],i)).join('')}</div>`:''}</div>
        <div class="panel hero"><div class="big ${r.total>0?'pos':r.total<0?'neg':'gold'}">${STAR_SVG}<span data-count="${r.total}" data-fmt="signed">0</span></div>
          ${lv>lv0?`<div class="lvup">LEVEL UP!</div>`:''}
          <div class="rankname">LEVEL ${lv} &middot; ${repRank(rep)}</div>
          <div class="rankbar"><i data-to="${(fill(rep)*100).toFixed(1)}" style="width:${(lv0===lv?fill(r.before)*100:0).toFixed(1)}%"></i></div>
          <div class="rankrow"><span>${rep}</span><span>${nxt!=null?nxt+' &middot; LEVEL '+(lv+1):'MAX LEVEL'}</span></div>
          ${opened.length?`<div class="chips">${opened.map((L,i)=>chip('house',L.name.replace(/^THE /,'')+' WILL HIRE YOU',null,'',i)).join('')}</div>`:''}
          ${repC.length?`<div class="chips">${repC.map((c,i)=>chip(c[0],c[1],c[2],c[3],i)).join('')}</div>`:''}</div>
      </div>
      ${tiles?`<div class="htiles">${tiles}</div>`:''}
    </div>`;
  }else{
    body=coop()?coopStore():withPl(players[0],()=>storeCards(null,Object.keys(UPG),true));
  }
  modalEl.innerHTML=`<div class="night">
    <div class="logo" style="font-size:40px">${[...'NIGHT '+day].map((c,i)=>c===' '?'<span style="width:.4em"></span>':`<span style="animation-delay:${-i*.18}s">${c}</span>`).join('')}</div>
    <div class="nighthead">${tabs}<button class="btn bounce" id="bDay">START DAY ${day+1} ${G('start')}</button></div><div class="tabbody">${body}</div></div>`;
  modalEl.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{nightTab=b.dataset.tab;renderNight();});
  const plOf=b=>players[+(b.dataset.pl||0)]||players[0];
  modalEl.querySelectorAll('[data-up]').forEach(b=>b.onclick=()=>buyUpgrade(plOf(b),b.dataset.up));
  modalEl.querySelectorAll('[data-buy]').forEach(b=>b.onclick=()=>{if(NET.role==='guest'){if(plOf(b)===players[1])netSend({t:'act',a:'buy',id:b.dataset.buy});return;}const a=ATT.find(x=>x.id===b.dataset.buy);let ok=false;withPl(plOf(b),()=>{if(!owned.includes(a.id)&&money>=a.price){money-=a.price;owned.push(a.id);equipped=a.id;ok=true;}});if(ok){chaChing();renderNight();}});
  document.getElementById('bDay').onclick=startDay;
  // put every scroll position back where it was, so buying something doesn't jump the page
  if(NET.role==='host')sendNight();
  modalEl.scrollTop=scr.m;modalEl.querySelectorAll('.shopcol').forEach((e,i)=>{if(scr.c[i]!=null)e.scrollTop=scr.c[i];});
  for(const pl of players)if(pl.nav&&pl.nav.focus&&!pl.nav.focus.isConnected)pl.nav.focus=refocus(pl.nav.focus);
  focusRestore(fs);
  if(nightTab==='sum')animateSummary();
}
// the store's cards for one player (pl=null on your own); ids picks which upgrades to show
function storeCards(pl,ids,withAtts){
  const da=pl?` data-pl="${pl.i}"`:'';
  const cards=ids.map(id=>{const u=UPG[id];
      const lvl=upg[id],maxed=lvl>=u.max,price=maxed?0:u.price(lvl),can=!maxed&&money>=price;
      return `<div class="ucard"><div class="t"><span>${u.name}</span><span class="ic" style="background:${u.col}">${u.ic}</span></div>
        <div class="d">${upDesc(u,lvl)}</div>
        <div class="pips">${Array.from({length:u.max},(_,i)=>`<i class="${i<lvl?'on':''}"></i>`).join('')}</div>
        <button class="btn small ${can?'green':''}" data-up="${id}"${da} ${can?'':'disabled'}>${maxed?'MAXED':'BUY '+fmt$(price)}</button></div>`;}).join('');
  if(!withAtts)return cards;
  const atts=ATT.map(a=>{const own=owned.includes(a.id),can=!own&&money>=a.price;
      const btn=own?'<button class="btn small" disabled>OWNED</button>':`<button class="btn small ${can?'green':''}" data-buy="${a.id}"${da} ${can?'':'disabled'}>BUY ${fmt$(a.price)}</button>`;
      return `<div class="ucard"><div class="t"><span>${a.name}</span><span class="ic" style="background:${a.tip}">${a.id==='fan'?'&lt;':a.id==='jet'?'!':a.id==='long'?'=':a.id==='vortex'?'@':a.id==='eco'?'%':a.id==='twin'?'&lt;&gt;':'o'}</span></div>
        <div class="d">${a.desc}</div>${statBars(a)}${btn}</div>`;}).join('');
  if(pl)return `<div class="sect">UPGRADES</div><div class="cards">${cards}</div><div class="sect">NOZZLES</div><div class="cards">${atts}</div>`;
  return `<div class="panel" style="text-align:center;margin-bottom:14px"><span class="label">BANK</span> <span style="font-size:22px;color:var(--gold);font-weight:700">${fmt$(money)}</span></div>
      <div class="sect">UPGRADES</div><div class="cards">${cards}</div>
      <div class="sect">BLOWER ATTACHMENTS &middot; SWAP ANYTIME WITH ${G('nozzles')}</div><div class="cards">${atts}</div>`;
}
// co-op store: one column per player. Each starts with a copy of the truck's upgrades, which the two of you share
// (either can pay, and buying one in either column buys it for both), then that player's own gear
function coopStore(){
  const shared=SHARED_UPG.filter(id=>UPG[id]),personal=Object.keys(UPG).filter(id=>!SHARED_UPG.includes(id));
  const col=pl=>withPl(pl,()=>`<div class="shopcol p${pl.i}"><div class="colhead"><span>PLAYER ${pl.i+1}</span><b>${fmt$(money)}</b></div>
    <div class="sect">SHARED UPGRADES</div><div class="shnote">FOR THE TRUCK: EITHER OF YOU CAN BUY THESE, AND THEY WORK FOR YOU BOTH</div>
    <div class="cards">${storeCards(pl,shared,false)}</div>${storeCards(pl,personal,true)}</div>`);
  return `<div class="shopcols">${players.map(col).join('')}</div>`;
}
function buyUpgrade(pl,id){
  if(NET.role==='guest'){if(pl===players[1])netSend({t:'act',a:'up',id});return;}
  const u=UPG[id];let ok=false;
  withPl(pl,()=>{const pr=u.price(upg[id]);if(upg[id]<u.max&&money>=pr){money-=pr;upg[id]++;ok=true;}});
  // truck upgrades apply to the whole crew
  if(ok&&SHARED_UPG.includes(id)){const lv=pl.upg[id];for(const o of players)if(o!==pl)withPl(o,()=>{upg[id]=lv;});if(p2Profile)p2Profile.upg[id]=lv;}
  if(ok){chaChing();renderNight();}
}
// numbers tick up from zero and the rank bar slides to where it's got to
function animateSummary(){
  const els=[...modalEl.querySelectorAll('[data-count]')],t0=performance.now(),T=900;
  const show=(el,v)=>{el.innerHTML=el.dataset.fmt==='money'?(v>0?'+':v<0?'&minus;':'')+fmt$(Math.abs(v)):(v>0?'+':v<0?'&minus;':'')+Math.abs(v);};
  const step=now=>{const k=Math.min(1,(now-t0)/T),e=1-Math.pow(1-k,3);for(const el of els)if(el.isConnected)show(el,Math.round(+el.dataset.count*e));if(k<1)requestAnimationFrame(step);};
  requestAnimationFrame(step);
  setTimeout(()=>modalEl.querySelectorAll('.rankbar i[data-to]').forEach(i=>i.style.width=i.dataset.to+'%'),250);
}
// tiny pixel icons for the summary chips and house tiles: rows of palette letters, '.' is empty
const STAR_ICON='<svg class="px" width="16" height="15" viewBox="0 0 11 10" style="display:inline-block;vertical-align:-2px"><path d="M5 0h1v1h1v2h4v1h-1v1H9v1H8v1h1v2h1v1H9v-1H8V8H7V7H4v1H3v1H2v1H1V9h1V7h1V6H2V5H1V4H0V3h4V1h1z" fill="#ffcf4a"/></svg>';
const STAR_SVG='<svg class="px" width="40" height="36" viewBox="0 0 11 10"><rect x="5" y="0" width="1" height="1" fill="#fff1b0"/><rect x="4" y="1" width="1" height="1" fill="#ffcf4a"/><rect x="5" y="1" width="1" height="1" fill="#fff1b0"/><rect x="6" y="1" width="1" height="1" fill="#ffcf4a"/><rect x="4" y="2" width="1" height="1" fill="#ffcf4a"/><rect x="5" y="2" width="1" height="1" fill="#fff1b0"/><rect x="6" y="2" width="1" height="1" fill="#ffcf4a"/><rect x="0" y="3" width="1" height="1" fill="#b9861a"/><rect x="1" y="3" width="1" height="1" fill="#fff1b0"/><rect x="2" y="3" width="1" height="1" fill="#fff1b0"/><rect x="3" y="3" width="1" height="1" fill="#fff1b0"/><rect x="4" y="3" width="1" height="1" fill="#fff1b0"/><rect x="5" y="3" width="1" height="1" fill="#ffcf4a"/><rect x="6" y="3" width="1" height="1" fill="#ffcf4a"/><rect x="7" y="3" width="1" height="1" fill="#ffcf4a"/><rect x="8" y="3" width="1" height="1" fill="#ffcf4a"/><rect x="9" y="3" width="1" height="1" fill="#ffcf4a"/><rect x="10" y="3" width="1" height="1" fill="#b9861a"/><rect x="1" y="4" width="1" height="1" fill="#b9861a"/><rect x="2" y="4" width="1" height="1" fill="#ffcf4a"/><rect x="3" y="4" width="1" height="1" fill="#ffcf4a"/><rect x="4" y="4" width="1" height="1" fill="#ffcf4a"/><rect x="5" y="4" width="1" height="1" fill="#ffcf4a"/><rect x="6" y="4" width="1" height="1" fill="#ffcf4a"/><rect x="7" y="4" width="1" height="1" fill="#ffcf4a"/><rect x="8" y="4" width="1" height="1" fill="#ffcf4a"/><rect x="9" y="4" width="1" height="1" fill="#b9861a"/><rect x="2" y="5" width="1" height="1" fill="#b9861a"/><rect x="3" y="5" width="1" height="1" fill="#ffcf4a"/><rect x="4" y="5" width="1" height="1" fill="#ffcf4a"/><rect x="5" y="5" width="1" height="1" fill="#ffcf4a"/><rect x="6" y="5" width="1" height="1" fill="#ffcf4a"/><rect x="7" y="5" width="1" height="1" fill="#ffcf4a"/><rect x="8" y="5" width="1" height="1" fill="#b9861a"/><rect x="3" y="6" width="1" height="1" fill="#ffcf4a"/><rect x="4" y="6" width="1" height="1" fill="#ffcf4a"/><rect x="5" y="6" width="1" height="1" fill="#b9861a"/><rect x="6" y="6" width="1" height="1" fill="#ffcf4a"/><rect x="7" y="6" width="1" height="1" fill="#ffcf4a"/><rect x="2" y="7" width="1" height="1" fill="#ffcf4a"/><rect x="3" y="7" width="1" height="1" fill="#ffcf4a"/><rect x="4" y="7" width="1" height="1" fill="#b9861a"/><rect x="6" y="7" width="1" height="1" fill="#b9861a"/><rect x="7" y="7" width="1" height="1" fill="#ffcf4a"/><rect x="8" y="7" width="1" height="1" fill="#ffcf4a"/><rect x="2" y="8" width="1" height="1" fill="#ffcf4a"/><rect x="3" y="8" width="1" height="1" fill="#b9861a"/><rect x="7" y="8" width="1" height="1" fill="#b9861a"/><rect x="8" y="8" width="1" height="1" fill="#ffcf4a"/><rect x="1" y="9" width="1" height="1" fill="#b9861a"/><rect x="2" y="9" width="1" height="1" fill="#b9861a"/><rect x="8" y="9" width="1" height="1" fill="#b9861a"/><rect x="9" y="9" width="1" height="1" fill="#b9861a"/></svg>';
const PX_PAL={h:'#f4f1e8',r:'#c9352b',w:'#e9e2cf',d:'#6b4428',o:'#ff9800',s:'#f2c29a',k:'#2a3033',y:'#ffcf4a',t:'#d9774a',g:'#4bc26a',f:'#ff5f8f',b:'#2a6fc9',l:'#d9ab72',n:'#b98a54',e:'#efe2c4',m:'#7f9396',x:'#fe5f55',u:'#3d474c',v:'#5b6f73'};
const PX_ICONS={
  house:['...r...','..rrr..','.rrrrr.','rrrrrrr','.wwwww.','.wwdww.','.wwdww.'],
  housegray:['...m...','..mmm..','.mmmmm.','mmmmmmm','.vvvvv.','.vvdvv.','.vvdvv.'],
  bag:['...y...','..ooo..','.bbbbb.','bbbbbbb','bbbbbbb','bbbbbbb','.bbbbb.'],
  crash:['...y...','.y.y.y.','..yxy..','yyxxxyy','..yxy..','.y.y.y.','...y...'],
  pot:['..f.f..','.ggfgg.','..ggg..','ttttttt','.ttttt.','.ttttt.','..ttt..'],
  ticket:['.......','wwwwwww','wxxxxxw','wkkkkww','wkkkwww','wwwwwww','.......'],
  face:['.sssss.','sksssks','sskskss','sssssss','sskkkss','sksssks','.sssss.'],
  road:['.......','...oo..','..ooo..','.ooo...','.......','kkkkkkk','kwkkwkk'],
  moon:['..yyy..','.yy....','yy.....','yy.....','yy.....','.yy....','..yyy..'],
  courier:['.bbbbb.','bbbbbbb','.sssss.','.skssk.','.sssss.','.skkks.','..sss..'],
  box:['.......','lllllll','nnnennn','nnnennn','nnnennn','nnnnnnn','.......'],
  lostbox:['x.....x','lxllxll','nnxexnn','nnnxnnn','nnxexnn','nxnnnxn','x.....x'],
  flag:['.k.....','.kyyy..','.kyyyyy','.kyyy..','.k.....','.k.....','kkk....'],
  blu:['.......','.....hh','h...hhk','.hhhhh.','.hbbhh.','.h..h..','.......'],
};
function pxIcon(name,sc=2){const g=PX_ICONS[name];let r='';g.forEach((row,y)=>[...row].forEach((c,x)=>{if(c!=='.')r+=`<rect x="${x}" y="${y}" width="1" height="1" fill="${PX_PAL[c]}"/>`;}));
  return`<svg class="px pxi" width="${7*sc}" height="${7*sc}" viewBox="0 0 7 7">${r}</svg>`;}
function startDay(){if(NET.role==='guest'){netSend({t:'act',a:'start'});return;}day++;resetDay();usePl(players[0]);save();modalEl.classList.add('hide');state='play';document.body.style.cursor='none';blip(660,.1,'square',.05);}
