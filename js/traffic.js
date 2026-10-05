'use strict';
// ============================================================ truck
// nearest point where a circle of radius r fits on the road (null if it already does)
function roadClamp(x,y,r){
  let best=null,bd=1e9;
  for(const s of ROADS.concat(DRIVES)){const qx=clamp(x,s.x0+r,s.x1-r),qy=clamp(y,s.y0+r,s.y1-r),d=(qx-x)**2+(qy-y)**2;if(d===0)return null;if(d<bd){bd=d;best=[qx,qy];}}
  for(const c of CIRCLES){const dx=x-c.x,dy=y-c.y,dl=Math.hypot(dx,dy)||1,R=c.r-r;if(dl<=R)return null;
    if((dl-R)**2<bd){bd=(dl-R)**2;best=[c.x+dx/dl*R,c.y+dy/dl*R];}}
  return best;
}
function updateTruck(dt,ix,iy){
  // iy is -1..1: keys give full throttle, a stick or trigger gives part of it
  const th=-iy;
  if(th>.1){if(TR.v<-2)TR.v+=300*dt*Math.max(.5,th);else if(TR.v<160*th)TR.v=Math.min(160*th,TR.v+150*dt*Math.max(.4,th));else TR.v*=Math.exp(-1.3*dt);}
  else if(th<-.1){if(TR.v>2)TR.v-=300*dt*Math.max(.5,-th);else if(TR.v>-55*-th)TR.v=Math.max(-55*-th,TR.v-100*dt*Math.max(.4,-th));else TR.v*=Math.exp(-1.3*dt);}
  else{TR.v*=Math.exp(-1.3*dt);if(Math.abs(TR.v)<2)TR.v=0;}
  TR.steer+=(ix-TR.steer)*Math.min(1,dt*8);
  TR.a+=TR.steer*TR.v*dt*.88/(30+Math.abs(TR.v)*.3);
  const [c,s]=tdir();TR.x+=c*TR.v*dt;TR.y+=s*TR.v*dt;goalAdd('mile',Math.abs(TR.v)*dt/MILE_PX);
  // collisions: 3 circles along the truck
  let hit=false,car=null,cpt=null,fresh=false,tHit={v:null,sp:0},carImp=0;const r=11,sp0=Math.abs(TR.v);
  for(let it=0;it<2;it++)for(const off of [-14,0,14]){
    const cx=TR.x+c*off,cy=TR.y+s*off;let px=0,py=0;
    const q=roadClamp(cx,cy,r);if(q){px=q[0]-cx;py=q[1]-cy;}
    for(const tv of traffic)if(!tv.ghost)for(const [qx,qy] of trafficCircles(tv)){const dx=cx-qx,dy=cy-qy,d=Math.hypot(dx,dy),m=r+tv.hw;if(d<m&&d>0){px+=dx/d*(m-d);py+=dy/d*(m-d);
      // impact speed: how fast the two were closing along the line between them (both velocities, with direction)
      const rvx=c*TR.v-Math.cos(tv.a)*tv.v,rvy=s*TR.v-Math.sin(tv.a)*tv.v,imp=-(rvx*dx+rvy*dy)/d;
      if(it===0&&imp>tHit.sp){tHit={v:tv,pt:[qx+dx/d*tv.hw,qy+dy/d*tv.hw],sp:imp};}}}
    for(const w of CARS){
      if(cx<w.x0-r||cx>w.x1+r||cy<w.y0-r||cy>w.y1+r)continue;
      const qx=clamp(cx,w.x0,w.x1),qy=clamp(cy,w.y0,w.y1),dx=cx-qx,dy=cy-qy,d=Math.hypot(dx,dy);
      if(d<r){if(!(time-(w.touchT??-9)<.3))fresh=true;w.touchT=time;car=w;cpt=[qx,qy];
        // a parked car isn't moving, so the impact is the truck's speed straight into it: a scrape costs less than a head-on
        const imp=d>0?Math.max(0,-(c*TR.v*dx+s*TR.v*dy)/d):sp0;if(it===0&&imp>carImp)carImp=imp;
        if(d>0){px+=dx/d*(r-d);py+=dy/d*(r-d);}else py+=cy<(w.y0+w.y1)/2?-(cy-w.y0+r):(w.y1-cy+r);}
    }
    if(px||py){TR.x+=px;TR.y+=py;hit=true;}
    if(it===0&&sp0>3)for(const p of POTS){if(!p.broken&&Math.abs(cx-p.x)<r+p.r&&Math.abs(cy-p.y)<r+p.r&&Math.hypot(cx-p.x,cy-p.y)<r+p.r)breakPot(p);}
  }
  if(tHit.v&&tHit.sp>CRASH_MIN&&!(time-(tHit.v.touchT??-9)<.6)){tHit.v.touchT=time;bumpT=time;crash(tHit.v,tHit.pt,tHit.sp);TR.v*=.35;}
  else if(tHit.v)tHit.v.touchT=time;
  if(car&&fresh&&carImp>CRASH_MIN){bumpT=time;crash(car,cpt,carImp);TR.v*=.35;}
  else if(hit){TR.v*=Math.exp(-4*dt);if(Math.abs(TR.v)>45&&time-bumpT>.4){bumpT=time;blip(80,.15,'sawtooth',.07,40);TR.v*=.6;}}
  P.x=TR.x;P.y=TR.y;P.vx=P.vy=0;
}
const CRASH_MIN=18,CRASH_MAX=100,TRUCK_TOP=160,GHOST_ON=10,GHOST_OFF=3;
let crashShake=0;
function crash(car,pt,sp){
  const k=clamp((sp-CRASH_MIN)/(TRUCK_TOP-CRASH_MIN),0,1),cost=Math.max(1,Math.round(k*CRASH_MAX));
  const paid=charge(cost);
 today.damage=(today.damage||0)+paid;today.crashes++;today.damageRep+=Math.max(1,Math.round(cost/10));
  floatText(pt[0],pt[1]-10,paid?`-${fmt$(paid)} DAMAGE`:'CRUNCH!','#fe5f55',k>.5);
  crashShake=Math.max(crashShake,.15+k*.5);car.jolt=.25+k*.35;rumble(.35+k*.65,.5+k*.5,140+k*260);
  blip(90+k*40,.22,'sawtooth',.06+k*.04,35);blip(1400,.05,'square',.03);setTimeout(()=>blip(900+rnd()*400,.05,'square',.025),60);
  if(k>.35)setTimeout(()=>{for(let i=0;i<4;i++)setTimeout(()=>blip(i%2?660:880,.12,'square',.03),i*160);},200);
  const n=8+Math.round(k*26);
  for(let i=0;i<n;i++){const a=rnd()*Math.PI*2,v=30+rnd()*90*(.4+k);sparks.push({x:pt[0],y:pt[1],z:4+rnd()*6,vx:Math.cos(a)*v,vy:Math.sin(a)*v*.7,vz:30+rnd()*60,l:.4+rnd()*.5,c:rnd()<.45?'#bfe6ff':rnd()<.5?'#ffe38a':'#d8d2c6'});}
  if(car.kind){dentTraffic(car,pt,k);car.v=0;car.shockT=1.6;car.honkT=time;setTimeout(()=>{blip(330,.3,'square',.05);blip(415,.3,'square',.04);},350);}
  else dentCar(car,pt,k);statsT=1;
}
// traffic shares sprites, so a vehicle gets its own copy the first time it's dented
function dentTraffic(v,pt,k){
  if(!v.ownCan){const c=mk(v.can.width,v.can.height);c.getContext('2d').drawImage(v.can,0,0);v.can=c;v.ownCan=true;if(v.kind==='cop')v.copDent=c;}
  const dx=pt[0]-v.x,dy=pt[1]-v.y,ca=Math.cos(-v.a),sa=Math.sin(-v.a),lx=Math.round(dx*ca-dy*sa+v.can.width/2),ly=Math.round(dx*sa+dy*ca+v.can.height/2);
  const g=v.can.getContext('2d'),n=3+Math.round(k*8);
  for(let i=0;i<n;i++){const x=clamp(lx+Math.round((rnd()-.5)*(3+k*6)),1,v.can.width-2),y=clamp(ly+Math.round((rnd()-.5)*(3+k*4)),1,v.can.height-2);
    g.fillStyle=rnd()<.6?'rgba(20,20,24,.75)':'rgba(230,230,230,.7)';g.fillRect(x,y,1,1);}
}
// scuff the car's sprite where it was hit, so the damage sticks around
function dentCar(car,pt,k){
  const mx=(car.x0+car.x1)/2,my=(car.y0+car.y1)/2,a=car.vert?(car.dir>0?Math.PI/2:-Math.PI/2):(car.dir>0?0:Math.PI);
  const dx=pt[0]-mx,dy=pt[1]-my,c=Math.cos(-a),s=Math.sin(-a),lx=Math.round(dx*c-dy*s+17),ly=Math.round(dx*s+dy*c+8);
  const g=car.can.getContext('2d'),n=3+Math.round(k*8);
  for(let i=0;i<n;i++){const x=clamp(lx+Math.round((rnd()-.5)*(3+k*6)),1,32),y=clamp(ly+Math.round((rnd()-.5)*(3+k*4)),1,14);
    g.fillStyle=rnd()<.6?'rgba(20,20,24,.75)':'rgba(230,230,230,.7)';g.fillRect(x,y,1,1);}
}
// ============================================================ pedestrians
const SHIRTS=['#009dff','#4bc26a','#b06cff','#ff9800','#e8e0d0','#fe5f55','#2f5a4a'],HAIRS=['#2a1a10','#6b4428','#e8c070','#1a1a1a','#a8a8a8','#c04a1a'];
const COMPLAINTS=['HEY! WATCH IT!','UGH, LEAVES!','MY NEW SHOES!','SERIOUSLY?!','I\'M CALLING YOUR BOSS','RUDE!','PTOOEY!','NOT COOL!'];
let pedTimer=5;
function spawnPed(){
  const cand=[];
  const cm=randCam();
  for(let i=0;i<PATH.length;i+=6){const q=PATH[i],ex=Math.max(cm.x-q.x,0,q.x-cm.x-cm.w),ey=Math.max(cm.y-q.y,0,q.y-cm.y-cm.h),e=Math.max(ex,ey);if(e>12&&e<90&&!inAnyCam(q.x,q.y,10))cand.push(i);}
  if(!cand.length)return;
  const s=cand[(rnd()*cand.length)|0];
  const p={nid:NET.nid++,s,dir:rnd()<.5?1:-1,lat:(rnd()-.5)*5,speed:16+rnd()*14,shirt:SHIRTS[(rnd()*SHIRTS.length)|0],hair:HAIRS[(rnd()*HAIRS.length)|0],dog:rnd()<.3,walk:0,stop:0,cool:0,mad:0,fdir:1,mx:1,my:0};
  placePed(p);peds.push(p);
}
function placePed(p){
  const i=clamp(Math.floor(p.s),0,PATH.length-2),f=p.s-i,a=PATH[i],b=PATH[i+1];
  let mx=(b.x-a.x)*p.dir,my=(b.y-a.y)*p.dir;const ml=Math.hypot(mx,my)||1;mx/=ml;my/=ml;
  p.mx=mx;p.my=my;if(Math.abs(mx)>.3)p.fdir=mx>0?1:-1;
  p.x=a.x+(b.x-a.x)*f-my*p.lat;p.y=a.y+(b.y-a.y)*f+mx*p.lat+4;
}
// one of two familiar faces is always out walking Blu, a little white dog in a blue harness
const CAMEOS={man:{tall:3,skin:'#f2c29a',hair:'#6b4428',shirt:'#2f6fd0',stripe:'#f4f1e8',pants:'#ecebe6',long:false},
  woman:{tall:1,skin:'#8d5a3b',hair:'#1a1010',shirt:'#ff7aa8',stripe:null,pants:'#2a4a8a',long:true}};
