'use strict';
// ============================================================ input
const modalEl=document.getElementById('modal'),titleEl=document.getElementById('title');
addEventListener('keydown',e=>{
  // (Enter during play is the keyboard's join button, so it doesn't pull a controller player onto the keyboard)
  if(!(e.code==='Enter'&&state==='play')&&!kbClaim())setInputMode('kbm');
  if(e.repeat&&(e.code==='KeyE'||e.code==='KeyQ'))return;
  keys[e.code]=true;
  if(e.code.startsWith('Arrow')||e.code==='Space'||e.code==='Tab')e.preventDefault();
  if(state==='play'&&NET.role==='guest'){
    // on the guest, actions go to the host
    if(e.code==='Escape'){openMenu(false,cur);return;}
    if(e.repeat)return;if(e.code==='KeyG'){toggleGoals();return;}const m={KeyE:'use',KeyQ:'tarp',KeyR:'rake',Space:'honk',KeyN:'end'}[e.code];if(m)NET.evOut.push(m);
    const d=/^Digit([1-9])$/.exec(e.code);if(d)NET.evOut.push('eq:'+(+d[1]-1));return;
  }
  if(state==='joinpad'){const d=/^Digit(\d)$|^Numpad(\d)$/.exec(e.code);if(d)kpPress(d[1]||d[2]);else if(e.code==='Backspace')kpPress('<');else if(e.code==='Enter')kpPress('>');else if(e.code==='Escape')closeKeypad();return;}
  if(state==='play'){
    const pl=kbmPl();
    if(e.code==='Escape'){openMenu(false,pl||players[0]);return;}
    if(e.code==='Enter'&&!e.repeat)enterDownAt=performance.now();
    if(e.code==='KeyG'&&!e.repeat)toggleGoals();
    if(pl)withPl(pl,()=>{
      if(e.code==='KeyE')interact();
      if(e.code==='KeyQ')tarpAction();
      if(e.code==='KeyR'&&!e.repeat)toggleRake();
      if(e.code==='Space'&&driving)honk();
      if(e.code==='KeyN'&&driving)endDay();
      const m=/^Digit([1-9])$/.exec(e.code);if(m){const list=ATT.filter(a=>owned.includes(a.id));const a=list[+m[1]-1];if(a)equip(a.id);}
    });
  }else if(state==='menu'){
    if(e.code==='Escape')menuBack();else if(menuFirst&&(e.code==='Enter'||e.code==='Space'))closeMenu();
  }else if(state==='tut'){
    if(e.code==='Escape'||e.code==='Enter'||e.code==='Space')tutModalOk();
  }else if(state==='closeout'){
    if(e.code==='KeyE'||e.code==='Enter')confirmCloseout();
    if(e.code==='Escape')closeModal();
  }else if(state==='shop'){
    if(e.code==='Enter')startDay();
    if(e.code==='Tab'||e.code==='Digit1'||e.code==='Digit2'){nightTab=e.code==='Digit1'?'sum':e.code==='Digit2'?'shop':(nightTab==='sum'?'shop':'sum');renderNight();}
  }
});
addEventListener('keyup',e=>{keys[e.code]=false;if(e.code==='Enter')enterDownAt=0;});
// whoever is on the keyboard and mouse: the lone player, or whichever co-op player joined on it
const kbmPl=()=>autoPl();
function kbClaim(){const w=waitPl(),a=autoPl();if(w&&a&&a.autoMode==='pad'&&state==='play'){a.dev={t:'pad',i:a.autoPad};w.dev={t:'auto'};w.autoMode='kbm';w.autoPad=-1;padToast('PLAYER 2 IS ON THE KEYBOARD');return true;}return false;}
let enterDownAt=0;
addEventListener('mousemove',e=>{mouse.x=e.clientX;mouse.y=e.clientY;if(Math.abs(e.movementX)+Math.abs(e.movementY)>2)setInputMode('kbm');});
addEventListener('mousedown',e=>{if(!kbClaim())setInputMode('kbm');if(state!=='play')return;if(e.button===0)mouse.l=true;if(e.button===2)mouse.r=true;ensureAudio();});
addEventListener('mouseup',e=>{if(e.button===0)mouse.l=false;if(e.button===2)mouse.r=false;});
// scroll to swap nozzles. Trackpads and smooth-scrolling mice send a stream of tiny events (and keep going with
// momentum), so a light brush used to flick through several nozzles. Now the first step of a gesture comes easily,
// then each further step takes a good stretch of scrolling and a short gap. A gesture ends after a quiet spell
const wheelG={acc:0,last:0,lastStep:0,steps:0};
function wheelStep(e){
  const now=performance.now();if(now-wheelG.last>WHEEL_GAP){wheelG.acc=0;wheelG.steps=0;}wheelG.last=now;
  if(Math.abs(e.deltaX)>Math.abs(e.deltaY))return 0;
  wheelG.acc+=e.deltaMode?e.deltaY*16:e.deltaY;
  if(Math.abs(wheelG.acc)<(wheelG.steps?WHEEL_STEP:WHEEL_MIN)||now-wheelG.lastStep<WHEEL_RATE)return 0;
  const d=wheelG.acc>0?1:-1;wheelG.acc=0;wheelG.steps++;wheelG.lastStep=now;return d;
}
// quiet gap that ends a gesture (ms), scroll needed for the first step and for each one after, least time between steps
const WHEEL_GAP=180,WHEEL_MIN=4,WHEEL_STEP=100,WHEEL_RATE=45;
addEventListener('wheel',e=>{if(state!=='play')return;const d=wheelStep(e);if(!d)return;if(NET.role==='guest'){NET.evOut.push(d>0?'next':'prev');return;}if(!kbmPl())return;withPl(kbmPl(),()=>cycleNozzle(d));},{passive:true});
addEventListener('contextmenu',e=>e.preventDefault());
addEventListener('blur',()=>{for(const k in keys)keys[k]=false;dropInputs();});
document.getElementById('logo').innerHTML=[...'RAKING IT IN'].map((ch,i)=>ch===' '?'<span style="width:.5em"></span>':`<span style="animation-delay:${-i*.18}s">${ch}</span>`).join('');
document.body.style.cursor='default';
function equip(id){if(equipped===id)return;equipped=id;rumble(0,.25,45);const a=att();floatText(P.x,P.y-16,a.name,a.tip);blip(700,.05,'square',.05);setTimeout(()=>blip(900,.05,'square',.04),50);for(const v of views)v.cache.hot=null;}

