'use strict';
// ============================================================ background
let bg;
// litter, cracks and potholes along Birch Lane; flowers and little clipped boxwoods along the Willow Heights verges.
// Painted straight into the background, so it's just scenery
function decorateStreets(px,WW,hoodN){
  const put=(x,y,col)=>{x|=0;y|=0;if(x>=0&&y>=0&&x<WW&&y<H&&REG[y*WW+x]&&REG[y*WW+x]!==4)px[y*WW+x]=hexA(col);};
  const LITTER=[[[0,0,'#c9352b'],[1,0,'#c9352b'],[2,0,'#c8ccd0']],[[0,0,'#e8e4d8'],[1,0,'#d8d4c8'],[0,1,'#b8b4a8'],[1,1,'#e8e4d8']],
    [[0,0,'#ff9800'],[1,0,'#ffcf4a'],[2,0,'#ff9800'],[0,1,'#c86a00'],[1,1,'#ff9800'],[2,1,'#c86a00']],[[0,0,'#2f6a34'],[1,0,'#3a7a3a'],[2,0,'#8fcb8f']],
    [[0,0,'#f4f1e8'],[1,0,'#f4f1e8'],[0,1,'#c9352b'],[1,1,'#f4f1e8']],[[0,0,'#2a5d9f'],[1,0,'#c8ccd0']]];
  const FLW=['#ff5f8f','#ffd84a','#fff3d6','#b06cff','#ff8a3a'];
  for(let y=3;y<H-3;y+=5)for(let x=3;x<WW-3;x+=5){
    const i=y*WW+x,g=REG[i];if(!g||g===4)continue;const hd=hoodN(NEAR[i]),r=hash(x*13+5,y*7+11),r2=hash(y*3+1,x*5+9);
    if(hd===0){
      if(g===3&&r<.07){let cx=x,cy=y;const rd=ROADS[NEAR[i]],ax=rd&&rd.h?1:0;for(let k=0;k<4+r2*7;k++){put(cx,cy,'#7f796f');const q=hash(cx*3+k,cy*7);if(ax){cx+=q<.6?1:0;cy+=q<.3?-1:q>.8?1:0;}else{cy+=q<.6?1:0;cx+=q<.3?-1:q>.8?1:0;}}}
      else if((g===3||g===2)&&r<.105){for(const [dx,dy,c] of LITTER[(r2*LITTER.length)|0])put(x+dx,y+dy,c);}
      else if(g===2&&r<.15){put(x,y,'#ffd84a');put(x,y+1,'#4f8a3c');}
      else if(g===1&&r<.008){const near=[-6,6].some(o=>REG[(y+o)*WW+x]!==1||REG[y*WW+x+o]!==1);if(!near){for(let dy=-1;dy<=1;dy++)for(let dx=-2;dx<=2;dx++)if(Math.abs(dx)+Math.abs(dy)<3)put(x+dx,y+dy,dy<0?'#1e2023':'#26282c');put(x-1,y+1,'#55585e');put(x+1,y+1,'#55585e');}}
    }else if(hd===2&&g===2){
      if(r<.05){for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)if(dx*dx+dy*dy<=5)put(x+dx,y+dy,dy<0&&dx<1?'#5aa848':dy>0?'#1f4a1c':'#2f6a2a');put(x-1,y-1,'#8fcb5f');}
      else if(r<.16){const c=FLW[(r2*FLW.length)|0];put(x,y,c);put(x+1,y+1,c);put(x-1,y+1,'#3a7a30');put(x+1,y,'#fff3d6');}
    }
  }
}
function buildBackground(){
  const WW=WORLD_W;bg=mk(WW,H);const c=bg.getContext('2d');c.imageSmoothingEnabled=false;
  let img=c.createImageData(WW,H),px=new Uint32Array(img.data.buffer);
  const WOOD=['#16291a','#1c3320','#23402a','#2c4f30','#355c36'].map(h=>hexA(h)),WOODA=[hexA('#5a2e16'),hexA('#7a4020'),hexA('#8a6a1c')];
  const HEDGE=['#244a24','#2f5a2a','#3d7334','#4d8a3e'].map(h=>hexA(h));
  // each neighborhood's street: Birch Lane's is worn (faded paint, patched asphalt, slabs gone dark, scrubby verges),
  // Maple Avenue's is as it was, and Willow Heights' is fresh (dark smooth asphalt with edge lines, pale pavers, lush grass)
  const HV=[
    {SW:['#b8b2a6','#aca598','#c1baae'],SWJ:'#87817a',RD:['#464950','#4d5057','#3f4248'],VG:['#56682e','#617436','#4c6a2c'],dash:'#c8ad52',pline:'#7c8088'},
    {SW:['#bdb6aa','#b3ac9f','#c7c0b4'],SWJ:'#8f897f',RD:['#3b3f46','#42464e','#34383e'],VG:['#3a6a30','#447a36','#4f8a3c'],dash:'#e8c24a',pline:'#8a8e96'},
    {SW:['#d4cec2','#ccc5b8','#dcd6ca'],SWJ:'#a8a296',RD:['#2c3036','#31353b','#292d32'],VG:['#3f8a38','#4a9a3e','#56a844'],dash:'#f2cf4a',pline:'#e8e4d8'},
  ].map(h=>({SW:h.SW.map(v=>hexA(v)),SWJ:hexA(h.SWJ),RD:h.RD.map(v=>hexA(v)),VG:h.VG.map(v=>hexA(v)),DASH:hexA(h.dash),PLINE:hexA(h.pline)}));
  const CURB=hexA('#d8d2c6'),PATCH=hexA('#35383d'),PATCHE=hexA('#2c2f33'),SLAB=hexA('#a39c8f'),DIRT=[hexA('#6a5a3a'),hexA('#7a6842')],EDGE=hexA('#e8e4d8');
  const DR=[hexA('#aaa398'),hexA('#a19a8f'),hexA('#b4ada2')];
  const LANE=Math.round(RH*.45),reg=(x,y)=>x<0||y<0||x>=WW||y>=H?0:REG[y*WW+x];
  const hoodN=n=>n<ROADS.length?ROADS[n].hood:CIRCLES[n-ROADS.length].hood;
  for(let y=0;y<H;y++)for(let x=0;x<WW;x++){
    const i=y*WW+x,g=REG[i],r=hash(x*7+1,y*13+3);let v;
    if(g&&g!==4){const hd=hoodN(NEAR[i]),K=HV[hd];
      if(g===1){
        v=K.RD[r<.15?1:r<.3?2:0];
        // Birch Lane: squares of patched asphalt
        if(hd===0){const cx=Math.floor(x/22),cy=Math.floor(y/16),hp=hash(cx*7+3,cy*11+5);
          if(hp<.12){const ix=x-cx*22,iy=y-cy*16,w2=8+((hp*120)|0)%12,h2=5+((hp*530)|0)%9;if(ix>=2&&iy>=2&&ix<2+w2&&iy<2+h2)v=ix===2||iy===2||ix===1+w2||iy===1+h2?PATCHE:PATCH;}}
        if(reg(x-1,y)!==1||reg(x+1,y)!==1||reg(x,y-1)!==1||reg(x,y+1)!==1)v=CURB;
        else{const ni=NEAR[i],rd=ROADS[ni];
          // lane markings only on the straight runs, not in intersections or the cul-de-sac (worn away in places on Birch Lane)
          if(rd&&!ROADS.some(o=>o!==rd&&x>=o.x0&&x<o.x1&&y>=o.y0&&y<o.y1)){
            const q=rd.h?y-rd.c:x-rd.c,t=rd.h?x:y,worn=hd===0&&hash(t>>3,q*3+11)<.3;
            if((q===-1||q===0)&&(t%28)<14&&!worn)v=K.DASH;
            if((q===-LANE||q===LANE)&&(t%10)<2&&!worn)v=K.PLINE;
            // Willow Heights: a crisp white line just in from each curb
            if(hd===2&&(q===-(RH-5)||q===RH-5))v=EDGE;
          }}
      }else if(g===2){v=K.VG[r<.3?0:r<.7?1:2];if(hd===0&&vnoise(x*.12+31,y*.12)>.66)v=DIRT[r<.5?0:1];}
      else{v=K.SW[r<.2?1:r<.3?2:0];const rd=ROADS[NEAR[i]];
        const t=rd?(rd.h?x:y):0,slab=rd?Math.floor(t/26):0;
        if(hd===0&&rd&&hash(slab*7+3,rd.c)<.22)v=r<.5?SLAB:K.SW[1];
        if(rd&&(t%26===0||(hd===2&&t%13===0)))v=K.SWJ;
        if(!rd){const cc=CIRCLES[NEAR[i]-ROADS.length];if((Math.round(Math.atan2(y-cc.y,x-cc.x)*cc.r*.55))%(hd===2?3:6)===0)v=K.SWJ;}
        const o=[reg(x-1,y),reg(x+1,y),reg(x,y-1),reg(x,y+1)];if(o.includes(0)||o.includes(4))v=K.SWJ;}
    }
    else{const n=vnoise(x*.07,y*.07)*.7+vnoise(x*.2,y*.2)*.3+BAYER[(y&3)*4+(x&3)]*.12;v=WOOD[clamp(((n-.15)*5)|0,0,4)];
      if(vnoise(x*.05+40,y*.05)>.72&&r<.6)v=WOODA[(r*5|0)%3];}
    px[i]=v;
  }
  // hedges ring each yard where it backs onto the woods
  for(const L of ALL_LOTS){const m=12;
    for(let y=Math.max(0,L.y0-m);y<Math.min(H,L.y1+m);y++)for(let x=Math.max(0,L.x0-m);x<Math.min(WW,L.x1+m);x++){
      if(REG[y*WW+x]!==0)continue;const n=vnoise(x*.3,y*.3)*.7+hash(x,y)*.3;px[y*WW+x]=HEDGE[clamp((n*4)|0,0,3)];}
    for(const a of L.aprons)for(let y=a.y0;y<a.y1;y++)for(let x=a.x0;x<a.x1;x++){const i=y*WW+x;if(REG[i]===2){const r=hash(x*3,y*11);px[i]=DR[r<.2?1:r<.3?2:0];}}
  }
  decorateStreets(px,WW,hoodN);
  c.putImageData(img,0,0);
  const layers=ALL_LOTS.map(L=>renderLot(L));
  ALL_LOTS.forEach((L,i)=>blitLot(c,layers[i][0],L));
  // world-space shadows so the sun comes from the same side on every street
  img=c.getImageData(0,0,WW,H);px=new Uint32Array(img.data.buffer);
  const dark=(x,y,k)=>{if(x>=0&&y>=0&&x<WW&&y<H)px[y*WW+x]=shade32(px[y*WW+x],k);};
  for(const t of TREES){
    const sx=t.x+8,sy=t.y+6,rx=t.r*1.05,ry=t.r*.72;
    for(let y=Math.floor(sy-ry);y<=sy+ry;y++)for(let x=Math.floor(sx-rx);x<=sx+rx;x++){
      const d=((x-sx)/rx)**2+((y-sy)/ry)**2+(vnoise(x*.2,y*.2)-.5)*.35;
      if(d<1)dark(x,y,d>.85&&BAYER[(y&3)*4+(x&3)]>.5?.86:.74);
    }
  }
  for(const L of ALL_LOTS)for(const h of [L.house,...(L.structs||[])])for(let y=h.y0+7;y<h.y1+8;y++)for(let x=h.x0+7;x<h.x1+8;x++)dark(x,y,.68);
  c.putImageData(img,0,0);
  ALL_LOTS.forEach((L,i)=>blitLot(c,layers[i][1],L));
  for(const t of TREES){c.fillStyle='#3a2416';pcircle(c,t.x,t.y,5);c.fillStyle='#6b4428';pcircle(c,t.x,t.y,4);c.fillStyle='#8a5a36';c.fillRect(t.x-2,t.y-3,2,2);}
}
// paint a lot in its local frame: [ground layer, overlay layer (house, fence, props)]
function renderLot(L){
  const {w,d}=L,g=mk(w,d),gc=g.getContext('2d'),img=gc.createImageData(w,d),px=new Uint32Array(img.data.buffer);
  // Birch Lane lawns are tired (yellowing, with bare patches and dandelions); Willow Heights lawns are deep green and
  // mown in sharp stripes
  const hd=L.hood??1,G=(hd===0?['#4a7032','#557a36','#62853c','#6e8e40','#7c9846']:hd===2?['#3a7a32','#438a38','#4d983e','#58a846','#64b450']:['#3d7532','#478537','#51943d','#5ca343','#69b04b']).map(h=>hexA(h));
  const TUFT=hexA('#33662b'),TUFTL=hexA('#8fcb5f'),FL1=hexA('#fff3d6'),FL2=hexA('#ffd84a'),BARE=[hexA('#7a6a44'),hexA('#6a5a3a'),hexA('#8a7a4e')];
  const DR=[hexA('#aaa398'),hexA('#a19a8f'),hexA('#b4ada2')],DRJ=hexA('#8a847a');
  const sw=20+L.style*2,ox=L.ox*3+L.li*977,oy=L.oy*3,stripe=hd===2?.16:hd===0?.05:.1;
  for(let y=0;y<d;y++)for(let x=0;x<w;x++){
    const r=hash(x*7+1+ox,y*13+3+oy);let n=fbm((x+ox)*.025,(y+oy)*.025)*.75+r*.3;
    if(((x/sw)|0)&1)n+=stripe;
    let v=G[clamp(((n-.2+BAYER[(y&3)*4+(x&3)]*.14)*4.2)|0,0,4)];
    if(r>.985)v=TUFT;else if(r>.978)v=TUFTL;if(r<.0007)v=FL1;else if(r<.0012)v=FL2;
    if(hd===0){const b=vnoise((x+ox)*.06+5,(y+oy)*.06);if(b>.77)v=BARE[r<.4?0:r<.8?1:2];else if(r<.004)v=FL2;}
    px[y*w+x]=v;
  }
  const P=L.lpaved;
  for(const p of P)for(let y=p.y0;y<p.y1;y++)for(let x=p.x0;x<p.x1;x++){
    const r=hash(x*3+ox,y*11+oy);let v=DR[r<.2?1:r<.3?2:0];
    if(p.kind==='path'){if((y-p.y0)%9===8||x===p.x0||x===p.x1-1)v=DRJ;}
    else if((y-p.y0)%34===33)v=DRJ;
    px[y*w+x]=v;
  }
  for(const p of P)if(p.kind!=='path'){for(let y=p.y0;y<p.y1;y++){for(const x of [p.x0,p.x1-1]){let inner=false;for(const q of P)if(q!==p&&q.kind!=='path'&&x>=q.x0&&x<q.x1&&y>=q.y0&&y<q.y1&&!(x===q.x0||x===q.x1-1))inner=true;if(!inner)px[y*w+x]=DRJ;}}}
  for(const z of L.lz)if(z.above)for(let y=Math.max(0,Math.floor(z.cy-z.ry+2));y<Math.min(d,Math.ceil(z.cy+z.ry+5));y++)for(let x=Math.max(0,Math.floor(z.cx-z.rx+1));x<Math.min(w,Math.ceil(z.cx+z.rx+4));x++){
    const dx=(x+.5-z.cx-3)/(z.rx+1),dy=(y+.5-z.cy-4)/(z.ry+1);if(dx*dx+dy*dy<1)px[y*w+x]=shade32(px[y*w+x],.68);}
  for(const z of L.lz)paintZone(px,w,d,z);
  gc.putImageData(img,0,0);
  const o=mk(w,d),oc=o.getContext('2d');drawLotDeco(oc,L);drawHouse(oc,L);drawFence(oc,L);
  return[g,o];
}
function blitLot(c,can,L){
  const {ox,oy,w,d,rot}=L;c.save();
  if(rot===0)c.translate(ox,oy);else if(rot===2){c.translate(ox+w,oy+d);c.rotate(Math.PI);}
  else if(rot===1){c.translate(ox+d,oy);c.rotate(Math.PI/2);}else{c.translate(ox,oy+w);c.rotate(-Math.PI/2);}
  c.drawImage(can,0,0);c.restore();
}
function paintZone(px,WW,HH,z){
  const b=zoneBox(z),x0=Math.max(0,Math.floor(b.x0)),y0=Math.max(0,Math.floor(b.y0)),x1=Math.min(WW,Math.ceil(b.x1)),y1=Math.min(HH,Math.ceil(b.y1));
  const MUL=['#3e2618','#4a2e1e','#583824','#6b4a30'].map(h=>hexA(h)),MEDGE=hexA('#2a180e'),CHIP=hexA('#8a6240');
  const NAT=['#56752f','#63843a','#739442','#86a04a'].map(h=>hexA(h)),NATD=hexA('#43602a'),NF=[hexA('#e8d25a'),hexA('#d86a9a'),hexA('#fff3d6'),hexA('#b07ae0')],STONE=hexA('#7a7468');
  const TILE=[hexA('#c4baa8'),hexA('#b8ae9c'),hexA('#cfc6b4')],GROUT=hexA('#8a8274'),PEDGE=hexA('#6e675c');
  const DECKW=[hexA('#a0703e'),hexA('#94663a'),hexA('#ad7c48')],DECKJ=hexA('#5a3a1a'),BRICK=[hexA('#a2553e'),hexA('#b0654a'),hexA('#934c38')],MORTAR=hexA('#9a8c7c');
  const STONES=[hexA('#9a948a'),hexA('#aaa398'),hexA('#8c8678'),hexA('#b4ac9c')],SGROUT=hexA('#5d5a52'),L_SEED=17;
  const AWALL=hexA('#b8c8d4'),AWALLS=hexA('#93a6b4'),AWALLD=hexA('#4a5a66'),AWALLL=hexA('#e8f2f8');
  const DECK=[hexA('#e0dccf'),hexA('#d4cfc1'),hexA('#e8e4d8')],DECKE=hexA('#9d978a'),WAT=[hexA('#2f93c4'),hexA('#3aa2d2'),hexA('#46afdc')],WLINE=hexA('#2a86b8'),WEDGE=hexA('#1f6a94');
  const SOIL=[hexA('#4a3222'),hexA('#553a28')],LEAFG=[hexA('#3f7a34'),hexA('#5a9a40'),hexA('#2f6a2a')],GF=[hexA('#ff5f8f'),hexA('#ffd84a'),hexA('#fff3d6'),hexA('#b06cff'),hexA('#ff8a3a')],PICKET=hexA('#ece8de'),PICKET2=hexA('#c8c2b4');
  for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
    if(!inZone(z,x+.5,y+.5))continue;
    let edge;
    if(z.shape==='e'){const dx=(x+.5-z.cx)/z.rx,dy=(y+.5-z.cy)/z.ry;edge=(1-Math.sqrt(dx*dx+dy*dy))*Math.min(z.rx,z.ry)<1.5;}
    else if(z.shape==='q'){const dx=(x+.5-z.ax)/(z.x1-z.x0),dy=(y+.5-z.ay)/(z.y1-z.y0);edge=(1-Math.sqrt(dx*dx+dy*dy))*Math.min(z.x1-z.x0,z.y1-z.y0)<1.5;}
    else edge=x===z.x0||x===z.x1-1||y===z.y0||y===z.y1-1;
    const r=hash(x*3+7,y*5+1);let v;
    if(z.type==='mulch'){v=MUL[r<.25?0:r<.6?1:r<.85?2:3];if(r>.97)v=CHIP;
      // a planted bed: little leafy clumps dotted with flowers
      if(z.fl){const cx=x%9,cy=(y+((x/9|0)&1)*4)%8;if(cx<3&&cy<2)v=LEAFG[(cx+cy)%3];if(cx===1&&cy===0)v=GF[((x/9|0)+(y/8|0))%5];}
      if(edge)v=MEDGE;}
    else if(z.type==='natural'){const n=vnoise(x*.25,y*.25);v=NAT[clamp((n*3+r*1.2)|0,0,3)];if(((x+y*3)%7===0)&&r>.5)v=NATD;if(r>.992)v=NF[(r*1000|0)%4];if(edge&&(x+y)%3===0)v=STONE;}
    else if(z.type==='pool'){
      // how far in from the edge: straight in for a square pool, along the radius for a round one
      const e=z.shape==='e'?Math.floor((1-Math.hypot((x+.5-z.cx)/z.rx,(y+.5-z.cy)/z.ry))*Math.min(z.rx,z.ry)):Math.min(x-z.x0,z.x1-1-x,y-z.y0,z.y1-1-y);
      if(z.above&&e<COPE){const top=y+.5<z.cy;v=e===0?AWALLD:e===COPE-1?AWALLL:top?AWALL:AWALLS;}
      else if(e<COPE)v=e===0?DECKE:(x+y*2)%7===0?DECK[1]:DECK[r<.15?2:0];
      else{const n=vnoise(x*.12,y*.12);v=WAT[clamp((n*2.6+r*.5)|0,0,2)];
        if(((x-z.x0-COPE)%12===11||(y-z.y0-COPE)%12===11)&&r>.25)v=WLINE;if(e===COPE)v=WEDGE;}}
    else if(z.type==='patio'){const lx=x-Math.floor(z.x0),ly=y-Math.floor(z.y0),m=z.mat||'tile';
      if(m==='deck'){const b=(ly/4)|0;v=DECKW[(b+((hash(b,((lx+b*7)/18)|0)*3)|0))%3];if(ly%4===3||(lx+b*7)%18===0)v=DECKJ;if(edge)v=DECKJ;}
      else if(m==='brick'){const row=(ly/3)|0,bx=(lx+(row&1)*3)%7;v=BRICK[(hash(((lx+(row&1)*3)/7)|0,row)*3)|0];if(bx===0||ly%3===2)v=MORTAR;if(edge)v=PEDGE;}
      else if(m==='stone'){// flagstones: the nearest of a jittered grid of points, with grout where two stones meet
        const gx=Math.floor(lx/11),gy=Math.floor(ly/11);let d1=1e9,d2=1e9,id=0;
        for(let j=-1;j<=1;j++)for(let i=-1;i<=1;i++){const px=(gx+i)*11+hash(gx+i,gy+j+L_SEED)*11,py=(gy+j)*11+hash(gy+j+5,gx+i)*11,dd=(lx-px)**2+(ly-py)**2;if(dd<d1){d2=d1;d1=dd;id=(gx+i)*31+(gy+j);}else if(dd<d2)d2=dd;}
        v=STONES[(hash(id,7)*4)|0];if(Math.sqrt(d2)-Math.sqrt(d1)<1.3)v=SGROUT;if(edge)v=PEDGE;}
      else{const tx=lx%10,ty=ly%10;v=TILE[(((lx)/10|0)+((ly)/10|0))%2?1:r<.1?2:0];if(tx===0||ty===0)v=GROUT;if(edge)v=PEDGE;}}
    else{const ry=(y-z.y0)%8;v=SOIL[r<.5?0:1];if(ry>=2&&ry<=4&&x>z.x0+2&&x<z.x1-3){v=LEAFG[(r*3)|0];if(((x-z.x0)%6===3)&&ry===3)v=GF[(((y-z.y0)/8|0)+((x-z.x0)/6|0))%5];}if(edge)v=((x+y)&1)?PICKET:PICKET2;}
    px[y*WW+x]=v;
  }
}
function drawShrub(c,x,y,r){
  c.fillStyle='rgba(0,0,0,.28)';pellipse(c,x+2,y+2,r,Math.max(2,Math.round(r*.7)));
  c.fillStyle='#1f3d1a';pcircle(c,x,y,r);c.fillStyle='#2f5a26';pcircle(c,x,y-1,r-1);c.fillStyle='#3f7a34';pcircle(c,x-1,y-2,Math.max(1,r-3));
  c.fillStyle='#5a9a40';for(let k=0;k<r*2;k++){const a=hash(k,x*3+y)*Math.PI*2,d=hash(y*5+k,x)*(r-2);c.fillRect(Math.round(x+Math.cos(a)*d),Math.round(y-1+Math.sin(a)*d*.8),1,1);}
  c.fillStyle='#8fcb5f';c.fillRect(x-Math.round(r*.4),y-Math.round(r*.6),2,1);
}
function drawLotDeco(c,L){
  for(const b of L.lshrubs||[])drawShrub(c,b.x,b.y,b.r);
  for(const z of L.lz){
    // a fountain: a stone basin in the middle of a round pool set into the ground
    if(z.type==='pool'&&z.shape==='e'&&!z.above){const fx=Math.round(z.cx),fy=Math.round(z.cy);c.fillStyle='rgba(0,0,0,.25)';pcircle(c,fx+1,fy+2,6);c.fillStyle='#8c8678';pcircle(c,fx,fy,6);c.fillStyle='#b4ac9c';pcircle(c,fx,fy-1,5);
      c.fillStyle='#46afdc';pcircle(c,fx,fy-1,3);c.fillStyle='#8c8678';pcircle(c,fx,fy-2,1);c.fillStyle='#e8f6ff';c.fillRect(fx,fy-5,1,2);c.fillRect(fx-2,fy-3,1,1);c.fillRect(fx+2,fy-3,1,1);}
    if(z.above){const lx=Math.round(z.cx-3),ly=Math.round(z.cy+z.ry-5);c.fillStyle='#5d656d';c.fillRect(lx,ly,1,8);c.fillRect(lx+6,ly,1,8);c.fillStyle='#e8eef2';c.fillRect(lx,ly-1,1,8);c.fillRect(lx+6,ly-1,1,8);
      c.fillStyle='rgba(232,238,242,.75)';for(let k=1;k<8;k+=3)c.fillRect(lx,ly+k,7,1);}
    if(z.shape!=='r')continue;

    if(z.type==='pool'){const lx=z.x1-COPE-14,ly=z.y0;
      c.fillStyle='#5d656d';c.fillRect(lx,ly-1,1,5);c.fillRect(lx+6,ly-1,1,5);c.fillStyle='#e8eef2';c.fillRect(lx,ly-2,1,5);c.fillRect(lx+6,ly-2,1,5);
      c.fillStyle='rgba(232,238,242,.55)';c.fillRect(lx,ly+4,7,1);c.fillRect(lx,ly+7,7,1);}
    if(z.type==='natural'){for(let i=0;i<4;i++){const x=Math.round(z.x0+6+hash(i,z.x0)*(z.x1-z.x0-12)),y=Math.round(z.y0+6+hash(z.y0,i)*(z.y1-z.y0-12));c.fillStyle='#5d5a57';c.fillRect(x,y,4,3);c.fillStyle='#8f8a84';c.fillRect(x,y,3,1);}
      const lx=Math.round(z.x0+(z.x1-z.x0)*.3),ly=Math.round(z.y1-10);c.fillStyle='#4a2e1b';c.fillRect(lx,ly,18,4);c.fillStyle='#7a5236';c.fillRect(lx,ly,18,2);c.fillStyle='#c2a070';c.fillRect(lx+17,ly,2,4);}
  }
  for(const f of L.lfurn||[])drawFurniture(c,f,L);
  const pumpkin=(x,y,r)=>{c.fillStyle='#8a3d0c';pcircle(c,x,y+1,r);c.fillStyle='#ea7a1c';pcircle(c,x,y,r);c.fillStyle='#ffab4d';c.fillRect(x-r+2,y-r+1,2,1);
    c.fillStyle='#b8560f';c.fillRect(x-1,y-r+1,1,r*2-1);c.fillRect(x+2,y-r+2,1,r*2-3);c.fillStyle='#3d6a24';c.fillRect(x,y-r-1,2,2);};
  for(const d of L.deco)if(d.t==='pumpkin')pumpkin(d.x,d.y,4);
  // Birch Lane: a wheelie bin out by the mailbox with junk round it, and a few bits of litter blown into the yard.
  // Willow Heights: little lamps lining the front walk
  if(L.hood===0){const bx=L.lmailbox.x+14,by=L.d-12;if(bx<L.w-12){c.fillStyle='rgba(0,0,0,.3)';c.fillRect(bx+1,by+1,7,9);c.fillStyle='#1d2f3a';c.fillRect(bx,by,7,9);c.fillStyle='#2f4a5a';c.fillRect(bx,by,7,2);c.fillStyle='#3d5a6a';c.fillRect(bx+1,by,5,1);
      c.fillStyle='#e8e4d8';c.fillRect(bx+8,by+7,2,2);c.fillStyle='#c9352b';c.fillRect(bx-3,by+8,2,1);}
    for(let k=0;k<4;k++){const lx=10+Math.floor(hash(k,L.k*5+3)*(L.w-20)),ly=10+Math.floor(hash(L.k*9+1,k*3)*(L.d-20));if(inRect(L.lhouse,lx,ly,3)||L.lz.some(z=>z.type==='pool'&&inRect(zoneBox(z),lx,ly,2)))continue;
      c.fillStyle=['#e8e4d8','#c9352b','#ff9800','#2a5d9f'][k];c.fillRect(lx,ly,2,1);c.fillStyle='#b8b4a8';c.fillRect(lx,ly+1,1,1);}}
  // (the walk lamps and the mailbox are drawn upright in the world, not painted into the yard: a yard facing north is
  // painted upside down, and they'd stand on their heads)
  const dx=L.ldoor.x,dy=L.ldoor.y;c.fillStyle='#a79e8c';c.fillRect(dx-9,dy+1,18,7);c.fillStyle='#cfc6b3';c.fillRect(dx-9,dy+1,18,5);c.fillStyle='#fe5f55';c.fillRect(dx-5,dy+2,10,2);
}
// an apartment block from above: a flat roof with a parapet, its rooftop clutter in the style of the neighborhood
function drawApartment(c,L){
  const h=L.lhouse,x=h.x0,y=h.y0,w=h.x1-h.x0,hh=h.y1-h.y0,hd=L.hood,R=(i,j)=>hash(i*7+L.k,j*13+3);
  const roof=hd===0?['#4a4a48','#3e3e3c','#565654']:hd===2?['#c8ccd0','#bcc0c4','#d4d8dc']:['#8a8a86','#7e7e7a','#969692'];
  c.fillStyle='#1e1414';c.fillRect(x-2,y-2,w+4,hh+4);
  for(let yy=0;yy<hh;yy++)for(let xx=0;xx<w;xx++){const r=R(xx,yy);c.fillStyle=roof[r<.6?0:r<.82?1:2];c.fillRect(x+xx,y+yy,1,1);}
  // parapet
  c.fillStyle=hd===0?'#7a4a3a':hd===2?'#e8eef2':'#b8b2a6';c.fillRect(x,y,w,2);c.fillRect(x,y,2,hh);c.fillRect(x+w-2,y,2,hh);c.fillRect(x,y+hh-2,w,2);
  c.fillStyle=hd===0?'#5a3428':hd===2?'#9aa0a4':'#8f897d';c.fillRect(x+2,y+2,w-4,1);
  const box=(bx,by,bw,bh,col,top)=>{c.fillStyle='rgba(0,0,0,.3)';c.fillRect(bx+2,by+2,bw,bh);c.fillStyle='#2a2e33';c.fillRect(bx-1,by-1,bw+2,bh+2);c.fillStyle=col;c.fillRect(bx,by,bw,bh);c.fillStyle=top;c.fillRect(bx,by,bw,1);};
  const ac=(ax,ay)=>{box(ax,ay,8,7,'#8f989e','#c8ccd0');c.fillStyle='#2a2e33';pcircle(c,ax+4,ay+4,2);c.fillStyle='#5d656d';c.fillRect(ax+3,ay+3,2,2);};
  if(hd===0){
    // Birch Court: tar and gravel, puddle stains, window AC units, a stair bulkhead, a water tank and a fire escape
    c.fillStyle='rgba(20,20,20,.35)';for(let k=0;k<5;k++){const sx=x+6+Math.floor(R(k,1)*(w-24)),sy=y+6+Math.floor(R(1,k)*(hh-20));pellipse(c,sx+6,sy+4,6,3);}
    box(x+w-24,y+8,16,12,'#6a5a4a','#8a7a6a');c.fillStyle='#3a2a1a';c.fillRect(x+w-20,y+18,6,2);
    ac(x+10,y+10);ac(x+22,y+hh-22);ac(x+w-30,y+hh-26);
    c.fillStyle='#5a4a3a';pcircle(c,x+w/2|0,y+18,7);c.fillStyle='#7a6a5a';pcircle(c,x+w/2|0,y+17,6);c.fillStyle='#4a3a2a';for(let k=-5;k<=5;k+=3)c.fillRect((x+w/2|0)+k,y+12,1,11);
    c.fillStyle='#e8eef2';pcircle(c,x+14,y+hh-12,3);c.fillStyle='#9aa0a4';c.fillRect(x+14,y+hh-12,3,1);
    for(let fy=y+10;fy<y+hh-10;fy+=18){c.fillStyle='#1d2326';c.fillRect(x-2,fy,6,12);c.fillStyle='#5d656d';for(let k=0;k<12;k+=2)c.fillRect(x-2,fy+k,6,1);}
  }else if(hd===2){
    // The Willows: a roof terrace (decking, planters, a glass rail), a lift tower and rows of solar panels
    const tx=x+8,ty=y+8,tw=Math.round(w*.5),th=hh-30;
    for(let yy=0;yy<th;yy++){c.fillStyle=['#a0703e','#94663a','#ad7c48'][((yy/4)|0)%3];c.fillRect(tx,ty+yy,tw,1);if(yy%4===3){c.fillStyle='#5a3a1a';c.fillRect(tx,ty+yy,tw,1);}}
    c.fillStyle='rgba(160,220,255,.7)';c.fillRect(tx,ty,tw,1);c.fillRect(tx,ty,1,th);c.fillRect(tx,ty+th-1,tw,1);c.fillRect(tx+tw-1,ty,1,th);
    for(const [px,py] of [[tx+3,ty+3],[tx+tw-9,ty+3],[tx+3,ty+th-9],[tx+tw-9,ty+th-9]]){c.fillStyle='#5a3a1e';c.fillRect(px,py,6,6);c.fillStyle='#3f7a34';pcircle(c,px+3,py+2,3);c.fillStyle='#ff5f8f';c.fillRect(px+2,py+1,1,1);}
    c.fillStyle='#e8e0d0';c.fillRect(tx+tw/2-8|0,ty+th/2-3|0,6,6);c.fillRect(tx+tw/2+2|0,ty+th/2-3|0,6,6);
    box(x+w-30,y+8,20,16,'#9aa0a4','#c8ccd0');c.fillStyle='rgba(160,220,255,.8)';c.fillRect(x+w-26,y+22,12,2);
    for(let py=y+34;py<y+hh-12;py+=10)for(let px=x+w-60;px<x+w-10;px+=12){c.fillStyle='#0f1a30';c.fillRect(px,py,10,8);c.fillStyle='#22406e';c.fillRect(px+1,py+1,8,6);c.fillStyle='#3a5f96';c.fillRect(px+1,py+4,8,1);c.fillRect(px+5,py+1,1,6);}
  }else{
    // Maple Gardens: grey membrane in panels, HVAC units, roof hatches, and balconies along the front
    c.fillStyle='#7a7a76';for(let xx=x+20;xx<x+w;xx+=24)c.fillRect(xx,y+2,1,hh-4);
    for(let k=0;k<Math.max(2,w/60|0);k++)ac(x+16+k*60,y+10);
    for(let k=0;k<Math.max(1,w/80|0);k++){box(x+40+k*80,y+hh-24,10,8,'#6a6a66','#8a8a86');}
  }
  // the entrance: a canopy over the door
  const dx=L.ldoor.x;c.fillStyle='#1e1414';c.fillRect(dx-9,y+hh-1,18,5);c.fillStyle=hd===0?'#6a3428':hd===2?'#1d2326':'#2f5a4a';c.fillRect(dx-8,y+hh,16,3);c.fillStyle=hd===2?'#e8c24a':'#e8e0d0';c.fillRect(dx-8,y+hh,16,1);
  // balconies hang off the front of the Maple and Willow blocks
  if(hd>0)for(let bx=x+10;bx<x+w-20;bx+=hd===2?30:26){if(Math.abs(bx+6-dx)<16)continue;c.fillStyle='rgba(0,0,0,.3)';c.fillRect(bx+2,y+hh+2,12,4);c.fillStyle='#5a5a5a';c.fillRect(bx,y+hh,12,4);c.fillStyle=hd===2?'rgba(160,220,255,.8)':'#c8c2b4';c.fillRect(bx,y+hh+3,12,1);c.fillStyle='#3f7a34';c.fillRect(bx+2,y+hh+1,2,2);}
}
// the extra blocks: a wing of the building (same roof, a row of skylights and planters), or a parking garage seen
// from above: the top deck with its bays marked out and cars parked, a ramp down at the entrance end, a glass stair
// tower in one corner and planters all along its edge
function drawStruct(c,L,st){
  const x=st.x0,y=st.y0,w=st.x1-st.x0,hh=st.y1-st.y0,R=(i,j)=>hash(i*5+L.k+x,j*11+y);
  c.fillStyle='#1e1414';c.fillRect(x-2,y-2,w+4,hh+4);
  if(st.k==='garage'){
    for(let yy=0;yy<hh;yy++)for(let xx=0;xx<w;xx++){const r=R(xx,yy);c.fillStyle=r<.6?'#9a9a96':r<.85?'#8e8e8a':'#a6a6a2';c.fillRect(x+xx,y+yy,1,1);}
    // planters along every edge
    c.fillStyle='#2f5a26';c.fillRect(x,y,w,3);c.fillRect(x,y,3,hh);c.fillRect(x+w-3,y,3,hh);c.fillRect(x,y+hh-3,w,3);
    c.fillStyle='#4a8a3a';for(let k=1;k<w;k+=3){c.fillRect(x+k,y+1,2,1);c.fillRect(x+k,y+hh-2,2,1);}for(let k=1;k<hh;k+=3){c.fillRect(x+1,y+k,1,2);c.fillRect(x+w-2,y+k,1,2);}
    c.fillStyle='#ff5f8f';for(let k=4;k<w;k+=9){c.fillRect(x+k,y+1,1,1);c.fillRect(x+k+3,y+hh-2,1,1);}
    // bays down both long sides, a driving lane up the middle
    const vert=hh>=w,len=vert?hh:w,wid=vert?w:hh,bay=20;
    c.fillStyle='#f4f1e8';
    for(let k=34;k<len-14;k+=bay){if(vert){c.fillRect(x+4,y+k,Math.round(wid*.3),1);c.fillRect(x+w-4-Math.round(wid*.3),y+k,Math.round(wid*.3),1);}else{c.fillRect(x+k,y+4,1,Math.round(wid*.3));c.fillRect(x+k,y+hh-4-Math.round(wid*.3),1,Math.round(wid*.3));}}
    c.fillStyle='#e8c24a';for(let k=34;k<len-14;k+=8){if(vert)c.fillRect(x+(w>>1),y+k,1,4);else c.fillRect(x+k,y+(hh>>1),4,1);}
    // a few cars up top
    for(let k=0,b=0;k*bay+44<len-14;k++){for(const side of [0,1]){if(R(k,side+7)<.45)continue;const can=makeCarCached(carCol(2,R(side,k+3)));c.save();
      if(vert){c.translate(side?x+w-4-Math.round(wid*.15):x+4+Math.round(wid*.15),y+44+k*bay);c.rotate(side?Math.PI:0);}else{c.translate(x+44+k*bay,side?y+hh-4-Math.round(wid*.15):y+4+Math.round(wid*.15));c.rotate(side?Math.PI/2*3:Math.PI/2);}
      c.scale(.7,.7);c.drawImage(can,-17,-8);c.restore();b++;}}
    // the ramp at the street end, and the glass stair tower at the far end
    c.fillStyle='#6a6a66';if(vert)c.fillRect(x+(w>>1)-9,y+hh-30,18,26);else c.fillRect(x+4,y+(hh>>1)-9,26,18);
    c.fillStyle='#f4f1e8';for(let k=0;k<3;k++){if(vert){const yy=y+hh-26+k*8;c.fillRect(x+(w>>1)-3,yy,1,1);c.fillRect(x+(w>>1)-2,yy-1,1,1);c.fillRect(x+(w>>1)-1,yy-2,2,1);c.fillRect(x+(w>>1)+1,yy-1,1,1);c.fillRect(x+(w>>1)+2,yy,1,1);}}
    const tx=vert?x+4:x+w-22,ty=vert?y+4:y+4;c.fillStyle='#14202c';c.fillRect(tx,ty,18,18);c.fillStyle='#22364a';c.fillRect(tx+1,ty+1,16,16);c.fillStyle='rgba(160,220,255,.6)';c.fillRect(tx+2,ty+2,6,1);c.fillRect(tx+2,ty+2,1,6);c.fillStyle='#e8c24a';c.fillRect(tx+7,ty+7,4,4);
    return;}
  // a wing: the building's roof again
  const roof=L.hood===0?['#4a4a48','#3e3e3c','#565654']:L.hood===2?['#c8ccd0','#bcc0c4','#d4d8dc']:['#8a8a86','#7e7e7a','#969692'];
  for(let yy=0;yy<hh;yy++)for(let xx=0;xx<w;xx++){const r=R(xx,yy);c.fillStyle=roof[r<.6?0:r<.82?1:2];c.fillRect(x+xx,y+yy,1,1);}
  c.fillStyle=L.hood===2?'#e8eef2':'#b8b2a6';c.fillRect(x,y,w,2);c.fillRect(x,y,2,hh);c.fillRect(x+w-2,y,2,hh);c.fillRect(x,y+hh-2,w,2);
  const vert=hh>=w;for(let k=16;k<(vert?hh:w)-16;k+=22){const sx=vert?x+(w>>1)-6:x+k,sy=vert?y+k:y+(hh>>1)-6;c.fillStyle='#2a3a4a';c.fillRect(sx,sy,12,12);c.fillStyle='#6fb3d9';c.fillRect(sx+1,sy+1,10,10);c.fillStyle='#bfe6ff';c.fillRect(sx+2,sy+2,4,2);}
  for(const [px,py] of vert?[[x+5,y+5],[x+w-11,y+5],[x+5,y+hh-11],[x+w-11,y+hh-11]]:[[x+5,y+5],[x+w-11,y+5]]){c.fillStyle='#5a3a1e';c.fillRect(px,py,6,6);c.fillStyle='#3f7a34';pcircle(c,px+3,py+2,3);c.fillStyle='#ffd84a';c.fillRect(px+2,py+1,1,1);}
}
function drawHouse(c,L){
  for(const st of L.lstructs||[])drawStruct(c,L,st);
  if(L.apt){drawApartment(c,L);return;}
  const h=L.lhouse,x=h.x0,y=h.y0,w=h.x1-h.x0,hh=h.y1-h.y0,mid=y+Math.round(hh/2),P=ROOF_PALS[L.style];
  c.fillStyle='#1e1414';c.fillRect(x-2,y-2,w+4,hh+4);
  for(let yy=y;yy<y+hh;yy++){
    const top=yy<mid,row=Math.floor((yy-y)/5),ry=(yy-y)%5;
    c.fillStyle=top?(ry===4?P[1]:P[0]):(ry===4?P[3]:P[2]);c.fillRect(x,yy,w,1);
    if(ry===0){c.fillStyle=top?P[4]:P[5];c.fillRect(x,yy,w,1);}
    if(ry<4){c.fillStyle=top?P[1]:P[3];for(let xx=x+((row&1)?4:0);xx<x+w;xx+=8)c.fillRect(xx,yy,1,1);}
  }
  c.fillStyle=P[1];c.fillRect(x,mid-2,w,4);c.fillStyle=P[5];c.fillRect(x,mid+2,w,1);
  // Birch Lane roofs are patched with odd shingles, and one has a blue tarp tied over a leak
  if(L.hood===0){for(let k=0;k<6;k++){const px=x+2+Math.floor(hash(k,L.k*7+1)*(w-10)),py=y+2+Math.floor(hash(L.k*3+2,k)*(hh-8));c.fillStyle=k%2?shadeHex(P[0],1.25):shadeHex(P[2],.75);c.fillRect(px,py,6,3);}
    if(!L.filler&&L.k===2){const tx=x+Math.round(w*.18),ty=y+3;c.fillStyle='#1b4a8a';c.fillRect(tx-1,ty-1,22,14);c.fillStyle='#2a6fc9';c.fillRect(tx,ty,20,12);c.fillStyle='#3d86e0';for(let k=2;k<12;k+=4)c.fillRect(tx,ty+k,20,1);c.fillStyle='#d0d0d0';for(const [a,b] of [[0,0],[19,0],[0,11],[19,11]])c.fillRect(tx+a,ty+b,1,1);}}
  c.fillStyle='#e8e0d0';c.fillRect(x-2,y+hh+1,w+4,2);
  const cx=x+w-Math.round(w*.25),cy=y+Math.round(hh*.12);c.fillStyle='#3a1f18';c.fillRect(cx-1,cy-1,16,14);c.fillStyle='#7a4a3a';c.fillRect(cx,cy,14,12);
  c.fillStyle='#935a45';for(let r=0;r<4;r++)for(let k=0;k<3;k++)c.fillRect(cx+k*5+(r&1)*2,cy+r*3,3,2);c.fillStyle='#1c1210';c.fillRect(cx+3,cy+3,8,6);
  const sky=(sx,sy)=>{c.fillStyle='#2a3a4a';c.fillRect(sx,sy,20,13);c.fillStyle='#6fb3d9';c.fillRect(sx+1,sy+1,18,11);c.fillStyle='#bfe6ff';c.fillRect(sx+2,sy+2,6,2);};
  if(L.style>=2)sky(x+Math.round(w*.15),y+hh-Math.round(hh*.33));
  if(L.style>=5)sky(x+Math.round(w*.55),y+hh-Math.round(hh*.33));
}
function drawFence(c,L){
  const post=(x,y)=>{c.fillStyle='#3a2314';c.fillRect(x-1,y-1,9,9);c.fillStyle='#8a5a36';c.fillRect(x,y,7,7);c.fillStyle='#a8744a';c.fillRect(x,y,7,2);};
  // Birch Lane: sagging chain-link on grey posts. Willow Heights: clipped hedges. Maple Avenue: wooden board fences
  if(L.hood===0||L.hood===2){
    for(const f of L.lfences){const horiz=f.x1-f.x0>=f.y1-f.y0,fw=f.x1-f.x0,fh=f.y1-f.y0;
      if(L.hood===0){c.fillStyle='rgba(0,0,0,.18)';c.fillRect(f.x0+1,f.y0+1,fw,fh);
        c.fillStyle='#9aa0a4';for(let k=0;k<(horiz?fw:fh);k++){const a=horiz?f.x0+k:f.x0,b=horiz?f.y0:f.y0+k;
          for(let q=0;q<6;q++){if(((k+q)&3)===0||((k-q)&3)===0)c.fillRect(horiz?a:a+q,horiz?b+q:b,1,1);}}
        c.fillStyle='#6a7074';if(horiz)c.fillRect(f.x0,f.y0+1,fw,1);else c.fillRect(f.x0+1,f.y0,1,fh);
        c.fillStyle='#5d656d';const n=Math.max(1,Math.round((horiz?fw:fh)/40));for(let k=0;k<=n;k++){const t=Math.round(k*((horiz?fw:fh)-3)/n);if(horiz)c.fillRect(f.x0+t,f.y0,3,6);else c.fillRect(f.x0,f.y0+t,6,3);}
        c.fillStyle='#8f989e';for(let k=0;k<=n;k++){const t=Math.round(k*((horiz?fw:fh)-3)/n);if(horiz)c.fillRect(f.x0+t,f.y0,3,1);else c.fillRect(f.x0,f.y0+t,1,3);}}
      // (fences drawn inside a Willow Heights yard are white pickets: a hedge there would vanish into the lawn)
      else if(f.custom){c.fillStyle='rgba(0,0,0,.22)';c.fillRect(f.x0+1,f.y0+2,fw,fh);
        if(horiz){c.fillStyle='#8f897d';c.fillRect(f.x0,f.y0+3,fw,1);for(let x=f.x0;x<f.x1;x+=3){c.fillStyle='#c8c2b4';c.fillRect(x+1,f.y0+1,1,5);c.fillStyle='#f4f1e8';c.fillRect(x,f.y0,1,5);}}
        else{c.fillStyle='#8f897d';c.fillRect(f.x0+2,f.y0,1,fh);for(let y=f.y0;y<f.y1;y+=3){c.fillStyle='#c8c2b4';c.fillRect(f.x0+1,y+1,5,1);c.fillStyle='#f4f1e8';c.fillRect(f.x0,y,5,1);}}}
      else{for(let y=f.y0;y<f.y1;y++)for(let x=f.x0;x<f.x1;x++){const n=hash(x*5+L.k,y*3)+(horiz?(y-f.y0)/6:(x-f.x0)/6)*.4;c.fillStyle=n<.45?'#1f4a1c':n<.85?'#2f6a2a':n<1.15?'#3f7a34':'#5a9a40';c.fillRect(x,y,1,1);}
        c.fillStyle='#8fcb5f';for(let k=3;k<(horiz?fw:fh);k+=7){const a=horiz?f.x0+k:f.x0+1+(k%3),b=horiz?f.y0+1+(k%3):f.y0+k;c.fillRect(a,b,1,1);}}
    }
    drawGates(c,L);return;}
  for(const f of L.lfences){const horiz=f.x1-f.x0>=f.y1-f.y0;
    c.fillStyle='#4f301b';c.fillRect(f.x0,f.y0,f.x1-f.x0,f.y1-f.y0);
    if(horiz){for(let x=f.x0+1;x<f.x1-1;x+=5){c.fillStyle='#b07a48';c.fillRect(x,f.y0,3,6);c.fillStyle='#d49c62';c.fillRect(x,f.y0,1,5);}
      for(let x=f.x0;x<f.x1-7;x+=48)post(x,f.y0);post(f.x1-7,f.y0);}
    else{for(let y=f.y0+1;y<f.y1-1;y+=5){c.fillStyle='#b07a48';c.fillRect(f.x0,y,6,3);c.fillStyle='#d49c62';c.fillRect(f.x0,y,5,1);}
      for(let y=f.y0;y<f.y1-7;y+=48)post(f.x0,y);post(f.x0,f.y1-7);}
  }
  drawGates(c,L);
}
// gates stand open: a short leaf swung back against one post (wood, or a chain-link frame on Birch Lane)
function drawGates(c,L){
  for(const g of L.gates||[]){const m=L.hood===0;c.fillStyle=m?'#5d656d':'#4f301b';c.fillRect(g.x0-1,g.y-9,3,10);c.fillStyle=m?'#9aa0a4':'#b07a48';c.fillRect(g.x0,g.y-9,2,9);c.fillStyle=m?'#c8ccd0':'#d49c62';c.fillRect(g.x0,g.y-9,1,8);
    c.fillStyle=m?'#5d656d':'#4f301b';c.fillRect(g.x1-2,g.y-2,3,9);}
}
// vehicles (sprites face +x)
let truckBase,truckTmp;
const TB_SPOTS=[[9,15],[14,15],[9,9],[14,9],[11,12],[7,12],[16,12],[11,7]];
function buildTruck(){
  truckBase=mk(52,24);const c=truckBase.getContext('2d');
  c.fillStyle='#0d0d10';for(const [x,y] of [[7,0],[36,0],[7,22],[36,22]])c.fillRect(x,y,9,2);
  c.fillStyle='#16303d';c.fillRect(0,1,52,22);c.fillStyle='#2f6f8f';c.fillRect(1,2,50,20);
  c.fillStyle='#1d4658';c.fillRect(4,4,24,16);c.fillStyle='#183a49';for(let y=6;y<20;y+=3)c.fillRect(4,y,24,1);
  c.fillStyle='#24566c';c.fillRect(1,2,3,20);c.fillStyle='#3d88ab';c.fillRect(1,2,28,1);
  c.fillStyle='#3a86ab';c.fillRect(29,3,21,18);c.fillStyle='#1a2a3a';c.fillRect(30,4,2,16);
  c.fillStyle='#4fa3cc';c.fillRect(32,4,10,16);c.fillStyle='#7cc4e6';c.fillRect(32,4,10,1);
  c.fillStyle='#1a2a3a';c.fillRect(42,4,3,16);c.fillStyle='#6fb3d9';c.fillRect(43,5,1,4);
  c.fillStyle='#2f6f8f';c.fillRect(45,3,6,18);c.fillStyle='#ffe38a';c.fillRect(50,3,2,3);c.fillRect(50,18,2,3);
  c.fillStyle='#fe3b3b';c.fillRect(0,3,1,3);c.fillRect(0,18,1,3);
  c.fillStyle='#16303d';c.fillRect(33,0,2,2);c.fillRect(33,22,2,2);
  c.fillStyle='#fff';c.fillRect(34,9,6,6);c.fillStyle='#4bc26a';c.fillRect(35,10,4,4);
  truckTmp=mk(52,24);
}
// a car's colour string can carry its kind: 'o:#hex' is an old beater (Birch Lane), 'l:#hex' a luxury car (Willow
// Heights), a plain '#hex' an ordinary car
function makeCar(spec){
  const kind=spec[1]===':'?spec[0]:'',col=kind?spec.slice(2):spec;
  if(kind==='o')return makeOldCar(col);if(kind==='l')return makeLuxCar(col);
  const c=mk(34,16),g=c.getContext('2d'),dk=shadeHex(col,.6),lt=shadeHex(col,1.25);
  g.fillStyle='#0d0d10';for(const [x,y] of [[5,0],[23,0],[5,14],[23,14]])g.fillRect(x,y,7,2);
  g.fillStyle=dk;g.fillRect(0,1,34,14);g.fillStyle=col;g.fillRect(1,2,32,12);
  g.fillStyle=lt;g.fillRect(1,2,32,1);g.fillRect(26,3,6,1);
  g.fillStyle='#1a2a3a';g.fillRect(8,3,3,10);g.fillRect(22,3,4,10);
  g.fillStyle=shadeHex(col,1.1);g.fillRect(11,3,11,10);g.fillStyle=lt;g.fillRect(11,3,11,1);
  g.fillStyle='#6fb3d9';g.fillRect(23,4,1,3);
  g.fillStyle='#ffe38a';g.fillRect(33,3,1,2);g.fillRect(33,11,1,2);g.fillStyle='#fe3b3b';g.fillRect(0,3,1,2);g.fillRect(0,11,1,2);
  g.fillStyle=dk;g.fillRect(16,0,2,1);g.fillRect(16,15,2,1);
  return c;
}
// boxy and faded: a long flat roof, a primer-grey hood, rust round the wheel arches, a cracked windshield
function makeOldCar(col){
  const c=mk(34,16),g=c.getContext('2d'),dk=shadeHex(col,.55),lt=shadeHex(col,1.1);
  g.fillStyle='#0d0d10';for(const [x,y] of [[4,0],[24,0],[4,14],[24,14]])g.fillRect(x,y,7,2);
  g.fillStyle='#8f989e';g.fillRect(26,0,2,1);
  g.fillStyle=dk;g.fillRect(0,1,34,14);g.fillStyle=col;g.fillRect(1,2,32,12);
  g.fillStyle=lt;g.fillRect(1,2,32,1);
  g.fillStyle='#1a2a3a';g.fillRect(6,3,2,10);g.fillRect(22,3,3,10);
  g.fillStyle=shadeHex(col,1.04);g.fillRect(8,3,14,10);g.fillStyle='#e8eef2';g.fillRect(23,5,1,1);g.fillRect(24,6,1,1);g.fillRect(23,7,1,1);
  g.fillStyle='#8a8a82';g.fillRect(26,4,5,8);g.fillStyle='#9a9a92';g.fillRect(26,4,5,1);
  g.fillStyle='#7a3a18';for(const [x,y] of [[4,2],[11,2],[24,13],[31,2],[2,12],[12,13],[30,12]])g.fillRect(x,y,2,1);g.fillStyle='#a0582a';for(const [x,y] of [[5,13],[25,2],[3,3]])g.fillRect(x,y,1,1);
  g.fillStyle='#d8c98a';g.fillRect(33,3,1,2);g.fillStyle='#5a5a52';g.fillRect(33,11,1,2);g.fillStyle='#b8352b';g.fillRect(0,3,1,2);g.fillRect(0,11,1,2);
  return c;
}
// low and glossy: rounded corners, a long hood, a short cabin with a glass roof, chrome along the sides
function makeLuxCar(col){
  const c=mk(34,16),g=c.getContext('2d'),dk=shadeHex(col,.5),lt=shadeHex(col,1.45);
  g.fillStyle='#0d0d10';for(const [x,y] of [[5,0],[24,0],[5,14],[24,14]])g.fillRect(x,y,6,2);
  g.fillStyle='#c8ccd0';for(const [x,y] of [[7,0],[26,0],[7,15],[26,15]])g.fillRect(x,y,2,1);
  g.fillStyle=dk;g.fillRect(1,1,32,14);g.fillRect(0,2,34,12);g.fillStyle=col;g.fillRect(1,2,32,12);g.fillRect(2,1,30,1);g.fillRect(2,14,30,1);
  g.fillStyle='#e8eef2';g.fillRect(2,2,30,1);g.fillRect(2,13,30,1);
  g.fillStyle='#14202c';g.fillRect(9,3,2,10);g.fillRect(19,3,3,10);g.fillStyle='#22364a';g.fillRect(11,4,8,8);g.fillStyle='#4a6a88';g.fillRect(12,5,3,1);
  g.fillStyle=lt;g.fillRect(23,4,8,1);g.fillRect(3,4,5,1);g.fillStyle='#6fb3d9';g.fillRect(20,4,1,2);
  g.fillStyle='#eaf6ff';g.fillRect(33,3,1,3);g.fillRect(33,10,1,3);g.fillStyle='#ff2a2a';g.fillRect(0,3,1,3);g.fillRect(0,10,1,3);
  return c;
}
// a car colour for each neighborhood (r is 0..1)
const OLD_COLS=['#8a7a5a','#6a7a6a','#7a5a4a','#5a6a7a','#9a8a6a','#7a3a2a','#6a6a5a','#4a5a4a'],LUX_COLS=['#15171a','#f4f4f0','#c8ccd0','#1d3a6a','#6a1a24','#2a2e33','#e8e0d0','#0f3a2a'];
const carCol=(hood,r)=>hood===0?'o:'+OLD_COLS[(r*OLD_COLS.length)|0]:hood===2?'l:'+LUX_COLS[(r*LUX_COLS.length)|0]:CAR_COLS[(r*CAR_COLS.length)|0];

