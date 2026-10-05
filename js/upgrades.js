'use strict';
// ============================================================ upgrades + attachments
const UPG={
  spare:{name:'SPARE BATTERY',ic:'+',col:'#4bc26a',desc:'+1 charged battery kept in the truck, recharged overnight.',max:5,price:n=>[100,300,600,1000,1500][n]},
  cap:{name:'BIG BATTERY',ic:'B',col:'#2a9a5a',desc:'+20% battery capacity. Heavier: -5% move speed.',max:5,price:n=>[100,200,400,700,1200][n]},
  tune:{name:'ENGINE TUNE-UP',ic:'~',col:'#fe5f55',desc:'More power for every nozzle; drains a bit faster.',max:4,price:n=>[250,500,1000,2000][n]},
  boots:{name:'WORK BOOTS',ic:'>',col:'#009dff',desc:'+7% move speed.',max:5,price:n=>[150,200,275,375,500][n]},
  tarp:{name:'TARP COUNT',ic:'#',col:'#3d86e0',desc:n=>`+1 tarp per day (Current: ${1+n}).`,max:4,price:n=>[400,600,800,1000][n]},
  bigtarp:{name:'BIG TARP',ic:'[]',col:'#8a5ae0',desc:'+25% tarp area.',max:2,price:n=>[300,500][n]},
  solar:{name:'SOLAR PANEL',ic:'S',col:'#e0a82a',desc:'Charge drained batteries with the sun; strongest at midday.',max:1,price:n=>[1000][n]},
  light:{name:'FLASHLIGHT',ic:'!',col:'#ffcf4a',desc:n=>['Mounted flashlight lets you see after 8PM.','Upgrade to a brighter and wider beam.','Add a full-body light suit to illuminate in a circle.','Mounted flashlight, bright wide beam and a full-body light suit.'][n],max:3,price:n=>[49,199,449][n]},
  rakecap:{name:'RAKE CAPACITY',ic:'R+',col:'#e0a85a',desc:n=>n<RAKE_CAPS.length-1?`Deeper rake head can hold +${RAKE_CAPS[n+1]-RAKE_CAPS[n]} leaves.`:`Deep rake head holds ${RAKE_CAPS[n]} leaves.`,max:3,price:n=>[300,800,1500][n]},
  rakewide:{name:'WIDE RAKE',ic:'&lt;R&gt;',col:'#c08a4a',desc:'+25% rake width. -4% move speed while raking.',max:4,price:n=>[150,350,500,750][n]},
  rakeshovel:{name:'RAKE SHOVEL',ic:'R&gt;',col:'#b07a48',desc:n=>['Rake can now push leaves in front of it.','Reduce slowdown from pushing leaves by half.','Rake pushes leaves in front of it, with half the slowdown.'][n],max:2,price:n=>[500,1000][n]},
  sticky:{name:'STICKY TARP',ic:'*',col:'#e2742a',desc:'Increase tarp grip so leaves are harder to blow off.',max:3,price:n=>[222,555,1111][n]},
};
const ATT=[
  {id:'std',name:'STANDARD TIP',short:'STANDARD',desc:'The one that came in the box. Does a bit of everything.',price:0,range:1,coneLo:31,coneHi:24,force:1,lift:1,drain:1,tube:14,tip:'#ff9800'},
  {id:'fan',name:'FAN NOZZLE',short:'FAN',desc:'Wide, short, flat sheet of air. Keeps leaves on the ground. Sweeps lawns into rows.',price:149,range:.72,coneLo:58,coneHi:50,force:.9,lift:.3,drain:.9,tube:13,tip:'#009dff',wide:true},
  {id:'long',name:'LONG TUBE',short:'LONG',desc:'Extension tube. +45% reach and a tighter stream for pushing piles from far away.',price:199,range:1.45,coneLo:23,coneHi:17,force:.95,lift:.9,drain:1,tube:22,tip:'#ffcf4a'},
  {id:'jet',name:'JET TIP',short:'JET',desc:'Needle-thin and brutal. Blasts leaves out of corners and off fences, but into the air.',price:299,range:1.15,coneLo:10,coneHi:7.5,force:2.1,lift:1.6,drain:1.15,tube:16,tip:'#fe5f55'},
  {id:'eco',name:'ECO TIP',short:'ECO',desc:'Gentler air, but uses 35% less battery. Great for long days.',price:139,range:.9,coneLo:30,coneHi:24,force:.72,lift:.8,drain:.65,tube:14,tip:'#4bc26a'},
  {id:'twin',name:'TWIN NOZZLE',short:'TWIN',desc:'Splits the air out the front and the back at the same time.',price:499,range:.92,coneLo:26,coneHi:21,force:.72,lift:.8,drain:1.3,tube:9,tip:'#ff5f8f',twin:true},
  {id:'vortex',name:'VORTEX TIP',short:'VORTEX',desc:'Spins the air so leaves swirl in toward one spot. Builds piles right where you aim.',price:499,range:1,coneLo:36,coneHi:30,force:1.05,lift:.45,drain:1.1,tube:15,tip:'#b06cff',vortex:true},
];
const TUNE={force:[1,1.2,1.4,1.6,2],range:[1,1.05,1.12,1.22,1.35],lift:[1,1.15,1.25,1.35,1.65],drain:[1,1.05,1.12,1.2,1.35]};
const BASE={lowF:600,highF:731,lowR:74,highR:90,liftHi:.18};
let upg={spare:0,cap:0,tune:0,boots:0,tarp:0,bigtarp:0,sticky:0,light:0,solar:0,rakecap:0,rakewide:0,rakeshovel:0};
let owned=['std'],equipped='std';
const att=()=>ATT.find(a=>a.id===equipped)||ATT[0];
// a stock battery holds BATT_BASE units of charge (the drain rates are in the same units)
const BATT_BASE=85,capacity=()=>BATT_BASE*(1+.2*upg.cap);
const spareMax=()=>1+upg.spare;
const moveMul=()=>(1-.05*upg.cap)*(1+.07*upg.boots);
// everyone starts with one tarp a day; each Tarp Count level adds another
const tarpsOwned=()=>1+upg.tarp;
const tarpDims=()=>{const k=1+.25*upg.bigtarp;return[Math.round(44*k),Math.round(32*k)];};
const DRAIN_LO=1.25,DRAIN_HI=3.6;
const drainRate=m=>m===0?0:(m===2?DRAIN_HI:DRAIN_LO)*att().drain*TUNE.drain[upg.tune];
