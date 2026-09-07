// NEBULA STRIKE - bootstrap
(() => {
  const canvas = document.getElementById('game');

  Game.init();

  window.addEventListener('resize', () => Game.resize());

  document.addEventListener('keydown', Game.onKeyDown);
  document.addEventListener('keyup', Game.onKeyUp);

  canvas.addEventListener('mousemove', Game.onMouseMove);
  canvas.addEventListener('touchstart', Game.onTouchStart, { passive: false });
  canvas.addEventListener('touchmove', Game.onTouchMove, { passive: false });
  canvas.addEventListener('touchend', Game.onTouchEnd, { passive: false });
  canvas.addEventListener('touchcancel', Game.onTouchEnd, { passive: false });

  let last = performance.now();
  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    Game.update(dt);
    Game.render();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();