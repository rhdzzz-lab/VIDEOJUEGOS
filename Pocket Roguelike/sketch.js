const GRID_W = 10;
const GRID_H = 10;
const TILE   = 48;

const CANVAS_W = GRID_W * TILE + 220; 
const CANVAS_H = GRID_H * TILE;

const COLORS = {
  bg:    '#0b1020',
  tile:  '#111827',
  wall:  '#0f172a',
  grid:  '#1f2937',
  floor: '#0b132b',
  stairs:'#22c55e',
  player:'#60a5fa',
  enemy: '#f97316',
  potion:'#a78bfa',
  text:  '#e5e7eb',
  dim:   '#94a3b8',
  hpHi:  '#22c55e',
  hpMd:  '#f59e0b',
  hpLo:  '#ef4444',
};

const CELL = {
  FLOOR: 0,
  WALL:  1,
  STAIRS:2
};

const GS = {
  AWAIT_INPUT: 'AWAIT_INPUT',
  ENEMY_TURN:  'ENEMY_TURN',
  WIN:         'WIN',
  GAME_OVER:   'GAME_OVER'
};

let map, player, enemies, items, gameState, log;

function setup(){
  createCanvas(CANVAS_W, CANVAS_H);
  textFont('system-ui, -apple-system, Segoe UI, Roboto, sans-serif');
  newGame();
}

function newGame(){
  map = genMap();
  player = makePlayer(1,1);
  enemies = spawnEnemies(4);
  items = spawnItems({potions:3});
  gameState = GS.AWAIT_INPUT;
  log = [];
  addLog('¡Te adentras en la cripta!');
}

function draw(){
  background(COLORS.bg);
  drawBoard();
  drawSidebar();

  if (gameState === GS.WIN){
    drawBanner('¡Subes por las escaleras!\nHas escapado.');
  } else if (gameState === GS.GAME_OVER){
    drawBanner('Has caído…\nPresiona R para reiniciar.');
  }
}

function genMap(){
  const m = Array.from({length:GRID_H},()=>Array(GRID_W).fill(CELL.FLOOR));
  const safe = new Set();
  for (let y=0;y<GRID_H;y++){
    for (let x=0;x<GRID_W;x++){
      if (dist2(x,y,1,1)<=2 || dist2(x,y,GRID_W-2,GRID_H-2)<=2) safe.add(`${x},${y}`);
    }
  }
  for (let y=0;y<GRID_H;y++){
    for (let x=0;x<GRID_W;x++){
      if (!safe.has(`${x},${y}`) && random()<0.16) m[y][x]=CELL.WALL;
    }
  }

  m[GRID_H-2][GRID_W-2]=CELL.STAIRS;
  return m;
}

function dist2(x1,y1,x2,y2){ return abs(x1-x2)+abs(y1-y2); }

function isInside(x,y){ return x>=0 && y>=0 && x<GRID_W && y<GRID_H; }
function isWall(x,y){ return map[y][x]===CELL.WALL; }
function isWalkable(x,y){
  if(!isInside(x,y) || isWall(x,y)) return false;

  if (enemies.some(e=>e.alive && e.x===x && e.y===y)) return false;
  if (player && player.x===x && player.y===y) return false;
  return true;
}

function makePlayer(x,y){
  return { x,y, hp:10, maxHp:10, atk:3, potions:1, hasWon:false };
}
function makeEnemy(x,y){
  return { x,y, hp:4, atk:2, alive:true };
}

function spawnEnemies(n){
  const arr=[];
  while(arr.length<n){
    const x = floor(random(0,GRID_W));
    const y = floor(random(0,GRID_H));
    if ((x===1&&y===1) || (x===GRID_W-2&&y===GRID_H-2)) continue;
    if (!isWall(x,y) && !arr.some(e=>e.x===x&&e.y===y)){
      arr.push(makeEnemy(x,y));
    }
  }
  return arr;
}

function spawnItems(cfg){
  const it=[];
  let placed=0;
  while(placed<cfg.potions){
    const x = floor(random(0,GRID_W));
    const y = floor(random(0,GRID_H));
    if (map[y][x]!==CELL.FLOOR) continue;
    if ((x===1&&y===1) || (x===GRID_W-2&&y===GRID_H-2)) continue;
    if (enemies.some(e=>e.x===x&&e.y===y) || (player && player.x===x && player.y===y)) continue;
    it.push({ type:'potion', x,y });
    placed++;
  }
  return it;
}