function spawnCameo(){
  const p={nid:NET.nid++,s:30+rnd()*(PATH.length-60),dir:rnd()<.5?1:-1,lat:(rnd()-.5)*3,speed:20,cameo:true,who:rnd()<.5?'man':'woman',dog:false,walk:0,stop:0,cool:0,mad:0,run:0,fdir:1,mx:1,my:0};
  placePed(p);peds.push(p);
}
function drawCameo(p,cx,cy){
  const x=Math.round(p.x-cx),y=Math.round(p.y-cy);if(x<-26||x>VW+26||y<-30||y>VH+30)return;
  const C=CAMEOS[p.who],fd=p.fdir,run=p.run>0,t=C.tall;
  // Blu leads the way on the leash, and pulls further out front when they're running
  const ld=run?16:12,dx=Math.round(x+p.mx*ld-p.my*4),dy=Math.round(y+2+p.my*ld),hop=Math.round(Math.abs(Math.sin(p.walk*(run?2.4:1.8)))*(run?2:1));
  const dog=()=>{ctx.fillStyle='rgba(0,0,0,.25)';ctx.fillRect(dx-3,dy+1,8,2);
    ctx.fillStyle='#5a5550';ctx.fillRect(dx-4,dy-3-hop,7,5);ctx.fillRect(dx+(fd>0?2:-5),dy-5-hop,4,4);
    ctx.fillStyle='#f4f1e8';ctx.fillRect(dx-3,dy-2-hop,5,3);ctx.fillStyle='#d8d2c4';ctx.fillRect(dx-3,dy-hop,5,1);
    ctx.fillStyle='#f4f1e8';ctx.fillRect(dx+(fd>0?2:-4),dy-4-hop,3,3);ctx.fillStyle='#c8c2b4';ctx.fillRect(dx+(fd>0?2:-2),dy-5-hop,1,1);
    ctx.fillStyle='#1a1a1a';ctx.fillRect(dx+(fd>0?4:-4),dy-3-hop,1,1);
    ctx.fillStyle='#f4f1e8';ctx.fillRect(dx+(fd>0?-4:3),dy-3-hop-(hop?1:0),1,2);
    ctx.fillStyle='#2a6fc9';ctx.fillRect(dx+(fd>0?0:-1),dy-2-hop,2,3);ctx.fillStyle='#1d4f9a';ctx.fillRect(dx-3,dy-1-hop,5,1);};
  const leash=()=>{ctx.fillStyle='#1d4f9a';pline(ctx,x+fd*3,y-4-t,dx+(fd>0?0:-1),dy-2-hop,1);};
  const walker=()=>{
    ctx.fillStyle='rgba(0,0,0,.28)';pellipse(ctx,x+1,y+1,3,2);
    pedLegs(p,x,y,C.pants,3+t,'#2b2b3a');
    const ty=y-7-t;pedBody(x,ty,C.shirt,C.stripe);
    ctx.fillStyle=C.skin;pcircle(ctx,x,ty-2,2);ctx.fillStyle=C.hair;ctx.fillRect(x-2,ty-4,5,2);
    if(C.long)ctx.fillRect(x-(fd>0?2:-2),ty-3,1,5);else ctx.fillRect(x-(fd>0?2:-2),ty-3,1,2);};
  if(dy<y){dog();leash();walker();}else{walker();leash();dog();}
}
function complain(p,msg){
  if(p.cool>0)return;rumble(.1,.3,90);p.cool=4;
  // the cameo doesn't stop to argue (or hold it against you): they grab the leash and run for it
  if(p.cameo){p.run=8;goalAdd('blu',1);bubble(p,'RUN BLU!');blip(520,.08,'square',.04);setTimeout(()=>blip(700,.1,'square',.04),90);return;}
  p.stop=1.3;p.mad=1.6;today.complaints++;
  bubble(p,msg||COMPLAINTS[(rnd()*COMPLAINTS.length)|0]);blip(160,.18,'sawtooth',.05,90);
}
function updatePeds(dt){
  pedTimer-=dt;const busy=hour<20.5?1:.25;
  if(pedTimer<=0){pedTimer=(5+rnd()*9)/busy;if(peds.filter(p=>!p.cameo).length<4)spawnPed();}
  for(let i=peds.length-1;i>=0;i--){const p=peds[i];
    p.cool-=dt;p.mad-=dt;
    if(p.run>0)p.run-=dt;
    if(p.stop>0)p.stop-=dt;else{const sp=p.speed*(p.run>0?2.8:1);p.s+=p.dir*sp*dt/3;p.walk+=dt*sp*.25;}
    // the cameo never leaves: it turns round at the ends of the sidewalk loop
    if(p.cameo&&(p.s<1||p.s>PATH.length-2)){p.s=clamp(p.s,1,PATH.length-2);p.dir=-p.dir;}
    placePed(p);
    for(const pl of blowers(.4))if(inBlast(pl,p.x,p.y-3,.8)>=0){withPl(pl,()=>complain(p,['QUIT BLOWING AT ME!','MY HAIR!','ARE YOU KIDDING ME?!'][(rnd()*3)|0]));break;}
    if(!p.cameo&&(p.s<0||p.s>=PATH.length-1||!CAMS().some(c=>Math.hypot(p.x-c.x-c.w/2,p.y-c.y-c.h/2)<c.w/2+c.h/2+260))){if(p.bub)p.bub.el.remove();peds.splice(i,1);}
  }
}

