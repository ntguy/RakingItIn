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
const PR_=(k,x,y)=>({t:'prop',k,x,y}),ST_=(k,x0,y0,x1,y1)=>({t:'struct',k,x0,y0,x1,y1});
const PT_=(x0,y0,x1,y1,m,round)=>({t:'patio',x0,y0,x1,y1,mat:m,round:!!round});
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
  nguyen:{h:[40,104,100,50],dx:78,yard:[B_('path',73,160,83,180),{t:'pool',x0:104,y0:12,x1:176,y1:84,round:true},
    T_(62,52,40,0),B_('mulch',6,128,36,180),B_('mulch',122,158,150,172),P_(96,164),P_(184,96)]},
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
YARD.birchcourt={apt:1,h:[26,52,114,118],dx:83,yard:[B_('path',78,176,88,240),
  Q_('mulch',6,186,30,240),B_('mulch',6,6,46,40),B_('mulch',36,174,70,186),PR_('dumpster',140,206),PR_('bikerack',118,184),
  T_(132,28,18,0),T_(56,210,15,2),P_(100,184)]};
YARD.maplegardens={apt:1,h:[20,12,260,54],dx:150,yard:[B_('path',145,72,155,116),
  B_('mulch',24,72,136,84),B_('mulch',164,72,276,84),PR_('bench',112,102),PR_('bench',188,102),T_(52,100,14,1),T_(250,100,14,3),T_(10,40,12,0),P_(138,92),P_(162,92)]};
