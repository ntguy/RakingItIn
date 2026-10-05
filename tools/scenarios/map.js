// the whole map at half scale with house labels, the traffic path (magenta) and the sidewalk path (cyan): use --out

// draw the whole background + trees + cars + paths to a canvas and return as data url (scaled)
const sc=0.5,c=document.createElement('canvas');c.width=WORLD_W*sc;c.height=H*sc;const g=c.getContext('2d');g.imageSmoothingEnabled=false;
g.scale(sc,sc);g.drawImage(bg,0,0);
for(const car of CARS){const mx=(car.x0+car.x1)/2,my=(car.y0+car.y1)/2,a=car.vert?(car.dir>0?Math.PI/2:-Math.PI/2):(car.dir>0?0:Math.PI);g.save();g.translate(mx,my);g.rotate(a);g.drawImage(car.can,-17,-8);g.restore();}
for(const t of TREES){g.globalAlpha=.8;g.drawImage(t.can,t.x-t.can.width/2,t.y-t.lift-t.can.height/2);g.globalAlpha=1;}
g.fillStyle='rgba(255,0,255,.8)';for(let i=0;i<TPX.length;i+=2)g.fillRect(TPX[i]-1,TPY[i]-1,3,3);
g.fillStyle='rgba(0,255,255,.8)';for(let i=0;i<PATH.length;i+=2)g.fillRect(PATH[i].x-1,PATH[i].y-1,3,3);
g.fillStyle='#fff';g.font='bold 28px monospace';for(const L of LOTS){g.fillText(L.k+' '+L.name.replace('THE ','')+' L'+L.level,L.x0+6,L.y0+30);}
document.body.innerHTML='';document.body.style.overflow='auto';const im=new Image();im.src=c.toDataURL();im.style.cssText='position:absolute;left:0;top:0;z-index:99';document.body.appendChild(im);
await new Promise(r=>setTimeout(r,300));
return {W:WORLD_W,H,lots:LOTS.length,leaves:N,trees:TREES.length,cars:CARS.length,tp:TPX.length,path:PATH.length};
