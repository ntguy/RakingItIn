// the truck starts each day parked legally in the curb lane by the first house of the highest level the player can work
localStorage.clear();document.querySelector('#titleBtns button').click();await new Promise(r=>setTimeout(r,300));closeMenu();
const out=[];
for(const r of [0,50,100,200,300,500]){
  rep=r;resetDay();
  const lv=repLevel(rep),L=LOTS.find(l=>(l.level||0)===Math.max(...LOTS.filter(m=>!lotLocked(m)).map(m=>m.level||0))),d=Math.round(Math.hypot(TR.x-L.door.x,TR.y-L.door.y));
  const mine=players.map(pl=>Math.round(Math.hypot(pl.P.x-TR.x,pl.P.y-TR.y)));
  out.push({rep:r,lv,house:L.name,level:L.level,truck:[Math.round(TR.x),Math.round(TR.y),+TR.a.toFixed(2)],dist:d,illegal:illegalPark(),hitsCar:CARS.some(c=>rectsHit(c,{x0:TR.x-30,y0:TR.y-14,x1:TR.x+30,y1:TR.y+14},-2)),mouth:MOUTHS.some(m=>rectsHit(m,{x0:TR.x-26,y0:TR.y-12,x1:TR.x+26,y1:TR.y+12})),playerDist:mine});
}
return out;