// ============================================================ traffic: the 9 AM mail run, a police patrol, the parcel van, visitors
// all follow one loop in the right-hand lanes: in from the west, round the cul-de-sac, back out
const PARK_LANE=Math.round(RH*.45),TRAFFIC_LANE=11,TICKET_COST=50,REP_TICKET=10;
const TPX=[],TPY=[],TPA=[],TPS=[];
const traffic=[],officers=[],envelopes=[],MAILBOXES=[];let MAIL_STOPS=[],truckTicket=false,copCans=null,mailCan=null,vanCan=null;
function buildTrafficPath(){
  const L=TRAFFIC_LANE,b=BULB.r-40;
  // in along the right-hand lane (starting off the west edge), round the cul-de-sac, and back out in the other lane
  const raw=streetSide([],STREET,L,1,b,0);raw[0][0]=-90;bulbArc(raw,L,1,b,40);
  const back=streetSide([],STREET,L,-1,b,0).reverse();back[back.length-1][0]=-90;raw.push(...back);
  let pts=[];
  for(let i=0;i<raw.length-1;i++){const [x0,y0]=raw[i],[x1,y1]=raw[i+1],n=Math.max(1,Math.round(Math.hypot(x1-x0,y1-y0)/3));for(let k=0;k<n;k++)pts.push([x0+(x1-x0)*k/n,y0+(y1-y0)*k/n]);}
  pts.push(raw[raw.length-1]);
  // round off the corners with a few moving-average passes
  for(let pass=0;pass<4;pass++){const q=pts.map(p=>p.slice());for(let i=3;i<pts.length-3;i++){let sx=0,sy=0;for(let k=-3;k<=3;k++){sx+=pts[i+k][0];sy+=pts[i+k][1];}q[i]=[sx/7,sy/7];}pts=q;}
  let s=0;
  for(let i=0;i<pts.length;i++){if(i)s+=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]);
    const a=pts[Math.max(0,i-1)],c=pts[Math.min(pts.length-1,i+1)];TPX.push(pts[i][0]);TPY.push(pts[i][1]);TPA.push(Math.atan2(c[1]-a[1],c[0]-a[0]));TPS.push(s);}
}
// every mailbox gets a stop on the pass where it's on the driver's right
function buildMail(){
  for(const L of ALL_LOTS){const m=L.lmailbox,[x,y]=L.T(m.x+4,m.y+2),mb={x:Math.round(x),y:Math.round(y),flag:false,col:['#2a5d9f','#c9352b','#2f5a4a','#e8e0d0'][L.k%4]};MAILBOXES.push(mb);
    // (115px: far enough to reach a box just round a corner, like the Millers' at the end of Maple Avenue)
    let best=-1,bd=115*115;
    for(let i=0;i<TPX.length;i++){const dx=x-TPX[i],dy=y-TPY[i],d=dx*dx+dy*dy;if(d<bd&&dx*-Math.sin(TPA[i])+dy*Math.cos(TPA[i])>0){bd=d;best=i;}}
    if(best>=0)MAIL_STOPS.push({s:TPS[best]-6,mb});}
  MAIL_STOPS.sort((a,b)=>a.s-b.s);
}
function buildTrafficSprites(){
  // black-and-white cruiser; frames: lights off, red lit, blue lit
  copCans=[0,1,2].map(f=>{const c=makeCar('#1e2226'),g=c.getContext('2d');
    g.fillStyle='#f4f1e8';g.fillRect(11,3,11,10);g.fillRect(8,1,18,2);g.fillRect(8,13,18,2);g.fillStyle='#d8d3c4';g.fillRect(11,3,11,1);
    g.fillStyle=f===1?'#ff4a3a':'#6a1a1a';g.fillRect(15,4,3,4);g.fillStyle=f===2?'#4a8aff':'#1a2a6a';g.fillRect(15,8,3,4);
    g.fillStyle='#2a2e33';g.fillRect(15,7,3,1);return c;});
  // boxy white mail truck with the red and blue stripe
  const c=mk(40,18),g=c.getContext('2d');mailCan=c;
  g.fillStyle='#0d0d10';for(const [x,y] of [[6,0],[28,0],[6,16],[28,16]])g.fillRect(x,y,7,2);
  g.fillStyle='#8f897d';g.fillRect(0,1,40,16);g.fillStyle='#f4f1e8';g.fillRect(1,2,28,14);
  g.fillStyle='#e0dccf';for(let x=4;x<28;x+=5)g.fillRect(x,4,1,10);
  g.fillStyle='#2a5d9f';g.fillRect(1,2,28,1);g.fillRect(1,15,28,1);g.fillStyle='#c9352b';g.fillRect(1,3,28,1);g.fillRect(1,14,28,1);
  g.fillStyle='#2a5d9f';g.fillRect(12,6,6,6);g.fillStyle='#f4f1e8';g.fillRect(13,7,4,4);g.fillStyle='#c9352b';g.fillRect(14,8,2,2);
  g.fillStyle='#e8e4d8';g.fillRect(29,3,10,12);g.fillStyle='#1a2a3a';g.fillRect(34,4,4,10);g.fillStyle='#6fb3d9';g.fillRect(35,5,1,3);
  g.fillStyle='#ffe38a';g.fillRect(39,3,1,2);g.fillRect(39,13,1,2);g.fillStyle='#fe3b3b';g.fillRect(0,3,1,2);g.fillRect(0,13,1,2);
  // slate-blue parcel van with a cardboard box on the roof panel
  const v=mk(40,18),h=v.getContext('2d');vanCan=v;
  h.fillStyle='#0d0d10';for(const [x,y] of [[6,0],[29,0],[6,16],[29,16]])h.fillRect(x,y,7,2);
  h.fillStyle='#1d2c40';h.fillRect(0,1,40,16);h.fillStyle='#34557a';h.fillRect(1,2,29,14);h.fillStyle='#3f6690';h.fillRect(1,2,29,2);
  h.fillStyle='#2b4766';for(let x=6;x<30;x+=6)h.fillRect(x,4,1,10);
  h.fillStyle='#b98a54';h.fillRect(11,5,8,8);h.fillStyle='#d9ab72';h.fillRect(11,5,8,2);h.fillStyle='#efe2c4';h.fillRect(14,5,2,8);
  h.fillStyle='#ff9800';h.fillRect(1,15,29,1);
  h.fillStyle='#2e4b6b';h.fillRect(30,3,9,12);h.fillStyle='#1a2a3a';h.fillRect(34,4,4,10);h.fillStyle='#6fb3d9';h.fillRect(35,5,1,3);
  h.fillStyle='#ffe38a';h.fillRect(39,3,1,2);h.fillRect(39,13,1,2);h.fillStyle='#fe3b3b';h.fillRect(0,3,1,2);h.fillRect(0,13,1,2);
}
// ---------- one driver for every vehicle: follow the lane path, and each frame pick the sideways offset that gets
// past whatever's ahead (the truck, parked cars, other traffic, people), braking early enough to stop short of it
const LAT_MIN=-52,LAT_MAX=30,V_ACC=55,V_BRAKE=140,V_HARD=240,LAT_RATE=26;
// sideways drift per px of forward travel: sharp at a crawl, gentle at speed (and never more than 30 px/s)
const steerSlope=v=>Math.min(v<30?.6:.4,30/Math.max(v,1)),MAX_YAW=.35;
const LAT_CANDS=[];for(let c=LAT_MIN;c<=LAT_MAX;c+=3)LAT_CANDS.push(c);
const pendingTraffic=[],couriers=[],packages=[];
// queued, and only let in once the entrance is clear, so nothing ever spawns on top of anything else
function spawnTraffic(kind){pendingTraffic.push(kind);}
function newVehicle(kind){
  const v={nid:NET.nid++,kind,s:0,i:0,v:0,lat:0,latT:0,yaw:0,hl:17,hw:8,vmax:85,honkT:0,waitT:0,blockT:0,parkT:0,stops:[],stopS:null,park:null,drops:[],lights:false,state:'drive',passedI:-99,prefLat:0,rev:0,stuck:0,revCool:0};
  if(kind==='car'){const park=findParkingSpot();if(!park)return null;return Object.assign(v,{col:park.col,can:makeCarCached(park.col),park});}
  if(kind==='cop')return Object.assign(v,{vmax:100,can:copCans[0]});
  if(kind==='mail')return Object.assign(v,{vmax:95,hl:20,can:mailCan,stops:MAIL_STOPS.map(m=>({...m}))});
  if(kind==='van'){const drops=planDrops();if(!drops.length)return null;return Object.assign(v,{vmax:88,hl:19,hw:9,can:vanCan,drops});}
  return null;
}
let lastSpawnT=-99;
function trySpawn(){
  // a few seconds between arrivals as well as a clear entrance, so nothing rolls in alongside the last one
  if(!pendingTraffic.length||time-lastSpawnT<5||traffic.some(v=>v.s<80||Math.hypot(v.x-TPX[0],v.y-TPY[0])<80))return;
  const v=newVehicle(pendingTraffic.shift());if(v){trafficPos(v);traffic.push(v);lastSpawnT=time;}
}
// visitors park along the curb in the parking lane, on a straight run clear of driveways, cars and the truck
const PARK_LAT=Math.round(RH*.72)-TRAFFIC_LANE,visitors=[];
const spotBox=p=>p.vert?{x0:p.x-8,y0:p.y-17,x1:p.x+8,y1:p.y+17}:{x0:p.x-17,y0:p.y-8,x1:p.x+17,y1:p.y+8};
const parkedNear=(x,y,self,r=44)=>traffic.some(v=>v!==self&&((v.park&&Math.hypot(v.park.x-x,v.park.y-y)<r)||(v.state==='parked'&&Math.hypot(v.x-x,v.y-y)<r)));
function spotFree(p,self){
  const b=spotBox(p);
  if(CARS.some(c=>rectsHit(c,b,6))||MOUTHS.some(m=>rectsHit(m,b,4)))return false;
  if(Math.hypot(TR.x-p.x,TR.y-p.y)<44)return false;
  return!parkedNear(p.x,p.y,self);
}
function findParkingSpot(){
  const cand=[];
  for(let i=60;i<TPX.length-60;i+=4){const a=TPA[i],c=Math.cos(a),sn=Math.sin(a);if(Math.abs(c)>.02&&Math.abs(sn)>.02)continue;
    const x=TPX[i]-sn*PARK_LAT,y=TPY[i]+c*PARK_LAT,vert=Math.abs(c)<.02;
    const on=ROADS.filter(r=>inRect(r,x,y));if(on.length!==1)continue;const r=on[0];
    if((r.h?Math.min(x-r.x0,r.x1-x):Math.min(y-r.y0,r.y1-y))<40||x<60)continue;
    if(CIRCLES.some(q=>Math.hypot(x-q.x,y-q.y)<q.r+30))continue;
    const p={s:TPS[i],x,y,vert,dir:vert?(sn>0?1:-1):(c>0?1:-1)};if(spotFree(p))cand.push(p);}
  if(!cand.length)return null;
  const p=cand[(rnd()*cand.length)|0];p.col=carCol(hoodAt(p.x,p.y),rnd());return p;
}
// once it's pulled in, it becomes an ordinary parked car for the rest of the day, right where it stopped
function parkVisitor(v){
  const p=v.park,c=makeCarObj(Math.round(v.x),Math.round(v.y),p.vert,p.dir,p.col);visitors.push(c);WALLS.push(c);
  for(let by=Math.floor(c.y0/GC);by<=Math.floor(c.y1/GC);by++)for(let bx=Math.floor(c.x0/GC);bx<=Math.floor(c.x1/GC);bx++)CAR_GRID[by*GW+bx].push(c);
}
function clearVisitors(){
  const gone=new Set(visitors),keep=a=>{for(let i=a.length-1;i>=0;i--)if(gone.has(a[i]))a.splice(i,1);};
  keep(CARS);keep(WALLS);for(const b of CAR_GRID)keep(b);visitors.length=0;
}
function trafficPos(v){
  while(v.i<TPS.length-2&&TPS[v.i+1]<v.s)v.i++;
  while(v.i>0&&TPS[v.i]>v.s)v.i--;
  const i=v.i,f=clamp((v.s-TPS[i])/((TPS[i+1]-TPS[i])||1),0,1),a=TPA[i],rx=-Math.sin(a),ry=Math.cos(a);
  v.a=a+v.yaw;v.rx=rx;v.ry=ry;v.x=TPX[i]+(TPX[i+1]-TPX[i])*f+rx*v.lat;v.y=TPY[i]+(TPY[i+1]-TPY[i])*f+ry*v.lat;
}
const trafficCircles=v=>{const c=Math.cos(v.a),s=Math.sin(v.a),o=v.hl-v.hw;return[[v.x-c*o,v.y-s*o],[v.x,v.y],[v.x+c*o,v.y+s*o]];};
const roadAt=(x,y)=>{const qx=x|0,qy=y|0;return qx<0||qy<0||qx>=WORLD_W||qy>=H||REG[qy*WORLD_W+qx]===1;};
// everything a driver has to keep clear of, as boxes. Moving things reach ahead by where they'll be shortly
function trafficObstacles(){
  const ob=[],add=(x,y,a,hl,hw,v,ref)=>{const c=Math.cos(a),s=Math.sin(a),px=x,py=y;if(Math.abs(v)>5){const e=v*.35;x+=c*e;y+=s*e;hl+=Math.abs(e);hw+=2;}ob.push({x,y,px,py,c,s,a,hl,hw,v,ref});};
  add(TR.x,TR.y,TR.a,TRUCK_HL,TRUCK_HW,TR.v,'truck');
  for(const c of CARS){const mx=(c.x0+c.x1)/2,my=(c.y0+c.y1)/2;if(roadAt(mx,my))add(mx,my,0,(c.x1-c.x0)/2,(c.y1-c.y0)/2,0,c);}
  // (a vehicle backing out of a jam counts as stopped, so nobody tailgates it)
  for(const v of traffic)add(v.x,v.y,v.a,v.hl,v.hw,Math.max(0,v.v),v);
  for(const pl of players)if(onFoot(pl))add(pl.P.x,pl.P.y,0,4,4,0,'player');
  for(const o of officers)add(o.x,o.y,0,4,4,0,o);
  for(const o of couriers)add(o.x,o.y,0,4,4,0,o);
  return ob;
}
function nearObstacles(v,ob,L){
  const c=Math.cos(v.a),s=Math.sin(v.a),R=L+40,out=[];
  for(const o of ob){if(o.ref===v)continue;const dx=o.px-v.x,dy=o.py-v.y;if(Math.abs(dx)>R+o.hl+70||Math.abs(dy)>R+o.hl+70)continue;
    const t=o.ref&&o.ref.kind?o.ref:null;
    // traffic that's entirely behind us is the one that yields
    if(t&&dx*c+dy*s<-(v.hl+t.hl))continue;
    // someone heading our way out in our lane to get round something: stop well short and let them finish
    if(t&&Math.cos(t.a-v.a)<-.5&&Math.abs(t.lat-t.prefLat)>8&&t.rev<=0){const e=70;out.push({...o,x:o.x+o.c*e/2,y:o.y+o.s*e/2,hl:o.hl+e/2});continue;}
    out.push(o);}
  return out;
}
// do two rotated boxes overlap? (separating axis test; A given as center, heading cos/sin, half sizes)
function boxHit(ax,ay,ac,as,ahl,ahw,o){
  const tx=o.x-ax,ty=o.y-ay;
  if(Math.abs(tx*ac+ty*as)>ahl+o.hl*Math.abs(o.c*ac+o.s*as)+o.hw*Math.abs(o.c*as-o.s*ac))return false;
  if(Math.abs(ty*ac-tx*as)>ahw+o.hl*Math.abs(o.s*ac-o.c*as)+o.hw*Math.abs(o.s*as+o.c*ac))return false;
  if(Math.abs(tx*o.c+ty*o.s)>o.hl+ahl*Math.abs(ac*o.c+as*o.s)+ahw*Math.abs(ac*o.s-as*o.c))return false;
  if(Math.abs(ty*o.c-tx*o.s)>o.hw+ahl*Math.abs(as*o.c-ac*o.s)+ahw*Math.abs(as*o.s+ac*o.c))return false;
  return true;
}
// slide the vehicle's own box along the lane at a planned offset (easing from lat0 to lat1 at the steering slope it can
// actually manage). Returns how far its center can travel before it would touch something, and what
function corridor(v,near,lat0,lat1,L,dir=1,m=2){
  const sl=steerSlope(Math.max(v.v,8)),dShift=Math.abs(lat1-lat0)/sl,yw=Math.min(MAX_YAW,Math.atan(sl))*Math.sign(lat1-lat0)*dir,hl=v.hl+m*.75,hw=v.hw+m;
  // anything already inside our safety margin only counts if we'd actually touch it
  const ca=Math.cos(v.a),sa=Math.sin(v.a),tight=new Set();for(const o of near)if(boxHit(v.x,v.y,ca,sa,hl,hw,o))tight.add(o);
  // (each step reads the path point it measured: reading the next one ran off the end of the path, and the NaN
  // position there "hit" whatever was nearby, so a van could stall at the edge of the world honking at the truck)
  for(let j=v.i;j>=0&&j<TPS.length;){const q=j,d=(TPS[q]-v.s)*dir;j+=(d<24?1:2)*dir;if(d<0)continue;if(d>L)break;
    const k=dShift>0?Math.min(1,d/dShift):1,lat=lat0+(lat1-lat0)*k,a=TPA[q]+(k<1?yw:0),c=Math.cos(a),s=Math.sin(a);
    const px=TPX[q]-Math.sin(TPA[q])*lat,py=TPY[q]+Math.cos(TPA[q])*lat;
    if(Math.abs(lat)>3)for(const [i,q] of [[1,1],[1,-1],[-1,1],[-1,-1]])if(!roadAt(px+c*hl*i-s*hw*q,py+s*hl*i+c*hw*q))return{d,o:null};
    for(const o of near)if(tight.has(o)?boxHit(px,py,c,s,v.hl,v.hw,o):boxHit(px,py,c,s,hl,hw,o))return{d,o};
  }
  return{d:Infinity,o:null};
}
const alongV=(o,v)=>o?o.v*Math.cos(o.a-v.a):0;
// a vehicle ahead that's still moving our way is traffic to follow; only one that's stopped in the lane gets passed
const isFlow=(o,v)=>!!o&&(o.ref==='truck'||!!(o.ref&&o.ref.kind))&&alongV(o,v)>5;
// before drifting sideways into a lane, look over the shoulder: anything coming up behind in that lane needs room to stop
function mergeOk(v,c){
  const ca=Math.cos(v.a),sa=Math.sin(v.a);
  for(const o of traffic){if(o===v||o.state==='parked')continue;const dx=o.x-v.x,dy=o.y-v.y,back=-(dx*ca+dy*sa);if(back<0||back>160||Math.cos(o.a-v.a)<.5)continue;
    const ol=v.lat+(-dx*sa+dy*ca);if(Math.abs(ol-c)>=o.hw+v.hw+4||Math.abs(ol-v.lat)<o.hw+v.hw)continue;
    const close=Math.max(0,o.v-v.v),gap=back-v.hl-o.hl;if(gap<close*close/(2*V_BRAKE)+close*.5+14)return false;}
  return true;
}
// no overtaking through a bend or a junction turn
function bendAhead(v,L){const a0=TPA[v.i];for(let j=v.i;j<TPS.length&&TPS[j]-v.s<L;j+=3){let d=Math.abs(TPA[j]-a0);if(d>Math.PI)d=Math.PI*2-d;if(d>.3)return true;}return false;}
const oncoming=v=>traffic.some(o=>o!==v&&o.v>5&&Math.cos(o.a-v.a)<-.5&&Math.hypot(o.x-v.x,o.y-v.y)<230);
function driveVehicle(v,ob,dt,stopAt){
  if(v.shockT>0){v.shockT-=dt;v.v=0;trafficPos(v);return;}
  if(v.state==='parked'){v.v=Math.max(0,v.v-V_HARD*dt);v.latT=v.lat;v.yaw*=Math.exp(-6*dt);v.s+=v.v*dt;trafficPos(v);return;}
  // backing up out of a jam to get room to steer round it (not while it's ghosting through)
  if(v.ghost)v.rev=0;
  if(v.rev>0){v.rev-=dt;
    const back=ob.filter(o=>o.ref!==v&&Math.abs(o.px-v.x)<90&&Math.abs(o.py-v.y)<90),ahead=nearObstacles(v,ob,90);
    // keep backing until there's room to pull round (or something's behind us)
    if(corridor(v,back,v.lat,v.lat,6,-1,.5).d<Infinity||(v.rev<1.7&&[v.prefLat,v.latT].some(c=>corridor(v,ahead,v.lat,c,90).d>45))){v.rev=0;v.v=0;}
    else{v.v=-16;v.yaw*=Math.exp(-6*dt);v.s+=v.v*dt;trafficPos(v);return;}}
  if(v.v<0)v.v=0;
  const L0=clamp(v.v*1.1+50,70,160),L=L0,stopD=stopAt!=null?Math.max(0,stopAt-v.s):Infinity;
  const cor=(c)=>{const r=corridor(v,near,v.lat,c,L);return r.d>stopD+2?{d:Infinity,o:null}:r;};
  const near=v.ghost?[]:nearObstacles(v,ob,L0),pref=v.prefLat;
  let best=pref,bc=cor(pref);
  const mok=c=>v.ghost||Math.abs(c-v.lat)<=4||mergeOk(v,c);
  if(bc.d===Infinity&&!mok(pref))bc={d:-1,o:null};
  // following moving traffic in our lane is fine, but if we're already out passing it, finish the pass first
  // (and never cut back toward a lane that's blocked close ahead: hold the line and brake instead)
  if(bc.d<Infinity&&isFlow(bc.o,v)&&Math.abs(v.lat-pref)>4){const h=cor(v.latT);if(h.d>bc.d||bc.d<24){best=v.latT;bc=h;}}
  else if(bc.d<Infinity&&!isFlow(bc.o,v)){
    // blocked by something stopped: find the nearest clear offset (sticking with the current one when it's still good),
    // or failing that, whichever gets furthest. Only pull into the oncoming lane when nothing's coming
    // (after a few seconds stuck it'll pull out round something even near a bend, or it would wait there forever)
    const cost=c=>Math.abs(c-pref)+.6*Math.abs(c-v.latT),onc=oncoming(v)||(bendAhead(v,130)&&(v.jamT||0)<4);
    // and never squeeze past on the curb side, unless it's pulling in to the curb anyway
    const cands=LAT_CANDS.concat([v.latT]).filter(c=>c<=Math.max(pref,0)+6&&(!onc||c>-14||c>=v.lat-1)).sort((a,b)=>cost(a)-cost(b));
    // nothing clear: hold the current line unless another gets a good deal further
    const hold=Math.abs(v.latT-v.lat)<=4||mok(v.latT)?v.latT:v.lat;
    let found=false,fb=hold,fr=cor(hold);
    if(bc.d>fr.d+12){fb=pref;fr=bc;}
    for(const c of cands){if(!mok(c))continue;const r=cor(c);if(r.d===Infinity){best=c;bc=r;found=true;break;}if(r.d>fr.d+12){fr=r;fb=c;}}
    if(!found){best=fb;bc=fr;}
  }
  v.latT=best;
  let want=v.vmax;
  if(bc.d<Infinity){const vo=Math.max(0,alongV(bc.o,v));want=Math.min(want,Math.sqrt(Math.max(0,vo*vo+2*V_BRAKE*(bc.d-(vo>0?10:12)))));}
  if(stopAt!=null){const d=stopAt-v.s;want=Math.min(want,d<=1.5?0:Math.sqrt(2*110*d)+3);}
  // stuck behind the player or the truck: lean on the horn
  if(want<3&&v.v<5&&bc.o&&(bc.o.ref==='player'||bc.o.ref==='truck')){v.blockT+=dt;if(v.blockT>.8&&time-v.honkT>3){v.honkT=time;blip(330,.22,'square',.04);blip(415,.22,'square',.03);}}else v.blockT=0;
  const jam=want<3&&bc.d<Infinity&&(stopAt==null||stopAt-v.s>3);
  v.stuck=jam?(v.stuck||0)+dt:0;
  // wedged for a while: back up a few lengths. Of two vehicles stuck nose to nose, the one out of its own lane gives way
  if(v.stuck>2.5&&!v.ghost&&time>(v.revCool||0)){const o=bc.o&&bc.o.ref&&bc.o.ref.kind?bc.o.ref:null;
    if(!o||!(o.stuck>2.5)||Math.abs(v.lat-v.prefLat)>Math.abs(o.lat-o.prefLat)+1||(v.stuck>6)){v.rev=2.5;v.revCool=time+6;v.stuck=0;}}
  v.v+=clamp(want-v.v,-V_HARD*dt,V_ACC*dt);if(v.v<0)v.v=0;
  // cars can't slide sideways on the spot: lane changes happen only as they roll forward
  const ds=v.v*dt,step=steerSlope(v.v)*ds,old=v.lat;
  v.lat+=clamp(v.latT-v.lat,-step,step);
  // (barely any turn of the nose while creeping: tiny sideways nudges at a crawl shouldn't swing the body round)
  const yawT=ds>.01?clamp(Math.atan2(v.lat-old,ds),-MAX_YAW,MAX_YAW)*clamp(v.v/30,0,1):0;v.yaw+=(yawT-v.yaw)*Math.min(1,dt*10);
  v.s+=v.v*dt;trafficPos(v);
}
// a ticket needs the truck stopped on the road but outside a parking lane (intersections and the cul-de-sac have none)
function illegalPark(){
  if(Math.abs(TR.v)>2)return false;
  const x=TR.x|0,y=TR.y|0;if(x<0||y<0||x>=WORLD_W||y>=H||REG[y*WORLD_W+x]!==1)return false;
  if(Math.hypot(TR.x-BULB.x,TR.y-BULB.y)<BULB.r)return true;
  const on=ROADS.filter(r=>inRect(r,TR.x,TR.y));if(on.length!==1)return true;
  const r=on[0],q=r.h?TR.y-r.c:TR.x-r.c,along=Math.abs(r.h?Math.cos(TR.a):Math.sin(TR.a));
  return!(Math.abs(q)>=PARK_LANE+3&&along>.87);
}
function issueTicket(){
  const paid=charge(TICKET_COST);today.tickets++;today.ticketCost+=paid;truckTicket=true;statsT=1;rumble(.5,.6,280);
  floatText(TR.x,TR.y-18,paid?`-${fmt$(paid)} PARKING TICKET`:'PARKING TICKET!','#fe5f55',true);
  blip(1300,.05,'square',.04);setTimeout(()=>blip(900,.08,'square',.04),80);setTimeout(()=>blip(300,.25,'sawtooth',.05,120),220);
}
function siren(){blip(620,.28,'sine',.05,1150);setTimeout(()=>blip(1150,.28,'sine',.05,620),300);}
function updateCop(v,dt){
  // spot the truck ahead; pull in behind it, lined up with it, if it's parked where it shouldn't be
  if(v.state==='drive'&&!today.tickets){let best=-1,bd=34*34;
    for(let j=v.i+8;j<Math.min(TPX.length,v.i+60);j++){const d=(TPX[j]-TR.x)**2+(TPY[j]-TR.y)**2;if(d<bd){bd=d;best=j;}}
    if(best>=0&&best>v.passedI+30){v.passedI=best;if(illegalPark()){v.state='pulling';v.stopS=TPS[best]-v.hl-TRUCK_HL-8;v.lights=true;siren();
      v.prefLat=clamp((TR.x-TPX[best])*-Math.sin(TPA[best])+(TR.y-TPY[best])*Math.cos(TPA[best]),LAT_MIN,LAT_MAX);}}}
  if(v.state==='pulling'){
    if(Math.abs(TR.v)>12){v.state='drive';v.stopS=null;v.lights=false;v.prefLat=0;}
    else if(v.v<4&&(v.stopS-v.s<1.5||v.stuck>.5)){v.state='parked';v.stopS=null;
      const o={x:v.x-v.rx*12,y:v.y-v.ry*12,shirt:'#1d2f5a',hair:'#10182a',fdir:1,walk:0,stop:0,mad:0,dog:false,mx:1,my:0,st:'out',t:0,car:v};officers.push(o);}}
}
function updateOfficer(o,dt){
  const v=o.car;let tx,ty;
  // walk up beside the cab on whichever side of the truck we're on, to tuck the ticket under the wiper
  if(o.st==='out'){const ly=toTruck(o.x,o.y)[1];[tx,ty]=fromTruck(TRUCK_HL-12,(ly<0?-1:1)*(TRUCK_HW+5));if(Math.abs(TR.v)>10)o.st='back';}
  else{tx=v.x-v.rx*12;ty=v.y-v.ry*12;}
  if(o.st==='write'){o.stop=1;o.t-=dt;if(o.t<=0){if(illegalPark())issueTicket();o.st='back';}return;}
  const dx=tx-o.x,dy=ty-o.y,d=Math.hypot(dx,dy);
  if(d<1.5){if(o.st==='out'){o.st='write';o.t=1.1;}else{officers.splice(officers.indexOf(o),1);v.state='drive';v.lights=false;v.prefLat=0;}return;}
  const sp=Math.min(d,40*dt);o.x+=dx/d*sp;o.y+=dy/d*sp;o.stop=0;o.walk+=dt*10;o.mx=dx/d;o.my=dy/d;if(Math.abs(o.mx)>.3)o.fdir=o.mx>0?1:-1;
}
// ---------- the parcel van: a handful of houses a day, parked at the curb out front while the driver runs the box up
const PKG_CUE_WALK=8,PKG_RANGE=12,PKG_THR=200,REP_COURIER=5,REP_PACKAGE=8,REP_PKG_RETURN=5;
let carryPkg=null;
function vanSpot(j){const a=TPA[j],nx=-Math.sin(a),ny=Math.cos(a);return{j,s:TPS[j],x:TPX[j]+nx*PARK_LAT,y:TPY[j]+ny*PARK_LAT,nx,ny};}
function vanSpotOk(p,self){
  const b={x0:p.x-16,y0:p.y-16,x1:p.x+16,y1:p.y+16};
  if(CARS.some(c=>rectsHit(c,b,2))||Math.hypot(TR.x-p.x,TR.y-p.y)<46||parkedNear(p.x,p.y,self,42))return false;
  return roadAt(p.x+p.nx*10,p.y+p.ny*10)&&roadAt(p.x-p.nx*10,p.y-p.ny*10);
}
// which houses get parcels today. Smaller houses get most of them early on; as reputation grows the bigger
// homes come into it. NOTE: keep this in step with the reputation system when that gets fleshed out
function deliveryPick(){
  const lvl=repLevel(Math.max(0,rep))/5,pool=LOTS.slice(),out=[];
  const w=L=>.08+Math.exp(-((L.level/5-lvl*.85)**2)/(2*.3*.3));
  while(pool.length){let tot=0;for(const L of pool)tot+=w(L);let r=rnd()*tot,i=0;for(;i<pool.length-1;i++){r-=w(pool[i]);if(r<=0)break;}out.push(pool.splice(i,1)[0]);}
  return out;
}
function planDrops(){
  const want=4+((rnd()*4)|0),drops=[];
  for(const L of deliveryPick()){if(drops.length>=want)break;const [bx,by]=L.T(L.ldoor.x,L.d-2);let best=-1,bd=130*130;
    for(let i=40;i<TPX.length-40;i++){const dx=bx-TPX[i],dy=by-TPY[i],d=dx*dx+dy*dy;if(d<bd&&dx*-Math.sin(TPA[i])+dy*Math.cos(TPA[i])>0){bd=d;best=i;}}
    if(best>=0&&!drops.some(q=>Math.abs(q.j-best)<20))drops.push({...vanSpot(best),lot:L});}
  drops.sort((a,b)=>a.s-b.s);drops.forEach((d,i)=>{d.idx=i;d.n=drops.length;});
  return drops;
}
// find a free bit of curb near the planned stop, preferring just past it; null if there's none
function vanRespot(dr,v){for(const k of [8,-8,16,-16,24,32,-24,40]){const q=vanSpot(clamp(dr.j+k,0,TPX.length-1));if(q.s-v.s>25&&vanSpotOk(q,v))return q;}return null;}
function updateVan(v,dt){
  if(v.state!=='drive')return null;
  while(v.drops.length&&v.drops[0].s-v.s<-20)v.drops.shift();
  const dr=v.drops[0];if(!dr){v.prefLat=0;return null;}
  const d=dr.s-v.s;
  // keep an eye on the curb on the way in: if the spot fills up, shuffle along, and if the whole curb is full,
  // double-park in the lane (traffic will go round) rather than skip the house
  if(d<130&&!dr.dbl&&!vanSpotOk(dr,v)){const q=vanRespot(dr,v);if(q)Object.assign(dr,q);else dr.dbl=true;}
  if(d<95){v.prefLat=dr.dbl?0:PARK_LAT;v.parkT+=dt;
    if((d<1.5&&v.v<4)||(v.parkT>6&&v.v<4&&d<60)){v.parkT=0;v.state='parked';startCourier(v,dr);}}
  else v.prefLat=0;
  return dr.s;
}
function startCourier(v,dr){
  const L=dr.lot,B=L.T(L.ldoor.x,L.d-3),C=L.T(L.ldoor.x+Math.round((rnd()-.5)*8),L.ldoor.y+8);
  // about one in three is a short drop: either a near miss a little way from the door, or the driver gives up and
  // leaves it off the sidewalk, nowhere near the door. Giving up gets likelier with each stop (30% first, 70% last)
  const lazy=rnd()<.35,pl=Math.hypot(B[0]-C[0],B[1]-C[1])||1,quit=lazy&&rnd()<.3+.4*(dr.n>1?dr.idx/(dr.n-1):0);
  const sh=quit?Math.max(Math.min(pl,20+rnd()*25),Math.min(pl-4,90+rnd()*20)):Math.min(pl,20+rnd()*25),jit=quit?18:8;
  const E=lazy?[C[0]+(B[0]-C[0])/pl*sh+(rnd()-.5)*jit,C[1]+(B[1]-C[1])/pl*sh+(rnd()-.5)*(quit?8:0)]:C;
  couriers.push({nid:NET.nid++,x:v.x+v.rx*(v.hw+5),y:v.y+v.ry*(v.hw+5),wps:[B,E],B,home:C,lazy,st:'out',van:v,lot:L,shirt:'#2f6fd0',hair:HAIRS[(rnd()*HAIRS.length)|0],
    fdir:1,walk:0,stop:0,mad:0,cool:0,mx:1,my:0,dog:false,carry:true,t:0});
}
function courierHit(o){
  if(o.cool>0)return;o.cool=4;o.mad=1.6;o.t=Math.max(o.t,.8);today.courierHits++;rumble(.1,.3,90);
  bubble(o,['HEY! I\'M WORKING HERE!','WATCH THE PACKAGES!','SERIOUSLY?!','I\'M ON A SCHEDULE!'][(rnd()*4)|0]);blip(160,.18,'sawtooth',.05,90);
}
function updateCouriers(dt){
  for(let i=couriers.length-1;i>=0;i--){const o=couriers[i],v=o.van;o.cool-=dt;o.mad-=dt;
    for(const pl of blowers(.4))if(inBlast(pl,o.x,o.y-3,.8)>=0){withPl(pl,()=>courierHit(o));break;}
    if(o.t>0){o.t-=dt;o.stop=1;continue;}
    if(!o.wps.length){
      if(o.st==='out'){o.carry=false;o.st='back';o.t=.6;o.wps=[o.B,'van'];
        packages.push({x:o.x,y:o.y+2,z:5,vx:0,vy:0,vz:20,hx:o.home[0],hy:o.home[1]+2,lot:o.lot,far:false,early:o.lazy,moved:false,done:false});{const v=nearVol(o.x,o.y);if(v>0)blip(300,.06,'triangle',.05*v);}}
      else{if(o.bub)o.bub.el.remove();couriers.splice(i,1);v.state='drive';v.drops.shift();v.prefLat=0;}
      continue;}
    const w=o.wps[0],[tx,ty]=w==='van'?[v.x+v.rx*(v.hw+5),v.y+v.ry*(v.hw+5)]:w,dx=tx-o.x,dy=ty-o.y,d=Math.hypot(dx,dy);
    if(d<1.5){o.wps.shift();continue;}
    const sp=Math.min(d,(o.carry?34:40)*dt);o.x+=dx/d*sp;o.y+=dy/d*sp;o.stop=0;o.walk+=dt*10;o.mx=dx/d;o.my=dy/d;if(Math.abs(o.mx)>.3)o.fdir=o.mx>0?1:-1;
  }
}
// packages slide around under the blower (heavier than leaves), get nudged by feet and the truck, stop at walls
function pkgBlocked(x,y){
  if(x<2||y<2||x>WORLD_W-3||y>H-3||wet(x,y))return true;
  const li=LOT_AT[(y|0)*WORLD_W+(x|0)];
  if(li>=0){const L=ALL_LOTS[li];if(L.fences.some(w=>inRect(w,x,y,1))||L.obst.some(w=>inRect(w,x,y,1)))return true;}
  else{const bk=CAR_GRID[((y/GC)|0)*GW+((x/GC)|0)];if(bk&&bk.some(w=>inRect(w,x,y,1)))return true;}
  return false;
}
function updatePackages(dt){
  const B=blowers(.02).map(pl=>({pl,bp:withPl(pl,()=>blowParams(pl.power))}));
  for(const k of packages){
    const holder=players.find(pl=>pl.carryPkg===k);
    if(holder){const Q=holder.P;k.x=Q.x+holder.aim.x*3;k.y=Q.y+1;k.z=7;k.vx=k.vy=k.vz=0;k.far=Math.hypot(k.x-k.hx,k.y-k.hy)>PKG_RANGE;continue;}
    const ox=k.x,oy=k.y;
    for(const {pl,bp} of B)for(const b of blCones(pl)){const a={x:b.ax,y:b.ay},dx=k.x-b.nx,dy=k.y-b.ny,d=Math.hypot(dx,dy);
      if(d<b.range&&d>.5){const c=(dx*a.x+dy*a.y)/d;if(c>b.cosH){const f=bp.F*(1-d/b.range)*(.3+.7*(c-b.cosH)/(1-b.cosH));
        if(f>PKG_THR){const g=(f-PKG_THR)*.22;k.vx+=(a.x*.8+dx/d*.2)*g*dt;k.vy+=(a.y*.8+dy/d*.2)*g*dt;if(f>650&&k.z<=0)k.vz+=40*dt;}}}}
    for(const pl of players){if(!onFoot(pl))continue;const Q=pl.P,dx=k.x-Q.x,dy=k.y-Q.y,d=Math.hypot(dx,dy),ps=Math.hypot(Q.vx,Q.vy);if(d<5&&d>.01&&ps>10){k.vx+=dx/d*ps*.9*dt*8;k.vy+=dy/d*ps*.9*dt*8;}}
    {const [lx,ly]=toTruck(k.x,k.y);if(Math.abs(lx)<TRUCK_HL+2&&Math.abs(ly)<TRUCK_HW+2){const c=Math.cos(TR.a),s=Math.sin(TR.a),side=ly<0?-1:1;k.vx+=c*TR.v*.5-s*side*40;k.vy+=s*TR.v*.5+c*side*40;}}
    const fr=Math.exp(-(k.z>0?.8:4.5)*dt);k.vx*=fr;k.vy*=fr;
    const nx=k.x+k.vx*dt;if(pkgBlocked(nx,k.y))k.vx*=-.3;else k.x=nx;
    const ny=k.y+k.vy*dt;if(pkgBlocked(k.x,ny))k.vy*=-.3;else k.y=ny;
    if(k.z>0||k.vz>0){k.vz-=180*dt;k.z+=k.vz*dt;if(k.z<=0){k.z=0;k.vz=k.vz<-30?-k.vz*.25:0;}}
    if(Math.abs(k.x-ox)+Math.abs(k.y-oy)>.05)k.moved=true;
    k.far=Math.hypot(k.x-k.hx,k.y-k.hy)>PKG_RANGE;
    if(!k.far)pkgHome(k);
  }
}
// a package left short of the door by the driver earns a little goodwill when it's brought the rest of the way
function pkgHome(k){if(!k.early||k.done)return;k.done=true;today.pkgReturns++;goalAdd('pkg3',1);floatText(k.x,k.y-12,`+${REP_PKG_RETURN} REP`,'#4bc26a');blip(660,.06,'triangle',.05);setTimeout(()=>blip(880,.1,'triangle',.05),70);}
const nearPkg=()=>{if(driving||cur.riding)return null;let best=null,bd=9;for(const k of packages){const d=Math.hypot(k.x-P.x,k.y-(P.y+1));if(d<bd&&!players.some(pl=>pl.carryPkg===k)){bd=d;best=k;}}return best;};
// a parcel tossed in the back of the truck: a little cash on the side, and the neighbors will hear about it
function stealPkg(){const k=carryPkg;carryPkg=null;const i=packages.indexOf(k);if(i>=0)packages.splice(i,1);
  earn(STEAL_PAY);today.stolen=(today.stolen||0)+1;today.stealEarn=(today.stealEarn||0)+STEAL_PAY;statsT=1;
  floatText(P.x,P.y-14,`+${fmt$(STEAL_PAY)} · -${REP_STEAL} REP`,'#ffcf4a');blip(300,.08,'triangle',.05);setTimeout(()=>blip(220,.12,'triangle',.05),90);rumble(.2,.2,90);
  goalAdd('steal',1);}
