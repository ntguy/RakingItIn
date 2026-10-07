'use strict';
// ============================================================ physics
function pushOutTruck(px,py,r){
  const [lx,ly]=toTruck(px,py),hx=TRUCK_HL+r,hy=TRUCK_HW+r;
  if(Math.abs(lx)>=hx||Math.abs(ly)>=hy)return null;
  let nx=lx,ny=ly;if(hx-Math.abs(lx)<hy-Math.abs(ly))nx=Math.sign(lx||1)*hx;else ny=Math.sign(ly||1)*hy;
  return fromTruck(nx,ny);
}
function collidePlayer(){
  const r=5;
  P.x=clamp(P.x,r,WORLD_W-r);P.y=clamp(P.y,r,H-4);
  const push=(w)=>{if(P.x>w.x0-r&&P.x<w.x1+r&&P.y>w.y0-r&&P.y<w.y1+r){
    const l=P.x-(w.x0-r),rr=(w.x1+r)-P.x,t=P.y-(w.y0-r),b=(w.y1+r)-P.y,m=Math.min(l,rr,t,b);
    if(m===l)P.x=w.x0-r;else if(m===rr)P.x=w.x1+r;else if(m===t)P.y=w.y0-r;else P.y=w.y1+r;}};
  for(const w of WALLS){if(P.x>w.x0-10&&P.x<w.x1+10&&P.y>w.y0-10&&P.y<w.y1+10)push(w);}
  const o=pushOutTruck(P.x,P.y,r);if(o){P.x=o[0];P.y=o[1];}
  for(const t of TREES){const dx=P.x-t.x,dy=P.y-t.y;if(Math.abs(dx)>12||Math.abs(dy)>12)continue;const d=Math.hypot(dx,dy),m=r+5;if(d<m&&d>0){P.x=t.x+dx/d*m;P.y=t.y+dy/d*m;}}
  for(const p of POTS){if(p.broken)continue;const dx=P.x-p.x,dy=P.y-p.y;if(Math.abs(dx)>12||Math.abs(dy)>12)continue;const d=Math.hypot(dx,dy),m=r+p.r;if(d<m&&d>0){P.x=p.x+dx/d*m;P.y=p.y+dy/d*m;}}
  for(const tv of traffic)if(!tv.ghost)for(const [qx,qy] of trafficCircles(tv)){const dx=P.x-qx,dy=P.y-qy,d=Math.hypot(dx,dy),m=r+tv.hw;if(d<m&&d>0){P.x=qx+dx/d*m;P.y=qy+dy/d*m;}}
}
const REST=.45;
function bounceLeaf(i,nx,ny){
  const vn=VX[i]*nx+VY[i]*ny;
  if(vn<0){VX[i]-=(1+REST)*vn*nx;VY[i]-=(1+REST)*vn*ny;VZ[i]+=-vn*.22;VR[i]+=(PH[i]-.5)*vn*.4;}
  const j=(PH[i]-.5)*24+(rnd()-.5)*14;VX[i]+=-ny*j+nx*6;VY[i]+=nx*j+ny*6;
}
function pushRect(i,w){
  const x=LX[i],y=LY[i],l=x-w.x0,r=w.x1-x,t=y-w.y0,b=w.y1-y,m=Math.min(l,r,t,b);
  if(m===l){LX[i]=w.x0-.6;bounceLeaf(i,-1,0);}else if(m===r){LX[i]=w.x1+.6;bounceLeaf(i,1,0);}
  else if(m===t){LY[i]=w.y0-.6;bounceLeaf(i,0,-1);}else{LY[i]=w.y1+.6;bounceLeaf(i,0,1);}
}
const MAXV=300,MAXV2=MAXV*MAXV;
// the grid of spots where resting leaves can be stirred this frame (32px cells)
const HOT_SH=5,HOT_W=(WORLD_W>>HOT_SH)+1,HOT_H=(H>>HOT_SH)+1,HOT=new Uint8Array(HOT_W*HOT_H);
// vortex tip: top speed leaves spiral in at, how fast speed falls off near the aim point, how much they circle, how hard
// the air grabs them (per unit of blower force), and the radius of the pile they settle into
const VORT_VMAX=55,VORT_GAIN=4,VORT_SWIRL=.45,VORT_STEER=.03,VORT_PILE=4;
let bl={nx:0,ny:0,range:0,cosH:1,tx:0,ty:0};
function blowParams(p){
  const a=att(),tl=upg.tune;let F,R,deg,lift;
  if(p<=1){F=BASE.lowF*p;R=BASE.lowR*(.55+.45*p);deg=a.coneLo;lift=.07*p;}
  else{const k=p-1;F=BASE.lowF+(BASE.highF-BASE.lowF)*k;R=BASE.lowR+(BASE.highR-BASE.lowR)*k;deg=a.coneLo+(a.coneHi-a.coneLo)*k;lift=.07+(BASE.liftHi-.07)*k;}
  return{F:F*a.force*TUNE.force[tl],R:R*a.range*TUNE.range[tl],cosH:Math.cos(deg*Math.PI/180),lift:lift*a.lift*TUNE.lift[tl],vortex:!!a.vortex,twin:!!a.twin};
}
function hitPed(x,y){for(let k=0;k<peds.length;k++){const p=peds[k];if(Math.abs(x-p.x)<4&&y>p.y-5&&y<p.y+3){complain(p);return;}}}
function updateLeaves(dt){
  // every running blower and every brisk walker this frame (one of each per player)
  const B=[],WK=[],par=players.map(pl=>withPl(pl,()=>[blowParams(onFoot(pl)?pl.power:0),att().tube]));
  // (parameters are gathered before anything is written to the player objects: swapping players in and out
  // writes the loaded globals back, which would otherwise undo a player's fresh blower position)
  for(const pl of players){
    const foot=onFoot(pl),p=foot?pl.power:0,ax=pl.aim.x,ay=pl.aim.y,[bp,tube]=par[players.indexOf(pl)];
    const nx=pl.P.x+ax*tube,ny=pl.P.y+ay*tube,range=bp.R,cosH=bp.cosH;let tgx=0,tgy=0;
    if(bp.vortex){const d=pl.vortexD;tgx=nx+ax*d;tgy=ny+ay*d;}
    pl.bl={nx,ny,range,cosH,tx:tgx,ty:tgy,vort:bp.vortex};
    const hi=(pl.mode||pl.lastMode)===2;
    if(p>.02)B.push({nx,ny,ax,ay,range,R2:range*range,F:bp.F,cosH,inv:1/(1-cosH),liftK:bp.lift,vort:bp.vortex,tgx,tgy,hi});
    // the twin nozzle's second outlet points straight back from the pack
    if(bp.twin){const bx=pl.P.x-ax*tube,by=pl.P.y-ay*tube;pl.bl2={nx:bx,ny:by,range,cosH,ax:-ax,ay:-ay};
      if(p>.02)B.push({nx:bx,ny:by,ax:-ax,ay:-ay,range,R2:range*range,F:bp.F,cosH,inv:1/(1-cosH),liftK:bp.lift,vort:false,tgx:0,tgy:0,hi});}
    else pl.bl2=null;
    const sp=foot?Math.hypot(pl.P.vx,pl.P.vy):0;if(sp>12)WK.push({px:pl.P.x,py:pl.P.y,psp:sp,vx:pl.P.vx,vy:pl.P.vy});
  }
  bl=cur.bl;const nB=B.length,nWK=WK.length,on=nB>0;
  const nearBlow=(x,y)=>{for(let q=0;q<nB;q++){const b=B[q];if(x>b.nx-b.range&&x<b.nx+b.range&&y>b.ny-b.range&&y<b.ny+b.range)return true;}return false;};
  const nearWalk=(x,y)=>{for(let q=0;q<nWK;q++){const w=WK[q];if(x>w.px-8&&x<w.px+8&&y>w.py-8&&y<w.py+8)return true;}return false;};
  const DT=tarps.filter(t=>t.st==='down'),nDT=DT.length,sl=Math.max(...players.map(pl=>pl.upg.sticky)),tD=Math.exp(-[9.5,14,20,28][sl]*dt),tThr=[1.15,1.5,1.9,2.4][sl];
  const onTarp=(x,y)=>{for(let q=0;q<nDT;q++){const t=DT[q];if(x>=t.x0&&x<t.x1&&y>=t.y0&&y<t.y1)return true;}return false;};
  const aD=Math.exp(-1.1*dt),gD=Math.exp(-7.5*dt),pD=Math.exp(-3.2*dt),zD=Math.exp(-2.4*dt),rAD=Math.exp(-.5*dt),rGD=Math.exp(-6*dt);
  const T=time;
  const tc=Math.cos(TR.a),ts=Math.sin(TR.a),tv=TR.v,tvx=tc*tv,tvy=ts*tv,tMove=Math.abs(tv)>15,tx=TR.x,ty=TR.y,tsp=Math.abs(tv);
  const wind=Math.sin(T*.13)*6+3,havePeds=peds.length>0,WW=WORLD_W;
  const MV=movers(),nMV=MV.length,nearMover=(x,y)=>{for(let q=0;q<nMV;q++){const m=MV[q];if(x>m.x-m.r&&x<m.x+m.r&&y>m.y-m.r&&y<m.y+m.r)return true;}return false;};
  // a leaf lying still can only be stirred near a blower, a walker, the moving truck or traffic: mark the grid cells
  // those cover, so the thousands of leaves lying anywhere else are passed over with one lookup
  HOT.fill(0);const hot=(x0,y0,x1,y1)=>{const a=clamp(x0>>HOT_SH,0,HOT_W-1),b=clamp(x1>>HOT_SH,0,HOT_W-1),c=clamp(y0>>HOT_SH,0,HOT_H-1),d=clamp(y1>>HOT_SH,0,HOT_H-1);for(let gy=c;gy<=d;gy++)HOT.fill(1,gy*HOT_W+a,gy*HOT_W+b+1);};
  for(const b of B)hot(b.nx-b.range|0,b.ny-b.range|0,b.nx+b.range|0,b.ny+b.range|0);
  for(const w of WK)hot(w.px-8|0,w.py-8|0,w.px+8|0,w.py+8|0);
  if(tMove)hot(tx-80|0,ty-60|0,tx+80|0,ty+60|0);
  for(const m of MV)hot(m.x-m.r|0,m.y-m.r|0,m.x+m.r|0,m.y+m.r|0);
  let air=0,slide=0,act=0;const PX=players.map(pl=>pl.P.x),PY=players.map(pl=>pl.P.y),nP=PX.length;
  for(let i=0;i<N;i++){
    if(ST[i]!==0)continue;
    let x=LX[i],y=LY[i],z=LZ[i],vx=VX[i],vy=VY[i],vz=VZ[i];
    if(z===0&&vx===0&&vy===0&&vz===0){
      if(!HOT[((y|0)>>HOT_SH)*HOT_W+((x|0)>>HOT_SH)])continue;
      if(!(on&&nearBlow(x,y))&&!(nWK&&nearWalk(x,y))&&!(tMove&&x>tx-80&&x<tx+80&&y>ty-60&&y<ty+60)&&!(nMV&&nearMover(x,y)))continue;
    }
    const ph=PH[i];act++;
    for(let q=0;q<nB;q++){const b=B[q],nx=b.nx,ny=b.ny,ax=b.ax,ay=b.ay,range=b.range,R2=b.R2,F=b.F,cosH=b.cosH,inv=b.inv,liftK=b.liftK,vort=b.vort,tgx=b.tgx,tgy=b.tgy;
      const dx=x-nx,dy=y-ny,d2=dx*dx+dy*dy;
      if(d2<R2&&d2>.01){
        const d=Math.sqrt(d2),c=(dx*ax+dy*ay)/d;
        if(c>cosH){
          const t=1-d/range,ang=(c-cosH)*inv,f=F*t*(.3+.7*ang)*(z>1?1.3:1);
          if(z>.3||f>THR[i]*(nDT&&z<1&&onTarp(x,y)?tThr:1)){
            if(b.hi)UH[HOME[i]]=1;else UL[HOME[i]]=1;
            if(vort){
              // steer the leaf toward a speed and heading rather than shoving it: a spiral in toward the aim point that
              // slows to nothing at the middle, so leaves settle into a pile instead of overshooting. More power only
              // makes them get there quicker
              const qx=tgx-x,qy=tgy-y,qd=Math.hypot(qx,qy)||1,ux=qx/qd,uy=qy/qd;
              const vs=Math.min(VORT_VMAX+F*.04,Math.max(0,qd-VORT_PILE)*VORT_GAIN),sw=VORT_SWIRL*Math.min(1,qd/18);
              const k=Math.min(1,f*VORT_STEER*dt);
              vx+=((ux-uy*sw)*vs-vx)*k;vy+=((uy+ux*sw)*vs-vy)*k;
              if(z>0)vz-=f*.05*dt;else vz+=f*liftK*LIFT[i]*dt*.08;
            }else{
              const rx=dx/d,ry=dy/d,n=Math.sin(T*9+ph*40+d*.15)*.5+Math.sin(T*23+ph*13)*.25;
              vx+=(ax*.72+rx*.28-ay*n)*f*dt;vy+=(ay*.72+ry*.28+ax*n)*f*dt;
              vz+=f*liftK*LIFT[i]*dt*(.4+.6*(Math.sin(T*5+ph*30)*.5+.5));
            }
            if(z<=0)vz+=f*.02*dt*LIFT[i]*Math.min(1,liftK*6);
            VR[i]+=(ph-.5)*f*.06*dt;
          }
        }
      }
    }
    if(nMV&&z<6)for(let q=0;q<nMV;q++){const m=MV[q],dx=x-m.x,dy=y-m.y;if(dx>-m.r&&dx<m.r&&dy>-m.r&&dy<m.r){const d2=dx*dx+dy*dy;if(d2<m.r*m.r&&d2>.01){const d=Math.sqrt(d2),k=m.sp*(1-d/m.r)*m.k*dt;vx+=dx/d*k+m.vx/m.sp*k*2;vy+=dy/d*k+m.vy/m.sp*k*2;vz+=k*.15*LIFT[i];VR[i]+=(ph-.5)*k;}}}
    for(let q=0;q<nWK;q++)if(z<4){const w=WK[q],px=w.px,py=w.py,psp=w.psp;
      const dx=x-px,dy=y-py;
      if(dx>-7&&dx<7&&dy>-7&&dy<7){const d2=dx*dx+dy*dy;if(d2<42&&d2>.01){const d=Math.sqrt(d2),k=psp*(1-d/6.5)*9*dt*BODY_PUSH;vx+=dx/d*k+w.vx/psp*k*2.2;vy+=dy/d*k+w.vy/psp*k*2.2;vz+=k*.15;VR[i]+=(ph-.5)*k;}}
    }
    if(tMove&&z<16){
      const dx=x-tx,dy=y-ty;
      if(dx>-80&&dx<80&&dy>-60&&dy<60){
        const lx=dx*tc+dy*ts,ly=-dx*ts+dy*tc,fw=Math.sign(tv);
        if(Math.abs(lx)<TRUCK_HL+6&&Math.abs(ly)<TRUCK_HW+6){const side=ly<0?-1:1;vx+=tvx*6*dt-ts*side*110*dt;vy+=tvy*6*dt+tc*side*110*dt;vz+=120*dt*LIFT[i];}
        else{const back=-lx*fw-TRUCK_HL;if(back>0&&back<46&&Math.abs(ly)<20){const k=(1-back/46)*Math.min(1,tsp/120);
          vx+=tvx*k*2.2*dt+ts*ly*k*1.5*dt;vy+=tvy*k*2.2*dt-tc*ly*k*1.5*dt;vx+=Math.sin(T*7+ph*20)*40*k*dt*-ts;vy+=Math.sin(T*7+ph*20)*40*k*dt*tc;vz+=k*60*dt*LIFT[i];VR[i]+=(ph-.5)*k*20*dt;}}
      }
    }
    if(z>0||vz>0){
      vz-=95*dt;vz*=zD;
      vx+=(Math.sin(T*3.3+ph*25)*30+wind)*dt;vy+=Math.cos(T*2.9+ph*19)*24*dt;
      vx*=aD;vy*=aD;VR[i]*=rAD;if(z>2)air++;
    }else{
      const k=nDT&&onTarp(x,y)?tD:SURF[(y|0)*WW+(x|0)]?pD:gD;
      vx*=k;vy*=k;VR[i]*=rGD;if(vx*vx+vy*vy<1.5){vx=0;vy=0;}
    }
    const s2=vx*vx+vy*vy;
    if(z<4&&s2>150)for(let q=0;q<nP;q++){const dx=x-PX[q],dy=y-PY[q];if(dx>-160&&dx<160&&dy>-160&&dy<160){slide++;break;}}
    if(s2>MAXV2){const k=MAXV/Math.sqrt(s2);vx*=k;vy*=k;}
    x+=vx*dt;y+=vy*dt;z+=vz*dt;
    if(z<=0){z=0;if(vz<-8)vz=-vz*.18;else vz=0;}else if(z>75){z=75;if(vz>0)vz=0;}
    ROT[i]+=VR[i]*dt;
    if(x<2){x=2;vx=Math.abs(vx)*.4;}else if(x>WW-3){x=WW-3;vx=-Math.abs(vx)*.4;}
    if(y<2){y=2;vy=Math.abs(vy)*.4;}else if(y>H-2){y=H-2;vy=-Math.abs(vy)*.4;}
    LX[i]=x;LY[i]=y;LZ[i]=z;VX[i]=vx;VY[i]=vy;VZ[i]=vz;
    // touching the water: it's stuck floating until someone nets it out
    if(z<.8&&WATER[(y|0)*WW+(x|0)]){ST[i]=3;LZ[i]=0;VX[i]*=.15;VY[i]*=.15;VZ[i]=0;if(ripples.length<70&&(vz<-6||s2>400))ripples.push({x,y,r0:1,g:4,l:.6,m:.6});continue;}
    const li=LOT_AT[(y|0)*WW+(x|0)];
    if(li>=0){{const L=ALL_LOTS[li];
        if(z<11){const fs=L.fences;for(let q=0;q<fs.length;q++){const w=fs[q];if(x>w.x0&&x<w.x1&&y>w.y0&&y<w.y1){pushRect(i,w);break;}}}
        if(z<13){const ob=L.obst;for(let q=0;q<ob.length;q++){const w=ob[q];if(LX[i]>w.x0&&LX[i]<w.x1&&LY[i]>w.y0&&LY[i]<w.y1){pushRect(i,w);break;}}}
        if(z<9){const pp=L.pots;for(let q=0;q<pp.length;q++){const p=pp[q];if(p.broken)continue;const dx=LX[i]-p.x,dy=LY[i]-p.y,m=p.r+.8;if(dx>-m&&dx<m&&dy>-m&&dy<m){const d=Math.hypot(dx,dy)||.01;if(d<m){LX[i]=p.x+dx/d*(m+.4);LY[i]=p.y+dy/d*(m+.4);bounceLeaf(i,dx/d,dy/d);}}}}
        if(z<25){const ts2=L.trees;for(let q=0;q<ts2.length;q++){const t=ts2[q],dx=LX[i]-t.x,dy=LY[i]-t.y;if(dx>-5&&dx<5&&dy>-5&&dy<5){const d=Math.hypot(dx,dy)||.01;if(d<5){LX[i]=t.x+dx/d*5.4;LY[i]=t.y+dy/d*5.4;bounceLeaf(i,dx/d,dy/d);}}}}
      }
    }else if(z<11){
      const bk=CAR_GRID[((y/GC)|0)*GW+((x/GC)|0)];if(bk)for(let q=0;q<bk.length;q++){const w=bk[q];if(x>w.x0&&x<w.x1&&y>w.y0&&y<w.y1){pushRect(i,w);break;}}
    }
    if(z<14){const dx=LX[i]-tx,dy=LY[i]-ty;if(dx>-30&&dx<30&&dy>-30&&dy<30){const lx=dx*tc+dy*ts,ly=-dx*ts+dy*tc;if(Math.abs(lx)<TRUCK_HL&&Math.abs(ly)<TRUCK_HW){
      let nlx=lx,nly=ly,nx2,ny2;if(TRUCK_HL-Math.abs(lx)<TRUCK_HW-Math.abs(ly)){nlx=Math.sign(lx||1)*(TRUCK_HL+.6);nx2=Math.sign(lx||1)*tc;ny2=Math.sign(lx||1)*ts;}else{nly=Math.sign(ly||1)*(TRUCK_HW+.6);nx2=-ts*Math.sign(ly||1);ny2=tc*Math.sign(ly||1);}
      const w=fromTruck(nlx,nly);LX[i]=w[0];LY[i]=w[1];bounceLeaf(i,nx2,ny2);}}}
    if(havePeds&&z<16&&(z>.5||s2>900))hitPed(LX[i],LY[i]);
  }
  airCount=air;rustleLeaves=slide;leafActive=act;
}
// a tunnel's roof goes see-through while anyone's walking under it
function fadeTunnels(dt){for(const t of TUNNELS){const inside=players.some(pl=>onFoot(pl)&&inRect(t,pl.P.x,pl.P.y,3));t.alpha+=((inside?.25:1)-t.alpha)*Math.min(1,dt*7);}}
function updateTrees(dt){
  fadeTunnels(dt);
  const B=blowers(.3);
  for(const t of TREES){
    const cxw=t.x,cyw=t.y-t.lift;let hit=0;
    for(const pl of B){const b=pl.bl,dx=cxw-b.nx,dy=cyw-b.ny,d=Math.hypot(dx,dy);if(d<b.range+t.r*.6&&d>0&&(dx*pl.aim.x+dy*pl.aim.y)/d>b.cosH-.2)hit=Math.max(hit,pl.power*(1-Math.min(1,d/(b.range+t.r))));}
    t.shake+=(hit-t.shake)*Math.min(1,dt*5);
    if(!t.lot.done&&!t.lot.filler){
      t.timer-=dt*t.rate*.5*(1+t.shake*10);
      if(t.timer<=0){
        t.timer=.6+rnd()*.8;
        const a=rnd()*Math.PI*2,d=Math.sqrt(rnd())*t.r*.8,x=t.x+Math.cos(a)*d,y=t.y+Math.sin(a)*d*.75;
        if(okLeafSpot(t.lot,x,y)){const tc=TREE_LEAF_COLS[t.pal];addLeaf(x,y,t.lift+4+rnd()*16,tc[(rnd()*3)|0],t.lot.k);}
      }
    }
    // see-through when anyone's under it, or aiming into it
    let inside=false,aimed=false;
    for(const pl of players){if(!onFoot(pl))continue;const Q=pl.P,dx=Q.x-cxw,dy=Q.y-12-cyw;if((dx*dx)/(t.r*t.r)+(dy*dy)/(t.r*t.r*.9)<1.15)inside=true;
      const mx=Q.x+pl.aim.x*34-cxw,my=Q.y-3+pl.aim.y*34-cyw;if(mx*mx+my*my<t.r*t.r*1.1)aimed=true;}
    t.alpha+=((inside?.28:aimed?.4:.95)-t.alpha)*Math.min(1,dt*7);
  }
}
// (a fresh day's leaves: count every pool once, wherever the players are)
let poolRecount=true;
// floating leaves drift on the surface. Wading pushes them around; a moving net head scoops them up
let rippleT=0;
function updatePool(dt){
  if(!POOLS.length)return;
  // floating leaves only drift, and only get netted or waded through, near a player or on screen: with no pool in
  // reach of either, skip the pass over every leaf and keep the counts from last time (nothing can have changed them)
  if(!poolRecount&&!POOLS.some(p=>inAnyCam((p.x0+p.x1)/2,(p.y0+p.y1)/2,(p.x1-p.x0)/2+20)||players.some(pl=>Math.hypot(Math.max(p.x0-pl.P.x,0,pl.P.x-p.x1),Math.max(p.y0-pl.P.y,0,pl.P.y-p.y1))<NET_REACH+20)))return;
  poolRecount=false;for(const pl of POOLS)pl.cnt=0;
  const WW=WORLD_W,T=time,NH=[],WD=[];
  for(const pl of players){if(!onFoot(pl))continue;
    if(pl.heldNet){const n=pl.heldNet,hx=pl.P.x+pl.aim.x*NET_REACH,hy=pl.P.y+pl.aim.y*NET_REACH;let hvx=0,hvy=0,hsp=0;
      if(pl.netPrev&&dt>0){hvx=(hx-pl.netPrev[0])/dt;hvy=(hy-pl.netPrev[1])/dt;hsp=Math.hypot(hvx,hvy);}pl.netPrev=[hx,hy];
      NH.push({pl,n,idx:NETS.indexOf(n),hx,hy,hvx,hvy,hsp,hin:wet(hx,hy)>0});}
    if(wet(pl.P.x,pl.P.y)>0)WD.push({px:pl.P.x,py:pl.P.y,vx:pl.P.vx,vy:pl.P.vy,psp:Math.hypot(pl.P.vx,pl.P.vy)});}
  netPrev=cur.netPrev;
  rippleT-=dt;
  if(rippleT<=0){rippleT=.12;
    for(const w of WD)if(w.psp>10)ripples.push({x:w.px,y:w.py,r0:3,g:9,l:.9,m:.9});
    for(const h of NH)if(h.hin&&h.hsp>20)ripples.push({x:h.hx,y:h.hy,r0:2,g:6,l:.6,m:.6});}
  const aD=Math.exp(-1.8*dt);
  for(let i=0;i<N;i++){
    const st=ST[i];
    if(st===4){const h=NH.find(h=>h.idx===UN[i]);if(h){const a=PH[i]*44,rr=Math.sqrt((PH[i]*13.7)%1)*3.2;LX[i]=h.hx+Math.cos(a)*rr;LY[i]=h.hy+Math.sin(a)*rr*.7;LZ[i]=5.4;}continue;}
    if(st!==3)continue;
    let x=LX[i],y=LY[i],vx=VX[i],vy=VY[i];const ph=PH[i];
    vx+=Math.sin(T*.6+ph*30)*5*dt;vy+=Math.cos(T*.5+ph*21)*5*dt;
    for(const w of WD){const dx=x-w.px,dy=y-w.py;if(dx>-10&&dx<10&&dy>-10&&dy<10){const d=Math.hypot(dx,dy)||.01;if(d<10){const k=(1-d/10)*(20+w.psp*1.6)*dt;vx+=dx/d*k+w.vx*k*.03;vy+=dy/d*k+w.vy*k*.03;}}}
    let caught=false;
    for(const h of NH){if(!h.hin)continue;const dx=x-h.hx,dy=y-h.hy;if(dx>-10&&dx<10&&dy>-10&&dy<10){const d=Math.hypot(dx,dy);
      if(d<NET_R&&h.hsp>16){if(h.n.n<NET_CAP){ST[i]=4;UN[i]=h.idx;h.n.n++;statsT=1;caught=true;break;}
        if(time-h.pl.netFullT>2){h.pl.netFullT=time;blip(150,.15,'sawtooth',.04,90);withPl(h.pl,()=>rumble(.3,.2,150));}}
      if(d<10&&h.hsp>4){const k=(1-d/10)*Math.min(1,dt*8);vx+=(h.hvx-vx)*k;vy+=(h.hvy-vy)*k;}}}
    if(caught)continue;
    vx*=aD;vy*=aD;
    const sp=vx*vx+vy*vy;if(sp>3600){const k=60/Math.sqrt(sp);vx*=k;vy*=k;}
    const nx=x+vx*dt,ny=y+vy*dt;
    if(WATER[(y|0)*WW+(nx|0)])x=nx;else vx=-vx*.5;
    if(WATER[(ny|0)*WW+(x|0)])y=ny;else vy=-vy*.5;
    ROT[i]+=(ph-.5)*.5*dt+vx*.004;
    LX[i]=x;LY[i]=y;VX[i]=vx;VY[i]=vy;
    const w=WATER[(y|0)*WW+(x|0)];if(w)POOLS[w-1].cnt++;
  }
}
// A (and D, only when pulled back): a moving head scoops up ground leaves it passes over, and they ride in the tines
// until dumped. B and C: while the tines are down they shove what they meet the way the head moves, so leaves bank
// up against them (a thicker bank the more there are) and stay put wherever the stroke ends
// The rake is an extension of the player: anything the player can't walk through, its head can't go through either.
// These are the solids near one player (fences, houses, cars, shrubs and street cars, plus tree trunks, pots and the truck)
function rakeSolids(pl){
  const x=pl.P.x,y=pl.P.y,R=RAKE_REACH+RAKE_WIDTHS[RAKE_WIDTHS.length-1]+16,box=[],disc=[];
  for(const w of WALLS)if(w.x1>x-R&&w.x0<x+R&&w.y1>y-R&&w.y0<y+R)box.push(w);
  for(const t of TREES)if(Math.abs(t.x-x)<R&&Math.abs(t.y-y)<R)disc.push([t.x,t.y,25]);
  const pots=POTS.filter(p=>!p.broken&&Math.abs(p.x-x)<R&&Math.abs(p.y-y)<R);
  return{box,disc,pots,truck:Math.abs(TR.x-x)<R+TRUCK_HL&&Math.abs(TR.y-y)<R+TRUCK_HL};
}
function rakeHit(S,x,y,noPots){
  if(x<1||y<1||x>=WORLD_W-1||y>=H-1||REG[(y|0)*WORLD_W+(x|0)]===0)return true;
  for(const w of S.box)if(x>=w.x0&&x<w.x1&&y>=w.y0&&y<w.y1)return true;
  for(const c of S.disc){const dx=x-c[0],dy=y-c[1];if(dx*dx+dy*dy<c[2])return true;}
  if(!noPots)for(const p of S.pots){const dx=x-p.x,dy=y-p.y;if(dx*dx+dy*dy<p.r*p.r)return true;}
  if(S.truck){const [lx,ly]=toTruck(x,y);if(Math.abs(lx)<TRUCK_HL&&Math.abs(ly)<TRUCK_HW)return true;}
  return false;
}
// the furthest point from (x0,y0) toward (x1,y1) before anything solid (a 1px march)
function rakeReachPt(S,x0,y0,x1,y1){
  const n=Math.ceil(Math.hypot(x1-x0,y1-y0));let px=x0,py=y0;
  for(let k=1;k<=n;k++){const t=k/n,x=x0+(x1-x0)*t,y=y0+(y1-y0)*t;if(rakeHit(S,x,y))return[px,py];px=x;py=y;}
  return[px,py];
}
// Pulled back, a moving head scoops up the ground leaves it passes over and they ride in its teeth until dumped.
// Pushed forward it nudges leaves a little and passes over them, or with the Rake Shovel shoves what it meets along
// in a bank in front of it (a thicker bank the more there are), which stays put wherever the stroke ends
function updateRakes(dt){
  const R=[];
  for(const pl of players){const k=pl.rake;
    if(!pl.raking||!onFoot(pl)){k.prev=k.fprev=null;k.contact=0;k.load=0;continue;}
    const ax=pl.aim.x,ay=pl.aim.y,tx=-ay,ty=ax,hw=rakeHW(pl),S=rakeSolids(pl),reach=RAKE_REACH;
    // the head reaches out from the player's body and stops short of the first solid thing; then its tines reach out
    // each side of the handle, as far as they can before they'd poke into something
    const headAt=noPots=>{for(let d=3;d<=reach+1;d++){const q=Math.min(d,reach),x=pl.P.x+ax*q,y=pl.P.y+ay*q;if(rakeHit(S,x,y,noPots)||rakeHit(S,x+ax,y+ay,noPots))return Math.min(reach,Math.max(2,d-1));}return reach;};
    const eff=headAt(false),hx=pl.P.x+ax*eff,hy=pl.P.y+ay*eff;
    // flowerpots stop the head too, but where it would have gone without them is what hits the pot: knocked into one
    // at walking speed, it breaks; a gentle bump only wobbles it, and scraping along one wears it down
    {const ef=S.pots.length?headAt(true):eff,fx=pl.P.x+ax*ef,fy=pl.P.y+ay*ef,fp=k.fprev||[fx,fy],fsp=dt>0?Math.hypot(fx-fp[0],fy-fp[1])/dt:0;k.fprev=[fx,fy];
      for(const p of S.pots){const dx=p.x-fx,dy=p.y-fy,v=clamp(dx*tx+dy*ty,-hw,hw),ex=dx-tx*v,ey=dy-ty*v,key='rtouch'+pl.i,touch=ex*ex+ey*ey<(p.r+.8)*(p.r+.8);
        if(touch){
          if(!p[key]&&fsp>12){p.stress+=Math.max(0,fsp-15)/45;p.wob=Math.min(1,fsp/45);blip(820+rnd()*200,.04,'square',.03);}
          else if(fsp>4){p.stress+=fsp*dt*.02;p.wob=Math.max(p.wob,.25);}
          if(p.stress>=1)withPl(pl,()=>breakPot(p));}
        p[key]=touch;}}
    let vL=0,vR=0;for(let v=1;v<=hw;v++){if(rakeHit(S,hx-tx*v,hy-ty*v))break;vL=-v;}for(let v=1;v<=hw;v++){if(rakeHit(S,hx+tx*v,hy+ty*v))break;vR=v;}
    if(vL===-Math.floor(hw))vL=-hw;if(vR===Math.floor(hw))vR=hw;
    k.eff=eff;k.vL=vL;k.vR=vR;
    const pv=k.prev||[hx,hy],mx=hx-pv[0],my=hy-pv[1];
    k.prev=[hx,hy];k.hx=hx;k.hy=hy;
    if(k.drop&&Math.hypot(hx-k.drop.x,hy-k.drop.y)>k.drop.r+hw)k.drop=null;
    const ml=Math.hypot(mx,my),mu=mx*ax+my*ay;
    R.push({pl,k,S,idx:players.indexOf(pl),hx,hy,mx,my,mu,mv:mx*tx+my*ty,hsp:dt>0?ml/dt:0,ax,ay,tx,ty,vL,vR,M:hw+12,cap:rakeCap(pl),n:0,nudge:0,
      pulling:mu<-.3*ml,shoving:rakeShoves(pl)&&mu>.02&&mu>=-.3*ml});
  }
  rustleRake=0;if(!R.length)return;
  for(let i=0;i<N;i++){
    const st=ST[i];
    // carried leaves sit in the teeth, across whatever part of the head is clear
    if(st===5){const r=R.find(r=>r.idx===UN[i]);if(r){const ph=PH[i],v=r.vL+.5+ph*Math.max(0,r.vR-r.vL-1),u=-1-((ph*13.7)%1)*Math.min(4,1+r.pl.rakeN/14);
      LX[i]=r.hx+r.tx*v+r.ax*u;LY[i]=r.hy+r.ty*v+r.ay*u;LZ[i]=0;ROT[i]+=(ph-.5)*r.hsp*.02*dt;}continue;}
    if(st!==0||LZ[i]>2)continue;
    const x=LX[i],y=LY[i];
    for(let q=0;q<R.length;q++){const r=R[q],dx=x-r.hx,dy=y-r.hy,M=r.M;
      if(dx<-M||dx>M||dy<-M||dy>M)continue;
      const v=dx*r.tx+dy*r.ty;if(v<r.vL-.5||v>r.vR+.5)continue;
      const u=dx*r.ax+dy*r.ay,k=r.k;
      if(r.shoving){
        // only what the tines just swept over, or what's banked up against them (how deep this one sits in the bank)
        const mu=r.mu,depth=RAKE_GAP+PH[i]*(1.2+Math.min(5,k.contact/14));
        if(u<-(mu+.8)||u>=depth)continue;
        // nothing gets shoved through a fence: a leaf on the far side of something solid is out of reach, and a shoved
        // one stops against whatever's in its way
        const bx=r.hx+r.tx*v,by=r.hy+r.ty*v;
        if(u>.5){const [qx,qy]=rakeReachPt(r.S,bx,by,x,y);if(Math.abs(qx-x)+Math.abs(qy-y)>.01)continue;}
        r.n++;UR[HOME[i]]=1;const nv=clamp(v+r.mv*.6,r.vL,r.vR),cx=r.hx+r.tx*nv,cy=r.hy+r.ty*nv;
        [LX[i],LY[i]]=rakeReachPt(r.S,cx,cy,cx+r.ax*depth,cy+r.ay*depth);
        if(dt>0){VX[i]=r.mx/dt*.2;VY[i]=r.my/dt*.2;}VR[i]+=(PH[i]-.5)*4;
        break;
      }
      // the scoop band: on the pull, just the player's side of the crossbar plus the strip it swept over this frame
      // (which never reaches out as far as a shoved bank). Nothing sticks in the no-stick zone left by a dump
      if(u<-2.5||u>(r.pulling?Math.min(1.7,-r.mu+.4):2.5)||(k.drop&&Math.hypot(x-k.drop.x,y-k.drop.y)<k.drop.r))continue;
      // going forward (or across): the tines only nudge the leaf a little the way they're moving, then pass over it
      if(!r.pulling){
        if(r.hsp>8){r.nudge++;UR[HOME[i]]=1;LX[i]+=r.mx*.35;LY[i]+=r.my*.35;if(dt>0){VX[i]=r.mx/dt*.15;VY[i]=r.my/dt*.15;}VR[i]+=(PH[i]-.5)*3;}
        continue;}
      if(r.hsp<14)continue;
      if(r.pl.rakeN<r.cap){ST[i]=5;UN[i]=r.idx;r.pl.rakeN++;UR[HOME[i]]=1;r.nudge+=3;VX[i]=VY[i]=VZ[i]=0;statsT=1;
        // a full rake counts toward the fill goal (at most once every few seconds each, so it's fresh leaves)
        if(r.pl.rakeN>=r.cap&&time-(r.pl.fillT??-99)>5){r.pl.fillT=time;goalAdd('fill10',1);}
        break;}
      if(time-k.fullT>2){k.fullT=time;blip(150,.15,'sawtooth',.04,90);withPl(r.pl,()=>rumble(.3,.2,150));}
    }
  }
  // what the rake is hauling, as a share of a full one: carried leaves plus what it's shoving (eased, since the
  // shoved count jumps about from frame to frame). It slows the walk
  for(const r of R){const k=r.k;k.contact=r.n;if(r.shoving&&r.n)goalBest('push200',r.n);const want=(r.pl.rakeN+r.n*((r.pl.upg.rakeshovel||0)>1?RAKE_SHOVE_EASE:1))/r.cap;
    k.load+=(want-k.load)*Math.min(1,dt*(want>k.load?6:2.5));
    // rustle: what it's shoving or brushing over, plus a little for what it carries, all while the head is moving
    rustleRake+=Math.min(1,r.hsp/30)*(r.n+r.nudge+r.pl.rakeN*.2);}
}
// pots crack from a hard bump or from being blasted too hard for too long
function updatePots(dt){
  const B=blowers(.05).map(pl=>({pl,bp:withPl(pl,()=>blowParams(pl.power))}));
  for(const p of POTS){
    if(p.broken)continue;
    if(p.wob>0)p.wob=Math.max(0,p.wob-dt*2.5);
    let add=0,by=null;
    for(const {pl,bp} of B)for(const b of blCones(pl)){const dx=p.x-b.nx,dy=(p.y-3)-b.ny;
      if(dx>-b.range&&dx<b.range&&dy>-b.range&&dy<b.range){const d=Math.hypot(dx,dy);
        if(d<b.range&&d>.01){const c=(dx*b.ax+dy*b.ay)/d;if(c>b.cosH){const f=bp.F*(1-d/b.range)*(.3+.7*(c-b.cosH)/(1-b.cosH));const a=Math.max(0,f-250)*.003*(p.big?.75:1);if(a>0){add+=a;by=pl;}}}}}
    if(add>0)p.stress+=add*dt;else p.stress=Math.max(0,p.stress-.25*dt);
    for(const pl of players){if(!onFoot(pl))continue;const Q=pl.P,dx=p.x-Q.x,dy=p.y-Q.y,key='touch'+pl.i;
      const touching=Math.abs(dx)<12&&Math.abs(dy)<12&&Math.hypot(dx,dy)<p.r+6;
      if(touching&&!p[key]){const ap=(Q.vx*dx+Q.vy*dy)/(Math.hypot(dx,dy)||1);
        if(ap>12){p.stress+=Math.max(0,ap-20)/55;p.wob=Math.min(1,ap/45);by=pl;blip(820+rnd()*200,.04,'square',.03);}}
      p[key]=touching;}
    if(p.stress>=1)withPl(by||cur,()=>breakPot(p));
  }
}
let streakAcc=0;
function updateParticles(dt){
  for(const pl of blowers(.05))withPl(pl,()=>{
    pl.streakAcc=(pl.streakAcc||0)+power*70*dt;const half=Math.acos(bl.cosH),base=Math.atan2(aim.y,aim.x);
    while(pl.streakAcc>=1){pl.streakAcc--;const a=base+(rnd()*2-1)*half*.8,sp=(120+rnd()*120)*(.6+power*.4)*Math.sqrt(att().range),l=.18+rnd()*.22*power;
      streaks.push({x:bl.nx,y:bl.ny,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,l,m:l,v:bl.vort,tx:bl.tx,ty:bl.ty,sw:rnd()<.5?1:-1});
      if(pl.bl2){const b2=pl.bl2,a2=a+Math.PI;streaks.push({x:b2.nx,y:b2.ny,vx:Math.cos(a2)*sp,vy:Math.sin(a2)*sp,l,m:l,v:false,sw:1});}}
  });
  const k=Math.exp(-2.5*dt);
  for(let i=streaks.length-1;i>=0;i--){const s=streaks[i];
    if(s.v){const qx=s.tx-s.x,qy=s.ty-s.y,qd=Math.hypot(qx,qy)||1;s.vx+=(qx/qd*300-qy/qd*260*s.sw)*dt;s.vy+=(qy/qd*300+qx/qd*260*s.sw)*dt;}
    s.x+=s.vx*dt;s.y+=s.vy*dt;s.vx*=k;s.vy*=k;s.l-=dt;if(s.l<=0)streaks.splice(i,1);}
  for(let i=sparks.length-1;i>=0;i--){const s=sparks[i];s.x+=s.vx*dt;s.y+=s.vy*dt;s.z+=s.vz*dt;s.vz-=140*dt;if(s.z<0){s.z=0;s.vz*=-.4;}s.l-=dt;if(s.l<=0)sparks.splice(i,1);}
  if(players.some(pl=>pl.driving)&&Math.abs(TR.v)>5&&rnd()<.5){const [bx,by]=fromTruck(-TRUCK_HL-2,TRUCK_HW-4),[c,s]=tdir();puffs.push({x:bx,y:by,vx:-c*10+(rnd()-.5)*8,vy:-s*10-4-rnd()*6,l:.8,m:.8});}
  for(let i=puffs.length-1;i>=0;i--){const s=puffs[i];s.x+=s.vx*dt;s.y+=s.vy*dt;s.l-=dt;if(s.l<=0)puffs.splice(i,1);}
}
