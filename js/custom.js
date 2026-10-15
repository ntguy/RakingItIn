'use strict';
// ============================================================ customization
// Looks bought with money from the pause menu (once the full game is unlocked): a shirt and hat for player one, and the
// truck's model and paint. What you own and wear is kept in the save as CUST.
const SHIRT_PAL=(m,pat,pc)=>({sh:[shadeHex(m,.48),m,shadeHex(m,.7),shadeHex(m,1.18)],pat,pc});
const HAT_PAL=(m,pat,pc)=>({cp:[shadeHex(m,.4),m,shadeHex(m,1.3),shadeHex(m,.68)],pat,pc});
const CUST_COLORS=[['teal','#1f9a96',100],['green','#2f9a5a',100],['violet','#7a4bd0',100],['orange','#e8782a',150],['pink','#e86aa0',150],['navy','#24407a',200],['black','#25282c',200],['white','#e8eef2',250]];
const CUST_ITEMS={
  // the same colours in the same order on shirts and hats, then the specials last
  shirt:[{id:'def',price:0,pal:{sh:PLAYER_PALS[0].shirt}},...CUST_COLORS.map(([id,hex,price])=>({id,price,pal:SHIRT_PAL(hex)})),
    {id:'gray',price:250,pal:SHIRT_PAL('#7b8590')},
    {id:'flannelred',price:400,pal:SHIRT_PAL('#b3322b','plaid','#1a1416')},{id:'flannelblue',price:500,pal:SHIRT_PAL('#2a5aa8','plaid','#101c38')}],
  hat:[{id:'def',price:0,pal:{cp:PLAYER_PALS[0].cap}},...CUST_COLORS.map(([id,hex,price])=>({id,price,pal:HAT_PAL(hex)})),
    {id:'camo',price:300,pal:HAT_PAL('#5b7a3a','camo','#2a3a1a')},{id:'canada',price:450,pal:HAT_PAL('#f4f4f4','canada','#d52b1e')},{id:'usa',price:500,pal:HAT_PAL('#b22234','usa','#f4f4f4')}],
  truck:[{id:'pickup',name:'PICKUP',price:0},{id:'classic',name:'CLASSIC',price:2000},{id:'electric',name:'ELECTRIC TRUCK',price:8000}],
  // paints are shown as colours only: compass yellow, canyon red, forest green, black and silver
  paint:[{id:'stock',hex:'#2f6f8f',price:0},{id:'yellow',hex:'#dba81f',price:2000},{id:'red',hex:'#8c2a24',price:2000},
    {id:'green',hex:'#2d5a3d',price:2000},{id:'black',hex:'#1c1e21',price:2000},{id:'silver',hex:'#aeb5ba',price:2000}],
};
const CUST_KINDS=['shirt','hat','truck','paint'];
let CUST={own:[],shirt:'def',hat:'def',truck:'pickup',paint:'stock'};
const custItem=(k,id)=>CUST_ITEMS[k].find(x=>x.id===id)||CUST_ITEMS[k][0];
const custOwned=(k,id)=>custItem(k,id).price===0||CUST.own.includes(k+':'+id);
// the saved bits, kept to things that still exist
function custLoad(s){CUST={own:[],shirt:'def',hat:'def',truck:'pickup',paint:'stock'};
  if(s&&typeof s==='object'){CUST.own=(s.own||[]).filter(key=>{const [k,id]=key.split(':');return CUST_ITEMS[k]&&CUST_ITEMS[k].some(x=>x.id===id);});
    for(const k of CUST_KINDS)if(CUST_ITEMS[k].some(x=>x.id===s[k])&&custOwned(k,s[k]))CUST[k]=s[k];}
  applyLook();}
// player one's colours for the current look; the second player keeps their own
function lookPal(){const s=custItem('shirt',CUST.shirt).pal,h=custItem('hat',CUST.hat).pal;
  return{shirt:s.sh,cap:h.cp,sp:s.pat||null,spc:s.pc,cp:h.pat||null,cpc:h.pc};}
function applyLook(){if(typeof players!=='undefined'&&players[0]){players[0].pal=lookPal();if(cur===players[0])PPAL=players[0].pal;}
  if(typeof buildTruck==='function'&&typeof truckBase!=='undefined')buildTruck();}