function pickUpPkg(k){stopRake(true);carryPkg=k;k.moved=true;dropInputs();blip(420,.05,'square',.05);rumble(0,.3,60);}
function putDownPkg(){const k=carryPkg;carryPkg=null;k.x=P.x+aim.x*6;k.y=P.y+aim.y*4+2;if(pkgBlocked(k.x,k.y)){k.x=P.x;k.y=P.y+2;}k.z=4;k.vz=10;
  k.far=Math.hypot(k.x-k.hx,k.y-k.hy)>PKG_RANGE;blip(260,.06,'triangle',.05);if(!k.far)pkgHome(k);}

function updateTraffic(dt){
  trySpawn();
  for(const e of envelopes.slice()){e.t+=dt;if(e.t>=e.T){e.mb.flag=true;envelopes.splice(envelopes.indexOf(e),1);mailSound(e.x1,e.y1);}}
  for(const o of officers.slice())updateOfficer(o,dt);
  updateCouriers(dt);updatePackages(dt);
  const ob=trafficObstacles();
  for(let n=traffic.length-1;n>=0;n--){const v=traffic[n];
    if(v.kind==='cop')updateCop(v,dt);
    let stopAt=v.stopS;
    // mail stop: pause, toss the letters into the box, move on (if it got shoved past a box, it still delivers)
    if(v.stops.length){const st=v.stops[0];
      if(!st.sent&&(v.s>st.s+8||(st.s-v.s<1.5&&v.v<4)||(st.s-v.s<60&&v.v<4&&v.stuck>.4))){st.sent=true;envelopes.push({x0:v.x+v.rx*8,y0:v.y+v.ry*8,x1:st.mb.x,y1:st.mb.y,t:0,T:.45,mb:st.mb});}
      if(st.sent){v.waitT+=dt;if(v.waitT>.8||v.s>st.s+8){v.stops.shift();v.waitT=0;}}
      else stopAt=st.s;}
    if(v.park){const d=v.park.s-v.s;
      if(d<130&&!spotFree(v.park,v))v.park=null;
      else if(d<95){v.prefLat=PARK_LAT;stopAt=v.park.s;v.parkT+=dt;
        if(d<1.5&&v.v<4){if(Math.abs(v.lat-PARK_LAT)<3){parkVisitor(v);traffic.splice(n,1);continue;}v.park=null;}
        else if(v.parkT>10)v.park=null;}
      if(!v.park)v.prefLat=0;}
    if(v.kind==='van'){const s=updateVan(v,dt);if(s!=null)stopAt=s;}
    driveVehicle(v,ob,dt,stopAt);
    if(v.lights)v.can=copCans[1+(((time*6)|0)&1)];else if(v.kind==='cop')v.can=v.copDent||copCans[0];
    v.jamT=v.state!=='parked'&&v.v<1?(v.jamT||0)+dt:0;
    const off=!inAnyCam(v.x,v.y,60);
    // the safety valve for a jam the drivers can't sort out (wedged into each other, or blocked by something they
    // can't get round): stopped for GHOST_ON seconds (GHOST_OFF when nobody can see it), it drives straight through
    // whatever's in its way, colliding with nothing, until it's clear of everything again
    // (only one of a tangle goes through: not while another one close by already is)
    if(!v.ghost&&v.jamT>(off?GHOST_OFF:GHOST_ON)&&!traffic.some(o=>o.ghost&&Math.hypot(o.x-v.x,o.y-v.y)<80)){v.ghost=true;v.ghostT=0;v.stuck=0;}
    else if(v.ghost&&(v.ghostT+=dt)>.5&&(v.ghostT>20||!ob.some(o=>o.ref!==v&&boxHit(v.x,v.y,Math.cos(v.a),Math.sin(v.a),v.hl+2,v.hw+2,o)))){v.ghost=false;v.jamT=0;}
    if(v.s>=TPS[TPS.length-1]-1||(v.jamT>25&&off))traffic.splice(n,1);
  }
}
// a tall lamp post on the verge with a curved arm reaching out over the road; the lamp glows after dusk
const LAMP_H=24;
const lampHead=st=>[st.x+st.dx*10,st.y-LAMP_H+(st.dy>0?5:st.dy<0?-3:1)];
function drawStreetlight(st,cx,cy){
  const x=Math.round(st.x-cx),y=Math.round(st.y-cy);if(x<-20||x>VW+20||y<-40||y>VH+10)return;
  const [hx0,hy0]=lampHead(st),hx=Math.round(hx0-cx),hy=Math.round(hy0-cy),top=y-LAMP_H,lit=sky(hour).dark>.05;
  ctx.fillStyle='rgba(0,0,0,.28)';pellipse(ctx,x+3,y+1,5,2);ctx.fillRect(x+3,y,10,1);
  // base and pole
  ctx.fillStyle='#1c2024';ctx.fillRect(x-3,y-4,7,5);ctx.fillStyle='#4a5258';ctx.fillRect(x-2,y-4,5,3);ctx.fillStyle='#6b757c';ctx.fillRect(x-2,y-4,5,1);
  ctx.fillStyle='#1c2024';ctx.fillRect(x-1,top,3,LAMP_H-3);ctx.fillStyle='#6b757c';ctx.fillRect(x,top,1,LAMP_H-4);ctx.fillStyle='#4a5258';ctx.fillRect(x+1,top+1,1,LAMP_H-5);
  // arm: up from the pole top, then out to the head
  const ax=st.dx?hx:x,ay=st.dy?hy:top;
  ctx.fillStyle='#1c2024';pline(ctx,x,top,ax,ay-1,2);pline(ctx,ax,ay-1,hx,hy-1,2);ctx.fillStyle='#6b757c';pline(ctx,x,top,ax,ay-1,1);pline(ctx,ax,ay-1,hx,hy-1,1);
  // head: dark hood over a warm lens
  ctx.fillStyle='#14171a';ctx.fillRect(hx-4,hy-2,9,4);ctx.fillStyle='#3a4248';ctx.fillRect(hx-3,hy-2,7,2);
  ctx.fillStyle=lit?'#fff6c8':'#cfc7a0';ctx.fillRect(hx-3,hy+1,7,1);ctx.fillStyle=lit?'#ffe38a':'#a8a07c';ctx.fillRect(hx-2,hy+2,5,1);
}
function drawTraffic(v,cx,cy){if(v.x-cx<-50||v.x-cx>VW+50||v.y-cy<-50||v.y-cy>VH+50)return;if(v.ghost)ctx.globalAlpha=.6;drawRotated(v.can,v.x,v.y,v.a,cx,cy,!v.ghost);ctx.globalAlpha=1;}
function drawCourier(o,cx,cy){
  drawPed(o,cx,cy);if(!o.carry)return;
  const x=Math.round(o.x-cx)+o.fdir*3,y=Math.round(o.y-cy)-7;ctx.fillStyle='#120c08';ctx.fillRect(x-4,y-1,8,7);ctx.fillStyle='#7a5a34';ctx.fillRect(x-3,y,6,5);ctx.fillStyle='#b98a54';ctx.fillRect(x-3,y,6,4);ctx.fillStyle='#d9ab72';ctx.fillRect(x-3,y,6,1);ctx.fillStyle='#efe2c4';ctx.fillRect(x,y,1,4);
}
function drawPackage(k,cx,cy){
  const x=Math.round(k.x-cx),y=Math.round(k.y-cy),z=Math.round(k.z);if(x<-8||x>VW+8||y<-8||y>VH+8)return;
  ctx.fillStyle='rgba(0,0,0,.3)';ctx.fillRect(x-3,y+1,7,2);
  ctx.fillStyle='#120c08';ctx.fillRect(x-4,y-5-z,9,7);
  ctx.fillStyle='#7a5a34';ctx.fillRect(x-3,y-4-z,7,5);ctx.fillStyle='#b98a54';ctx.fillRect(x-3,y-4-z,7,4);ctx.fillStyle='#d9ab72';ctx.fillRect(x-3,y-4-z,7,2);ctx.fillStyle='#efe2c4';ctx.fillRect(x,y-4-z,1,4);
}
// a package away from its door: a small outlined arrow beside it pointing home, and a ring where it belongs.
// The arrows are hand-drawn pixel sprites (straight and diagonal, turned in 90 degree steps) so they stay crisp
const ARROW_E=['...#..','...##.','######','...##.','...#..'],ARROW_SE=['#.....','.#....','..#..#','...#.#','....##','..####'];
const rotGrid=g=>g[0].split('').map((_,x)=>g.map(r=>r[x]).reverse().join(''));
function arrowCan(g){const w=g[0].length+2,h=g.length+2,c=mk(w,h),q=c.getContext('2d');
  q.fillStyle='#120c08';for(let y=0;y<g.length;y++)for(let x=0;x<g[0].length;x++)if(g[y][x]==='#')q.fillRect(x,y,3,3);
  q.fillStyle='#ff9800';for(let y=0;y<g.length;y++)for(let x=0;x<g[0].length;x++)if(g[y][x]==='#')q.fillRect(x+1,y+1,1,1);return c;}
