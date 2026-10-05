'use strict';
// ============================================================ update
let lastEmptyBuzz=0,wasEmpty=false;
function update(dt){
  time+=dt;
  if(!TUT.on)hour+=dt*(DAY_END-DAY_START)/DAY_SECONDS;
  if(hour>=DAY_END){hour=DAY_END;endDay();return;}
  for(const pl of players){usePl(pl);viewIn(pl);updatePlayer(dt);storePl();}
  usePl(players[0]);
  if(players[0].upg.solar>0){const k=SOLAR_RATE*sunAt(hour)*dt*(DAY_END-DAY_START)/DAY_SECONDS;if(k>0)for(let i=0;i<bed.length;i++)bed[i]=Math.min(1,bed[i]+k);}
  if(crashShake>0)crashShake=Math.max(0,crashShake-dt);for(const c of CARS)if(c.jolt>0)c.jolt-=dt;
  if(TUT.on){}else{
  if(!today.mailSent&&hour>=9){today.mailSent=true;spawnTraffic('mail');}
  if(!today.copSent&&hour>=today.copHour){today.copSent=true;spawnTraffic('cop');}
  if(!today.vanSent&&hour>=today.vanHour){today.vanSent=true;spawnTraffic('van');}
  if(hour>=today.carHour){today.carHour=hour+.6+rnd()*.8;if(hour<20.5)spawnTraffic('car');}}
  updateTraffic(dt);updateCritters(dt);
  updateRakes(dt);updateLeaves(dt);updatePool(dt);updatePots(dt);updateTarps(dt);updateTrees(dt);updateParticles(dt);updatePeds(dt);
  for(const pl of players){usePl(pl);viewIn(pl);updateCamera(dt);viewOut(pl);storePl();}
  usePl(players[0]);
  if(!TUT.on)goalsTick(dt);
  tutUpdate(dt);
}
// one player's own movement, aim, blower and battery
function updatePlayer(dt){
  // a passenger just rides along in the cab
  if(cur.riding){const [x,y]=fromTruck(2,TRUCK_HW-5);P.x=x;P.y=y;P.vx=P.vy=0;power=0;mode=0;return;}
  let ix=0,iy=0;
  const usesKeys=cur.dev.t==='auto',ni=cur.dev.t==='net'?NET.in:null;
  if(usesKeys){if(keys.KeyA||keys.ArrowLeft)ix--;if(keys.KeyD||keys.ArrowRight)ix++;if(keys.KeyW||keys.ArrowUp)iy--;if(keys.KeyS||keys.ArrowDown)iy++;}
  ix+=pad.lx;iy+=pad.ly;
  if(ni){ix=ni.mx;iy=ni.my;}
  if(tieT>0)tieT-=dt;
  // in the truck: R2 is gas, L2 is reverse and the stick only steers (keys still use W/S)
  if(driving){if(ni)iy=ni.th;else if(usesKeys){iy=0;if(keys.KeyW||keys.ArrowUp)iy--;if(keys.KeyS||keys.ArrowDown)iy++;}else iy=0;if(!ni&&!pad.lock)iy+=pad.lt-pad.rt;updateTruck(dt,clamp(ix,-1,1),clamp(iy,-1,1));}
  else{
    const il=Math.hypot(ix,iy)||1,im=Math.min(1,Math.hypot(ix,iy)),carry=bundle?1-Math.min(.35,bundle.total/1800):1,wade=wet(P.x,P.y)?.6:1,spd=(swapT>0||tieT>0)?0:78*moveMul()*carry*wade*rakeSpeed(cur);
    const acc=Math.min(1,dt*14);P.vx+=(ix/il*im*spd-P.vx)*acc;P.vy+=(iy/il*im*spd-P.vy)*acc;
    const ox=P.x,oy=P.y;P.x+=P.vx*dt;if(!walkable(P.x,P.y))P.x=ox;P.y+=P.vy*dt;if(!walkable(P.x,P.y))P.y=oy;collidePlayer();
    const sp=Math.hypot(P.vx,P.vy);if(sp>8)P.walk+=dt*sp*.16;
  }
  if(ni){const k=Math.min(1,dt*20);aim.x+=(ni.ax-aim.x)*k;aim.y+=(ni.ay-aim.y)*k;const n=Math.hypot(aim.x,aim.y)||1;aim.x/=n;aim.y/=n;}
  else if(inputMode==='pad'){
    // the right stick turns the player; let go and they keep facing that way
    const m=Math.hypot(pad.rx,pad.ry);
    if(m>.3){let a=Math.atan2(aim.y,aim.x);const d=((Math.atan2(pad.ry,pad.rx)-a)%(Math.PI*2)+Math.PI*3)%(Math.PI*2)-Math.PI;a+=d*Math.min(1,dt*(10+m*14));aim.x=Math.cos(a);aim.y=Math.sin(a);}
  }else if(usesKeys){
    const [mwx,mwy]=mouseWorld();
    const adx=mwx-P.x,ady=mwy-(P.y-3),al=Math.hypot(adx,ady);
    if(al>4){const nx=adx/al,ny=ady/al,k=Math.min(1,dt*25);aim.x+=(nx-aim.x)*k;aim.y+=(ny-aim.y)*k;const n=Math.hypot(aim.x,aim.y)||1;aim.x/=n;aim.y/=n;}
  }
  if(swapT>0){swapT-=dt;if(swapT<=0){swapT=0;swapBattery();blip(523,.1,'square',.06);setTimeout(()=>blip(784,.18,'square',.06),90);rumble(.2,.5,120);
    for(let k=0;k<22;k++){const a=rnd()*Math.PI*2,s=30+rnd()*50;sparks.push({x:P.x,y:P.y,z:10,vx:Math.cos(a)*s,vy:Math.sin(a)*s*.7,vz:60+rnd()*60,l:.6+rnd()*.5,c:rnd()<.5?'#4bc26a':'#b8ffcf'});}}}
  let want=0;if(!driving&&!bundle&&!heldNet&&!carryPkg&&!cur.raking&&swapT<=0&&tieT<=0&&tutOk('blowLo')){if((usesKeys&&mouse.r)||(!pad.lock&&pad.rt>.3)||(ni&&ni.hi))want=2;else if((usesKeys&&mouse.l)||(!pad.lock&&pad.lt>.3)||(ni&&ni.lo))want=1;}
  if(want===2&&!tutOk('blowHi'))want=0;
  if(want&&battery<=0){want=0;if(time-lastEmptyBuzz>.45){lastEmptyBuzz=time;rumble(.25,0,60);blip(110,.12,'sawtooth',.05,70);}}
  mode=want;if(mode)cur.lastMode=mode;
  if(mode===2&&hour>=LATE_HOUR)today.lateHigh+=dt;
  let target=mode;const bpct=battery/capacity();
  if(mode&&bpct<.12)target*=.55+.45*(Math.sin(time*37)>-.2?1:0);
  power+=(target-power)*Math.min(1,dt*(target>power?6:9));if(power<.005)power=0;
  if(mode){const use=Math.min(battery,drainRate(mode)*dt);if(use>0)goalAdd('batt3',use/capacity());battery-=drainRate(mode)*dt;if(battery<=0){battery=0;if(!wasEmpty){blip(440,.5,'square',.06,90);rumble(.7,.4,350);}}}
  wasEmpty=battery<=0;
  // the vortex nozzle swirls leaves to a point: where the mouse is, or on a controller as far out as the right stick
  // is pushed (an online friend sends theirs)
  if(att().vortex){const f=ni?ni.vf??.55:inputMode==='pad'||cur.dev.t==='pad'?padVortexF(cur,pad):mouseVortexF();setVortex(f);}
}
// How far out the vortex point sits, as a share f of its span: from VORT_NEAR px past the nozzle out to 85% of the air's
// reach at full high speed. vortexAim is where it's aimed (the controller's crosshair sits there); vortexD is where the
// air actually swirls to, pulled in when the blower isn't running hard enough to reach that far
const VORT_NEAR=12;
const vortexSpan=p=>Math.max(VORT_NEAR+1,blowParams(p).R*.85);
function setVortex(f){const a=VORT_NEAR+clamp(f,0,1)*(vortexSpan(2)-VORT_NEAR);cur.vortexAim=a;cur.vortexD=Math.min(a,vortexSpan(Math.max(power,.01)));}
// the right stick pushed to its edge puts it at its furthest, a light push keeps it close; let go and it stays put
function padVortexF(pl,p){const m=Math.hypot(p.rx,p.ry);if(m>.15)pl.vortexF=clamp((m-.15)/.8,0,1);return pl.vortexF??.55;}
function mouseVortexF(){const [mwx,mwy]=mouseWorld(),tube=att().tube,d=Math.hypot(mwx-(P.x+aim.x*tube),mwy-(P.y+aim.y*tube)),sp=vortexSpan(2);return(clamp(d,VORT_NEAR,sp)-VORT_NEAR)/(sp-VORT_NEAR);}
// follow this player (or the truck they're in), looking a little ahead
function updateCamera(dt){
  const [c,s]=tdir();
  // look ahead toward the mouse's screen offset, not its world position: that moves with the camera and never settles.
  // On a controller, look the way the player faces
  const gp=inputMode==='pad'||cur.dev.t==='pad',[mox,moy]=mouseOff(),lx=gp?aim.x*120:mox,ly=gp?aim.y*120:moy;
  const inTruck=driving||cur.riding,fx=inTruck?TR.x+c*TR.v*.5:P.x+clamp(lx*.25,-60,60),fy=inTruck?TR.y-30+s*TR.v*.35:P.y+clamp(ly*.25,-40,40);
  const ck=Math.min(1,dt*(inTruck?4:8));camX+=(fx-VW/2-camX)*ck;camY+=(fy-VH/2-camY)*ck;
  camX=VW>=WORLD_W?(WORLD_W-VW)/2:clamp(camX,0,WORLD_W-VW);camY=VH>=H?(H-VH)/2:clamp(camY,0,H-VH);
}
