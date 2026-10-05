'use strict';
// ============================================================ HUD
const $=id=>document.getElementById(id);
// HUD elements are looked up inside the view being drawn (each view has its own copy of the HUD)
function E(id){const v=HV,c=v.els;if(c[id]&&c[id].isConnected!==false)return c[id];return c[id]=id==='cellEls'?[...v.root.querySelectorAll('#cells b')]:v.root.querySelector('#'+id);}
const hudCache={};
function setIf(key,val,fn){const c=HV?HV.cache:hudCache;if(c[key]!==val){c[key]=val;fn(val);}}
function setIfG(key,val,fn){if(hudCache[key]!==val){hudCache[key]=val;fn(val);}}
function fmtHour(h){let hh=Math.floor(h),mm=Math.floor((h-hh)*6)*10;const ap=hh>=12?'PM':'AM';hh=hh%12||12;return`${hh}:${String(mm).padStart(2,'0')} ${ap}`;}
let repShown=null;
function updateHUD(dt){
  if(state==='play'){roadT-=dt;if(roadT<=0){roadT=1;roadLeaves=countRoadLeaves();}}
  // the reputation readout, day and clock live in the first view on your own, or the shared bar in co-op
  const C=split(),RT=C?$('sRepT'):$('repT'),RB=C?$('sRepBox'):$('repBox');
  if(C){setIfG('sday',day,v=>{$('sDay').textContent='DAY '+v;});setIfG('sclock',fmtHour(hour),v=>{$('sClock').textContent=v;});
    players.forEach((pl,i)=>setIfG('sm'+i,Math.round(pl===cur?money:pl.money),v=>{$('sM'+i).textContent=fmt$(v);}));}
  if(state==='play'||state==='menu'||state==='closeout'){const t=NET.role==='guest'?NET.repT:repTally().total;
    if(t!==repShown||RT.dataset.v===undefined){RT.dataset.v=1;const el=RT,tot=rep+t;el.textContent=(tot<0?'\u2212':'')+Math.abs(tot);el.className=tot<0?'neg':'';
      if(repShown!=null&&state==='play'&&t!==repShown){const d=t-repShown,p=document.createElement('span');p.className='reppop';p.textContent=(d>0?'+':'\u2212')+Math.abs(d);p.style.color=d>0?'var(--green)':'var(--red)';RB.querySelectorAll('.reppop').forEach(q=>q.remove());RB.appendChild(p);setTimeout(()=>p.remove(),1500);}
      repShown=t;}}
  setIfG('menuShow',state==='play'||state==='menu',v=>{menuBtn.style.display=v?'flex':'none';});
  if(TUT.on&&state!=='play')tutArrow();
  for(const v of views){HV=v;withPl(v.pl,()=>hudView(dt));}
  HV=views[0];
  // co-op, both at the same house (or only one of you at one): a single house panel along the bottom middle
  const SL=$('sharedLot'),lots=C?[...new Set(players.map(p=>p.curLot).filter(Boolean))]:[],one=lots.length===1?lots[0]:null,who=one&&players.find(p=>p.curLot===one);
  setIfG('slShow',!!(one&&who.statsCache&&state==='play'),v=>{SL.style.display=v?'block':'none';});
  if(one&&who.statsCache){const st=who.statsCache;setIfG('sl',one.k+':'+st.good+':'+st.total+':'+st.pct.toFixed(3)+':'+one.done,()=>paintLot(id=>SL.querySelector('#'+id),one,st));}
}
function paintLot(q,L,s){
  const pct=Math.round(s.pct*100);
  q('lotName').textContent=L.name;q('lotTag').textContent=TUTORIAL?L.tag:`${L.tag} · ${HOOD_NAMES[L.hood]}`;
  q('lotBar').style.width=pct+'%';q('lotBar').style.background=pct>=90?'#4bc26a':pct>=70?'#ffcf4a':pct>=50?'#ff9800':'#fe5f55';
  const marks=[50,70,90];q('lotPanel').querySelectorAll('.bar i').forEach((m,i)=>m.classList.toggle('hit',pct>=marks[i]));
  q('lotGood').textContent=s.good;q('lotTotal').textContent=s.total;
  const bd=q('lotBadge'),lk=lotLocked(L);bd.className='lotbadge '+(L.done?'paid':lk?'locked':'open');
  bd.innerHTML=lk?'<svg class="px" width="16" height="16" viewBox="0 0 8 8"><path d="M2 1h4v1h1v2h1v4H0V4h1V2h1zM3 2v2h2V2z" fill="#fff"/></svg>':L.done?'<svg class="px" width="16" height="16" viewBox="0 0 8 8"><path d="M1 4h1v1h1v1h1V5h1V4h1V3h1V2h1v2H7v1H6v1H5v1H4v1H3V7H2V6H1z" fill="#fff"/></svg>'
    :'<svg class="px" width="16" height="16" viewBox="0 0 8 8"><path d="M3 0h2v1h2v1H3v1h3v1h1v2H6v1H5v1H3V7H1V6h4V5H2V4H1V2h1V1h1z" fill="#fff"/></svg>';
}
// one view's HUD, as its own player
function hudView(dt){
  const cap=capacity(),bp=battery/cap;
  const col=bp>.5?'#4bc26a':bp>.2?'#ffcf4a':'#fe5f55';
  for(let i=0;i<10;i++)setIf('cell'+i,Math.round(clamp(bp*10-i,0,1)*20),v=>{E('cellEls')[i].style.width=(v*5)+'%';});
  setIf('col',col,v=>{E('bbar').style.setProperty('--c',v);E('pct').style.color=v;});
  setIf('low',bp<.15&&battery>0,v=>E('bbar').classList.toggle('low',v));
  setIf('dead',battery<=0,v=>E('bbar').classList.toggle('dead',v));
  setIf('pct',Math.ceil(bp*100)+'%',v=>{E('pct').textContent=v;});
  const rate=drainRate(mode);
  const top=battery>0&&rate>0?Math.min(9,Math.ceil(bp*10)-1):-1;
  setIf('usecell',top,v=>{E('cellEls').forEach((c,i)=>c.parentNode.classList.toggle('use',i===v));});
  setIf('rate',rate.toFixed(2),()=>{E('bbar').style.setProperty('--spd',rate>0?(1.6/rate).toFixed(2)+'s':'1s');});
  // the truck's spares: one battery icon (filled to the best one's charge) and how many there are
  setIf('spares',bed.length+':'+Math.round(bestSpare()*10)+(charging()?'s':''),()=>{const b=bestSpare();E('spares').innerHTML=`<i class="${b<.05?'used':''}"><b style="height:${Math.round(b*100)}%;background:${levelCol(b)}"></b></i><b class="${b<.05?'neg':''}">&times;${bed.length}</b>${charging()?SUN_SVG:''}`;});
  setIf('cash',Math.round(money),v=>{E('cash').textContent=fmt$(v);});
  setIf('day',day,v=>{E('dayl').textContent='DAY '+v;});
  setIf('clock',fmtHour(hour),v=>{E('clock').textContent=v;});
  setIf('tarps',tarpsLeft(),v=>{E('gTarps').innerHTML='&times;'+v;E('gTarps').style.color=v>0?'#fff':'#fe5f55';});
  setIf('carry',bundle?bundle.total:-1,v=>{E('gBundle').style.display=v<0?'none':'flex';E('gCarry').textContent=v;});
  setIf('net',heldNet?heldNet.n:-1,v=>{E('gNet').style.display=v<0?'none':'flex';E('gNetN').textContent=v;E('gNetN').style.color=v>=NET_CAP?'#fe5f55':'';E('gNetCap').textContent='/ '+NET_CAP;});
  setIf('rake',cur.raking?cur.rakeN+':'+rakeCap(cur):'',v=>{E('gRake').style.display=v?'flex':'none';if(!v)return;
    E('gRakeN').textContent=cur.rakeN;E('gRakeN').style.color=cur.rakeN>=rakeCap(cur)?'#fe5f55':'';E('gRakeCap').textContent='/ '+rakeCap(cur);});
  setIf('hot',equipped+owned.join()+glyphStyle(),()=>{
    const list=ATT.filter(a=>owned.includes(a.id)),gp=glyphStyle()!=='kbm';E('hotbar').style.display=list.length>1?'flex':'none';HV.root.classList.toggle('hb',list.length>1);
    E('hotbar').innerHTML=(gp?`<span class="hbb">${glyphInner('prev')}</span>`:'')+list.map((a,i)=>`<div class="slot ${a.id===equipped?'on':''}"><span class="k">${i+1}</span><span class="dot" style="background:${a.tip}"></span><span>${a.short}</span></div>`).join('')+(gp?`<span class="hbb">${glyphInner('next')}</span>`:'');
  });
  const L=driving?lotAtPoint(TR.x,TR.y,FRONT+30):lotAtPoint(P.x,P.y);
  if(L!==curLot){curLot=L;statsCache=null;statsT=1;}
  statsT+=dt;
  // in co-op a view only shows its own house panel when the two of you are at different houses
  const showL=!!L&&(!split()||new Set(players.map(p=>p===cur?L:p.curLot).filter(Boolean)).size===2);
  setIf('lotShow',showL,v=>{E('lotPanel').style.display=v?'':'none';});
  if(L&&(statsT>.25||!statsCache)){statsT=0;statsCache=NET.role==='guest'?(NET.ls&&NET.ls.k===L.k?NET.ls:{good:0,total:0,pct:0}):lotStats(L);paintLot(E,L,statsCache);}
  let cls='',txt='';
  if(state==='play'){
    const part=truckPart(),door=nearDoor(),a=autoPl();
    if(cur.dev.t==='wait'){cls='swap';txt=`PRESS ANY BUTTON ON A CONTROLLER${a&&a.autoMode==='pad'?' (OR A KEY)':''} TO PLAY`;}
    else if(swapT>0){cls='busy';txt='SWAPPING BATTERY...';E('pfill').style.width=((1-swapT/SWAP_TIME)*100).toFixed(1)+'%';}
    else if(tieT>0){cls='busy';txt='TYING TARP...';E('pfill').style.width=((1-tieT/TIE_T)*100).toFixed(1)+'%';}
    else if(mode===2&&hour>=LATE_HOUR){cls='dead';txt='QUIET DOWN!';}
    else if(cur.riding){if(Math.abs(TR.v)<=35){cls='info';txt=`RIDING ALONG  ·  ${G('use')} GET OUT`;}}
    else if(driving&&TUT.on){cls='info';const kb=glyphStyle()==='kbm';
      txt=`${G('gas')} GAS  ·  ${G('brake')} BRAKE / REVERSE  ·  &#9664; ${kb?G('steer')+' '+G('steer2'):G('steer')} &#9654; STEER${Math.abs(TR.v)<=35?`  ·  ${G('use')} GET OUT`:''}`;}
    else if(driving){if(Math.abs(TR.v)<=35){cls='info';txt=`${G('use')} GET OUT  ·  ${G('end')} END THE DAY`;}}
    else if(carryPkg&&part==='back'&&!TUT.on){cls='dead calm';txt=`${G('use')} STEAL IT: +${fmt$(STEAL_PAY)} · &minus;${REP_STEAL} REP`;}
    else if(carryPkg){cls=carryPkg.far?'info':'swap';txt=carryPkg.far?`TAKE IT TO THE FRONT DOOR  ·  ${G('use')} PUT IT DOWN`:`${G('use')} LEAVE IT AT THE DOOR`;}
    else if(heldNet){const full=heldNet.n>=NET_CAP;cls=full?'dead':'info';txt=full?`${G('tarp')} EMPTY NET ON LAND`:heldNet.n?(TUT.on?`${G('tarp')} EMPTY THE NET`:`${G('tarp')} EMPTY THE NET  ·  ${G('use')} PUT IT DOWN`):`SWEEP NET THROUGH WATER  ·  ${G('use')} PUT IT DOWN`;}
    else if(lotLocked(curLot)){cls='dead calm';txt=`HOUSE REQUIRES REPUTATION ${lotNeed(curLot)} ${STAR_ICON}`;}
    else if(door&&tutOk('knock')){cls=door.done?'info':'swap';txt=door.done?`${door.name} ALREADY PAID TODAY`:`${G('use')} KNOCK ON THE DOOR`;}
    else if(nearNet()&&tutOk('net')){cls='swap';txt=bundle?'HANDS FULL  ·  LOAD THE TARP FIRST':`${G('use')} GRAB THE POOL NET`;}
    else if(part==='back'&&(bundle||(battery<cap-.5&&tutOk('swap')))){cls='swap';txt=bundle?`${G('use')} LOAD THE TIED TARP (${bundle.total} LEAVES)`:bestSpare()>.05?`${G('use')} SWAP BATTERY (BEST ONE ${Math.round(bestSpare()*100)}%)`:'NO CHARGED SPARES LEFT';}
    else if(part==='front'&&tutOk('drive')){cls='swap';txt=bundle?'LOAD THE TARP AT THE BACK FIRST':`${G('use')} DRIVE THE TRUCK`;}
    else if(cur.raking&&cur.rakeN>=rakeCap(cur)){cls='dead';txt=`${G('tarp')} EMPTY RAKE`;}
    else if(battery<=0){cls='dead';txt=bestSpare()>.05?'REPLACE BATTERY IN TRUCK':`OUT OF BATTERIES! ${G('end')} IN TRUCK TO END DAY`;}
    else if(bundle){cls='info';txt=`CARRY BUNDLE TO THE TRUCK  ·  ${G('tarp')} DROP`;}
    else if(tutOk('tie')&&tarps.some(t=>t.st==='down'&&t.owner===cur&&Math.hypot(Math.max(t.x0-P.x,0,P.x-t.x1),Math.max(t.y0-P.y,0,P.y-t.y1))<10)){cls='info';txt=`${G('tarp')} TIE UP THE TARP`;}
    else if(tutOk('net')&&POOLS.some(pl=>pl.cnt>0&&pl.lot===curLot&&!pl.lot.done&&Math.hypot(Math.max(pl.x0-P.x,0,P.x-pl.x1),Math.max(pl.y0-P.y,0,P.y-pl.y1))<14)){cls='info';txt='LEAVES STUCK IN THE POOL  ·  FISH THEM OUT WITH THE NET';}
    else if(nearPkg()&&!bundle&&nearPkg().far){cls='swap';txt=`${G('use')} PICK UP THE PACKAGE`;}
    else if(nearPkg()&&!bundle){cls='info';txt=`${G('use')} PICK UP THE PACKAGE`;}
    else if(hour>=21){const m=Math.ceil((DAY_END-hour)*60);cls='dead';txt=`DAY ENDS IN ${m} MINUTE${m===1?'':'S'}`;}
  }
  setIf('pcls',cls,v=>{E('prompt').className=v;});
  setIf('ptxt',txt,v=>{E('ptext').innerHTML=v;});
  // the goals panel: on your own (or online) in this view; in split screen only on player 2's half
  const gShow=!TUT.on&&(state==='play'||state==='menu'||state==='closeout')&&(!split()||HV===views[1]);
  setIf('gShow',gShow,v=>{E('goals').style.display=v?'block':'none';});
  if(gShow){const gc=HV.cache;
    // under the menu button (and the online badge when there is one), or under this half's battery panel
    const top=split()?Math.round(E('hud').getBoundingClientRect().bottom+12):NET.role?112:76;setIf('gTop',top,v=>{E('goals').style.top=v+'px';});
    if((gc.goalT=(gc.goalT||0)-dt)<=0){gc.goalT=.25;
      const rows=NET.role==='guest'?NET.gl||[]:goalRows(cur);
      setIf('gHTML',goalsHTML(rows,GOALS.ui.open)+glyphStyle(),v=>{E('goals').innerHTML=goalsHTML(rows,GOALS.ui.open);});}}
}
