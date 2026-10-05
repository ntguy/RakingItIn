// two vehicles wedged into each other on screen: after ~10s one should drive through the other (g1) and both move on
localStorage.clear();
document.querySelector('#titleBtns button').click();
await new Promise(r=>setTimeout(r,300));closeMenu();
today.copHour=99;today.vanHour=99;today.mailSent=true;today.carHour=99;
// two cars driven nose to nose into each other in the same lane, right in front of the player
const a=newVehicle('cop');a.s=700;trafficPos(a);traffic.push(a);
const b=newVehicle('cop');b.s=712;b.yaw=Math.PI;trafficPos(b);traffic.push(b);b.a+=0;
P.x=a.x;P.y=a.y-60;players[0].cam.x=P.x-200;players[0].cam.y=P.y-120;
const log=[];
for(let k=0;k<30*30;k++){P.x=a.x+0;update(1/30);if(k%30===0)log.push(`${k/30}s a:${Math.round(a.s)} v${a.v.toFixed(0)} g${a.ghost?1:0} j${(a.jamT||0).toFixed(1)} | b:${Math.round(b.s)} g${b.ghost?1:0}`);}
return log.filter((_,i)=>i%2===0).join('\n');
