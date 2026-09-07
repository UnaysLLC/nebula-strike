// NEBULA STRIKE - procedural WebAudio sound engine (no audio assets)
const AudioSys = (() => {
  let ctx = null;
  let master = null, sfxGain = null, musicGain = null;
  let muted = false;
  let musicTimer = null, step = 0, nextStepT = 0;

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.5;
    master.connect(ctx.destination);
    sfxGain = ctx.createGain();
    sfxGain.gain.value = 0.85;
    sfxGain.connect(master);
    musicGain = ctx.createGain();
    musicGain.gain.value = 0.28;
    musicGain.connect(master);
  }

  const now = () => (ctx ? ctx.currentTime : 0);

  function tone(o) {
    if (!ctx || muted) return;
    const t0 = now() + (o.delay || 0);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = o.type || 'square';
    osc.frequency.setValueAtTime(Math.max(o.f0, 1), t0);
    if (o.f1) osc.frequency.exponentialRampToValueAtTime(Math.max(o.f1, 1), t0 + o.dur);
    g.gain.setValueAtTime(o.vol || 0.2, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
    osc.connect(g);
    g.connect(sfxGain);
    osc.start(t0);
    osc.stop(t0 + o.dur + 0.05);
  }

  function noise(o) {
    if (!ctx || muted) return;
    const t0 = now() + (o.delay || 0);
    const len = Math.max(1, Math.floor(ctx.sampleRate * o.dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = o.filterFreq || 1200;
    const g = ctx.createGain();
    g.gain.setValueAtTime(o.vol || 0.3, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
    src.connect(filt);
    filt.connect(g);
    g.connect(sfxGain);
    src.start(t0);
  }

  const sfx = {
    shoot() {
      tone({ type: 'square', f0: 880, f1: 220, dur: 0.08, vol: 0.055 });
      tone({ type: 'sawtooth', f0: 1400, f1: 500, dur: 0.05, vol: 0.03 });
    },
    explosion(big) {
      noise({ dur: big ? 0.7 : 0.35, vol: big ? 0.5 : 0.3, filterFreq: big ? 900 : 1400 });
      tone({ type: 'sine', f0: big ? 130 : 160, f1: 40, dur: big ? 0.6 : 0.3, vol: big ? 0.5 : 0.3 });
    },
    hit() {
      tone({ type: 'triangle', f0: 320, f1: 140, dur: 0.09, vol: 0.12 });
      noise({ dur: 0.06, vol: 0.1, filterFreq: 3000 });
    },
    playerHit() {
      tone({ type: 'sawtooth', f0: 300, f1: 60, dur: 0.4, vol: 0.4 });
      noise({ dur: 0.35, vol: 0.35, filterFreq: 700 });
    },
    powerup() {
      tone({ type: 'sine', f0: 520, dur: 0.09, vol: 0.15 });
      tone({ type: 'sine', f0: 780, delay: 0.07, dur: 0.09, vol: 0.15 });
      tone({ type: 'sine', f0: 1040, delay: 0.14, dur: 0.14, vol: 0.15 });
    },
    shield() {
      tone({ type: 'triangle', f0: 220, f1: 660, dur: 0.3, vol: 0.2 });
    },
    nuke() {
      noise({ dur: 0.9, vol: 0.5, filterFreq: 500 });
      tone({ type: 'sawtooth', f0: 500, f1: 40, dur: 0.8, vol: 0.35 });
    },
    wave() {
      tone({ type: 'triangle', f0: 440, dur: 0.12, vol: 0.16 });
      tone({ type: 'triangle', f0: 660, delay: 0.1, dur: 0.12, vol: 0.16 });
      tone({ type: 'triangle', f0: 880, delay: 0.2, dur: 0.2, vol: 0.16 });
    },
    combo() {
      tone({ type: 'square', f0: 900, f1: 1400, dur: 0.1, vol: 0.1 });
    },
    gameover() {
      tone({ type: 'sawtooth', f0: 220, f1: 55, dur: 1.2, vol: 0.3 });
      tone({ type: 'sine', f0: 110, f1: 40, dur: 1.4, vol: 0.25 });
    },
    click() {
      tone({ type: 'square', f0: 700, f1: 500, dur: 0.05, vol: 0.08 });
    }
  };

  // ---- minimal procedural music: 16th-note bass pulse + airy pad ----
  const BASS = [0, 0, 3, 0, 5, 3, 0, 3, 0, 0, 3, 0, 7, 5, 3, 5]; // A minor pattern (semitones)
  const PAD = [0, 3, 7, 12];

  function scheduleStep(s) {
    const t0 = now() + (s - nextStepT) * 0.117 + 0.06;
    const b = BASS[s % 16];
    const f = 55 * Math.pow(2, b / 12);
    // bass
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = f;
    g.gain.setValueAtTime(0.5, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.11);
    osc.connect(g);
    g.connect(musicGain);
    osc.start(t0);
    osc.stop(t0 + 0.13);
    // hat-ish tick on odd 8ths
    if (s % 2 === 1) {
      const src = ctx.createBufferSource();
      const len = Math.floor(ctx.sampleRate * 0.03);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      src.buffer = buf;
      const hg = ctx.createGain();
      hg.gain.setValueAtTime(0.12, t0);
      hg.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.03);
      src.connect(hg);
      hg.connect(musicGain);
      src.start(t0);
    }
    // pad chord every 2 bars
    if (s % 32 === 0) {
      PAD.forEach((p) => {
        const o = ctx.createOscillator();
        const og = ctx.createGain();
        o.type = 'sine';
        o.frequency.value = 110 * Math.pow(2, p / 12);
        og.gain.setValueAtTime(0.0001, t0);
        og.gain.linearRampToValueAtTime(0.22, t0 + 1.2);
        og.gain.linearRampToValueAtTime(0.0001, t0 + 7.2);
        o.connect(og);
        og.connect(musicGain);
        o.start(t0);
        o.stop(t0 + 7.4);
      });
    }
  }

  function startMusic() {
    if (!ctx || musicTimer) return;
    step = 0;
    nextStepT = 0;
    musicTimer = setInterval(() => {
      if (!ctx) return;
      while (nextStepT < ctx.currentTime + 0.25) {
        scheduleStep(nextStepT);
        nextStepT += 0.117;
      }
    }, 90);
  }

  function stopMusic() {
    if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
  }

  function setMuted(m) {
    muted = m;
    if (master) master.gain.value = m ? 0 : 0.5;
  }

  return {
    init,
    sfx,
    startMusic,
    stopMusic,
    setMuted,
    get muted() { return muted; }
  };
})();