function keyPressed(){
  if (gameState===GS.WIN || gameState===GS.GAME_OVER){
    if (key==='r' || key==='R') newGame();
    return;
  }
  if (gameState!==GS.AWAIT_INPUT) return;

  const dir = dirFromKey(keyCode);
  if (dir){
    playerAct(dir.dx, dir.dy);
  } else if (key==='g' || key==='G'){ 
    addLog('Esperas un instante…');
    nextTurn();
  } else if ((key==='q'||key==='Q') && player.potions>0){
    
    usePotion();
    nextTurn();
  }
}

function dirFromKey(kc){
  const D = {
    LEFT: {dx:-1,dy: 0}, RIGHT:{dx: 1,dy:0},
    UP:   {dx: 0,dy:-1}, DOWN: {dx: 0,dy:1}
  };
  switch (kc){
    case LEFT_ARROW:  return D.LEFT;
    case RIGHT_ARROW: return D.RIGHT;
    case UP_ARROW:    return D.UP;
    case DOWN_ARROW:  return D.DOWN;
    case 65: return D.LEFT;  
    case 68: return D.RIGHT; 
    case 87: return D.UP;    
    case 83: return D.DOWN;  
  }
  return null;
}

function playerAct(dx,dy){
  const nx = player.x + dx;
  const ny = player.y + dy;
  if (!isInside(nx,ny)) return;

  const foe = enemies.find(e=>e.alive && e.x===nx && e.y===ny);
  if (foe){
    attack(player, foe);
    if (!foe.alive) addLog('El enemigo cae.');
    nextTurn();
    return;
  }

  if (!isWall(nx,ny) && !enemies.some(e=>e.alive && e.x===nx && e.y===ny)){
    player.x = nx; player.y = ny;

    const idx = items.findIndex(it=>it.x===nx && it.y===ny);
    if (idx>-1 && items[idx].type==='potion'){
      items.splice(idx,1);
      player.potions++;
      addLog('Recoges una poción (+1).');
    }

    if (map[ny][nx]===CELL.STAIRS){
      gameState = GS.WIN;
      addLog('¡Has encontrado la salida!');
      return;
    }

    nextTurn();
  }
}

function usePotion(){
  player.hp = min(player.maxHp, player.hp + 5);
  player.potions--;
  addLog('Bebes una poción (+5 HP).');
}

function nextTurn(){
  gameState = GS.ENEMY_TURN;
  enemiesAct();
  if (player.hp<=0) {
    gameState = GS.GAME_OVER;
    addLog('Te han derrotado.');
  } else if (gameState!==GS.WIN){
    gameState = GS.AWAIT_INPUT;
  }
}

function attack(att, def){
  def.hp -= att.atk;
  addLog(`${att===player?'Atacas a un enemigo':'El enemigo te golpea'} (-${att.atk}).`);
  if (def.hp<=0){
    def.alive=false;
  }
}

function enemiesAct(){
  for (const e of enemies){
    if (!e.alive) continue;

    if (dist2(e.x,e.y,player.x,player.y)===1){
      attack(e, player);
      continue;
    }

    let dx=0, dy=0;
    const d = dist2(e.x,e.y,player.x,player.y);
    if (d<=6){
      dx = Math.sign(player.x - e.x);
      dy = Math.sign(player.y - e.y);

      if (abs(player.x - e.x) > abs(player.y - e.y)) dy = 0;
      else dx = 0;
    } else {

      const dirs = [{dx:1,dy:0},{dx:-1,dy:0},{dx:0,dy:1},{dx:0,dy:-1},{dx:0,dy:0}];
      const pick = random(dirs);
      dx = pick.dx; dy = pick.dy;
    }

    const nx = e.x + dx, ny = e.y + dy;

    if (isInside(nx,ny) && map[ny][nx]!==CELL.WALL && !(nx===player.x&&ny===player.y)
        && !enemies.some(o=>o!==e && o.alive && o.x===nx && o.y===ny)){
      e.x = nx; e.y = ny;
    }
  }
}


