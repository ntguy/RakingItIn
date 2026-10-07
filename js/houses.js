'use strict';
// ============================================================ houses: every yard, laid out by hand
// the tutorial's two yards, laid out around wherever each house ends up (lot-local: the street runs along y=d)
const TUT_YARDS={
  // a rounded mulch bed in the front corner with a tree over it, and flowerpots to tiptoe round
  0:L=>{const {w,d}=L,h=L.lhouse,dr=L.ldoor;return[
    {t:'mulch',x0:6,y0:d-62,x1:74,y1:d},{t:'tree',x:92,y:d-46,r:22,pal:0},
    {t:'pot',x:80,y:d-12},{t:'pot',x:dr.x-14,y:dr.y+9,big:true},{t:'pot',x:dr.x+14,y:dr.y+9,big:true},{t:'pot',x:w-30,y:h.y1+16}];},
  // no beds at all: a pool out back with a tree leaning over it, so there are always leaves to fish out
  1:L=>{const {w}=L,h=L.lhouse;return[
    {t:'pool',x0:w-96,y0:10,x1:w-18,y1:Math.min(h.y0-6,60)},{t:'tree',x:w-112,y:34,r:22,pal:1}];},
};
// The houses you can work, smallest first (the index is the house's number everywhere else). face = the side of the
// lot that looks onto the street; s = style (roof, trim, how fast its trees drop leaves); hood = neighborhood;
// level = the reputation level it needs before it pays. Each yard is laid out by hand in the lot's own frame (street
// along y=d), with the house at h:[x,y,w,h] and its front door at x=dx, so each one suits different goals: the
// Wangs' matching beds, the Duffys' one bed under the trees, the Okafors' pool and no mulch at all...
// Yard items are the editor's: beds and paving are rough boxes that get snapped into place, fl marks a bed planted with
// flowers, cars sit where they're put (dir is the way the nose points)
// a patio: m = its surface ('tile', 'deck', 'stone' or 'brick'), round = an oval one
// a struct can say what's up on its roof (roof: 'spa', 'sport'...) and have a tunnel through it (gap: [from, to] along
// its length, roofed over); LP_ is a lamp post
const PR_=(k,x,y)=>({t:'prop',k,x,y}),ST_=(k,x0,y0,x1,y1,roof,gap)=>({t:'struct',k,x0,y0,x1,y1,...(roof?{roof}:{}),...(gap?{gap}:{})}),LP_=(x,y)=>({t:'lamp',x,y});
const PT_=(x0,y0,x1,y1,m,round)=>({t:'patio',x0,y0,x1,y1,mat:m,round:!!round});
// a gravel drive, and a parking lot: bays = rows of parking bays, each [x0,y0,x1,y1,n] (a box split into n bays along
// its long side)
const GV_=(x0,y0,x1,y1)=>({t:'drive',mat:'gravel',x0,y0,x1,y1}),PK_=(x0,y0,x1,y1,bays)=>({t:'drive',mat:'lot',x0,y0,x1,y1,...(bays?{bays}:{})});
// QC_: a mulch bed tucked into one of its own corners and rounded off away from it (qa: [0 left or 1 right, 0 top or
// 1 bottom])
const QC_=(x0,y0,x1,y1,qa,fl)=>({t:'mulch',x0,y0,x1,y1,qa,fl:!!fl});
const F_=(x0,x1,y)=>({t:'fence',x0,y0:y,x1,y1:y}),GT_=(x0,x1,y)=>({t:'gate',x0,x1,y}),Q_=(t,x0,y0,x1,y1,fl)=>({t,x0,y0,x1,y1,fl:!!fl,sq:true});
const P_=(x,y,big)=>({t:'pot',x,y,big:!!big}),T_=(x,y,r,pal)=>({t:'tree',x,y,r,pal}),B_=(t,x0,y0,x1,y1,fl)=>({t,x0,y0,x1,y1,fl:!!fl}),S_=(x,y,r)=>({t:'shrub',x,y,r}),C_=(x,y,vert,dir)=>({t:'car',x,y,vert,dir});
// a side fence across the backyard from each side of the house to the side fence, with a gate in each run
// (y = the fence line; gates at [x0,x1] in each run)
const gateFences=(w,hx0,hx1,y,gl,gr)=>[F_(6,gl[0],y),GT_(gl[0],gl[1],y-3),F_(gl[1],hx0,y),F_(hx1,gr[0],y),GT_(gr[0],gr[1],y-3),F_(gr[1],w-6,y)];
const YARD={
  // a tiny lot: one rounded bed in the front corner and a strip along the back fence
  kowalski:{h:[40,50,80,46],dx:70,yard:[B_('path',65,102,75,160),B_('mulch',104,112,154,160),B_('mulch',30,6,130,22),T_(132,62,20,2),T_(30,122,18,0),P_(90,104)]},
  // a duplex: a strip down the side fence, a corner of wildflowers out back, and a pot either side of the walk
  baker:{h:[36,56,118,44],dx:66,yard:[B_('path',61,106,71,160),B_('mulch',164,30,184,150),B_('natural',6,6,60,44),B_('mulch',40,104,56,118),B_('mulch',76,104,150,118),
    T_(100,26,20,1),T_(36,128,18,3),P_(52,126),P_(140,126)]},
  // a rental: a bed down one side out front, a corner bed out back, and a car parked on the grass
  flynn:{h:[46,70,90,50],dx:88,yard:[B_('path',83,126,93,180),Q_('mulch',6,100,26,180),B_('mulch',130,6,176,50),C_(152,148,true,-1),
    T_(40,40,22,0),T_(100,30,16,2),T_(36,150,18,1),P_(108,130)]},
  // a bungalow: beds along the front, and an island bed in the middle of the backyard between two trees
  abernathy:{h:[44,76,100,50],dx:80,yard:[B_('path',75,132,85,180),B_('drive',150,126,180,180),C_(165,160,true,-1),B_('mulch',48,130,70,146),B_('mulch',90,130,140,146),
    Q_('mulch',70,22,120,52),T_(30,40,20,0),T_(160,44,20,2),P_(60,162)]},
  // a fence across the backyard with a gate each side; corner beds out back and one by the front walk
  ramirez:{h:[50,64,90,48],dx:82,yard:[B_('path',77,118,87,170),B_('drive',146,112,176,170),C_(161,148,true,-1),
    ...gateFences(200,50,140,88,[18,38],[156,176]),B_('mulch',6,6,56,46),B_('mulch',150,6,194,46),B_('mulch',54,116,72,130),
    T_(100,36,22,1),T_(28,142,18,0),P_(98,124)]},
  // a round above-ground pool out back, right up against a huge old tree
  nguyen:{h:[40,104,100,50],dx:78,yard:[
    {t:'path',x0:73,y0:160,x1:83,y1:180}, {t:'pool',x0:103,y0:16,x1:153,y1:66,round:true}, {t:'tree',x:62,y:52,r:40,pal:0},
    {t:'tree',x:178,y:29,r:7,pal:2}, {t:'mulch',x0:6,y0:128,x1:36,y1:180}, {t:'pot',x:132,y:165,big:false}, {t:'pot',x:75,y:98,big:false},
    {t:'mulch',x0:143,y0:134,x1:194,y1:156}, {t:'shrub',x:145,y:163,r:7}, {t:'shrub',x:159,y:163,r:7}, {t:'shrub',x:173,y:163,r:7},
    {t:'shrub',x:187,y:163,r:7}, {t:'patio',x0:69,y0:80,x1:114,y1:102}]},
  // a long vegetable garden all along the back fence, with mulch only in the two back corners
  lindqvist:{h:[64,110,112,58],dx:104,yard:[B_('path',99,174,109,220),B_('drive',184,168,216,220),C_(200,198,true,-1),
    B_('garden',52,6,188,40),B_('mulch',6,6,52,52),B_('mulch',188,6,234,52),B_('mulch',68,172,94,188),
    T_(36,92,22,0),T_(206,92,22,3),T_(124,70,18,1),P_(120,52)]},
  // down the left side of the backyard, five beds stacked top to bottom (mulch, garden, mulch, garden, mulch) with
  // nothing between them; a big tree beside them and a small one above and below it
  osei:{h:[72,124,80,44],dx:100,yard:[B_('path',95,174,105,200),
    Q_('mulch',6,6,50,28),B_('garden',6,28,50,50),Q_('mulch',6,50,50,72),B_('garden',6,72,50,94),Q_('mulch',6,94,50,116),
    T_(86,62,28,1),T_(82,16,12,2),T_(82,108,12,3),P_(130,40),P_(140,150)]},
  // the gated backyard again, Maple Avenue style: wildflowers and mulch in the back corners, a strip along the fence
  miller:{h:[70,90,110,56],dx:110,yard:[B_('path',105,152,115,220),B_('drive',190,146,224,220),C_(207,188,true,-1),
    ...gateFences(250,70,180,116,[30,50],[208,228]),B_('mulch',56,6,194,24),B_('natural',6,6,52,52),B_('mulch',198,6,244,52),B_('mulch',6,170,60,220),PT_(76,40,174,86,'deck'),
    T_(214,82,20,0),T_(40,150,18,2),P_(96,162),P_(126,162)]},
  // a patio off the back of the house, then a big open oval of lawn ringed with trees, and beds all the way round
  // the fence (mulch down the sides, wildflowers along the back)
  ashford:{h:[120,190,160,80],dx:178,yard:[B_('path',173,276,183,330),B_('drive',290,270,330,330),C_(310,302,true,-1),
    Q_('mulch',6,6,30,330),Q_('mulch',370,6,394,330),Q_('natural',30,6,370,30),PT_(136,130,264,186,'stone',true),
    T_(70,86,18,0),T_(330,86,18,2),T_(200,40,18,1),T_(110,52,18,3),T_(290,52,18,0),T_(106,122,16,2),T_(294,122,16,1),
    B_('mulch',124,274,166,290,1),B_('mulch',186,274,284,290,1),S_(100,234,8),S_(300,234,8),P_(132,186,1),P_(268,186,1),P_(110,300)]},
  // down the left side of the backyard, five beds stacked top to bottom (garden, mulch, garden, mulch, garden) with a
  // fence between each; a big tree beside them and a small one above and below it
  delacroix:{h:[40,200,110,56],dx:80,yard:[B_('path',75,262,85,300),
    B_('garden',6,6,62,38),F_(6,62,41),Q_('mulch',6,44,62,76),F_(6,62,79),B_('garden',6,82,62,114),F_(6,62,117),Q_('mulch',6,120,62,152),F_(6,62,155),B_('garden',6,158,62,190),
    T_(108,98,30,0),T_(104,28,12,2),T_(104,170,12,3),B_('mulch',44,260,70,276,1),B_('mulch',92,260,146,276,1),P_(130,286),P_(150,40)]},
  // a Victorian with a gated backyard: a formal garden out back and flower beds in the corners
  hartwell:{h:[60,100,130,70],dx:106,yard:[B_('path',101,176,111,240),B_('drive',196,170,236,240),C_(216,208,true,-1),
    ...gateFences(250,60,190,135,[26,46],[206,226]),B_('garden',80,20,170,60),PT_(90,64,160,96,'brick',true),B_('mulch',6,6,56,56,1),B_('mulch',194,6,244,56,1),B_('mulch',6,190,60,240,1),
    S_(80,188,6),S_(140,188,6),T_(40,96,22,0),T_(212,96,22,3),P_(94,184),P_(122,184)]},
};
// the apartment block at the end of each street
// Birch Court: a gravel drive up one side to the residents' parking lot out back, fenced off with chain-link and an
// opening where the drive comes in. A row of bays along the back fence and another along the lot's front fence, a
// mulch island down the middle with a little tree at each end, and a lane a car long down the drive side joining the
// two aisles. Out front, a little patch gone wild beside the drive
YARD.birchcourt={apt:1,h:[22,222,110,118],dx:77,yard:[B_('path',72,346,82,410),
  GV_(148,140,180,410),PK_(6,6,180,174,[[6,6,144,44,6],[6,136,144,174,6]]),F_(6,148,177),
  B_('mulch',6,78,144,102),T_(16,90,11,1),T_(134,90,11,3),
  C_(41,25,true,-1),C_(64,25,true,-1),C_(110,25,true,1),C_(18,155,true,1),C_(133,155,true,1),
  Q_('mulch',6,362,30,410),B_('mulch',6,180,46,208),B_('mulch',30,342,64,354),PR_('dumpster',122,194),PR_('bikerack',112,352),
  T_(76,200,16,0),T_(52,388,15,2),P_(94,350),Q_('natural',114,380,144,410)]};
