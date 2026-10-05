'use strict';
// ============================================================ utils
const mk=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const rnd=mulberry((Math.random()*1e9)|0);
function hash(x,y){let h=(x*374761393+y*668265263)|0;h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967296;}
function vnoise(x,y){const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi,u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf);
  const a=hash(xi,yi),b=hash(xi+1,yi),c=hash(xi,yi+1),d=hash(xi+1,yi+1);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;}
function fbm(x,y){return vnoise(x,y)*.6+vnoise(x*2.1+17,y*2.1+5)*.3+vnoise(x*4.3+3,y*4.3+11)*.1;}
const BAYER=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5].map(v=>(v+.5)/16);
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
function hexA(h,a=255){const n=parseInt(h.slice(1),16);return(((a&255)<<24)|((n&255)<<16)|(n&0xff00)|((n>>16)&255))>>>0;}
function shade32(v,k){const r=Math.min(255,(v&255)*k)|0,g=Math.min(255,((v>>8)&255)*k)|0,b=Math.min(255,((v>>16)&255)*k)|0;return((255<<24)|(b<<16)|(g<<8)|r)>>>0;}
function shadeHex(h,k){const n=parseInt(h.slice(1),16);const f=v=>clamp(Math.round(v*k),0,255).toString(16).padStart(2,'0');return'#'+f(n>>16)+f((n>>8)&255)+f(n&255);}
function pcircle(c,x,y,r){for(let dy=-r;dy<=r;dy++){const w=Math.round(Math.sqrt(r*r-dy*dy));c.fillRect(x-w,y+dy,w*2+1,1);}}
function pellipse(c,x,y,rx,ry){for(let dy=-ry;dy<=ry;dy++){const w=Math.round(rx*Math.sqrt(1-(dy*dy)/(ry*ry)));c.fillRect(x-w,y+dy,w*2+1,1);}}
function pline(c,x0,y0,x1,y1,t){const d=Math.ceil(Math.max(Math.abs(x1-x0),Math.abs(y1-y0)));for(let i=0;i<=d;i++){const k=d?i/d:0;c.fillRect(Math.round(x0+(x1-x0)*k),Math.round(y0+(y1-y0)*k),t,t);}}
const fmt$=n=>(n<0?'-$':'$')+Math.abs(Math.round(n)).toLocaleString('en-US');
const inRect=(r,x,y,m=0)=>x>=r.x0-m&&x<r.x1+m&&y>=r.y0-m&&y<r.y1+m;
const rectsHit=(a,b,m=0)=>a.x0<b.x1+m&&a.x1>b.x0-m&&a.y0<b.y1+m&&a.y1>b.y0-m;
const ease=t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
