'use strict';
// ============================================================ online play
// Peer to peer over WebRTC, with PeerJS's free public broker only used to find each other by a 6-digit code (so it
// works from a static page like GitHub Pages). The host's game is the real one: it runs everything and treats the
// friend as player 2 on a 'net' device. The guest sends its inputs and draws the world from the host's updates:
// everything small as a JSON snapshot 20 times a second, and leaves as a compact binary list of the ones near the
// guest's view that changed. Floating text, speech bubbles and sounds are forwarded as events.
const NET={role:null,peer:null,conn:null,code:'',ready:false,acc:0,ev:[],in:{mx:0,my:0,th:0,ax:1,ay:0,lo:0,hi:0,cam:null},evOut:[],
  localMenu:false,hostPaused:false,repT:0,ls:null,lsT:0,nid:1,objs:new Map(),visKey:'',status:''};
const NET_PREFIX='rakingitin-v1-',PEER_JS='https://cdnjs.cloudflare.com/ajax/libs/peerjs/1.5.4/peerjs.min.js';
// How the two browsers reach each other. STUN finds a direct route, which works between most home networks. When
// one side is behind a strict router (mobile hotspots, offices, some ISPs) the game data has to go through a TURN
// relay instead, and PeerJS's free public relays no longer exist. To get those players connected, make a free TURN
// account and either set TURN_URL to a credentials URL that returns a list of ICE servers (Metered's looks like
// https://<app>.metered.live/api/v1/turn/credentials?apiKey=<key>) or put the servers in TURN_SERVERS
const TURN_URL='',TURN_SERVERS=[];
const STUN_SERVERS=[{urls:['stun:stun.l.google.com:19302','stun:stun1.l.google.com:19302','stun:stun2.l.google.com:19302']},{urls:'stun:stun.cloudflare.com:3478'}];
const JOIN_TIMEOUT=15000;
async function iceConfig(){
  let turn=TURN_SERVERS.slice();
  if(TURN_URL)try{const r=await fetch(TURN_URL),j=await r.json();if(Array.isArray(j))turn=turn.concat(j);else if(j&&Array.isArray(j.iceServers))turn=turn.concat(j.iceServers);}catch(e){}
  return{iceServers:STUN_SERVERS.concat(turn)};
}
const NO_ROUTE="COULDN'T CONNECT. ONE OF YOUR NETWORKS BLOCKS DIRECT CONNECTIONS AND THE GAME HAS NO RELAY SET UP";
function loadPeer(){return window.Peer?Promise.resolve():new Promise((res,rej)=>{const sc=document.createElement('script');sc.src=PEER_JS;sc.onload=res;sc.onerror=()=>rej(new Error('load'));document.head.appendChild(sc);});}
const netSend=m=>{const c=NET.conn;if(c&&c.open)try{c.send(m);}catch(e){}};
// the online part of the host's pause menu: start, the code to share, and stop
// the pause menu's HOST ONLINE / STOP ONLINE button, and the code (or an error) under it
function refreshMenuNet(){
  const b=document.getElementById('mNet'),el=document.getElementById('netBox'),host=NET.role==='host',show=host||players.length<2;
  if(b){b.style.display=show?'':'none';b.innerHTML=host?'STOP ONLINE':'HOST ONLINE';b.onclick=host?stopHost:startHost;}
  if(el){el.style.display=show&&(host||NET.status)?'':'none';el.innerHTML=host?`<span>ONLINE CODE</span><b>${NET.code||'......'}</b><span>${NET.status}</span>`:`<span>${NET.status}</span>`;}
  const ad=document.getElementById('mAdd');if(ad)ad.style.display=NET.role?'none':'';
}
function netBadge(txt){const el=$('netBadge');el.textContent=txt||'';el.style.display=txt?'block':'none';}
// ---------- hosting
async function startHost(){
  if(NET.role)return;NET.role='host';NET.status='STARTING...';refreshMenuNet();
  let config;try{await loadPeer();config=await iceConfig();}catch(e){NET.role=null;NET.status='COULD NOT REACH THE ONLINE SERVICE';refreshMenuNet();return;}
  if(NET.role!=='host')return;
  const tryCode=()=>{NET.code=String(100000+Math.floor(Math.random()*900000));const pr=new Peer(NET_PREFIX+NET.code,{config});NET.peer=pr;
    pr.on('open',()=>{NET.status='WAITING FOR A FRIEND';refreshMenuNet();netBadge('ONLINE · '+NET.code);});
    pr.on('error',e=>{if(e.type==='unavailable-id'){pr.destroy();tryCode();}else{NET.status='ONLINE ERROR: '+String(e.type||e).toUpperCase();refreshMenuNet();}});
    // lost touch with the matchmaking service (a network blip): get back on it so friends can still find the code
    pr.on('disconnected',()=>{if(NET.peer===pr&&!pr.destroyed)setTimeout(()=>{try{if(!pr.destroyed)pr.reconnect();}catch(e){}},1000);});
    pr.on('connection',c=>{
      if(NET.conn&&NET.conn.open){c.on('open',()=>{c.send({t:'full'});setTimeout(()=>c.close(),300);});return;}
      NET.conn=c;NET.status='A FRIEND IS CONNECTING...';refreshMenuNet();
      c.on('open',()=>netSend({t:'h',yards:YARDS}));
      // a join that never gets through: free the slot and say why
      setTimeout(()=>{if(NET.conn===c&&!c.open){NET.conn=null;try{c.close();}catch(e){}NET.status="A FRIEND COULDN'T CONNECT (THEIR NETWORK OR YOURS NEEDS A RELAY)";refreshMenuNet();}},JOIN_TIMEOUT+2000);
      c.on('data',hostData);c.on('close',()=>{if(NET.conn===c)hostLost();});c.on('error',()=>{if(NET.conn===c)hostLost();});});};
  tryCode();
}
function stopHost(){const p2=players.find(pl=>pl.dev.t==='net');if(p2)leavePlayer(p2);try{NET.conn&&NET.conn.close();NET.peer&&NET.peer.destroy();}catch(e){}
  Object.assign(NET,{role:null,peer:null,conn:null,ready:false,code:'',status:''});netBadge('');refreshMenuNet();}
