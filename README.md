# Anime Brawl

A fresh **2D browser platform fighter** inspired by Super Smash Flash 2. Play as Naruto, Luffy, or Goku in a three-stock match against the CPU or a friend on the same keyboard. Character art is drawn specifically for this project; the game uses no ripped sprites or external runtime assets.

## Play

Requires Node.js 20 or newer. In the repository folder:

```sh
npm ci
npm start
```

Open **http://localhost:3000**, choose your fighter, opponent, stage, and mode, then enter the arena. If an old game server is running, stop it with Ctrl+C before starting this one. This replaces the earlier 3D and Windows builds; their source remains in Git history.

## Controls

| Action                        | Player 1      | Player 2 (local mode) |
| ----------------------------- | ------------- | --------------------- |
| Move                          | A / D         | Left / Right arrows   |
| Jump / double jump            | W or Space    | Up arrow              |
| Attack                        | J             | I                     |
| Special                       | K             | O                     |
| Shield                        | L             | P                     |
| Dodge                         | Left Shift    | Right Shift           |
| Up attack / air recovery      | W + J / W + K | Up + I / Up + O       |
| Down attack / aerial spike    | S + J         | Down + I              |
| Drop through a small platform | S + Space     | Down + Up             |

Escape pauses; R rematches after a result. Mouse-clicking the arena also attacks for Player 1. Touch buttons provide basic single-player movement and attacks on touch screens; desktop keyboards provide the full control set. Some keyboards limit simultaneous keys, which can affect local two-player play.

## Fighting

Damage starts at 0% and rises when you get hit. Higher damage means stronger knockback. Launch your opponent beyond the arena to remove a stock. Lose all three stocks and the match ends. If the three-minute timer expires, remaining stocks decide the winner, followed by lower damage; exact ties produce a draw.

- **Naruto:** fast movement and a rushing Rasengan.
- **Luffy:** a long-reaching Gum-Gum Pistol that sends rivals flying.
- **Goku:** charge and fire a Kamehameha beam.

Neutral attacks chain into a stronger third hit. Up attacks launch upward; down attacks spike in the air. Shields lose strength when held or hit, and break under pressure. Dodge grants brief invulnerability. Specials spend a regenerating meter; up-special recovers in the air once before landing. Ledge grabs help a recovering fighter return.

Sky Temple has three platforms, Sunset Docks has two, and Moon Arena is a flat stage. CPU difficulty changes reactions, defense, and special usage. Dynamic camera framing, attack effects, knockback shake, hit pauses, and generated arcade audio accompany the fights.

## Development and tests

The simulation lives in `engine.mjs`, drawings in `art.js`, browser flow/input in `game.js`, and the static HTTP server in `server.js`. No bundler or build step is needed. Only the development browser test uses a package dependency.

```sh
npm test
npm run test:browser
```

The browser suite uses Playwright. It automatically uses `/usr/bin/chromium` when available; set `CHROMIUM_PATH` for another installation or run `npx playwright install chromium`. `CAPTURE_DIR=/tmp npm run test:browser` captures the menu and a match. Logic tests cover movement, double jumps, platform landing, melee, shields, distinct specials, fast projectiles, recovery, stocks, timing, and CPU behavior. Browser checks exercise selection, keyboard controls, hits, shielding, pause, results, rematches, CPU pursuit, specials, and small-screen layout.

Fonts are served locally; their SIL Open Font License notices are in `assets/fonts`. This is an unofficial fan-made game and is not affiliated with the character owners. It currently supports two fighters per match, three characters, three stages, local play, and CPU play; online multiplayer and full Super Smash Flash 2 feature parity are outside this build.
