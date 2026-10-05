'use strict';
// ============================================================ custom yards (editor layouts, local lot frame)
// (v1 yards were drawn for the old eight houses, which have all changed size and place)
const YARD_KEY='rakingitin-yards-v2';
let YARDS={};try{YARDS=JSON.parse(localStorage.getItem(YARD_KEY))||{};}catch(e){YARDS={};}
// joining an online game whose host has custom yards: use theirs for this visit (never saved over yours)
try{const ov=sessionStorage.getItem('curbNetYards');if(ov&&location.hash.startsWith('#join='))YARDS=JSON.parse(ov);}catch(e){}
const YARD_TYPES={mulch:1,natural:1,garden:1,patio:1,pool:1,drive:1,path:1};
// turn a rough editor rectangle into the real thing: clamp to the yard, keep it off the house,
// snap beds into corners / onto fence lines, and run paving out to the street
function resolveYardRect(L,it){
  const {w,d}=L,h=L.lhouse,paved=it.t==='drive'||it.t==='path',M=14;
  let x0=clamp(Math.round(Math.min(it.x0,it.x1)),6,w-6),x1=clamp(Math.round(Math.max(it.x0,it.x1)),6,w-6);
  let y0=clamp(Math.round(Math.min(it.y0,it.y1)),6,d),y1=clamp(Math.round(Math.max(it.y0,it.y1)),6,d);
  if(paved){
    if(y1>d-30)y1=d;
    if(x0<h.x1&&x1>h.x0&&y0<h.y1+16&&y0>h.y0)y0=h.y1+(it.t==='path'?6:0);
  }
  // push out of the house the shortest way
  const gap=paved?0:3;
  if(x0<h.x1+gap&&x1>h.x0-gap&&y0<h.y1+gap&&y1>h.y0-gap){
    const o=[[x1-(h.x0-gap),'l'],[(h.x1+gap)-x0,'r'],[y1-(h.y0-gap),'t'],[(h.y1+gap)-y0,'b']].sort((a,b)=>a[0]-b[0])[0][1];
    if(o==='l')x1=h.x0-gap;else if(o==='r')x0=h.x1+gap;else if(o==='t')y1=h.y0-gap;else y0=h.y1+gap;
  }
  if(x1-x0<6||y1-y0<6)return null;
  if(it.t==='pool'&&(x1-x0<COPE*2+14||y1-y0<COPE*2+10))return null;
  const z={x0,y0,x1,y1};
  if(it.t==='mulch'||it.t==='natural'){
    const l=x0<=6+M,r=x1>=w-6-M,t=y0<=6+M,b=y1>=d-M;
    if(l)z.x0=6;if(r)z.x1=w-6;if(t)z.y0=6;if(b)z.y1=d;
    const zw=z.x1-z.x0,zh=z.y1-z.y0,strip=Math.max(zw,zh)/Math.min(zw,zh)>2.6;
    if((l!==r)&&(t!==b)&&!strip&&!it.sq){z.shape='q';z.ax=l?6:w-6;z.ay=t?6:d;}
  }
  return z;
}
// a drawn fence runs straight along whichever way it was dragged furthest, 6px thick
function fenceRect(L,it){const dx=it.x1-it.x0,dy=it.y1-it.y0;
  if(Math.abs(dx)>=Math.abs(dy)){const y=clamp(Math.round(it.y0)-3,0,L.d-6);return{x0:clamp(Math.round(Math.min(it.x0,it.x1)),0,L.w),x1:clamp(Math.round(Math.max(it.x0,it.x1)),0,L.w),y0:y,y1:y+6};}
  const x=clamp(Math.round(it.x0)-3,0,L.w-6);return{x0:x,x1:x+6,y0:clamp(Math.round(Math.min(it.y0,it.y1)),0,L.d),y1:clamp(Math.round(Math.max(it.y0,it.y1)),0,L.d)};}
