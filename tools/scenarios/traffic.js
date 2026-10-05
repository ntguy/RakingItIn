// fast-forward ~4 minutes of game time with the mail truck, police car, parcel van and visitors: every vehicle should
// reach the end of the route (maxS ~ pathLen) and mail should reach every mailbox

localStorage.clear();
document.querySelector('#titleBtns button').click();
await new Promise(r=>setTimeout(r,300));
closeMenu();
const t0=performance.now();
today.copHour=8;today.vanHour=8.2;hour=8.9;
const log={};let steps=0,maxJam={};
for(let k=0;k<30*240&&state==='play';k++){update(1/30);steps++;
  for(const v of traffic){const e=log[v.nid]||(log[v.nid]={kind:v.kind,maxS:0,drops:v.drops?v.drops.length:0,jam:0});e.maxS=Math.max(e.maxS,v.s);if(v.v<1&&v.state!=='parked')e.jam+=1/30;e.st=v.state;e.dropsLeft=v.drops?v.drops.length:0;}
}
return {steps,ms:Math.round(performance.now()-t0),hour:hour.toFixed(2),pathLen:Math.round(TPS[TPS.length-1]),traffic:traffic.map(v=>v.kind+':'+Math.round(v.s)+':'+v.state),log,pk:packages.length,mail:MAILBOXES.filter(m=>m.flag).length+'/'+MAILBOXES.length,visitors:visitors.length,N};
