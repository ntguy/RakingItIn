'use strict';
// ============================================================ constants
// street geometry: road half-width, grass verge, sidewalk. Lot fronts sit FRONT px from a road's centerline.
const RH=50,VERGE=8,SWW=14,FRONT=RH+VERGE+SWW,PED_OFF=RH+VERGE+7;
// the tutorial (opened from the title screen as index.html#tutorial) is its own small map: one street, a corner, a
// short side street with a turning circle, and just two houses to work
const TUTORIAL=location.hash==='#tutorial';
// The street is one road with right-angle bends, given by its corners: in from the west edge of the map, ending in a
// turning circle. The full game winds through three neighborhoods, one street each: Birch Lane (small, older houses),
// then Maple Avenue, then Willow Heights (the big houses, ending in the cul-de-sac). HOODS gives each stretch of road
// (and the bend at its far end) its neighborhood: 0 Birch, 1 Maple, 2 Willow
const STREET=TUTORIAL?[[0,420],[700,420],[700,960],[1120,960]]:[[0,290],[1254,290],[1254,900],[304,900],[304,1720],[2084,1720]];
const STREET_HOOD=TUTORIAL?[1,1,1]:[0,1,1,1,2];
const HOOD_NAMES=['BIRCH LANE','MAPLE AVENUE','WILLOW HEIGHTS'];
const Y1=STREET[0][1],XC=STREET[1][0],BULB_R=90,WORLD_W=TUTORIAL?1260:2634,H=TUTORIAL?1100:2380;
const ROADS=STREET.slice(1).map(([x1,y1],i)=>{const [x0,y0]=STREET[i],h=y0===y1?1:0;
  return h?{x0:Math.min(x0,x1),y0:y0-RH,x1:Math.max(x0,x1),y1:y0+RH,h,c:y0,hood:STREET_HOOD[i]}:{x0:x0-RH,y0:Math.min(y0,y1),x1:x0+RH,y1:Math.max(y0,y1),h,c:x0,hood:STREET_HOOD[i]};});
