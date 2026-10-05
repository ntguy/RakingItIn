// close-ups of houses side by side with their zones outlined (green good, red fancy): --args '{"ids":[0,1],"sc":2}'
const ids=(window.__args.ids||[0,1,2,3]),sc=window.__args.sc||2;
const boxes=ids.map(k=>{const L=LOTS[k];return{L,x0:L.x0-8,y0:L.y0-8,w:L.x1-L.x0+16,h:L.y1-L.y0+16};});
const W=boxes.reduce((a,b)=>a+b.w*sc+10,0),Hh=Math.max(...boxes.map(b=>b.h*sc))+30;
const c=document.createElement('canvas');c.width=W;c.height=Hh;const g=c.getContext('2d');g.imageSmoothingEnabled=false;g.fillStyle='#000';g.fillRect(0,0,W,Hh);
let ox=0;
for(const b of boxes){g.save();g.beginPath();g.rect(ox,24,b.w*sc,b.h*sc);g.clip();g.translate(ox,24);g.scale(sc,sc);g.translate(-b.x0,-b.y0);g.drawImage(bg,0,0);
  for(const car of CARS){const mx=(car.x0+car.x1)/2,my=(car.y0+car.y1)/2,a=car.vert?(car.dir>0?Math.PI/2:-Math.PI/2):(car.dir>0?0:Math.PI);g.save();g.translate(mx,my);g.rotate(a);g.drawImage(car.can,-17,-8);g.restore();}
  for(const n of NETS)drawNetSprite(g,n.x,n.y,n.x+Math.cos(n.a)*NET_STICK,n.y+Math.sin(n.a)*NET_STICK,false);
  for(const p of POTS)drawPotSprite(g,p.x,p.y,p,0);
  for(const t of TREES){g.globalAlpha=.55;g.drawImage(t.can,t.x-t.can.width/2,t.y-t.lift-t.can.height/2);g.globalAlpha=1;g.fillStyle='#6b4428';g.fillRect(t.x-2,t.y-2,4,4);}
  // zone outlines
  for(const z of b.L.zones){g.fillStyle=z.good?'#0f0':'#f00';const o=z.outline;for(let k=0;k<o.length;k+=2)if((o[k]+o[k+1])%4<2)g.fillRect(o[k],o[k+1],1,1);}
  g.restore();g.fillStyle='#fff';g.font='14px monospace';g.fillText(b.L.k+' '+b.L.name+' '+b.L.w+'x'+b.L.d+' leaves:'+lotStats(b.L).total,ox+4,16);ox+=b.w*sc+10;}
document.body.innerHTML='';const im=new Image();im.src=c.toDataURL();im.style.cssText='position:absolute;left:0;top:0;z-index:99';document.body.appendChild(im);
await new Promise(r=>setTimeout(r,300));return [W,Hh];