function applyYard(L,items){
  const s=L.style;L.lpaved=[];L.lz=[];L.lcars=[];L.ltrees=[];L.lpots=[];L.lshrubs=[];L.gates=[];L.lprops=[];L.lstructs=[];L.lfences=L.lfences.filter(f=>!f.custom);
  for(const it of items){
    if(it.t==='fence'){const f=fenceRect(L,it);if(f.x1-f.x0>=6&&f.y1-f.y0>=6&&!rectsHit(f,L.lhouse))L.lfences.push({...f,custom:true});continue;}
    if(it.t==='shrub'){if(!inRect(L.lhouse,it.x,it.y,it.r))L.lshrubs.push({x:Math.round(it.x),y:Math.round(it.y),r:it.r});continue;}
    if(it.t==='tree'){if(!inRect(L.lhouse,it.x,it.y,4))L.ltrees.push({x:Math.round(it.x),y:Math.round(it.y),r:it.r,pal:it.pal,rate:.22+s*.1});continue;}
    if(it.t==='pot'){if(!inRect(L.lhouse,it.x,it.y,3))L.lpots.push(makePot(it.x,it.y,it.big));continue;}
    if(it.t==='struct'){L.lstructs.push({k:it.k,x0:Math.round(it.x0),y0:Math.round(it.y0),x1:Math.round(it.x1),y1:Math.round(it.y1)});continue;}
    if(it.t==='prop'){(L.lprops||(L.lprops=[])).push({k:it.k,x:Math.round(it.x),y:Math.round(it.y)});continue;}
    if(it.t==='gate'){L.gates.push({x0:Math.round(it.x0),x1:Math.round(it.x1),y:Math.round(it.y)});continue;}
    if(it.t==='car'){L.lcars.push({cx:it.x,cy:it.y,vert:!!it.vert,dir:it.dir||1,col:carCol(L.hood,hash(it.x+L.k*31,it.y*7))});continue;}
    if(!YARD_TYPES[it.t])continue;
    const z=resolveYardRect(L,it);if(!z)continue;
    if(it.t==='drive'||it.t==='path'){L.lpaved.push({...z,kind:it.t});continue;}
    // a round pool fills its box as an ellipse (and stands above the ground, with a wall round it instead of a deck)
    // round ones fill their box as an ellipse: a round pool stands above the ground with a wall instead of a deck
    // (unless it's set into the ground, like a fountain), and a round patio is just round
    if(it.round){L.lz.push({...z,shape:'e',cx:(z.x0+z.x1)/2,cy:(z.y0+z.y1)/2,rx:(z.x1-z.x0)/2,ry:(z.y1-z.y0)/2,type:it.t,good:it.t==='mulch'||it.t==='natural',above:it.t==='pool'&&!it.inground,mat:it.mat,fl:!!it.fl});continue;}
    L.lz.push({shape:'r',...z,type:it.t,good:it.t==='mulch'||it.t==='natural',fl:!!it.fl,mat:it.mat});
  }
  // park a car or two on any driveway long enough to hold one (unless the yard says where they go)
  if(!L.lcars.length)for(const p of L.lpaved){if(p.kind!=='drive')continue;
    const pw=p.x1-p.x0,ph=p.y1-p.y0,vert=ph>=pw,len=vert?ph:pw,wid=vert?pw:ph,hv=hash(p.x0*7+L.k,p.y0*13);
    if(len<44||wid<18||hv<.15)continue;
    const n=wid>=46?2:1;
    for(let i=0;i<n;i++){const col=carCol(L.hood,hash(i+p.x0,p.y1+L.k)),off=n===2?(i?.73:.27):.5;
      L.lcars.push(vert?{cx:p.x0+pw*off,cy:p.y0+20,vert:true,dir:-1,col}:{cx:p.x0+22,cy:p.y0+ph*off,vert:false,dir:1,col});}
  }
}
function yardFromLot(L){
  return[...L.lpaved.map(p=>({t:p.kind==='path'?'path':'drive',x0:p.x0,y0:p.y0,x1:p.x1,y1:p.y1})),
    ...L.lz.filter(z=>z.shape!=='e'||z.x0!=null).map(z=>({t:z.type,x0:z.x0,y0:z.y0,x1:z.x1,y1:z.y1,fl:!!z.fl,...(z.shape==='e'?{round:true,...(z.type==='pool'&&!z.above?{inground:true}:{})}:{}),...(z.mat?{mat:z.mat}:{}),...(z.shape==='r'&&z.good?{sq:true}:{})})),
    ...(L.gates||[]).map(g=>({t:'gate',x0:g.x0,x1:g.x1,y:g.y})),...(L.lprops||[]).map(q=>({t:'prop',k:q.k,x:q.x,y:q.y})),...(L.lstructs||[]).map(q=>({t:'struct',...q})),
    ...L.ltrees.map(t=>({t:'tree',x:t.x,y:t.y,r:t.r,pal:t.pal})),
    ...L.lpots.map(p=>({t:'pot',x:p.x,y:p.y,big:p.big})),
    ...(L.lshrubs||[]).map(b=>({t:'shrub',x:b.x,y:b.y,r:b.r})),
    ...L.lfences.filter(f=>f.custom).map(f=>f.x1-f.x0>=f.y1-f.y0?{t:'fence',x0:f.x0,y0:f.y0+3,x1:f.x1,y1:f.y0+3}:{t:'fence',x0:f.x0+3,y0:f.y0,x1:f.x0+3,y1:f.y1})];
}