// a pattern over a round shirt or hat (stripes, plaid, dots, or a flag), kept inside radius r. col is the second colour; the
// the US flag carries its own blue and uses col for the white; Canada is red bars at the sides and a small red dot in the middle (col); camo uses col for its dark patches
function patCircle(g,x,y,r,pat,col){if(!pat)return;g.fillStyle=col;
  for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){if(dx*dx+dy*dy>r*r-1)continue;
    if(pat==='usa'){
      // a solid blue corner up top-left, white stripes across the rest
      if(dx<=0&&dy<=0&&dx>=-r+1&&dy>=-r+1){g.fillStyle='#2a3f8a';g.fillRect(x+dx,y+dy,1,1);g.fillStyle=col;continue;}
      if((dy&1)!==0)g.fillRect(x+dx,y+dy,1,1);continue;}
    if(pat==='camo'){const h=(((dx+9)*37+(dy+9)*91+((dx*dy)&3)*17)%7+7)%7;
      if(h<2){g.fillRect(x+dx,y+dy,1,1);}else if(h===4){g.fillStyle='#a89a62';g.fillRect(x+dx,y+dy,1,1);g.fillStyle=col;}continue;}
    if(pat==='canada'){if(Math.abs(dx)>=3||Math.abs(dx)+Math.abs(dy)<=1)g.fillRect(x+dx,y+dy,1,1);continue;}
    const on=pat==='stripe'?(dy&1)===0:pat==='plaid'?(Math.abs(dy)%3===0||Math.abs(dx)%3===0):(Math.abs(dx)%3===0&&Math.abs(dy)%3===0);
    if(on)g.fillRect(x+dx,y+dy,1,1);}}
// ---- the truck: three bodies, each painted from one colour. They all share the same 52x24 footprint, with the bed at the
// back (x 1-28) and the cab and hood in front, so the tarps, batteries and solar panel drawn on top line up on any of them
function truckPal(hex,stock){
  if(stock)return{m:'#2f6f8f',d:'#16303d',s:'#24566c',l:'#3d88ab',c:'#3a86ab',bf:'#1d4658',rb:'#183a49'};
  return{m:hex,d:shadeHex(hex,.4),s:shadeHex(hex,.78),l:shadeHex(hex,1.28),c:shadeHex(hex,1.12),bf:shadeHex(hex,.62),rb:shadeHex(hex,.5)};}
