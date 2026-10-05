// profiler readings for the heavy cases (estate with traffic, night, split screen). Try --throttle 4 --dpr 2

localStorage.clear();document.querySelector('#titleBtns button').click();await new Promise(r=>setTimeout(r,300));closeMenu();
perfSet(true);const W=ms=>new Promise(r=>setTimeout(r,ms));const out={};
const at=(k,pl)=>{const L=LOTS[k];pl.P.x=L.door.x;pl.P.y=L.door.y+L.front[1]*24;};
// evening traffic: a dozen cars on the road
hour=18;for(let k=0;k<12;k++){const v=newVehicle('car');if(v){v.s=300+k*800;trafficPos(v);traffic.push(v);}}
at(11,players[0]);mouse.r=true;await W(3500);out['1 view, blowing at the estate, 12 cars']=perfText();
hour=21;mouse.r=false;await W(3000);out['1 view, night at the estate']=perfText();
joinPlayer({t:'wait'});at(9,players[1]);await W(3500);out['split screen, night']=perfText();
return Object.entries(out).map(([k,v])=>'=== '+k+'\n'+v.split('\n').filter(l=>!/ 0\.0[0-1]\dms/.test(l)).join('\n')).join('\n\n');
