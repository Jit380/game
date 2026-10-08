# Ultimateman: Dragon Awakening 3D

An original third-person WebGL action prototype in Neon Manhattan: a procedural New York inspired city district with high rises, avenues, a park, and rooftop dragon shrines. This is a prototype, not a recreation of Spider-Man PS4 or real NYC geography.

## Play

Node.js 20+ and a desktop browser with WebGL and hardware acceleration are required.

```sh
npm ci
npm start
```

Open http://localhost:3000 and click Enter the 3D City. Click the game to capture the mouse; Escape releases it.

- WASD / arrows: move relative to camera
- Mouse: orbit third-person camera
- Click / F: shoot (automatically targets nearby sentinels)
- Space: jump
- Shift: sprint
- E: toggle wall grip, then move into a building to climb to its roof
- 1 / 2 / 3: electricity (damage), water (healing and knockback), ice (freeze)
- R: unleash aura at 100; P: pause/resume

Restore three purple rooftop dragon seals shown on the radar and defeat 15 sentinels. Seals heal you and charge aura. The current objective reports distance to the nearest remaining seal.

Run `npm test` for HTTP checks. Three.js is served locally; no runtime CDN or credentials are needed. The optional font uses Google Fonts with a system fallback.