// ============================================================ save
const SAVE_KEY='leafblower-save-v3';
function save(){if(TUT.on)return;try{const p1=players[0],p2=players[1];if(cur===p1)storePl();
  const prof=p2?{money:p2.money,upg:p2.upg,owned:p2.owned,equipped:p2.equipped}:p2Profile;
  localStorage.setItem(SAVE_KEY,JSON.stringify({money:p1.money,day,rep,upg:p1.upg,owned:p1.owned,equipped:p1.equipped,p2:prof||null,goals:goalsSave()}));}catch(e){}}
function loadSave(){try{const s=JSON.parse(localStorage.getItem(SAVE_KEY));if(s&&typeof s.money==='number')return s;}catch(e){}return null;}
function setupTitle(){
  const s=loadSave(),b=document.getElementById('titleBtns');
  b.innerHTML='';
  const mkb=(txt,cls,fn)=>{const el=document.createElement('button');el.className='btn '+cls;el.textContent=txt;el.onclick=e=>{e.stopPropagation();fn();};b.appendChild(el);};
  if(s){mkb(`CONTINUE - DAY ${s.day}`,'bounce',()=>{money=s.money;day=s.day;rep=s.rep||0;upg=clampUpg({...upg,...s.upg});owned=s.owned||['std'];equipped=s.equipped||'std';p2Profile=s.p2||null;goalsLoad(s.goals);beginGame();});mkb('NEW GAME','red',()=>{try{localStorage.removeItem(SAVE_KEY);}catch(e){}money=0;rep=0;day=1;goalsLoad(null);beginGame(true);});}
  else mkb('START DAY 1','bounce',()=>{goalsLoad(null);beginGame(true);});
  mkb('TUTORIAL','',()=>{location.hash='tutorial';location.reload();});
  mkb('JOIN ONLINE','',openKeypad);
}
function beginGame(fresh){titleEl.classList.add('hide');ensureAudio();resetDay();state='play';document.body.style.cursor='none';if(fresh===true)openMenu(true);}
