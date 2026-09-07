// NEBULA STRIKE - main game
const Game = (() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  let W = 0, H = 0, DPR = 1;

  // state
  let state = 'menu'; // menu | playing | paused | gameover
  let score = 0, wave = 0, comboT = 0, comboCount = 0, comboTier = 1;
  let highScores = loadScores();

  // entities
  let player = null;
  let playerBullets = [], enemyBullets = [], enemies = [], powerups = [];

  // background
  let stars = [], nebula = null;

  // wave control
  let spawnBudget = 0, spawnT = 0, waveState = 'idle', waveT = 0;
  let boss = null;

  // juice
  let shakeMag = 0, flash = 0, flashColor = '#ffffff';

  // input
  const keys = {};
  let mouse = { x: 0, y: 0, lastMove: -10 };
  let touchTarget = null;
  let muteKeyHeld = false;

  const $ = (id) => document.getElementById(id);
  const el = {
    score: $('score'), highscore: $('highscore'), wave: $('wave'),
    combo: $('combo'), comboMult: $('combo-mult'), hud: $('hud'),
    lives: $('hud-lives'), bossBar: $('boss-bar'), bossFill: $('boss-fill'),
    bossName: $('boss-name'), menu: $('menu'), pause: $('pause'),
    gameover: $('gameover'), finalScore: $('final-score'), newRecord: $('new-record'),
    waveBanner: $('wave-banner'), highscores: $('highscores')
  };

  // ---------- persistence ----------
  function loadScores() {
    try {
      const raw = localStorage.getItem('nebula-strike-highscores');
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr.slice(0, 5) : [];
    } catch (e) { return []; }
  }

  function saveScores() {
    try { localStorage.setItem('nebula-strike-highscores', JSON.stringify(highScores.slice(0, 5))); } catch (e) {}
  }

  function recordScore() {
    highScores.push({ score, wave, date: Date.now() });
    highScores.sort((a, b) => b.score - a.score);
    const isRecord = score > 0 && score >= highScores[0].score && highScores.length > 0 && highScores[0].score === score && (highScores[1] ? score > highScores[1].score : true);
    saveScores();
    renderHighScores();
    return score > 0 && highScores[0].score === score && highScores.filter(s => s.score === score).length === 1;
  }

  function renderHighScores() {
    const list = highScores.length ? highScores : [{ score: 0, wave: 1 }];
    el.highscores.innerHTML = list.slice(0, 5).map(s =>
      `<li>${String(s.score).padStart(7, '0')}  —  wave ${s.wave}</li>`
    ).join('');
  }

  // ---------- sizing / background ----------
  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.floor(W * DPR);
    canvas.height = Math.floor(H * DPR);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    buildStars();
    buildNebula();
  }

  function buildStars() {
    stars = [];
    const layers = [
      { n: 130, spd: 22, size: 1.2, alpha: 0.5 },
      { n: 70, spd: 55, size: 1.8, alpha: 0.75 },
      { n: 30, spd: 110, size: 2.6, alpha: 1 }
    ];
    for (const l of layers) {
      for (let i = 0; i < l.n; i++) {
        stars.push({
          x: Math.random() * W, y: Math.random() * H,
          spd: l.spd * (0.6 + Math.random() * 0.8),
          size: l.size, alpha: l.alpha,
          tw: Math.random() * 6.28
        });
      }
    }
  }

  function buildNebula() {
    nebula = document.createElement('canvas');
    nebula.width = Math.max(1, Math.floor(W / 2));
    nebula.height = Math.max(1, Math.floor(H / 2));
    const nctx = nebula.getContext('2d');
    const colors = ['#1b2a6b', '#3d1b6b', '#0e3a5e', '#5e1b4d', '#0a2e4d'];
    for (let i = 0; i < 14; i++) {
      const x = Math.random() * nebula.width;
      const y = Math.random() * nebula.height;
      const r = (0.15 + Math.random() * 0.3) * Math.max(nebula.width, nebula.height);
      const g = nctx.createRadialGradient(x, y, 0, x, y, r);
      const c = colors[i % colors.length];
      g.addColorStop(0, c + '55');
      g.addColorStop(1, c + '00');
      nctx.fillStyle = g;
      nctx.fillRect(0, 0, nebula.width, nebula.height);
    }
  }

  // ---------- game flow ----------
  function resetRun() {
    score = 0; wave = 0; comboT = 0; comboCount = 0; comboTier = 1;
    playerBullets = []; enemyBullets = []; enemies = []; powerups = [];
    shakeMag = 0; flash = 0;
    player = new Ent.Player(W / 2, H - 90);
    boss = null;
    spawnBudget = 0; spawnT = 0; waveState = 'idle'; waveT = 1.2;
    Particles.reset();
    el.bossBar.classList.add('hidden');
    el.combo.classList.add('hidden');
    el.newRecord.classList.add('hidden');
  }

  function startGame() {
    resetRun();
    state = 'playing';
    el.hud.classList.remove('hidden');
    el.menu.classList.add('hidden');
    el.gameover.classList.add('hidden');
    el.pause.classList.add('hidden');
    AudioSys.startMusic();
  }

  function toMenu() {
    state = 'menu';
    el.hud.classList.add('hidden');
    el.menu.classList.remove('hidden');
    el.gameover.classList.add('hidden');
    el.pause.classList.add('hidden');
    AudioSys.stopMusic();
    renderHighScores();
  }

  function togglePause() {
    if (state === 'playing') {
      state = 'paused';
      el.pause.classList.remove('hidden');
    } else if (state === 'paused') {
      state = 'playing';
      el.pause.classList.add('hidden');
    }
  }

  function gameOver() {
    state = 'gameover';
    Particles.explosion(player.x, player.y, '#4de8ff', 60, 340, 4);
    shakeMag = 22;
    flash = 1; flashColor = '#4de8ff';
    AudioSys.sfx.explosion(true);
    AudioSys.sfx.gameover();
    AudioSys.stopMusic();
    const isRecord = recordScore();
    el.finalScore.textContent = String(score);
    el.newRecord.classList.toggle('hidden', !isRecord);
    el.gameover.classList.remove('hidden');
  }

  // ---------- waves ----------
  function startWave() {
    wave++;
    el.wave.textContent = wave;
    spawnBudget = Math.min(45, 7 + wave * 3);
    spawnT = 1.6;
    waveState = 'active';
    if (wave % 5 === 0) {
      boss = new Ent.Enemy('boss', W / 2, -80, wave);
      boss.hp = boss.maxHp = 80 + wave * 18;
      enemies.push(boss);
      for (let i = 0; i < 2; i++) spawnEnemy('drone');
      showBanner('⚠ BOSS INBOUND ⚠', true);
      AudioSys.sfx.wave();
    } else {
      showBanner('WAVE ' + wave, false);
      AudioSys.sfx.wave();
    }
  }

  function showBanner(text, isBoss) {
    el.waveBanner.textContent = text;
    el.waveBanner.classList.toggle('boss', !!isBoss);
    el.waveBanner.classList.remove('hidden');
    el.waveBanner.classList.add('show');
    clearTimeout(showBanner._t);
    showBanner._t = setTimeout(() => {
      el.waveBanner.classList.remove('show');
      el.waveBanner.classList.add('hidden');
    }, 1900);
  }

  function spawnEnemy(type) {
    const x = 50 + Math.random() * Math.max(1, W - 100);
    enemies.push(new Ent.Enemy(type, x, -50, wave));
  }

  function waveComplete() {
    waveState = 'clear';
    waveT = 2.4;
  }

  // ---------- combat ----------
  function killEnemy(e, silent) {
    e.dead = true;
    const isBoss = e.type === 'boss';
    Particles.explosion(e.x, e.y, isBoss ? '#ff5c7a' : '#4de8ff', isBoss ? 70 : 24, isBoss ? 380 : 240, isBoss ? 4 : 3);
    shakeMag = Math.max(shakeMag, isBoss ? 18 : 5);
    AudioSys.sfx.explosion(isBoss);
    if (!silent) {
      comboCount++;
      comboT = 2.5;
      const newTier = 1 + Math.min(9, Math.floor(comboCount / 8));
      if (newTier > comboTier) {
        comboTier = newTier;
        Particles.popText(e.x, e.y - 20, 'COMBO x' + comboTier, '#ffd24d', 20);
        AudioSys.sfx.combo();
      }
      score += e.score * comboTier;
      maybeDrop(e.x, e.y, isBoss);
    }
    if (isBoss) {
      boss = null;
      waveComplete();
      score += 500 * comboTier;
      for (let i = 0; i < 3; i++) {
        powerups.push(new Ent.PowerUp(e.x + (Math.random() - 0.5) * 120, e.y + (Math.random() - 0.5) * 80,
          ['TRIPLE', 'RAPID', 'SPREAD', 'SHIELD', 'HEALTH'][Math.floor(Math.random() * 5)]));
      }
    }
    if (e.type === 'splitter' && !e.splitDone) {
      e.splitDone = true;
      for (let i = 0; i < 2; i++) {
        const m = new Ent.Enemy('mini', e.x, e.y, wave);
        m.vx = (i === 0 ? -1 : 1) * 60;
        enemies.push(m);
      }
    }
  }

  function maybeDrop(x, y, always) {
    const roll = always ? 1 : Math.random();
    if (roll < 0.1 || always) {
      const types = ['TRIPLE', 'RAPID', 'SPREAD', 'TRIPLE', 'SHIELD', 'HEALTH', 'NUKE', 'SPREAD'];
      powerups.push(new Ent.PowerUp(x, y, types[Math.floor(Math.random() * types.length)]));
    }
  }

  function damagePlayer() {
    if (!player.alive || player.invuln > 0) return;
    if (player.shield > 0) {
      player.shield--;
      AudioSys.sfx.shield();
      Particles.popText(player.x, player.y - 30, 'SHIELD DOWN', '#4de8ff', 14);
      player.invuln = 0.8;
      return;
    }
    player.lives--;
    player.invuln = 1.6;
    shakeMag = 16;
    flash = 0.6; flashColor = '#ff1744';
    Particles.explosion(player.x, player.y, '#ff5c7a', 30, 300, 3.4);
    AudioSys.sfx.playerHit();
    if (player.lives <= 0) {
      player.alive = false;
      gameOver();
    }
  }

  function fireNuke() {
    if (player.nukes <= 0 || state !== 'playing' || !player.alive) return;
    player.nukes--;
    flash = 1; flashColor = '#00e5ff';
    shakeMag = 24;
    AudioSys.sfx.nuke();
    for (const e of enemies.slice()) {
      if (e.type === 'boss') { e.hp -= 15; Particles.sparks(e.x, e.y, '#ff5c7a', 10); if (e.hp <= 0) killEnemy(e); }
      else killEnemy(e);
    }
    for (const b of enemyBullets.slice()) b.dead = true;
  }

  function applyPowerUp(p) {
    const n = Ent.POWERUP_NAMES[p.type];
    const colors = {
      TRIPLE: '#4de8ff', RAPID: '#ffd24d', SPREAD: '#7cff6b',
      SHIELD: '#6fb7ff', NUKE: '#ff9d4d', HEALTH: '#ff6ba8'
    };
    Particles.popText(p.x, p.y - 16, n, colors[p.type], 16);
    AudioSys.sfx.powerup();
    switch (p.type) {
      case 'TRIPLE': player.triple = Math.min(player.triple + 1, 2); break;
      case 'RAPID': player.rapid = Math.min(player.rapid + 1, 2); break;
      case 'SPREAD': player.spread = Math.min(player.spread + 1, 2); break;
      case 'SHIELD': player.shield = Math.min(player.shield + 1, 3); break;
      case 'NUKE': player.nukes = Math.min(player.nukes + 1, 3); break;
      case 'HEALTH': player.lives = Math.min(player.lives + 1, player.maxLives); break;
    }
  }

  // ---------- enemy AI ----------
  function updateEnemy(e, dt) {
    e.t += dt;
    const p = player;
    switch (e.type) {
      case 'drone': {
        e.vy = 45;
        e.vx = Math.sin(e.t * 2 + e.phase) * e.speed * 1.1;
        break;
      }
      case 'chaser': {
        const dx = p.x - e.x, dy = p.y - e.y;
        const d = Math.hypot(dx, dy) || 1;
        const sp = e.speed * (1 + Math.min(0.7, e.t * 0.04));
        e.vx = dx / d * sp;
        e.vy = dy / d * sp;
        break;
      }
      case 'tank': {
        e.vx = Math.sin(e.t * 0.7 + e.phase) * 20;
        e.vy = 45;
        e.fireT -= dt;
        if (e.fireT <= 0) {
          e.fireT = 2.6;
          fireFan(e, 3, 0.5, 175);
        }
        break;
      }
      case 'splitter': {
        e.vy = 45;
        e.vx = Math.sin(e.t * 1.3 + e.phase) * 45;
        break;
      }
      case 'sniper': {
        e.vy = 45 * 0.4;
        e.vx = Math.sin(e.t * 0.5 + e.phase) * 30;
        e.charge += dt;
        if (e.charge >= 1.25) {
          e.charge = 0;
          fireAimed(e);
        }
        break;
      }
      case 'mini': {
        const dx = p.x - e.x, dy = p.y - e.y;
        const d = Math.hypot(dx, dy) || 1;
        e.vx = dx / d * e.speed;
        e.vy = dy / d * e.speed;
        break;
      }
      case 'boss': {
        e.vy = 30;
        e.x = W / 2 + Math.sin(e.t * 0.32) * Math.min(W * 0.3, 260);
        e.fireT -= dt;
        e.patternT += dt;
        if (e.fireT <= 0) {
          e.fireT = 2.0;
          ringShot(e, 16, 150);
        }
        if (e.patternT >= 3.6) {
          e.patternT = 0;
          fireFan(e, 5, 0.55, 240);
        }
        break;
      }
    }
    e.x += e.vx * dt;
    e.y += e.vy * dt;

    if (e.type !== 'boss' && e.type !== 'chaser' && e.type !== 'mini') {
      if (e.x < -70) e.x = W + 60;
      if (e.x > W + 70) e.x = -60;
    }
    if (e.type !== 'boss' && e.y > H + 90) e.dead = true;
  }

  function ringShot(e, count, speed) {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + e.t * 0.4;
      enemyBullets.push(new Ent.Bullet(e.x, e.y, Math.cos(a) * speed, Math.sin(a) * speed, 6, 1, '#ff5c7a', true));
    }
  }

  function fireFan(e, count, spread, speed) {
    const dx = player.x - e.x, dy = player.y - e.y;
    const base = Math.atan2(dy, dx);
    for (let i = 0; i < count; i++) {
      const a = base + (i - (count - 1) / 2) * spread;
      enemyBullets.push(new Ent.Bullet(e.x, e.y, Math.cos(a) * speed, Math.sin(a) * speed, 6, 1, '#ff9e3d', true));
    }
  }

  function fireAimed(e) {
    const dx = player.x - e.x, dy = player.y - e.y;
    const d = Math.hypot(dx, dy) || 1;
    const sp = 310;
    enemyBullets.push(new Ent.Bullet(e.x, e.y, dx / d * sp, dy / d * sp, 5, 1, '#ff5c7a', true));
    enemyBullets.push(new Ent.Bullet(e.x, e.y, dx / d * sp * 0.6 - 40, dy / d * sp * 0.6, 5, 1, '#ff9e3d', true));
    enemyBullets.push(new Ent.Bullet(e.x, e.y, dx / d * sp * 0.6 + 40, dy / d * sp * 0.6, 5, 1, '#ff9e3d', true));
  }

  // ---------- update ----------
  function update(dt) {
    if (state === 'paused' || state === 'menu') return;
    if (state === 'gameover') { Particles.update(dt); return; }

    // wave flow
    if (waveState === 'idle') {
      waveT -= dt;
      if (waveT <= 0) startWave();
    } else if (waveState === 'active') {
      if (boss) {
        // keep spawning light escorts while boss lives
        spawnT -= dt;
        if (spawnT <= 0 && enemies.length < 10) {
          spawnEnemy(Math.random() < 0.6 ? 'drone' : 'chaser');
          spawnT = 3.5;
        }
      } else {
        spawnT -= dt;
        if (spawnT <= 0 && spawnBudget > 0) {
          spawnT = Math.max(0.3, 1.05 - wave * 0.04);
          const t = pickSpawnType();
          const c = Ent.TYPES[t].cost;
          if (spawnBudget >= c) {
            spawnEnemy(t);
            spawnBudget -= c;
          } else {
            spawnBudget = 0;
          }
        }
        if (spawnBudget <= 0 && spawnT <= 0 && enemies.length === 0) waveComplete();
      }
    } else if (waveState === 'clear') {
      waveT -= dt;
      if (waveT <= 0) { waveState = 'idle'; waveT = 0.8; }
    }

    // combo timer
    if (comboT > 0) {
      comboT -= dt;
      if (comboT <= 0) { comboCount = 0; comboTier = 1; el.combo.classList.add('hidden'); }
    }

    // player
    if (player.alive) {
      player.invuln = Math.max(0, player.invuln - dt);
      const kx = (keys['ArrowLeft'] || keys['KeyA'] ? -1 : 0) + (keys['ArrowRight'] || keys['KeyD'] ? 1 : 0);
      const ky = (keys['ArrowUp'] || keys['KeyW'] ? -1 : 0) + (keys['ArrowDown'] || keys['KeyS'] ? 1 : 0);
      let tx = kx, ty = ky;
      if (!kx && !ky) {
        if (touchTarget) {
          const dx = touchTarget.x - player.x, dy = touchTarget.y - player.y;
          const d = Math.hypot(dx, dy);
          if (d > 10) { tx = dx / d; ty = dy / d; }
        } else if (performance.now() - mouse.lastMove < 400) {
          const dx = mouse.x - player.x, dy = mouse.y - player.y;
          const d = Math.hypot(dx, dy);
          if (d > 8) { tx = dx / d; ty = dy / d; }
        }
      }
      const mag = Math.hypot(tx, ty) || 1;
      const targetVx = tx / mag * player.speed;
      const targetVy = ty / mag * player.speed;
      const lerp = 1 - Math.pow(0.0001, dt);
      player.vx += (targetVx - player.vx) * lerp;
      player.vy += (targetVy - player.vy) * lerp;
      player.x = Math.max(player.r, Math.min(W - player.r, player.x + player.vx * dt));
      player.y = Math.max(player.r, Math.min(H - player.r, player.y + player.vy * dt));

      // autofire
      player.fireT -= dt;
      const rate = player.fireRate / (1 + player.rapid * 0.65);
      while (player.fireT <= 0) {
        player.fireT += rate;
        shootPlayer();
      }

      // thruster trail
      player.thrustT -= dt;
      if (player.thrustT <= 0 && (mag > 0.1 || true)) {
        player.thrustT = 0.03;
        Particles.trail(player.x + (Math.random() - 0.5) * 8, player.y + player.r - 2, '#4de8ff', 2.4);
      }
    }

    // bullets
    for (const b of playerBullets) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (b.x < -20 || b.x > W + 20 || b.y < -20 || b.y > H + 20) b.dead = true;
    }
    for (const b of enemyBullets) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (b.x < -20 || b.x > W + 20 || b.y < -20 || b.y > H + 20 || b.life <= 0) b.dead = true;
    }

    // enemies
    for (const e of enemies) if (!e.dead) updateEnemy(e, dt);

    // collisions: player bullets vs enemies
    for (const b of playerBullets) {
      if (b.dead) continue;
      for (const e of enemies) {
        if (e.dead) continue;
        const dx = b.x - e.x, dy = b.y - e.y;
        if (dx * dx + dy * dy < (b.r + e.r) * (b.r + e.r)) {
          b.dead = true;
          e.hp -= b.dmg;
          Particles.sparks(b.x, b.y, '#9ad7ff', 5, Math.atan2(-b.vy, -b.vx), 0.7);
          AudioSys.sfx.hit();
          if (e.hp <= 0) killEnemy(e);
          break;
        }
      }
    }

    // collisions: player vs enemies + enemy bullets
    if (player.alive) {
      for (const e of enemies) {
        if (e.dead) continue;
        const dx = e.x - player.x, dy = e.y - player.y;
        if (dx * dx + dy * dy < (e.r + player.r - 4) * (e.r + player.r - 4)) {
          killEnemy(e);
          damagePlayer();
        }
      }
      for (const b of enemyBullets) {
        if (b.dead) continue;
        const dx = b.x - player.x, dy = b.y - player.y;
        if (dx * dx + dy * dy < (b.r + player.r) * (b.r + player.r)) {
          b.dead = true;
          damagePlayer();
        }
      }
    }

    // powerups
    for (const p of powerups) {
      if (p.dead) continue;
      p.t += dt;
      p.life -= dt;
      if (p.life <= 0) { p.dead = true; continue; }
      if (player.alive) {
        const dx = player.x - p.x, dy = player.y - p.y;
        const d = Math.hypot(dx, dy);
        if (d < 130) { p.x += dx / d * 240 * dt; p.y += dy / d * 240 * dt; }
        if (d < player.r + p.r) {
          p.dead = true;
          applyPowerUp(p);
        }
      }
      p.y += p.vy * dt;
    }

    // cleanup
    playerBullets = playerBullets.filter(b => !b.dead);
    enemyBullets = enemyBullets.filter(b => !b.dead);
    enemies = enemies.filter(e => !e.dead);
    powerups = powerups.filter(p => !p.dead);

    // stars
    for (const s of stars) {
      s.y += s.spd * (1 + wave * 0.015) * dt;
      s.tw += dt * 4;
      if (s.y > H + 4) { s.y = -4; s.x = Math.random() * W; }
    }

    // juice
    shakeMag = Math.max(0, shakeMag - dt * 26);
    flash = Math.max(0, flash - dt * 2.2);

    Particles.update(dt);
    updateHUD();
  }

  function shootPlayer() {
    const x = player.x, y = player.y - player.r;
    const sp = 760;
    const angles = [];
    angles.push(0);
    if (player.triple >= 1) { angles.push(-0.2); angles.push(0.2); }
    if (player.triple >= 2) { angles.push(-0.38); angles.push(0.38); }
    if (player.spread >= 1) { angles.push(-0.5); angles.push(0.5); }
    if (player.spread >= 2) { angles.push(-0.85); angles.push(0.85); }
    for (const a of angles) {
      playerBullets.push(new Ent.Bullet(x, y, Math.sin(a) * sp * 0.4, -Math.cos(a) * sp, 4, 1, '#4de8ff', false));
    }
    AudioSys.sfx.shoot();
  }

  function pickSpawnType() {
    const w = wave;
    const table = [];
    table.push('drone', 'drone', 'drone');
    table.push('chaser', 'chaser');
    if (w >= 2) table.push('splitter', 'splitter');
    if (w >= 3) table.push('tank');
    if (w >= 4) table.push('sniper', 'sniper');
    if (w >= 7) table.push('tank', 'sniper');
    return table[Math.floor(Math.random() * table.length)];
  }

  function updateHUD() {
    el.score.textContent = String(score);
    el.highscore.textContent = String(highScores.length ? highScores[0].score : 0);
    if (comboT > 0) {
      el.combo.classList.remove('hidden');
      el.comboMult.textContent = 'x' + comboTier;
    }
    if (player) {
      let l = '';
      for (let i = 0; i < player.lives; i++) l += '▲';
      if (player.nukes > 0) l += '  ◉'.repeat(player.nukes);
      el.lives.textContent = l;
    }
    if (boss) {
      el.bossBar.classList.remove('hidden');
      el.bossFill.style.width = Math.max(0, boss.hp / boss.maxHp * 100) + '%';
    } else {
      el.bossBar.classList.add('hidden');
    }
  }

  // ---------- render ----------
  function render() {
    ctx.clearRect(0, 0, W, H);

    // background
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#050821');
    g.addColorStop(0.6, '#0a0f33');
    g.addColorStop(1, '#140a33');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    if (nebula) ctx.drawImage(nebula, 0, 0, W, H);

    // shake
    const sx = (Math.random() - 0.5) * shakeMag;
    const sy = (Math.random() - 0.5) * shakeMag;
    ctx.translate(sx, sy);

    // stars
    for (const s of stars) {
      ctx.globalAlpha = s.alpha * (0.55 + 0.45 * Math.sin(s.tw));
      ctx.fillStyle = '#cfe8ff';
      ctx.fillRect(s.x, s.y, s.size, s.size);
    }
    ctx.globalAlpha = 1;

    if (state !== 'menu') {
      // powerups
      for (const p of powerups) drawPowerUp(p);
      // enemy bullets
      for (const b of enemyBullets) drawBullet(b, true);
      // player bullets
      for (const b of playerBullets) drawBullet(b, false);
      // enemies
      for (const e of enemies) drawEnemy(e);
      // player
      if (player && player.alive) drawPlayer();
      // particles
      Particles.render(ctx);
    }

    ctx.restore();

    // damage flash
    if (flash > 0) {
      ctx.globalAlpha = Math.min(1, flash);
      ctx.fillStyle = flashColor;
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }

    // menu backdrop keeps scene alive behind overlay
    if (state === 'menu') Particles.render(ctx);
  }

  function drawBullet(b, hostile) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = b.color;
    ctx.shadowColor = b.color;
    ctx.shadowBlur = 10;
    ctx.lineWidth = hostile ? 2.5 : 3.5;
    ctx.beginPath();
    ctx.moveTo(b.x, b.y);
    ctx.lineTo(b.x - b.vx * 0.022, b.y - b.vy * 0.022);
    ctx.stroke();
    ctx.restore();
  }

  function drawPowerUp(p) {
    const colors = {
      TRIPLE: '#4de8ff', RAPID: '#ffd24d', SPREAD: '#7cff6b',
      SHIELD: '#6fb7ff', NUKE: '#ff9d4d', HEALTH: '#ff6ba8'
    };
    const c = colors[p.type];
    const pulse = 1 + Math.sin(p.t * 5) * 0.12;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.shadowColor = c;
    ctx.shadowBlur = 16;
    ctx.strokeStyle = c;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = c;
    ctx.globalAlpha = 0.25;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r * 0.8 * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.font = '700 13px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(p.type === 'NUKE' ? '✸' : p.type === 'HEALTH' ? '♥' : p.type === 'SHIELD' ? '◈' : '▲', p.x, p.y + 1);
    ctx.restore();
  }

  function drawPlayer() {
    if (player.invuln > 0 && Math.floor(player.invuln * 12) % 2 === 0 && player.invuln < 1.4) return;
    const x = player.x, y = player.y;
    ctx.save();
    // engine flame
    ctx.globalCompositeOperation = 'lighter';
    const fl = 10 + Math.random() * 8;
    const fg = ctx.createLinearGradient(0, y + 10, 0, y + 10 + fl);
    fg.addColorStop(0, '#4de8ff');
    fg.addColorStop(1, 'rgba(77,232,255,0)');
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.moveTo(x - 5, y + 10);
    ctx.lineTo(x, y + 10 + fl);
    ctx.lineTo(x + 5, y + 10);
    ctx.closePath();
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';

    // hull
    ctx.shadowColor = '#4de8ff';
    ctx.shadowBlur = 14;
    ctx.fillStyle = '#dff9ff';
    ctx.beginPath();
    ctx.moveTo(x, y - 20);
    ctx.lineTo(x - 14, y + 12);
    ctx.lineTo(x - 5, y + 8);
    ctx.lineTo(x, y + 13);
    ctx.lineTo(x + 5, y + 8);
    ctx.lineTo(x + 14, y + 12);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#4de8ff';
    ctx.beginPath();
    ctx.moveTo(x, y - 10);
    ctx.lineTo(x - 5, y + 8);
    ctx.lineTo(x + 5, y + 8);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

    // shield ring
    if (player.shield > 0) {
      ctx.strokeStyle = 'rgba(111,183,255,0.9)';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#6fb7ff';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(x, y, player.r + 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
    ctx.restore();
  }

  function drawEnemy(e) {
    const x = e.x, y = e.y;
    ctx.save();
    ctx.shadowColor = '#ff5c7a';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#ff8fa3';
    switch (e.type) {
      case 'drone': {
        ctx.rotate(e.t * 1.2);
        ctx.beginPath();
        ctx.moveTo(x + 14, y);
        ctx.lineTo(x - 10, y - 12);
        ctx.lineTo(x - 4, y);
        ctx.lineTo(x - 10, y + 12);
        ctx.closePath();
        ctx.fill();
        break;
      }
      case 'chaser': {
        ctx.rotate(Math.atan2(player.y - y, player.x - x) + Math.PI / 2);
        ctx.beginPath();
        ctx.moveTo(x, y - 12);
        ctx.lineTo(x - 9, y + 10);
        ctx.lineTo(x + 9, y + 10);
        ctx.closePath();
        ctx.fill();
        break;
      }
      case 'tank': {
        ctx.fillStyle = '#b06bff';
        ctx.shadowColor = '#b06bff';
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = e.t * 0.4 + i / 6 * Math.PI * 2;
          const px = x + Math.cos(a) * 24, py = y + Math.sin(a) * 24;
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#5a2d8f';
        ctx.beginPath();
        ctx.arc(x, y, 10, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'splitter': {
        ctx.rotate(e.t * 1.6);
        ctx.fillStyle = '#7cff6b';
        ctx.shadowColor = '#7cff6b';
        ctx.beginPath();
        ctx.moveTo(x, y - 16);
        ctx.lineTo(x - 8, y + 10);
        ctx.lineTo(x, y + 4);
        ctx.lineTo(x + 8, y + 10);
        ctx.closePath();
        ctx.fill();
        break;
      }
      case 'mini': {
        ctx.rotate(Math.atan2(player.y - y, player.x - x) + Math.PI / 2);
        ctx.fillStyle = '#7cff6b';
        ctx.shadowColor = '#7cff6b';
        ctx.beginPath();
        ctx.moveTo(x, y - 8);
        ctx.lineTo(x - 6, y + 7);
        ctx.lineTo(x + 6, y + 7);
        ctx.closePath();
        ctx.fill();
        break;
      }
      case 'sniper': {
        ctx.fillStyle = '#ffb74d';
        ctx.shadowColor = '#ffb74d';
        ctx.rotate(Math.atan2(player.y - y, player.x - x));
        ctx.fillRect(x - 18, y - 3, 36, 6);
        ctx.beginPath();
        ctx.arc(x + 18, y, 5, 0, Math.PI * 2);
        ctx.fill();
        // charge telegraph
        if (e.charge > 0.5) {
          const a = Math.atan2(player.y - y, player.x - x);
          ctx.strokeStyle = `rgba(255,92,122,${0.15 + e.charge * 0.35})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + Math.cos(a) * 500, y + Math.sin(a) * 500);
          ctx.stroke();
        }
        break;
      }
      case 'boss': {
        ctx.fillStyle = '#ff5c7a';
        ctx.shadowColor = '#ff1744';
        ctx.shadowBlur = 24;
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const a = e.t * 0.5 + i / 8 * Math.PI * 2;
          const px = x + Math.cos(a) * 44, py = y + Math.sin(a) * 44;
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        // core
        const pulse = 0.8 + Math.sin(e.t * 6) * 0.2;
        ctx.fillStyle = '#ffd0da';
        ctx.beginPath();
        ctx.arc(x, y, 14 * pulse, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
    }
    // hp pip for damaged non-boss enemies
    if (e.type !== 'boss' && e.hp < e.maxHp) {
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(x - 16, y + e.r + 5, 32, 4);
      ctx.fillStyle = '#4de8ff';
      ctx.fillRect(x - 16, y + e.r + 5, 32 * Math.max(0, e.hp / e.maxHp), 4);
    }
    ctx.restore();
  }

  // ---------- input ----------
  function onKeyDown(e) {
    AudioSys.init();
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    keys[e.code] = true;
    if (e.code === 'KeyM') { AudioSys.setMuted(!AudioSys.muted); }
    if (e.code === 'KeyP' || e.code === 'Escape') {
      if (state === 'playing' || state === 'paused') togglePause();
    }
    if (e.code === 'Space' && state === 'playing') fireNuke();
    if (e.code === 'Enter') {
      if (state === 'menu' || state === 'gameover') startGame();
      else if (state === 'paused') togglePause();
    }
  }

  function onKeyUp(e) { keys[e.code] = false; }

  function onMouseMove(e) {
    const r = canvas.getBoundingClientRect();
    mouse.x = e.clientX - r.left;
    mouse.y = e.clientY - r.top;
    mouse.lastMove = performance.now();
  }

  function onTouchStart(e) {
    e.preventDefault();
    AudioSys.init();
    for (const t of e.changedTouches) {
      if (touchTarget === null) {
        touchTarget = { id: t.identifier, x: t.clientX, y: t.clientY };
      } else {
        // second finger = nuke
        if (state === 'playing') fireNuke();
      }
    }
  }

  function onTouchMove(e) {
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (touchTarget && touchTarget.id === t.identifier) {
        touchTarget.x = t.clientX;
        touchTarget.y = t.clientY;
      }
    }
  }

  function onTouchEnd(e) {
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (touchTarget && touchTarget.id === t.identifier) touchTarget = null;
    }
  }

  // ---------- init ----------
  function init() {
    resize();
    renderHighScores();
    // buttons
    document.getElementById('start-btn').addEventListener('click', () => { AudioSys.init(); AudioSys.sfx.click(); startGame(); });
    document.getElementById('resume-btn').addEventListener('click', () => { AudioSys.sfx.click(); togglePause(); });
    document.getElementById('quit-btn').addEventListener('click', () => { AudioSys.sfx.click(); toMenu(); });
    document.getElementById('restart-btn').addEventListener('click', () => { AudioSys.sfx.click(); startGame(); });
    document.getElementById('menu-btn').addEventListener('click', () => { AudioSys.sfx.click(); toMenu(); });
    // unlock audio on first gesture
    const unlock = () => AudioSys.init();
    document.addEventListener('pointerdown', unlock, { once: true });
    document.addEventListener('keydown', unlock, { once: true });
  }

  return {
    init, resize, update, render,
    onKeyDown, onKeyUp, onMouseMove, onTouchStart, onTouchMove, onTouchEnd,
    startGame, toMenu, togglePause,
    getState: () => state
  };
})();