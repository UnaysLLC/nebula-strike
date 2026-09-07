// NEBULA STRIKE - particle system: explosions, sparks, trails, floating text
const Particles = (() => {
  const list = [];
  const texts = [];
  const MAX = 1100;

  function add(p) {
    if (list.length >= MAX) list.splice(0, 24);
    list.push(p);
  }

  function explosion(x, y, color, count = 26, speed = 240, size = 3) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = speed * (0.3 + Math.random() * 0.8);
      add({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 0.5 + Math.random() * 0.5,
        maxLife: 1,
        size: size * (0.5 + Math.random() * 0.9),
        color,
        drag: 0.92,
        glow: true
      });
    }
    for (let i = 0; i < count / 3; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = speed * (0.5 + Math.random());
      add({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 0.3 + Math.random() * 0.3,
        maxLife: 1,
        size: size * 0.5,
        color: '#ffffff',
        drag: 0.9,
        glow: true
      });
    }
  }

  function sparks(x, y, color, count = 6, angle = -Math.PI / 2, spread = 0.6) {
    for (let i = 0; i < count; i++) {
      const a = angle + (Math.random() - 0.5) * spread;
      const sp = 120 + Math.random() * 260;
      add({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 0.2 + Math.random() * 0.3,
        maxLife: 1,
        size: 1.5 + Math.random() * 1.5,
        color,
        drag: 0.9,
        glow: false
      });
    }
  }

  function trail(x, y, color, size = 3) {
    add({
      x, y,
      vx: (Math.random() - 0.5) * 30,
      vy: 40 + Math.random() * 60,
      life: 0.25 + Math.random() * 0.25,
      maxLife: 1,
      size: size * (0.5 + Math.random() * 0.7),
      color,
      drag: 0.96,
      glow: true
    });
  }

  function popText(x, y, str, color = '#ffffff', size = 17) {
    texts.push({
      x, y, str, color, size,
      life: 1.1,
      maxLife: 1.1,
      vy: -55
    });
    if (texts.length > 40) texts.splice(0, 20);
  }

  function update(dt) {
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i];
      p.life -= dt;
      if (p.life <= 0) { list.splice(i, 1); continue; }
      p.vx *= p.drag;
      p.vy *= p.drag;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    for (let i = texts.length - 1; i >= 0; i--) {
      const t = texts[i];
      t.life -= dt;
      t.y += t.vy * dt;
      t.vy *= 0.94;
      if (t.life <= 0) texts.splice(i, 1);
    }
  }

  function render(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of list) {
      const a = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (0.5 + a * 0.7), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    ctx.save();
    for (const t of texts) {
      const a = Math.min(1, t.life / 0.5);
      ctx.globalAlpha = a;
      ctx.font = `700 ${t.size}px "Segoe UI", Arial, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = t.color;
      ctx.shadowColor = t.color;
      ctx.shadowBlur = 8;
      ctx.fillText(t.str, t.x, t.y);
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function reset() {
    list.length = 0;
    texts.length = 0;
  }

  return { explosion, sparks, trail, popText, update, render, reset };
})();