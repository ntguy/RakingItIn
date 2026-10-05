# Raking It In: map for working on the game

A top-down pixel-art leaf-blowing game. It is a static site with no build step: `index.html` loads
`css/style.css` and then the plain scripts in `js/` in a fixed order. It runs from GitHub Pages or by opening
`index.html` directly. Music is in `music/`.

## Rules from the owner
- **Never push without asking first.** Committing locally is fine. The repo is `ntguy/RakingItIn` on the personal
  account. Commits use the repo's local identity, so check it isn't the global work email. Don't use `gh` here: it's
  logged in to a work account.
- **Every yard is laid out by hand.** No procedural or seeded yards, and no empty "scenery" houses: every house
  on the map can be worked.
- When the owner says to ask questions first, ask before coding.
- Write code like the code around it: dense one-line-per-idea JS, short plain-English comments that explain *why*,
  and names that match the existing ones.

## How the scripts fit together
- These are classic scripts, not modules. Every top-level `function`, `const` and `let` is a global shared by
  every file.
- Load order matters at load time only. A file's top-level code can't call a function from a *later* file while
  it's loading, because function hoisting doesn't cross files. Once everything has loaded, anything can call anything.
- Order is set by the `<script>` tags in `index.html`:
  util, constants, houses, upgrades, neighborhood, yard-format, leaves, background, state, gamepad, input, audio,
  interactions, day, physics, traffic, update, render, hud, editor, net, tutorial, goals, perf, main.
- `js/perf.js` times functions by replacing `window[name]`. Keep the timed functions as top-level `function`
  declarations.

