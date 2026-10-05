'use strict';
// ============================================================ tutorial
// One goal at a time, shown top right. Things the player hasn't been shown yet stay locked (the blower speeds, the
// door, the truck, the tarp, the rake and the net), so it's always clear what to try next
const TUT={on:TUTORIAL,i:0,flashT:0,moved:0,turned:0,lastA:null,lo:0,hi:0,ev:{},pct:0,pctT:0,modal:null};
const tutEv=k=>{if(TUT.on)TUT.ev[k]=true;};
// where to park at the second house: the curb lane along its frontage, on the right coming round the corner
const tutPark=()=>{const L=LOTS[1];return{x:XC-38,y:(L.y0+L.y1)/2};};
const tutParked=()=>Math.hypot(TR.x-tutPark().x,TR.y-tutPark().y)<40&&Math.abs(TR.v)<3&&!illegalPark();
const TUT_STEPS=[
  {id:'move',text:()=>`MOVE WITH ${G('ls')}`,done:()=>TUT.moved>70},
  {id:'turn',text:()=>`TURN WITH ${G('rs')}`,done:()=>TUT.turned>Math.PI*.75},
  {id:'lo',text:()=>`LOW SPEED: HOLD ${G('low')}`,done:()=>TUT.lo>.5},
  {id:'hi',text:()=>`HIGH SPEED: HOLD ${G('high')}`,done:()=>TUT.hi>.5},
  {id:'mulch',text:()=>'BLOW 50% OF THE LEAVES INTO THE MULCH BED',sub:()=>`${Math.round(TUT.pct*100)}% · DON'T BREAK THE FLOWERPOTS!`,done:()=>TUT.pct>=.5,
    at:()=>{const z=LOTS[0].zones.find(z=>z.type==='mulch');return z&&{x:(z.x0+z.x1)/2,y:(z.y0+z.y1)/2};}},
  {id:'knock',text:()=>`KNOCK ON THE DOOR ${G('use')} TO GET PAID`,done:()=>LOTS[0].done,at:()=>({x:LOTS[0].door.x,y:LOTS[0].door.y+4}),after:()=>tutModal('rep')},
  {id:'truck',text:()=>'RETURN TO THE TRUCK',done:()=>!!truckPart(),at:()=>({x:TR.x,y:TR.y})},
  {id:'swap',text:()=>`SWAP BATTERY AT THE BACK ${G('use')}`,enter:()=>{battery=Math.min(battery,capacity()*.8);},done:()=>TUT.ev.swap,
    at:()=>{const [x,y]=fromTruck(-TRUCK_HL-4,0);return{x,y};}},
  {id:'drive',text:()=>`GET IN THE FRONT ${G('use')} AND DRIVE`,done:()=>driving,at:()=>{const [x,y]=fromTruck(TRUCK_HL-6,0);return{x,y};}},
  {id:'park',text:()=>`DRIVE ROUND THE CORNER TO ${LOTS[1].name}`,sub:()=>driving&&Math.abs(TR.v)<3&&Math.hypot(TR.x-tutPark().x,TR.y-tutPark().y)<60&&illegalPark()?'PULL INTO THE LANE BY THE CURB':'PARK IN THE CURB LANE TO AVOID A TICKET',
    done:()=>driving&&tutParked(),at:tutPark,spot:true},
  {id:'out',text:()=>`GET OUT ${G('use')}`,done:()=>!driving},
  {id:'tarp',text:()=>`THROW A TARP ${G('tarp')}`,done:()=>tarps.some(t=>t.st==='down')},
  {id:'rake',text:()=>`SWITCH TO THE RAKE ${G('rake')}`,done:()=>cur.raking},
  {id:'fill',text:()=>'PULL THE RAKE THROUGH LEAVES',sub:()=>`${cur.rakeN} / ${rakeCap(cur)}`,done:()=>cur.raking&&cur.rakeN>=rakeCap(cur)},
  {id:'dump',text:()=>`EMPTY THE RAKE ONTO THE TARP ${G('tarp')}`,done:()=>TUT.ev.rakeDump,at:()=>{const t=tarps.find(t=>t.st==='down');return t&&{x:(t.x0+t.x1)/2,y:(t.y0+t.y1)/2};}},
  {id:'net',text:()=>`PICK UP THE POOL NET ${G('use')}`,done:()=>!!heldNet,at:()=>{const n=LOTS[1].nets[0];return n&&{x:n.x+Math.cos(n.a)*NET_STICK/2,y:n.y+Math.sin(n.a)*NET_STICK/2};}},
  {id:'scoop',text:()=>'SWEEP THE NET THROUGH THE POOL',sub:()=>`${heldNet?heldNet.n:0} / 10 LEAVES`,done:()=>!!heldNet&&heldNet.n>=10},
  {id:'netdump',text:()=>`EMPTY THE NET ONTO THE TARP ${G('tarp')}`,done:()=>TUT.ev.netDump,at:()=>{const t=tarps.find(t=>t.st==='down');return t&&{x:(t.x0+t.x1)/2,y:(t.y0+t.y1)/2};}},
  {id:'tie',text:()=>heldNet?`PUT THE NET DOWN ${G('use')}`:`TIE UP THE TARP ${G('tarp')}`,done:()=>!!bundle,at:()=>{const t=tarps.find(t=>t.st==='down');return t&&!heldNet&&{x:(t.x0+t.x1)/2,y:(t.y0+t.y1)/2};}},
  {id:'load',text:()=>`LOAD THE TARP INTO THE TRUCK ${G('use')}`,done:()=>TUT.ev.load,at:()=>{const [x,y]=fromTruck(-TRUCK_HL-4,0);return{x,y};}},
];
// which step unlocks each thing
const TUT_UNLOCK={blowLo:'lo',blowHi:'hi',knock:'knock',swap:'swap',drive:'drive',tarp:'tarp',rake:'rake',net:'net',tie:'tie',load:'load'};
function tutOk(f){if(!TUT.on)return true;const k=TUT_STEPS.findIndex(s=>s.id===TUT_UNLOCK[f]);return TUT.i>=k;}
function startTutorial(){
  titleEl.classList.add('hide');ensureAudio();resetDay();hour=9;
  // a few leaves are already floating in the pool, so there's something to net straight away
  const pool=POOLS.find(p=>p.lot===LOTS[1]);
  if(pool)for(let k=0;k<22;k++){const i=addLeaf(pool.x0+2+rnd()*(pool.x1-pool.x0-4),pool.y0+2+rnd()*(pool.y1-pool.y0-4),0,randCol(),1);if(i>=0)ST[i]=3;}
  state='play';document.body.style.cursor='none';tutShow();
}
function exitTutorial(){history.replaceState(null,'',location.pathname+location.search);location.reload();}
function tutUpdate(dt){
  tutArrow();
  if(!TUT.on||TUT.i>=TUT_STEPS.length||state!=='play')return;
  if(TUT.flashT>0){TUT.flashT-=dt;if(TUT.flashT<=0)tutShow();return;}
  // what the current goal is watching for
  if(!driving&&!cur.riding)TUT.moved+=Math.hypot(P.vx,P.vy)*dt;
  const a=Math.atan2(aim.y,aim.x);if(TUT.lastA!=null){let d=a-TUT.lastA;d=((d+Math.PI*3)%(Math.PI*2))-Math.PI;TUT.turned+=Math.abs(d);}TUT.lastA=a;
  if(mode===1&&power>.1)TUT.lo+=dt;if(mode===2&&power>1.05)TUT.hi+=dt;
  if((TUT.pctT-=dt)<=0){TUT.pctT=.25;TUT.pct=lotStats(LOTS[0]).pct;}
  const st=TUT_STEPS[TUT.i];
  if(st.done()){
    // done: flash it green for a moment, then on to the next one
    TUT.i++;TUT.flashT=.8;TUT.moved=TUT.turned=TUT.lo=TUT.hi=0;TUT.lastA=null;TUT.ev={};
    $('tutBox').classList.add('done');$('tutT').innerHTML='&#10003; '+st.text();$('tutS').textContent='';
    blip(660,.07,'square',.05);setTimeout(()=>blip(990,.12,'square',.05),80);rumble(.1,.3,90);
    const nx=TUT_STEPS[TUT.i];if(nx&&nx.enter)nx.enter();
    if(st.after)st.after();
    if(TUT.i>=TUT_STEPS.length)setTimeout(()=>tutModal('end'),900);
    return;
  }
  tutShow();
}
let tutShown='';
// the red arrow points up at the goal box during the first two goals (hidden while a finished one flashes green)
function tutArrow(){
  const a=$('tutArrow'),box=$('tutBox'),on=TUT.on&&TUT.i<2&&TUT.flashT<=0&&state==='play'&&box.style.display!=='none';
  if(a.style.display!==(on?'block':'none'))a.style.display=on?'block':'none';
  if(on){const r=box.getBoundingClientRect(),x=Math.round(r.left+r.width/2)+'px',y=Math.round(r.bottom+8)+'px';if(a.style.left!==x)a.style.left=x;if(a.style.top!==y)a.style.top=y;}
}
function tutShow(){
  const box=$('tutBox');box.style.display=TUT.on&&TUT.i<TUT_STEPS.length?'block':'none';if(box.style.display==='none')return;
  const st=TUT_STEPS[TUT.i],key=TUT.i+'|'+st.text()+'|'+(st.sub?st.sub():'');if(key===tutShown)return;tutShown=key;
  box.classList.remove('done');$('tutL').textContent=`TUTORIAL · ${TUT.i+1} / ${TUT_STEPS.length}`;$('tutT').innerHTML=st.text();$('tutS').innerHTML=st.sub?st.sub():'';
}
// the reputation explainer after the first payday, and the send-off at the end
function tutModal(kind){
  if(kind==='end')$('tutBox').style.display='none';
  TUT.modal=kind;state='tut';dropInputs();document.body.style.cursor='default';
  modalEl.innerHTML=kind==='rep'?`<div class="panel tutpop"><h2>REPUTATION ${STAR_ICON}</h2><div class="rl">
      <div><b class="pos">+</b>GAIN REPUTATION BY FINISHING A HOUSE WITH THE YARD PRISTINE (50/70/90% OF LEAVES CLEANED UP GIVES +10/20/40)</div>
      <div><b class="neg">&minus;</b>BREAKING THINGS, SCARING PEOPLE, LEAVES IN THE ROAD, PARKING TICKETS, NOISE COMPLAINTS</div>
      <div><b>&#9733;</b>BIGGER HOUSES ONLY HIRE YOU AT HIGHER REPUTATION</div>
      <div><b>&#9790;</b>TALLIED EVERY NIGHT</div></div>
      <button class="btn green bounce" id="tutOk">GOT IT ${G('ok')}</button></div>`
    :`<div class="panel tutpop"><h2>YOU'RE READY TO MAKE SOME MONEY!</h2><button class="btn green bounce" id="tutOk">MAIN MENU ${G('ok')}</button></div>`;
  modalEl.classList.remove('hide');$('tutOk').onclick=tutModalOk;
}
function tutModalOk(){if(state!=='tut')return;if(TUT.modal==='end'){exitTutorial();return;}modalEl.classList.add('hide');state='play';document.body.style.cursor='none';TUT.modal=null;}
// a bouncing arrow over whatever the current goal is about (pointing in from the edge when it's off screen),
// and for parking, the outline of the spot
function drawTutMarker(cx,cy){
  if(!TUT.on||TUT.i>=TUT_STEPS.length||TUT.flashT>0||state!=='play')return;
  const st=TUT_STEPS[TUT.i],t=st.at&&st.at();if(!t)return;
  if(st.spot){const a=.45+.35*Math.sin(time*6),x0=Math.round(t.x-cx-13),y0=Math.round(t.y-cy-27);ctx.fillStyle=`rgba(255,207,74,${a.toFixed(2)})`;
    for(let k=0;k<26;k+=2){ctx.fillRect(x0+k,y0,1,1);ctx.fillRect(x0+k,y0+54,1,1);}for(let k=0;k<55;k+=2){ctx.fillRect(x0,y0+k,1,1);ctx.fillRect(x0+26,y0+k,1,1);}}
  const sx=Math.round(t.x-cx),sy=Math.round(t.y-cy-12+Math.sin(time*5)*2);
  if(sx>4&&sx<VW-4&&sy>4&&sy<VH-4){
    for(let k=0;k<6;k++){const w=(6-k)*2+1;ctx.fillStyle='#1a0f0a';ctx.fillRect(sx-w/2-1|0,sy-8+k,w+2,1);}
    for(let k=0;k<5;k++){const w=(5-k)*2+1;ctx.fillStyle='#ffcf4a';ctx.fillRect(sx-(w>>1),sy-8+k,w,1);}
  }else{
    const ex=clamp(sx,14,VW-14),ey=clamp(sy,14,VH-14),dx=sx-ex,dy=sy-ey,dl=Math.hypot(dx,dy)||1;
    ctx.fillStyle='#1a0f0a';pcircle(ctx,ex,ey,7);ctx.fillStyle='#ffcf4a';pcircle(ctx,ex,ey,6);
    ctx.fillStyle='#ffcf4a';for(let k=8;k<13;k++){const w=13-k;ctx.fillRect(Math.round(ex+dx/dl*k-w/2),Math.round(ey+dy/dl*k-w/2),w,w);}
    ctx.fillStyle='#1a0f0a';ctx.fillRect(ex-1,ey-4,2,5);ctx.fillRect(ex-1,ey+2,2,2);
  }
}
