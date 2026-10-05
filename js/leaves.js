'use strict';
// ============================================================ leaves (SoA)
// (the full neighborhood starts the day with ~24k leaves, and its trees keep dropping more)
const MAX=44000;
const LX=new Float32Array(MAX),LY=new Float32Array(MAX),LZ=new Float32Array(MAX);
const VX=new Float32Array(MAX),VY=new Float32Array(MAX),VZ=new Float32Array(MAX);
const ROT=new Float32Array(MAX),VR=new Float32Array(MAX),PH=new Float32Array(MAX);
const THR=new Float32Array(MAX),LIFT=new Float32Array(MAX);
const COL=new Uint8Array(MAX),SIZE=new Uint8Array(MAX),HOME=new Uint8Array(MAX);
const ST=new Uint8Array(MAX),UN=new Uint16Array(MAX); // ST: 0 free, 1 trapped under tarp, 2 being tied up, 3 stuck floating in a pool, 4 caught in the pool net, 5 carried in a rake
let N=0;
function addLeaf(x,y,z,col,home){
  if(N>=MAX)return -1;const i=N++;
  LX[i]=x;LY[i]=y;LZ[i]=z;VX[i]=0;VY[i]=0;VZ[i]=0;
  ROT[i]=rnd()*Math.PI*2;VR[i]=z>0?(rnd()-.5)*8:0;PH[i]=rnd();
  const sr=rnd();SIZE[i]=sr<.2?1:sr<.32?2:0;
  THR[i]=(SIZE[i]===2?220:110)+rnd()*220;
  LIFT[i]=(SIZE[i]===1?1.2:SIZE[i]===2?.55:.8)*(.6+rnd()*.7);
  COL[i]=col;HOME[i]=home;ST[i]=0;UN[i]=0;return i;
}
function removeLeaf(i){
  const j=--N;if(i===j)return;
  LX[i]=LX[j];LY[i]=LY[j];LZ[i]=LZ[j];VX[i]=VX[j];VY[i]=VY[j];VZ[i]=VZ[j];ROT[i]=ROT[j];VR[i]=VR[j];PH[i]=PH[j];
  THR[i]=THR[j];LIFT[i]=LIFT[j];COL[i]=COL[j];SIZE[i]=SIZE[j];HOME[i]=HOME[j];ST[i]=ST[j];UN[i]=UN[j];
}
function randCol(){const r=rnd();return r<.3?0:r<.5?1:r<.68?2:r<.84?3:4;}
function okLeafSpot(L,x,y){
  if(x<L.x0+7||x>L.x1-7||y<L.y0+7||y>L.y1-7)return false;
  for(const o of L.obst)if(inRect(o,x,y,3))return false;
  for(const p of L.pots)if(Math.hypot(p.x-x,p.y-y)<p.r+2)return false;
  if(zoneAt(L,x,y)===1)return false;
  return true;
}
function spawnLot(L){
  const n=Math.round((L.w-12)*(L.d-10)*(.0075+L.style*.001));
  let placed=0,guard=0;
  while(placed<n&&guard++<n*25){
    let x,y,col;
    if(L.trees.length&&rnd()<.62){const t=L.trees[(rnd()*L.trees.length)|0],a=rnd()*Math.PI*2,d=Math.sqrt(rnd())*t.r*1.45;
      x=t.x+Math.cos(a)*d;y=t.y+Math.sin(a)*d*.8;const tc=TREE_LEAF_COLS[t.pal];col=rnd()<.7?tc[(rnd()*3)|0]:randCol();}
    else{x=L.x0+8+rnd()*(L.x1-L.x0-16);y=L.y0+8+rnd()*(L.y1-L.y0-16);col=randCol();}
    if(!okLeafSpot(L,x,y))continue;
    // pools start the day with a light scattering, not a full carpet
    const inPool=wet(x,y);if(inPool&&rnd()<.6)continue;
    const i=addLeaf(x,y,0,col,L.k);placed++;
    if(i>=0&&inPool)ST[i]=3;
  }
}
