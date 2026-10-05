'use strict';
// ============================================================ yard editor
const ED={k:0,tool:'mulch',all:{},items:[],undo:[],drag:null,hover:-1,can:null,ctx:null,lot:null,layers:null,cans:new Map(),sc:1,ox:0,oy:0,changed:false};
const ED_TOOLS=[['tree','TREE','T','#4a7a32'],['shrub','SHRUB','B','#3f7a34'],['fence','FENCE','L','#b07a48'],['mulch','MULCH','M','#8a6240'],['natural','NATURAL','N','#86a04a'],['garden','GARDEN','G','#ff5f8f'],['patio','PATIO','P','#cfc6b4'],['pool','POOL','O','#3aa2d2'],['pot','FLOWERPOT','F','#d9774a'],['path','SIDEWALK','S','#e8e0d0'],['drive','DRIVEWAY','D','#9a9488'],['erase','ERASE','E','#fe5f55']];
const edCol=t=>(ED_TOOLS.find(x=>x[0]===t)||[0,0,0,'#fff'])[3];
function openEditor(){
  state='editor';titleEl.classList.add('hide');$('editor').classList.remove('hide');document.body.style.cursor='default';
  ED.can=$('ecan');ED.ctx=ED.can.getContext('2d');ED.changed=false;ED.undo=[];
  ED.all={};for(const k in YARDS)ED.all[k]=JSON.parse(JSON.stringify(YARDS[k]));
  $('eHouses').innerHTML='<span class="label">HOUSE</span>'+HOUSES.map((c,i)=>`<button class="ebtn" data-h="${i}" title="${c.name}"><span class="k">${i+1}</span>${c.name.replace('THE ','')}</button>`).join('');
  $('eTools').innerHTML='<span class="label">DRAW</span>'+ED_TOOLS.map(([id,n,k,c])=>`<button class="ebtn" data-t="${id}"><span class="esw" style="background:${c}"></span><span class="k">${k}</span>${n}</button>`).join('');
  $('eHouses').querySelectorAll('[data-h]').forEach(b=>b.onclick=()=>edSelect(+b.dataset.h));
  $('eTools').querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>edTool(b.dataset.t));
  $('eUndo').onclick=edUndo;
  $('eClear').onclick=()=>{edPush();ED.items=ED.items.filter(it=>it.t==='path'&&it.y1>=ED.lot.d-1&&it.x0<ED.lot.ldoor.x&&it.x1>ED.lot.ldoor.x);edCommit();};
  $('eDef').onclick=()=>{edPush();delete ED.all[ED.k];ED.changed=true;edRebuild();};
  $('eCancel').onclick=()=>{if(ED.changed&&!confirm('Throw away your yard changes?'))return;closeEditor();};
  $('eSave').onclick=()=>{YARDS=ED.all;try{localStorage.setItem(YARD_KEY,JSON.stringify(YARDS));}catch(e){}location.reload();};
  edTool(ED.tool);edSelect(ED.k);
}
function closeEditor(){$('editor').classList.add('hide');titleEl.classList.remove('hide');state='title';}
function edTool(t){ED.tool=t;$('eTools').querySelectorAll('[data-t]').forEach(b=>b.classList.toggle('on',b.dataset.t===t));}
function edSelect(k){ED.k=k;ED.undo=[];$('eHouses').querySelectorAll('[data-h]').forEach(b=>b.classList.toggle('on',+b.dataset.h===k));edRebuild();}
function edRebuild(){
  const k=ED.k,cfg=HOUSES[k],custom=ED.all[k]||null;
  const L=makeLot(k,cfg,mulberry(1000+k*7919),false,custom||cfg.yard);
  L.li=k;L.ox=cfg.x;L.oy=cfg.y;
  ED.lot=L;ED.items=custom?custom.slice():Array.isArray(cfg.yard)?cfg.yard.map(o=>({...o})):yardFromLot(L);ED.layers=renderLot(L);
  $('eTag').innerHTML=`#${k+1} ${cfg.name} &middot; ${cfg.tag}<br><span style="color:${custom?'var(--gold)':'#9fb5b8'}">${custom?'CUSTOM YARD':'DEFAULT YARD'}</span>`;
  edLayout();
}
function edLayout(){
  const wr=$('ewrap'),W=wr.clientWidth,Hh=wr.clientHeight;ED.can.width=W;ED.can.height=Hh;
  const L=ED.lot;ED.sc=Math.max(.3,Math.min((W-40)/L.w,(Hh-120)/(L.d+FRONT)));
  ED.ox=Math.round((W-L.w*ED.sc)/2);ED.oy=Math.round((Hh-70-(L.d+FRONT)*ED.sc)/2)+14;edDraw();
}
function edPush(){ED.undo.push({k:ED.k,had:ED.k in ED.all,items:JSON.stringify(ED.items)});if(ED.undo.length>80)ED.undo.shift();}
function edUndo(){const u=ED.undo.pop();if(!u||u.k!==ED.k)return;if(u.had)ED.all[ED.k]=JSON.parse(u.items);else delete ED.all[ED.k];edRebuild();}
function edCommit(){ED.all[ED.k]=ED.items;ED.changed=true;edRebuild();}
function edLocal(e){const r=ED.can.getBoundingClientRect();return[(e.clientX-r.left-ED.ox)/ED.sc,(e.clientY-r.top-ED.oy)/ED.sc];}
function edHit(x,y){
  const L=ED.lot;
  for(let i=ED.items.length-1;i>=0;i--){const it=ED.items[i];
    if(it.t==='car'||it.t==='gate'||it.t==='prop'||it.t==='struct')continue;
    if(it.t==='tree'){if(Math.hypot(x-it.x,y-it.y)<Math.max(8,it.r*.7))return i;continue;}
    if(it.t==='pot'){if(Math.hypot(x-it.x,y-(it.y-3))<(it.big?8:6))return i;continue;}
    if(it.t==='shrub'){if(Math.hypot(x-it.x,y-it.y)<Math.max(6,it.r))return i;continue;}
    if(it.t==='fence'){if(inRect(fenceRect(L,it),x,y,4))return i;continue;}
    const z=resolveYardRect(L,it);if(z&&inZone({shape:'r',...z},x,y))return i;}
  return -1;
}
function edErase(x,y){const i=edHit(x,y);if(i<0)return;edPush();ED.items.splice(i,1);edCommit();}
function edCanopy(t){const key=t.x+','+t.y+','+t.r+','+t.pal;let c=ED.cans.get(key);if(!c){c=makeCanopy(t,t.x*31+t.y*17);ED.cans.set(key,c);}return c;}
function edDraw(){
  const c=ED.ctx,L=ED.lot,sc=ED.sc,ox=ED.ox,oy=ED.oy,W=ED.can.width,Hh=ED.can.height;
  c.imageSmoothingEnabled=false;c.fillStyle='#10171a';c.fillRect(0,0,W,Hh);
  const X=v=>ox+v*sc,Y=v=>oy+v*sc;
  // the street out front, for orientation
  c.fillStyle='#bdb6aa';c.fillRect(X(-30),Y(L.d),(L.w+60)*sc,SWW*sc);
  c.fillStyle='#447a36';c.fillRect(X(-30),Y(L.d+SWW),(L.w+60)*sc,VERGE*sc);
  c.fillStyle='#3b3f46';c.fillRect(X(-30),Y(L.d+SWW+VERGE),(L.w+60)*sc,RH*sc);
  c.fillStyle='#d8d2c6';c.fillRect(X(-30),Y(L.d+SWW+VERGE),(L.w+60)*sc,Math.max(1,sc));
  c.fillStyle='#cfe3e6';c.font=`${Math.max(10,Math.round(9*sc))}px Silkscreen, monospace`;c.textAlign='center';c.fillText('STREET',X(L.w/2),Y(L.d+SWW+VERGE+RH*.7));
  c.drawImage(ED.layers[0],ox,oy,L.w*sc,L.d*sc);
  for(const t of L.ltrees){c.fillStyle='rgba(0,0,0,.28)';c.beginPath();c.ellipse(X(t.x+8),Y(t.y+6),t.r*1.05*sc,t.r*.72*sc,0,0,Math.PI*2);c.fill();}
  c.drawImage(ED.layers[1],ox,oy,L.w*sc,L.d*sc);
  for(const cr of L.lcars){const can=makeCarCached(cr.col);c.save();c.translate(X(cr.cx),Y(cr.cy));c.rotate(cr.vert?(cr.dir>0?Math.PI/2:-Math.PI/2):(cr.dir>0?0:Math.PI));c.drawImage(can,-17*sc,-8*sc,34*sc,16*sc);c.restore();}
  c.globalAlpha=.62;
  for(const t of L.ltrees){const can=edCanopy(t);c.drawImage(can,X(t.x-can.width/2),Y(t.y-12-can.height/2),can.width*sc,can.height*sc);}
  c.globalAlpha=1;
  for(const t of L.ltrees){c.fillStyle='#6b4428';c.beginPath();c.arc(X(t.x),Y(t.y),Math.max(2,4*sc),0,Math.PI*2);c.fill();}
  // nets and pots are drawn with the in-game pixel sprites, in lot pixels
  c.save();c.translate(ox,oy);c.scale(sc,sc);
  for(const n of L.lnets)drawNetSprite(c,n.x,n.y,n.x+Math.cos(n.a)*NET_STICK,n.y+Math.sin(n.a)*NET_STICK,false);
  for(const p of [...L.lpots].sort((a,b)=>a.y-b.y))drawPotSprite(c,p.x,p.y,p,0);
  c.restore();
  // outlines of everything that was drawn, so it's clear what can be erased
  c.lineWidth=Math.max(1,Math.round(sc*.8));
  ED.items.forEach((it,i)=>{if(it.t==='car'||it.t==='gate'||it.t==='prop'||it.t==='struct')return;const hv=i===ED.hover;c.strokeStyle=hv?'#fff':edCol(it.t);c.setLineDash(hv?[]:[4,3]);
    if(it.t==='tree'){c.beginPath();c.arc(X(it.x),Y(it.y),it.r*sc,0,Math.PI*2);c.stroke();return;}
    if(it.t==='pot'){c.beginPath();c.arc(X(it.x),Y(it.y-3),(it.big?8:6)*sc,0,Math.PI*2);c.stroke();return;}
    if(it.t==='shrub'){c.beginPath();c.arc(X(it.x),Y(it.y),it.r*sc,0,Math.PI*2);c.stroke();return;}
    if(it.t==='fence'){const f=fenceRect(L,it);c.strokeRect(X(f.x0)+.5,Y(f.y0)+.5,(f.x1-f.x0)*sc-1,(f.y1-f.y0)*sc-1);return;}
    const z=resolveYardRect(L,it);if(!z)return;
    if(z.shape==='q'){const sx=z.ax===z.x0?1:-1,sy=z.ay===z.y0?1:-1,rw=z.x1-z.x0,rh=z.y1-z.y0;c.beginPath();c.moveTo(X(z.ax),Y(z.ay));
      for(let k=0;k<=16;k++){const a=k/16*Math.PI/2;c.lineTo(X(z.ax+sx*rw*Math.cos(a)),Y(z.ay+sy*rh*Math.sin(a)));}c.closePath();c.stroke();}
    else c.strokeRect(X(z.x0)+.5,Y(z.y0)+.5,(z.x1-z.x0)*sc-1,(z.y1-z.y0)*sc-1);
  });
  c.setLineDash([]);
  const g=ED.drag;
  if(g){const col=edCol(ED.tool);c.strokeStyle=col;c.fillStyle=col+'55';c.lineWidth=2;
    if(ED.tool==='pot'){const big=Math.hypot(g.x1-g.x0,g.y1-g.y0)>=6;c.beginPath();c.arc(X(g.x0),Y(g.y0-3),(big?8:6)*sc,0,Math.PI*2);c.fill();c.stroke();}
    else if(ED.tool==='tree'){const r=Math.max(8,Math.hypot(g.x1-g.x0,g.y1-g.y0));c.beginPath();c.arc(X(g.x0),Y(g.y0),r*sc,0,Math.PI*2);c.fill();c.stroke();}
    else if(ED.tool==='shrub'){const r0=Math.hypot(g.x1-g.x0,g.y1-g.y0),r=r0<3?7:clamp(r0,4,16);c.beginPath();c.arc(X(g.x0),Y(g.y0),r*sc,0,Math.PI*2);c.fill();c.stroke();}
    else if(ED.tool==='fence'){const f=fenceRect(L,g);c.fillRect(X(f.x0),Y(f.y0),(f.x1-f.x0)*sc,(f.y1-f.y0)*sc);c.strokeRect(X(f.x0),Y(f.y0),(f.x1-f.x0)*sc,(f.y1-f.y0)*sc);}
    else{const x=Math.min(g.x0,g.x1),y=Math.min(g.y0,g.y1);c.fillRect(X(x),Y(y),Math.abs(g.x1-g.x0)*sc,Math.abs(g.y1-g.y0)*sc);c.strokeRect(X(x),Y(y),Math.abs(g.x1-g.x0)*sc,Math.abs(g.y1-g.y0)*sc);}}
}
const carCache={};function makeCarCached(col){return carCache[col]||(carCache[col]=makeCar(col));}
// which neighborhood a spot in the street belongs to (by its nearest stretch of road)
function hoodAt(x,y){const qx=clamp(x|0,0,WORLD_W-1),qy=clamp(y|0,0,H-1),n=NEAR[qy*WORLD_W+qx];return n<ROADS.length?ROADS[n].hood:CIRCLES[n-ROADS.length].hood;}
{
  const cv=document.getElementById('ecan');
  cv.addEventListener('mousedown',e=>{if(state!=='editor')return;const [x,y]=edLocal(e);
    if(e.button===2||ED.tool==='erase'){edErase(x,y);return;}
    if(e.button===0)ED.drag={x0:x,y0:y,x1:x,y1:y};});
  addEventListener('mousemove',e=>{if(state!=='editor'||!ED.lot)return;const [x,y]=edLocal(e);
    if(ED.drag){ED.drag.x1=x;ED.drag.y1=y;}else ED.hover=edHit(x,y);edDraw();});
  addEventListener('mouseup',e=>{if(state!=='editor'||!ED.drag)return;const g=ED.drag;ED.drag=null;const L=ED.lot,t=ED.tool;
    if(g.x0<-10||g.y0<-10||g.x0>L.w+10||g.y0>L.d+10){edDraw();return;}
    edPush();
    if(t==='tree'){let r=Math.hypot(g.x1-g.x0,g.y1-g.y0);if(r<8)r=22+L.style*3.5;
      if(inRect(L.lhouse,g.x0,g.y0,4)){ED.undo.pop();edDraw();return;}
      ED.items.push({t:'tree',x:Math.round(g.x0),y:Math.round(g.y0),r:Math.round(clamp(r,12,60)),pal:(Math.random()*4)|0});}
    else if(t==='shrub'){const x=Math.round(g.x0),y=Math.round(g.y0);let r=Math.hypot(g.x1-g.x0,g.y1-g.y0);r=r<3?7:Math.round(clamp(r,4,16));
      if(inRect(L.lhouse,x,y,r)||L.lz.some(z=>z.type==='pool'&&inRect(z,x,y,r))){ED.undo.pop();edDraw();return;}
      ED.items.push({t:'shrub',x,y,r});}
    else if(t==='fence'){if(Math.hypot(g.x1-g.x0,g.y1-g.y0)<8){ED.undo.pop();edDraw();return;}
      ED.items.push({t:'fence',x0:Math.round(g.x0),y0:Math.round(g.y0),x1:Math.round(g.x1),y1:Math.round(g.y1)});}
    else if(t==='pot'){const x=Math.round(g.x0),y=Math.round(g.y0);
      if(inRect(L.lhouse,x,y,3)||x<8||x>L.w-8||y<8||y>L.d-2||L.lz.some(z=>z.type==='pool'&&inRect(z,x,y,1))){ED.undo.pop();edDraw();return;}
      ED.items.push({t:'pot',x,y,big:Math.hypot(g.x1-g.x0,g.y1-g.y0)>=6});}
    else{let {x0,y0,x1,y1}=g;
      if(Math.abs(x1-x0)<8&&Math.abs(y1-y0)<8){const [dw,dh]=t==='path'?[10,40]:t==='drive'?[32,60]:t==='pool'?[72,46]:[44,30];x0-=dw/2;x1=x0+dw;y0-=dh/2;y1=y0+dh;}
      const it={t,x0:Math.round(Math.min(x0,x1)),y0:Math.round(Math.min(y0,y1)),x1:Math.round(Math.max(x0,x1)),y1:Math.round(Math.max(y0,y1))};
      if(!resolveYardRect(L,it)){ED.undo.pop();edDraw();return;}
      ED.items.push(it);}
    edCommit();});
  addEventListener('keydown',e=>{if(state!=='editor')return;
    if((e.metaKey||e.ctrlKey)&&e.code==='KeyZ'){e.preventDefault();edUndo();return;}
    const tl=ED_TOOLS.find(x=>'Key'+x[2]===e.code);if(tl){edTool(tl[0]);return;}
    const m=/^Digit([1-9])$/.exec(e.code);if(m&&+m[1]<=HOUSES.length){edSelect(+m[1]-1);return;}
    if(e.code==='Escape')$('eCancel').onclick();});
  addEventListener('resize',()=>{if(state==='editor')edLayout();});
}
