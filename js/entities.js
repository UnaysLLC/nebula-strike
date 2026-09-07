// NEBULA STRIKE - entity classes
const Ent = (() => {
  class Bullet {
    constructor(x, y, vx, vy, r, dmg, color, hostile) {
      this.x = x; this.y = y;
      this.vx = vx; this.vy = vy;
      this.r = r; this.dmg = dmg;
      this.color = color;
      this.hostile = !!hostile;
      this.life = 3.2;
      this.dead = false;
    }
  }

  class Player {
    constructor(x, y) {
      this.x = x; this.y = y;
      this.vx = 0; this.vy = 0;
      this.r = 14;
      this.speed = 330;
      this.lives = 3;
      this.maxLives = 5;
      this.invuln = 0;
      this.shield = 0;
      this.fireT = 0;
      this.fireRate = 0.13;
      this.triple = 0;
      this.spread = 0;
      this.rapid = 0;
      this.nukes = 1;
      this.alive = true;
      this.thrustT = 0;
    }
  }

  const TYPES = {
    drone:    { hp: 2, r: 16, score: 100, speed: 110, cost: 1 },
    chaser:   { hp: 1, r: 13, score: 150, speed: 230, cost: 1 },
    tank:     { hp: 9, r: 26, score: 300, speed: 45,  cost: 3 },
    splitter: { hp: 3, r: 17, score: 200, speed: 90,  cost: 2 },
    sniper:   { hp: 5, r: 15, score: 350, speed: 70,  cost: 2 },
    mini:     { hp: 1, r: 9,  score: 100, speed: 210, cost: 0 },
    boss:     { hp: 90, r: 46, score: 5000, speed: 35, cost: 0 }
  };

  class Enemy {
    constructor(type, x, y, wave) {
      const c = TYPES[type];
      this.type = type;
      this.x = x; this.y = y;
      this.r = c.r;
      this.hp = c.hp * (type === 'boss' ? 1 : 1 + (wave - 1) * 0.12);
      this.maxHp = this.hp;
      this.score = c.score;
      this.speed = c.speed * (1 + (wave - 1) * 0.03);
      this.t = Math.random() * 6.28;
      this.phase = Math.random() * 6.28;
      this.vy = 55 + Math.random() * 55;
      this.charge = 0;
      this.fireT = 1.2 + Math.random() * 1.6;
      this.patternT = 0;
      this.dead = false;
    }
  }

  const POWERUP_NAMES = {
    TRIPLE: 'TRIPLE SHOT',
    RAPID: 'RAPID FIRE',
    SPREAD: 'SPREAD GUN',
    SHIELD: 'SHIELD',
    NUKE: '+ NUKE',
    HEALTH: '+ LIFE'
  };

  class PowerUp {
    constructor(x, y, type) {
      this.x = x; this.y = y;
      this.type = type;
      this.vy = 55;
      this.t = Math.random() * 6.28;
      this.r = 14;
      this.life = 11;
      this.dead = false;
    }
  }

  return { Bullet, Player, Enemy, PowerUp, TYPES, POWERUP_NAMES };
})();