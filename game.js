const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const powerEl = document.getElementById('power');

const startOverlay = document.getElementById('startOverlay');
const gameOverEl = document.getElementById('gameOver');
const finalScoreEl = document.getElementById('finalScore');
const startBtn = document.getElementById('startBtn');
const retryBtn = document.getElementById('retryBtn');

const W = canvas.width;
const H = canvas.height;

const keys = {};
let gameRunning = false;
let frame = 0;
let stars = [];
let bullets = [];
let enemyBullets = [];
let enemies = [];
let particles = [];
let pickups = [];

const player = {
  x: W / 2,
  y: H - 90,
  w: 28,
  h: 34,
  speed: 4.4,
  cooldown: 0,
  hitTimer: 0,
  lives: 3,
  score: 0,
  power: 1,
  bomb: 1,
};

function resetGame() {
  frame = 0;
  bullets = [];
  enemyBullets = [];
  enemies = [];
  particles = [];
  pickups = [];
  stars = Array.from({ length: 120 }, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    z: Math.random() * 2 + 0.5,
  }));
  Object.assign(player, {
    x: W / 2,
    y: H - 90,
    cooldown: 0,
    hitTimer: 0,
    lives: 3,
    score: 0,
    power: 1,
    bomb: 1,
  });
  syncHud();
}

function syncHud() {
  scoreEl.textContent = player.score;
  livesEl.textContent = player.lives;
  powerEl.textContent = player.power;
}

function spawnEnemy() {
  const typeRoll = Math.random();
  const enemy = {
    x: 30 + Math.random() * (W - 60),
    y: -40,
    w: 24,
    h: 24,
    hp: 2,
    speed: 1.5 + Math.random() * 1.5,
    fireCd: 70 + Math.random() * 60,
    t: 0,
    kind: 'drone',
  };

  if (typeRoll > 0.82) {
    enemy.kind = 'fighter';
    enemy.w = 34;
    enemy.h = 30;
    enemy.hp = 8;
    enemy.speed = 1.1;
    enemy.fireCd = 45;
  }

  enemies.push(enemy);
}

function shoot() {
  if (player.cooldown > 0) return;
  const spread = Math.min(player.power, 5);
  for (let i = 0; i < spread; i += 1) {
    const offset = (i - (spread - 1) / 2) * 9;
    bullets.push({
      x: player.x + offset,
      y: player.y - 20,
      vx: offset * 0.04,
      vy: -8.5,
      dmg: 1,
    });
  }
  player.cooldown = Math.max(8, 16 - player.power * 2);
}

function useBomb() {
  if (player.bomb <= 0) return;
  player.bomb -= 1;
  enemies.forEach((e) => {
    e.hp -= 4;
  });
  enemyBullets = [];
  for (let i = 0; i < 120; i += 1) {
    particles.push({
      x: player.x,
      y: player.y,
      vx: (Math.random() - 0.5) * 7,
      vy: (Math.random() - 0.5) * 7,
      life: 36,
      c: `hsl(${180 + Math.random() * 80}, 100%, 60%)`,
      r: Math.random() * 3 + 1,
    });
  }
}

function hitEnemy(enemy, dmg) {
  enemy.hp -= dmg;
  if (enemy.hp <= 0) {
    player.score += enemy.kind === 'fighter' ? 300 : 80;
    if (Math.random() > 0.88) {
      pickups.push({ x: enemy.x, y: enemy.y, type: 'power' });
    }
    for (let i = 0; i < 18; i += 1) {
      particles.push({
        x: enemy.x,
        y: enemy.y,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        life: 24 + Math.random() * 12,
        c: enemy.kind === 'fighter' ? '#ff6b6b' : '#35f2ff',
        r: Math.random() * 2.8 + 0.8,
      });
    }
  }
}

function collide(a, b) {
  return (
    Math.abs(a.x - b.x) * 2 < a.w + b.w &&
    Math.abs(a.y - b.y) * 2 < a.h + b.h
  );
}

function damagePlayer() {
  if (player.hitTimer > 0) return;
  player.lives -= 1;
  player.hitTimer = 90;
  if (player.lives <= 0) {
    endGame();
  }
}

function endGame() {
  gameRunning = false;
  finalScoreEl.textContent = player.score;
  gameOverEl.classList.add('visible');
}