const TRUCK_DRAW={
  pickup(c,P){
    c.fillStyle='#0d0d10';for(const [x,y] of [[7,0],[36,0],[7,22],[36,22]])c.fillRect(x,y,9,2);
    c.fillStyle=P.d;c.fillRect(0,1,52,22);c.fillStyle=P.m;c.fillRect(1,2,50,20);
    c.fillStyle=P.bf;c.fillRect(4,4,24,16);c.fillStyle=P.rb;for(let y=6;y<20;y+=3)c.fillRect(4,y,24,1);
    c.fillStyle=P.s;c.fillRect(1,2,3,20);c.fillStyle=P.l;c.fillRect(1,2,28,1);
    c.fillStyle=P.c;c.fillRect(29,3,21,18);c.fillStyle='#1a2a3a';c.fillRect(30,4,2,16);
    c.fillStyle='#4fa3cc';c.fillRect(32,4,10,16);c.fillStyle='#7cc4e6';c.fillRect(32,4,10,1);
    c.fillStyle='#1a2a3a';c.fillRect(42,4,3,16);c.fillStyle='#6fb3d9';c.fillRect(43,5,1,4);
    c.fillStyle=P.m;c.fillRect(45,3,6,18);c.fillStyle='#ffe38a';c.fillRect(50,3,2,3);c.fillRect(50,18,2,3);
    c.fillStyle='#fe3b3b';c.fillRect(0,3,1,3);c.fillRect(0,18,1,3);
    c.fillStyle=P.d;c.fillRect(33,0,2,2);c.fillRect(33,22,2,2);
  },
  // an old-school truck: rounded corners, a wooden bed, round headlights and chrome at both ends
  classic(c,P){
    c.fillStyle='#0d0d10';for(const [x,y] of [[7,0],[36,0],[7,22],[36,22]])c.fillRect(x,y,9,2);
    c.fillStyle=P.d;c.fillRect(0,1,52,22);c.fillStyle=P.m;c.fillRect(1,2,50,20);
    c.fillStyle=P.l;for(const x of [6,35])c.fillRect(x,2,10,1),c.fillRect(x,21,10,1);
    c.fillStyle='#8a6a3f';c.fillRect(5,5,23,14);c.fillStyle='#6b4f2d';for(let y=7;y<19;y+=3)c.fillRect(5,y,23,1);
    c.fillStyle=P.m;c.fillRect(4,3,25,2);c.fillRect(4,19,25,2);c.fillStyle=P.l;c.fillRect(4,3,25,1);c.fillRect(4,19,25,1);
    c.fillStyle=P.s;c.fillRect(1,2,4,20);c.fillStyle=P.l;c.fillRect(1,2,1,20);
    c.fillStyle=P.c;c.fillRect(30,4,15,16);c.fillStyle=P.l;c.fillRect(33,5,9,1);c.fillRect(33,18,9,1);
    c.fillStyle='#3b6f8a';c.fillRect(31,6,2,12);c.fillStyle='#1a2a3a';c.fillRect(41,5,1,14);c.fillRect(44,5,1,14);
    c.fillStyle='#4fa3cc';c.fillRect(42,5,2,14);c.fillStyle='#7cc4e6';c.fillRect(42,5,2,1);
    c.fillStyle=P.m;c.fillRect(45,3,6,18);c.fillStyle=P.l;c.fillRect(46,11,5,2);
    c.fillStyle='#cfd5d8';c.fillRect(51,3,1,18);c.fillRect(0,7,1,10);
    c.fillStyle='#ffe38a';c.fillRect(49,4,2,2);c.fillRect(49,18,2,2);c.fillStyle='#fff6c8';c.fillRect(50,4,1,1);c.fillRect(50,18,1,1);
    c.fillStyle='#fe3b3b';c.fillRect(0,3,1,3);c.fillRect(0,18,1,3);
    for(const [x,y] of [[0,1],[51,1],[0,22],[51,22]])c.clearRect(x,y,1,1);
  },
  // the electric truck, a little smaller than the others (49x20): a glass roof, side mirrors, a gear tunnel behind the cab,
  // slim headlights at the front corners and a light at each tail corner. The bed liner runs x 4-28 so the battery rack fits it
  electric(c,P){
    c.fillStyle='#15181b';for(const [x,y] of [[7,1],[34,1],[7,21],[34,21]])c.fillRect(x,y,8,2);
    c.fillStyle='#4a5258';for(const [x,y] of [[9,1],[36,1],[9,22],[36,22]])c.fillRect(x,y,4,1);
    c.fillStyle=P.d;c.fillRect(1,2,49,20);c.fillStyle=P.m;c.fillRect(2,3,47,18);
    c.fillStyle='#26292d';c.fillRect(4,4,25,16);c.fillStyle='#33373c';for(let y=6;y<19;y+=3)c.fillRect(4,y,25,1);
    c.fillStyle=P.l;c.fillRect(2,3,27,1);c.fillRect(2,20,27,1);
    c.fillStyle=P.s;c.fillRect(29,4,3,16);c.fillStyle=P.l;c.fillRect(29,4,3,1);c.fillStyle='#26292d';c.fillRect(30,8,1,8);
    c.fillStyle=P.m;c.fillRect(32,4,12,16);c.fillStyle='#1b2733';c.fillRect(33,5,9,14);c.fillStyle='#2f4a63';c.fillRect(34,6,7,1);c.fillRect(34,17,7,1);
    c.fillStyle='#3b5873';for(let k=0;k<4;k++)c.fillRect(34+k*2,8+k*2,2,1);
    c.fillStyle=P.m;c.fillRect(37,5,1,14);
    c.fillStyle='#6f95b3';c.fillRect(42,5,2,14);c.fillStyle='#a9c6dc';c.fillRect(42,5,2,1);
    c.fillStyle=P.m;c.fillRect(44,3,5,18);c.fillStyle=P.l;c.fillRect(46,10,3,4);
    c.fillStyle=P.d;c.fillRect(43,1,3,1);c.fillRect(43,22,3,1);
    c.fillStyle='#eaf7ff';c.fillRect(48,3,1,6);c.fillRect(48,15,1,6);c.fillStyle='#8fd0ff';c.fillRect(49,4,1,4);c.fillRect(49,16,1,4);
    c.fillStyle='#ff3b3b';c.fillRect(2,5,1,4);c.fillRect(2,15,1,4);c.fillStyle='#8a1c1c';c.fillRect(3,5,1,4);c.fillRect(3,15,1,4);
    for(const [x,y] of [[1,2],[1,21],[49,2],[49,21],[48,2],[48,21],[49,3],[49,20]])c.clearRect(x,y,1,1);
  },
};
function truckSprite(model,paintId){
  const cv=mk(52,24),c=cv.getContext('2d'),p=custItem('paint',paintId),P=truckPal(p.hex,p.id==='stock');
  (TRUCK_DRAW[model]||TRUCK_DRAW.pickup)(c,P);
  c.fillStyle='#fff';c.fillRect(34,9,6,6);c.fillStyle='#4bc26a';c.fillRect(35,10,4,4);
  return cv;}