const ARROWS=(()=>{const out=[];let e=ARROW_E,d=ARROW_SE;for(let k=0;k<4;k++){out[k*2]=arrowCan(e);out[k*2+1]=arrowCan(d);e=rotGrid(e);d=rotGrid(d);}return out;})();
function drawArrow(x,y,a){const c=ARROWS[((Math.round(a/(Math.PI/4))%8)+8)%8];ctx.drawImage(c,Math.round(x-c.width/2),Math.round(y-c.height/2));}
function drawPackageCues(cx,cy){
  // slow, soft pulse at half strength
  const pulse=.5*(.35+.65*(.5+.5*Math.sin(time*2.4)));
  ctx.globalAlpha=pulse;
  for(const k of packages){if(!k.far)continue;
    const hx=k.hx-cx,hy=k.hy-cy;ctx.fillStyle='#ff9800';
    for(let i=0;i<16;i+=2){const a=i/16*Math.PI*2;ctx.fillRect(Math.round(hx+Math.cos(a)*PKG_RANGE),Math.round(hy+Math.sin(a)*PKG_RANGE*.7),1,1);}
    const x=k.x-cx,y=k.y-cy-k.z-2,a=Math.atan2(k.hy-k.y,k.hx-k.x);
    if(x>-6&&x<VW+6&&y>-6&&y<VH+6)drawArrow(x+Math.cos(a)*9,y+Math.sin(a)*9,a);
    // off screen: point the way from the screen edge, but only if it's within about an 8 second walk
    else if(Math.hypot(k.x-P.x,k.y-P.y)<PKG_CUE_WALK*78*moveMul()){const ex=clamp(x,12,VW-12),ey=clamp(y,12,VH-12),dl=Math.hypot(x-ex,y-ey)||1;ctx.fillStyle='#120c08';pcircle(ctx,ex,ey,6);ctx.fillStyle='#ff9800';pcircle(ctx,ex,ey,5);
      ctx.fillStyle='#120c08';ctx.fillRect(ex-3,ey-2,6,5);ctx.fillStyle='#b98a54';ctx.fillRect(ex-2,ey-1,4,3);
      drawArrow(ex+(x-ex)/dl*10,ey+(y-ey)/dl*10,Math.atan2(y-ey,x-ex));}
  }
  ctx.globalAlpha=1;
}
// a mailbox on its post (with the red flag up once the mail's been)
function drawMailbox(m,cx,cy){const x=Math.round(m.x-cx),y=Math.round(m.y-cy);if(x<-10||x>VW+10||y<-14||y>VH+12)return;
  ctx.fillStyle='rgba(0,0,0,.28)';ctx.fillRect(x-1,y+8,5,2);ctx.fillStyle='#5a3a24';ctx.fillRect(x-1,y+3,2,6);
  ctx.fillStyle='#2a2e33';ctx.fillRect(x-5,y-3,10,7);ctx.fillStyle=m.col;ctx.fillRect(x-4,y-2,8,5);ctx.fillStyle='#fff';ctx.fillRect(x-3,y-1,3,1);
  if(m.flag){ctx.fillStyle='#2a2e33';ctx.fillRect(x+5,y-7,1,5);ctx.fillStyle='#fe3b3b';ctx.fillRect(x+6,y-7,3,2);}}
