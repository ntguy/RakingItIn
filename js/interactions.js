'use strict';
// ============================================================ interactions
function truckPart(){
  if(driving||cur.riding)return null;const [lx,ly]=toTruck(P.x,P.y);
  const ex=Math.max(Math.abs(lx)-TRUCK_HL,0),ey=Math.max(Math.abs(ly)-TRUCK_HW,0);
  if(Math.hypot(ex,ey)>14)return null;
  return lx<0?'back':'front';
}
function lotAtPoint(x,y,m=16){
  if(x>=0&&y>=0&&x<WORLD_W&&y<H){const i=LOT_AT[(y|0)*WORLD_W+(x|0)];if(i>=0)return i<LOTS.length?LOTS[i]:null;}
  let best=null,bd=m;for(const L of LOTS){const d=Math.hypot(Math.max(L.x0-x,0,x-L.x1),Math.max(L.y0-y,0,y-L.y1));if(d<bd){bd=d;best=L;}}return best;
}
function nearDoor(){if(driving||cur.riding)return null;for(const L of LOTS){const [lx,ly]=L.toLocal(P.x,P.y);if(Math.abs(lx-L.ldoor.x)<14&&ly>L.ldoor.y-2&&ly<L.ldoor.y+18)return L;}return null;}
const walkable=(x,y)=>{for(const [dx,dy] of [[-4,0],[4,0],[0,-3],[0,2]]){const qx=(x+dx)|0,qy=(y+dy)|0;if(qx<0||qy<0||qx>=WORLD_W||qy>=H||REG[qy*WORLD_W+qx]===0)return false;}return true;};
function interact(){
  if(tieT>0)return;
  if(cur.riding){if(Math.abs(TR.v)>35)return;cur.riding=false;
    for(const side of [1,-1]){const [x,y]=fromTruck(4,side*(TRUCK_HW+8));P.x=x;P.y=y;P.vx=P.vy=0;collidePlayer();if(walkable(P.x,P.y))break;}dropInputs();blip(200,.06);return;}
  if(driving){if(Math.abs(TR.v)>35)return;driving=false;TR.v=0;
    for(const side of [-1,1]){const [x,y]=fromTruck(4,side*(TRUCK_HW+8));P.x=x;P.y=y;P.vx=P.vy=0;collidePlayer();if(walkable(P.x,P.y))break;}dropInputs();blip(200,.06);return;}
  if(heldNet){if(TUT.on&&heldNet.n>0){floatText(P.x,P.y-14,'EMPTY THE NET FIRST','#fe5f55');blip(150,.12,'sawtooth',.04,90);return;}putNetDown();return;}
  if(carryPkg&&truckPart()==='back'&&!TUT.on){stealPkg();return;}
  if(carryPkg){putDownPkg();return;}
  const pk=nearPkg();if(pk&&!bundle&&pk.far){pickUpPkg(pk);return;}
  const L=tutOk('knock')&&nearDoor();if(L){if(lotLocked(L)){floatText(P.x,P.y-14,'NOT HIRING YOU YET','#fe5f55');blip(150,.15,'sawtooth',.04,90);return;}if(!L.done){if(cur.dev.t==='net'){const s0=lotStats(L),p0=calcPay(L,s0);pendingLot=L;pendingPay=p0;L.pct=s0.pct;const st=state;confirmCloseout();state=st;}else openCloseout(L);}return;}
  if(pk&&!bundle){pickUpPkg(pk);return;}
  const net=tutOk('net')&&nearNet();if(net){if(bundle)floatText(P.x,P.y-14,'HANDS FULL','#fe5f55');else grabNet(net);return;}
  const part=truckPart();
  if(part==='back'){
    if(bundle){
      // the tied tarp goes in the truck whole, and that tarp is done for the day
      const n=bundle.total;for(const k in bundle.counts){LOTS[k].hauled+=bundle.counts[k];}
      today.hauled+=n;today.bundles++;truckBundles.push(n);tarpsUsed++;goalAdd('dep1000',n);
      floatText(P.x,P.y-14,`TARP LOADED · ${n} LEAVES`,'#4bc26a');blip(260,.08,'triangle',.06);setTimeout(()=>blip(390,.1,'triangle',.05),70);rumble(.35,.2,120);bundle=null;statsT=1;
      if(tarpsLeft()<=0&&!TUT.on)setTimeout(()=>floatText(P.x,P.y-24,'THAT WAS YOUR LAST TARP','#ffcf4a'),500);tutEv('load');
    }else if(tutOk('swap'))trySwap();
  }else if(part==='front'&&tutOk('drive')){if(bundle){floatText(P.x,P.y-14,'UNLOAD FIRST','#fe5f55');return;}
    // someone's already at the wheel: hop in the passenger side
    stopRake(true);
    if(players.some(pl=>pl!==cur&&pl.driving)){cur.riding=true;dropInputs();blip(200,.06);setTimeout(()=>blip(260,.06),70);return;}
    driving=true;truckTicket=false;dropInputs();rumble(.4,.15,160);blip(120,.15,'sawtooth',.05,60);}
}
function trySwap(){
  if(swapT>0||battery>=capacity()-.5)return;
  const b=bestSpare();
  if(b<.05){floatText(P.x,P.y-14,'NO CHARGED SPARES','#fe5f55');blip(110,.2,'sawtooth',.05,70);return;}
  if(b<=battery/capacity()+.02){floatText(P.x,P.y-14,'NOTHING FULLER IN THE TRUCK','#ffcf4a');blip(110,.2,'sawtooth',.05,70);return;}
  swapT=SWAP_TIME;blip(330,.08,'square',.06);setTimeout(()=>blip(220,.08,'square',.05),120);
}
// ---------- tarps
function tarpAction(){
  if(driving||tieT>0||carryPkg)return;
  if(heldNet){emptyNet(false);return;}
  if(cur.raking&&cur.rakeN){rakeDump(false);return;}
  if(bundle){
    for(const k in bundle.counts){for(let n=0;n<bundle.counts[k];n++){const a=rnd()*Math.PI*2,d=rnd()*10;const i=addLeaf(P.x+Math.cos(a)*d,P.y+Math.sin(a)*d*.7,2+rnd()*6,randCol(),+k);if(i>=0){VX[i]=Math.cos(a)*30;VY[i]=Math.sin(a)*30;}}}
    bundle=null;floatText(P.x,P.y-14,'DROPPED','#ffcf4a');blip(180,.12,'triangle',.06);return;
  }
  let best=null,bd=1e9;for(const t of tarps){if(t.st!=='down'||t.owner!==cur)continue;const dx=Math.max(t.x0-P.x,0,P.x-t.x1),dy=Math.max(t.y0-P.y,0,P.y-t.y1),d=Math.hypot(dx,dy);if(d<10&&d<bd){bd=d;best=t;}}
  if(best){if(tutOk('tie'))startTie(best);return;}
  if(!tutOk('tarp'))return;
  if(tarpsLeft()<=0){if(tarpsOwned())floatText(P.x,P.y-14,tarpsUsed?'NO TARPS LEFT TODAY':'NO TARPS LEFT','#fe5f55');return;}
  const [tw,th]=tarpDims(),cx=P.x+aim.x*(tw*.5+10),cy=P.y+aim.y*(th*.5+10);
  if(wet(cx,cy)){floatText(P.x,P.y-14,'NOT IN THE POOL!','#fe5f55');return;}
  const t={id:tarpSeq++,owner:cur,st:'fly',t:0,fx:P.x,fy:P.y-6,x0:Math.round(cx-tw/2),y0:Math.round(cy-th/2),pins:[]};t.x1=t.x0+tw;t.y1=t.y0+th;
  if(tarpSeq>60000)tarpSeq=1;
  tarps.push(t);blip(700,.25,'triangle',.04,200);
}
function landTarp(t){
  let trapped=0;
  const cx=(t.x0+t.x1)/2,cy=(t.y0+t.y1)/2;
  for(let i=0;i<N;i++){
    if(ST[i]!==0)continue;const x=LX[i],y=LY[i];
    if(x>=t.x0&&x<t.x1&&y>=t.y0&&y<t.y1){if(LZ[i]<4){ST[i]=1;UN[i]=t.id;VX[i]=VY[i]=VZ[i]=0;LZ[i]=0;trapped++;}}
    else if(x>t.x0-10&&x<t.x1+10&&y>t.y0-10&&y<t.y1+10&&LZ[i]<3){const dx=x-cx,dy=y-cy,d=Math.hypot(dx,dy)||1;VX[i]+=dx/d*70;VY[i]+=dy/d*70;VZ[i]+=25+rnd()*20;}
  }
  t.trapped=trapped;
  blip(140,.12,'triangle',.08,70);rumble(.3,.15,90);
  for(let k=0;k<14;k++){const a=rnd()*Math.PI*2;sparks.push({x:cx+Math.cos(a)*(t.x1-t.x0)*.5,y:cy+Math.sin(a)*(t.y1-t.y0)*.5,z:1,vx:Math.cos(a)*40,vy:Math.sin(a)*30,vz:30+rnd()*30,l:.4+rnd()*.3,c:'#d8d2c6'});}
}
function startTie(t){
  t.st='tie';t.t=0;t.pins=[];
  for(let i=0;i<N;i++){if(ST[i]===0&&LZ[i]<4&&LX[i]>=t.x0&&LX[i]<t.x1&&LY[i]>=t.y0&&LY[i]<t.y1){ST[i]=2;t.pins.push(i);}}
  tieT=TIE_T;dropInputs();
  blip(300,.08,'triangle',.06);setTimeout(()=>blip(360,.08,'triangle',.06),150);setTimeout(()=>blip(420,.08,'triangle',.06),300);
}
function finishTie(t){
  const counts={};let total=0;
  t.pins.sort((a,b)=>b-a);
  for(const i of t.pins){if(i<N&&ST[i]===2){counts[HOME[i]]=(counts[HOME[i]]||0)+1;total++;removeLeaf(i);}}
  for(let i=0;i<N;i++)if(ST[i]===1&&UN[i]===t.id)ST[i]=0;
  tarps.splice(tarps.indexOf(t),1);
  if(total>0){for(const id of ['tarp100','tarp200','tarp300'])goalBest(id,total);stopRake(true);bundle={counts,total};rumble(.1,.4,90);floatText(P.x,P.y-14,`BUNDLED ${total}`,'#009dff');blip(260,.1,'triangle',.07,420);}
  else{floatText(P.x,P.y-14,'TARP PACKED','#cfe3e6');blip(300,.06);}
  statsT=1;
}
function updateTarps(dt){
  for(const t of tarps.slice()){
    t.t+=dt;
    if(t.st==='fly'&&t.t>=THROW_T){t.st='down';t.t=0;landTarp(t);}
    else if(t.st==='tie'){
      const cx=(t.x0+t.x1)/2,cy=(t.y0+t.y1)/2,k=Math.min(1,dt*(3+t.t*16));
      for(const i of t.pins){LX[i]+=(cx-LX[i])*k;LY[i]+=(cy-LY[i])*k;LZ[i]=Math.max(0,Math.sin(t.t*14+PH[i]*6)*2*(1-t.t/TIE_T));}
      if(t.t>=TIE_T)withPl(t.owner,()=>finishTie(t));
    }
  }
}
// ---------- pool net
const netHead=()=>[P.x+aim.x*NET_REACH,P.y+aim.y*NET_REACH];
function netSegDist(n,x,y){const ex=Math.cos(n.a),ey=Math.sin(n.a),t=clamp((x-n.x)*ex+(y-n.y)*ey,0,NET_STICK);return Math.hypot(x-n.x-ex*t,y-n.y-ey*t);}
function nearNet(){if(driving||heldNet)return null;let best=null,bd=9;for(const n of NETS){if(n.held)continue;const d=netSegDist(n,P.x,P.y);if(d<bd){bd=d;best=n;}}return best;}
let netPrev=null,netFullT=-9;
function grabNet(n){stopRake(true);heldNet=n;n.held=true;n.n=0;netPrev=netHead();dropInputs();rumble(0,.35,70);blip(520,.05,'square',.05);setTimeout(()=>blip(660,.06,'square',.04),60);}
function putNetDown(){
  const n=heldNet;emptyNet(true);
  n.x=P.x+aim.x*2;n.y=P.y+aim.y*2;n.a=Math.atan2(aim.y,aim.x);n.held=false;heldNet=null;blip(300,.06,'square',.05);
}
// shake the catch out at the net head. It has to land on dry ground unless we're just dropping the net
function emptyNet(force){
  const n=heldNet;if(!n)return;
  if(!n.n){if(!force)floatText(P.x,P.y-14,'NET IS EMPTY','#cfe3e6');return;}
  const [hx,hy]=netHead();
  if(!force&&wet(hx,hy)){floatText(P.x,P.y-14,'EMPTY IT ON DRY LAND','#fe5f55');blip(110,.12,'sawtooth',.04,70);return;}
  const ni=NETS.indexOf(n);
  for(let i=0;i<N;i++){if(ST[i]!==4||UN[i]!==ni)continue;const a=rnd()*Math.PI*2,s=8+rnd()*22;
    ST[i]=0;LX[i]=hx+Math.cos(a)*2;LY[i]=hy+Math.sin(a)*2;LZ[i]=3+rnd()*3;VX[i]=Math.cos(a)*s;VY[i]=Math.sin(a)*s*.7;VZ[i]=10+rnd()*15;VR[i]=(rnd()-.5)*8;}
  if(!force){tutEv('netDump');floatText(hx,hy-10,`DUMPED ${n.n}`,'#009dff');}
  n.n=0;blip(240,.1,'triangle',.06,160);statsT=1;
}
// ---------- rake
function toggleRake(){
  if(!tutOk('rake'))return;
  if(state!=='play'||driving||cur.riding||tieT>0||swapT>0)return;
  if(cur.raking){stopRake();return;}
  if(bundle||carryPkg){floatText(P.x,P.y-14,'HANDS FULL','#fe5f55');blip(150,.12,'sawtooth',.04,90);return;}
  if(heldNet&&TUT.on&&heldNet.n>0){floatText(P.x,P.y-14,'EMPTY THE NET FIRST','#fe5f55');blip(150,.12,'sawtooth',.04,90);return;}
  if(heldNet)putNetDown();
  const k=cur.rake;cur.raking=true;cur.rakeN=0;k.eff=RAKE_REACH;k.vL=-rakeHW(cur);k.vR=rakeHW(cur);k.prev=null;k.drop=null;k.contact=0;k.load=0;
  dropInputs();rumble(0,.3,60);floatText(P.x,P.y-16,'RAKE','#e0a85a');blip(420,.05,'square',.05);setTimeout(()=>blip(560,.06,'square',.04),60);
}
// back to the blower. Anything still in the rake is left where the head is
function stopRake(quiet){
  if(!cur.raking)return;rakeDump(true);
  const k=cur.rake;cur.raking=false;k.prev=null;k.drop=null;k.contact=0;k.load=0;dropInputs();
  if(!quiet){const a=att();floatText(P.x,P.y-16,a.name,a.tip);blip(560,.05,'square',.05);setTimeout(()=>blip(420,.06,'square',.04),60);}
}
// drop the catch in a neat pile at the head. It has to be on dry ground unless we're putting the rake away
function rakeDump(force){
  const pl=cur,n=pl.rakeN;if(!n)return;
  const k=pl.rake,hx=P.x+aim.x*k.eff,hy=P.y+aim.y*k.eff,S=rakeSolids(pl);
  if(!force&&wet(hx,hy)){floatText(P.x,P.y-14,'NOT IN THE POOL!','#fe5f55');blip(110,.12,'sawtooth',.04,70);return;}
  const idx=players.indexOf(pl),r=1.5+Math.sqrt(n)*.55;
  for(let i=0;i<N;i++){if(ST[i]!==5||UN[i]!==idx)continue;const a=rnd()*Math.PI*2,d=Math.sqrt(rnd())*r;
    const [qx,qy]=rakeReachPt(S,hx,hy,hx+aim.x+Math.cos(a)*d,hy+aim.y+Math.sin(a)*d*.75);
    ST[i]=0;LX[i]=qx;LY[i]=qy;LZ[i]=.5+rnd();VX[i]=Math.cos(a)*4;VY[i]=Math.sin(a)*3;VZ[i]=4+rnd()*4;VR[i]=(rnd()-.5)*4;}
  // where the head was becomes a no-stick zone covering the pile and the head, so the rake can't scoop the pile straight
  // back up. It goes away once the whole head has left it
  k.drop={x:hx,y:hy,r:Math.max(rakeHW(pl),r)+3};pl.rakeN=0;statsT=1;
  if(!force){tutEv('rakeDump');floatText(hx,hy-10,`PILED ${n}`,'#4bc26a');blip(200,.1,'triangle',.06,140);rumble(.15,.25,80);}
}
// ---------- flowerpots
function breakPot(p){
  if(p.broken)return;p.broken=true;p.stress=0;p.wob=0;
  const cost=POT_COST[p.big?1:0],paid=charge(cost);
 today.potDamage+=paid;today.pots++;today.damageRep+=Math.round(cost/10);p.lot.potsBroken=(p.lot.potsBroken||0)+1;
  floatText(p.x,p.y-12,paid?`-${fmt$(paid)} BROKEN POT`:'CRASH!','#fe5f55',true);
  crashShake=Math.max(crashShake,p.big?.22:.14);rumble(.45,.7,180);
  blip(1700,.05,'square',.04);setTimeout(()=>blip(1100+rnd()*300,.05,'square',.035),45);setTimeout(()=>blip(1500+rnd()*400,.04,'square',.03),100);blip(120,.18,'sawtooth',.05,50);
  const pal=POT_PALS[p.col];
  for(let i=0;i<(p.big?28:18);i++){const a=rnd()*Math.PI*2,v=20+rnd()*60,q=rnd();
    sparks.push({x:p.x,y:p.y-2,z:3+rnd()*4,vx:Math.cos(a)*v,vy:Math.sin(a)*v*.7,vz:30+rnd()*60,l:.4+rnd()*.5,c:q<.5?pal[rnd()<.5?0:2]:q<.75?'#4a2e1e':q<.9?'#3f7a34':POT_FLOWERS[p.fl]});}
  statsT=1;
}
// ---------- closeout
function lotStats(L){
  let total=0,good=0,fancy=0,pool=0;const k=L.k;
  for(let i=0;i<N;i++){if(HOME[i]!==k)continue;total++;const st=ST[i];if(st===3){pool++;continue;}if(LZ[i]>3||st===2||st===4||st===5)continue;const z=zoneAt(L,LX[i],LY[i]);if(z===1)good++;else if(z===2)fancy++;}
  const inB=bundle?(bundle.counts[k]||0):0;
  total+=L.hauled+inB;good+=L.hauled;
  return{total,good,fancy,pool,pct:total?good/total:1};
}
function calcPay(L,s){
  const base=s.good,pen=(s.fancy+s.pool)*FANCY_PEN;
  const tipPct=tipFor(s.pct),tip=Math.round(base*tipPct);
  return{base,pen,tip,tipPct,total:Math.max(0,base-pen+tip)};
}
let pendingLot=null,pendingPay=null;
function openCloseout(L){
  const s=lotStats(L),p=calcPay(L,s);pendingLot=L;pendingPay=p;pendingLot.pct=s.pct;state='closeout';dropInputs();
  blip(180,.06,'square',.08);setTimeout(()=>blip(180,.06,'square',.08),140);setTimeout(()=>blip(180,.06,'square',.08),280);
  const pct=Math.round(s.pct*100);
  let q=pct>=90?'"IMMACULATE. HERE\'S A LITTLE SOMETHING EXTRA."':pct>=70?'"LOOKS GREAT, THANK YOU!"':pct>=50?'"NOT BAD AT ALL."':pct>=30?'"HMM... I GUESS THAT\'S FINE."':'"DID YOU EVEN TRY?"';
  if(s.fancy>15)q+=' "AND WHY ARE THERE LEAVES ALL OVER MY '+(L.zones.some(z=>z.type==='garden')?'GARDEN':L.zones.some(z=>z.type==='patio')?'PATIO':'POOL DECK')+'?!"';
  if(s.pool>8)q+=' "THE POOL IS FULL OF LEAVES!"';
  if(L.potsBroken)q+=L.potsBroken>1?` "YOU BROKE ${L.potsBroken} OF MY FLOWERPOTS!"`:' "AND YOU BROKE MY FLOWERPOT!"';
  modalEl.innerHTML=`<div class="panel receipt">
    <h2>${L.name}</h2><div class="lottag">${L.tag} &middot; ${pct}% OF LEAVES ORGANIZED</div>
    <div class="quote">${q}</div>
    <div class="line"><span>IN BEDS &amp; NATURAL AREAS</span><span>${s.good-L.hauled} &times; $1</span></div>
    <div class="line"><span>HAULED AWAY</span><span>${L.hauled} &times; $1</span></div>
    ${L.zones.some(z=>!z.good&&z.type!=='pool')||s.fancy?`<div class="line"><span>LEAVES IN FANCY ZONES</span><span class="neg">${s.fancy} &times; -$${FANCY_PEN}</span></div>`:''}
    ${L.zones.some(z=>z.type==='pool')?`<div class="line"><span>LEAVES IN THE POOL</span><span class="neg">${s.pool} &times; -$${FANCY_PEN}</span></div>`:''}
    <div class="line"><span>TIP ${p.tipPct?Math.round(p.tipPct*100)+'%':'(50% FOR A TIP)'}</span><span class="pos">${p.tip?'+'+fmt$(p.tip):'-'}</span></div>
    <div class="line total"><span>PAYMENT</span><span>${fmt$(p.total)}</span></div>
    <div class="btns" style="margin-top:14px;justify-content:center"><button class="btn green" id="bPay">${G('use')} COLLECT</button><button class="btn red" id="bNo">${G('back')} NOT YET</button></div>
  </div>`;
  modalEl.classList.remove('hide');document.body.style.cursor='default';
  document.getElementById('bPay').onclick=confirmCloseout;document.getElementById('bNo').onclick=closeModal;
}
function closeModal(){modalEl.classList.add('hide');state='play';document.body.style.cursor='none';pendingLot=null;}
function confirmCloseout(){
  const L=pendingLot,p=pendingPay;if(!L)return;
  L.done=true;L.paidAmt=p.total;L.paidPct=L.pct;L.paidTip=p.tipPct;earn(p.total);today.houseEarn+=p.total;today.houses++;statsT=1;
  if(!TUT.on)goalsHouse(L,L.pct);
  closeModal();floatText(L.door.x,L.door.y-10,'+'+fmt$(p.total),'#ffcf4a',true);chaChing();rumble(.15,.5,110);setTimeout(()=>rumble(.15,.6,140),170);
  for(let k=0;k<30;k++){const a=rnd()*Math.PI*2,s=30+rnd()*60;sparks.push({x:L.door.x,y:L.door.y+6,z:8,vx:Math.cos(a)*s,vy:Math.sin(a)*s*.7,vz:60+rnd()*80,l:.7+rnd()*.6,c:rnd()<.5?'#ffcf4a':'#4bc26a'});}
}
