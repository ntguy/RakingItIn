// the per-pixel zone map against the exact zone geometry: mismatches should be a tiny fraction (bed edges only)

const slow=(L,x,y)=>{const zs=L.zones;for(let i=0;i<zs.length;i++){if(inZone(zs[i],x,y))return zs[i].good?1:2;}return 0;};
let diff=0,tot=0,inz=0;
for(let i=0;i<N;i++){const L=LOTS[HOME[i]];const a=slow(L,LX[i],LY[i]),b=zoneAt(L,LX[i],LY[i]);tot++;if(a)inz++;if(a!==b)diff++;}
// and random points over every lot
let pd=0,pt=0;for(const L of LOTS)for(let k=0;k<4000;k++){const x=L.x0+Math.random()*(L.x1-L.x0),y=L.y0+Math.random()*(L.y1-L.y0);pt++;if(slow(L,x,y)!==zoneAt(L,x,y))pd++;}
return {leaves:tot,leavesInZones:inz,leafMismatch:diff,points:pt,pointMismatch:pd,pct:(pd/pt*100).toFixed(3)+'%'};
