// a close-up of any part of the world: --args '{"crop":[x,y,w,h],"paths":true,"trees":false}'
window.__crop=window.__args.crop;window.__paths=window.__args.paths;window.__trees=window.__args.trees;
const R=window.__crop||[1000,180,400,300],sc=2,c=document.createElement('canvas');c.width=R[2]*sc;c.height=R[3]*sc;const g=c.getContext('2d');g.imageSmoothingEnabled=false;
g.scale(sc,sc);g.translate(-R[0],-R[1]);g.drawImage(bg,0,0);
for(const car of CARS){const mx=(car.x0+car.x1)/2,my=(car.y0+car.y1)/2,a=car.vert?(car.dir>0?Math.PI/2:-Math.PI/2):(car.dir>0?0:Math.PI);g.save();g.translate(mx,my);g.rotate(a);g.drawImage(car.can,-17,-8);g.restore();}
for(const p of POTS){drawPotSprite(g,p.x,p.y,p,0);}
for(const st of STREETLIGHTS){g.fillStyle='#ff0';g.fillRect(st.x-1,st.y-1,3,3);}
if(window.__trees!==false)for(const t of TREES){g.globalAlpha=.6;g.drawImage(t.can,t.x-t.can.width/2,t.y-t.lift-t.can.height/2);g.globalAlpha=1;}
if(window.__paths){g.fillStyle='rgba(255,0,255,.9)';for(let i=0;i<TPX.length;i++)g.fillRect(TPX[i],TPY[i],1,1);g.fillStyle='rgba(0,255,255,.9)';for(let i=0;i<PATH.length;i++)g.fillRect(PATH[i].x,PATH[i].y,1,1);}
document.body.innerHTML='';const im=new Image();im.src=c.toDataURL();im.style.cssText='position:absolute;left:0;top:0;z-index:99;image-rendering:pixelated';document.body.appendChild(im);
await new Promise(r=>setTimeout(r,300));