// ============================================================ trees
function makeCanopy(t,seed){
  const R=mulberry(seed),r=t.r,size=r*2+12,c=mk(size,size),x=c.getContext('2d');
  const img=x.createImageData(size,size),px=new Uint32Array(img.data.buffer),pal=CANOPY_PALS[t.pal].map(h=>hexA(h));
  const lobes=[{x:0,y:0,r:r*.72}];
  for(let k=0;k<8;k++){const a=k/8*Math.PI*2+R()*.5,d=r*(.38+R()*.18);lobes.push({x:Math.cos(a)*d,y:Math.sin(a)*d,r:r*(.36+R()*.16)});}
  const h=size/2;
  for(let y=0;y<size;y++)for(let xx=0;xx<size;xx++){
    const dx=xx-h,dy=y-h;let best=-1,bl=null;
    for(const l of lobes){const v=1-Math.hypot(dx-l.x,dy-l.y)/l.r;if(v>best){best=v;bl=l;}}
    const n=vnoise(xx*.35+seed,y*.35)-.5;best+=n*.25;if(best<=0)continue;
    const lx=(dx-bl.x)/bl.r,ly=(dy-bl.y)/bl.r;
    let L=(-lx*.5-ly*.7)*.45+(-dx/r*.35-dy/r*.45)+best*.6+n*.5+BAYER[(y&3)*4+(xx&3)]*.35-.17;
    let idx=L<-.25?0:L<.15?1:L<.55?2:3;if(best<.07)idx=0;
    px[y*size+xx]=pal[idx];
  }
  x.putImageData(img,0,0);return c;
}
function initTrees(){TREES.forEach((t,i)=>{t.can=makeCanopy(t,i*97+11);t.alpha=1;t.shake=0;t.timer=rnd()*2;t.ph=rnd()*6;t.lift=Math.round(8+t.r*.12);});}
