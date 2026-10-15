'use strict';
// ============================================================ intro
// The cutscene before day 1 of a fresh save: Lee F. buys a truck from Steve, then reads the paperwork the next day.
// It plays like a visual novel: a pixel scene behind, a portrait either side and a text box that types itself out.
// Any key or a click finishes the line and then moves on; on a controller any button finishes it and X moves on. Esc skips the lot.
const ISW=192,ISH=108,IGY=84;// the store scene's size in pixels, and where the ground meets the sidewalk
const INTRO=[
  {k:'walk',st:'store',dur:3.4},
  {k:'say',st:'store',who:'steve',t:["Welcome to Steve's Stuff Store, how can I help you today?"]},
  {k:'say',st:'store',who:'lee',t:['I was looking to get a huge pickup truck, you know, so I can look cool when I go to the grocery store.']},
  {k:'say',st:'store',who:'steve',t:['Well lucky you, we\'ve got a special on those!']},
  // "down" is mumbled: tiny, faint and quick
  {k:'say',st:'store',who:'steve',wink:true,t:[['down','tiny'],' payment of just ',['$9,999','gold'],' and we\'re throwing in a ',['free leafblower','green'],'!']},
  {k:'say',st:'store',who:'lee',t:["That's not too bad, I'll take it!"]},
  {k:'card',st:'card',dur:2.4},
  {k:'paper',st:'paper',dur:6.8},
  {k:'say',st:'paper',who:'lee',face:'worry',t:['Looks like I need some cash...']},
];
for(const s of INTRO)if(s.t){s.t=s.t.map(x=>typeof x==='string'?[x,'']:x);s.len=s.t.reduce((n,x)=>n+x[0].length,0);}
const IN={on:false,i:0,t:0,n:0,acc:0,tr:0,pend:-1,shown:-1,rev:false,evil:false};
// the store sign and banner: render.js's little digits plus the letters they need
const IPX={...PX_GLYPH,S:[7,4,7,1,7],T:[7,2,2,2,2],E:[7,4,6,4,7],V:[5,5,5,5,2],U:[5,5,5,5,7],F:[7,4,6,4,4],O:[2,5,5,5,2],R:[6,5,6,5,5],
  C:[7,4,4,4,7],I:[7,2,2,2,7],A:[2,5,7,5,5],L:[4,4,4,4,7],N:[6,5,5,5,5],D:[6,5,5,5,6],W:[5,5,7,7,5],M:[5,7,7,5,5],G:[7,4,5,5,7],'!':[2,2,2,0,2],"'":[2,2,0,0,0]};
function ipx(g,str,x,y,col){g.fillStyle=col;for(const ch of str){const r=IPX[ch];if(r)for(let j=0;j<5;j++)for(let k=0;k<3;k++)if(r[j]>>(2-k)&1)g.fillRect(x+k,y+j,1,1);x+=4;}}
// Silkscreen's % is hard to read, so the contract draws its own
const PCT_SVG=(()=>{let r='';['##..#','##.#.','..#..','.#.##','#..##'].forEach((row,y)=>[...row].forEach((c,x)=>{if(c==='#')r+=`<rect x="${x}" y="${y}" width="1" height="1"/>`;}));
  return`<svg class="px ipct" viewBox="0 0 5 5" fill="currentColor">${r}</svg>`;})();
