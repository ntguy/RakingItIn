'use strict';
// ============================================================ neighborhood
const TUNNELS=[],DRIVES=[],LOTS=[],FILLER_LOTS=[],ALL_LOTS=[],TREES=[],WALLS=[],STREETLIGHTS=[],CARS=[],STREET_CARS=[],MOUTHS=[],PATH=[],POTS=[],NETS=[],POOLS=[];
// per-pixel world maps. REG: 0 woods, 1 road, 2 verge, 3 sidewalk, 4 lot
const REG=new Uint8Array(WORLD_W*H),LOT_AT=new Int8Array(WORLD_W*H).fill(-1),SURF=new Uint8Array(WORLD_W*H),NEAR=new Uint8Array(WORLD_W*H);
// WATER: 0 dry, else pool index + 1
const WATER=new Uint8Array(WORLD_W*H);
const wet=(x,y)=>x>=0&&y>=0&&x<WORLD_W&&y<H?WATER[(y|0)*WORLD_W+(x|0)]:0;
const GC=64,GW=Math.ceil(WORLD_W/GC)+1;let CAR_GRID=[];
function zoneBox(z){return z.shape==='e'?{x0:z.cx-z.rx,y0:z.cy-z.ry,x1:z.cx+z.rx,y1:z.cy+z.ry}:z;}
function inZone(z,x,y){
  if(z.shape==='e'){const dx=(x-z.cx)/z.rx,dy=(y-z.cy)/z.ry;return dx*dx+dy*dy<1;}
  if(x<z.x0||x>=z.x1||y<z.y0||y>=z.y1)return false;
  if(z.shape==='q'){const dx=(x-z.ax)/(z.x1-z.x0),dy=(y-z.ay)/(z.y1-z.y0);return dx*dx+dy*dy<1;}
  return true;
}
// ZONE_AT: for each pixel inside a lot, which of that lot's zones covers it (the first one listed, where they overlap),
// or -1. Built once with the lots, so asking what a leaf is sitting in is a lookup rather than a geometry test
const ZONE_AT=new Int8Array(WORLD_W*H).fill(-1);
const zoneIdx=(L,x,y)=>{if(x<0||y<0||x>=WORLD_W||y>=H)return -1;const i=(y|0)*WORLD_W+(x|0);return LOT_AT[i]===L.li?ZONE_AT[i]:-1;};
function zoneAt(L,x,y){const q=zoneIdx(L,x,y);return q<0?0:L.zones[q].good?1:2;}
function makeCarObj(cx,cy,vert,dir,col){
  const w=vert?16:34,h=vert?34:16,c={x0:Math.round(cx-w/2),y0:Math.round(cy-h/2),vert,dir,col};c.x1=c.x0+w;c.y1=c.y0+h;c.can=makeCar(col);CARS.push(c);return c;
}
function roadDist(x,y){
  let best=1e9,bi=0;
  for(let i=0;i<ROADS.length;i++){const r=ROADS[i],dx=Math.max(r.x0-x,0,x-r.x1),dy=Math.max(r.y0-y,0,y-r.y1),d=dx||dy?Math.hypot(dx,dy):0;if(d<best){best=d;bi=i;}}
  for(let i=0;i<CIRCLES.length;i++){const c=CIRCLES[i],d=Math.max(0,Math.hypot(x-c.x,y-c.y)-c.r);if(d<best){best=d;bi=ROADS.length+i;}}
  return[best,bi];
}
function buildLots(){
  // classify every pixel by its distance to the road network
  for(let y=0;y<H;y++)for(let x=0;x<WORLD_W;x++){
    const [d,bi]=roadDist(x+.5,y+.5),i=y*WORLD_W+x;
    REG[i]=d<=0?1:d<=VERGE?2:d<=VERGE+SWW?3:0;NEAR[i]=bi;if(REG[i])SURF[i]=1;
  }
  // (the tutorial never uses yards from the editor)
  HOUSES.forEach((c,k)=>{const L=makeLot(k,c,mulberry(1000+k*7919),false,TUTORIAL?c.yard:YARDS[k]||c.yard);orient(L,c.face,c.x,c.y);LOTS.push(L);});
  FILLERS.forEach((c,i)=>{const L=makeLot(LOTS.length+i,{hood:1,...c},mulberry(5000+i*131),true);orient(L,c.face,c.x,c.y);});
  ALL_LOTS.push(...LOTS,...FILLER_LOTS);
  ALL_LOTS.forEach((L,li)=>{L.li=li;
    for(let y=L.y0;y<L.y1;y++)for(let x=L.x0;x<L.x1;x++){const i=y*WORLD_W+x;REG[i]=4;LOT_AT[i]=li;SURF[i]=0;}
    // (last zone first, so where zones overlap the earlier one wins, as it did when zones were tested in order)
    for(let q=L.zones.length-1;q>=0;q--){const z=L.zones[q],b=zoneBox(z);
      for(let y=Math.max(L.y0,Math.floor(b.y0));y<Math.min(L.y1,Math.ceil(b.y1));y++)for(let x=Math.max(L.x0,Math.floor(b.x0));x<Math.min(L.x1,Math.ceil(b.x1));x++)if(inZone(z,x+.5,y+.5))ZONE_AT[y*WORLD_W+x]=q;}
    for(const p of L.paved)for(let y=p.y0;y<p.y1;y++)for(let x=p.x0;x<p.x1;x++)SURF[y*WORLD_W+x]=1;
    WALLS.push(...L.fences,...L.obst);
    let k=0;
    for(const z of L.zones){if(z.type!=='pool')continue;
      const b=zoneBox(z),pl={id:POOLS.length,x0:Math.round(b.x0+COPE),y0:Math.round(b.y0+COPE),x1:Math.round(b.x1-COPE),y1:Math.round(b.y1-COPE),lot:L,cnt:0};POOLS.push(pl);
      // (a round pool's water is the ellipse inside its wall)
      if(z.shape==='e')pl.e={cx:z.cx,cy:z.cy,rx:z.rx-COPE,ry:z.ry-COPE};
      for(let y=pl.y0;y<pl.y1;y++)for(let x=pl.x0;x<pl.x1;x++){if(pl.e){const dx=(x+.5-pl.e.cx)/pl.e.rx,dy=(y+.5-pl.e.cy)/pl.e.ry;if(dx*dx+dy*dy>=1)continue;}WATER[y*WORLD_W+x]=pl.id+1;}
      const n=L.nets[k++];if(n)n.pool=pl;}
  });
  // At the bends and round the turning circle the curved sidewalk pulls away from the square corners of the yards,
  // leaving slivers of woods (drawn as hedge, and solid) to snag on between the two. Grass them over as verge: woods
  // whose nearest bit of road is a curve, close to the sidewalk and close to a yard
  const GAP=36,REACH=24,lotNear=(x,y)=>{for(let k=1;k<=REACH;k+=2)for(const [qx,qy] of [[x+k,y],[x-k,y],[x,y+k],[x,y-k]])if(qx>=0&&qy>=0&&qx<WORLD_W&&qy<H&&LOT_AT[qy*WORLD_W+qx]>=0)return true;return false;};
  CIRCLES.forEach((c,ci)=>{const R=c.r+VERGE+SWW+GAP;
    for(let y=Math.max(0,c.y-R|0);y<Math.min(H,c.y+R);y++)for(let x=Math.max(0,c.x-R|0);x<Math.min(WORLD_W,c.x+R);x++){const i=y*WORLD_W+x;
      if(REG[i]||NEAR[i]!==ROADS.length+ci||Math.hypot(x+.5-c.x,y+.5-c.y)>R||!lotNear(x,y))continue;REG[i]=2;SURF[i]=1;}});
  // streetlights on the verge, skipping driveway mouths and intersections
  for(const r of ROADS){const len=r.h?r.x1-r.x0:r.y1-r.y0;
    for(let a=90,side=-1;a<len-40;a+=210,side=-side){
      const x=r.h?r.x0+a:r.c+side*(RH+4),y=r.h?r.c+side*(RH+4):r.y0+a;
      if(REG[(y|0)*WORLD_W+(x|0)]!==2)continue;
      if(MOUTHS.some(m=>inRect(m,x,y,8)))continue;
      STREETLIGHTS.push({x,y,dx:r.h?0:-side,dy:r.h?-side:0});
    }
  }
  // street parking along the curbs (the tutorial keeps its streets clear)
  const R=mulberry(4242);
  for(const r of TUTORIAL?[]:ROADS){const len=r.h?r.x1-r.x0:r.y1-r.y0;
    for(const side of [-1,1]){
      for(let a=40;a<len-40;a+=48+R()*150){
        if(R()<(side<0?.45:.6))continue;
        const po=Math.round(RH*.72),cx=r.h?r.x0+a:r.c+side*po,cy=r.h?r.c+side*po:r.y0+a,hw=r.h?17:8,hh=r.h?8:17;
        const box={x0:cx-hw,y0:cy-hh,x1:cx+hw,y1:cy+hh};
        if(ROADS.some(o=>o!==r&&rectsHit(o,box,24)))continue;
        if(Math.hypot(cx-BULB.x,cy-BULB.y)<BULB.r+40)continue;
        if(MOUTHS.some(m=>rectsHit(m,box,6)))continue;
        // (and none in the truck's spot at the start of the street)
        if(r===ROADS[0]&&cx<TR.x+130)continue;
        const dir=r.h?(side>0?1:-1):(side<0?1:-1);
        STREET_CARS.push(makeCarObj(cx,cy,!r.h,R()<.8?dir:-dir,carCol(r.hood,R())));
      }
    }
  }
  WALLS.push(...STREET_CARS);
  CAR_GRID=Array.from({length:GW*(Math.ceil(H/GC)+1)},()=>[]);
  for(const c of STREET_CARS)for(let by=Math.floor(c.y0/GC);by<=Math.floor(c.y1/GC);by++)for(let bx=Math.floor(c.x0/GC);bx<=Math.floor(c.x1/GC);bx++)CAR_GRID[by*GW+bx].push(c);
  buildPedPath();
}
// The street's corners as a list of turns: for each bend, the corner point and the unit headings in and out
const segDir=(a,b)=>{const dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy)||1;return[dx/l,dy/l];};
// one side of the street, offset o to the left (side=-1) or right (side=1) of the way it runs, from its start out to
// where it meets the turning circle (circle radius rb). At each bend the outside of the turn rounds off on an arc, the
// inside just cuts the corner. Returns the points, ending at the circle
function streetSide(pts,list,o,side,rb,arcN){
  const nrm=([dx,dy])=>side>0?[-dy,dx]:[dy,-dx];
  const n0=nrm(segDir(list[0],list[1]));pts.push([list[0][0]+n0[0]*o,list[0][1]+n0[1]*o]);
  for(let i=1;i<list.length-1;i++){const di=segDir(list[i-1],list[i]),dn=segDir(list[i],list[i+1]),ni=nrm(di),nn=nrm(dn),[vx,vy]=list[i];
    // turning away from this side (it's the outside of the bend): an arc round the corner
    const cross=di[0]*dn[1]-di[1]*dn[0],outside=side>0?cross<0:cross>0;
    if(outside&&arcN){let a0=Math.atan2(ni[1],ni[0]),a1=Math.atan2(nn[1],nn[0]);if(a1-a0>Math.PI)a1-=Math.PI*2;if(a1-a0<-Math.PI)a1+=Math.PI*2;
      for(let k=0;k<=arcN;k++){const a=a0+(a1-a0)*k/arcN;pts.push([vx+Math.cos(a)*o,vy+Math.sin(a)*o]);}}
    else pts.push([vx+(ni[0]+nn[0])*o,vy+(ni[1]+nn[1])*o]);}
  const n=list.length,dl=segDir(list[n-2],list[n-1]),nl=nrm(dl),ax=Math.sqrt(Math.max(0,rb*rb-o*o)),[cx,cy]=list[n-1];
  pts.push([cx-dl[0]*ax+nl[0]*o,cy-dl[1]*ax+nl[1]*o]);
  return pts;
}
// round the far side of the turning circle (radius rb), from lateral offset o on one side of the street to the other
function bulbArc(pts,o,side,rb,N){
  const n=STREET.length,d=segDir(STREET[n-2],STREET[n-1]),w=side>0?[-d[1],d[0]]:[d[1],-d[0]],u=[-d[0],-d[1]],a0=Math.atan2(o,Math.sqrt(Math.max(0,rb*rb-o*o)));
  for(let k=1;k<N;k++){const a=a0+(Math.PI*2-2*a0)*k/N;pts.push([BULB.x+rb*(Math.cos(a)*u[0]+Math.sin(a)*w[0]),BULB.y+rb*(Math.cos(a)*u[1]+Math.sin(a)*w[1])]);}
}
// sidewalk loop for pedestrians: out along the left-hand sidewalk to the cul-de-sac, around it, and back along the other
function buildPedPath(){
  const o=PED_OFF,rb=BULB.r+(PED_OFF-RH);
  const pts=streetSide([],STREET,o,-1,rb,8);bulbArc(pts,o,-1,rb,24);
  const back=streetSide([],STREET,o,1,rb,8).reverse();pts.push(...back);
  for(let i=0;i<pts.length-1;i++){const [x0,y0]=pts[i],[x1,y1]=pts[i+1],n=Math.max(1,Math.round(Math.hypot(x1-x0,y1-y0)/3));
    for(let k=0;k<n;k++)PATH.push({x:x0+(x1-x0)*k/n,y:y0+(y1-y0)*k/n});}
  PATH.push({x:pts[pts.length-1][0],y:pts[pts.length-1][1]});
}
// lots are generated in a local frame (street along the bottom edge, y=d) then rotated into place
function orient(L,face,ox,oy){
  const {w,d}=L,rot=face==='S'?0:face==='N'?2:face==='W'?1:3;
  Object.assign(L,{face,ox,oy,rot});
  L.T=(x,y)=>rot===0?[ox+x,oy+y]:rot===2?[ox+w-x,oy+d-y]:rot===1?[ox+d-y,oy+x]:[ox+y,oy+w-x];
  L.toLocal=(x,y)=>rot===0?[x-ox,y-oy]:rot===2?[ox+w-x,oy+d-y]:rot===1?[y-oy,ox+d-x]:[oy+w-y,x-ox];
  L.V=(x,y)=>rot===0?[x,y]:rot===2?[-x,-y]:rot===1?[-y,x]:[y,-x];
  const TRc=r=>{const a=L.T(r.x0,r.y0),b=L.T(r.x1,r.y1);return{...r,x0:Math.min(a[0],b[0]),y0:Math.min(a[1],b[1]),x1:Math.max(a[0],b[0]),y1:Math.max(a[1],b[1])};};
  L.x0=ox;L.y0=oy;L.x1=ox+(rot&1?d:w);L.y1=oy+(rot&1?w:d);
  L.front=L.V(0,1);
  L.fences=L.lfences.map(TRc);L.house=TRc(L.lhouse);L.paved=L.lpaved.map(TRc);
  L.zones=L.lz.map(z=>{
    if(z.shape==='e'){const [cx,cy]=L.T(z.cx,z.cy),rx=rot&1?z.ry:z.rx,ry=rot&1?z.rx:z.ry;return{...z,cx,cy,rx,ry,x0:cx-rx,y0:cy-ry,x1:cx+rx,y1:cy+ry};}
    const r=TRc(z);if(z.shape==='q'){const [ax,ay]=L.T(z.ax,z.ay);r.ax=ax;r.ay=ay;}return r;
  });
  for(const z of L.zones)z.outline=zoneOutline(z,L.house);
  const [dx,dy]=L.T(L.ldoor.x,L.ldoor.y);L.door={x:Math.round(dx),y:Math.round(dy)};
  L.cars=L.lcars.map(c=>{const [x,y]=L.T(c.cx,c.cy),[vx,vy]=L.V(c.vert?0:c.dir,c.vert?c.dir:0);return makeCarObj(x,y,vx===0,Math.sign(vx||vy),c.col);});
  L.trees=L.ltrees.map(t=>{const [x,y]=L.T(t.x,t.y),tw={x:Math.round(x),y:Math.round(y),r:t.r,pal:t.pal,lot:L,rate:t.rate};TREES.push(tw);return tw;});
  L.shrubs=(L.lshrubs||[]).map(b=>{const r=b.r;return{...TRc({x0:b.x-r*.85,y0:b.y-r*.75,x1:b.x+r*.85,y1:b.y+r*.7}),r};});
  // patio furniture is solid too (each piece's footprint)
  L.furn=(L.lfurn||[]).map(f=>TRc({x0:f.x-f.w/2,y0:f.y-f.h/2,x1:f.x+f.w/2,y1:f.y+f.h/2}));
  // (a struct with a tunnel through it is solid either side of the tunnel)
  L.structs=(L.lstructs||[]).flatMap(q=>{if(!q.gap)return[q];const v=q.y1-q.y0>=q.x1-q.x0,[a,b]=q.gap;return v?[{...q,y1:a},{...q,y0:b}]:[{...q,x1:a},{...q,x0:b}];}).map(TRc);
  L.obst=[L.house,...L.structs,...L.cars,...L.shrubs,...L.furn];
  L.pots=L.lpots.map(p=>{const [x,y]=L.T(p.x,p.y),o={x:Math.round(x),y:Math.round(y),r:p.big?5:3,big:p.big,col:p.col,fl:p.fl,lot:L,broken:false,stress:0,wob:0,touch:false};POTS.push(o);return o;});
  L.nets=L.lnets.map(n=>{const [x,y]=L.T(n.x,n.y),[vx,vy]=L.V(Math.cos(n.a),Math.sin(n.a)),o={hx:x,hy:y,ha:Math.atan2(vy,vx),lot:L,held:false,n:0};o.x=o.hx;o.y=o.hy;o.a=o.ha;NETS.push(o);return o;});
  for(const p of L.lpaved)if(p.kind==='drive'&&p.y1===d)MOUTHS.push(TRc({x0:p.x0-10,y0:d,x1:p.x1+10,y1:d+FRONT}));
  for(const p of L.lpaved)if(p.kind!=='path')DRIVES.push(TRc({x0:p.x0,y0:p.y0,x1:p.x1,y1:p.y1===d?d+VERGE+SWW+30:p.y1}));
  // Willow Heights: little lamps lining the front walk, both sides
  // (plus any lamp posts the yard puts up)
  L.lamps=(L.llamps||[]).map(q=>{const [x,y]=L.T(q.x,q.y);return{x:Math.round(x),y:Math.round(y)};});if(L.hood===2&&!L.filler){const p=L.lpaved.find(q=>q.kind==='path');if(p)for(let y=p.y0+10;y<p.y1-6;y+=22)for(const x of [p.x0-3,p.x1+3]){const [wx,wy]=L.T(x,y);L.lamps.push({x:Math.round(wx),y:Math.round(wy)});}}
  L.aprons=L.lpaved.filter(p=>p.kind==='drive'&&p.y1===d).map(p=>TRc({x0:p.x0,y0:d,x1:p.x1,y1:d+VERGE+SWW}));
  if(L.filler)FILLER_LOTS.push(L);
}
// pixels just outside a zone, used for the marching-ants hint
function zoneOutline(z,house){
  const b=zoneBox(z),x0=Math.floor(b.x0)-1,y0=Math.floor(b.y0)-1,x1=Math.ceil(b.x1)+1,y1=Math.ceil(b.y1)+1,out=[];
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
    if(inZone(z,x+.5,y+.5)||(house&&inRect(house,x+.5,y+.5)))continue;
    if(inZone(z,x+1.5,y+.5)||inZone(z,x-.5,y+.5)||inZone(z,x+.5,y+1.5)||inZone(z,x+.5,y-.5))out.push(x,y);
  }
  return Int16Array.from(out);
}
// side fences closing off the backyard, with a gate each side; switched off but kept for later
const BACKYARD_FENCES=false;
// cfg: {w,d,s (style),hood,level,name,tag, and optionally h:[x,y,w,h] for the house and dx for the door}
function makeLot(k,cfg,R,filler,custom){
  const {w,d,s}=cfg;
  const L={k,style:s,apt:!!cfg.apt,bdx:cfg.bdx||[],gdx:cfg.gdx||null,hood:cfg.hood??1,level:cfg.level||0,w,d,filler:!!filler,lshrubs:[],lz:[],lpaved:[],lcars:[],ltrees:[],lpots:[],lnets:[],deco:[],name:filler?'':cfg.name,tag:filler?'':cfg.tag,done:false,hauled:0,paidAmt:0};
  L.lfences=[{x0:0,y0:0,x1:6,y1:d},{x0:w-6,y0:0,x1:w,y1:d},{x0:0,y0:0,x1:w,y1:6}];
  // the house sits toward the street with a modest front lawn, leaving a real backyard behind it (unless it's placed)
  let hw=Math.round(clamp(w*.42,72,190)),hh=Math.round(clamp(d*.28,46,122)),F=Math.round(clamp(d*.34,64,150)+R()*8);
  let hx=Math.round(14+(w-28-hw)*(s===7?.12:.2+R()*.6)),hy=d-F-hh;
  if(cfg.h){[hx,hy,hw,hh]=cfg.h;F=d-hy-hh;}
  L.lhouse={x0:hx,y0:hy,x1:hx+hw,y1:hy+hh};
  L.ldoor={x:cfg.dx??hx+Math.round(hw*(s>=1?.36:.5)),y:hy+hh};
  const door=L.ldoor,occ=[{x0:hx-4,y0:hy-4,x1:hx+hw+4,y1:hy+hh+8}];
  L.lpaved.push({x0:door.x-5,y0:hy+hh+6,x1:door.x+5,y1:d,kind:'path'});
  occ.push({x0:door.x-8,y0:hy+hh,x1:door.x+8,y1:d});
  // backyard fence: from each side of the house out to the side fence, with a gate gap in each run (off for now)
  const fy=hy+Math.round(hh*.45),GATE=20;L.gates=[];
  if(BACKYARD_FENCES)for(const [a,b] of [[6,hx],[hx+hw,w-6]]){const len=b-a;if(len<GATE+12){if(len>0)occ.push({x0:a,y0:fy-6,x1:b,y1:fy+12});continue;}
    const gx=a<hx?a+Math.round((len-GATE)*.5):a+Math.round((len-GATE)*.5);
    if(gx-a>2)L.lfences.push({x0:a,y0:fy,x1:gx,y1:fy+6,wing:true});if(b-gx-GATE>2)L.lfences.push({x0:gx+GATE,y0:fy,x1:b,y1:fy+6,wing:true});
    L.gates.push({x0:gx,x1:gx+GATE,y:fy});occ.push({x0:a,y0:fy-2,x1:b,y1:fy+8},{x0:gx-2,y0:fy-16,x1:gx+GATE+2,y1:fy+22});}
  const back={x0:10,y0:10,x1:w-10,y1:fy-4},front={x0:10,y0:hy+hh+6,x1:w-10,y1:d-8};
  const finish=()=>{
    const h=L.lhouse,G=10,IN=4,DEEP=26;
    const blocked=r=>L.lpaved.some(p=>rectsHit(p,r))||L.lz.some(o=>!o.good&&rectsHit(o,r));
    const grow=(z,k,v)=>{const t={...z,[k]:v};if(!blocked(t))z[k]=v;};
    for(const z of L.lz){if(!z.good||z.shape!=='r')continue;
      const ox=z.x0<h.x1&&z.x1>h.x0,oy=z.y0<h.y1&&z.y1>h.y0;
      if(ox&&z.y0>=h.y1-IN&&z.y0<=h.y1+G){z.y0=h.y1-IN;for(let v=Math.min(d-8,h.y1+DEEP);v>z.y1;v-=2){if(!blocked({...z,y1:v})){z.y1=v;break;}}}
      else if(ox&&z.y1<=h.y0+IN&&z.y1>=h.y0-G){z.y1=h.y0+IN;for(let v=Math.max(6,h.y0-DEEP);v<z.y0;v+=2){if(!blocked({...z,y0:v})){z.y0=v;break;}}}
      else if(oy&&z.x0>=h.x1-IN&&z.x0<=h.x1+G){z.x0=h.x1-IN;for(let v=Math.min(w-6,h.x1+DEEP);v>z.x1;v-=2){if(!blocked({...z,x1:v})){z.x1=v;break;}}}
      else if(oy&&z.x1<=h.x0+IN&&z.x1>=h.x0-G){z.x1=h.x0+IN;for(let v=Math.max(6,h.x0-DEEP);v<z.x0;v+=2){if(!blocked({...z,x0:v})){z.x0=v;break;}}}
    }
    if(R()<.8)L.deco.push({t:'pumpkin',x:door.x-14,y:door.y+10});
    if(s>=1)L.deco.push({t:'pumpkin',x:door.x+13,y:door.y+12});
    L.lmailbox={x:door.x+14,y:d-8};
    placeNets(L);
    planFurniture(L);
    if(!custom)placePots(L,R);
    return L;
  };
  if(custom){applyYard(L,typeof custom==='function'?custom(L):custom);return finish();}
  const car=(cx,cy,vert,dir,col)=>L.lcars.push({cx,cy,vert,dir,col});
  const carRect=c=>{const a=c.vert?8:17,b=c.vert?17:8;return{x0:c.cx-a,y0:c.cy-b,x1:c.cx+a,y1:c.cy+b};};
  const dc=DRIVE_CFG[s];
  if(dc&&R()<(dc.p??1)){
    if(dc.loop){
      const sy=hy+hh+28,aw=30;
      const left={x0:hx-6,y0:sy,x1:hx-6+aw,y1:d,kind:'drive'},right={x0:hx+hw-aw+6,y0:sy,x1:hx+hw+6,y1:d,kind:'drive'},strip={x0:hx-6,y0:sy,x1:hx+hw+6,y1:sy+26,kind:'strip'};
      L.lpaved.push(left,right,strip);occ.push({x0:left.x0-4,y0:sy-4,x1:right.x1+4,y1:sy+30},{x0:left.x0-4,y0:sy,x1:left.x1+4,y1:d},{x0:right.x0-4,y0:sy,x1:right.x1+4,y1:d});
      car(hx+hw*.58,sy+13,false,1,carCol(L.hood,R()));car(hx+hw*.82,sy+13,false,1,carCol(L.hood,R()));car((right.x0+right.x1)/2,sy+70,true,-1,carCol(L.hood,R()));
    }else{
      const dw=dc.w,dx=hx+hw-dw-2,dr={x0:dx,y0:hy+hh,x1:dx+dw,y1:d,kind:'drive'};
      L.lpaved.push(dr);occ.push({x0:dx-4,y0:hy+hh,x1:dx+dw+4,y1:d});
      const cy=()=>hy+hh+21+R()*Math.max(0,F-46);
      if(dc.cars===2){car(dx+dw*.27,hy+hh+21,true,-1,carCol(L.hood,R()));car(dx+dw*.73,cy(),true,-1,carCol(L.hood,R()));}
      else if(R()<.85)car(dx+dw/2,cy(),true,R()<.7?-1:1,carCol(L.hood,R()));
    }
  }
  const yard={x0:10,y0:10,x1:w-10,y1:d-8};
  const place=(zw,zh,box=yard,tries=90)=>{
    for(let t=0;t<tries;t++){const zx=Math.round(box.x0+R()*(box.x1-box.x0-zw)),zy=Math.round(box.y0+R()*(box.y1-box.y0-zh));
      const r={x0:zx,y0:zy,x1:zx+zw,y1:zy+zh};if(r.x0<yard.x0||r.x1>yard.x1||r.y0<yard.y0||r.y1>yard.y1)continue;
      if(occ.some(o=>rectsHit(o,r,5)))continue;occ.push(r);return r;}
    return null;};
  const addRect=(r,type,good)=>{if(r)L.lz.push({...r,type,good,shape:'r'});};
  // foundation beds hugging the front of the house, either side of the door
  const by=hy+hh+5,bh=20+Math.min(8,s);
  if(door.x-9-(hx-2)>14){const r={x0:hx-2,y0:by,x1:door.x-9,y1:by+bh};occ.push(r);addRect(r,'mulch',true);}
  const dr=L.lpaved.find(p=>p.kind==='drive'&&p.y0===hy+hh);
  const rEnd=dr?dr.x0-6:hx+hw+2;
  if(rEnd-(door.x+9)>14){const r={x0:door.x+9,y0:by,x1:rEnd,y1:by+bh};occ.push(r);addRect(r,'mulch',true);}
  // fancy stuff next, so the beds can fit around it. Patio steps straight off the back of the house
  const fits=(bw,bh,box)=>box.x1-box.x0>=bw&&box.y1-box.y0>=bh;
  if(s>=3){const pw=Math.min(hw-8,Math.round(44+s*9)),ph=Math.round(28+s*4);
    if(hy-10-ph>=10){const px=Math.round(hx+4+R()*(hw-8-pw)),r={x0:px,y0:hy-5-ph,x1:px+pw,y1:hy-5};if(!occ.some(o=>rectsHit(o,r,0))){occ.push(r);addRect(r,'patio',false);}}
    else if(fits(pw,ph,back))addRect(place(pw,ph,back,120),'patio',false);}
  // pools: more likely and bigger the fancier the house, always out back. A margin is kept for the deck, net and pots
  if(R()<POOL_CHANCE[s]){const pw=Math.round(56+s*11+R()*14),ph=Math.round(36+s*6+R()*8),M=9;
    if(fits(pw+M*2,ph+M*2,back)){const r=place(pw+M*2,ph+M*2,back,160);
      if(r)L.lz.push({x0:r.x0+M,y0:r.y0+M,x1:r.x1-M,y1:r.y1-M,type:'pool',good:false,shape:'r'});}}
  // a vegetable/flower garden out back; the grandest houses add a show garden out front too
  if(s>=5&&fits(56+s*7,34+s*5,back))addRect(place(Math.round(56+s*7),Math.round(34+s*5),back,120),'garden',false);
  if(s>=7){addRect(place(110,50,front,120),'garden',false);if(fits(90,56,back))addRect(place(90,56,back),'patio',false);}
  // quarter-round beds tucked into yard corners; shrink until they fit
  const cornerBed=(ax,ay,sx,sy,rw,rh,type='mulch')=>{
    for(let t=0;t<7;t++){const bw=Math.round(rw*(1-t*.12)),bh2=Math.round(rh*(1-t*.12));if(bw<18||bh2<14)return;
      const r={x0:sx>0?ax:ax-bw,y0:sy>0?ay:ay-bh2,x1:sx>0?ax+bw:ax,y1:sy>0?ay+bh2:ay};
      if(occ.some(o=>rectsHit(o,r,3)))continue;occ.push(r);L.lz.push({...r,ax,ay,type,good:true,shape:'q'});return;}
  };
  // long beds running along a fence line
  const edgeBed=(side,type='mulch')=>{
    const bw=12+Math.min(10,s*2);
    for(let t=0;t<12;t++){const len=Math.round((d-60)*(.3+R()*.35)),y0=Math.round(30+R()*(d-60-len));
      const r=side==='back'?(()=>{const l2=Math.round((w-80)*(.3+R()*.3)),x0=Math.round(40+R()*(w-80-l2));return{x0,y0:6,x1:x0+l2,y1:6+bw};})()
        :{x0:side<0?6:w-6-bw,y0,x1:side<0?6+bw:w-6,y1:y0+len};
      if(r.x1-r.x0<20||r.y1-r.y0<10)continue;
      if(occ.some(o=>rectsHit(o,r,4)))continue;occ.push(r);addRect(r,type,true);return;}
  };
  const cw=36+s*9+R()*14,ch=28+s*6+R()*10;
  cornerBed(6,6,1,1,cw,ch);cornerBed(w-6,6,-1,1,cw*(.8+R()*.4),ch*(.8+R()*.4));
  if(s>=2)edgeBed(R()<.5?-1:1);
  if(s>=4){edgeBed(-1);edgeBed(1);cornerBed(6,d,1,-1,cw*.7,ch*.7);}
  if(s>=6){edgeBed('back');cornerBed(w-6,d,-1,-1,cw*.7,ch*.7);}
  if(s>=4&&back.y1-back.y0>40)addRect(place(Math.round(w*.2),Math.round(Math.min(d*.2,(back.y1-back.y0)*.6)),{x0:back.x0,y0:6,x1:back.x1,y1:back.y1}),'natural',true);
  if(s>=6)edgeBed(R()<.5?-1:1,'natural');
  const nt=[2,2,3,3,4,5,6,9][s];
  for(let i=0,tries=0;i<nt&&tries<500;tries++){
    const r=Math.round(20+s*3.8+R()*7),tx=Math.round(14+R()*(w-28)),ty=Math.round(18+R()*(d-40));
    if(inRect(L.lhouse,tx,ty,r*.55))continue;
    if(L.lpaved.some(p=>inRect(p,tx,ty,8)))continue;
    if(L.lcars.some(c=>inRect(carRect(c),tx,ty,8)))continue;
    if(L.lz.some(z=>!z.good&&inRect(zoneBox(z),tx,ty,10)))continue;
    if(L.ltrees.some(t=>Math.hypot(t.x-tx,t.y-ty)<(t.r+r)*.75))continue;
    if((BACKYARD_FENCES&&Math.abs(ty-fy-3)<9)||L.gates.some(g=>tx>g.x0-10&&tx<g.x1+10&&Math.abs(ty-fy)<22))continue;
    L.ltrees.push({x:tx,y:ty,r,pal:(R()*4)|0,rate:.22+s*.1});i++;
  }
  return finish();
}
// ---------- patio furniture
// Each patio gets furniture to suit its size: a bistro set on a little one, a table and chairs (and maybe a grill) on
// a middling one, and a mix of dining sets, sun loungers, fire pits, sofas and umbrellas on a big one (loungers first
// beside a pool). Groups are laid along the patio's long side, centred, and anything that won't fit is left out.
// Pieces are [kind, dx, dy, w, h] from the group's centre; every piece is solid
const FURN_GROUPS={
  bistro:{w:18,h:10,p:[['rtable',0,0,6,6],['chair',-6,0,4,4],['chair',6,0,4,4]]},
  dining4:{w:30,h:28,p:[['rtable',0,0,12,12],['chair',-11,0,4,4],['chair',11,0,4,4],['chair',0,-11,4,4],['chair',0,11,4,4]]},
  dining6:{w:30,h:26,p:[['table',0,0,22,8],['chair',-7,-8,4,4],['chair',0,-8,4,4],['chair',7,-8,4,4],['chair',-7,8,4,4],['chair',0,8,4,4],['chair',7,8,4,4]]},
  umbrella:{w:30,h:28,p:[['rtable',0,0,12,12],['chair',-11,0,4,4],['chair',11,0,4,4],['chair',0,-11,4,4],['chair',0,11,4,4],['umbrella',0,0,2,2]]},
  lounge:{w:34,h:20,p:[['lounger',-12,0,8,18],['lounger',0,0,8,18],['lounger',12,0,8,18]]},
  firepit:{w:30,h:30,p:[['firepit',0,0,10,10],['chair',-11,-7,4,4],['chair',11,-7,4,4],['chair',-11,7,4,4],['chair',11,7,4,4]]},
  sofa:{w:34,h:22,p:[['sofa',-3,-7,26,6],['sofa',-13,2,6,14],['ctable',2,3,12,6],['chair',13,3,4,4]]},
  grill:{w:14,h:10,p:[['grill',0,0,12,8]]},
  planters:{w:12,h:24,p:[['planter',0,-7,8,8],['planter',0,7,8,8]]},
};
function planFurniture(L){
  L.lfurn=[];
  for(const z of L.lz){if(z.type!=='patio')continue;
    // for a round patio, work inside the square that fits within it
    const b=zoneBox(z),k=z.shape==='e'?.7:1,cx=(b.x0+b.x1)/2,cy=(b.y0+b.y1)/2,W=(b.x1-b.x0)*k-8,Hh=(b.y1-b.y0)*k-8,horiz=W>=Hh;
    const along=horiz?W:Hh,across=horiz?Hh:W,r=hash(Math.round(b.x0)+L.k*7,Math.round(b.y0));
    const byPool=L.lz.some(p=>p.type==='pool'&&rectsHit(zoneBox(p),b,14));
    let want;
    if(along<40||across<24)want=['bistro'];
    else if(along<100)want=r<.5?['dining4','grill']:['dining6','planters'];
    else{const pool=['umbrella','dining6','firepit','sofa','dining4','grill'];want=byPool?['lounge']:[];
      for(let q=0;q<pool.length;q++){const g=pool[(q+((r*pool.length)|0))%pool.length];if(!want.includes(g))want.push(g);}}
    // keep groups while they fit (each needs its length along the patio plus a gap, and must fit across it)
    const gap=6,keep=[];let used=0;
    for(const g of want){const G=FURN_GROUPS[g],gl=horiz?G.w:G.h,ga=horiz?G.h:G.w;if(ga>across||used+gl+(keep.length?gap:0)>along)continue;used+=gl+(keep.length?gap:0);keep.push(g);if(keep.length>=4)break;}
    let at=-used/2;
    for(const g of keep){const G=FURN_GROUPS[g],gl=horiz?G.w:G.h,mid=at+gl/2;at+=gl+gap;
      const gx=horiz?cx+mid:cx,gy=horiz?cy:cy+mid;
      for(const [kind,dx,dy,w,h] of G.p){
        // laid along a tall patio, the whole group turns a quarter
        const [ox,oy,fw,fh]=horiz?[dx,dy,w,h]:[dy,dx,h,w],f={kind,x:Math.round(gx+ox),y:Math.round(gy+oy),w:fw,h:fh,turn:!horiz,r};
        if(kind==='umbrella'){f.w=f.h=1;}
        if(inRect(L.lhouse,f.x,f.y,Math.max(f.w,f.h)/2+2)||L.lpots.some(p=>Math.hypot(p.x-f.x,p.y-f.y)<(p.big?5:3)+Math.max(f.w,f.h)/2+1))continue;
        L.lfurn.push(f);}}
  }
  // and whatever else the yard sets out (dumpsters, benches, bike racks)
  for(const q of L.lprops||[]){const [w,h]=PROP_SIZE[q.k]||[8,8];L.lfurn.push({kind:q.k,x:q.x,y:q.y,w,h,r:hash(q.x,q.y)});}
}
const PROP_SIZE={dumpster:[18,10],bench:[14,5],bikerack:[14,4],pumpkin:[8,8],bin:[7,9]};
function drawFurniture(c,f,L){
  const x=f.x,y=f.y,x0=Math.round(x-f.w/2),y0=Math.round(y-f.h/2),plastic=L.hood===0,teak=L.hood===2;
  const wood=teak?['#5a3a1e','#7a5232','#9a6a42']:['#5a3a24','#8a5a36','#a8744a'];
  if(f.kind==='chair'){c.fillStyle='rgba(0,0,0,.25)';c.fillRect(x0+1,y0+1,5,5);c.fillStyle=plastic?'#b8b4a8':'#2f3a44';c.fillRect(x0-1,y0-1,f.w+2,f.h+2);c.fillStyle=plastic?'#f4f1e8':teak?'#9a6a42':'#e8e0d0';c.fillRect(x0,y0,f.w,f.h);
    if(teak){c.fillStyle='#e8e0d0';c.fillRect(x0+1,y0+1,f.w-2,f.h-2);}}
  else if(f.kind==='rtable'){const rr=Math.round(f.w/2);c.fillStyle='rgba(0,0,0,.25)';pcircle(c,x+2,y+2,rr);c.fillStyle=plastic?'#2f6a3a':wood[0];pcircle(c,x,y,rr);c.fillStyle=plastic?'#4a8a52':wood[1];pcircle(c,x,y,rr-1);c.fillStyle=plastic?'#6aaa6a':wood[2];c.fillRect(x-Math.round(rr/2),y-rr+1,Math.max(1,rr-2),1);}
  else if(f.kind==='table'||f.kind==='ctable'){c.fillStyle='rgba(0,0,0,.25)';c.fillRect(x0+2,y0+2,f.w,f.h);c.fillStyle=wood[0];c.fillRect(x0-1,y0-1,f.w+2,f.h+2);c.fillStyle=wood[1];c.fillRect(x0,y0,f.w,f.h);c.fillStyle=wood[2];
    if(f.w>=f.h)for(let k=1;k<f.h;k+=3)c.fillRect(x0,y0+k,f.w,1);else for(let k=1;k<f.w;k+=3)c.fillRect(x0+k,y0,1,f.h);}
  else if(f.kind==='lounger'){const v=f.h>=f.w,cols=[['#3a86ab','#e8e0d0'],['#e2742a','#f4f1e8'],['#4bc26a','#f4f1e8'],['#c9352b','#f4f1e8']][((f.r*4)|0)%4];
    c.fillStyle='rgba(0,0,0,.25)';c.fillRect(x0+2,y0+2,f.w,f.h);c.fillStyle='#d8d2c4';c.fillRect(x0-1,y0-1,f.w+2,f.h+2);
    for(let k=0;k<(v?f.h:f.w);k++){c.fillStyle=cols[(k>>1)&1];if(v)c.fillRect(x0,y0+k,f.w,1);else c.fillRect(x0+k,y0,1,f.h);}
    c.fillStyle='#f4f1e8';if(v)c.fillRect(x0,y0,f.w,3);else c.fillRect(x0,y0,3,f.h);}
  else if(f.kind==='grill'){c.fillStyle='rgba(0,0,0,.25)';c.fillRect(x0+2,y0+2,f.w,f.h);c.fillStyle='#2a2e33';c.fillRect(x0,y0,f.w,f.h);c.fillStyle='#5d656d';c.fillRect(x0+1,y0+1,f.w-2,f.h-3);c.fillStyle='#ff9800';c.fillRect(x0+3,y0+2,2,2);c.fillStyle='#8f989e';c.fillRect(x0+1,y0+f.h-2,f.w-2,1);}
  else if(f.kind==='firepit'){const rr=Math.round(f.w/2);c.fillStyle='rgba(0,0,0,.25)';pcircle(c,x+1,y+2,rr);c.fillStyle='#5d5a52';pcircle(c,x,y,rr);c.fillStyle='#8c8678';pcircle(c,x,y-1,rr-1);c.fillStyle='#2a1a10';pcircle(c,x,y,rr-2);
    c.fillStyle='#ff9800';c.fillRect(x-1,y-1,2,1);c.fillRect(x+1,y,1,1);c.fillStyle='#ffcf4a';c.fillRect(x,y,1,1);c.fillStyle='#5a3a24';c.fillRect(x-2,y+1,4,1);}
  else if(f.kind==='sofa'){c.fillStyle='rgba(0,0,0,.25)';c.fillRect(x0+2,y0+2,f.w,f.h);c.fillStyle=teak?'#3a4a5a':'#4a5560';c.fillRect(x0-1,y0-1,f.w+2,f.h+2);c.fillStyle=teak?'#d8d2c4':'#7a8a9a';c.fillRect(x0,y0,f.w,f.h);
    c.fillStyle=teak?'#f4f1e8':'#9aaaba';if(f.w>=f.h)for(let k=0;k<f.w;k+=6)c.fillRect(x0+k+1,y0+1,4,f.h-2);else for(let k=0;k<f.h;k+=6)c.fillRect(x0+1,y0+k+1,f.w-2,4);}
  else if(f.kind==='planter'){c.fillStyle='rgba(0,0,0,.25)';c.fillRect(x0+2,y0+2,f.w,f.h);c.fillStyle=wood[0];c.fillRect(x0,y0,f.w,f.h);c.fillStyle=wood[1];c.fillRect(x0+1,y0+1,f.w-2,f.h-2);
    c.fillStyle='#2f5a26';pcircle(c,x,y-1,3);c.fillStyle='#4a8a3a';pcircle(c,x,y-2,2);c.fillStyle=POT_FLOWERS[((f.r*6)|0)%6];c.fillRect(x-1,y-3,1,1);c.fillRect(x+1,y-1,1,1);}
  else if(f.kind==='dumpster'){c.fillStyle='rgba(0,0,0,.3)';c.fillRect(x0+2,y0+2,f.w,f.h);c.fillStyle='#1f3a2a';c.fillRect(x0-1,y0-1,f.w+2,f.h+2);c.fillStyle='#2f5a3a';c.fillRect(x0,y0,f.w,f.h);
    c.fillStyle='#3f7a4a';c.fillRect(x0,y0,f.w,2);c.fillStyle='#1f3a2a';c.fillRect(x0+Math.round(f.w/2),y0,1,f.h);c.fillStyle='#e8e4d8';c.fillRect(x0+f.w+1,y0+f.h-2,2,2);c.fillStyle='#c9352b';c.fillRect(x0-3,y0+f.h-1,2,1);}
  else if(f.kind==='bench'){c.fillStyle='rgba(0,0,0,.25)';c.fillRect(x0+1,y0+2,f.w,f.h);c.fillStyle='#2a2e33';c.fillRect(x0,y0+f.h-1,1,2);c.fillRect(x0+f.w-1,y0+f.h-1,1,2);c.fillStyle=wood[1];c.fillRect(x0,y0,f.w,f.h-1);c.fillStyle=wood[2];c.fillRect(x0,y0,f.w,1);c.fillRect(x0,y0+2,f.w,1);}
  else if(f.kind==='pumpkin'){const r=4;c.fillStyle='#8a3d0c';pcircle(c,x,y+1,r);c.fillStyle='#ea7a1c';pcircle(c,x,y,r);c.fillStyle='#ffab4d';c.fillRect(x-r+2,y-r+1,2,1);
    c.fillStyle='#b8560f';c.fillRect(x-1,y-r+1,1,r*2-1);c.fillRect(x+2,y-r+2,1,r*2-3);c.fillStyle='#3d6a24';c.fillRect(x,y-r-1,2,2);}
  else if(f.kind==='bin'){c.fillStyle='rgba(0,0,0,.3)';c.fillRect(x0+1,y0+1,f.w,f.h);c.fillStyle='#1d2f3a';c.fillRect(x0,y0,f.w,f.h);c.fillStyle='#2f4a5a';c.fillRect(x0,y0,f.w,2);c.fillStyle='#3d5a6a';c.fillRect(x0+1,y0,f.w-2,1);}
  else if(f.kind==='bikerack'){c.fillStyle='#5d656d';c.fillRect(x0,y0+f.h-1,f.w,1);for(let k=0;k<f.w;k+=4){c.fillStyle='#8f989e';c.fillRect(x0+k,y0,1,f.h);}
    c.fillStyle='#c9352b';c.fillRect(x0+1,y0+1,5,1);c.fillStyle='#1d2326';c.fillRect(x0,y0,2,2);c.fillRect(x0+5,y0,2,2);}
  else if(f.kind==='umbrella'){// a striped canopy over the table, drawn on top of it
    const R=10,cols=[['#c9352b','#f4f1e8'],['#2a6fc9','#f4f1e8'],['#2f6a3a','#e8e0d0'],['#ff9800','#f4f1e8']][((f.r*7)|0)%4];
    c.fillStyle='rgba(0,0,0,.2)';pcircle(c,x+3,y+3,R);
    for(let dy=-R;dy<=R;dy++)for(let dx=-R;dx<=R;dx++){if(dx*dx+dy*dy>R*R)continue;const a=Math.atan2(dy,dx);c.fillStyle=cols[((a+Math.PI)/(Math.PI/4)|0)&1];c.fillRect(x+dx,y+dy,1,1);}
    c.fillStyle='rgba(0,0,0,.18)';for(let dy=-R;dy<=R;dy++)for(let dx=-R;dx<=R;dx++){const d=dx*dx+dy*dy;if(d<=R*R&&d>(R-1)*(R-1))c.fillRect(x+dx,y+dy,1,1);}
    c.fillStyle='#2a2e33';c.fillRect(x,y,1,1);}
}
// the pool net lies on the deck beside its pool, on whichever side has room
function placeNets(L){
  const {w,d}=L;L.lnets=[];
  const clear=(x,y)=>x>7&&x<w-7&&y>7&&y<d-3&&!inRect(L.lhouse,x,y,3)&&!L.lpaved.some(p=>inRect(p,x,y,1));
  for(const z of L.lz){if(z.type!=='pool')continue;
    const c=[{x:z.x0+5,y:z.y1+4,a:0},{x:z.x0+5,y:z.y0-4,a:0},{x:z.x1+4,y:z.y0+5,a:Math.PI/2},{x:z.x0-4,y:z.y0+5,a:Math.PI/2}]
      .find(c=>clear(c.x,c.y)&&clear(c.x+Math.cos(c.a)*NET_STICK,c.y+Math.sin(c.a)*NET_STICK));
    L.lnets.push(c||{x:z.x0+4,y:z.y1-2,a:0});
  }
}
const makePot=(x,y,big)=>({x:Math.round(x),y:Math.round(y),big:!!big,col:(hash(x*3+1,y*5+2)*POT_PALS.length)|0,fl:(hash(y*7+3,x*11+4)*POT_FLOWERS.length)|0});
// flowerpots by the door, on patios, round the pool, at the house corners
function placePots(L,R){
  const {w,d}=L,h=L.lhouse,door=L.ldoor,want=POTS_PER[L.style];
  const carRect=c=>{const a=c.vert?8:17,b=c.vert?17:8;return{x0:c.cx-a,y0:c.cy-b,x1:c.cx+a,y1:c.cy+b};};
  const segD=(n,x,y)=>{const ex=Math.cos(n.a),ey=Math.sin(n.a),t=clamp((x-n.x)*ex+(y-n.y)*ey,0,NET_STICK);return Math.hypot(x-n.x-ex*t,y-n.y-ey*t);};
  const ok=(x,y,r)=>{
    if(x<10+r||x>w-10-r||y<10+r||y>d-6-r)return false;
    if(inRect(h,x,y,r+2)||L.lpaved.some(p=>inRect(p,x,y,r+2)))return false;
    if(Math.abs(x-door.x)<10+r&&y>door.y-2&&y<door.y+9+r)return false;
    if(L.lcars.some(c=>inRect(carRect(c),x,y,r+3)))return false;
    if(L.ltrees.some(t=>Math.hypot(t.x-x,t.y-y)<r+7))return false;
    if(L.lz.some(z=>(z.type==='pool'||z.type==='garden')&&inRect(zoneBox(z),x,y,r+2)))return false;
    if(L.lnets.some(n=>segD(n,x,y)<r+4))return false;
    if(L.deco.some(q=>Math.hypot(q.x-x,q.y-y)<r+6))return false;
    if(Math.hypot(L.lmailbox.x+4-x,L.lmailbox.y-y)<r+8)return false;
    return !L.lpots.some(p=>Math.hypot(p.x-x,p.y-y)<r+(p.big?5:3)+5);
  };
  const cand=[[door.x-15,door.y+6,1],[door.x+15,door.y+6,1]];
  for(const z of L.lz){
    if(z.type==='pool')cand.push([z.x0-6,z.y0-6,1],[z.x1+6,z.y1+6,1],[z.x1+6,z.y0-6,0],[z.x0-6,z.y1+6,0]);
    if(z.type==='patio')cand.push([z.x0+6,z.y0+6,1],[z.x1-6,z.y1-6,0],[z.x1-6,z.y0+6,0]);
  }
  cand.push([door.x-11,d-18,0],[door.x+11,d-18,0],[h.x0-7,h.y1+5,1],[h.x1+7,h.y1+5,1],[h.x0-7,h.y0+8,0],[h.x1+7,h.y0+8,0]);
  for(let i=0;i<40;i++)cand.push([14+R()*(w-28),14+R()*(d-28),R()<.35?1:0]);
  for(const [x,y,big] of cand){if(L.lpots.length>=want)break;if(ok(x,y,big?5:3))L.lpots.push(makePot(x,y,big));}
}
