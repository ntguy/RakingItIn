'use strict';
// ============================================================ boot
buildLots();buildBackground();buildTruck();buildTrafficSprites();buildTrafficPath();buildMail();initTrees();resize();
N=0;for(const L of LOTS)spawnLot(L);
today=newToday();
{const [x,y]=fromTruck(SPAWN_AT,-(TRUCK_HW+8));P.x=x;P.y=y;}
camX=clamp(P.x-VW/2,0,WORLD_W-VW);camY=clamp(P.y-VH/2,0,H-VH);
{const p1=newPlayer(0,{t:'auto'});p1.P=P;p1.aim=aim;p1.money=money;p1.upg=upg;p1.owned=owned;p1.equipped=equipped;players.push(p1);usePl(p1);views[0].pl=p1;p1.view=views[0];p1.cam.x=camX;p1.cam.y=camY;}
if(TUTORIAL)startTutorial();else setupTitle();
if(location.hash.startsWith('#join=')){const c=location.hash.slice(6).replace(/\D/g,'').slice(0,6);if(c.length===6){openKeypad();kpCode=c;kpShow();startJoin(c);}}
let last=performance.now();
// holding Enter for a moment while player 1 is on a controller drops a second player in on the keyboard
function joinByKeyboard(){if(enterDownAt&&state==='play'&&performance.now()-enterDownAt>800&&canJoinWith({t:'kbm'})){enterDownAt=0;joinPlayer({t:'kbm'});}}
function frame(now){
  let dt=(now-last)/1000;last=now;if(dt>1/20)dt=1/20;if(dt<=0)dt=1/240;const t0=performance.now();
  if(NET.role==='guest'){storePl();pollPad();if(state!=='play'||NET.localMenu)padInput(dt);guestFrame(dt);render();updateHUD(dt);updateFx(dt);updateAudio();updateRumble();perfFrame(now,performance.now()-t0);requestAnimationFrame(frame);return;}
  storePl();pollPad();padInput(dt);joinByKeyboard();
  if(state==='play')update(dt);else{time+=dt;power=0;mode=0;}
  netHostTick(dt);
  render();updateHUD(dt);updateFx(dt);updateAudio();updateRumble();
  perfFrame(now,performance.now()-t0);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
