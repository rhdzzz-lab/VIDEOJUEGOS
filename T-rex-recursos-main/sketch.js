let trex, trexAnim, trexCollidedImg;
let ground, groundImg, ground2;
let obstacle1Img, obstacle2Img, obstacle3Img, obstacle4Img, obstacle5Img, obstacle6Img;
let obstaclesGroup;

let cloudImg, cloudsGroup;

let gameOverImg, restartImg;
let gameOver, restart;

let sndJump, sndDie, sndCheckpoint;

const PLAY = 1;
const END  = 0;
let gameState = PLAY;

let score = 0;
let nextCheckpoint = 100;

const SFX_DIR = "assets/sfx/";
const SHOW_LOAD_ERRORS = true; 


let loadErrors = [];


function makeBeep(freq = 660) {
  if (typeof p5 === "undefined" || typeof p5.Oscillator === "undefined") {
    return { setVolume(){}, play(){ /* no-op si no existe p5.sound */ } };
  }
  const osc = new p5.Oscillator("sine");
  osc.start();
  osc.amp(0);
  return {
    setVolume(){},
    play(rate = 1, amp = 0.5) {
      osc.freq(freq * rate);
      osc.amp(amp, 0.005);
      setTimeout(() => osc.amp(0, 0.05), 90);
    }
  };
}

function loadSoundSafe(path, vol, fallbackFreq, assign) {
  loadSound(
    path,
    s => { s.setVolume?.(vol); assign(s); },
    () => { loadErrors.push(`Sonido no encontrado: ${path}`); assign(makeBeep(fallbackFreq)); }
  );
}

function preload() {

  trexAnim       = loadAnimation("trex1.png", "trex3.png", "trex4.png");
  trexCollidedImg= loadImage("trex_collided.png");
  groundImg      = loadImage("ground2.png");
  gameOverImg    = loadImage("gameOver.png");
  restartImg     = loadImage("restart.png");

  obstacle1Img = loadImage("obstacle1.png");
  obstacle2Img = loadImage("obstacle2.png");
  obstacle3Img = loadImage("obstacle3.png");
  obstacle4Img = loadImage("obstacle4.png");
  obstacle5Img = loadImage("obstacle5.png");
  obstacle6Img = loadImage("obstacle6.png");

  cloudImg = loadImage("cloud.png");

}

function setup() {
  createCanvas(600, 200);

  userStartAudio();
  soundFormats("mp3", "wav");

  loadSoundSafe(SFX_DIR + "jump.wav",       0.5,  880,  s => sndJump       = s);
  loadSoundSafe(SFX_DIR + "die.wav",        0.7,  220,  s => sndDie        = s);
  loadSoundSafe(SFX_DIR + "checkpoint.wav", 0.4, 1320, s => sndCheckpoint = s);

  trex = createSprite(50, 158, 20, 40);
  trex.addAnimation("run", trexAnim);
  trex.addImage("dead", trexCollidedImg);
  trex.scale = 0.5;
  trex.setCollider("rectangle", 0, 0, 70, 80);

  ground = createSprite(300, 180, 600, 10);
  ground.addImage("floor", groundImg);
  ground.velocityX = -4;

  ground2 = createSprite(300, 185, 600, 10);
  ground2.visible = false;

  gameOver = createSprite(width / 2, 70);
  gameOver.addImage(gameOverImg);
  gameOver.scale = 0.8;
  gameOver.visible = false;

  restart = createSprite(width / 2, 110);
  restart.addImage(restartImg);
  restart.scale = 0.6;
  restart.visible = false;

  obstaclesGroup = new Group();
  cloudsGroup    = new Group();
}

function draw() {
  background("#3F858C");

  fill(255);
  textSize(16);
  textAlign(LEFT, TOP);
  text("Score: " + score, 10, 10);

  if (SHOW_LOAD_ERRORS && loadErrors.length) {
    textSize(12); fill(255,230,150);
    text("Faltan archivos:", 10, 30);
    fill(255,200,200);
    for (let i = 0; i < Math.min(loadErrors.length, 6); i++)
      text("- " + loadErrors[i], 10, 46 + i * 14);
    if (loadErrors.length > 6)
      text(`...y ${loadErrors.length - 6} más`, 10, 46 + 6 * 14);
  }

  if (gameState === PLAY) {
    gameOver.visible = false;
    restart.visible  = false;

    score += Math.round(getFrameRate() > 0 ? 60 / getFrameRate() : 1);

    if (score >= nextCheckpoint) {
      sndCheckpoint?.play();
      nextCheckpoint += 100;
    }

    if (ground.x < 0) ground.x = ground.width / 2;

    if (keyDown("space") && trex.collide(ground2)) {
      trex.velocityY = -10;
      sndJump?.play();
    }
    trex.velocityY += 0.8;       
    trex.collide(ground2);

    spawnClouds();
    spawnObstacles();

    trex.overlap(obstaclesGroup, onHit);
  }
  else if (gameState === END) {
    ground.velocityX = 0;
    trex.velocityY   = 0;

    obstaclesGroup.setVelocityXEach(0);
    cloudsGroup.setVelocityXEach(0);

    obstaclesGroup.setLifetimeEach(-1);
    cloudsGroup.setLifetimeEach(-1);

    gameOver.visible = true;
    restart.visible  = true;

    if (typeof mousePressedOver === "function" && mousePressedOver(restart)) resetGame();
    if (keyIsPressed || mouseIsPressed) resetGame();
  }

  drawSprites();
}

function onHit() {
  if (gameState === END) return;
  gameState = END;
  trex.changeImage("dead");
  sndDie?.play();
  ground.velocityX = 0;
}

function resetGame() {
  if (gameState !== END) return;

  obstaclesGroup.destroyEach();
  cloudsGroup.destroyEach();

  trex.changeAnimation("run");
  trex.position.y = 158;
  trex.velocityY   = 0;

  ground.x = ground.width / 2;
  ground.velocityX = -4;

  gameOver.visible = false;
  restart.visible  = false;

  score = 0;
  nextCheckpoint = 100;

  gameState = PLAY;
}

function spawnClouds() {
  if (frameCount % 60 === 0) {
    const y = Math.round(random(20, 100));
    const nube = createSprite(width + 20, y, 40, 10);
    nube.addImage(cloudImg);
    nube.scale = 0.5;
    nube.velocityX = -3;
    nube.lifetime  = Math.ceil((width + 100) / 3);
    nube.depth = trex.depth;
    trex.depth += 1;
    cloudsGroup.add(nube);
  }
}

function spawnObstacles() {
  if (frameCount % 60 === 0) {
    const obstacle = createSprite(width + 20, 165, 10, 40);
    obstacle.scale     = 0.5;
    obstacle.velocityX = -6;
    obstacle.lifetime  = Math.ceil((width + 40) / 6);

    switch (Math.round(random(1, 6))) {
      case 1: obstacle.addImage(obstacle1Img); break;
      case 2: obstacle.addImage(obstacle2Img); break;
      case 3: obstacle.addImage(obstacle3Img); break;
      case 4: obstacle.addImage(obstacle4Img); break;
      case 5: obstacle.addImage(obstacle5Img); break;
      case 6: obstacle.addImage(obstacle6Img); break;
    }
    obstaclesGroup.add(obstacle);
  }
}

function mousePressed() { userStartAudio(); }