// Maple Gardens: a wide paved entry down the far side to the residents' lot, one long row of bays along the back
// fence (with a mulch strip along the fence behind them). A sidewalk runs the length of the back of the
// block past its three back entrances, with lamp posts and pots along it. Down the other end, a rounded mulch bed in
// the back corner and the residents' vegetable garden out by the street
YARD.maplegardens={apt:1,h:[66,114,250,54],dx:191,bdx:[116,191,266],yard:[B_('path',186,174,196,228),
  PK_(330,22,378,228),PK_(62,22,378,104,[[62,22,330,60,11]]),B_('path',56,104,330,114),
  C_(86,41,true,-1),C_(135,41,true,-1),C_(159,41,true,1),C_(232,41,true,-1),C_(305,41,true,-1),
  LP_(84,104),LP_(154,104),LP_(228,104),LP_(298,104),P_(104,109,1),P_(128,109,1),P_(254,109,1),P_(278,109,1),
  B_('mulch',56,6,378,22),B_('mulch',6,6,56,58),B_('garden',12,148,52,214),PR_('bench',32,124),T_(34,90,11,2),
  B_('mulch',70,172,180,184),B_('mulch',202,172,312,184),PR_('bench',160,204),PR_('bench',222,204),
  T_(104,210,14,1),T_(286,210,14,3),P_(178,182),P_(204,182),P_(322,192)]};
