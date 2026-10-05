// new game, stand at the first house, blow at high speed for a moment: should print the goals and no errors
localStorage.clear();document.querySelector('#titleBtns button').click();await new Promise(r=>setTimeout(r,300));closeMenu();
const L=LOTS[0];P.x=L.door.x;P.y=L.door.y+20;mouse.r=true;await new Promise(r=>setTimeout(r,1500));
return {state,houses:LOTS.length,leaves:N,goals:goalRows(cur).map(r=>[r.id,r.num,r.bad])};