function hostLost(){if(NET.role!=='host')return;const p2=players.find(pl=>pl.dev.t==='net');if(p2)leavePlayer(p2);NET.ready=false;NET.conn=null;
  padToast('YOUR ONLINE FRIEND LEFT');netBadge('ONLINE · '+NET.code);NET.status='WAITING FOR A FRIEND';refreshMenuNet();}
function hostData(m){
  if(!m||!m.t)return;
  if(m.t==='ready'){NET.ready=true;NET.glKey='';resetLeafShadow();joinPlayer({t:'net'});netBadge('ONLINE · 2 PLAYERS');NET.status='CONNECTED';refreshMenuNet();if(state==='shop')sendNight();return;}
  const p2=players.find(pl=>pl.dev.t==='net');if(!p2)return;
  if(m.t==='i'){Object.assign(NET.in,m);
    if(state==='play')for(const e of m.ev||[])withPl(p2,()=>{
      if(e==='use')interact();else if(e==='tarp')tarpAction();else if(e==='honk'){if(driving)honk();}else if(e==='end'){if(driving)endDay();}else if(e==='rake')toggleRake();
      else if(e==='prev')cycleNozzle(-1);else if(e==='next')cycleNozzle(1);
      else if(e.startsWith('eq:')){const a=ATT.filter(x=>owned.includes(x.id))[+e.slice(3)];if(a)equip(a.id);}});}
  else if(m.t==='act'&&state==='shop'){
    if(m.a==='up')buyUpgrade(p2,m.id);
    else if(m.a==='buy'){const a=ATT.find(x=>x.id===m.id);let ok=false;withPl(p2,()=>{if(a&&!owned.includes(a.id)&&money>=a.price){money-=a.price;owned.push(a.id);equipped=a.id;ok=true;}});if(ok){chaChing();renderNight();}}
    else if(m.a==='start')startDay();}
}
// last values sent to the guest for each leaf (quantized), so only changes go over the wire
const SHX=new Uint16Array(MAX),SHY=new Uint16Array(MAX),SHZ=new Uint8Array(MAX),SHM=new Uint16Array(MAX);
function resetLeafShadow(){SHX.fill(65535);SHY.fill(65535);SHZ.fill(255);SHM.fill(65535);}
function encodeLeaves(){
  const c=NET.in.cam,p2=players.find(pl=>pl.dev.t==='net');
  const r=c?{x0:c[0]-48,y0:c[1]-48,x1:c[0]+c[2]+48,y1:c[1]+c[3]+48}:p2?{x0:p2.P.x-320,y0:p2.P.y-220,x1:p2.P.x+320,y1:p2.P.y+220}:null;
  const LIM=7000,buf=new ArrayBuffer(4+LIM*9),dv=new DataView(buf);let n=0,o=4;
  if(r)for(let i=0;i<N&&n<LIM;i++){
    const qx=clamp((LX[i]*16)|0,0,65534),qy=clamp((LY[i]*16)|0,0,65534),qz=clamp((LZ[i]*3)|0,0,254);
    let rt=ROT[i]%Math.PI;if(rt<0)rt+=Math.PI;const m=(ST[i]&7)|((((rt/(Math.PI/4))|0)&3)<<3)|((SIZE[i]&3)<<5)|((COL[i]&7)<<7);
    if(qx===SHX[i]&&qy===SHY[i]&&qz===SHZ[i]&&m===SHM[i])continue;
    const x=LX[i],y=LY[i],sx=SHX[i]/16,sy=SHY[i]/16;
    if(!((x>r.x0&&x<r.x1&&y>r.y0&&y<r.y1)||(SHX[i]!==65535&&sx>r.x0&&sx<r.x1&&sy>r.y0&&sy<r.y1)))continue;
    dv.setUint16(o,i,true);dv.setUint16(o+2,qx,true);dv.setUint16(o+4,qy,true);dv.setUint8(o+6,qz);dv.setUint16(o+7,m,true);o+=9;n++;
    SHX[i]=qx;SHY[i]=qy;SHZ[i]=qz;SHM[i]=m;}
  dv.setUint16(0,N,true);dv.setUint16(2,n,true);return buf.slice(0,o);
}
const R1=v=>Math.round(v*10)/10,R2=v=>Math.round(v*100)/100;
function netHostTick(dt){
  if(NET.role!=='host'||!NET.ready||!NET.conn||!NET.conn.open)return;
  NET.acc+=dt;if(NET.acc<.05)return;NET.acc=0;
  const dc=NET.conn.dataChannel;if(dc&&dc.bufferedAmount>512*1024)return;
  storePl();const p2=players.find(pl=>pl.dev.t==='net');
  NET.lsT-=.05;if(p2&&NET.lsT<=0){NET.lsT=.25;const L=p2.driving?lotAtPoint(TR.x,TR.y,FRONT+30):lotAtPoint(p2.P.x,p2.P.y);if(L){const s0=lotStats(L);NET.ls={k:L.k,good:s0.good,total:s0.total,pct:s0.pct};}else NET.ls=null;}
  const j={st:state,h:R2(hour),d:day,rep,rt:state==='play'?repTally().total:(today&&today.rep?today.rep.total:0),tr:[R1(TR.x),R1(TR.y),R2(TR.a),R1(TR.v),truckTicket?1:0],bed:bed.map(R2),tb:truckBundles.slice(),
    pl:players.map(pl=>({x:R1(pl.P.x),y:R1(pl.P.y),vx:R1(pl.P.vx),vy:R1(pl.P.vy),w:R2(pl.P.walk),ax:R2(pl.aim.x),ay:R2(pl.aim.y),pw:R2(pl.power),md:pl.mode,bt:R1(pl.battery),dr:pl.driving?1:0,rd:pl.riding?1:0,
      bu:pl.bundle?pl.bundle.total:-1,hn:pl.heldNet?NETS.indexOf(pl.heldNet):-1,cp:pl.carryPkg?packages.indexOf(pl.carryPkg):-1,sw:R2(pl.swapT),ti:R2(pl.tieT),eq:pl.equipped,ow:pl.owned,up:pl.upg,mo:Math.round(pl.money),tu:pl.tarpsUsed,
      bl:[R1(pl.bl.nx),R1(pl.bl.ny),R2(pl.bl.cosH),pl.bl.vort?1:0,R1(pl.bl.tx||0),R1(pl.bl.ty||0)],b2:pl.bl2?[R1(pl.bl2.nx),R1(pl.bl2.ny)]:null,
      rk:[pl.raking?1:0,R1(pl.rake.eff),pl.rakeN,R1(pl.rake.vL),R1(pl.rake.vR)]})),
    tf:traffic.map(v=>[v.nid,v.kind,R1(v.x),R1(v.y),R2(v.a),v.col||'',v.lights?1:0,v.ghost?1:0]),
    pd:peds.map(p=>[p.nid,R1(p.x),R1(p.y),p.shirt||'',p.hair||'',p.dog?1:0,p.fdir,R2(p.mx),R2(p.my),R2(p.walk),p.stop>0?1:0,p.mad>0?1:0,p.cameo?1:0,p.who||'',p.run>0?1:0]),
    of:officers.map(o=>[R1(o.x),R1(o.y),R2(o.walk),o.stop>0?1:0,o.fdir,R2(o.mx),R2(o.my)]),
    co:couriers.map(o=>[o.nid,R1(o.x),R1(o.y),R2(o.walk),o.stop>0?1:0,o.fdir,R2(o.mx),R2(o.my),o.carry?1:0,o.shirt,o.hair,o.mad>0?1:0]),
    pk:packages.map(k=>[R1(k.x),R1(k.y),R1(k.z),R1(k.hx),R1(k.hy),k.far?1:0,k.moved?1:0]),
    ta:tarps.map(t=>[t.id,t.st,R2(t.t),t.x0,t.y0,t.x1,t.y1,R1(t.fx),R1(t.fy),t.trapped||0,players.indexOf(t.owner)]),
    nt:NETS.map(n=>[R1(n.x),R1(n.y),R2(n.a),n.held?1:0,n.n]),
    po:POTS.map((p,i)=>p.broken||p.wob>0?[i,p.broken?1:0,R2(p.wob)]:null).filter(Boolean),
    mb:MAILBOXES.map(m=>m.flag?1:0).join(''),
    en:envelopes.map(e=>[R1(e.x0),R1(e.y0),R1(e.x1),R1(e.y1),R2(e.t),e.T]),
    sq:squirrels.map(q=>[R1(q.x),R1(q.y),q.dir,R2(q.ph),R2(q.pauseT)]),bd:birds.map(b=>[R1(b.x),R1(b.y),R1(b.z),R2(b.ph)]),
    vc:visitors.map(c=>[(c.x0+c.x1)/2,(c.y0+c.y1)/2,c.vert?1:0,c.dir,c.col]),
    lt:LOTS.map(L=>[L.done?1:0,R2(L.paidPct||0)]),ls:NET.ls,ev:NET.ev.splice(0)};
  // the goals panel as the guest sees it (their own house's progress), only when it's changed
  {NET.glT=(NET.glT||0)-.05;if(NET.glT<=0){NET.glT=.25;const gl=goalRows(p2),k=JSON.stringify(gl);if(k!==NET.glKey){NET.glKey=k;j.gl=gl;}}}
  netSend({t:'s',j,lv:encodeLeaves()});
}
function sendNight(){if(NET.role!=='host'||!NET.ready)return;storePl();
  netSend({t:'n',day,rep,today,daySummary,pl:players.map(pl=>({money:pl.money,upg:pl.upg,owned:pl.owned,equipped:pl.equipped}))});}