// The Willows: a U-shaped block round a big courtyard (the base of the U along the street, a wing down each side),
// facing straight down the cul-de-sac. The drive runs in off the turning circle to a forecourt and the mouth of the
// garage under the building. In the courtyard: a pool between decks, a sidewalk down each wing and a rounded mulch
// bed with a little tree in each corner; a tunnel through the middle of each wing cuts through from the side yards.
// Up top: a sky garden, a rooftop bar and the lift tower on the main block, a spa on one wing and a sports deck (with
// a grilling area) on the other
YARD.thewillows={apt:1,h:[70,290,320,66],dx:300,gdx:[206,254],yard:[B_('path',295,362,305,370),
  B_('drive',200,356,260,408),B_('drive',150,370,310,408),C_(230,390,true,-1),C_(170,391,true,-1),
  ST_('wing',70,64,136,290,'spa',[168,188]),ST_('wing',324,64,390,290,'sport',[168,188]),
  B_('path',30,168,146,188),B_('path',314,168,430,188),
  B_('path',136,102,146,256),B_('path',314,102,324,256),
  QC_(136,70,168,102,[0,0]),QC_(292,70,324,102,[1,0]),QC_(136,256,168,290,[0,1]),QC_(292,256,324,290,[1,1]),
  T_(146,80,10,0),T_(314,80,10,2),T_(146,280,10,3),T_(314,280,10,1),
  B_('pool',188,136,272,222),PT_(160,108,300,130,'deck'),PT_(160,228,300,250,'stone'),
  LP_(149,132),LP_(149,226),LP_(311,132),LP_(311,226),P_(166,114),P_(294,114),P_(166,244),P_(294,244),
  B_('mulch',6,6,64,56),B_('mulch',396,6,454,56),Q_('natural',100,6,360,26),T_(110,42,14,2),T_(350,42,14,0),
  Q_('mulch',6,80,26,300),Q_('mulch',434,80,454,300),T_(46,150,14,1),T_(414,230,14,3),S_(56,100,6),S_(56,260,6),S_(404,100,6),S_(404,260,6),
  B_('mulch',6,346,66,408,1),B_('mulch',394,346,454,408,1),B_('mulch',76,360,140,372,1),B_('mulch',318,360,384,372,1),
  LP_(152,374),LP_(308,374),LP_(152,404),LP_(308,404),P_(288,364,1),P_(312,364),P_(192,362,1),P_(268,362,1)]};
