# Ultimateman — First Response (native)

A Godot 4.6.3 Windows game prototype with an original Blender-built, weighted anime character and imported idle, run, jump, and attack animation clips. The short chapter follows a street robbery, courier pursuit, witness rescue, rooftop transmitter investigation, and a two-phase Warden encounter. No seal collection or enemy kill quota is used.

## Play on Windows

Download `dist/Ultimateman-Windows.zip` from the repository, extract it, and double-click `Ultimateman.exe`. No Node.js, browser, or Godot installation is needed. Requires Windows 10/11 x64 and OpenGL 3.3-capable graphics drivers. The build is unsigned.

WASD moves; mouse controls the camera; Shift sprints; Space jumps, Shift+Space jumps higher, and holding Space during descent glides. Q leaps to a rooftop in front of the camera. E toggles wall grip or interacts with the story transmitter. Click/F attacks; 1/2/3 select electricity, water, and ice. C dodges and R releases a full aura blast. Escape pauses and releases the mouse. A menu button starts the boss fight immediately.

## Develop

Open `project.godot` in Godot 4.6.3 and run the main scene. To regenerate the original rigged asset, run `blender -b --python tools/build_character.py` from this directory. The GLB is committed, so Blender is optional for playing or editing gameplay.

For a cloud workspace, use `native/tools/cloud-godot.sh` from the repository root to keep writable Godot data in `/workspace/.ultimateman-tools`. Use the existing checkout; cloud tasks are already isolated and do not need another Git worktree.

```sh
native/tools/cloud-godot.sh --headless --path native --editor --import --quit
native/tools/cloud-godot.sh --headless --path native --fixed-fps 60 --script res://tests/smoke.gd
native/tools/cloud-godot.sh --path native
```

The smoke suite executes character import, animation clip checks, movement, jumping, pursuit, actual elemental combat, rescue, interaction, boss phases, dodge, ending, and rooftop traversal. Visual checks can run `res://tests/visual.gd` with a display and OpenGL renderer. Headless smoke checks do not verify rendered graphics.

## Export

Install the matching Windows template through Godot's export-template manager. In the cloud, `python native/tools/install_export_template.py` installs the Windows template after SHA-512 verification; the first download is 1.26 GB, and only the 105 MB Windows template is retained. Its archive checksum is pinned to Godot's published SHA512-SUMS.txt; the extracted binary checksum was derived from that verified archive.

```sh
mkdir -p dist/windows
native/tools/cloud-godot.sh --headless --path native --export-release 'Windows Desktop' ../dist/windows/Ultimateman.exe
python native/tools/package_windows.py
```

## Limits

The graphics are original and stylized, not photorealistic. The district is inspired by New York and does not reproduce its geography. There are no interiors, voice acting, full campaign, or licensed character assets. The Windows executable was exported and structurally checked on Linux; Windows launch testing remains outstanding. The native project is separate from the earlier browser prototype, which remains in the repository for reference.
