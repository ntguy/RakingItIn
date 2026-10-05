'use strict';
// ============================================================ goals
// A list of things to try, in roughly this order (each lands within a place or so of its spot, shuffled once per save).
// Three are on the go at a time; finishing one pays out (more the further down the list) and the next one takes its
// place. Everyone shares the list, and in co-op a few of them ask for more. Running totals count from when the goal
// shows up. A house symbol means "finish a house (get paid at 50% or better)", with the percentage when it's more
const MILE_PX=9000,GOAL_SLOTS=3,STEAL_PAY=50,REP_STEAL=10,GOAL_UI_KEY='rakingitin-goals-ui-v1';
const HICON=()=>pxIcon('house',1.5).replace('class="px pxi"','class="px pxi gi"');
const BLU_ICON=()=>pxIcon('blu',1.5).replace('class="px pxi"','class="px pxi gi"');
// per house, today: blown at low speed, blown at high speed, raked (by anyone)
const UL=new Uint8Array(256),UH=new Uint8Array(256),UR=new Uint8Array(256);
let playT=0;
// why a house can't count toward a goal right now ('' if it still can)
const usedWhy=(L,lo,hi,rk)=>lo&&UL[L.k]?'LOW SPEED USED':hi&&UH[L.k]?(lo?'BLOWER USED':'HIGH SPEED USED'):rk&&UR[L.k]?'RAKE USED':'';
const GOAL_DEFS=[
  {id:'rake50',pct:.5,txt:()=>`${HICON()} USING ONLY THE RAKE`,why:L=>usedWhy(L,1,1,0)},
  // (the three tarp goals kept the ids from when they asked for 100/200/300, so older saves still line up)
  {id:'tarp100',n:200,best:'tarp',txt:n=>`TIE ${n} LEAVES IN ONE TARP`},
  {id:'h90',pct:.9,txt:()=>`${HICON()}90%`},
  {id:'pkg3',n:3,co:5,txt:n=>`BRING ${n} PACKAGES TO THEIR DOORS`},
  {id:'pool',pool:1,txt:()=>'CLEAR EVERY LEAF FROM A POOL'},
  {id:'high50',pct:.5,txt:()=>`${HICON()} USING ONLY HIGH SPEED`,why:L=>usedWhy(L,1,0,1)},
  {id:'batt3',n:3,co:5,txt:n=>`USE ${n} FULL BATTERIES OF CHARGE`,num:(v,n)=>`${Math.floor(v*100)}% / ${n*100}%`},
  {id:'rake90',pct:.9,txt:()=>`${HICON()}90% USING ONLY THE RAKE`,why:L=>usedWhy(L,1,1,0)},
  {id:'bed200',n:200,best:'bed',txt:n=>`${n} LEAVES IN ONE MULCH BED`},
  {id:'fast',pct:.5,secs:20,co:15,txt:n=>`${HICON()} IN UNDER ${n} SECONDS`},
  {id:'two90',n:2,co:4,txt:n=>`${n} &times; ${HICON()}90% IN ONE DAY`,day:1},
  {id:'mile',n:1,txt:()=>'DRIVE 1 MILE',num:(v,n)=>`${v.toFixed(2)} / ${n} MI`},
  {id:'tarp200',n:300,best:'tarp',txt:n=>`TIE ${n} LEAVES IN ONE TARP`},
  {id:'late',pct:.5,txt:()=>`${HICON()} STARTED AFTER 8PM`},
  {id:'dep1000',n:1000,co:2000,txt:n=>`PUT ${n.toLocaleString('en-US')} LEAVES IN THE TRUCK`},
  {id:'steal',n:1,txt:()=>'STEAL A PACKAGE',num:()=>'TAKE ONE TO THE TRUCK BED'},
  {id:'low10',pct:.5,txt:()=>`${HICON()} WITH UNDER 10 LEAVES IN MULCH BEDS`},
  {id:'blu',n:1,txt:()=>`MAKE ${BLU_ICON()} BLU RUN`,num:()=>''},
  {id:'even',pct:.5,txt:()=>`${HICON()} WITH EVERY MULCH BED WITHIN 10 LEAVES`},
  {id:'fill10',n:10,co:20,txt:n=>`FILL THE RAKE ${n} TIMES`},
  {id:'nopots',txt:()=>'BREAK NO FLOWERPOTS TODAY',day:1},
  {id:'tarp300',n:400,best:'tarp',txt:n=>`TIE ${n} LEAVES IN ONE TARP`},
  {id:'norake90',pct:.9,txt:()=>`${HICON()}90% WITHOUT THE RAKE`,why:L=>usedWhy(L,0,0,1)},
  {id:'push200',n:200,best:'push',txt:n=>`PUSH ${n} LEAVES AT ONCE`,avail:()=>players.some(pl=>(pl.upg.rakeshovel||0)>0)},
  {id:'bed500',n:500,best:'bed',txt:n=>`${n} LEAVES IN ONE MULCH BED`},
  {id:'nopot5',n:5,txt:n=>`${n} &times; ${HICON()} WITHOUT BREAKING A POT`},
  {id:'pool200',n:200,pool:2,txt:n=>`GET ${n} LEAVES IN A POOL, THEN CLEAN IT`},
];
GOAL_DEFS.forEach((g,i)=>{g.i=i;g.pay=Math.round((50+450*i/(GOAL_DEFS.length-1))/10)*10;});
const GDEF=Object.fromEntries(GOAL_DEFS.map(g=>[g.id,g]));
const GOALS={order:[],done:[],act:[],prog:{},fresh:[],ui:{open:true}};
try{Object.assign(GOALS.ui,JSON.parse(localStorage.getItem(GOAL_UI_KEY))||{});}catch(e){}
const goalN=g=>g.secs?(coop()&&g.co?g.co:g.secs):coop()&&g.co?g.co:g.n;
const goalOn=id=>!TUT.on&&NET.role!=='guest'&&GOALS.act.includes(id);
// a fresh shuffle for a new game, or what the save had
function goalsLoad(sv){
  const ids=GOAL_DEFS.map(g=>g.id);
  if(sv&&Array.isArray(sv.order)&&sv.order.length===ids.length&&sv.order.every(id=>GDEF[id])){
    GOALS.order=sv.order.slice();GOALS.done=(sv.done||[]).filter(id=>GDEF[id]);GOALS.act=(sv.act||[]).filter(id=>GDEF[id]&&!GOALS.done.includes(id));GOALS.prog={...(sv.prog||{})};}
  else{GOALS.order=GOAL_DEFS.map(g=>[g.id,g.i+(rnd()-.5)*2.6]).sort((a,b)=>a[1]-b[1]).map(e=>e[0]);GOALS.done=[];GOALS.act=[];GOALS.prog={};}
  GOALS.fresh=[];goalFill();
}
const goalsSave=()=>({order:GOALS.order,done:GOALS.done,act:GOALS.act,prog:GOALS.prog});
// top the list back up to three, skipping any that can't happen yet (they wait their turn)
function goalFill(){
  for(const id of GOALS.order){if(GOALS.act.length>=GOAL_SLOTS)break;
    if(GOALS.done.includes(id)||GOALS.act.includes(id))continue;const g=GDEF[id];if(g.avail&&!g.avail())continue;
    GOALS.act.push(id);GOALS.prog[id]=0;}
}
function goalDone(id){
  const g=GDEF[id];if(!goalOn(id))return;
  GOALS.act.splice(GOALS.act.indexOf(id),1);GOALS.done.push(id);delete GOALS.prog[id];
  earn(g.pay);today.goalEarn=(today.goalEarn||0)+g.pay;today.goals=(today.goals||0)+1;
  GOALS.fresh.push({id,until:performance.now()+2600});
  const who=cur&&onFoot(cur)?cur.P:{x:TR.x,y:TR.y};
  floatText(who.x,who.y-24,`GOAL! +${fmt$(g.pay)}`,'#ffcf4a',true);chaChing();setTimeout(()=>blip(1568,.3,'square',.045),260);rumble(.2,.6,160);
  goalFill();
}
// running totals, and bests (the biggest single tarp, bed, push...)
function goalAdd(id,v){if(!goalOn(id))return;GOALS.prog[id]=(GOALS.prog[id]||0)+v;if(GOALS.prog[id]>=goalN(GDEF[id])-1e-9)goalDone(id);}
function goalBest(id,v){if(!goalOn(id))return;if(v>(GOALS.prog[id]||0))GOALS.prog[id]=v;if(v>=goalN(GDEF[id]))goalDone(id);}
// a house just paid up
function goalsHouse(L,pct){
  if(pct>=.9)today.h90=(today.h90||0)+1;
  goalBest('two90',today.h90||0);
  if(pct>=.5&&!L.potsBroken)goalAdd('nopot5',1);
  for(const id of GOALS.act.slice()){const g=GDEF[id];if(!g.pct||pct<g.pct)continue;if(houseWhy(g,L,true))continue;goalDone(id);}
}
// why this house won't count toward a house goal ('' if it will, as things stand). final: it's being paid right now
function houseWhy(g,L,final){
  if(g.why){const w=g.why(L);if(w)return w;}
  if(g.secs){const t=L.startT==null?0:playT-L.startT;if(t>goalN(g))return'TOO SLOW';}
  if(g.id==='late'){if(L.startH==null?hour<LATE_HOUR:L.startH<LATE_HOUR)return L.startH==null||final?'START IT AFTER 8PM':'STARTED BEFORE 8PM';}
  if(g.id==='low10'){const n=mulchCounts(L).reduce((a,v)=>a+v,0);if(n>=10)return`${n} IN MULCH`;}
  if(g.id==='even'){const c=mulchCounts(L);if(c.length<2)return'NEEDS 2+ MULCH BEDS';const sp=Math.max(...c)-Math.min(...c);if(sp>10)return`BEDS ${sp} APART`;}
  return'';
}
// leaves sitting in each house's mulch beds, recounted a few times a second
let BEDC=[],bedT=0,tarpLive=0;
function countBeds(){
  BEDC=LOTS.map(L=>L.zones.map(()=>0));
  // and, in the same pass, the leaves lying on each tarp that's down (what tying it up would bundle)
  const DT=tarps.filter(t=>t.st==='down'),tn=DT.map(()=>0),nT=DT.length,nL=LOTS.length;
  for(let i=0;i<N;i++){const st=ST[i];if(st>1||LZ[i]>3)continue;const x=LX[i],y=LY[i];
    if(nT&&st===0&&LZ[i]<4)for(let q=0;q<nT;q++){const t=DT[q];if(x>=t.x0&&x<t.x1&&y>=t.y0&&y<t.y1)tn[q]++;}
    if(x<0||y<0||x>=WORLD_W||y>=H)continue;const p=(y|0)*WORLD_W+(x|0),li=LOT_AT[p],q=ZONE_AT[p];if(li<0||li>=nL||q<0)continue;
    if(LOTS[li].zones[q].type==='mulch')BEDC[li][q]++;}
  tarpLive=nT?Math.max(...tn):0;
}
const mulchCounts=L=>(BEDC[L.li]||[]).filter((_,q)=>L.zones[q].type==='mulch');
// every frame of play: who's started which house, beds, pools
function goalsTick(dt){
  playT+=dt;
  for(const pl of players){if(!onFoot(pl))continue;const li=LOT_AT[(pl.P.y|0)*WORLD_W+(pl.P.x|0)];if(li>=0&&li<LOTS.length){const L=LOTS[li];if(L.startT==null&&!L.done){L.startT=playT;L.startH=hour;}}}
  if((bedT-=dt)<=0){bedT=.3;countBeds();let best=0;for(const c of BEDC)for(const v of c)best=Math.max(best,v);goalBest('bed200',best);goalBest('bed500',best);}
  for(const pl of POOLS){
    if(goalOn('pool')){if(pl.cnt>0)pl.gHad=true;else if(pl.gHad)goalDone('pool');}
    if(goalOn('pool200')){pl.gPeak=Math.max(pl.gPeak||0,pl.cnt);if(pl.gPeak>=goalN(GDEF.pool200)&&pl.cnt===0)goalDone('pool200');}}
  // the shovel rake turns up later: let its goal in once someone has one
  if(GOALS.act.length<GOAL_SLOTS)goalFill();
}
// the end of the day: anything that needed the whole day
function goalsDayEnd(){if(goalOn('nopots')&&!today.pots&&today.houses>0)goalDone('nopots');}
function goalsDayStart(){poolRecount=true;UL.fill(0);UH.fill(0);UR.fill(0);for(const L of LOTS){L.startT=null;L.startH=null;}for(const p of POOLS){p.gHad=false;p.gPeak=0;}BEDC=[];bedT=0;tarpLive=0;}
// what each active goal's line in the panel shows, as seen by one player: progress 0..1, the number, and whether
// the house they're at has already ruled itself out
function goalRows(pl){
  const L=pl?(pl.driving||pl.riding?null:lotAtPoint(pl.P.x,pl.P.y,0)):null,st=L&&!L.done?lotStats(L):null,now=performance.now();
  const rows=GOALS.act.map(id=>{const g=GDEF[id],n=goalN(g),v=GOALS.prog[id]||0;let f=0,num='',bad='';
    if(g.pct){if(L&&L.done)num='PAID';else if(L&&lotLocked(L))bad='NOT HIRING YET';else if(st){f=st.pct/g.pct;num=Math.round(st.pct*100)+'%';bad=houseWhy(g,L,false);
        if(g.secs&&!bad)num=`${Math.floor(L.startT==null?0:playT-L.startT)}S / ${n}S · `+num;}
      else num='AT A HOUSE';}
    else if(g.best==='tarp'){const b=Math.max(v,tarpLive);f=b/n;num=`${b} / ${n}`;}
    else if(g.best){f=v/n;num=`${v} / ${n}`;if(g.best==='bed'&&L&&BEDC[L.li]){const m=Math.max(0,...mulchCounts(L));if(m>v){f=m/n;num=`${m} / ${n}`;}}}
    else if(g.pool){const pp=POOLS.filter(p=>L&&p.lot===L),p=pp[0];
      if(!p)num='AT A POOL';else if(g.pool===2&&(p.gPeak||0)<n){f=p.cnt/n;num=`${p.cnt} / ${n}`;}else{f=p.cnt?1-p.cnt/Math.max(p.cnt,p.gPeak||0,1):1;num=`${p.cnt} LEFT`;}}
    else if(id==='nopots'){f=clamp((hour-DAY_START)/(DAY_END-DAY_START),0,1);if(today.pots)bad='BROKE ONE · TRY TOMORROW';else num=today.houses?'NONE YET':'FINISH A HOUSE TOO';}
    else if(g.day){f=(today.h90||0)/n;num=`${today.h90||0} / ${n}`;}
    else{f=v/n;num=g.num?g.num(v,n):`${Math.floor(v)} / ${n}`;}
    return{id,txt:g.txt(n),f:bad?Math.max(f,.04):clamp(f,0,1),num,bad,pay:g.pay};});
  for(let k=GOALS.fresh.length-1;k>=0;k--){const fr=GOALS.fresh[k];if(now>fr.until){GOALS.fresh.splice(k,1);continue;}const g=GDEF[fr.id];rows.unshift({id:fr.id,txt:g.txt(goalN(g)),f:1,num:'DONE!',bad:'',pay:g.pay,done:1});}
  return rows;
}
function goalsHTML(rows,open){
  const k=`<span class="gk">${glyphInner('goals')} TO ${open?'COLLAPSE':'EXPAND'}</span>`;
  const left=GOAL_DEFS.length-GOALS.done.length;
  if(!rows.length)return`<div class="gh"><b>GOALS</b>${k}</div><div class="gsub">${left?'NOTHING TO DO YET':'ALL GOALS DONE!'}</div>`;
  if(!open)return`<div class="gh"><b>GOALS</b>${k}</div><div class="gmini">${rows.map(r=>`<i class="${r.done?'ok':r.bad?'bad':''}"><b style="width:${(r.f*100).toFixed(1)}%"></b></i>`).join('')}</div>`;
  return`<div class="gh"><b>GOALS</b>${k}</div>`+rows.map(r=>`<div class="grow${r.done?' done':''}${r.bad?' bad':''}"><div class="gt"><span class="gx">${r.done?'&#10003; ':''}${r.txt}</span><span class="gp">${fmt$(r.pay)}</span></div>
    <div class="gbar"><b style="width:${(r.f*100).toFixed(1)}%"></b></div>${r.bad||r.num?`<div class="gn">${r.bad||r.num}</div>`:''}</div>`).join('');
}
function toggleGoals(){if(TUT.on)return;GOALS.ui.open=!GOALS.ui.open;try{localStorage.setItem(GOAL_UI_KEY,JSON.stringify(GOALS.ui));}catch(e){}blip(GOALS.ui.open?620:480,.04,'square',.04);for(const v of views)v.cache.goalT=0;}