// forward what the host sees and hears to the guest
{const ft=floatText,bb=bubble,bp=blip;
  floatText=function(x,y,txt,col,big){ft(x,y,txt,col,big);if(NET.role==='host'&&NET.ready)NET.ev.push(['f',R1(x),R1(y),txt,col,big?1:0]);};
  bubble=function(p,txt){bb(p,txt);if(NET.role==='host'&&NET.ready&&p.nid)NET.ev.push(['b',p.nid,txt]);};
  blip=function(f,dur,type,vol,to){bp(f,dur,type,vol,to);if(NET.role==='host'&&NET.ready&&NET.ev.length<60)NET.ev.push(['s',f,dur,type||'square',vol,to||0]);};}
// ---------- joining
let kpCode='';
function openKeypad(){
  state='joinpad';kpCode='';titleEl.classList.add('hide');
  const keys='123456789<0>'.split('').map(k=>`<button class="btn kpb ${k==='<'?'red':k==='>'?'green':''}" data-kp="${k}">${k==='<'?'&larr;':k==='>'?'JOIN':k}</button>`).join('');
  modalEl.innerHTML=`<div class="panel pause keypad"><h2>JOIN ONLINE</h2><div class="sub">ENTER YOUR FRIEND'S 6-DIGIT CODE<br>(THEY GET ONE FROM <b>HOST ONLINE</b> IN THEIR PAUSE MENU)</div>
    <div class="codebox" id="kpBox"></div><div class="kp">${keys}</div><div class="sub" id="kpMsg"></div>
    <div class="btns"><button class="btn" id="kpBack">BACK ${G('back')}</button></div></div>`;
  modalEl.classList.remove('hide');document.body.style.cursor='default';
  modalEl.querySelectorAll('[data-kp]').forEach(b=>b.onclick=()=>kpPress(b.dataset.kp));$('kpBack').onclick=closeKeypad;kpShow();
}
function kpShow(){$('kpBox').innerHTML=Array.from({length:6},(_,i)=>`<span class="${i<kpCode.length?'on':''}">${kpCode[i]||''}</span>`).join('');}
function kpPress(k){if(state!=='joinpad')return;if(k==='<')kpCode=kpCode.slice(0,-1);else if(k==='>'){if(kpCode.length===6)startJoin(kpCode);}else if(kpCode.length<6)kpCode+=k;blip(560,.04,'square',.04);kpShow();}
function closeKeypad(){if(NET.role==='guest')return;modalEl.classList.add('hide');state='title';titleEl.classList.remove('hide');}
function kpMsg(t){const el=$('kpMsg');if(el)el.textContent=t;}
let joinTry=0;
async function startJoin(code){
  // one attempt at a time; pressing JOIN again starts over
  const me=++joinTry;try{NET.conn&&NET.conn.close();NET.peer&&NET.peer.destroy();}catch(e){}NET.conn=null;NET.peer=null;
  kpMsg('CONNECTING...');
  let config;try{await loadPeer();config=await iceConfig();}catch(e){kpMsg('COULD NOT REACH THE ONLINE SERVICE');return;}
  if(me!==joinTry)return;
  const pr=new Peer({config});NET.peer=pr;NET.code=code;
  // give up cleanly (and leave JOIN ready to try again) if the connection never comes through
  let timer=0;const fail=msg=>{if(me!==joinTry||NET.role==='guest')return;clearTimeout(timer);joinTry++;try{NET.conn&&NET.conn.close();pr.destroy();}catch(e){}NET.conn=null;NET.peer=null;kpMsg(msg);};
  pr.on('error',e=>{fail(e.type==='peer-unavailable'?'NO GAME FOUND WITH THAT CODE':e.type==='network'||e.type==='server-error'?'COULD NOT REACH THE ONLINE SERVICE':'ONLINE ERROR: '+String(e.type||e).toUpperCase());});
  pr.on('open',()=>{const c=pr.connect(NET_PREFIX+code,{reliable:true});NET.conn=c;kpMsg('FOUND THE GAME, CONNECTING...');
    timer=setTimeout(()=>fail(NO_ROUTE),JOIN_TIMEOUT);
    c.on('error',()=>fail(NO_ROUTE));
    c.on('data',m=>{clearTimeout(timer);
      if(m.t==='full'){joinTry++;kpMsg('THAT GAME ALREADY HAS TWO PLAYERS');return;}
      // the host's custom yards differ: reload once with theirs so both worlds match, then reconnect
      if(m.t==='h'){if(JSON.stringify(m.yards||{})!==JSON.stringify(YARDS)){try{sessionStorage.setItem('curbNetYards',JSON.stringify(m.yards||{}));}catch(e){}location.hash='join='+code;location.reload();return;}
        guestStart();netSend({t:'ready'});return;}
      guestData(m);});
    c.on('close',()=>{if(NET.role==='guest')guestLost();else fail(NO_ROUTE);});});
}
function guestLost(){if(NET.role!=='guest')return;NET.role=null;padToast('DISCONNECTED FROM THE HOST');setTimeout(()=>{location.hash='';location.reload();},1600);}
function guestLeave(){try{NET.conn&&NET.conn.close();NET.peer&&NET.peer.destroy();}catch(e){}NET.role=null;location.hash='';location.reload();}
function guestStart(){
  NET.role='guest';ensureAudio();modalEl.classList.add('hide');titleEl.classList.add('hide');state='play';document.body.style.cursor='none';
  try{sessionStorage.removeItem('curbNetYards');}catch(e){}
  N=0;traffic.length=0;officers.length=0;envelopes.length=0;couriers.length=0;packages.length=0;squirrels.length=0;birds.length=0;
  for(const p of peds)if(p.bub)p.bub.el.remove();peds.length=0;today=newToday();
  // player one is now the host (drawn from updates); this browser plays player two
  const p1=players[0];p1.dev={t:'remote'};const me=newPlayer(1,{t:'auto'});me.autoMode=p1.autoMode;me.autoPad=p1.autoPad;players.push(me);
  views[0].pl=me;me.view=views[0];p1.view=null;usePl(me);netBadge('ONLINE · '+NET.code);
}
// ---------- the guest: apply the host's updates
const smooth=(o,x,y)=>{if(o._x==null){o.x=x;o.y=y;}o._x=x;o._y=y;};
function guestData(m){
  if(m.t==='s')applySnapshot(m.j,m.lv);
  else if(m.t==='n'){storePl();day=m.day;rep=m.rep;today=m.today;daySummary=m.daySummary;
    m.pl.forEach((d,i)=>{const pl=players[i];if(!pl)return;pl.money=d.money;pl.upg=d.upg;pl.owned=d.owned;pl.equipped=d.equipped;});reloadPl();
    if(NET.localMenu){NET.localMenu=false;}state='shop';modalEl.classList.remove('hide');document.body.style.cursor='default';renderNight();}
}
function reloadPl(){const c=cur;cur=null;usePl(c);}
function applySnapshot(j,lv){
  storePl();
  hour=j.h;day=j.d;rep=j.rep;NET.repT=j.rt;if(j.gl)NET.gl=j.gl;truckTicket=!!j.tr[4];bed=j.bed;truckBundles.length=0;truckBundles.push(...j.tb);NET.ls=j.ls;
  smooth(TR,j.tr[0],j.tr[1]);TR._a=j.tr[2];TR.v=j.tr[3];if(TR.a==null||Math.abs(TR.a-j.tr[2])>1)TR.a=j.tr[2];
  // small things: rebuilt from the snapshot, keeping per-object smoothing where they have an id
  const keep=(arr,rows,mk)=>{const old=new Map(arr.map(o=>[o.nid,o]));arr.length=0;for(const r of rows){const o=old.get(r[0])||mk(r);arr.push(o);}};
  keep(traffic,j.tf,r=>({nid:r[0]}));j.tf.forEach((r,i)=>{const v=traffic[i];v.kind=r[1];smooth(v,r[2],r[3]);v.ta=r[4];if(v.a==null)v.a=r[4];v.col=r[5];v.lights=!!r[6];v.ghost=!!r[7];v.v=1;v.hl=17;v.hw=8;
    v.can=v.kind==='cop'?copCans[v.lights?1+(((time*6)|0)&1):0]:v.kind==='mail'?mailCan:v.kind==='van'?vanCan:makeCarCached(v.col||'#c9352b');});
  const oldPeds=new Map(peds.map(p=>[p.nid,p]));peds.length=0;
  for(const r of j.pd){const p=oldPeds.get(r[0])||{nid:r[0]};oldPeds.delete(r[0]);smooth(p,r[1],r[2]);
    Object.assign(p,{shirt:r[3],hair:r[4],dog:!!r[5],fdir:r[6],mx:r[7],my:r[8],walk:r[9],stop:r[10],mad:r[11]?1:0,cameo:!!r[12],who:r[13]||undefined,run:r[14]});peds.push(p);}
  for(const p of oldPeds.values())if(p.bub)p.bub.el.remove();
  officers.length=0;for(const r of j.of)officers.push({x:r[0],y:r[1],walk:r[2],stop:r[3],fdir:r[4],mx:r[5],my:r[6],shirt:'#1d2f5a',hair:'#10182a',mad:0,dog:false});
  const oldCo=new Map(couriers.map(o=>[o.nid,o]));couriers.length=0;
  for(const r of j.co){const o=oldCo.get(r[0])||{nid:r[0]};oldCo.delete(r[0]);smooth(o,r[1],r[2]);Object.assign(o,{walk:r[3],stop:r[4],fdir:r[5],mx:r[6],my:r[7],carry:!!r[8],shirt:r[9],hair:r[10],mad:r[11],dog:false});couriers.push(o);}
  for(const o of oldCo.values())if(o.bub)o.bub.el.remove();
  packages.length=0;for(const r of j.pk)packages.push({x:r[0],y:r[1],z:r[2],hx:r[3],hy:r[4],far:!!r[5],moved:!!r[6]});
  tarps.length=0;for(const r of j.ta)tarps.push({id:r[0],st:r[1],t:r[2],x0:r[3],y0:r[4],x1:r[5],y1:r[6],fx:r[7],fy:r[8],trapped:r[9],owner:players[r[10]]||null,pins:[]});
  j.nt.forEach((r,i)=>{const n=NETS[i];if(!n)return;n.x=r[0];n.y=r[1];n.a=r[2];n.held=!!r[3];n.n=r[4];});
  for(const p of POTS){p.broken=false;p.wob=0;}for(const [i,b,w] of j.po){const p=POTS[i];if(p){p.broken=!!b;p.wob=w;}}
  MAILBOXES.forEach((m,i)=>{m.flag=j.mb[i]==='1';});
  envelopes.length=0;for(const r of j.en)envelopes.push({x0:r[0],y0:r[1],x1:r[2],y1:r[3],t:r[4],T:r[5]});
  squirrels.length=0;for(const r of j.sq)squirrels.push({x:r[0],y:r[1],dir:r[2],ph:r[3],pauseT:r[4]});
  birds.length=0;for(const r of j.bd)birds.push({x:r[0],y:r[1],z:r[2],ph:r[3]});
  const vk=JSON.stringify(j.vc);if(vk!==NET.visKey){NET.visKey=vk;clearVisitors();for(const [x,y,vt,dr,col] of j.vc){const c=makeCarObj(x,y,!!vt,dr,col);visitors.push(c);}}
  j.lt.forEach((r,i)=>{const L=LOTS[i];if(L){L.done=!!r[0];L.paidPct=r[1];}});
  // the players (this browser keeps its own aim)
  j.pl.forEach((d,i)=>{const pl=players[i];if(!pl)return;smooth(pl.P,d.x,d.y);pl.P.vx=d.vx;pl.P.vy=d.vy;pl.P.walk=d.w;if(pl!==cur){pl.aim.x=d.ax;pl.aim.y=d.ay;}
    Object.assign(pl,{power:d.pw,mode:d.md,battery:d.bt,driving:!!d.dr,riding:!!d.rd,bundle:d.bu>=0?{total:d.bu,counts:{}}:null,heldNet:d.hn>=0?NETS[d.hn]:null,carryPkg:d.cp>=0?packages[d.cp]:null,
      swapT:d.sw,tieT:d.ti,equipped:d.eq,owned:d.ow,upg:d.up,money:d.mo,tarpsUsed:d.tu});
    pl.bl={nx:d.bl[0],ny:d.bl[1],cosH:d.bl[2],vort:!!d.bl[3],tx:d.bl[4],ty:d.bl[5],range:60};pl.raking=!!d.rk[0];pl.rake.eff=d.rk[1];pl.rakeN=d.rk[2];pl.rake.vL=d.rk[3];pl.rake.vR=d.rk[4];pl.bl2=d.b2?{nx:d.b2[0],ny:d.b2[1],cosH:d.bl[2],range:60,ax:-pl.aim.x,ay:-pl.aim.y}:null;});
  reloadPl();
  for(const e of j.ev){if(e[0]==='f')floatText(e[1],e[2],e[3],e[4],!!e[5]);else if(e[0]==='s')blip(e[1],e[2],e[3],e[4],e[5]||undefined);
    else if(e[0]==='b'){const p=peds.find(q=>q.nid===e[1])||couriers.find(q=>q.nid===e[1]);if(p)bubble(p,e[2]);}}
  if(lv&&lv.byteLength>=4){const dv=new DataView(lv),n=dv.getUint16(2,true);N=dv.getUint16(0,true);
    for(let k=0,o=4;k<n;k++,o+=9){const i=dv.getUint16(o,true);LX[i]=dv.getUint16(o+2,true)/16;LY[i]=dv.getUint16(o+4,true)/16;LZ[i]=dv.getUint8(o+6)/3;const m=dv.getUint16(o+7,true);
      ST[i]=m&7;ROT[i]=((m>>3)&3)*Math.PI/4+.05;SIZE[i]=(m>>5)&3;COL[i]=(m>>7)&7;}}
  // what the host's game is doing
  NET.hostPaused=j.st==='menu'||j.st==='closeout';$('netBanner').style.display=NET.hostPaused?'block':'none';
  if(j.st==='play'&&state==='shop'){modalEl.classList.add('hide');state='play';document.body.style.cursor='none';}
}
// ---------- the guest: input out, smoothing and camera in
function guestFrame(dt){
  time+=dt;usePl(players[1]);
  const lerp=Math.min(1,dt*14),sm=o=>{if(o._x!=null){o.x+=(o._x-o.x)*lerp;o.y+=(o._y-o.y)*lerp;}};
  for(const pl of players)sm(pl.P);sm(TR);if(TR._a!=null){let d=TR._a-TR.a;d=((d+Math.PI*3)%(Math.PI*2))-Math.PI;TR.a+=d*lerp;}
  for(const v of traffic){sm(v);let d=v.ta-v.a;d=((d+Math.PI*3)%(Math.PI*2))-Math.PI;v.a+=d*lerp;}
  for(const p of peds)sm(p);for(const o of couriers)sm(o);
  if(state==='play'&&!NET.localMenu){
    const usesKeys=true;let ix=0,iy=0;
    if(keys.KeyA||keys.ArrowLeft)ix--;if(keys.KeyD||keys.ArrowRight)ix++;if(keys.KeyW||keys.ArrowUp)iy--;if(keys.KeyS||keys.ArrowDown)iy++;
    ix+=pad.lx;let th=iy;iy+=pad.ly;if(!pad.lock)th+=pad.lt-pad.rt;
    viewIn(cur);
    if(inputMode==='pad'){const m=Math.hypot(pad.rx,pad.ry);if(m>.3){let a=Math.atan2(aim.y,aim.x);const d=((Math.atan2(pad.ry,pad.rx)-a)%(Math.PI*2)+Math.PI*3)%(Math.PI*2)-Math.PI;a+=d*Math.min(1,dt*(10+m*14));aim.x=Math.cos(a);aim.y=Math.sin(a);}}
    else{const [mwx,mwy]=mouseWorld(),adx=mwx-P.x,ady=mwy-(P.y-3),al=Math.hypot(adx,ady);if(al>4){const k=Math.min(1,dt*25);aim.x+=(adx/al-aim.x)*k;aim.y+=(ady/al-aim.y)*k;const n=Math.hypot(aim.x,aim.y)||1;aim.x/=n;aim.y/=n;}}
    if(padHit(BTN.pause)||padHit(BTN.view))openMenu(false,cur);
    for(const [b,e] of [[BTN.use,'use'],[BTN.tarp,'tarp'],[BTN.honk,'honk'],[BTN.end,'end'],[BTN.rake,'rake'],[BTN.prev,'prev'],[BTN.next,'next']])if(padHit(b))NET.evOut.push(e);
    if(padHit(BTN.honk)&&!cur.driving&&!cur.riding)toggleGoals();
    if(pad.b.some((b,i)=>b&&!pad.pb[i]))ensureAudio();
    NET.acc+=dt;if(NET.acc>=1/30){NET.acc=0;const lo=mouse.l||(!pad.lock&&pad.lt>.3),hi=mouse.r||(!pad.lock&&pad.rt>.3);
      const vf=att().vortex?(inputMode==='pad'?padVortexF(cur,pad):mouseVortexF()):.55;if(att().vortex)setVortex(vf);
      netSend({t:'i',mx:R2(clamp(ix,-1,1)),my:R2(clamp(iy,-1,1)),th:R2(clamp(th,-1,1)),ax:R2(aim.x),ay:R2(aim.y),lo:lo?1:0,hi:hi?1:0,vf:R2(vf),cam:[Math.round(camX),Math.round(camY),VW,VH],ev:NET.evOut.splice(0)});}
    updateCamera(dt);viewOut(cur);
  }else if(state!=='play'||NET.localMenu){NET.acc+=dt;if(NET.acc>=.2){NET.acc=0;netSend({t:'i',mx:0,my:0,th:0,ax:R2(aim.x),ay:R2(aim.y),lo:0,hi:0,cam:[Math.round(camX),Math.round(camY),VW,VH],ev:[]});}}
  updateParticles(dt);
  // trees (and tunnel roofs) go see-through over either player
  fadeTunnels(dt);
  for(const t of TREES){const cxw=t.x,cyw=t.y-t.lift;let inside=false;for(const pl of players){if(!onFoot(pl))continue;const dx=pl.P.x-cxw,dy=pl.P.y-12-cyw;if((dx*dx)/(t.r*t.r)+(dy*dy)/(t.r*t.r*.9)<1.15)inside=true;}
    t.alpha+=((inside?.28:.95)-t.alpha)*Math.min(1,dt*7);}
}
