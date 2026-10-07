'use strict';
// ============================================================ render
// the mouse in world space and as an offset from the middle of the mouse player's view
function mouseWorld(){const v=cur.view;return[camX+(mouse.x-(v?v.left:0))/scale,camY+mouse.y/scale];}
function mouseOff(){const v=cur.view;return[(mouse.x-(v?v.left+v.pw/2:innerWidth/2))/scale,(mouse.y-innerHeight/2)/scale];}
function viewIn(pl){camX=pl.cam.x;camY=pl.cam.y;const v=pl.view;if(v){VW=v.w;VH=v.h;scale=v.sc;}}
function viewOut(pl){pl.cam.x=camX;pl.cam.y=camY;}
const BOLT=['...##','..##.','.##..','#####','..##.','.##..','##...'];
function drawBolt(x,y,col){ctx.fillStyle=col;for(let r=0;r<7;r++)for(let c=0;c<5;c++)if(BOLT[r][c]==='#')ctx.fillRect(x+c,y+r,1,1);}
function drawLeaves(cx,cy){
  gBuf.fill(0);aBuf.fill(0);
  const vw=VW,vh=VH,Q=Math.PI/4;
  for(let i=0;i<N;i++){
    if(ST[i]===1)continue;
    const x=LX[i]-cx,y=LY[i]-cy,z=LZ[i];
    if(x<-4||x>vw+4||y<-4||y-z>vh+4)continue;
    const ix=Math.floor(x),iy=Math.floor(y);
    if(z>.8&&iy>=0&&iy<vh){const o=iy*vw;if(ix>=0&&ix<vw&&gBuf[o+ix]===0)gBuf[o+ix]=SHADOW32;if(ix+1>=0&&ix+1<vw&&gBuf[o+ix+1]===0)gBuf[o+ix+1]=SHADOW32;}
    const sy=Math.floor(y-z),buf=z>5?aBuf:gBuf;
    let r=ROT[i]%Math.PI;if(r<0)r+=Math.PI;
    const shp=SHAPES[SIZE[i]][((r/Q)|0)&3];
    const pal=ST[i]===3||(z>.5&&Math.sin(ROT[i]*2.3+PH[i]*9)<0)?PALU[COL[i]]:PAL[COL[i]];
    for(let k=0;k<shp.length;k+=3){const qx=ix+shp[k],qy=sy+shp[k+1];if(qx>=0&&qx<vw&&qy>=0&&qy<vh)buf[qy*vw+qx]=pal[shp[k+2]];}
  }
  gCtx.putImageData(gImg,0,0);aCtx.putImageData(aImg,0,0);
}
function drawTarpRect(x,y,w,h,lump,seed=0){
  w=Math.max(2,Math.round(w));h=Math.max(2,Math.round(h));x=Math.round(x);y=Math.round(y);
  ctx.fillStyle='rgba(0,0,0,.25)';ctx.fillRect(x+2,y+2,w,h);
  ctx.fillStyle='#1b4a8a';ctx.fillRect(x-1,y-1,w+2,h+2);ctx.fillStyle='#2a6fc9';ctx.fillRect(x,y,w,h);
  ctx.fillStyle='#3d86e0';for(let k=3;k<h;k+=6)ctx.fillRect(x,y+k,w,2);
  ctx.fillStyle='#1f5aa8';ctx.fillRect(x+Math.round(w/2),y,1,h);
  if(lump){ctx.fillStyle='rgba(16,48,106,.55)';for(let k=0;k<lump;k++){const hx=hash(k,seed*31+7),hy=hash(seed*17+3,k*7);ctx.fillRect(x+1+Math.floor(hx*(w-3)),y+1+Math.floor(hy*(h-3)),2,1);}}
  ctx.fillStyle='#d0d0d0';if(w>4&&h>4)for(const [a,b] of [[1,1],[w-2,1],[1,h-2],[w-2,h-2]])ctx.fillRect(x+a,y+b,1,1);
}
function drawTarpsGround(cx,cy){
  for(const t of tarps){
    if(t.st==='fly')continue;
    const w=t.x1-t.x0,h=t.y1-t.y0,mx=(t.x0+t.x1)/2-cx,my=(t.y0+t.y1)/2-cy;
    if(mx<-w||mx>VW+w||my<-h||my>VH+h)continue;
    if(t.st==='down'){const k=Math.min(1,.55+t.t/.14*.45),bw=w*k,bh=h*k;drawTarpRect(mx-bw/2,my-bh/2,bw,bh,Math.min(40,(t.trapped||0)/3|0),t.id);}
    else{const e=ease(Math.min(1,t.t/TIE_T)),bw=w+(8-w)*e,bh=h+(8-h)*e;drawTarpRect(mx-bw/2,my-bh/2,bw,bh,0);
      ctx.fillStyle='#10306a';const cs=Math.round(2+e*2);for(const [sx,sy] of [[-1,-1],[1,-1],[-1,1],[1,1]])ctx.fillRect(Math.round(mx+sx*bw/2)-1,Math.round(my+sy*bh/2)-1,cs,cs);}
  }
}
function drawTarpsAir(cx,cy){
  for(const t of tarps){
    if(t.st!=='fly')continue;
    const k=t.t/THROW_T,tx=(t.x0+t.x1)/2,ty=(t.y0+t.y1)/2,x=t.fx+(tx-t.fx)*k-cx,y=t.fy+(ty-t.fy)*k-cy-Math.sin(Math.PI*k)*16;
    const w=t.x1-t.x0,h=t.y1-t.y0,open=k>.6?(k-.6)/.4:0,bw=6+(w*.55-6)*open,bh=5+(h*.55-5)*open;
    ctx.fillStyle='rgba(0,0,0,.2)';ctx.fillRect(Math.round(t.fx+(tx-t.fx)*k-cx-bw/2),Math.round(t.fy+(ty-t.fy)*k-cy+4),Math.round(bw),2);
    const wob=Math.round(Math.sin(k*20)*1.5);
    drawTarpRect(x-bw/2+wob,y-bh/2,bw,bh,0);
  }
}
// pixel-art helpers shared by the game and the yard editor (c can be scaled)
function drawNetSprite(c,x0,y0,x1,y1,wetHead){
  c.fillStyle='#5d656d';pline(c,x0,y0+1,x1,y1+1,1);c.fillStyle='#c8ccd0';pline(c,x0,y0,x1,y1,1);
  c.fillStyle='#2a2e33';c.fillRect(Math.round(x0)-1,Math.round(y0)-1,2,2);
  const hx=Math.round(x1),hy=Math.round(y1);
  c.fillStyle=wetHead?'rgba(190,235,255,.35)':'rgba(255,255,255,.22)';pellipse(c,hx,hy,3,2);
  c.fillStyle='rgba(255,255,255,.4)';for(let dy=-2;dy<=2;dy++)for(let dx=-3;dx<=3;dx++)if(((dx+dy)&1)===0&&dx*dx/12+dy*dy/5<1)c.fillRect(hx+dx,hy+dy,1,1);
  c.fillStyle='#e8eef2';for(let k=0;k<20;k++){const a=k/20*Math.PI*2;c.fillRect(Math.round(hx+Math.cos(a)*4),Math.round(hy+Math.sin(a)*3),1,1);}
}
// the rake: handle from the hands out to a 2px crossbar (only as wide as it's clear of fences) with short teeth
// pointing back at the player
function drawRakeSprite(c,x0,y0,hx,hy,ax,ay,vL,vR){
  const tx=-ay,ty=ax,y=hy,ex=hx+ax,ey=y+ay;
  c.fillStyle='#5a3a1a';pline(c,x0,y0+1,hx,y+1,1);c.fillStyle='#c08a4a';pline(c,x0,y0,hx,y,1);
  c.fillStyle='#8f989e';for(let k=vL;k<=vR+.01;k+=2){const bx=hx+tx*k,by=y+ty*k;pline(c,bx,by,bx-ax*2.5,by-ay*2.5,1);}
  c.fillStyle='#3a4045';pline(c,hx+tx*vL,y+ty*vL+1,hx+tx*vR,y+ty*vR+1,1);pline(c,ex+tx*vL,ey+ty*vL+1,ex+tx*vR,ey+ty*vR+1,1);
  c.fillStyle='#8f989e';pline(c,ex+tx*vL,ey+ty*vL,ex+tx*vR,ey+ty*vR,1);c.fillStyle='#c8ccd0';pline(c,hx+tx*vL,y+ty*vL,hx+tx*vR,y+ty*vR,1);
}
function drawPotSprite(c,x,y,p,wob){
  const r=p.big?5:3,h=p.big?7:5,pal=POT_PALS[p.col],fl=POT_FLOWERS[p.fl];
  if(p.broken){
    c.fillStyle='#3a2416';pellipse(c,x,y,r+2,Math.max(2,r-2));c.fillStyle='#4a2e1e';pellipse(c,x-1,y,r,Math.max(1,r-3));
    c.fillStyle=pal[1];c.fillRect(x-r-1,y-1,3,2);c.fillRect(x+r-1,y+1,2,2);c.fillStyle=pal[0];c.fillRect(x+1,y-2,3,2);c.fillRect(x-3,y+1,2,1);c.fillStyle=pal[2];c.fillRect(x+2,y-2,1,1);
    c.fillStyle='#3f7a34';c.fillRect(x-2,y-1,3,1);c.fillRect(x+r,y-1,2,1);c.fillStyle=fl;c.fillRect(x-1,y-2,1,1);c.fillRect(x+r+1,y-2,1,1);return;
  }
  c.fillStyle='rgba(0,0,0,.3)';pellipse(c,x+1,y+1,r+1,2);
  for(let k=0;k<h;k++){const yy=y-k,hw=r-1-(k<2?1:0),sh=Math.round(wob*k/h);
    c.fillStyle=pal[1];c.fillRect(x-hw+sh,yy,hw*2+1,1);c.fillStyle=pal[0];c.fillRect(x-hw+sh+1,yy,hw*2-1,1);if(hw>1){c.fillStyle=pal[2];c.fillRect(x-hw+sh+1,yy,1,1);}}
  const ty=y-h,sh=Math.round(wob);
  c.fillStyle=pal[1];c.fillRect(x-r+sh,ty,r*2+1,2);c.fillStyle=pal[2];c.fillRect(x-r+sh,ty,r*2+1,1);
  c.fillStyle='#2f5a24';pcircle(c,x+sh,ty-r+1,r);c.fillStyle='#3f7a34';pcircle(c,x+sh,ty-r,r-1);c.fillStyle='#5a9a40';c.fillRect(x+sh-r+2,ty-r*2+2,2,1);
  c.fillStyle=fl;const n=p.big?7:4;for(let k=0;k<n;k++){const a=k*2.4+p.fl,rr=(k%3+1)/3*(r-1);c.fillRect(Math.round(x+sh+Math.cos(a)*rr),Math.round(ty-r+Math.sin(a)*rr*.8),1,1);}
  c.fillStyle='#fff3d6';c.fillRect(x+sh,ty-r,1,1);
}
function drawPot(p,cx,cy){
  const x=Math.round(p.x-cx),y=Math.round(p.y-cy);
  let wob=p.wob*Math.sin(time*40)*1.5;
  if(!p.broken&&p.stress>.2)wob+=Math.sin(time*(22+p.stress*30))*p.stress*1.8;
  drawPotSprite(ctx,x,y,p,wob);
  if(!p.broken&&p.stress>.45&&Math.sin(time*16)>-.3){const ey=y-(p.big?7:5)-(p.big?12:8);ctx.fillStyle='#1a0f0a';ctx.fillRect(x-1,ey-1,4,8);ctx.fillStyle='#fe5f55';ctx.fillRect(x,ey,2,4);ctx.fillRect(x,ey+5,2,1);}
}
function drawPools(cx,cy){
  for(const pl of POOLS){
    const w=pl.x1-pl.x0,h=pl.y1-pl.y0;if(pl.x1-cx<0||pl.x0-cx>VW||pl.y1-cy<0||pl.y0-cy>VH)continue;
    ctx.fillStyle='rgba(225,248,255,.5)';const n=(w*h/50)|0;
    for(let k=0;k<n;k++){const sp=.5+hash(k,k+pl.id*7)*.8;if(Math.sin(time*2.1*sp+k*1.7)<.3)continue;
      const x=pl.x0+1+((hash(k,pl.id*31)*w+time*3*sp)%(w-3)),y=pl.y0+1+clamp(hash(pl.id*17,k)*h+Math.sin(time*1.3+k)*1.5,0,h-3);
      if(pl.e&&!wet(x,y))continue;
      ctx.fillRect(Math.round(x-cx),Math.round(y-cy),2,1);}
  }
  for(const rp of ripples){const k=1-rp.l/rp.m,r=rp.r0+k*rp.g;ctx.fillStyle=`rgba(225,248,255,${(rp.l/rp.m*.55).toFixed(2)})`;
    const n=Math.max(10,(r*5)|0);for(let q=0;q<n;q++){const a=q/n*Math.PI*2,x=Math.round(rp.x+Math.cos(a)*r),y=Math.round(rp.y+Math.sin(a)*r*.6);if(wet(x,y))ctx.fillRect(x-cx,y-cy,1,1);}}
  for(const n of NETS){if(n.held)continue;const ex=n.x+Math.cos(n.a)*NET_STICK,ey=n.y+Math.sin(n.a)*NET_STICK;
    if(Math.max(n.x,ex)-cx<-6||Math.min(n.x,ex)-cx>VW+6||Math.max(n.y,ey)-cy<-6||Math.min(n.y,ey)-cy>VH+6)continue;
    drawNetSprite(ctx,n.x-cx,n.y-cy,ex-cx,ey-cy,wet(ex,ey));}
}
function drawPlayer(cx,cy){
  const x=Math.round(P.x-cx),y=Math.round(P.y-cy),ax=aim.x,ay=aim.y,a=att();
  const mv=Math.hypot(P.vx,P.vy),walking=mv>8,bob=walking&&Math.sin(P.walk*2)>0?1:0,inWater=wet(P.x,P.y)>0;
  const fx=walking?P.vx/mv:ax,fy=walking?P.vy/mv:ay,qx=-fy,qy=fx,s=walking?Math.sin(P.walk)*3:0;
  if(inWater){ctx.fillStyle='rgba(20,90,130,.45)';pellipse(ctx,x,y,6,3);ctx.fillStyle='rgba(225,248,255,.7)';for(let k=0;k<16;k++){const a=k/16*Math.PI*2+time*2;ctx.fillRect(Math.round(x+Math.cos(a)*6),Math.round(y+Math.sin(a)*3),1,1);}}
  else{ctx.fillStyle='rgba(0,0,0,.3)';pellipse(ctx,x+1,y+1,6,3);
    ctx.fillStyle='#2b1d15';
    ctx.fillRect(Math.round(x+qx*2.5+fx*s)-1,Math.round(y+qy*2.5+fy*s)-1,3,3);
    ctx.fillRect(Math.round(x-qx*2.5-fx*s)-1,Math.round(y-qy*2.5-fy*s)-1,3,3);}
  const by=y-3-bob+(inWater?1:0),busy=bundle||tieT>0||heldNet||cur.raking;
  const net=()=>{if(!heldNet)return;const [hx,hy]=netHead();drawNetSprite(ctx,x+ax*3,by+ay*3,hx-cx,hy-cy-4,wet(hx,hy));
    ctx.fillStyle='#f2c29a';ctx.fillRect(Math.round(x+ax*4)-1,Math.round(by+ay*4)-1,2,2);ctx.fillRect(Math.round(x+ax*9)-1,Math.round(by+ay*9)-1,2,2);};
  const rake=()=>{if(!cur.raking||tieT>0)return;const k=cur.rake;
    drawRakeSprite(ctx,x+ax*3,by+ay*3,P.x+ax*k.eff-cx,P.y+ay*k.eff-cy,ax,ay,k.vL,k.vR);
    ctx.fillStyle='#f2c29a';ctx.fillRect(Math.round(x+ax*4)-1,Math.round(by+ay*4)-1,2,2);ctx.fillRect(Math.round(x+ax*8)-1,Math.round(by+ay*8)-1,2,2);};
  const tube=()=>{
    if(busy)return;
    const L=a.tube,t0x=x+ax*2,t0y=by+ay*2,t1x=x+ax*L,t1y=by+ay*L;
    ctx.fillStyle='#1e2226';pline(ctx,t0x-1,t0y-1,t1x-1,t1y-1,3);ctx.fillStyle='#5d656d';pline(ctx,t0x,t0y-1,t1x,t1y-1,1);
    const tx=Math.round(t1x),ty=Math.round(t1y),lit=power>.05;
    if(a.wide){const px=-ay,py=ax;ctx.fillStyle='#00619e';for(let k=-3;k<=3;k++)ctx.fillRect(Math.round(tx+px*k)-1,Math.round(ty+py*k)-1,2,2);ctx.fillStyle=lit?'#8fd6ff':a.tip;for(let k=-3;k<=3;k++)ctx.fillRect(Math.round(tx+px*k+ax),Math.round(ty+py*k+ay)-1,1,1);}
    else if(a.id==='jet'){ctx.fillStyle='#7a1a14';ctx.fillRect(tx-1,ty-1,2,2);ctx.fillStyle=lit?'#ffd0c0':a.tip;ctx.fillRect(Math.round(tx+ax*2)-1,Math.round(ty+ay*2)-1,2,2);}
    else{ctx.fillStyle=shadeHex(a.tip,.55);ctx.fillRect(tx-2,ty-2,4,4);ctx.fillStyle=lit?shadeHex(a.tip,1.4):a.tip;ctx.fillRect(tx-2,ty-2,3,3);
      if(a.vortex){ctx.fillStyle='#fff';ctx.fillRect(tx-1+((time*20|0)%2),ty-1,1,1);}}
    ctx.fillStyle='#f2c29a';ctx.fillRect(Math.round(x+ax*7)-1,Math.round(by+ay*7)-1,3,2);
  };
  const bx=Math.round(x-ax*4),bby=Math.round(by-ay*4);
  ctx.fillStyle='#6b3a00';ctx.fillRect(bx-4,bby-3,9,8);ctx.fillStyle='#ff9800';ctx.fillRect(bx-3,bby-3,7,6);ctx.fillStyle='#ffc766';ctx.fillRect(bx-3,bby-3,7,1);
  if(a.twin&&!busy){const ex=x-ax*a.tube,ey=by-ay*a.tube;ctx.fillStyle='#1e2226';pline(ctx,bx-1,bby-1,ex-1,ey-1,3);ctx.fillStyle='#5d656d';pline(ctx,bx,bby-1,ex,ey-1,1);
    ctx.fillStyle=shadeHex(a.tip,.55);ctx.fillRect(Math.round(ex)-2,Math.round(ey)-2,4,4);ctx.fillStyle=power>.05?shadeHex(a.tip,1.4):a.tip;ctx.fillRect(Math.round(ex)-2,Math.round(ey)-2,3,3);}
  const bp=battery/capacity(),lowBlink=bp<.2&&Math.sin(time*12)<0;
  ctx.fillStyle=battery<=0?'#3a0d0d':bp>.5?'#4bc26a':bp>.2?'#ffcf4a':(lowBlink?'#5a1a1a':'#fe5f55');ctx.fillRect(bx,bby-1,2,2);
  if(ay<-.35){tube();net();rake();}
  ctx.fillStyle=PPAL.shirt[0];pcircle(ctx,x,by+1,5);ctx.fillStyle=PPAL.shirt[1];pcircle(ctx,x,by,4);
  // (the light suit turns the shirt's seams into glowing strips)
  ctx.fillStyle=upg.light>2?'#c8f4ff':PPAL.shirt[2];ctx.fillRect(x-4,by,9,1);ctx.fillRect(x-1,by-4,1,9);ctx.fillRect(x+2,by-3,1,7);
  ctx.fillStyle=PPAL.shirt[3];ctx.fillRect(x-3,by-3,2,1);
  if(ay>=-.35){tube();net();rake();}
  if(tieT>0){ctx.fillStyle='#f2c29a';const k=Math.sin(time*30)*2;ctx.fillRect(Math.round(x+ax*6+k)-1,Math.round(by+ay*6)-1,2,2);ctx.fillRect(Math.round(x+ax*6-k)-1,Math.round(by+ay*6+1)-1,2,2);}
  const hy=by-2;
  ctx.fillStyle=PPAL.cap[0];pcircle(ctx,x,hy+1,3);ctx.fillStyle=PPAL.cap[1];pcircle(ctx,x,hy,3);ctx.fillStyle=PPAL.cap[2];ctx.fillRect(x-2,hy-2,2,1);
  ctx.fillStyle='#ff9800';ctx.fillRect(Math.round(x-ay*3.5)-1,Math.round(hy+ax*3.5)-1,2,2);ctx.fillRect(Math.round(x+ay*3.5)-1,Math.round(hy-ax*3.5)-1,2,2);
  ctx.fillStyle=PPAL.cap[3];ctx.fillRect(Math.round(x+ax*3.5)-1,Math.round(hy+ay*3.5)-1,3,3);ctx.fillStyle=PPAL.cap[2];ctx.fillRect(Math.round(x+ax*4)-1,Math.round(hy+ay*4)-1,2,2);
  if(bundle){
    const r=Math.round(4+Math.min(6,Math.sqrt(bundle.total)/4)),sx=x,sy=by-r-2;
    ctx.fillStyle='#10306a';pcircle(ctx,sx,sy+1,r);ctx.fillStyle='#2a6fc9';pcircle(ctx,sx,sy,r);ctx.fillStyle='#3d86e0';ctx.fillRect(sx-r+2,sy-r+2,3,2);
    ctx.fillStyle='#e2742a';ctx.fillRect(sx-1,sy-r-1,2,2);ctx.fillStyle='#eec03a';ctx.fillRect(sx+1,sy-r,2,1);ctx.fillStyle='#c9352b';ctx.fillRect(sx-3,sy-r,1,1);
  }
}
function drawRotated(can,wx,wy,a,cx,cy,shadow){
  const sa=Math.round(a/(Math.PI/32))*(Math.PI/32);
  if(shadow){ctx.save();ctx.translate(Math.round(wx-cx)+2,Math.round(wy-cy)+3);ctx.rotate(sa);ctx.fillStyle='rgba(0,0,0,.3)';ctx.fillRect(-can.width/2,-can.height/2+1,can.width,can.height-2);ctx.restore();}
  ctx.save();ctx.translate(Math.round(wx-cx),Math.round(wy-cy));ctx.rotate(sa);ctx.drawImage(can,-can.width/2,-can.height/2);ctx.restore();
}
function drawTruck(cx,cy){
  if(TR.x-cx>VW+40||TR.x-cx<-40)return;
  const g=truckTmp.getContext('2d');g.clearRect(0,0,52,24);g.drawImage(truckBase,0,0);
  // tied tarps piled in the back of the bed, spare batteries racked up against the cab
  for(let i=0;i<Math.min(truckBundles.length,TB_SPOTS.length);i++){const [bx,by]=TB_SPOTS[i],r=truckBundles[i]>120?4:3;
    g.fillStyle='#10306a';pcircle(g,bx,by+1,r);g.fillStyle='#2a6fc9';pcircle(g,bx,by,r);g.fillStyle='#3d86e0';g.fillRect(bx-r+1,by-r+1,2,1);
    g.fillStyle='#e2742a';g.fillRect(bx,by-r-1,1,2);g.fillStyle='#eec03a';g.fillRect(bx+1,by-r,1,1);}
  const chg=charging(),blink=((time*3)|0)&1;
  for(let i=0;i<Math.min(bed.length,8);i++){const bx=17+(i%2)*6,by=5+((i/2)|0)*4,c=bed[i],w=c<.02?0:Math.max(1,Math.round(c*5));
    g.fillStyle='#0a0f12';g.fillRect(bx-1,by-1,7,5);g.fillStyle='#1a2325';g.fillRect(bx,by,5,3);
    if(w){g.fillStyle=levelCol(c);g.fillRect(bx,by,w,3);g.fillStyle='rgba(255,255,255,.4)';g.fillRect(bx,by,w,1);}
    if(chg&&c<1&&blink){g.fillStyle='#ffe38a';g.fillRect(bx+Math.min(4,w),by+1,1,1);}}
  if(players[0].upg.solar>0){g.fillStyle='#0f1a30';g.fillRect(32,4,11,16);g.fillStyle='#22406e';g.fillRect(33,5,9,14);
    g.fillStyle='#3a5f96';for(let y=5;y<19;y+=4)g.fillRect(33,y,9,1);g.fillRect(37,5,1,14);if(chg){g.fillStyle='rgba(255,240,180,.55)';g.fillRect(33+((time*4)|0)%9,5,1,14);}}
  if(truckTicket){g.fillStyle='#8f897d';g.fillRect(36,8,5,7);g.fillStyle='#fff';g.fillRect(36,8,4,6);g.fillStyle='#fe5f55';g.fillRect(36,8,4,1);g.fillStyle='#9fb5b8';g.fillRect(37,10,2,1);g.fillRect(37,12,2,1);}
  drawRotated(truckTmp,TR.x,TR.y,TR.a,cx,cy,true);
  if(!driving){
    const part=truckPart(),a=.45+.35*Math.sin(time*6);
    const mark=(lx,col)=>{ctx.fillStyle=col;for(let k=-10;k<=10;k+=4){const [wx,wy]=fromTruck(lx,k);ctx.fillRect(Math.round(wx-cx)-1,Math.round(wy-cy)-1,2,2);}};
    if(battery/capacity()<.3||bundle||part==='back')mark(-TRUCK_HL-4,`rgba(75,194,106,${a})`);
    if(part==='front')mark(TRUCK_HL+4,`rgba(0,157,255,${a})`);
  }
}
function drawCar(c,cx,cy){
  const w=c.x1-c.x0,h=c.y1-c.y0,mx=(c.x0+c.x1)/2,my=(c.y0+c.y1)/2;if(mx-cx<-40||mx-cx>VW+40||my-cy<-40||my-cy>VH+40)return;
  const a=c.vert?(c.dir>0?Math.PI/2:-Math.PI/2):(c.dir>0?0:Math.PI);
  const j=c.jolt>0?Math.round((rnd()-.5)*3*c.jolt*4):0;
  drawRotated(c.can,mx+j,my,a,cx,cy,true);
}
// legs that actually stride: walking sideways they swing past each other (the leg coming forward lifts a pixel);
// walking up or down the sidewalk they step alternately. len = how tall the legs are
// a slim torso: 5px wide with the top corners rounded off, thin arms in a darker shade either side
function pedBody(x,ty,shirt,stripe){
  ctx.fillStyle='rgba(0,0,0,.3)';ctx.fillRect(x-3,ty+1,7,4);
  ctx.fillStyle=shadeHex(shirt,.68);ctx.fillRect(x-3,ty+1,1,3);ctx.fillRect(x+3,ty+1,1,3);
  ctx.fillStyle=shirt;ctx.fillRect(x-1,ty,3,1);ctx.fillRect(x-2,ty+1,5,4);
  ctx.fillStyle=shadeHex(shirt,1.18);ctx.fillRect(x-1,ty+1,2,1);
  if(stripe){ctx.fillStyle=stripe;ctx.fillRect(x-2,ty+2,5,1);ctx.fillRect(x-2,ty+4,5,1);}
}
function pedLegs(p,x,y,col,len,shoe){
  const moving=!(p.stop>0),ph=p.walk,sw=moving?Math.sin(ph):0,lift=moving?Math.cos(ph):0,side=Math.abs(p.mx)>=Math.abs(p.my);
  const put=(lx,ly)=>{ctx.fillStyle=col;ctx.fillRect(lx,ly-len+1,2,len);if(shoe){ctx.fillStyle=shoe;ctx.fillRect(lx,ly,2,1);}};
  if(side){const st=Math.round(sw*2)*(p.mx>=0?1:-1);put(x-1+st,y-(lift>.3?1:0));put(x-1-st,y-(lift<-.3?1:0));}
  else{const f=p.my>0?1:-1,st=Math.round(sw);put(x-2,y+st*f-(sw>.3?1:0));put(x+1,y-st*f-(sw<-.3?1:0));}
}
function drawPed(p,cx,cy){
  const x=Math.round(p.x-cx),y=Math.round(p.y-cy);if(x<-20||x>VW+20||y<-20||y>VH+30)return;
  const fd=p.fdir;
  const shake=p.mad>0?Math.round(Math.sin(time*40)):0;
  if(p.dog){const dx=Math.round(x-p.mx*10),dy=Math.round(y+3-p.my*10),ds=p.stop>0?0:Math.round(Math.sin(p.walk*1.6));ctx.fillStyle='rgba(0,0,0,.25)';ctx.fillRect(dx-3,dy+1,7,2);
    ctx.fillStyle='#7a4a2a';ctx.fillRect(dx-3,dy-2,6,3);ctx.fillStyle='#5a341f';ctx.fillRect(dx+(fd>0?3:-4),dy-3+ds,2,3);ctx.fillRect(dx-(fd>0?4:-3),dy-3,1,1);
    ctx.fillStyle='#c9352b';pline(ctx,dx+fd*3,dy-2,x-fd*2,y-3,1);}
  ctx.fillStyle='rgba(0,0,0,.28)';pellipse(ctx,x+1,y+1,3,2);
  pedLegs(p,x,y,'#2b2b3a',3);
  pedBody(x+shake,y-7,p.shirt,null);
  ctx.fillStyle='#f2c29a';pcircle(ctx,x+shake,y-9,2);ctx.fillStyle=p.hair;ctx.fillRect(x-2+shake,y-11,5,2);ctx.fillRect(x-(fd>0?2:-2)+shake,y-10,1,2);
  if(p.mad>0){ctx.fillStyle='#fe5f55';ctx.fillRect(x+shake,y-16,2,4);ctx.fillRect(x+shake,y-11,2,1);}
}
function drawZoneHints(cx,cy,L){
  if(!L||L.done)return;
  const ph=(time*10)|0;
  for(const z of L.zones){
    ctx.fillStyle=z.good?'rgba(75,194,106,.85)':'rgba(254,95,85,.9)';
    const o=z.outline;
    for(let k=0;k<o.length;k+=2){const x=o[k],y=o[k+1];if(((x+y+ph)%6+6)%6<3)continue;const sx=x-cx,sy=y-cy;if(sx>=0&&sy>=0&&sx<VW&&sy<VH)ctx.fillRect(sx,sy,1,1);}
  }
}
function drawDoorBadges(cx,cy){
  const nd=nearDoor();
  for(const L of LOTS){
    const x=L.door.x-cx,y=L.door.y-cy-14+Math.round(Math.sin(time*4+L.k)*1.5);if(x<-10||x>VW+10||y<-10||y>VH+10)continue;
    if(L.done){ctx.fillStyle='#1a0f0a';pcircle(ctx,x,y,6);ctx.fillStyle='#4bc26a';pcircle(ctx,x,y,5);ctx.fillStyle='#fff';ctx.fillRect(x-3,y,2,1);ctx.fillRect(x-2,y+1,2,1);ctx.fillRect(x,y,1,1);ctx.fillRect(x+1,y-1,1,1);ctx.fillRect(x+2,y-2,1,1);}
    else if(nd===L){ctx.fillStyle='#1a0f0a';pcircle(ctx,x,y,6);ctx.fillStyle='#ffcf4a';pcircle(ctx,x,y,5);ctx.fillStyle='#1a0f0a';ctx.fillRect(x,y-3,1,4);ctx.fillRect(x,y+2,1,1);}
  }
}
// co-op: a badge on the edge of the view for each other player who's off screen (or the truck, if they're in it),
// in their shirt colour with their number on it and an arrow pointing the way to them
const PX_GLYPH={P:[7,5,7,4,4],1:[2,6,2,2,7],2:[7,1,7,4,7],3:[7,1,3,1,7],4:[5,5,7,1,1]};
function pxText(str,x,y,col){ctx.fillStyle=col;let ox=x;for(const ch of str){const g=PX_GLYPH[ch];if(g)for(let r=0;r<5;r++)for(let k=0;k<3;k++)if(g[r]>>(2-k)&1)ctx.fillRect(ox+k,y+r,1,1);ox+=4;}}
function drawMates(cx,cy){
  if(state!=='play'||players.length<2)return;
  for(const pl of players){if(pl===cur)continue;
    const inTruck=!onFoot(pl),dx=(inTruck?TR.x:pl.P.x)-cx-VW/2,dy=(inTruck?TR.y:pl.P.y-8)-cy-VH/2;
    if(Math.abs(dx)<VW/2-2&&Math.abs(dy)<VH/2-2)continue;
    // from the middle of the view toward them, stopped just inside its edge (further in at the top and bottom, clear of
    // the HUD bar and the house panel)
    const k=Math.min((VW/2-14)/(Math.abs(dx)||1e-6),(VH/2-(dy<0?28:40))/(Math.abs(dy)||1e-6)),ex=Math.round(VW/2+dx*k),ey=Math.round(VH/2+dy*k),dl=Math.hypot(dx,dy)||1,col=pl.pal.shirt[1];
    ctx.fillStyle='#1a0f0a';for(let q=9;q<14;q++){const w=15-q;ctx.fillRect(Math.round(ex+dx/dl*q-w/2),Math.round(ey+dy/dl*q-w/2),w+1,w+1);}
    ctx.fillStyle=col;for(let q=9;q<13;q++){const w=13-q;ctx.fillRect(Math.round(ex+dx/dl*q-w/2),Math.round(ey+dy/dl*q-w/2),w,w);}
    ctx.fillStyle='#1a0f0a';pcircle(ctx,ex,ey,8);ctx.fillStyle=col;pcircle(ctx,ex,ey,7);ctx.fillStyle=pl.pal.shirt[3];ctx.fillRect(ex-4,ey-6,8,1);
    pxText('P'+(pl.i+1),ex-3,ey-2,'#1a0f0a');pxText('P'+(pl.i+1),ex-4,ey-3,'#f4f1e8');}
}
function drawMarker(cx,cy){
  if(driving||cur.riding||swapT>0)return;
  const need=(battery/capacity()<.25&&bestSpare()>battery/capacity()+.15)||bundle;if(!need)return;
  const [bx,by]=fromTruck(-TRUCK_HL+4,0);
  const sx=Math.round(bx-cx),sy=Math.round(by-cy-20+Math.sin(time*5)*2);
  const col=bundle?'#009dff':battery<=0?'#fe5f55':'#4bc26a';
  if(sx>-4&&sx<VW+4&&sy>-4&&sy<VH+4){
    ctx.fillStyle='#1a0f0a';pcircle(ctx,sx,sy,8);ctx.fillStyle=col;pcircle(ctx,sx,sy,7);drawBolt(sx-2,sy-3,'#1a0f0a');
    ctx.fillStyle='#1a0f0a';ctx.fillRect(sx-2,sy+9,5,1);ctx.fillRect(sx-1,sy+10,3,1);ctx.fillRect(sx,sy+11,1,1);
  }else{
    const ex=clamp(sx,14,VW-14),ey=clamp(sy,14,VH-14),dx=sx-ex,dy=sy-ey,dl=Math.hypot(dx,dy)||1;
    ctx.fillStyle='#1a0f0a';pcircle(ctx,ex,ey,9);ctx.fillStyle=col;pcircle(ctx,ex,ey,8);drawBolt(ex-2,ey-3,'#1a0f0a');
    ctx.fillStyle=col;for(let k=10;k<14;k++){const w=14-k;ctx.fillRect(Math.round(ex+dx/dl*k-w/2),Math.round(ey+dy/dl*k-w/2),w,w);}
  }
}
// controller aim: no cursor, just a faint dashed line out the way the player faces, marching while the blower runs
function drawAimLine(cx,cy,len=56){
  const rgb=bundle?'138,154,157':mode===2?'254,95,85':mode===1?'0,157,255':'255,255,255',a0=mode?.6:.38;
  const x0=P.x-cx,y0=P.y-3-cy,d0=att().tube+5,shift=mode?(time*30)%6:0,pts=[];
  for(let d=0;d<len;d++){if((d-shift+6)%6>=3)continue;const px=Math.round(x0+aim.x*(d0+d)),py=Math.round(y0+aim.y*(d0+d)),l=pts[pts.length-1];if(l&&l[0]===px&&l[1]===py)continue;pts.push([px,py,a0*(1-d/len*.7)]);}
  for(const [px,py,a] of pts){ctx.fillStyle=`rgba(0,0,0,${(a*.45).toFixed(2)})`;ctx.fillRect(px,py+1,1,1);}
  for(const [px,py,a] of pts){ctx.fillStyle=`rgba(${rgb},${a.toFixed(2)})`;ctx.fillRect(px,py,1,1);}
}
function drawBedPanel(cx,cy){
  if(!onFoot(cur)||state!=='play'||bundle||truckPart()!=='back'||!bed.length)return;
  const n=bed.length,w=n*10+6+(charging()?10:0),x=Math.round(TR.x-cx-w/2),y=Math.round(TR.y-cy-34);
  ctx.fillStyle='rgba(16,23,26,.88)';ctx.fillRect(x,y,w,18);ctx.fillStyle='#5b6f73';ctx.fillRect(x,y,w,1);ctx.fillRect(x,y+17,w,1);ctx.fillRect(x,y,1,18);ctx.fillRect(x+w-1,y,1,18);
  for(let i=0;i<n;i++){const bx=x+4+i*10,by=y+4,c=bed[i],h=Math.round(c*10);
    ctx.fillStyle='#5d656d';ctx.fillRect(bx+2,by-1,3,1);ctx.fillStyle='#0a0f12';ctx.fillRect(bx-1,by,9,12);ctx.fillStyle='#1a2325';ctx.fillRect(bx,by+1,7,10);
    if(h){ctx.fillStyle=levelCol(c);ctx.fillRect(bx,by+11-h,7,h);ctx.fillStyle='rgba(255,255,255,.35)';ctx.fillRect(bx,by+11-h,7,1);}}
  if(charging()){const sx=x+w-9,sy=y+5;ctx.fillStyle='#ffcf4a';ctx.fillRect(sx+2,sy,2,1);ctx.fillRect(sx+2,sy+7,2,1);ctx.fillRect(sx-1,sy+3,1,2);ctx.fillRect(sx+6,sy+3,1,2);ctx.fillStyle='#ffe38a';ctx.fillRect(sx+1,sy+2,4,4);}
}
function drawCross(mx,my){
  const col=bundle?'#8a9a9d':mode===2?'#fe5f55':mode===1?'#009dff':'#ffffff',g=2+(mode?Math.round(Math.sin(time*30)*.6+power*.7):0);
  const bars=[[mx-g-3,my,3,1],[mx+g+1,my,3,1],[mx,my-g-3,1,3],[mx,my+g+1,1,3],[mx,my,1,1]];
  ctx.fillStyle='#10171a';for(const b of bars)ctx.fillRect(b[0]-1,b[1]-1,b[2]+2,b[3]+2);
  ctx.fillStyle=col;for(const b of bars)ctx.fillRect(...b);
}
function drawCursor(cx,cy){
  if(driving||cur.riding||state!=='play')return;
  if(inputMode==='pad'){
    // on a controller the vortex tip gets a crosshair where it's swirling to, with the aim line running out to it
    if(att().vortex&&!bundle&&!heldNet&&!cur.raking&&!carryPkg){const d=att().tube+(cur.vortexAim??cur.vortexD);drawAimLine(cx,cy,Math.max(4,d-att().tube-9));drawCross(Math.round(P.x+aim.x*d-cx),Math.round(P.y+aim.y*d-cy));}
    else drawAimLine(cx,cy);}
  else{
    if(cur.dev.t!=='auto')return;
    const mx=Math.floor((mouse.x-HV.left+canOff.x)/scale),my=Math.floor((mouse.y+canOff.y)/scale);if(mx<0||mx>VW)return;
    drawCross(mx,my);
  }
  if(att().vortex&&power>.05){ctx.fillStyle='rgba(176,108,255,.8)';const tx=Math.round(bl.tx-camX),ty=Math.round(bl.ty-camY);for(let k=0;k<6;k++){const a=time*8+k*Math.PI/3;ctx.fillRect(Math.round(tx+Math.cos(a)*6),Math.round(ty+Math.sin(a)*4),1,1);}}
}
function sky(h){
  let tint=null,dark=0;
  if(h<9){const k=clamp((9-h)/2,0,1);tint=[255-k*15,255-k*45,255-k*70];}
  else if(h>16.5){const k=clamp((h-16.5)/3,0,1);tint=[255,Math.round(255-k*65),Math.round(255-k*120)];}
  if(h>19.2)dark=clamp((h-19.2)/1.6,0,1)*.8;
  return{tint,dark};
}
function drawLighting(cx,cy){
  const s=sky(hour);
  if(s.tint){ctx.globalCompositeOperation='multiply';ctx.fillStyle=`rgb(${s.tint[0]|0},${s.tint[1]|0},${s.tint[2]|0})`;ctx.fillRect(0,0,VW,VH);ctx.globalCompositeOperation='source-over';}
  if(s.dark<=.01)return;
  const L=lCtx;L.globalCompositeOperation='source-over';L.clearRect(0,0,VW,VH);L.fillStyle=`rgba(8,12,38,${s.dark})`;L.fillRect(0,0,VW,VH);
  L.globalCompositeOperation='destination-out';
  const lights=[];
  const [c,sn]=tdir();lights.push([TR.x+c*48,TR.y+sn*48,36,.95],[TR.x+c*78,TR.y+sn*78,32,.7],[TR.x,TR.y,22,.5]);
  for(const Lt of ALL_LOTS){lights.push([Lt.door.x+Lt.front[0]*8,Lt.door.y+Lt.front[1]*8,30,.85]);for(const l of Lt.lamps||[])lights.push([l.x+1,l.y-3,15,.8]);}
  for(const st of STREETLIGHTS){const [hx,hy]=lampHead(st);lights.push([hx+st.dx*6,hy+LAMP_H-4+st.dy*16,60,.9],[hx,hy+1,9,1]);}
  const glows=[];
  for(const [wx,wy,r,a] of lights){const x=wx-cx,y=wy-cy;if(x<-r||x>VW+r||y<-r||y>VH+r)continue;
    const g=L.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,`rgba(0,0,0,${a})`);g.addColorStop(.6,`rgba(0,0,0,${a*.6})`);g.addColorStop(1,'rgba(0,0,0,0)');L.fillStyle=g;L.fillRect(x-r,y-r,r*2,r*2);glows.push([x,y,r]);}
  // on foot: a faint glow so you can see yourself, plus a flashlight beam once it's bought, and at level 3 the
  // light suit's ring all round you
  const beams=[],suits=[];
  for(const pl of players){if(!onFoot(pl))continue;const Q=pl.P,A=pl.aim;
    const px=Q.x-cx,py=Q.y-4-cy,g=L.createRadialGradient(px,py,0,px,py,16);g.addColorStop(0,'rgba(0,0,0,.55)');g.addColorStop(1,'rgba(0,0,0,0)');L.fillStyle=g;L.fillRect(px-16,py-16,32,32);
    if(pl.upg.light>2){const r=SUIT_R,g=L.createRadialGradient(px,py,0,px,py,r);g.addColorStop(0,'rgba(0,0,0,.8)');g.addColorStop(.55,'rgba(0,0,0,.55)');g.addColorStop(1,'rgba(0,0,0,0)');
      L.fillStyle=g;L.fillRect(px-r,py-r,r*2,r*2);suits.push([px,py]);}
    if(pl.upg.light>0){const lv=pl.upg.light,R=lv>1?118:78,hw=lv>1?.5:.32,a=Math.atan2(A.y,A.x),ox=px+A.x*5,oy=py+A.y*5;beams.push({ox,oy,R,hw,a});
      // soft edges: a few stacked wedges, widest and faintest first
      for(const [k,al] of [[1.35,.3],[1,.45],[.6,.35]]){const gr=L.createRadialGradient(ox,oy,0,ox,oy,R);gr.addColorStop(0,`rgba(0,0,0,${al})`);gr.addColorStop(.75,`rgba(0,0,0,${al*.7})`);gr.addColorStop(1,'rgba(0,0,0,0)');
        L.fillStyle=gr;L.beginPath();L.moveTo(ox,oy);L.arc(ox,oy,R,a-hw*k,a+hw*k);L.closePath();L.fill();}}}
  ctx.drawImage(lCan,0,0);
  ctx.globalCompositeOperation='lighter';
  for(const {ox,oy,R,hw,a} of beams){const g=ctx.createRadialGradient(ox,oy,0,ox,oy,R);g.addColorStop(0,`rgba(255,240,200,${.16*s.dark})`);g.addColorStop(1,'rgba(255,240,200,0)');
    ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(ox,oy);ctx.arc(ox,oy,R,a-hw,a+hw);ctx.closePath();ctx.fill();}
  for(const [x,y] of suits){const g=ctx.createRadialGradient(x,y,0,x,y,SUIT_R);g.addColorStop(0,`rgba(190,235,255,${.13*s.dark})`);g.addColorStop(1,'rgba(190,235,255,0)');ctx.fillStyle=g;ctx.fillRect(x-SUIT_R,y-SUIT_R,SUIT_R*2,SUIT_R*2);}
  for(const [x,y,r] of glows){const g=ctx.createRadialGradient(x,y,0,x,y,r*.7);g.addColorStop(0,`rgba(255,170,80,${.12*s.dark})`);g.addColorStop(1,'rgba(255,170,80,0)');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);}
  ctx.globalCompositeOperation='source-over';
}
const SUIT_R=44;
let canOff={x:0,y:0};
function render(){for(const v of views){useView(v);withPl(v.pl,renderView);}useView(views[0]);}
function renderView(){
  const shake=(power>1.2?(rnd()-.5)*(power-1.2)*1.2:0)+(crashShake>0?(rnd()-.5)*crashShake*14:0);
  // draw on whole world pixels, then slide the canvas by the leftover fraction (snapped to device pixels) for smooth scrolling
  const bx=Math.floor(camX),by=Math.floor(camY),dpr=devicePixelRatio||1;
  const ox=Math.round((camX-bx)*scale*dpr)/dpr,oy=Math.round((camY-by)*scale*dpr)/dpr;
  if(ox!==canOff.x||oy!==canOff.y){canOff.x=ox;canOff.y=oy;cvs.style.transform=`translate3d(${-ox}px,${-oy}px,0)`;}
  const cx=bx+Math.round(shake),cy=by+Math.round(shake*.6);
  ctx.fillStyle='#10171a';ctx.fillRect(0,0,VW,VH);
  const sx=Math.max(0,cx),sy=Math.max(0,cy),sw=Math.min(VW,WORLD_W-sx),sh=Math.min(VH,H-sy);
  if(sw>0&&sh>0)ctx.drawImage(bg,sx,sy,sw,sh,sx-cx,sy-cy,sw,sh);
  drawTarpsGround(cx,cy);
  drawPools(cx,cy);
  drawLeaves(cx,cy);
  ctx.drawImage(gCan,0,0);
  drawZoneHints(cx,cy,curLot);
  const spr=[];
  for(const p of peds)spr.push([p.y,()=>p.cameo?drawCameo(p,cx,cy):drawPed(p,cx,cy)]);
  for(const v of traffic)spr.push([v.y+8,()=>drawTraffic(v,cx,cy)]);
  for(const o of officers)spr.push([o.y,()=>drawPed(o,cx,cy)]);
  for(const o of couriers)spr.push([o.y,()=>drawCourier(o,cx,cy)]);
  for(const k of packages)spr.push([k===carryPkg?P.y+.5:k.y,()=>drawPackage(k,cx,cy)]);
  for(const q of squirrels)spr.push([q.y,()=>drawSquirrel(q,cx,cy)]);
  for(const m of MAILBOXES)spr.push([m.y+8,()=>drawMailbox(m,cx,cy)]);
  {const lit=sky(hour).dark>.05;for(const L of ALL_LOTS)for(const l of L.lamps||[])spr.push([l.y,()=>drawYardLamp(l,cx,cy,lit)]);}
  for(const b of birds){ctx.fillStyle='rgba(0,0,0,.16)';ctx.fillRect(Math.round(b.x-cx)-1,Math.round(b.y-cy),3,1);}
  for(const c of CARS)spr.push([c.y1,()=>drawCar(c,cx,cy)]);
  for(const st of STREETLIGHTS)spr.push([st.y+1,()=>drawStreetlight(st,cx,cy)]);
  for(const p of POTS){if(p.x-cx<-14||p.x-cx>VW+14||p.y-cy<-4||p.y-cy>VH+24)continue;spr.push([p.y,()=>drawPot(p,cx,cy)]);}
  for(const pl of players)if(onFoot(pl))spr.push([pl.P.y,()=>withPl(pl,()=>drawPlayer(cx,cy))]);
  spr.push([TR.y+12,()=>drawTruck(cx,cy)]);
  spr.sort((a,b)=>a[0]-b[0]);for(const s of spr)s[1]();
  for(const s of puffs){ctx.fillStyle=`rgba(200,200,200,${(s.l/s.m*.35).toFixed(2)})`;const r=Math.round((1-s.l/s.m)*3)+1;ctx.fillRect(Math.round(s.x-cx)-r,Math.round(s.y-cy)-r,r*2,r*2);}
  for(const s of streaks){const a=(s.l/s.m)*.5;ctx.fillStyle=s.v?`rgba(220,190,255,${a.toFixed(2)})`:`rgba(255,255,255,${a.toFixed(2)})`;const x=s.x-cx,y=s.y-cy-3;
    ctx.fillRect(Math.round(x),Math.round(y),1,1);ctx.fillRect(Math.round(x-s.vx*.018),Math.round(y-s.vy*.018),1,1);ctx.fillRect(Math.round(x-s.vx*.036),Math.round(y-s.vy*.036),1,1);}
  ctx.drawImage(aCan,0,0);
  drawTarpsAir(cx,cy);
  // tunnel roofs pass over whoever's in the tunnel
  for(const t of TUNNELS){if(t.x0-cx>VW||t.y0-cy>VH||t.x1<cx||t.y1<cy)continue;ctx.globalAlpha=t.alpha;ctx.drawImage(t.can,t.x0-cx,t.y0-cy);ctx.globalAlpha=1;}
  for(const t of TREES){
    const sway=Math.round(Math.sin(time*1.2+t.ph)*.8+Math.sin(time*31+t.ph)*t.shake*1.2);
    const x=Math.round(t.x-t.can.width/2-cx+sway),y=Math.round(t.y-t.lift-t.can.height/2-cy);
    if(x>VW||y>VH||x+t.can.width<0||y+t.can.height<0)continue;
    ctx.globalAlpha=t.alpha;ctx.drawImage(t.can,x,y);ctx.globalAlpha=1;
  }
  for(const s of sparks){ctx.fillStyle=s.c;ctx.fillRect(Math.round(s.x-cx),Math.round(s.y-cy-s.z),1,1);}
  for(const e of envelopes){const k=e.t/e.T,x=e.x0+(e.x1-e.x0)*k,y=e.y0+(e.y1-e.y0)*k-Math.sin(Math.PI*k)*10;ctx.fillStyle='#8f897d';ctx.fillRect(Math.round(x-cx)-1,Math.round(y-cy)-1,4,3);ctx.fillStyle='#f4f1e8';ctx.fillRect(Math.round(x-cx)-1,Math.round(y-cy)-1,3,2);}
  for(const b of birds)drawBird(b,cx,cy);
  drawLighting(cx,cy);
  drawDoorBadges(cx,cy);
  drawPackageCues(cx,cy);
  drawMates(cx,cy);
  drawMarker(cx,cy);
  drawTutMarker(cx,cy);
  drawBedPanel(cx,cy);
  drawCursor(cx,cy);
}