// ---- the panel (a page of the pause menu)
const custIcons={};
// the person exactly as drawPlayer paints them (facing right, standing still): shirt, seams, then the hat on top
function drawAvatar(g,x,by,p,noHat){
  g.fillStyle='rgba(0,0,0,.3)';pellipse(g,x+1,by+4,6,3);
  g.fillStyle=p.shirt[0];pcircle(g,x,by+1,5);g.fillStyle=p.shirt[1];pcircle(g,x,by,4);patCircle(g,x,by,4,p.sp,p.spc);
  g.fillStyle=p.shirt[2];g.fillRect(x-4,by,9,1);g.fillRect(x-1,by-4,1,9);g.fillRect(x+2,by-3,1,7);
  g.fillStyle=p.shirt[3];g.fillRect(x-3,by-3,2,1);
  if(noHat)return;
  const hy=by-2;
  g.fillStyle=p.cap[0];pcircle(g,x,hy+1,3);g.fillStyle=p.cap[1];pcircle(g,x,hy,3);patCircle(g,x,hy,3,p.cp,p.cpc);g.fillStyle=p.cap[2];g.fillRect(x-2,hy-2,2,1);
  g.fillStyle=p.cap[1];g.fillRect(x-1,Math.round(hy+3.5)-1,2,2);g.fillRect(x-1,Math.round(hy-3.5)-1,2,2);
  g.fillStyle=p.cap[3];g.fillRect(Math.round(x+3.5)-1,hy-1,3,3);g.fillStyle=p.cap[2];g.fillRect(Math.round(x+4)-1,hy-1,2,2);
}
// what a shirt or hat card shows: that item worn with the rest of the current outfit
function custLook(k,id){const cur0=lookPal(),it=custItem(k,id).pal;
  return k==='shirt'?{...cur0,shirt:it.sh,sp:it.pat||null,spc:it.pc}:{...cur0,cap:it.cp,cp:it.pat||null,cpc:it.pc};}
function custIcon(k,it){
  const key=k+':'+it.id+':'+(k==='shirt'?'':CUST.shirt)+':'+(k==='hat'?CUST.hat:'')+(k==='paint'||k==='truck'?':'+CUST.truck+':'+CUST.paint:'');if(custIcons[key])return custIcons[key];
  let cv;
  if(k==='shirt'||k==='hat'){cv=mk(24,24);drawAvatar(cv.getContext('2d'),11,k==='shirt'?12:14,custLook(k,it.id),k==='shirt');}
  else if(k==='truck')cv=truckSprite(it.id,CUST.paint);
  else cv=truckSprite(CUST.truck,it.id);
  return custIcons[key]=cv.toDataURL();}
// the whole current outfit, drawn small and enlarged with CSS
function custPerson(){const cv=mk(24,24);drawAvatar(cv.getContext('2d'),11,14,lookPal());return cv.toDataURL();}
function custHTML(){
  const m=withPl(players[0],()=>money);
  const card=(k,it,img,cls)=>{const own=custOwned(k,it.id),eq=CUST[k]===it.id;
    return`<button class="ccard ${cls||''} ${eq?'eq':''} ${!own&&m<it.price?'poor':''}" data-ci="${k}:${it.id}"><img src="${custIcon(k,it)}" alt=""><span class="cn">${it.name||'&nbsp;'}</span><b class="cp">${eq?'EQUIPPED':own?'EQUIP':fmt$(it.price)}</b></button>`;};
  const row=(title,k,cls)=>`<div class="cgroup"><div class="sect">${title}</div><div class="crow">${CUST_ITEMS[k].map(it=>card(k,it,null,cls)).join('')}</div></div>`;
  return`<h2>CUSTOMIZATION</h2>
    <div class="cprev"><img class="cperson" src="${custPerson()}" alt=""><img class="ctruck" src="${truckSprite(CUST.truck,CUST.paint).toDataURL()}" alt=""><b class="cmoney">${fmt$(m)}</b></div>
    <div class="cwrap"><div class="chalf"><div class="chead">YOU</div>${row('SHIRT','shirt','sq')}${row('HAT','hat','sq')}</div>
    <div class="chalf"><div class="chead">TRUCK</div>${row('MODEL','truck')}${row('PAINT','paint')}</div></div>`;}
function custClick(k,id){
  const it=custItem(k,id);if(!it)return;
  if(!custOwned(k,id)){
    const m=withPl(players[0],()=>money);
    if(m<it.price){blip(150,.15,'sawtooth',.04,90);return;}
    withPl(players[0],()=>{money-=it.price;});CUST.own.push(k+':'+id);chaChing();}
  CUST[k]=id;applyLook();save();blip(660,.05,'square',.05);
}
