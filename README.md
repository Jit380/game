# Ultimateman: Dragon Awakening — First Response

An original third-person superhero story prototype in a procedural New York inspired district. Play Elias Reed, a new guardian whose black armor channels ancient dragon aura through electricity, water, and ice. This is a compact playable opening chapter with procedural graphics, not a production-quality recreation of Spider-Man or geographically accurate New York.

## Play

Install Node.js 20+; use a desktop Chrome or Edge browser with WebGL and hardware acceleration.

```sh
npm ci
npm start
```

Open http://localhost:3000. Click **Enter the 3D City**. The opening camera sequence can be skipped with Enter. Click the scene to capture your mouse; Escape releases it. If capture is unavailable, hold the mouse button and drag to rotate.

## Controls

- WASD / arrows: movement relative to camera
- Mouse: third-person camera
- Shift: sprint
- Space: super jump; Shift + Space: high jump; hold Space while descending to glide
- Q: dragon step to a nearby rooftop in front of the camera (four-second cooldown)
- E: wall grip; move into a building to climb and release E to descend. At the story transmitter, E disables it.
- Click / F: elemental attack with automatic targeting of nearby threats
- 1 / 2 / 3: electricity for fast damage, water for healing and knockback, ice to freeze
- R: aura blast when charged to 100
- C: aura dodge with brief invulnerability and a cooldown
- P: pause; M: mute/unmute synthesized audio

## Chapter One: First Response

Follow the gold mission marker. Respond to Mira's distress call, investigate a robbery, sprint after a fleeing courier, protect three witnesses from the Warden's sentinels, reach and disable a rooftop transmitter, then return for a confrontation with the Warden. The mission advances through dialogue and actions; there are no collectible seal objectives or arbitrary enemy kill quotas. Mission transitions restore some health; disabling the transmitter charges your aura for the final encounter.

Presentation includes an opening camera sequence, a rounded armored hero, textured facades and streets, water towers, shops, moving taxis, atmospheric sunset lighting, elemental trails, hit feedback, generated audio, and camera collision checks. Graphics remain stylized and animations procedural. Traffic is decorative; there are no interiors, voice actors, or full campaign yet.

## Development

`npm test` checks the HTTP server, local Three.js delivery, and private file protection. `npm run test:browser` runs Chromium story regression checks, including actual elemental combat and witness failure. On machines without Chromium, first run `npx playwright install chromium`; `CHROMIUM_PATH` can point to an existing installation. The browser test injects private controls into its own HTTP response to advance mission positions; those controls are not shipped to players. Three.js is served locally. No credentials, CDN, or external art assets are required; the optional Google font has a system fallback.

If the game cannot load, it reports an error on the title screen. Stop the old server, run `git pull`, `npm ci`, and `npm start`, then hard-refresh your browser. Restarting the server is necessary when server routes change.

## Anime and boss update

Ultimateman now has an original anime-inspired face, spiky midnight-teal hair, amber eyes, cel shading, ink outlines, scarf, and black combat armor. The Warden encounter has telegraphed ground attacks and an aggressive second phase below half health. Jump clear of warning rings or press C to dodge just before impact. Ice slows the boss briefly instead of freezing it indefinitely. **Play Boss Battle** on the title screen starts the encounter immediately; the story campaign remains available.