// a little lamp on a stake by the front walk: a dark post with the lamp head on top, glowing after dusk
function drawYardLamp(l,cx,cy,lit){const x=Math.round(l.x-cx),y=Math.round(l.y-cy);if(x<-6||x>VW+6||y<-10||y>VH+6)return;
  ctx.fillStyle='rgba(0,0,0,.3)';ctx.fillRect(x,y+1,3,1);ctx.fillStyle='#1d2326';ctx.fillRect(x,y-4,2,5);
  ctx.fillStyle='#14171a';ctx.fillRect(x-1,y-6,4,1);ctx.fillStyle=lit?'#fff6c8':'#b8b088';ctx.fillRect(x,y-5,2,1);if(lit){ctx.fillStyle='#ffe38a';ctx.fillRect(x-1,y-5,1,1);ctx.fillRect(x+2,y-5,1,1);}}

// ============================================================ critters: squirrels dash between trees, birds pass overhead
const squirrels=[],birds=[];let squirrelT=10,birdT=30;
// no running through houses or swimming the pool
function clearRun(a,b){const n=Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/5);
  for(let k=1;k<n;k++){const x=a.x+(b.x-a.x)*k/n,y=a.y+(b.y-a.y)*k/n;if(wet(x,y))return false;for(const L of ALL_LOTS)if(inRect(L.house,x,y,3))return false;}return true;}
