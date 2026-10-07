'use strict';
// ============================================================ audio
let AC=null,nGain,nFilt,mOsc,mGain,eOsc,eGain,master,sfxBus,musicBus,noiseBuf,rGain,rFilt,eng=null;
// leaf rustle: how many leaves slid along the ground near a player this frame, and how much the rakes are hauling
let rustleLeaves=0,rustleRake=0,rustleLvl=0;
// volume settings (0..1), kept in the browser
// sound effects: SFX_FULL on the slider plays at the game's normal loudness, and above it turns them up past that
const SFX_FULL=.7,sfxGain=()=>settings.sfx/SFX_FULL;
const SET_KEY='rakingitin-settings-v1',settings={music:.7,sfx:SFX_FULL,sv:2};
try{const j=JSON.parse(localStorage.getItem(SET_KEY)||localStorage.getItem('curbappeal-settings-v1'))||{};
  // settings saved before the slider was rescaled: keep the same loudness on the new scale
  if(!j.sv&&j.sfx!=null){j.sfx=Math.round(j.sfx*SFX_FULL*20)/20;j.sv=2;}Object.assign(settings,j);}catch(e){}
function saveSettings(){try{localStorage.setItem(SET_KEY,JSON.stringify(settings));}catch(e){}}
function applyVolumes(){if(!AC)return;const t=AC.currentTime;sfxBus.gain.setTargetAtTime(sfxGain(),t,.02);musicBus.gain.setTargetAtTime(settings.music,t,.02);}
function ensureAudio(){
  if(AC){if(AC.state==='suspended')AC.resume();return;}
  try{AC=new (window.AudioContext||window.webkitAudioContext)();}catch(e){return;}
  // (the whole mix sits 40% louder than it used to at the same slider settings)
  master=AC.createGain();master.gain.value=.98;master.connect(AC.destination);
  sfxBus=AC.createGain();sfxBus.gain.value=sfxGain();sfxBus.connect(master);musicBus=AC.createGain();musicBus.gain.value=settings.music;musicBus.connect(master);
  const len=AC.sampleRate*2,buf=AC.createBuffer(1,len,AC.sampleRate),d=buf.getChannelData(0);
  let b0=0,b1=0,b2=0;for(let i=0;i<len;i++){const w=Math.random()*2-1;b0=.99765*b0+w*.099;b1=.963*b1+w*.2965;b2=.57*b2+w*1.0526;d[i]=(b0+b1+b2+w*.1848)*.18;}
  noiseBuf=buf;const src=AC.createBufferSource();src.buffer=buf;src.loop=true;
  nFilt=AC.createBiquadFilter();nFilt.type='bandpass';nFilt.Q.value=.6;nFilt.frequency.value=600;
  const lp=AC.createBiquadFilter();lp.type='lowpass';lp.frequency.value=5000;
  nGain=AC.createGain();nGain.gain.value=0;src.connect(nFilt);nFilt.connect(lp);lp.connect(nGain);nGain.connect(sfxBus);src.start();
  mOsc=AC.createOscillator();mOsc.type='sawtooth';mOsc.frequency.value=80;
  const mLP=AC.createBiquadFilter();mLP.type='lowpass';mLP.frequency.value=500;
  mGain=AC.createGain();mGain.gain.value=0;
  const lfo=AC.createOscillator();lfo.frequency.value=9;const lg=AC.createGain();lg.gain.value=2.5;lfo.connect(lg);lg.connect(mOsc.frequency);lfo.start();
  mOsc.connect(mLP);mLP.connect(mGain);mGain.connect(sfxBus);mOsc.start();
  makeEngine();
  // leaf rustle: one looping buffer of leaf crinkles, faded up and down with how many leaves are moving. Each crinkle is
  // a short burst of noise with its own darkness, length and loudness (mostly small ticks, now and then a bigger
  // crunch) with gaps between them, over a faint soft bed, all swelling and easing like a breeze
  {const sr=AC.sampleRate,len=sr*4,rb=AC.createBuffer(1,len,sr),d=rb.getChannelData(0);
    const swell=i=>{const t=i/sr;return .5+.5*Math.sin(Math.PI*2*(t*.5+.3*Math.sin(Math.PI*2*t*.25)));};
    let lp=0;for(let i=0;i<len;i++){lp+=.28*(Math.random()*2-1-lp);d[i]=lp*.25*(.4+.6*swell(i));}
    for(let g=0;g<4*80;g++){const at=(Math.random()*len)|0,sw=swell(at);if(Math.random()>.35+.65*sw)continue;
      const n=((.01+Math.random()**2*.05)*sr)|0,amp=.12+Math.random()**3*.88,a=.35+Math.random()*.6,atk=sr*.0015;let y=0;
      for(let k=0;k<n;k++){y+=a*(Math.random()*2-1-y);const e=Math.min(1,k/atk)*Math.exp(-5*k/n);d[(at+k)%len]+=y*amp*e;}}
    let pk=0;for(let i=0;i<len;i++)pk=Math.max(pk,Math.abs(d[i]));for(let i=0;i<len;i++)d[i]*=.9/pk;
    const rs=AC.createBufferSource();rs.buffer=rb;rs.loop=true;
    const hp=AC.createBiquadFilter();hp.type='highpass';hp.frequency.value=500;
    rFilt=AC.createBiquadFilter();rFilt.type='lowpass';rFilt.frequency.value=1800;rFilt.Q.value=.5;
    rGain=AC.createGain();rGain.gain.value=0;rs.connect(hp);hp.connect(rFilt);rFilt.connect(rGain);rGain.connect(sfxBus);rs.start();}
}
// ============================================================ the truck's engine
// A lumpy little four-cylinder. A narrow pulse at the firing rate (its harmonics give each firing a thump), a saw an
// octave up for growl and a breath of exhaust noise all go through one loudness that wobbles at half the firing rate
// (so every other firing lands harder: the lope of an old engine at idle), then one lowpass that opens up as it revs.
// The firing rate wanders a little all the time so it never settles into a clean electric tone
// gears: [top speed, firing rate at the bottom of the gear, at the top] (Hz); changing up drops the revs
const GEARS=[[45,27,58],[95,38,62],[160,42,68]],ENG_VOL=.06;
function makeEngine(){
  const g=AC.createGain(),lp=AC.createBiquadFilter(),am=AC.createGain(),N=24,re=new Float32Array(N+1),im=new Float32Array(N+1);
  for(let n=1;n<=N;n++)re[n]=Math.sin(Math.PI*n*.18)/n;
  const pulse=AC.createOscillator();pulse.setPeriodicWave(AC.createPeriodicWave(re,im));pulse.frequency.value=27;
  const saw=AC.createOscillator();saw.type='sawtooth';saw.frequency.value=54;const sawG=AC.createGain();sawG.gain.value=.3;
  const ns=AC.createBufferSource();ns.buffer=noiseBuf;ns.loop=true;const nbp=AC.createBiquadFilter();nbp.type='bandpass';nbp.frequency.value=240;nbp.Q.value=.9;const nG=AC.createGain();nG.gain.value=.3;
  const lope=AC.createOscillator();lope.type='triangle';lope.frequency.value=13.5;const lopeG=AC.createGain();lopeG.gain.value=.35;
  am.gain.value=.65;lope.connect(lopeG);lopeG.connect(am.gain);
  lp.type='lowpass';lp.frequency.value=220;lp.Q.value=2.2;g.gain.value=0;
  pulse.connect(am);saw.connect(sawG);sawG.connect(am);ns.connect(nbp);nbp.connect(nG);nG.connect(am);am.connect(lp);lp.connect(g);g.connect(sfxBus);
  pulse.start();saw.start();ns.start();lope.start();
  eOsc=pulse;eGain=g;eng={pulse,saw,sawG,nG,lope,lopeG,lp,t:0,sp:0,load:0};
}
// the firing rate for a speed, in whichever gear that speed is in
function engineHz(sp){let lo=0;for(const [top,a,b] of GEARS){if(sp<top||top===GEARS[GEARS.length-1][0])return a+(b-a)*clamp((sp-lo)/(top-lo),0,1);lo=top;}}
function setEngine(t,on,sp,load){
  const e=eng,hz=engineHz(sp)+load*5,rev=clamp((hz-27)/41,0,1);
  e.pulse.frequency.setTargetAtTime(hz,t,.07);e.saw.frequency.setTargetAtTime(hz*2,t,.07);e.lope.frequency.setTargetAtTime(hz/2,t,.07);
  e.pulse.detune.setTargetAtTime((Math.random()-.5)*50,t,.03);e.lope.detune.setTargetAtTime((Math.random()-.5)*80,t,.05);
  // idling it lopes hard; revved up the firings smooth out
  e.lopeG.gain.setTargetAtTime(.35-rev*.2,t,.1);e.sawG.gain.setTargetAtTime(.25+rev*.25+load*.15,t,.1);e.nG.gain.setTargetAtTime(.25+load*.45+rev*.15,t,.1);
  e.lp.frequency.setTargetAtTime(200+rev*480+load*380,t,.08);
  eGain.gain.setTargetAtTime(on?ENG_VOL*(.7+rev*.35+load*.3):0,t,on?.1:.15);
}
function updateAudio(){
  updateMusic();if(!AC)return;const loud=players.reduce((m,pl)=>pl.power>m.power?pl:m,players[0]),t=AC.currentTime,p=state==='play'?loud.power:0,a=withPl(loud,att),tn=loud.upg.tune;
  const tone=a.id==='jet'?1.6:a.id==='fan'?.75:a.id==='long'?1.15:a.id==='vortex'?1.3:1;
  const bv=p<=1?BLOW_VOL_LO:BLOW_VOL_LO+(BLOW_VOL_HI-BLOW_VOL_LO)*Math.min(1,p-1);
  nGain.gain.setTargetAtTime((p*.16+(p>1?(p-1)*.12:0))*bv,t,.05);
  nFilt.frequency.setTargetAtTime((420+p*700+tn*80)*tone,t,.08);
  mOsc.frequency.setTargetAtTime(62+p*58+tn*8,t,.08);
  mGain.gain.setTargetAtTime(p>.02?(.03+p*.022)*bv:0,t,.05);
  // how hard the engine is working: read off how fast the truck is speeding up (so it works the same for an online
  // guest, who only gets the truck's speed)
  const sp=Math.abs(TR.v),edt=t-(eng.t||t);eng.t=t;
  if(edt>0){const acc=(sp-eng.sp)/edt;eng.sp=sp;eng.load+=(clamp(acc/110,0,1)-eng.load)*Math.min(1,edt*6);}
  setEngine(t,players.some(pl=>pl.driving)&&state==='play',sp,eng.load);
  // rustle: rises fast and falls slowly, and stays faint even under a big push of leaves
  const want=state==='play'?Math.min(1,rustleLeaves/RUSTLE_LEAVES+rustleRake/RUSTLE_RAKE):0;
  rustleLvl+=(want-rustleLvl)*(want>rustleLvl?.25:.06);
  rGain.gain.setTargetAtTime(RUSTLE_VOL*Math.pow(rustleLvl,.7),t,.08);rFilt.frequency.setTargetAtTime(3000+rustleLvl*1600,t,.15);
}
// ============================================================ music
// Streamed from the music folder, one track at a time: a different day track each day (shuffled, every one played
// before any repeats, remembered across sessions) and the evening track on the end-of-day and store screens. Tracks
// crossfade when they change. Silent on the title screen
const DAY_TRACKS=['apple_cider_loop','flowerbed_fields','hush_hamlet_loop','shepherd_dog','the_way_it_is'],NIGHT_TRACK='course_1_loop';
const MUSIC_KEY='rakingitin-music-v1',MUSIC_GAIN=.105,MUSIC_FADE=1;
const music={els:{},want:null,dayTrack:null,dayFor:null,last:0,retry:0};
function musicEl(id){let a=music.els[id];if(!a){a=new Audio(`music/${id}.m4a`);a.loop=true;a.preload='auto';a.volume=0;a.fade=0;music.els[id]=a;}return a;}
// the next day track from the shuffled bag, refilled (never starting with the track just played) when it runs out
function nextDayTrack(){
  let m={bag:[],last:null};try{m=Object.assign(m,JSON.parse(localStorage.getItem(MUSIC_KEY))||{});}catch(e){}
  m.bag=m.bag.filter(id=>DAY_TRACKS.includes(id));
  if(!m.bag.length){m.bag=DAY_TRACKS.slice();for(let i=m.bag.length-1;i>0;i--){const j=(Math.random()*(i+1))|0;[m.bag[i],m.bag[j]]=[m.bag[j],m.bag[i]];}
    if(m.bag.length>1&&m.bag[0]===m.last)m.bag.push(m.bag.shift());}
  const id=m.bag.shift();m.last=id;try{localStorage.setItem(MUSIC_KEY,JSON.stringify(m));}catch(e){}return id;
}
function updateMusic(){
  const now=performance.now(),dt=Math.min(.1,(now-(music.last||now))/1000);music.last=now;
  if(!AC)return;// (nothing can play before the first click or key press)
  let want=null;
  if(state==='shop')want=NIGHT_TRACK;
  else if(state!=='title'&&state!=='editor'&&state!=='joinpad'){
    // the tutorial gets a random track without using up the shuffle
    if(music.dayFor!==day){music.dayFor=day;music.dayTrack=TUT.on?DAY_TRACKS[(Math.random()*DAY_TRACKS.length)|0]:nextDayTrack();}
    want=music.dayTrack;}
  if(want!==music.want){music.want=want;if(want){const a=musicEl(want);if(a.paused&&a.fade<=0)a.currentTime=0;}}
  const vol=clamp(settings.music*MUSIC_GAIN,0,1);
  for(const id in music.els){const a=music.els[id],on=id===music.want;
    a.fade=clamp(a.fade+(on?dt:-dt)/MUSIC_FADE,0,1);a.volume=vol*a.fade;
    if(on&&a.paused&&now>music.retry){const pr=a.play();if(pr)pr.catch(()=>{music.retry=performance.now()+1000;});}
    else if(!on&&a.fade<=0&&!a.paused)a.pause();}
}
// leaves sliding (or raked) at once for a full rustle, and its loudness at full
// blower loudness at low and high speed
const BLOW_VOL_LO=.8,BLOW_VOL_HI=.65;
const RUSTLE_LEAVES=400,RUSTLE_RAKE=90,RUSTLE_VOL=.055;
// how loud a sound at (x,y) is for the nearest player: full up close, fading to nothing at HEAR_R
const HEAR_R=600;
function nearVol(x,y){let d=1e9;for(const pl of players){const px=pl.driving||pl.riding?TR.x:pl.P.x,py=pl.driving||pl.riding?TR.y:pl.P.y;d=Math.min(d,Math.hypot(x-px,y-py));}return d>=HEAR_R?0:1-d/HEAR_R;}
// a short burst of filtered noise, optionally sweeping its pitch
function noiseHit(f,q,dur,vol,delay=0,to){
  if(!AC||vol<=0)return;const t=AC.currentTime+delay,src=AC.createBufferSource(),bp=AC.createBiquadFilter(),g=AC.createGain();
  src.buffer=noiseBuf;bp.type='bandpass';bp.Q.value=q;bp.frequency.setValueAtTime(f,t);if(to)bp.frequency.exponentialRampToValueAtTime(to,t+dur);
  g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);src.connect(bp);bp.connect(g);g.connect(sfxBus);
  src.start(t,Math.random()*1.5);src.stop(t+dur+.02);
}
// a letter sliding in through the slot, then the mailbox's metal flap clacking shut
function mailSound(x,y){
  const v=nearVol(x,y);if(v<=0)return;
  noiseHit(2400,1.4,.11,.05*v,0,4200);
  noiseHit(1100,2.5,.05,.035*v,.12);
  if(!AC)return;const t=AC.currentTime+.12,o=AC.createOscillator(),g=AC.createGain();o.type='triangle';o.frequency.setValueAtTime(240,t);o.frequency.exponentialRampToValueAtTime(150,t+.07);
  g.gain.setValueAtTime(.022*v,t);g.gain.exponentialRampToValueAtTime(.0001,t+.08);o.connect(g);g.connect(sfxBus);o.start(t);o.stop(t+.1);
  const o2=AC.createOscillator(),g2=AC.createGain();o2.type='square';o2.frequency.value=1480;g2.gain.setValueAtTime(.005*v,t);g2.gain.exponentialRampToValueAtTime(.0001,t+.05);o2.connect(g2);g2.connect(sfxBus);o2.start(t);o2.stop(t+.07);
}
function blip(f,dur,type='square',vol=.06,to){
  if(!AC)return;const t=AC.currentTime,o=AC.createOscillator(),g=AC.createGain();
  o.type=type;o.frequency.setValueAtTime(f,t);if(to)o.frequency.exponentialRampToValueAtTime(to,t+dur);
  g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(g);g.connect(sfxBus);o.start(t);o.stop(t+dur+.02);
}
function chaChing(){blip(988,.08,'square',.05);setTimeout(()=>blip(1319,.25,'square',.05),80);}
function honk(){rumble(.15,.3,140);blip(392,.28,'square',.05);blip(494,.28,'square',.04);for(const p of peds)if(Math.abs(p.x-TR.x)<120&&!p.bub&&rnd()<.6)bubble(p,['BEEP BEEP!','WHOA!','HI!'][(rnd()*3)|0]);}