const HOUSES=TUTORIAL?[
  // the starter house beside the truck, and round the corner a tiny house with a pool
  {face:'S',x:190,y:Y1-FRONT-180,w:220,d:180,s:0,hood:1,level:0,name:'THE COOPERS',tag:'STARTER HOME',yard:TUT_YARDS[0]},
  {face:'E',x:XC-FRONT-190,y:560,w:210,d:190,s:1,hood:1,level:0,name:'THE WANGS',tag:'COZY BUNGALOW',yard:TUT_YARDS[1]},
  // the neighbors, with the same yards as their houses in the full game
  {s:0,hood:1,level:0,face:'S',x:12,y:Y1-FRONT-160,w:160,d:160,name:'THE KOWALSKIS',tag:'TINY HOUSE',...YARD.kowalski},{s:0,hood:1,level:0,face:'N',x:20,y:Y1+FRONT,w:182,d:180,name:'THE FLYNNS',tag:'RENTAL',...YARD.flynn},
  {s:1,hood:1,level:0,face:'S',x:430,y:Y1-FRONT-160,w:190,d:160,name:'THE BAKERS',tag:'DUPLEX',...YARD.baker},{s:2,hood:1,level:0,face:'W',x:XC+FRONT,y:520,w:240,d:220,name:'THE LINDQVISTS',tag:'BI-LEVEL',...YARD.lindqvist},
]:[
  // ---- Birch Lane
  // a corner bed out front and one out back, a tree by each
  {face:'S',x:294,y:48,w:200,d:170,s:0,hood:0,level:0,name:'THE COOPERS',tag:'STARTER HOME',h:[60,40,84,52],dx:102,yard:[
    {t:'path',x0:97,y0:98,x1:107,y1:170}, {t:'car',x:165,y:128,vert:true,dir:-1}, {t:'pot',x:118,y:104,big:false},
    {t:'fence',x0:7,y0:168,x1:96,y1:166}, {t:'drive',x0:154,y0:95,x1:194,y1:167}, {t:'fence',x0:147,y0:93,x1:194,y1:91},
    {t:'natural',x0:147,y0:40,x1:194,y1:88}, {t:'tree',x:131,y:21,r:22,pal:0}, {t:'mulch',x0:7,y0:127,x1:48,y1:164}, {t:'tree',x:51,y:128,r:29,pal:0},
    {t:'pot',x:63,y:12,big:false}, {t:'pot',x:86,y:11,big:false}, {t:'shrub',x:74,y:12,r:7}, {t:'mulch',x0:7,y0:7,x1:19,y1:40},
    {t:'shrub',x:25,y:12,r:7}]},
  // everything in pairs: two matching beds by the door, two matching corner beds out back
  {face:'N',x:334,y:362,w:220,d:180,s:1,hood:0,level:0,name:'THE WANGS',tag:'COZY BUNGALOW',h:[62,44,96,54],dx:110,yard:[
    {t:'path',x0:105,y0:104,x1:115,y1:180}, {t:'mulch',x0:6,y0:6,x1:50,y1:40}, {t:'mulch',x0:170,y0:6,x1:214,y1:40}, {t:'tree',x:40,y:128,r:20,pal:1},
    {t:'tree',x:180,y:128,r:20,pal:3}, {t:'tree',x:110,y:22,r:18,pal:0}, {t:'pot',x:60,y:152,big:false}, {t:'pot',x:160,y:152,big:false},
    {t:'mulch',x0:61,y0:102,x1:104,y1:124}, {t:'mulch',x0:117,y0:102,x1:159,y1:123}]},
  // a tiny yard: one long bed down the side fence, and both trees hang over it
  {face:'S',x:514,y:43,w:210,d:175,s:0,hood:0,level:0,name:'THE DUFFYS',tag:'FIXER-UPPER',h:[70,36,80,48],dx:96,yard:[
    {t:'path',x0:91,y0:90,x1:101,y1:175}, {t:'car',x:171,y:122,vert:true,dir:-1}, {t:'mulch',x0:6,y0:40,x1:40,y1:170}, {t:'pot',x:112,y:95,big:false},
    {t:'path',x0:153,y0:8,x1:163,y1:85}, {t:'patio',x0:112,y0:9,x1:152,y1:33}, {t:'drive',x0:153,y0:85,x1:191,y1:175}, {t:'shrub',x:198,y:167,r:7},
    {t:'shrub',x:198,y:150,r:7}, {t:'shrub',x:198,y:132,r:7}, {t:'shrub',x:198,y:115,r:7}, {t:'shrub',x:198,y:98,r:7}, {t:'shrub',x:198,y:81,r:7},
    {t:'tree',x:184,y:58,r:22,pal:2}, {t:'mulch',x0:173,y0:1,x1:217,y1:31}, {t:'tree',x:61,y:127,r:23,pal:0}, {t:'tree',x:100,y:15,r:11,pal:3}]},
  // no mulch anywhere: two patches gone to wildflowers, and an above-ground pool out back
  {face:'N',x:584,y:362,w:230,d:190,s:1,hood:0,level:1,name:'THE OKAFORS',tag:'COTTAGE',h:[50,70,100,54],dx:86,yard:[
    {t:'path',x0:81,y0:130,x1:91,y1:190}, {t:'pool',x0:120,y0:12,x1:200,y1:62}, {t:'natural',x0:140,y0:140,x1:224,y1:190},
    {t:'natural',x0:6,y0:6,x1:60,y1:50}, {t:'tree',x:179,y:92,r:22,pal:1}, {t:'tree',x:30,y:100,r:20,pal:0}, {t:'fence',x0:80,y0:187,x1:7,y1:185},
    {t:'fence',x0:93,y0:186,x1:225,y1:179}, {t:'pot',x:54,y:134,big:false}, {t:'pot',x:147,y:135,big:false}, {t:'shrub',x:216,y:15,r:10}]},
  // ---- Maple Avenue
  // a big open lawn with a long bed along the back fence, and hardly any flowerpots
  {face:'S',x:404,y:608,w:270,d:220,s:2,hood:1,level:1,name:'THE MORGANS',tag:'RANCH HOUSE',h:[40,70,110,60],dx:80,yard:[
    {t:'path',x0:75,y0:136,x1:85,y1:220}, {t:'drive',x0:160,y0:130,x1:194,y1:220}, {t:'car',x:177,y:172,vert:true,dir:-1},
    {t:'mulch',x0:67,y0:7,x1:257,y1:27}, {t:'mulch',x0:200,y0:160,x1:264,y1:220}, {t:'patio',x0:58,y0:38,x1:104,y1:64,mat:'deck',round:false},
    {t:'tree',x:39,y:38,r:24,pal:0}, {t:'tree',x:131,y:188,r:20,pal:3}, {t:'pot',x:98,y:60,big:false}, {t:'tree',x:180,y:99,r:25,pal:2},
    {t:'natural',x0:86,y0:134,x1:150,y1:153}]},
  // three corner beds the same size, and a patio out back with pots round it
  {face:'N',x:404,y:972,w:300,d:240,s:3,hood:1,level:2,name:'THE SMITHS',tag:'SPLIT LEVEL',h:[90,70,120,64],dx:133,yard:[
    {t:'path',x0:128,y0:140,x1:138,y1:240}, {t:'drive',x0:216,y0:134,x1:250,y1:240}, {t:'car',x:233,y:182,vert:true,dir:-1},
    {t:'patio',x0:98,y0:16,x1:202,y1:64,mat:'deck',round:false}, {t:'mulch',x0:6,y0:6,x1:66,y1:66}, {t:'mulch',x0:234,y0:6,x1:294,y1:66},
    {t:'tree',x:33,y:112,r:24,pal:0}, {t:'tree',x:217,y:46,r:24,pal:2}, {t:'tree',x:182,y:196,r:20,pal:1}, {t:'pot',x:114,y:26,big:true},
    {t:'pot',x:186,y:26,big:false}, {t:'pot',x:121,y:148,big:false}, {t:'pot',x:146,y:148,big:false}, {t:'fence',x0:3,y0:236,x1:75,y1:237},
    {t:'fence',x0:72,y0:236,x1:72,y1:184}, {t:'mulch',x0:25,y0:184,x1:67,y1:231}, {t:'shrub',x:10,y:224,r:16}, {t:'shrub',x:10,y:196,r:16}]},
  // a vegetable garden out back, and one huge rounded bed taking up the whole front corner
  {face:'S',x:744,y:578,w:320,d:250,s:3,hood:1,level:2,name:'THE GARCIAS',tag:'CAPE COD',h:[30,80,120,66],dx:73,yard:[
    {t:'path',x0:68,y0:152,x1:78,y1:250}, {t:'drive',x0:156,y0:146,x1:190,y1:250}, {t:'car',x:173,y:192,vert:true,dir:-1},
    {t:'garden',x0:170,y0:14,x1:300,y1:70}, {t:'mulch',x0:222,y0:100,x1:314,y1:250}, {t:'shrub',x:98,y:158,r:6}, {t:'shrub',x:116,y:158,r:6},
    {t:'shrub',x:136,y:158,r:6}, {t:'tree',x:131,y:33,r:24,pal:0}, {t:'tree',x:238,y:98,r:24,pal:3}, {t:'tree',x:118,y:214,r:20,pal:1},
    {t:'pot',x:160,y:142,big:false}, {t:'pot',x:184,y:143,big:false}, {t:'mulch',x0:6,y0:80,x1:28,y1:148}]},
  // a pool and patio out back with pots all round, a bed down each side fence and a two-car driveway
  {face:'N',x:764,y:972,w:360,d:290,s:4,hood:1,level:3,name:'THE PETROVS',tag:'COLONIAL',h:[110,120,140,74],dx:160,yard:[
    {t:'path',x0:155,y0:200,x1:165,y1:290}, {t:'drive',x0:256,y0:194,x1:310,y1:290}, {t:'car',x:272,y:216,vert:true,dir:-1},
    {t:'car',x:295,y:216,vert:true,dir:-1}, {t:'patio',x0:124,y0:72,x1:240,y1:114,mat:'stone',round:false}, {t:'pool',x0:140,y0:14,x1:240,y1:64},
    {t:'mulch',x0:6,y0:76,x1:30,y1:286}, {t:'mulch',x0:330,y0:15,x1:354,y1:165}, {t:'tree',x:70,y:92,r:26,pal:0}, {t:'tree',x:270,y:55,r:26,pal:3},
    {t:'tree',x:70,y:222,r:22,pal:1}, {t:'tree',x:210,y:265,r:20,pal:2}, {t:'pot',x:131,y:20,big:false}, {t:'pot',x:248,y:21,big:false},
    {t:'pot',x:193,y:208,big:true}, {t:'pot',x:236,y:207,big:true}, {t:'shrub',x:213,y:207,r:12}, {t:'natural',x0:108,y0:197,x1:154,y1:290},
    {t:'fence',x0:108,y0:196,x1:105,y1:290}, {t:'shrub',x:17,y:64,r:14}, {t:'shrub',x:342,y:177,r:14}]},
  // ---- Willow Heights
  // flower beds everywhere, a hedge of shrubs, and one enormous bed along the back fence
  {face:'S',x:404,y:1288,w:440,d:360,s:5,hood:2,level:3,name:'THE PATELS',tag:'CRAFTSMAN',h:[140,150,160,90],dx:198,yard:[
    B_('path',193,246,203,360),B_('drive',306,240,346,360),C_(326,292,true,-1),
    B_('mulch',60,6,380,40,1),B_('mulch',6,280,90,360,1),PT_(172,84,268,144,'brick',true),B_('mulch',144,244,186,262,1),B_('mulch',210,244,296,262,1),
    B_('garden',350,100,430,180),
    S_(112,196,8),S_(112,232,8),S_(118,160,7),S_(330,214,7),
    T_(60,130,28,0),T_(396,262,24,2),T_(310,96,24,3),
    P_(178,274,1),P_(220,274,1),P_(342,96),P_(346,188),P_(120,300),P_(272,300)]},
  // a big pool with a tree hanging over it, a stone patio and two wildflower meadows
  {face:'S',x:1284,y:1248,w:500,d:400,s:5,hood:2,level:4,name:'THE NAKAMURAS',tag:'TUDOR',h:[60,170,170,92],dx:121,yard:[
    B_('path',116,268,126,400),B_('drive',236,262,276,400),C_(256,312,true,-1),
    B_('pool',270,30,450,140),PT_(300,152,470,200,'stone'),
    B_('natural',6,6,140,120),B_('natural',380,290,494,400),
    B_('mulch',64,266,110,284,1),B_('mulch',130,266,226,284,1),B_('mulch',6,190,40,320),
    S_(300,236,8),S_(340,236,8),S_(380,236,8),
    T_(200,64,30,0),T_(470,242,26,1),T_(332,330,24,2),T_(66,360,22,3),
    P_(262,32),P_(458,30),P_(476,214),P_(104,300),P_(146,300,1),P_(296,206,1)]},
  // the manor: a formal garden by the front walk, a meadow behind, a pool and patio, and a bed in every corner
  {face:'N',x:404,y:1792,w:560,d:450,s:6,hood:2,level:4,name:'THE WHITFORDS',tag:'MANOR',h:[170,140,190,112],dx:238,yard:[
    B_('path',233,258,243,450),B_('drive',380,252,430,450),C_(405,302,true,-1),C_(405,360,true,-1),
    B_('garden',270,326,362,404),B_('pool',380,20,540,120),PT_(380,130,540,172,'brick'),B_('natural',180,20,340,100),
    B_('mulch',6,364,100,450,1),B_('mulch',6,6,100,92),B_('mulch',174,256,226,276,1),B_('mulch',250,256,356,276,1),Q_('mulch',524,220,554,420),
    S_(150,172,9),S_(150,226,9),S_(150,282,8),S_(370,206,6),
    T_(60,200,30,0),T_(462,230,28,3),T_(150,400,24,1),T_(468,400,22,2),
    P_(374,18),P_(546,22),P_(222,294,1),P_(254,294,1),P_(264,322),P_(266,414),P_(150,130)]},
  // the estate: a loop drive, gardens either side of the front walk, a huge pool, a meadow and beds all round
  {face:'N',x:1104,y:1792,w:860,d:560,s:7,hood:2,level:5,name:'THE VANDERMEERS',tag:'THE ESTATE',h:[280,170,280,130],dx:420,yard:[
    B_('path',415,306,425,560),B_('drive',290,330,330,560),B_('drive',510,330,550,560),B_('drive',290,330,550,360),
    C_(352,345,false,1),C_(476,345,false,1),C_(530,430,true,-1),
    B_('garden',340,392,400,500),B_('garden',440,392,500,500),B_('garden',30,30,180,110),
    B_('pool',560,30,800,150),PT_(560,160,800,212,'tile'),PT_(330,94,510,166,'stone',true),B_('natural',600,240,780,380),
    B_('mulch',6,452,128,560,1),B_('mulch',732,452,854,560,1),B_('mulch',240,6,500,26,1),Q_('mulch',6,170,34,370),Q_('mulch',826,250,854,390),
    B_('mulch',284,304,404,322,1),B_('mulch',436,304,556,322,1),
    S_(250,200,10),S_(250,262,10),S_(232,330,9),S_(578,236,9),S_(578,290,9),S_(620,410,8),
    T_(120,250,34,0),T_(820,100,30,1),T_(240,470,26,2),T_(620,470,26,3),T_(420,48,30,0),T_(200,74,26,2),T_(720,300,28,1),T_(110,420,26,3),
    P_(318,104,1),P_(522,104,1),P_(556,26),P_(804,26),P_(556,214),P_(804,214),P_(404,334),P_(436,334),P_(336,388),P_(504,388)]},
  // ---- the rest of each street
  {s:0,hood:0,level:0,face:'S',x:116,y:58,w:160,d:160,name:'THE KOWALSKIS',tag:'TINY HOUSE',...YARD.kowalski},
  {s:1,hood:0,level:0,face:'S',x:744,y:48,w:200,d:170,name:'THE RAMIREZES',tag:'SHOTGUN HOUSE',...YARD.ramirez},
  {s:0,hood:0,level:0,face:'S',x:964,y:58,w:190,d:160,name:'THE BAKERS',tag:'DUPLEX',...YARD.baker},
  {s:1,hood:0,level:1,face:'S',x:1174,y:38,w:200,d:180,name:'THE NGUYENS',tag:'MILL HOUSE',...YARD.nguyen},
  {s:0,hood:0,level:0,face:'N',x:124,y:362,w:182,d:180,name:'THE FLYNNS',tag:'RENTAL',...YARD.flynn},
  {s:1,hood:0,level:1,face:'N',x:834,y:362,w:190,d:180,name:'THE ABERNATHYS',tag:'BUNGALOW',...YARD.abernathy},
  {s:2,hood:1,level:2,face:'W',x:1326,y:420,w:240,d:220,name:'THE LINDQVISTS',tag:'BI-LEVEL',...YARD.lindqvist},
  {s:1,hood:1,level:1,face:'W',x:1326,y:670,w:160,d:200,name:'THE OSEIS',tag:'CABIN',...YARD.osei},
  {s:2,hood:1,level:1,face:'S',x:124,y:608,w:250,d:220,name:'THE MILLERS',tag:'RAISED RANCH',...YARD.miller},
  {s:4,hood:2,level:3,face:'S',x:864,y:1318,w:400,d:330,name:'THE ASHFORDS',tag:'GEORGIAN',...YARD.ashford},
  {s:5,hood:2,level:3,face:'S',x:1804,y:1348,w:170,d:300,name:'THE DELACROIXS',tag:'TOWNHOUSE',...YARD.delacroix},
  {s:4,hood:2,level:4,face:'N',x:124,y:1792,w:250,d:240,name:'THE HARTWELLS',tag:'VICTORIAN',...YARD.hartwell},
  // ---- an apartment block at the end of each street
  {s:1,hood:0,level:1,face:'W',x:1326,y:226,w:186,d:410,name:'BIRCH COURT',tag:'APARTMENTS',...YARD.birchcourt},
  {s:2,hood:1,level:2,face:'E',x:4,y:972,w:384,d:228,name:'MAPLE GARDENS',tag:'APARTMENTS',...YARD.maplegardens},
  {s:6,hood:2,level:4,face:'W',x:2196,y:1490,w:460,d:408,name:'THE WILLOWS',tag:'LUXURY CONDOS',...YARD.thewillows},
];
// lots that are scenery only (none now: every house on the map is one you can work)
const FILLERS=[];