const BULB={x:STREET[STREET.length-1][0],y:STREET[STREET.length-1][1],r:BULB_R,hood:STREET_HOOD[STREET_HOOD.length-1]};
// round pads at each bend give the turns a curved outside edge
const CIRCLES=[...STREET.slice(1,-1).map(([x,y],i)=>({x,y,r:RH,hood:STREET_HOOD[i]})),BULB];
const DRIVE_CFG=[null,{w:30,cars:1,p:.7},null,{w:32,cars:1,p:.8},{w:34,cars:1,p:1},{w:52,cars:2,p:1},{w:56,cars:2,p:1},{loop:true}];
const DAY_SECONDS=320,DAY_START=7,DAY_END=22;
const FANCY_PEN=3,TIPS=[[.9,.3],[.7,.2],[.5,.1]];
const tipFor=pct=>(TIPS.find(t=>pct>=t[0])||[0,0])[1];
// reputation, scored at the end of each day. Houses finished at 50/70/90% earn a flat bonus;
// damage costs 1 point per $10 of it, plus per-scare, per-road-leaf and late-night noise penalties
const REP_HOUSE=[[.9,40],[.7,20],[.5,10]],REP_PED=3,REP_ROAD_PER=10,REP_ROAD_CAP=25,LATE_HOUR=20,REP_LATE_PER_SEC=1;
// reputation levels 0-5: total reputation needed for each, and what the neighborhood calls you
const REP_LEVELS=[0,50,100,200,300,500],REP_NAMES=['NEW IN TOWN','GETTING NOTICED','RELIABLE','WELL LIKED','IN DEMAND','NEIGHBORHOOD LEGEND'];
const repForPct=pct=>(REP_HOUSE.find(t=>pct>=t[0])||[0,0])[1];
const repLevel=r=>{let l=0;for(let i=1;i<REP_LEVELS.length;i++)if(r>=REP_LEVELS[i])l=i;return l;};
const repRank=r=>r<0?'SKETCHY':REP_NAMES[repLevel(r)];
// a house too grand for your reputation won't pay yet (checked against reputation banked at the start of the day)
const lotNeed=L=>REP_LEVELS[L.level||0];
const lotLocked=L=>!!L&&!L.filler&&!TUTORIAL&&repLevel(rep)<(L.level||0);
const TRUCK_HL=26,TRUCK_HW=12;
// where the day starts: beside the truck, this far along it from the middle (+ toward the front)
const SPAWN_AT=8;
// pools: COPE px of stone deck ring the water. The net is a stick NET_STICK long; held, its head sits NET_REACH from the player
const COPE=3,NET_STICK=24,NET_REACH=26,NET_CAP=50,NET_R=5.5;
// the rake (R / triangle swaps it for the blower). Pulled back toward you, its head scoops up the leaves it passes over
// and carries them in its teeth until you dump the pile. Pushed forward it just nudges leaves a little and passes over
// them, unless you've bought the Rake Shovel: then it shoves them along in a bank RAKE_GAP px out in front of the
// crossbar, clear of the scoop band behind it, so turning a push into a pull leaves the bank behind.
// Held, the head sits RAKE_REACH out. Its width is RAKE_WIDTHS[Wide Rake level], and it holds RAKE_CAPS[Rake Capacity
// level] leaves. Every RAKE_SLOW_PER of a full rake you're hauling (carried, plus however many you're
// shoving, which can go past full) costs RAKE_SLOW of walking speed, never below RAKE_SLOW_MIN, and each Wide Rake
// level costs another RAKE_WIDE_SLOW of it while the rake is out. Rake Shovel level 2 counts shoved leaves at
// RAKE_SHOVE_EASE of their weight
const RAKE_CAPS=[30,45,65,90],RAKE_SHOVE_EASE=.5;
const RAKE_WIDE_SLOW=.04;
const RAKE_REACH=19,RAKE_WIDTHS=[10,13,16,20,24],RAKE_GAP=2,RAKE_SLOW=.13,RAKE_SLOW_PER=.4,RAKE_SLOW_MIN=.35;
const rakeHW=pl=>RAKE_WIDTHS[Math.min(RAKE_WIDTHS.length-1,pl.upg.rakewide||0)]/2,rakeCap=pl=>RAKE_CAPS[Math.min(RAKE_CAPS.length-1,pl.upg.rakecap||0)];
const rakeShoves=pl=>(pl.upg.rakeshovel||0)>0;
const rakeSpeed=pl=>pl.raking?Math.max(RAKE_SLOW_MIN,1-RAKE_SLOW*pl.rake.load/RAKE_SLOW_PER)*(1-RAKE_WIDE_SLOW*(pl.upg.rakewide||0)):1;
// how hard walking through leaves shoves them aside (1 = the original full-strength kick)
const BODY_PUSH=.2;
const POOL_CHANCE=[0,0,.12,.3,.5,.7,.9,1],POTS_PER=[1,2,2,3,4,5,6,8];
// flowerpots: [body, shadow side, rim] and fall mum colors
const POT_PALS=[['#b5562e','#7a3418','#d9774a'],['#2a7a8a','#17505b','#44a3b3'],['#d8d3c4','#8f897d','#f4f1e8'],['#3a3a48','#22222c','#5a5a6c']];
const POT_FLOWERS=['#e8c23a','#c9352b','#b06cff','#ff8a3a','#fff3d6','#ff5f8f'];
const POT_COST=[30,60];
// gravel drives: stones in three greys and the odd dark pebble
const GRAVEL_COLS=['#958d80','#a39b8d','#857d71','#6a6358'];
const ROOF_PALS=[
  ['#8e3a33','#6a2824','#b14c40','#8a3a31','#a4473d','#c65e4f'],
  ['#3a5570','#283d52','#4d6d8c','#3a5570','#46647f','#6488a8'],
  ['#5d5a57','#454240','#77736e','#5d5a57','#6a6663','#8f8a84'],
  ['#5a4478','#41315a','#735a96','#5a4478','#665088','#8a70b0'],
  ['#2f5a4a','#214236','#3f7662','#2f5a4a','#386a57','#559080'],
  ['#7a5a3a','#5a4128','#9a764e','#7a5a3a','#8a6844','#b08a5e'],
  ['#3a3a48','#2a2a36','#50506a','#3a3a48','#44445a','#6a6a88'],
  ['#8e3a33','#6a2824','#b14c40','#8a3a31','#a4473d','#c65e4f'],
];
const CANOPY_PALS=[
  ['#6e2c14','#b24e1e','#e57d2c','#ffbd5a'],
  ['#5c1a1f','#9c2a28','#d4463a','#ff7c5c'],
  ['#7a5a16','#b8902a','#e9c23c','#fff08a'],
  ['#2c4f28','#4a7a32','#86a23a','#c9c84c'],
];
const CAR_COLS=['#c9352b','#e8e0d0','#2a5d9f','#3a3a48','#4bc26a','#ffcf4a','#8a5ae0','#7a7468','#1e2226','#ff9800'];
const TREE_LEAF_COLS=[[0,4,0],[1,1,0],[2,2,4],[3,2,3]];
const LEAF_HEX=[
  ['#e2742a','#9e4419','#ffab4d'],['#c9352b','#7c1d22','#f2644a'],['#eec03a','#a8802a','#fff08a'],
  ['#93582d','#5a341f','#c2844b'],['#f0903a','#b05520','#ffd070'],
];
const PAL=LEAF_HEX.map(p=>p.map(h=>hexA(h)));
const PALU=PAL.map(p=>[shade32(p[1],1.05),shade32(p[1],.72),shade32(p[0],.8)]);
const SHADOW32=hexA('#000000',70);
const SHAPES=[
  [[-1,0,0, 0,0,2, 1,0,0, 0,1,1, 2,0,1],[-1,-1,0, 0,0,2, 1,1,0, 1,0,0, 2,2,1],[0,-1,0, 0,0,2, 0,1,0, 1,0,1, 0,2,1],[1,-1,0, 0,0,2, -1,1,0, -1,0,0, -2,2,1]],
  [[0,0,2, 1,0,0],[0,0,2, 1,1,0],[0,0,2, 0,1,0],[0,0,2, -1,1,0]],
  [[-1,0,0, 0,0,2, 1,0,2, 2,0,0, 0,-1,0, 1,-1,0, 0,1,1, 1,1,1, 3,0,1],
   [-1,-1,0, 0,0,2, 1,1,2, 0,-1,0, 1,0,0, 2,1,0, 2,2,0, 3,3,1, -1,0,1],
   [0,-1,0, 0,0,2, 0,1,2, 1,0,0, 1,1,0, 0,2,0, -1,0,1, -1,1,1, 0,3,1],
   [1,-1,0, 0,0,2, -1,1,2, 1,0,0, 0,1,0, -1,2,0, -2,2,0, -3,3,1, 1,-2,1]],
];
