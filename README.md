# NEBULA STRIKE

A wave-based neon space shooter built in **pure HTML5 + Canvas + WebAudio** — zero dependencies, zero build step. Just open `index.html` in a browser and fly.

## Features

- **Wave system** with escalating spawn budgets and 5 enemy types (drones, chasers, tanks, splitters, snipers) plus a **boss every 5th wave** with ring shots, aimed fans, and an on-screen HP bar.
- **Combo scoring** — chain kills within 2.5s to multiply every kill's score up to x10.
- **Power-ups**: Triple Shot, Rapid Fire, Spread Gun, Shield, +Nuke, +Life (magnetized pickups).
- **Nuke (Space)** — clears the screen in a flash of light; stock up to 3.
- **Juice**: procedural particle explosions, thruster trails, screen shake, damage flash, floating score text, parallax starfield, and a pre-rendered nebula backdrop.
- **Procedural audio** — every laser, explosion, and power-up is synthesized live with WebAudio, plus a minimal ambient music loop (mute with `M`).
- **High scores** — top 5 persisted in `localStorage`.
- **Touch support** — drag to move, second finger to nuke.

## Controls

| Action | Input |
| ------ | ----- |
| Move | WASD / Arrow keys (or mouse / touch) |
| Fire | Automatic |
| Nuke | Space |
| Pause | P / Esc |
| Mute | M |
| Start / Restart | Enter or LAUNCH button |

## Run it

```bash
# no server needed — double-click index.html
# or serve it:
python -m http.server 8000
# then open http://localhost:8000
```

## Structure

```
nebula-strike/
├── index.html        # shell, HUD, menu overlays
├── css/style.css     # neon UI theme
└── js/
    ├── audio.js      # procedural WebAudio SFX + music
    ├── particles.js  # particle system & floating text
    ├── entities.js   # player, bullets, enemies, power-ups
    ├── game.js       # game loop, waves, combat, rendering
    └── main.js       # bootstrap & input wiring
```

No assets, no frameworks, no build — everything is generated at runtime.