// Headless test runner for the game. Loads index.html in Chrome, waits for boot, runs a scenario script inside the
// page (its body is an async function; `return` a value to print it), optionally screenshots, and prints any page
// errors. Needs Chrome installed (set CHROME to its binary if it isn't in the usual macOS place) and `npm install`
// run once in this folder.
//   node tools/run.js scenarios/smoke.js                       run a scenario, print its result and errors
//   node tools/run.js scenarios/map.js --out map.png --size 1070x1190
//   node tools/run.js scenarios/lots.js --args '{"ids":[0,1,2],"sc":2}' --out lots.png --size 1900x500
//   node tools/run.js scenarios/perf.js --throttle 4 --size 1920x1080 --dpr 2
//   node tools/run.js scenarios/tutorial.js --hash tutorial
// Scenarios can read --args as window.__args.
const puppeteer=require('puppeteer-core'),fs=require('fs'),path=require('path');
const a=process.argv.slice(2),opt={hash:'',out:'',size:'1280x720',dpr:'1',throttle:'1',args:'{}'};let scr=null;
for(let i=0;i<a.length;i++){if(a[i].startsWith('--'))opt[a[i].slice(2)]=a[++i];else scr=a[i];}
const CHROME=process.env.CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
(async()=>{
  const [w,h]=opt.size.split('x').map(Number);
  const b=await puppeteer.launch({executablePath:CHROME,headless:'new',args:['--autoplay-policy=no-user-gesture-required','--allow-file-access-from-files']});
  const p=await b.newPage();await p.setViewport({width:w,height:h,deviceScaleFactor:+opt.dpr});
  const errs=[];p.on('pageerror',e=>errs.push('PAGE ERROR '+e.message+'\n'+(e.stack||'')));
  p.on('console',m=>{if(m.type()==='error'||m.type()==='warning')errs.push(m.type()+': '+m.text());});
  const url='file://'+path.resolve(__dirname,'..','index.html').split(path.sep).map(encodeURIComponent).join('/').replace(/^%2F|^/,'/')+(opt.hash?'#'+opt.hash:'');
  await p.goto(url,{waitUntil:'load'});await new Promise(r=>setTimeout(r,800));
  if(+opt.throttle>1){const c=await p.target().createCDPSession();await c.send('Emulation.setCPUThrottlingRate',{rate:+opt.throttle});}
  if(scr){const code=fs.readFileSync(path.resolve(process.cwd(),scr),'utf8');
    try{const r=await p.evaluate(`(async()=>{window.__args=${opt.args};${code}})()`);if(r!==undefined)console.log(typeof r==='string'?r:JSON.stringify(r,null,1));}
    catch(e){console.log('SCENARIO ERROR',e.message);}}
  if(opt.out)await p.screenshot({path:opt.out});
  console.log(errs.join('\n')||'no errors');
  await b.close();
})();
