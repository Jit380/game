# Anime Brawl

A fresh **2D browser platform fighter** inspired by Super Smash Flash 2. Play as Naruto, Luffy, Goku, Midoriya, Ryuga, or Pikachu in a three-stock match against the CPU, a friend on the same keyboard, or a friend in another browser. Take on an eight-entrant CPU championship. Character art is drawn specifically for this project; the game uses no ripped sprites or external runtime assets.

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

Escape pauses offline matches; R rematches after a result (or advances to the next championship round). Online matches keep running when a browser loses focus; your inputs are released. Mouse-clicking the arena also attacks for Player 1. Touch buttons provide basic single-player movement and attacks on touch screens; desktop keyboards provide the full control set. Some keyboards limit simultaneous keys, which can affect local two-player play.

## Fighting

Damage starts at 0% and rises when you get hit. Higher damage means stronger knockback. Launch your opponent beyond the arena to remove a stock. Lose all three stocks and the match ends. If the three-minute timer expires, remaining stocks decide the winner, followed by lower damage; exact ties produce a draw.

- **Naruto:** fast movement and a rushing Rasengan.
- **Luffy:** a long-reaching Gum-Gum Pistol that sends rivals flying.
- **Goku:** charge and fire a Kamehameha beam.
- **Midoriya:** fast footwork and a hard-hitting Delaware Smash shockwave.
- **Ryuga:** heavier weight and a large, slower L-Drago dragon projectile.
- **Pikachu:** fastest movement, lighter weight, and a quick Thunderbolt.

Neutral attacks chain into a stronger third hit. Up attacks launch upward; down attacks spike in the air. Shields lose strength when held or hit, and break under pressure. Dodge grants brief invulnerability. Specials spend a regenerating meter; up-special recovers in the air once before landing. Ledge grabs help a recovering fighter return.

Hidden Leaf Village has rooftop platforms beneath a carved mountain monument. Namek has an asymmetric island layout, green skies, and alien trees. Boxing Ring is a flat main-event stage with a crowd and decorative ropes (they do not block ring-outs). Sky Temple, Sunset Docks, and Moon Arena remain available. CPU difficulty changes reactions, defense, and special usage. Dynamic camera framing, attack effects, knockback shake, hit pauses, and generated arcade audio accompany the fights.

## Development and tests

The simulation lives in `engine.mjs`, drawings in `art.js`, browser flow/input in `game.js`, and the static HTTP server in `server.js`. No bundler or build step is needed. The runtime uses `ws` for WebSockets; Playwright is a development dependency. `multiplayer.cjs` runs authoritative room matches, and `tournament.mjs` manages the elimination bracket.

```sh
npm test
npm run test:browser
```

The browser suite uses Playwright. It automatically uses `/usr/bin/chromium` when available; set `CHROMIUM_PATH` for another installation or run `npx playwright install chromium`. `CAPTURE_DIR=/tmp npm run test:browser` captures the menu and a match. Logic tests cover movement, double jumps, platform landing, melee, shields, distinct specials, fast projectiles, recovery, stocks, timing, and CPU behavior. Browser checks exercise selection, keyboard controls, hits, shielding, pause, results, rematches, CPU pursuit, specials, and small-screen layout.

Fonts are served locally; their SIL Open Font License notices are in `assets/fonts`. This is an unofficial fan-made game and is not affiliated with the character owners. It supports two fighters per match, six characters, six stages, local and online 1v1, and CPU play. This is a playable fan-game prototype, not full Super Smash Flash 2 feature parity.

## Online 1v1

1. Both players open **the same running game server** and select **ONLINE 2 PLAYER**.
2. Each player selects a fighter. The host also picks the stage and presses **CREATE ROOM**.
3. The host shares the six-character room code; the other player enters it and presses **JOIN ROOM**.
4. The match starts when both players join. **Both use the Player 1 controls on their own keyboard**, including touch controls on mobile. Your player number appears above the match.
5. After a result, both players must press **REMATCH**. Character Select leaves the room; a disconnect ends the session for the other player.

On the same Wi-Fi, run `npm start` on one computer and have both players open `http://HOST_LAN_IP:3000` (replace HOST_LAN_IP with that computer’s LAN IPv4 address). Windows `ipconfig` shows it. Allow Node through the host firewall on your private network if prompted. Opening `localhost` on a different computer points to that different computer, so it cannot find the host’s rooms.

For friends on different networks, deploy this Node server on a public host that supports WebSockets. Both players must use that shared URL. HTTPS automatically uses secure WebSockets; forwarding `/play` upgrades is required when using a reverse proxy. Static-only hosting such as GitHub Pages cannot run the multiplayer server. This update does not provision public hosting.

Rooms are private by code, hold two players, and expire after ten minutes if no opponent joins. They are held in memory, so restarting the server clears rooms. The server simulates at 60 Hz and sends state at 20 Hz; keyboard input is sent at 30 Hz. There is no account system, matchmaking, spectator mode, or rollback prediction. Low network latency gives the best feel. Online matches cannot be paused by one player.

## Championship

Select **CHAMPIONSHIP VS CPU** and a CPU level, fighter, and stage. Your fighter enters an eight-slot single-elimination bracket: win the quarterfinal, semifinal, and final to become champion. Other bracket matches are simulated; with six characters, some entrants share a character. The results show the bracket winners. Losing eliminates you; a draw replays the same round. This championship is single-player; use Local or Online modes for human rivals.

The expanded tests cover new specials, all six stage starts, bracket wins and elimination, room validation, shared state, player input ownership, rematch consent, and disconnect cleanup. A two-browser smoke test exercises the online room UI and both player screens.
