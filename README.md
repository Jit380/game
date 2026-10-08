# Ultimateman — First Response

The primary build is now a **native Windows game made with Godot 4.6.3**, with an original rigged anime character, skeletal animation clips, and a short superhero story chapter.

## Download and play

[Download the Windows game](https://github.com/Jit380/game/raw/refs/heads/main/dist/Ultimateman-Windows.zip), extract the ZIP, and double-click **Ultimateman.exe**. No browser or Node.js is needed. Windows 10/11 x64 and an OpenGL 3.3-capable graphics driver are required.

Start **Chapter One** to pursue a courier, protect witnesses, investigate a rooftop transmitter, and confront the Warden. **Play the Warden Encounter** jumps directly to the two-phase boss fight.

WASD moves, mouse controls the camera, Shift sprints, Space jumps/glides, Q leaps to rooftops, E enables wall grip/interacts, click/F attacks, 1/2/3 select elements, C dodges, R releases aura, and Escape pauses.

See [native/README.md](native/README.md) for source, export, and test instructions. The graphics are stylized prototype art. The Windows build was exported and structurally verified on Linux; it has not yet been launched on Windows hardware.

## Earlier browser prototype

The root JavaScript files remain available as the earlier browser version. `npm ci && npm start` runs that version at http://localhost:3000. It does **not** launch the new native game.