function drawBoard(){

  for (let y=0;y<GRID_H;y++){
    for (let x=0;x<GRID_W;x++){
      const px = x*TILE;
      const py = y*TILE;

      noStroke();
      fill(COLORS.tile);
      rect(px,py,TILE,TILE,8);

      if (map[y][x]===CELL.WALL){
        fill(COLORS.wall);
        rect(px+4,py+4,TILE-8,TILE-8,6);
      } else if (map[y][x]===CELL.STAIRS){
        fill(COLORS.stairs);
        rect(px+10,py+10,TILE-20,TILE-20,4);

        stroke(0,80); strokeWeight(2);
        for(let i=0;i<3;i++){
          line(px+12, py+16+i*8, px+TILE-12, py+16+i*8);
        }
        noStroke();
      } else {
 
        fill(COLORS.floor);
        rect(px+4,py+4,TILE-8,TILE-8,6);
      }


      stroke(COLORS.grid);
      noFill();
      rect(px,py,TILE,TILE,8);
    }
  }


  for (const it of items){
    if (it.type==='potion'){
      const cx = it.x*TILE + TILE/2;
      const cy = it.y*TILE + TILE/2 + 6;
      noStroke();
      fill(COLORS.potion);
      ellipse(cx, cy, TILE*0.38, TILE*0.38);
      fill(255,140);
      rect(cx-3, cy-14, 6, 8, 2);
    }
  }


  for (const e of enemies){
    if (!e.alive) continue;
    const cx = e.x*TILE + TILE/2;
    const cy = e.y*TILE + TILE/2;
    noStroke();
    fill(COLORS.enemy);
    rect(cx-14, cy-14, 28, 28, 6);

    fill(0,140);
    ellipse(cx-6, cy-2, 4,4);
    ellipse(cx+6, cy-2, 4,4);
  }


  const px = player.x*TILE + TILE/2;
  const py = player.y*TILE + TILE/2;
  noStroke();
  fill(COLORS.player);
  rect(px-16, py-16, 32, 32, 8);
  fill(255,200);
  rect(px-3, py-10, 6, 8, 2); 
}

function drawSidebar(){
  const x0 = GRID_W*TILE + 10;
  const y0 = 10;
  noStroke(); fill('#0b132b');
  rect(GRID_W*TILE,0, 220, CANVAS_H);

  fill(COLORS.text);
  textSize(18); textStyle(BOLD);
  text('Pocket Roguelike', x0, y0);

  textStyle(NORMAL);
  textSize(14);
  fill(COLORS.dim);
  text('Turnos por teclado', x0, y0+22);


  const hpY = y0 + 50;
  fill(COLORS.dim);
  text(`HP: ${player.hp}/${player.maxHp}`, x0, hpY);
  const barW=180, barH=10;
  const ratio = player.hp/player.maxHp;
  const hpColor = ratio>0.6?COLORS.hpHi: ratio>0.3?COLORS.hpMd:COLORS.hpLo;
  fill('#111827'); rect(x0, hpY+10, barW, barH, 6);
  fill(hpColor);   rect(x0, hpY+10, barW*max(0,ratio), barH, 6);

  const invY = hpY + 36;
  fill(COLORS.text);
  text(`Pociones: ${player.potions}`, x0, invY);
  fill(COLORS.dim);
  text('Q para beber (+5 HP)', x0, invY+16);


  const objY = invY + 44;
  fill(COLORS.text); text('Objetivo:', x0, objY);
  fill(COLORS.dim);  text('- Llega a las escaleras verdes', x0, objY+16);

  const logY = objY + 50;
  fill(COLORS.text); text('Registro:', x0, logY);
  fill(COLORS.dim);
  const last = log.slice(-7);
  for (let i=0;i<last.length;i++){
    text(last[i], x0, logY+18*(i+1));
  }
}

function drawBanner(txt){
  push();
  fill(0,160); rect(0,0,width,height);
  textAlign(CENTER,CENTER);
  textSize(26); textStyle(BOLD);
  fill(255); text(txt, width/2, height/2);
  pop();
}

function addLog(s){
  log.push(s);
}
