// house goals (rake-only, fast, low10), stealing a package and the night summary: money should rise, goals complete
localStorage.clear();
document.querySelector('#titleBtns button').click();
await new Promise(r=>setTimeout(r,300));
closeMenu();
const out={};
// force a known goal set: the house goals
GOALS.act=['rake50','fast','low10'];
const L=LOTS[0];
// pretend the player raked everything into the beds at the Coopers: move all leaves of house 0 into its first mulch bed
const z=L.zones.find(z=>z.type==='mulch'&&z.shape==='q'),bz=zoneBox(z);
for(let i=0;i<N;i++)if(HOME[i]===0&&ST[i]===0){LX[i]=z.ax+(z.x0===z.ax?6:-6);LY[i]=z.ay+(z.y0===z.ay?6:-6);}
UR[0]=1;
P.x=L.door.x;P.y=L.door.y+10;
await new Promise(r=>setTimeout(r,500));
out.rows=goalRows(cur).map(r=>[r.id,r.num,r.bad]);
const m0=money;openCloseout(L);out.pct=L.pct;confirmCloseout();
out.money=[m0,money];out.act=GOALS.act;out.done=GOALS.done;
// steal: give the player a package and put them at the back of the truck
packages.push({x:0,y:0,z:0,vx:0,vy:0,vz:0,hx:500,hy:500,lot:LOTS[1],far:true,early:false,moved:false,done:false});
carryPkg=packages[packages.length-1];
const [bx,by]=fromTruck(-TRUCK_HL-6,0);P.x=bx;P.y=by;
await new Promise(r=>setTimeout(r,300));
out.prompt=document.querySelector('#view0 #ptext').textContent;
const m1=money;interact();out.steal=[m1,money,today.stolen,repTally().steal,packages.length];
// end the day
endDay();await new Promise(r=>setTimeout(r,1400));
out.state=state;
return out;