function spawnSquirrel(){
  const vis=TREES.filter(t=>inAnyCam(t.x,t.y,40));
  for(let tries=0;tries<10&&vis.length;tries++){const a=vis[(rnd()*vis.length)|0];
    const opts=TREES.filter(b=>{if(b===a)return false;const d=Math.hypot(b.x-a.x,b.y-a.y);return d>45&&d<230&&clearRun(a,b);});
    if(!opts.length)continue;const b=opts[(rnd()*opts.length)|0];
    squirrels.push({x:a.x,y:a.y,x0:a.x,y0:a.y,x1:b.x,y1:b.y,d:Math.hypot(b.x-a.x,b.y-a.y),p:0,sp:75+rnd()*35,ph:0,
      pause:rnd()<.55?.25+rnd()*.5:-1,pauseT:0,dir:b.x>=a.x?1:-1,scared:0});return;}
}
function spawnBirds(){
  const ang=rnd()*Math.PI*2,dx=Math.cos(ang),dy=Math.sin(ang),sp=70+rnd()*25,R=Math.hypot(VW,VH)/2+30,n=rnd()<.7?1:2+((rnd()*2)|0);
  const cm=randCam(),sx=cm.x+cm.w/2-dx*R-dy*(rnd()-.5)*cm.h*.6,sy=cm.y+cm.h/2-dy*R+dx*(rnd()-.5)*cm.h*.6;
  for(let k=0;k<n;k++){const side=k%2?1:-1;birds.push({x:sx-dx*k*9-dy*side*k*6,y:sy-dy*k*9+dx*side*k*6,z:40+rnd()*16,vx:dx*sp,vy:dy*sp,ph:rnd()*6,life:(2*R+80)/sp});}
}
function updateCritters(dt){
  squirrelT-=dt;if(squirrelT<=0){squirrelT=14+rnd()*26;if(hour<19&&squirrels.length<2)spawnSquirrel();}
  birdT-=dt;if(birdT<=0){birdT=35+rnd()*70;if(hour>7.3&&hour<18.5)spawnBirds();}
  for(let i=squirrels.length-1;i>=0;i--){const q=squirrels[i];
    // a blast from the blower sends it scrambling
    if(blowers(.3).some(pl=>inBlast(pl,q.x,q.y)>=0)){q.scared=1.5;q.pauseT=0;q.pause=-1;q.dir=q.x1>=q.x0?1:-1;}
    if(q.scared>0)q.scared-=dt;
    if(q.pauseT>0){q.pauseT-=dt;if(q.pauseT<.35&&q.pauseT+dt>=.35)q.dir=-q.dir;if(q.pauseT<=0)q.dir=q.x1>=q.x0?1:-1;continue;}
    if(q.pause>0&&q.p/q.d>=q.pause){q.pause=-1;q.pauseT=.5+rnd()*.8;continue;}
    q.p+=q.sp*(q.scared>0?1.8:1)*dt;q.ph+=dt*18;
    const k=Math.min(1,q.p/q.d);q.x=q.x0+(q.x1-q.x0)*k;q.y=q.y0+(q.y1-q.y0)*k;
    if(k>=1)squirrels.splice(i,1);
  }
  for(let i=birds.length-1;i>=0;i--){const b=birds[i];b.x+=b.vx*dt;b.y+=b.vy*dt;b.ph+=dt*(Math.sin(b.life*1.3)>-.3?13:0);b.life-=dt;if(b.life<=0)birds.splice(i,1);}
}
// things that stir up leaves as they pass: moving traffic hard, squirrels barely
function movers(){
  const m=[];
  for(const v of traffic)if(v.v>12)m.push({x:v.x,y:v.y,r:18,vx:Math.cos(v.a)*v.v,vy:Math.sin(v.a)*v.v,sp:v.v,k:5});
  for(const q of squirrels)if(q.pauseT<=0){const sp=q.sp*(q.scared>0?1.8:1);m.push({x:q.x,y:q.y,r:5,vx:(q.x1-q.x0)/q.d*sp,vy:(q.y1-q.y0)/q.d*sp,sp,k:1.6});}
  return m;
}
function drawSquirrel(q,cx,cy){
  const x=Math.round(q.x-cx),y=Math.round(q.y-cy);if(x<-10||x>VW+10||y<-12||y>VH+6)return;
  const d=q.dir,moving=q.pauseT<=0,hop=moving?Math.round(Math.abs(Math.sin(q.ph))*2):0,flick=!moving&&Math.sin(time*9)>.6?1:0;
  ctx.fillStyle='rgba(0,0,0,.25)';ctx.fillRect(x-3,y,7,1);
  const px=(dx,dy,w,h,c)=>{ctx.fillStyle=c;ctx.fillRect(d>0?x+dx:x-dx-w+1,y+dy-hop,w,h);};
  px(-5,-6-flick,2,4,'#a08060');px(-4,-7-flick,2,1,'#c9a880');px(-4,-3,2,2,'#8a6a50');
  px(-2,-3,4,3,'#8a6a50');px(-1,-1,3,1,'#c9a880');
  px(2,-4,2,2,'#8a6a50');px(3,-4,1,1,'#1a1010');px(2,-5,1,1,'#6a4e38');
  px(-2,0,1,1,'#5a4230');px(1,0,1,1,'#5a4230');
}
function drawBird(b,cx,cy){
  const x=Math.round(b.x-cx),y=Math.round(b.y-b.z-cy);if(x<-6||x>VW+6||y<-6||y>VH+6)return;
  const up=Math.sin(b.ph)>0;ctx.fillStyle='#2a2a33';ctx.fillRect(x,y,1,2);
  if(up){ctx.fillRect(x-2,y-2,1,1);ctx.fillRect(x-1,y-1,1,1);ctx.fillRect(x+1,y-1,1,1);ctx.fillRect(x+2,y-2,1,1);}
  else{ctx.fillRect(x-2,y+1,1,1);ctx.fillRect(x-1,y,1,1);ctx.fillRect(x+1,y,1,1);ctx.fillRect(x+2,y+1,1,1);}
}