function update() {
  frame += 1;

  if (player.cooldown > 0) player.cooldown -= 1;
  if (player.hitTimer > 0) player.hitTimer -= 1;

  const dx = (keys.ArrowRight || keys.d ? 1 : 0) - (keys.ArrowLeft || keys.a ? 1 : 0);
  const dy = (keys.ArrowDown || keys.s ? 1 : 0) - (keys.ArrowUp || keys.w ? 1 : 0);
  player.x += dx * player.speed;
  player.y += dy * player.speed;
  player.x = Math.max(16, Math.min(W - 16, player.x));
  player.y = Math.max(24, Math.min(H - 22, player.y));

  if (keys[' '] || keys.j) shoot();

  if (frame % 32 === 0) spawnEnemy();

  stars.forEach((s) => {
    s.y += s.z;
    if (s.y > H) {
      s.y = 0;
      s.x = Math.random() * W;
    }
  });

  bullets = bullets.filter((b) => b.y > -20);
  bullets.forEach((b) => {
    b.x += b.vx;
    b.y += b.vy;
  });

  enemies = enemies.filter((e) => e.y < H + 50 && e.hp > 0);
  enemies.forEach((e) => {
    e.t += 0.04;
    e.y += e.speed;
    if (e.kind === 'fighter') {
      e.x += Math.sin(e.t * 2) * 1.8;
    }

    e.fireCd -= 1;
    if (e.fireCd <= 0) {
      const angle = Math.atan2(player.y - e.y, player.x - e.x);
      const speed = e.kind === 'fighter' ? 3.8 : 2.7;
      enemyBullets.push({
        x: e.x,
        y: e.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        w: 7,
        h: 7,
      });
      e.fireCd = e.kind === 'fighter' ? 35 : 70;
    }

    if (collide({ ...player, w: 22, h: 22 }, e)) {
      e.hp = 0;
      damagePlayer();
    }
  });

  enemyBullets = enemyBullets.filter((b) => b.y < H + 20 && b.y > -20 && b.x > -20 && b.x < W + 20);
  enemyBullets.forEach((b) => {
    b.x += b.vx;
    b.y += b.vy;
    if (collide({ ...player, w: 20, h: 20 }, b)) {
      b.y = H + 100;
      damagePlayer();
    }
  });

  bullets.forEach((b) => {
    enemies.forEach((e) => {
      if (collide({ ...b, w: 6, h: 12 }, e)) {
        b.y = -99;
        hitEnemy(e, b.dmg);
      }
    });
  });

  pickups = pickups.filter((p) => p.y < H + 20);
  pickups.forEach((p) => {
    p.y += 2;
    if (collide({ ...player, w: 20, h: 20 }, { ...p, w: 18, h: 18 })) {
      p.y = H + 100;
      player.power = Math.min(5, player.power + 1);
      player.score += 50;
    }
  });

  particles = particles.filter((p) => p.life > 0);
  particles.forEach((p) => {
    p.x += p.vx;
    p.y += p.vy;
    p.life -= 1;
    p.vx *= 0.98;
    p.vy *= 0.98;
  });

  syncHud();
}

function drawShip(x, y, flicker = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = flicker;

  ctx.fillStyle = '#35f2ff';
  ctx.beginPath();
  ctx.moveTo(0, -18);
  ctx.lineTo(12, 14);
  ctx.lineTo(0, 8);
  ctx.lineTo(-12, 14);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#ff4d6d';
  ctx.fillRect(-3, -8, 6, 18);
  ctx.fillStyle = '#ffd166';
  ctx.fillRect(-2, 14, 4, 10);

  ctx.restore();
}

function render() {
  ctx.clearRect(0, 0, W, H);

  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#050a19');
  g.addColorStop(1, '#010205');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  stars.forEach((s) => {
    ctx.fillStyle = `rgba(255,255,255,${0.25 + s.z * 0.2})`;
    ctx.fillRect(s.x, s.y, s.z, s.z * 2);
  });

  bullets.forEach((b) => {
    ctx.fillStyle = '#35f2ff';
    ctx.fillRect(b.x - 2, b.y - 10, 4, 14);
    ctx.fillStyle = '#9ff8ff';
    ctx.fillRect(b.x - 1, b.y - 12, 2, 8);
  });

  enemyBullets.forEach((b) => {
    ctx.fillStyle = '#ff6b6b';
    ctx.beginPath();
    ctx.arc(b.x, b.y, 3.5, 0, Math.PI * 2);
    ctx.fill();
  });

  enemies.forEach((e) => {
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.fillStyle = e.kind === 'fighter' ? '#ff4d6d' : '#7d8bff';
    ctx.fillRect(-e.w / 2, -e.h / 2, e.w, e.h);
    ctx.fillStyle = '#fff';
    ctx.fillRect(-3, -5, 6, 10);
    ctx.restore();
  });

  pickups.forEach((p) => {
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#04070d';
    ctx.fillRect(p.x - 2, p.y - 5, 4, 10);
    ctx.fillRect(p.x - 5, p.y - 2, 10, 4);
  });

  drawShip(player.x, player.y, player.hitTimer > 0 ? (frame % 8 < 4 ? 0.4 : 1) : 1);

  particles.forEach((p) => {
    ctx.globalAlpha = Math.max(0, p.life / 36);
    ctx.fillStyle = p.c;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  });
}

function gameLoop() {
  if (gameRunning) {
    update();
    render();
  }
  requestAnimationFrame(gameLoop);
}

window.addEventListener('keydown', (e) => {
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  keys[k] = true;
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
    e.preventDefault();
  }
  if (k === 'k') useBomb();
});

window.addEventListener('keyup', (e) => {
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  keys[k] = false;
});

startBtn.addEventListener('click', () => {
  startOverlay.classList.remove('visible');
  gameOverEl.classList.remove('visible');
  resetGame();
  gameRunning = true;
});

retryBtn.addEventListener('click', () => {
  gameOverEl.classList.remove('visible');
  resetGame();
  gameRunning = true;
});

resetGame();
render();
gameLoop();