## Where things live
| file | what's in it |
|---|---|
| `util.js` | rng (`mulberry`, `rnd`), `hash`, noise, pixel drawing helpers (`pcircle`, `pline`), `fmt$`, `clamp` |
| `constants.js` | street geometry (`STREET` corners → `ROADS`/`CIRCLES`/`BULB`, `STREET_HOOD`), world size, money/rep tables (`REP_LEVELS`, `lotLocked`), rake/net/pool constants, palettes |
| `houses.js` | **all house data.** Yard item helpers `B_ Q_ PT_ T_ P_ S_ C_ F_ GT_ PR_ ST_`, the `YARD` table, `HOUSES` (each: face, x, y, w, d, style s, hood, level, name, tag, house rect `h`, door `dx`, `yard` items), `FILLERS` (empty on purpose) |
| `upgrades.js` | `UPG` store items, `ATT` nozzles, battery (`BATT_BASE`, `capacity`), tarps (`tarpsOwned` = 1 + level) |
| `neighborhood.js` | world maps `REG` (road/verge/sidewalk/lot), `LOT_AT`, `ZONE_AT`, `WATER`; `buildLots`, sidewalk and traffic path shapes (`streetSide`, `bulbArc`), `orient` (lot local frame → world: `L.T`, `L.toLocal`), `makeLot`, patio furniture (`planFurniture`, `drawFurniture`, `FURN_GROUPS`), nets, pots |
| `yard-format.js` | turns yard items into a lot: `resolveYardRect` (snapping beds to fences, `sq` keeps a bed square), `applyYard`, `yardFromLot` (for the editor) |
| `leaves.js` | leaves as typed arrays (`LX LY LZ VX VY VZ ST HOME`…), `addLeaf`/`removeLeaf`, `spawnLot`, `MAX` |
| `background.js` | the pre-rendered world (`buildBackground`, `decorateStreets`), per-lot painting (`renderLot`, `paintZone` incl. patio surfaces and round pools), houses (`drawHouse`, `drawApartment`, `drawStruct`), fences/gates by neighborhood, car sprites (`makeCar`/`makeOldCar`/`makeLuxCar`, `carCol`), tree canopies |
| `state.js` | global game state, players (`newPlayer`, `usePl`/`storePl`/`withPl`, join/leave), canvas views (`layoutViews`, split screen), floating text and speech bubbles |
| `gamepad.js` | controller polling, menu navigation, button glyphs (`KB_GLY`, `PAD_GLY`, `glyphInner`, `G()`), controls sheets |
| `input.js` | keyboard and mouse, saving and loading, the title screen |
| `audio.js` | Web Audio (blower, engine, rustle, `blip`) and the music |
| `interactions.js` | `interact` (E/A), tarps, pool net, rake, flowerpots, closeout (`lotStats`, `calcPay`, `confirmCloseout`), package stealing |
| `day.js` | `newToday`, `resetDay`, pause menu and settings, `endDay`, reputation (`repTally`), night summary and store (`renderNight`, `coopStore`), `pxIcon` |
| `physics.js` | player collision, leaf physics (`updateLeaves`, the `HOT` grid that skips leaves nothing can stir), trees, pools, rakes, pots, particles |
| `traffic.js` | the truck (`updateTruck`, crashes), pedestrians and Blu, traffic AI (`driveVehicle`, the jam fallback where a stuck car drives through: `GHOST_ON`/`GHOST_OFF`), mail, police, parcel van and couriers, packages, critters |
| `update.js` | `update(dt)` (the order of every system), `updatePlayer`, `updateCamera` |
| `render.js` | `renderView` (draw order), leaves, tarps, pools, the player, cars, people, lighting at night, mailboxes and walk lamps |
| `hud.js` | `updateHUD`/`hudView`: money, battery, house panel, prompts, the goals panel |
| `editor.js` | yard editor (saved to `localStorage` key `rakingitin-yards-v2`, which overrides a house's built-in yard) |
| `net.js` | online play over PeerJS: the host runs the game, the guest sends inputs and draws snapshots (`netHostTick`, `applySnapshot`) |
| `tutorial.js` | `TUT_STEPS`, `tutOk` (what's unlocked), the red arrow, the tutorial modals |
| `goals.js` | `GOAL_DEFS` (27, rewards $50→$500), the active three, tracking hooks (`goalAdd`, `goalBest`, `goalsHouse`), bed counts, `goalRows` (panel lines), `toggleGoals` |
| `perf.js` | F3 profiler overlay (`perfSet`, `perfText`, `perfReport()` in the console) |
| `main.js` | boot: build the world, create player 1, title screen, the frame loop |

## Core ideas
- **Lots** are built in a local frame where the street runs along `y = d`, then rotated into place by `face`
  (S, N, W, E). `L.lz`, `L.lpaved` and so on are local; `L.zones`, `L.paved` and `L.house` are world.
  Anything drawn into a lot's canvas is rotated with it. A north-facing yard is painted upside down, which is why
  mailboxes and walk lamps are drawn as world sprites.
- **Zones:** mulch and natural count as good; garden, patio and pool are fancy (a penalty). Shapes: `r` rect, `q`
  corner quarter, `e` ellipse. `ZONE_AT`/`LOT_AT` answer "which zone or lot is this pixel in" with one lookup.
- **Leaf state** `ST`: 0 free, 1 under a tarp, 2 being tied, 3 floating in a pool, 4 in a net, 5 in a rake.
  `HOME[i]` is the house the leaf belongs to (its index in `LOTS`).
- **The current player:** game code works on the globals `P`, `aim`, `power`, `battery`, `bundle` and so on.
  `usePl(pl)` loads a player into them, `storePl()` writes them back, and `withPl(pl, fn)` runs as someone else.
- **Neighborhoods** (`hood`): 0 Birch Lane (old cars, chain-link, litter), 1 Maple Avenue, 2 Willow Heights
  (hedges, luxury cars, flower beds). Each house has a reputation `level` it needs before it will pay.
- **Saves:** `leafblower-save-v3` (money, day, rep, upgrades, goals), plus small `rakingitin-*-v1` settings keys.

## Testing
`cd tools && npm install` once (needs Chrome; set `CHROME` if it's not in the macOS default place). Then, from the
repo root:
- `node tools/run.js tools/scenarios/smoke.js`: boots a new game and prints goals and any page errors.
- `node tools/run.js tools/scenarios/traffic.js`: a day of traffic. Every vehicle should finish (maxS ≈ pathLen)
  and mail should reach every mailbox.
- `node tools/run.js tools/scenarios/goals.js`: house goals, stealing, the night summary.
- `node tools/run.js tools/scenarios/tutorial.js --hash tutorial`.
- `node tools/run.js tools/scenarios/map.js --out map.png --size 1070x1190`: the whole map. `lots.js --args
  '{"ids":[0,1],"sc":2}'` gives house close-ups and `crop.js --args '{"crop":[x,y,w,h]}'` any area. Look at the
  PNG to check layouts.
- `node tools/run.js tools/scenarios/perf.js --throttle 4 --dpr 2 --size 1920x1080`: profiler readings on a slow CPU.

Scenarios are async function bodies run in the page, with full access to the game's globals. `return` a value to
print it. Write PNGs and scratch output outside the repo, or rely on `.gitignore` (which ignores `*.png`).