// The Willows: a U-shaped block round a courtyard (the base of the U along the street, a wing down each side) with
// a shared pool between decks, six little trees, a fountain plaza out front, and a parking garage down the far side
YARD.thewillows={apt:1,h:[90,250,280,70],dx:230,yard:[B_('path',225,326,235,420),B_('drive',252,326,284,420),B_('drive',284,336,450,366),
  ST_('wing',90,60,160,250),ST_('wing',300,60,370,250),ST_('garage',386,96,450,330),C_(322,351,false,1),C_(362,351,false,1),
  B_('pool',184,112,276,196),PT_(166,68,294,106,'deck'),PT_(166,202,294,244,'stone'),
  T_(172,110,11,0),T_(288,110,11,2),T_(172,198,11,3),T_(288,198,11,1),T_(206,36,12,2),T_(254,36,12,0),
  {t:'pool',x0:104,y0:340,x1:184,y1:412,round:true,inground:true},B_('mulch',196,332,220,412,1),B_('mulch',290,374,450,414,1),
  Q_('mulch',6,40,30,300),Q_('natural',96,6,364,24),Q_('mulch',6,330,90,420,1),
  S_(110,330,6),S_(150,330,6),S_(330,328,6),S_(362,328,6),P_(212,328,1),P_(244,330,1),P_(168,72),P_(292,72),P_(168,240),P_(292,240)]};
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
  {face:'S',x:190,y:48,w:200,d:170,s:0,hood:0,level:0,name:'THE COOPERS',tag:'STARTER HOME',h:[60,40,84,52],dx:102,yard:[
    B_('path',97,98,107,170),B_('drive',150,92,180,170),C_(165,128,true,-1),
    B_('mulch',6,112,72,170),B_('mulch',62,95,92,108),B_('mulch',6,6,52,44),
    T_(40,96,20,0),T_(168,40,22,2),P_(118,101)]},
  // everything in pairs: two matching beds by the door, two matching corner beds out back
  {face:'N',x:230,y:362,w:220,d:180,s:1,hood:0,level:0,name:'THE WANGS',tag:'COZY BUNGALOW',h:[62,44,96,54],dx:110,yard:[
    B_('path',105,104,115,180),
    B_('mulch',66,103,100,121),B_('mulch',120,103,154,121),B_('mulch',6,6,50,40),B_('mulch',170,6,214,40),
    T_(40,128,20,1),T_(180,128,20,3),T_(110,22,18,0),P_(60,152),P_(160,152)]},
  // a tiny yard: one long bed down the side fence, and both trees hang over it
  {face:'S',x:410,y:43,w:210,d:175,s:0,hood:0,level:0,name:'THE DUFFYS',tag:'FIXER-UPPER',h:[70,36,80,48],dx:96,yard:[
    B_('path',91,90,101,175),B_('drive',156,84,186,175),C_(171,122,true,-1),
    B_('mulch',6,40,40,170),T_(54,70,22,0),T_(56,140,20,2),P_(112,95)]},
  // no mulch anywhere: two patches gone to wildflowers, and an above-ground pool out back
  {face:'N',x:480,y:362,w:230,d:190,s:1,hood:0,level:1,name:'THE OKAFORS',tag:'COTTAGE',h:[50,70,100,54],dx:86,yard:[
    B_('path',81,130,91,190),B_('pool',120,12,200,62),
    B_('natural',140,140,224,190),B_('natural',6,6,60,50),
    T_(190,98,22,1),T_(30,100,20,0),P_(40,142),P_(104,136)]},
  // ---- Maple Avenue
  // a big open lawn with a long bed along the back fence, and hardly any flowerpots
  {face:'S',x:300,y:608,w:270,d:220,s:2,hood:1,level:1,name:'THE MORGANS',tag:'RANCH HOUSE',h:[40,70,110,60],dx:80,yard:[
    B_('path',75,136,85,220),B_('drive',160,130,194,220),C_(177,172,true,-1),
    B_('mulch',40,6,230,26),B_('mulch',200,160,264,220),B_('mulch',44,134,72,152),PT_(58,38,104,64,'deck'),
    T_(132,42,24,0),T_(232,108,22,2),T_(30,176,20,3),P_(94,142)]},
  // three corner beds the same size, and a patio out back with pots round it
  {face:'N',x:300,y:972,w:300,d:240,s:3,hood:1,level:2,name:'THE SMITHS',tag:'SPLIT LEVEL',h:[90,70,120,64],dx:133,yard:[
    B_('path',128,140,138,240),B_('drive',216,134,250,240),C_(233,182,true,-1),PT_(98,16,202,64,'deck'),
    B_('mulch',6,180,66,240),B_('mulch',6,6,66,66),B_('mulch',234,6,294,66),
    T_(60,122,24,0),T_(262,122,24,2),T_(182,196,20,1),
    P_(114,26,1),P_(186,26),P_(121,148),P_(146,148)]},
  // a vegetable garden out back, and one huge rounded bed taking up the whole front corner
  {face:'S',x:640,y:578,w:320,d:250,s:3,hood:1,level:2,name:'THE GARCIAS',tag:'CAPE COD',h:[30,80,120,66],dx:73,yard:[
    B_('path',68,152,78,250),B_('drive',156,146,190,250),C_(173,192,true,-1),B_('garden',170,14,300,70),
    B_('mulch',222,100,314,250),B_('mulch',34,150,62,168),
    S_(92,158,6),S_(112,158,6),S_(132,158,6),
    T_(60,42,24,0),T_(204,108,24,3),T_(118,214,20,1),P_(166,76),P_(40,200),P_(148,182)]},
  // a pool and patio out back with pots all round, a bed down each side fence and a two-car driveway
  {face:'N',x:660,y:972,w:360,d:290,s:4,hood:1,level:3,name:'THE PETROVS',tag:'COLONIAL',h:[110,120,140,74],dx:160,yard:[
    B_('path',155,200,165,290),B_('drive',256,194,310,290),C_(270,242,true,-1),C_(296,236,true,-1),
    PT_(124,72,240,114,'stone'),B_('pool',140,14,240,64),
    B_('mulch',6,40,30,250),B_('mulch',330,30,354,180),B_('mulch',114,198,148,216),
    T_(70,92,26,0),T_(300,100,26,3),T_(70,222,22,1),T_(212,252,20,2),
    P_(134,80,1),P_(226,80),P_(132,40),P_(248,40),P_(148,206),P_(172,206)]},
  // ---- Willow Heights
  // flower beds everywhere, a hedge of shrubs, and one enormous bed along the back fence
  {face:'S',x:300,y:1288,w:440,d:360,s:5,hood:2,level:3,name:'THE PATELS',tag:'CRAFTSMAN',h:[140,150,160,90],dx:198,yard:[
    B_('path',193,246,203,360),B_('drive',306,240,346,360),C_(326,292,true,-1),
    B_('mulch',60,6,380,40,1),B_('mulch',6,280,90,360,1),PT_(172,84,268,144,'brick',true),B_('mulch',144,244,186,262,1),B_('mulch',210,244,296,262,1),
    B_('garden',350,100,430,180),
    S_(112,196,8),S_(112,232,8),S_(118,160,7),S_(330,214,7),
    T_(60,130,28,0),T_(396,262,24,2),T_(310,96,24,3),
    P_(178,274,1),P_(220,274,1),P_(342,96),P_(346,188),P_(120,300),P_(272,300)]},
  // a big pool with a tree hanging over it, a stone patio and two wildflower meadows
  {face:'S',x:1180,y:1248,w:500,d:400,s:5,hood:2,level:4,name:'THE NAKAMURAS',tag:'TUDOR',h:[60,170,170,92],dx:121,yard:[
    B_('path',116,268,126,400),B_('drive',236,262,276,400),C_(256,312,true,-1),
    B_('pool',270,30,450,140),PT_(300,152,470,200,'stone'),
    B_('natural',6,6,140,120),B_('natural',380,290,494,400),
    B_('mulch',64,266,110,284,1),B_('mulch',130,266,226,284,1),B_('mulch',6,190,40,320),
    S_(300,236,8),S_(340,236,8),S_(380,236,8),
    T_(200,64,30,0),T_(470,242,26,1),T_(332,330,24,2),T_(66,360,22,3),
    P_(262,32),P_(458,30),P_(476,214),P_(104,300),P_(146,300,1),P_(296,206,1)]},
  // the manor: a formal garden by the front walk, a meadow behind, a pool and patio, and a bed in every corner
  {face:'N',x:300,y:1792,w:560,d:450,s:6,hood:2,level:4,name:'THE WHITFORDS',tag:'MANOR',h:[170,140,190,112],dx:238,yard:[
    B_('path',233,258,243,450),B_('drive',380,252,430,450),C_(405,302,true,-1),C_(405,360,true,-1),
    B_('garden',270,326,362,404),B_('pool',380,20,540,120),PT_(380,130,540,172,'brick'),B_('natural',180,20,340,100),
    B_('mulch',6,364,100,450,1),B_('mulch',6,6,100,92),B_('mulch',174,256,226,276,1),B_('mulch',250,256,356,276,1),Q_('mulch',524,220,554,420),
    S_(150,172,9),S_(150,226,9),S_(150,282,8),S_(370,206,6),
    T_(60,200,30,0),T_(462,230,28,3),T_(150,400,24,1),T_(468,400,22,2),
    P_(374,18),P_(546,22),P_(222,294,1),P_(254,294,1),P_(264,322),P_(266,414),P_(150,130)]},
  // the estate: a loop drive, gardens either side of the front walk, a huge pool, a meadow and beds all round
  {face:'N',x:1000,y:1792,w:860,d:560,s:7,hood:2,level:5,name:'THE VANDERMEERS',tag:'THE ESTATE',h:[280,170,280,130],dx:420,yard:[
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
  {s:0,hood:0,level:0,face:'S',x:12,y:58,w:160,d:160,name:'THE KOWALSKIS',tag:'TINY HOUSE',...YARD.kowalski},
  {s:1,hood:0,level:0,face:'S',x:640,y:48,w:200,d:170,name:'THE RAMIREZES',tag:'SHOTGUN HOUSE',...YARD.ramirez},
  {s:0,hood:0,level:0,face:'S',x:860,y:58,w:190,d:160,name:'THE BAKERS',tag:'DUPLEX',...YARD.baker},
  {s:1,hood:0,level:1,face:'S',x:1070,y:38,w:200,d:180,name:'THE NGUYENS',tag:'MILL HOUSE',...YARD.nguyen},
  {s:0,hood:0,level:0,face:'N',x:20,y:362,w:182,d:180,name:'THE FLYNNS',tag:'RENTAL',...YARD.flynn},
  {s:1,hood:0,level:1,face:'N',x:730,y:362,w:190,d:180,name:'THE ABERNATHYS',tag:'BUNGALOW',...YARD.abernathy},
  {s:2,hood:1,level:2,face:'W',x:1222,y:400,w:240,d:220,name:'THE LINDQVISTS',tag:'BI-LEVEL',...YARD.lindqvist},
  {s:1,hood:1,level:1,face:'W',x:1222,y:670,w:160,d:200,name:'THE OSEIS',tag:'CABIN',...YARD.osei},
  {s:2,hood:1,level:1,face:'S',x:20,y:608,w:250,d:220,name:'THE MILLERS',tag:'RAISED RANCH',...YARD.miller},
  {s:4,hood:2,level:3,face:'S',x:760,y:1318,w:400,d:330,name:'THE ASHFORDS',tag:'GEORGIAN',...YARD.ashford},
  {s:5,hood:2,level:3,face:'S',x:1700,y:1348,w:170,d:300,name:'THE DELACROIXS',tag:'TOWNHOUSE',...YARD.delacroix},
  {s:4,hood:2,level:4,face:'N',x:20,y:1792,w:250,d:240,name:'THE HARTWELLS',tag:'VICTORIAN',...YARD.hartwell},
  // ---- an apartment block at the end of each street
  {s:1,hood:0,level:1,face:'W',x:1222,y:226,w:166,d:240,name:'BIRCH COURT',tag:'APARTMENTS',...YARD.birchcourt},
  {s:2,hood:1,level:2,face:'E',x:12,y:1000,w:300,d:116,name:'MAPLE GARDENS',tag:'APARTMENTS',...YARD.maplegardens},
  {s:6,hood:2,level:4,face:'W',x:2080,y:1490,w:460,d:420,name:'THE WILLOWS',tag:'LUXURY CONDOS',...YARD.thewillows},
];
// lots that are scenery only (none now: every house on the map is one you can work)
const FILLERS=[];