const SCRIBBLE=d=>`<svg viewBox="0 0 80 22"><path d="${d}" stroke="#2a4fa0" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

function startIntro(){
  const el=$('intro');
  el.innerHTML=`<canvas id="iScene" width="${ISW}" height="${ISH}"></canvas>
    <div id="iDesk"><div class="ipaper" id="iDoc">
      <div class="ph"><b>STEVE'S STUFF STORE</b><span>VEHICLE SALES AGREEMENT &middot; NO. 000001</span></div>
      <div class="pl"><span>BUYER</span><i></i><b>LEE F.</b></div>
      <div class="pl"><span>VEHICLE</span><i></i><b>1 HUGE PICKUP TRUCK</b></div>
      <div class="pl"><span>INCLUDED</span><i></i><b>1 LEAFBLOWER (FREE!)</b></div>
      <div class="pl big"><span id="iDown"><em class="evil">DOWN</em> PAYMENT</span><i></i><b id="iAmt">$9,999</b></div>
      <div class="pl bad"><span>MONTHLY PAYMENT</span><i></i><b>$9,999</b></div>
      <div class="pl bad"><span>INTEREST (APR)</span><i></i><b>92${PCT_SVG}</b></div>
      <div class="pl bad"><span>TERM</span><i></i><b>120 MONTHS</b></div>
      <div class="psig"><div>${SCRIBBLE('M4 16C8 4 12 4 11 14S16 6 20 12 26 14 30 8 36 16 40 10 48 12 54 9')}<span>BUYER</span></div>
        <div>${SCRIBBLE('M4 14C10 2 18 2 14 10S6 18 18 16 24 6 28 12 34 14 38 8 44 14 50 10 58 12 70 6')}<span>SELLER</span></div></div>
      <div class="pfine">NO REFUNDS. NO RETURNS. NO TAKE-BACKS. THE FREE LEAFBLOWER IS FREE.</div>
    </div><div id="iVig"></div></div>
    <div id="iCard">THE NEXT DAY</div>
    <canvas class="iport l" id="iPortL" width="56" height="56"></canvas><canvas class="iport r" id="iPortR" width="56" height="56"></canvas>
    <div id="iBox" class="panel"><div class="iname" id="iName"></div><div class="itext" id="iText"></div><div class="inext" id="iNext">${G('talk')} &#9654;</div></div>
    <div class="iskip">${G('pause')} SKIP</div><div id="iFade"></div>`;
  el.classList.remove('hide','out');el.onpointerdown=()=>introKey('click');
  Object.assign(IN,{on:true,tr:0,pend:-1,shown:-1,rev:false});state='intro';document.body.style.cursor='default';introEnter(0);
}
// over: fade into day 1, with the how-to-play sheet up first as always. (introSkip is the same thing at once, for the test scenarios)
function introDone(){if(!IN.on)return;IN.on=false;const el=$('intro');el.classList.add('out');setTimeout(()=>{el.classList.add('hide');el.innerHTML='';},500);
  state='play';document.body.style.cursor='none';openMenu(true);}
function introSkip(){introDone();$('intro').classList.add('hide');}
function introEnter(i){
  const s=INTRO[i],prev=INTRO[IN.i];IN.i=i;IN.t=0;IN.n=0;IN.acc=0;
  $('iScene').style.display=s.st==='store'?'block':'none';$('iDesk').style.display=s.st==='paper'?'block':'none';$('iCard').style.display=s.st==='card'?'flex':'none';
  const say=s.k==='say',L=$('iPortL'),R=$('iPortR');
  L.classList.toggle('on',say);R.classList.toggle('on',say&&s.st==='store');
  L.classList.toggle('dim',say&&s.who!=='lee');R.classList.toggle('dim',say&&s.who!=='steve');
  $('iBox').style.display=say?'block':'none';
  if(say){const nm=$('iName');nm.textContent=s.who==='lee'?'LEE F.':'STEVE';nm.className='iname '+s.who;introText();}
  if(s.k==='paper'){IN.rev=IN.evil=false;$('iDoc').classList.remove('rev');}
  if(prev&&prev.st!==s.st)blip(440,.05,'square',.03);
}
function introNext(){
  const n=IN.i+1;if(n>=INTRO.length){introDone();return;}
  // a change of place goes through black
  if(INTRO[n].st!==INTRO[IN.i].st){IN.tr=.8;IN.pend=n;}else introEnter(n);
}
function introKey(k){
  if(!IN.on||state!=='intro')return;
  if(k==='Escape'){introDone();return;}
  if(IN.tr>0)return;
  const s=INTRO[IN.i];
  if(s.k==='say'){if(IN.n<s.len){IN.n=s.len;introText();return;}if(k!=='pad'){blip(620,.04,'square',.035);introNext();}return;}
  // the shots that play by themselves: any key jumps to the end of one
  IN.t=s.dur;
}
// X moves on: that's A's neighbour on an Xbox pad and A's own spot (the cross) on a PlayStation one, so both count
function introPad(){if(padHit(BTN.pause)||padHit(BTN.view)){introKey('Escape');return;}if(pad.b.some((b,i)=>b&&!pad.pb[i]))introKey(padHit(BTN.use)||padHit(BTN.tarp)?'next':'pad');}
// how long each letter takes: punctuation leaves a beat, and the mumbled bit rushes
const introCost=(ch,cls)=>cls==='tiny'?1/80:'.!?'.includes(ch)?.2:ch===','?.1:1/40;
function introText(){
  const s=INTRO[IN.i];let left=Math.floor(IN.n),h='';
  for(const [txt,cls] of s.t){if(left<=0)break;const part=txt.slice(0,left).replace(/&/g,'&amp;').replace(/</g,'&lt;');left-=txt.length;h+=cls?`<span class="${cls}">${part}</span>`:part;}
  $('iText').innerHTML=h;$('iNext').style.display=IN.n>=s.len?'block':'none';
}
function introTick(dt){
  if(!IN.on)return;
  if(IN.tr>0){const was=IN.tr;IN.tr=Math.max(0,IN.tr-dt);if(was>.4&&IN.tr<=.4)introEnter(IN.pend);$('iFade').style.opacity=IN.tr>.4?(.8-IN.tr)/.4:IN.tr/.4;}
  const s=INTRO[IN.i];IN.t+=dt;
  if(s.k==='say'&&IN.n<s.len&&IN.tr<=0){
    IN.acc+=dt;let typed=false;
    while(IN.n<s.len){const [ch,cls]=introCh(s,IN.n),c=introCost(ch,cls);if(IN.acc<c)break;IN.acc-=c;IN.n++;
      // a little voice under the letters: Lee higher, Steve lower and buzzier
      if(cls!=='tiny'&&/\w/.test(ch)&&IN.n%2)s.who==='lee'?blip(300+rnd()*70,.035,'square',.022):blip(170+rnd()*40,.04,'sawtooth',.02);typed=true;}
    if(typed)introText();
  }
  if((s.k==='walk'||s.k==='card'||s.k==='paper')&&IN.t>=s.dur&&IN.tr<=0)introNext();
  if(s.st==='store')introStore($('iScene').getContext('2d'),s.k==='walk'?IN.t:9);
  // (the paper stays put, and fits the window, while Lee reads it)
  if(s.st==='paper')introCam(s.k==='paper'?Math.min(IN.t,s.dur):99);
  const talking=s.k==='say'&&IN.n<s.len&&((time*11)|0)&1;
  introFace($('iPortL').getContext('2d'),'lee',talking&&s.who==='lee',s.face||(s.who==='lee'?'happy':''));
  introFace($('iPortR').getContext('2d'),'steve',talking&&s.who==='steve',s.wink&&IN.n>=s.len?'wink':'');
}
const introCh=(s,n)=>{for(const [txt,cls] of s.t){if(n<txt.length)return[txt[n],cls];n-=txt.length;}return['',''];};

// ---- the store, side on: Steve's place on the left, the truck on special to the right
function introStore(g,t){
  const R=(c,x,y,w,h)=>{g.fillStyle=c;g.fillRect(x,y,w,h);},OE=(x,y,rx,ry,c,ol)=>{if(ol){g.fillStyle=ol;pellipse(g,x,y,rx+1,ry+1);}g.fillStyle=c;pellipse(g,x,y,rx,ry);};
  ['#6fb7d6','#80c0da','#95cadd','#abd4df','#c6dedc','#e2e4c8','#eee6c0'].forEach((c,i)=>R(c,0,i*8,ISW,8));
  for(const [x0,y,w] of [[20,9,20],[96,5,26],[160,15,16]]){const x=Math.round((x0+time*2.5)%(ISW+40))-20;R('#f6faf8',x,y,w,3);R('#f6faf8',x+4,y-2,w-9,2);R('#d6e6ea',x,y+3,w,1);}
  for(let x=0;x<ISW;x++){const h=Math.round(9+Math.sin(x*.045)*4+Math.sin(x*.13+1)*2);R('#8fae7a',x,62-h,1,h);}
  R('#6a9a4a',0,60,ISW,IGY-60);for(let x=0;x<ISW;x+=3)R('#5a8a3e',x+((x*7)%5),62+((x*13)%18),1,2);
  // fall trees behind everything
  for(const [x,y,r,a,b] of [[6,48,13,'#c9532a','#e2742a'],[123,50,10,'#d9a02a','#f0c24a'],[186,46,14,'#c9352b','#e2742a']]){
    R('#4a2e1a',x-1,y,3,IGY-y);OE(x,y,r,r-2,a,'#5a2a14');for(let k=0;k<26;k++){const dx=((k*37)%(2*r))-r,dy=((k*53)%(2*r-4))-r+2;if(dx*dx/(r*r)+dy*dy/((r-2)*(r-2))<.8)R(b,x+dx,y+dy,2,1);}}
  // sidewalk, curb and the lot
  R('#b9b6a8',0,IGY,ISW,6);for(let x=8;x<ISW;x+=16)R('#a5a294',x,IGY,1,6);R('#8f8b80',0,IGY+6,ISW,1);R('#3d4246',0,IGY+7,ISW,ISH-IGY-7);
  for(let x=10;x<ISW;x+=34)R('#e8c64a',x,IGY+10,2,ISH-IGY-10);
  // the store: a brick front, the sign on top, an awning over the windows
  R('#5a2a18',16,30,104,IGY-30);R('#b5643c',18,34,100,IGY-34);
  for(let y=37;y<IGY;y+=4){R('#9a4e2c',18,y,100,1);for(let x=18+((y>>2)&1)*4;x<118;x+=8)R('#9a4e2c',x,y+1,1,3);}
  R('#c97a50',18,34,100,1);
  R('#4a2e1a',32,26,2,4);R('#4a2e1a',102,26,2,4);
  R('#8a2224',24,14,88,14);R('#fff1b0',25,15,86,12);R('#e8d088',25,26,86,1);ipx(g,"STEVE'S STUFF STORE",31,19,'#c8352c');
  R('#14407a',24,29,88,9);R('#2a6fc9',25,29,86,8);R('#3d86e0',25,29,86,1);ipx(g,'UNDER NEW MANAGEMENT!',27,31,'#fff');
  for(let x=18;x<118;x++){const red=((x-18)/6|0)%2===0;R(red?'#c9352b':'#f4f4f4',x,39,1,6);if((x%6)<3)R(red?'#a8251b':'#d8d8d8',x,45,1,1);}
  R('#7a3a22',18,38,100,1);R('rgba(0,0,0,.22)',18,46,100,2);
  const win=(x,y,w,h)=>{R('#3a2418',x-1,y-1,w+2,h+2);R('#4f9fc8',x,y,w,h);R('#3f8ab2',x,y+h-4,w,4);};
  win(22,50,38,28);win(86,50,28,28);R('#3a2418',65,51,16,IGY-51);R('#4f9fc8',67,53,12,IGY-53);R('#ffcf4a',77,68,1,3);
  // stuff for sale: a lamp, a bear, a telly, a flamingo and a gnome
  R('#e2a03a',26,58,9,4);R('#f0c24a',27,58,7,1);R('#4a2e1a',30,62,2,13);R('#3a2418',27,75,8,2);
  OE(44,72,4,4,'#9a6a3a','#5a3a1e');OE(44,65,3,3,'#9a6a3a','#5a3a1e');R('#9a6a3a',41,61,2,2);R('#9a6a3a',46,61,2,2);R('#1a0f0a',43,65,1,1);R('#1a0f0a',45,65,1,1);
  R('#2a2a30',50,64,9,9);R(((time*3)|0)%2?'#6fd18e':'#5ac07e',51,65,7,6);R('#1a1a20',53,73,3,2);
  R('#c9352b',35,52,17,7);ipx(g,'SALE',36,53,'#fff');
  R('#e86aa0',95,67,1,9);R('#e86aa0',98,67,1,9);OE(97,64,4,3,'#e86aa0','#a8406e');R('#e86aa0',100,56,1,7);R('#e86aa0',100,55,3,2);R('#2a2420',103,56,1,1);
  R('#c9352b',108,61,1,2);R('#c9352b',107,63,3,2);R('#c9352b',106,65,5,2);R('#f2c29a',107,67,3,2);R('#f4f4f4',107,69,3,2);R('#3a6fd0',106,71,5,6);
  for(const [x,y,w,h] of [[22,50,38,28],[86,50,28,28],[67,53,12,31]])for(let k=0;k<h;k++){const sx=x+w-6-Math.round(k*.5);if(sx>x+1)R('rgba(255,255,255,.22)',sx,y+k,2,1);}
  // the truck, side on and nose towards the store: long and low, a small cab with a raked windshield, a long flat bed, stock paint
  const TP=truckPal('#2f6f8f',true),cx0=y=>143-Math.round((y-64)*.8);
  R('rgba(0,0,0,.28)',126,83,63,2);
  R(TP.d,143,62,10,1);for(let y=63;y<70;y++){const x=cx0(y);R(TP.d,x-1,y,155-x,1);R(TP.m,x,y,153-x,1);}
  for(let y=64;y<69;y++){const x=cx0(y)+1;R('#4fa3cc',x,y,150-x,1);}R('#b8e2f4',144,64,2,1);R('#b8e2f4',143,65,2,1);R('#b8e2f4',142,66,2,1);R('#b8e2f4',147,64,1,1);R('#b8e2f4',146,65,1,1);R('#7cc4e6',145,67,4,1);
  R(TP.l,143,63,9,1);
  R(TP.d,124,69,66,11);R(TP.m,125,70,64,9);R(TP.l,125,70,64,1);R(TP.s,125,74,64,1);R(TP.s,125,76,64,3);R(TP.d,125,79,64,1);R(TP.d,123,71,1,7);
  R(TP.d,139,70,1,7);R(TP.d,153,70,1,7);R(TP.d,186,70,1,7);R('#cfd5d8',150,72,2,1);R('#fff',142,71,4,4);R('#4bc26a',143,72,2,2);R(TP.d,140,67,2,2);
  R('#cfd5d8',122,75,3,3);R('#ffb02a',124,71,2,2);R('#8a1c1c',188,71,2,2);R('#fe3b3b',188,71,1,1);R('#1c1e21',188,76,3,3);
  for(const wx of [135,175]){OE(wx,78,6,4,'#15181b');OE(wx,79,5,5,'#15181b');OE(wx,79,2,2,'#5d5a64');R('#3a383f',wx,79,1,1);R('#3a383f',wx-1,78,1,1);R('#8a8792',wx-2,77,1,1);}
  for(const [sx,sy,ph] of [[130,70,0],[168,70,1.7],[147,63,3.1],[182,74,4.4]]){const k=Math.sin(time*2.2+ph);if(k>.6){R('#fff',sx,sy-1,1,3);R('#fff',sx-1,sy,3,1);}}
  // the special: a banner between two poles, a balloon on each
  for(const [px,ph,c] of [[130,0,'#ffcf4a'],[186,1.3,'#c9352b']]){const by=Math.round(23+Math.sin(time*1.8+ph)*1.5);R('#8f989e',px,30,1,IGY-30);R('#cfd5d8',px,by+4,1,30-by-4);OE(px,by,3,4,c,shadeHex(c,.6));R('#fff',px-1,by-2,1,1);}
  R('#a8251b',131,31,55,10);R('#c9352b',131,31,55,9);ipx(g,'SPECIAL!',143,33,'#fff');
  // Lee walks up; Steve waits at the door and waves once Lee gets close
  const lx=Math.round(-8+Math.min(1,t/2.6)*64);introLeeSm(g,lx,IGY+4,t<2.6?t*11:null);introSteveSm(g,74,IGY+4,t>1.6&&t<3.4?Math.sin(time*14):null);
  // leaves on the wind
  for(let k=0;k<14;k++){const x=((k*53+time*(9+k%4*3))%(ISW+20))-10,y=((k*31+time*(6+k%3*2))%(IGY+10))-6+Math.sin(time*2+k)*2;
    R(['#e2742a','#c9352b','#eec03a','#d9a02a'][k%4],Math.round(x),Math.round(y),k%3?2:1,1);}
}
function introLeeSm(g,x,y,f){
  const p=players[0].pal,R=(c,a,b,w,h)=>{g.fillStyle=c;g.fillRect(a,b,w,h);},s=f==null?0:Math.round(Math.sin(f)*1.5),b=f!=null&&Math.cos(f)>0?1:0;
  R('#2b3a5a',x-2+s,y-4,2,4);R('#2b3a5a',x+1-s,y-4,2,4);R('#2b1d15',x-2+s,y-1,3,1);R('#2b1d15',x+1-s,y-1,3,1);
  y-=b;R(p.shirt[0],x-3,y-9,7,6);R(p.shirt[1],x-2,y-9,5,5);R(p.shirt[0],x-1-s,y-8,2,4);R('#f2c29a',x-1-s,y-4,2,1);
  R('#f2c29a',x-2,y-13,5,4);R('#1a0f0a',x+1,y-12,1,1);R('#5a3a22',x-3,y-12,2,3);
  R(p.cap[0],x-3,y-15,6,2);R(p.cap[1],x-2,y-15,4,1);R(p.cap[3],x+2,y-13,3,1);
}
function introSteveSm(g,x,y,wave){
  const R=(c,a,b,w,h)=>{g.fillStyle=c;g.fillRect(a,b,w,h);};
  R('#5a3a22',x-2,y-4,2,4);R('#5a3a22',x+1,y-4,2,4);R('#1a0f0a',x-3,y-1,3,1);R('#1a0f0a',x+1,y-1,3,1);
  R('#a8761a',x-3,y-10,7,7);R('#d9a02a',x-2,y-10,5,6);R('#f4f4f4',x-1,y-10,2,3);R('#c9352b',x-1,y-9,1,4);R('#f4f4f4',x+1,y-8,2,1);
  if(wave!=null){const w=Math.round(wave);R('#a8761a',x-5,y-14,2,5);R('#e8b48a',x-5+w,y-16,2,2);}else{R('#a8761a',x-4,y-9,2,5);R('#e8b48a',x-4,y-4,2,1);}
  R('#e8b48a',x-2,y-14,5,4);R('#1a0f0a',x-1,y-13,1,1);R('#2a1a14',x-2,y-11,3,1);
  R('#2a1a14',x-2,y-16,6,2);R('#2a1a14',x+2,y-14,2,2);R('#5a4a44',x-1,y-16,2,1);
}
// ---- portraits, front on, 56 x 56 (drawn 4px in, so Steve's shoulders and name tag fit): talk opens the mouth, face is 'happy', 'worry' or 'wink'
function introFace(g,who,talk,face){
  const R=(c,x,y,w,h)=>{g.fillStyle=c;g.fillRect(x,y,w,h);},OE=(x,y,rx,ry,c,ol)=>{if(ol){g.fillStyle=ol;pellipse(g,x,y,rx+1,ry+1);}g.fillStyle=c;pellipse(g,x,y,rx,ry);};
  const K='#1a0f0a',top=(y,fn)=>{g.save();g.beginPath();g.rect(0,0,48,y);g.clip();fn();g.restore();},blink=(time%3.7)<.12;
  g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,56,56);g.setTransform(1,0,0,1,4,0);
  if(who==='lee'){
    const p=players[0].pal,sk='#f2c29a',sd='#d9a07a';
    OE(24,60,20,15,p.shirt[1],K);R(p.shirt[0],5,52,6,4);R(p.shirt[0],37,52,6,4);R(p.shirt[3],12,48,5,1);patCircle(g,24,60,14,p.sp,p.spc);
    R(sd,20,36,9,10);OE(24,45,5,2,sd);R(p.shirt[2],18,46,3,1);R(p.shirt[2],28,46,3,1);
    OE(13,27,2,3,sk,K);OE(35,27,2,3,sk,K);OE(24,26,11,12,sk,K);
    R('#5a3a22',14,19,3,7);R('#5a3a22',32,19,3,7);R('#f0a080',16,31,3,1);R('#f0a080',30,31,3,1);
    top(20,()=>OE(24,19,12,11,p.cap[1],K));R(p.cap[2],16,10,5,2);R(p.cap[3],24,9,1,10);R(p.cap[0],23,8,3,1);patCircle(g,24,14,6,p.cp,p.cpc);
    OE(24,20,13,2,p.cap[3],K);R(p.cap[2],14,19,20,1);R(sd,14,22,21,1);
    if(face==='worry'){R('#5a3a22',17,24,2,1);R('#5a3a22',19,23,2,1);R('#5a3a22',27,23,2,1);R('#5a3a22',29,24,2,1);}
    else{R('#5a3a22',17,23,4,1);R('#5a3a22',27,23,4,1);}
    if(blink){R(K,18,27,2,1);R(K,28,27,2,1);}else{R(K,18,25,2,3);R(K,28,25,2,3);R('#fff',18,25,1,1);R('#fff',28,25,1,1);}
    R(sd,23,29,2,1);
    if(talk){R('#5a1a14',21,32,6,2);R('#fff',22,32,4,1);if(face!=='worry')R('#c9524a',22,33,4,1);}
    else if(face==='worry'){R('#8a2a24',21,33,2,1);R('#8a2a24',23,32,2,1);R('#8a2a24',25,33,2,1);}
    else if(face==='happy'){R('#8a2a24',21,33,6,1);R('#8a2a24',20,32,1,1);R('#8a2a24',27,32,1,1);}
    else R('#8a2a24',22,33,5,1);
    if(face==='worry'){const d=Math.round((time*6)%8);R('#8fd6ff',35,15+d,2,3);R('#e6f8ff',35,15+d,1,1);}
    return;}
  // Steve: slicked hair, a big moustache, a gold tooth and a mustard plaid jacket
  const sk='#e8b48a',sd='#c98a60',hr='#2a1a14',jk='#d9a02a',jd='#a8761a';
  const sh=[9,6,4,3,2,1,1,1,1,1,1,1];
  for(let y=44;y<56;y++){const i=sh[y-44];R(K,i-4,y,57-2*i,1);if(y>44)for(let x=i-3;x<52-i;x++)R(x%5===0||y%5===0?jd:jk,x,y,1,1);}
  for(let y=45;y<56;y++){const w=Math.max(0,5-((y-45)>>1));R('#f4f4f4',24-w,y,w*2,1);R('#8a5a10',24-w-1,y,1,1);R('#8a5a10',24+w,y,1,1);}
  R('#a8251b',22,45,4,2);R('#c9352b',23,47,2,3);R('#c9352b',22,50,4,6);R('#e85a44',23,50,1,5);
  R(sd,19,36,10,9);
  R('#c9352b',29,48,21,1);R('#f4f4f4',29,49,21,7);R('#d8d8d8',29,55,21,1);ipx(g,'STEVE',30,50,'#1a2a3a');
  OE(12,27,2,3,sk,K);OE(36,27,2,3,sk,K);OE(24,26,12,12,sk,K);
  top(21,()=>{OE(19,11,8,5,hr,K);OE(24,17,13,10,hr,K);});R('#5a4a44',14,12,6,1);R('#5a4a44',13,13,2,1);R('#5a4a44',25,9,6,1);R(K,21,10,1,6);
  R(hr,12,20,3,8);R(hr,33,20,3,8);
  R(hr,16,21,6,2);R(hr,27,21,6,2);
  // bright little eyes, or a wink at the end of the pitch
  if(blink){R(K,17,25,4,1);R(K,28,25,4,1);}else{R(K,18,24,2,3);R('#fff',18,24,1,1);
    if(face==='wink'){R(K,28,25,1,1);R(K,29,24,2,1);R(K,31,25,1,1);}else{R(K,29,24,2,3);R('#fff',29,24,1,1);}}
  R(sd,23,27,3,3);R('#e89a7a',15,30,3,1);R('#e89a7a',31,30,3,1);
  if(talk){R('#5a1a14',20,32,9,4);R('#fff',21,32,7,1);R('#c9524a',22,34,5,1);}else{R('#5a1a14',20,33,9,2);R('#fff',21,33,7,1);}
  R('#ffcf4a',26,talk?32:33,1,1);
  R(hr,17,30,15,2);R(hr,15,29,2,2);R(hr,32,29,2,2);R(hr,14,28,1,1);R(hr,34,28,1,1);R('#4a3a34',19,30,4,1);
  R(sd,22,37,5,1);
  if(((time*.7)%3)<.25){R('#fff',26,30,1,5);R('#fff',24,32,5,1);}
}
// ---- the paperwork: start tight on the $9,999, slide left to what it's for, then pull right back to see the rest
const iAt=id=>{const e=$(id);return{x:e.offsetLeft+e.offsetWidth/2,y:e.offsetTop+e.offsetHeight/2};};
function introCam(t){
  const doc=$('iDoc'),A=iAt('iAmt'),B=iAt('iDown'),C={x:doc.offsetWidth/2,y:doc.offsetHeight*.62};
  const fit=Math.min(innerWidth*.86/doc.offsetWidth,innerHeight*.74/doc.offsetHeight),zin=Math.min(innerWidth*.42/$('iAmt').offsetWidth,fit*6);
  const e=k=>{k=clamp(k,0,1);return k*k*(3-2*k);},mix=(a,b,k)=>({x:a.x+(b.x-a.x)*k,y:a.y+(b.y-a.y)*k});
  let f=A,s=zin;
  if(t>=3.6){const k=e((t-3.6)/1.5);f=mix(B,C,k);s=Math.exp(Math.log(zin)+(Math.log(fit)-Math.log(zin))*k);}
  else if(t>=1.4)f=mix(A,B,e((t-1.4)/1.3));
  doc.style.transform=`scale(${s.toFixed(4)}) rotate(-1.2deg) translate(${(-f.x).toFixed(1)}px,${(-f.y).toFixed(1)}px)`;
  $('iVig').style.opacity=clamp((s/fit-1)/1.5,0,1).toFixed(3);
  // a low growl as the camera lands on the DOWN; then the reveal: the rest goes red, with a dun dun DUN
  if(t>=2.6&&!IN.evil){IN.evil=true;blip(98,.7,'sawtooth',.05,70);}
  if(t>=5.1&&!IN.rev){IN.rev=true;doc.classList.add('rev');blip(392,.22,'square',.05);setTimeout(()=>blip(370,.22,'square',.05),260);setTimeout(()=>blip(233,.8,'sawtooth',.06,175),520);}
}
