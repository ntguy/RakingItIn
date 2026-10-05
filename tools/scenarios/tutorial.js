// run with --hash tutorial: the red arrow should show for the first goal and the goals panel should be hidden
await new Promise(r=>setTimeout(r,500));
const a=document.getElementById('tutArrow');
const out={i:TUT.i,arrow:a.style.display,left:a.style.left,top:a.style.top,goals:document.querySelector('#view0 #goals').style.display};
return out;
