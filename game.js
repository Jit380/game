import * as THREE from "/vendor/three.module.js";
const $ = (s) => document.querySelector(s),
  canvas = $("#world");
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
} catch (e) {
  $("#story").textContent =
    "This 3D game requires WebGL. Enable hardware acceleration in your browser and reload.";
  throw e;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setSize(innerWidth, innerHeight);
const scene = new THREE.Scene();
scene.background = new THREE.Color("#b5a599");
scene.fog = new THREE.Fog("#b5a599", 110, 570);
const camera = new THREE.PerspectiveCamera(
  65,
  innerWidth / innerHeight,
  0.1,
  1000,
);
scene.add(new THREE.HemisphereLight(0xb9c8e0, 0x4f3930, 1.4));
const sun = new THREE.DirectionalLight(0xffc18c, 3.5);
sun.position.set(-80, 150, 80);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, {
  left: -130,
  right: 130,
  top: 130,
  bottom: -130,
});
scene.add(sun);
scene.add(sun.target);
const mat = (color, extra = {}) =>
  new THREE.MeshStandardMaterial({ color, ...extra });
const asphalt = mat("#85919a", { roughness: 0.35, metalness: 0.15 }),
  concrete = mat("#a4a9ad"),
  black = mat("#111823"),
  green = mat("#53ffc0", { emissive: "#2c9975", emissiveIntensity: 1 });
const staticBoxes = [];
function box(w, h, d, m, x, y, z) {
  const entry = { w, h, d, m, x, y, z };
  staticBoxes.push(entry);
  return entry;
}
box(1600, 2, 1600, mat("#224c67"), 0, -3, 0);
box(760, 2, 760, asphalt, 0, -1, 0);
const buildings = [],
  roofs = [],
  city = new THREE.Group();
scene.add(city);
let seed = 7;
function rand() {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
}
function texture(draw, repeat = 1) {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  draw(c.getContext("2d"));
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return t;
}
const masonry = texture((c) => {
  c.fillStyle = "#a99f94";
  c.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 16)
    for (let x = -32; x < 256; x += 64) {
      c.fillStyle = `rgb(${150 + Math.floor(rand() * 50)},${145 + Math.floor(rand() * 35)},${140 + Math.floor(rand() * 25)})`;
      c.fillRect(x + (y % 32 ? 32 : 0) + 1, y + 1, 62, 14);
    }
}, 4);
asphalt.map = texture((c) => {
  c.fillStyle = "#757575";
  c.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 6000; i++) {
    c.fillStyle = rand() > 0.5 ? "#888" : "#555";
    c.fillRect(rand() * 256, rand() * 256, 1, 1);
  }
}, 100);
asphalt.needsUpdate = true;
const windowGeo = new THREE.BoxGeometry(1.3, 1.9, 0.12),
  windowMat = mat("#7c94a1", { metalness: 0.8, roughness: 0.18 });
const windows = new THREE.InstancedMesh(windowGeo, windowMat, 40000);
let wi = 0;
const transform = new THREE.Object3D();
for (let gx = -4; gx <= 4; gx++)
  for (let gz = -4; gz <= 4; gz++) {
    const x = gx * 78,
      z = gz * 78;
    if (Math.abs(gx) < 1 && Math.abs(gz) < 1) continue;
    box(60, 0.7, 60, concrete, x, 0.1, z);
    const h = 18 + rand() * 65 + (gz < -1 ? rand() * 35 : 0),
      w = 42 + rand() * 7,
      d = 42 + rand() * 7;
    const b = { x, z, w, d, h };
    buildings.push(b);
    const color = ["#6a6461", "#747e88", "#8a7164", "#536774"][
      Math.floor(rand() * 4)
    ];
    box(w, h, d, mat(color, { roughness: 0.8, map: masonry }), x, h / 2, z);
    for (let ly = 8; ly < h; ly += 12)
      box(w + 0.4, 0.4, d + 0.4, mat("#343d45"), x, ly, z);
    for (let edge of [-1, 1])
      box(
        0.7,
        h,
        0.7,
        mat("#424c55"),
        x + edge * (w / 2 - 0.5),
        h / 2,
        z - d / 2 - 0.3,
      );
    box(w + 1, 1.3, d + 1, mat("#3a434a"), x, h, z);
    roofs.push(box(9, 3, 7, mat("#64727b"), x + 8, h + 2, z + 6));
    for (let y = 5; y < h - 3; y += 4)
      for (let side = 0; side < 4; side++)
        for (let a = -w / 2 + 4; a < w / 2 - 2; a += 5) {
          transform.position.set(
            side < 2 ? x + a : x + (side === 2 ? -w / 2 - 0.1 : w / 2 + 0.1),
            y,
            side < 2 ? z + (side === 0 ? -d / 2 - 0.1 : d / 2 + 0.1) : z + a,
          );
          transform.rotation.set(0, side < 2 ? 0 : Math.PI / 2, 0);
          transform.updateMatrix();
          windows.setMatrixAt(wi++, transform.matrix);
        }
  }
windows.count = wi;
scene.add(windows);
// Avenue markings, crosswalks, and street furniture.
const paint = mat("#e8d9ab");
for (let a = -350; a < 360; a += 78) {
  for (let b = -350; b < 360; b += 14) {
    box(0.3, 0.03, 5, paint, a + 39, 0.03, b);
    box(5, 0.03, 0.3, paint, b, 0.03, a + 39);
  }
  for (let b = -312; b <= 312; b += 78)
    for (let j = -3; j <= 3; j++) {
      box(1.4, 0.035, 10, concrete, a + 39 + j * 2.3, 0.05, b + 29);
    }
}
for (let i = 0; i < 60; i++) {
  const x = (Math.floor(rand() * 9) - 4) * 78 + 32,
    z = (rand() - 0.5) * 680;
  box(0.35, 7, 0.35, mat("#343e43"), x, 3.5, z);
  box(2, 0.3, 0.8, mat("#ffe4a2", { emissive: "#ffd174" }), x + 1, 7, z);
}
const park = box(54, 0.1, 54, mat("#426b48"), 0, 0.1, 0);
for (let i = 0; i < 16; i++) {
  let x = (rand() - 0.5) * 50,
    z = (rand() - 0.5) * 50;
  box(0.7, 4, 0.7, mat("#6c5140"), x, 2, z);
  const tree = new THREE.Mesh(
    new THREE.IcosahedronGeometry(3.3, 1),
    mat("#315d44"),
  );
  tree.position.set(x, 5, z);
  scene.add(tree);
}
// Original armored hero, built as a articulated silhouette.
const hero = new THREE.Group();
scene.add(hero);
function part(w, h, d, m, x, y, z) {
  const p = new THREE.Mesh(
    new THREE.CapsuleGeometry(
      Math.min(w, d) / 2,
      Math.max(0.01, h - Math.min(w, d)),
      4,
      10,
    ),
    m,
  );
  p.scale.x = w / Math.min(w, d);
  p.scale.z = d / Math.min(w, d);
  p.position.set(x, y, z);
  p.castShadow = true;
  hero.add(p);
  return p;
}
const armor = mat("#303b46", { metalness: 0.55, roughness: 0.4 });
black.roughness = 0.85;
black.bumpMap = texture((c) => {
  c.fillStyle = "#777";
  c.fillRect(0, 0, 256, 256);
  c.strokeStyle = "#929292";
  for (let i = 0; i < 256; i += 4) {
    c.beginPath();
    c.moveTo(i, 0);
    c.lineTo(i, 256);
    c.moveTo(0, i);
    c.lineTo(256, i);
    c.stroke();
  }
}, 5);
black.bumpScale = 0.025;
part(0.88, 1.0, 0.46, black, 0, 1.57, 0);
part(0.55, 0.38, 0.43, black, 0, 1.07, 0);
part(0.24, 0.24, 0.25, black, 0, 2.11, 0);
part(0.47, 0.58, 0.49, black, 0, 2.45, 0);
part(0.38, 0.06, 0.035, green, 0, 2.48, -0.25);
part(0.055, 0.64, 0.48, green, 0, 1.6, 0);
for (const side of [-1, 1]) {
  const plate = new THREE.Mesh(new THREE.IcosahedronGeometry(0.3, 1), armor);
  plate.scale.set(1.1, 0.65, 0.8);
  plate.position.set(side * 0.52, 1.99, 0);
  hero.add(plate);
  const chest = new THREE.Mesh(new THREE.BoxGeometry(0.31, 0.31, 0.1), armor);
  chest.position.set(side * 0.19, 1.83, -0.245);
  chest.rotation.z = side * 0.15;
  hero.add(chest);
}
function limb(x, y, length, radius, leg) {
  const group = new THREE.Group();
  group.position.set(x, y, 0);
  const mesh = new THREE.Mesh(
    new THREE.CapsuleGeometry(radius, length - 2 * radius, 5, 12),
    black,
  );
  mesh.position.y = -length / 2;
  mesh.castShadow = true;
  group.add(mesh);
  const joint = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 1.05, 10, 8),
    armor,
  );
  joint.position.y = -length * 0.52;
  group.add(joint);
  const end = new THREE.Mesh(
    new THREE.CapsuleGeometry(radius * 0.95, leg ? 0.22 : 0.05, 4, 10),
    armor,
  );
  end.position.set(0, -length, leg ? -0.12 : 0);
  if (leg) end.rotation.x = Math.PI / 2;
  group.add(end);
  const line = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, length * 0.5, radius * 2.1),
    green,
  );
  line.position.y = -length * 0.45;
  group.add(line);
  hero.add(group);
  return group;
}
const legs = [
  limb(-0.22, 1.03, 0.88, 0.14, true),
  limb(0.22, 1.03, 0.88, 0.14, true),
];
const arms = [
  limb(-0.55, 1.98, 0.82, 0.12, false),
  limb(0.55, 1.98, 0.82, 0.12, false),
];
const auraRing = new THREE.Mesh(new THREE.TorusGeometry(2, 0.07, 8, 40), green);
auraRing.rotation.x = Math.PI / 2;
auraRing.position.y = 0.1;
hero.add(auraRing);
auraRing.visible = false;
let cinematic = 0,
  shake = 0,
  zip = null,
  zipCooldown = 0,
  bossSpawned = false,
  bossDefeated = false;
let audio = null,
  muted = false;
function sound(freq = 180, duration = 0.12, type = "sine") {
  if (muted || !audio) return;
  const osc = audio.createOscillator(),
    gain = audio.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, audio.currentTime);
  osc.frequency.exponentialRampToValueAtTime(
    Math.max(30, freq / 3),
    audio.currentTime + duration,
  );
  gain.gain.setValueAtTime(0.08, audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration);
  osc.connect(gain);
  gain.connect(audio.destination);
  osc.start();
  osc.stop(audio.currentTime + duration);
}
let state,
  active = false,
  paused = false,
  ended = false,
  yaw = 0,
  pitch = 0.22,
  power = 0,
  cool = 0,
  clock = 0;
const keys = new Set(),
  enemies = [],
  shots = [],
  effects = [];
const palette = [0x65ffbd, 0x4ab9ff, 0xd6f2ff];
function disposeTransient(mesh) {
  scene.remove(mesh);
  mesh.traverse((child) => {
    if (child.isMesh) {
      child.geometry.dispose();
      if (Array.isArray(child.material))
        child.material.forEach((m) => m.dispose());
      else child.material.dispose();
    }
  });
}
function reset() {
  for (const e of [...enemies, ...shots, ...effects]) disposeTransient(e.mesh);
  enemies.length = shots.length = effects.length = 0;
  state = {
    pos: new THREE.Vector3(39, 0, 39),
    vy: 0,
    hp: 100,
    aura: 0,
    kills: 0,
    climb: false,
    dash: 0,
  };
  cool = 0;
  zip = null;
  zipCooldown = 0;
  bossSpawned = bossDefeated = false;
  keys.clear();
  mission = 0;
  missionWait = 0;
  criminal.visible = false;
  checkpoint.visible = true;
  witnesses.forEach((w) => {
    w.visible = false;
    w.userData.hp = 100;
  });
  checkpoint.position.copy(missionTargets[0]);
  $("#boss").style.display = "none";
  $("#comms").style.display = "none";
  ended = false;
  hero.position.copy(state.pos);
  select(0);
}
function select(n) {
  power = n;
  green.color.setHex(palette[n]);
  green.emissive.setHex(palette[n]);
  document
    .querySelectorAll("[data-power]")
    .forEach((b) => b.classList.toggle("selected", +b.dataset.power === n));
}
function toast(t) {
  $("#toast").textContent = t;
  $("#toast").style.opacity = 1;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => ($("#toast").style.opacity = 0), 3000);
}
function pause() {
  if (!active || ended) return;
  paused = !paused;
  $("#pause").textContent = paused ? "RESUME · P" : "PAUSE · P";
  if (paused) document.exitPointerLock?.();
}
$("#pause").onclick = pause;
document
  .querySelectorAll("[data-power]")
  .forEach((b) => (b.onclick = () => select(+b.dataset.power)));
$("#begin").onclick = () => {
  try {
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    audio.resume().catch(() => {});
  } catch {}
  reset();
  sound(80, 0.8);
  cinematic = 6;
  active = true;
  paused = false;
  $("#overlay").style.display = "none";
  lockPointer();
  toast("CHAPTER ONE · FIRST RESPONSE");
  radio(
    "MIRA VALE",
    "Elias? The police scanner is blowing up. Someone is using dragon tech on East Ninth. Get there.",
  );
  $("#cinematic").style.display = "block";
};
function lockPointer() {
  try {
    const result = canvas.requestPointerLock?.();
    result?.catch(() =>
      toast("Mouse capture unavailable · drag to rotate the camera"),
    );
  } catch {
    toast("Drag the mouse to rotate the camera");
  }
}
let firing = false;
canvas.onmousedown = () => {
  if (!active || paused) return;
  lockPointer();
  firing = true;
};
addEventListener("mouseup", () => (firing = false));
addEventListener("mousemove", (e) => {
  if (document.pointerLockElement === canvas || firing) {
    yaw -= e.movementX * 0.0025;
    pitch = Math.max(-0.35, Math.min(1.05, pitch + e.movementY * 0.002));
  }
});
addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  if ([" ", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k))
    e.preventDefault();
  keys.add(k);
  if (e.repeat) return;
  if ("123".includes(k)) select(+k - 1);
  if (k === "p") pause();
  if (k === "enter") cinematic = 0;
  if (k === "m") {
    muted = !muted;
    toast(muted ? "AUDIO MUTED" : "AUDIO ENABLED");
  }
  if (!active || paused || ended) return;
  if (
    k === "e" &&
    mission === 4 &&
    state.pos.distanceTo(missionTargets[4]) < 8
  ) {
    advanceMission();
    return;
  }
  if (k === "e") {
    state.climb = !state.climb;
    toast(
      state.climb
        ? "WALL GRIP ENABLED · MOVE INTO A BUILDING"
        : "WALL GRIP RELEASED",
    );
  }
  if (k === "q" && zipCooldown <= 0) {
    const f = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
    const targets = buildings
      .map((b) => ({
        b,
        delta: new THREE.Vector3(b.x, state.pos.y, b.z).sub(state.pos),
      }))
      .filter(
        (t) =>
          t.delta.length() < 130 &&
          t.delta.length() > 8 &&
          t.delta.normalize().dot(f) > 0.25,
      )
      .sort(
        (a, b) =>
          Math.hypot(a.b.x - state.pos.x, a.b.z - state.pos.z) -
          Math.hypot(b.b.x - state.pos.x, b.b.z - state.pos.z),
      );
    if (targets.length) {
      zip = {
        from: state.pos.clone(),
        to: new THREE.Vector3(
          targets[0].b.x,
          targets[0].b.h + 1,
          targets[0].b.z,
        ),
        t: 0,
      };
      zipCooldown = 4;
      state.vy = 0;
      sound(450, 0.45);
      toast("DRAGON STEP · ROOFTOP LEAP");
    } else toast("FACE A NEARBY BUILDING TO DRAGON STEP");
  }
  if (k === " " && state.pos.y <= floorAt(state.pos) + 0.1)
    state.vy = keys.has("shift") ? 65 : 42;
  if (k === "r" && state.aura >= 100) {
    state.aura = 0;
    shake = 0.6;
    for (const enemy of enemies)
      if (enemy.mesh.position.distanceTo(state.pos) < 40) enemy.hp -= 120;
    effect(state.pos, 0xb58cff, 10);
    toast("DRAGON AURA UNLEASHED");
  }
});
addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));
addEventListener("blur", () => {
  keys.clear();
  firing = false;
  if (active && !paused && !ended) pause();
});
function inside(b, p, pad = 0) {
  return (
    Math.abs(p.x - b.x) < b.w / 2 + pad && Math.abs(p.z - b.z) < b.d / 2 + pad
  );
}
function floorAt(p, previousY = p.y) {
  let h = 0;
  for (const b of buildings)
    if (inside(b, p) && previousY >= b.h - 0.5) h = Math.max(h, b.h + 0.7);
  return h;
}
function effect(pos, color, r = 1) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(r, 8, 6),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.7,
      wireframe: true,
    }),
  );
  mesh.position.copy(pos);
  scene.add(mesh);
  effects.push({ mesh, life: 0.5 });
}
function finish(win) {
  ended = true;
  firing = false;
  document.exitPointerLock?.();
  $("#overlay").style.display = "flex";
  $(".panel small").textContent = win
    ? "ORIGIN CHAPTER COMPLETE"
    : "THE CITY NEEDS ITS GUARDIAN";
  $("h1").innerHTML = win
    ? "THE DRAGON<br><em>AWAKENS.</em>"
    : "RISE AGAIN,<br><em>ULTIMATEMAN.</em>";
  $("#story").textContent = win
    ? "You saved East Ninth, stopped the courier, and destroyed the Warden’s transmitter. But the stolen dragon core is still missing. Mira has a lead—and the city has a new guardian. End of playable Chapter One."
    : "East Ninth still needs you. Use water to heal, ice to freeze enemies, Q to leap to rooftops, and Shift to catch the courier. Restart the chapter and bring everyone home.";
  $("#begin").innerHTML = "PLAY AGAIN <span>→</span>";
}
function update(dt) {
  clock += dt;
  zipCooldown = Math.max(0, zipCooldown - dt);
  $("#traversal").textContent =
    zipCooldown > 0
      ? "DRAGON STEP · " + zipCooldown.toFixed(1) + "s"
      : "Q · DRAGON STEP READY";
  const previousY = state.pos.y;
  shake = Math.max(0, shake - dt * 2);
  cool -= dt;
  state.dash -= dt;
  const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw)),
    right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
  let move = forward
    .clone()
    .multiplyScalar(
      (keys.has("w") || keys.has("arrowup") ? 1 : 0) -
        (keys.has("s") || keys.has("arrowdown") ? 1 : 0),
    )
    .addScaledVector(
      right,
      (keys.has("d") || keys.has("arrowright") ? 1 : 0) -
        (keys.has("a") || keys.has("arrowleft") ? 1 : 0),
    );
  if (move.length() > 0) move.normalize();
  let speed = keys.has("shift") ? 25 : 13;
  const next = state.pos.clone().addScaledVector(move, speed * dt);
  let wall = buildings.find((b) => inside(b, next, 1) && state.pos.y < b.h);
  if (wall) {
    if (state.climb && move.length() > 0) {
      state.pos.y += 20 * dt;
      state.vy = 0;
      $("#status").textContent = "WALL GRIP · ASCENDING";
      if (state.pos.y >= wall.h) {
        state.pos.y = wall.h + 1;
        state.pos.copy(next.setY(state.pos.y));
      }
    }
  } else {
    state.pos.x = THREE.MathUtils.clamp(next.x, -365, 365);
    state.pos.z = THREE.MathUtils.clamp(next.z, -365, 365);
  }
  if (!wall || !state.climb) {
    state.vy -= (keys.has(" ") && state.vy < 0 ? 5 : 30) * dt;
    if (keys.has(" ") && state.vy < 0) state.vy = Math.max(-5, state.vy);
    state.pos.y += state.vy * dt;
    const floor = floorAt(state.pos, previousY);
    if (state.pos.y <= floor) {
      state.pos.y = floor;
      state.vy = 0;
    }
    $("#status").textContent =
      state.pos.y > 5 ? "ROOFTOP / AIRBORNE" : "STREET LEVEL";
  }
  if (zip) {
    zip.t = Math.min(1, zip.t + dt / 1.1);
    state.pos.copy(zip.from).lerp(zip.to, zip.t);
    state.pos.y += Math.sin(zip.t * Math.PI) * 15;
    state.vy = 0;
    if (Math.random() > 0.5) effect(state.pos, palette[power], 0.5);
    if (zip.t >= 1) {
      zip = null;
      shake = 0.2;
      sound(80, 0.2);
    }
  }
  hero.position.copy(state.pos);
  if (move.length() > 0) hero.rotation.y = Math.atan2(-move.x, -move.z);
  legs[0].rotation.x = Math.sin(clock * 12) * (move.length() > 0.1 ? 0.5 : 0);
  legs[1].rotation.x = -legs[0].rotation.x;
  arms[0].rotation.x = -legs[0].rotation.x;
  arms[1].rotation.x = cool > 0.05 ? -1.3 : legs[0].rotation.x;
  if (state.pos.y > floorAt(state.pos) + 1) {
    arms[0].rotation.z = -0.8;
    arms[1].rotation.z = 0.8;
  } else arms.forEach((a) => (a.rotation.z = 0));
  auraRing.visible = state.aura >= 100;
  if ((firing || keys.has("f")) && cool <= 0) {
    const origin = state.pos.clone().add(new THREE.Vector3(0, 1.7, 0));
    let target = enemies
      .filter((e) => e.mesh.position.distanceTo(origin) < 95)
      .sort(
        (a, b) =>
          a.mesh.position.distanceTo(origin) -
          b.mesh.position.distanceTo(origin),
      )[0];
    let direction = target
      ? target.mesh.position
          .clone()
          .add(new THREE.Vector3(0, 1, 0))
          .sub(origin)
          .normalize()
      : forward.clone();
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(power === 0 ? 0.2 : 0.4, 8, 8),
      new THREE.MeshBasicMaterial({ color: palette[power] }),
    );
    mesh.position.copy(origin);
    scene.add(mesh);
    shots.push({ mesh, dir: direction, life: 1.5, p: power });
    sound([520, 220, 900][power], 0.12, power === 0 ? "sawtooth" : "sine");
    arms[1].rotation.x = -1.3;
    cool = power === 0 ? 0.2 : 0.4;
  }

  for (const s of shots) {
    s.life -= dt;
    const start = s.mesh.position.clone();
    s.mesh.position.addScaledVector(s.dir, 65 * dt);
    const trail = new THREE.Mesh(
      new THREE.CylinderGeometry(
        0.025,
        0.025,
        start.distanceTo(s.mesh.position),
        5,
      ),
      new THREE.MeshBasicMaterial({
        color: palette[s.p],
        transparent: true,
        opacity: 0.8,
      }),
    );
    trail.position.copy(start).lerp(s.mesh.position, 0.5);
    trail.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), s.dir);
    scene.add(trail);
    effects.push({ mesh: trail, life: 0.15 });
    if (
      buildings.some(
        (b) => inside(b, s.mesh.position) && s.mesh.position.y < b.h,
      )
    )
      s.life = 0;
    for (const e of enemies)
      if (
        s.life > 0 &&
        e.mesh.position
          .clone()
          .add(new THREE.Vector3(0, 1, 0))
          .distanceTo(s.mesh.position) < 1.5
      ) {
        e.hp -= s.p === 0 ? 32 : 24;
        if (s.p === 2) e.freeze = 3;
        if (s.p === 1) {
          state.hp = Math.min(100, state.hp + 4);
          e.mesh.position.addScaledVector(s.dir, 4);
        }
        effect(s.mesh.position, palette[s.p]);
        shake = 0.13;
        s.life = 0;
      }
  }
  for (const e of enemies) {
    e.freeze -= dt;
    const d = e.mesh.position.distanceTo(state.pos);
    const victim =
      mission === 3 && d > 12
        ? witnesses
            .filter((w) => w.userData.hp > 0)
            .sort(
              (a, b) =>
                a.position.distanceTo(e.mesh.position) -
                b.position.distanceTo(e.mesh.position),
            )[0]
        : null;
    const targetPosition = victim ? victim.position : state.pos;
    const targetDistance = e.mesh.position.distanceTo(targetPosition);
    if (e.boss) {
      e.mesh.children[1].rotation.z += dt;
      $("#boss").style.display = "block";
      $("#bossHealth").style.width = Math.max(0, e.hp / 4) + "%";
    }
    if (e.freeze <= 0 && targetDistance > 1.8) {
      const step = targetPosition.clone().sub(e.mesh.position);
      step.y = 0;
      step.normalize().multiplyScalar(dt * 5);
      const p = e.mesh.position.clone().add(step);
      if (!buildings.some((b) => inside(b, p) && p.y < b.h))
        e.mesh.position.copy(p);
    }
    if (targetDistance < 2.4 && e.freeze <= 0 && e.hp > 0) {
      if (victim) {
        victim.userData.hp -= 12 * dt;
        if (victim.userData.hp <= 0) {
          finish(false);
          toast("A WITNESS WAS LOST · STAY CLOSE TO PROTECT THEM");
        }
      } else state.hp -= 15 * dt;
    }
    if (e.hp <= 0) {
      if (e.boss) {
        bossDefeated = true;
        toast("THE WARDEN HAS FALLEN");
      }
      sound(100, 0.25);
      state.kills++;
      state.aura = Math.min(100, state.aura + 12);
      effect(e.mesh.position, 0xff6688, 2);
    }
  }
  if (bossDefeated || !bossSpawned) $("#boss").style.display = "none";
  for (let i = enemies.length - 1; i >= 0; i--)
    if (enemies[i].hp <= 0) {
      disposeTransient(enemies[i].mesh);
      enemies.splice(i, 1);
    }
  for (let i = shots.length - 1; i >= 0; i--)
    if (shots[i].life <= 0) {
      scene.remove(shots[i].mesh);
      shots[i].mesh.geometry.dispose();
      shots[i].mesh.material.dispose();
      shots.splice(i, 1);
    }
  for (let i = effects.length - 1; i >= 0; i--) {
    const e = effects[i];
    e.life -= dt;
    e.mesh.scale.multiplyScalar(1 + dt * 3);
    e.mesh.material.opacity = Math.max(0, e.life);
    if (e.life <= 0) {
      scene.remove(e.mesh);
      e.mesh.geometry.dispose();
      e.mesh.material.dispose();
      effects.splice(i, 1);
    }
  }
  updateStory(dt);
  $("#health").style.width = state.hp + "%";
  $("#healthText").textContent = Math.ceil(Math.max(0, state.hp));
  $("#aura").style.width = state.aura + "%";
  $("#auraText").textContent = state.aura + " / 100";
  if (state.hp <= 0) finish(false);
}
const radar = document.createElement("canvas");
radar.width = 160;
radar.height = 160;
radar.id = "radar";
radar.style.cssText =
  "position:absolute;right:32px;bottom:140px;width:160px;height:160px;border:1px solid #456474;background:#0b1728";
document.body.append(radar);
const rc = radar.getContext("2d");
function drawRadar() {
  rc.clearRect(0, 0, 160, 160);
  rc.fillStyle = "#375264";
  for (const b of buildings)
    rc.fillRect(
      ((b.x + 380) / 760) * 160 - (b.w / 760) * 80,
      ((b.z + 380) / 760) * 160 - (b.d / 760) * 80,
      (b.w / 760) * 160,
      (b.d / 760) * 160,
    );
  if (checkpoint.visible) {
    rc.fillStyle = "#ffd58c";
    rc.beginPath();
    rc.arc(
      ((checkpoint.position.x + 380) / 760) * 160,
      ((checkpoint.position.z + 380) / 760) * 160,
      5,
      0,
      7,
    );
    rc.fill();
  }
  if (criminal.visible) {
    rc.fillStyle = "#ff687e";
    rc.beginPath();
    rc.arc(
      ((criminal.position.x + 380) / 760) * 160,
      ((criminal.position.z + 380) / 760) * 160,
      4,
      0,
      7,
    );
    rc.fill();
  }
  rc.fillStyle = "white";
  rc.beginPath();
  rc.arc(
    ((state.pos.x + 380) / 760) * 160,
    ((state.pos.z + 380) / 760) * 160,
    3,
    0,
    7,
  );
  rc.fill();
}
// Moving taxis and civilian cars on the avenues.
const traffic = [];
for (let i = 0; i < 24; i++) {
  const car = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(2, 1, 4.4),
    mat(i % 3 === 0 ? "#e4ad34" : ["#354856", "#702d35", "#b7bbbc"][i % 3]),
  );
  body.position.y = 0.85;
  body.castShadow = true;
  car.add(body);
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.7, 0.75, 2.2),
    mat("#24333c", { metalness: 0.65, roughness: 0.15 }),
  );
  cabin.position.set(0, 1.65, -0.2);
  car.add(cabin);
  for (const side of [-1, 1])
    for (const end of [-1, 1]) {
      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.42, 0.42, 0.3, 12),
        black,
      );
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(side * 1.05, 0.45, end * 1.45);
      car.add(wheel);
    }
  const lane = (Math.floor(rand() * 8) - 4) * 78 + 39;
  car.position.set(lane + (i % 2 ? 3 : -3), 0, (rand() - 0.5) * 700);
  car.rotation.y = i % 2 ? Math.PI : 0;
  scene.add(car);
  traffic.push({ car, speed: i % 2 ? 12 : -12 });
}
// Rooftop antennas, water towers, and an original distant skyline.
for (let i = 0; i < buildings.length; i += 5) {
  const b = buildings[i];
  const tower = new THREE.Mesh(
    new THREE.CylinderGeometry(2.5, 2.5, 5, 12),
    mat("#634b3b"),
  );
  tower.position.set(b.x - 9, b.h + 6, b.z - 7);
  scene.add(tower);
  for (const dx of [-1, 1])
    box(0.3, 4, 0.3, mat("#41474a"), b.x - 9 + dx * 2, b.h + 2, b.z - 7);
  const cap = new THREE.Mesh(
    new THREE.ConeGeometry(3, 1.5, 12),
    mat("#3d4648"),
  );
  cap.position.set(b.x - 9, b.h + 9, b.z - 7);
  scene.add(cap);
  box(0.2, 12, 0.2, mat("#68767d"), b.x + 12, b.h + 6, b.z - 12);
}
for (let i = 0; i < 22; i++) {
  const x = -550 + i * 50,
    h = 45 + rand() * 160;
  box(30, h, 35, mat("#52606b"), x, h / 2, -470);
  if (i % 5 === 0) box(2, 30, 2, mat("#68727a"), x, h + 15, -470);
}
const emblem = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.035, 8, 3), green);
emblem.position.set(0, 1.8, -0.25);
hero.add(emblem);
const rim = new THREE.DirectionalLight(0x77bfff, 1.7);
rim.position.set(50, 80, -70);
scene.add(rim);
// Original street signage and shop fronts.
function sign(text, x, y, z) {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 128;
  const p = c.getContext("2d");
  p.fillStyle = "#152832";
  p.fillRect(0, 0, 512, 128);
  p.strokeStyle = "#80b4ae";
  p.strokeRect(6, 6, 500, 116);
  p.fillStyle = "#d0e0d4";
  p.font = "bold 46px sans-serif";
  p.textAlign = "center";
  p.fillText(text, 256, 81);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(12, 3),
    new THREE.MeshBasicMaterial({ map: tex }),
  );
  mesh.position.set(x, y, z);
  mesh.rotation.y = Math.PI;
  scene.add(mesh);
}
for (let i = 0; i < buildings.length; i += 3) {
  const b = buildings[i];
  sign(
    ["AURA COFFEE", "HARBOR BOOKS", "EASTSIDE DELI", "DRAGON RECORDS"][i % 4],
    b.x,
    4.5,
    b.z + b.d / 2 + 0.1,
  );
  box(14, 0.25, 2.5, mat("#2b5b53"), b.x, 6, b.z + b.d / 2 + 1);
  for (let x = -5; x <= 5; x += 5)
    box(
      3,
      2.8,
      0.15,
      mat("#182e39", { metalness: 0.6, roughness: 0.2 }),
      b.x + x,
      1.7,
      b.z + b.d / 2 + 0.15,
    );
}
// Batch static city geometry by material: far fewer draw calls than thousands of individual meshes.
const batches = new Map();
for (const b of staticBoxes) {
  const key = [
    b.m.color.getHex(),
    b.m.roughness,
    b.m.metalness,
    b.m.emissive.getHex(),
    b.m.map?.uuid || "",
  ].join(":");
  if (!batches.has(key)) batches.set(key, []);
  batches.get(key).push(b);
}
const cube = new THREE.BoxGeometry(1, 1, 1);
for (const batch of batches.values()) {
  const mesh = new THREE.InstancedMesh(cube, batch[0].m, batch.length);
  batch.forEach((b, i) => {
    transform.position.set(b.x, b.y, b.z);
    transform.rotation.set(0, 0, 0);
    transform.scale.set(b.w, b.h, b.d);
    transform.updateMatrix();
    mesh.setMatrixAt(i, transform.matrix);
  });
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
}
staticBoxes.length = 0;
// Chapter One: a directed street-level story, not a collection challenge.
const checkpoint = new THREE.Group();
const markerRing = new THREE.Mesh(
  new THREE.TorusGeometry(4, 0.12, 8, 48),
  mat("#ffd58c", { emissive: "#ffb54b", emissiveIntensity: 1 }),
);
markerRing.rotation.x = Math.PI / 2;
checkpoint.add(markerRing);
const beacon = new THREE.Mesh(
  new THREE.CylinderGeometry(0.08, 0.08, 18, 8),
  new THREE.MeshBasicMaterial({
    color: 0xffd58c,
    transparent: true,
    opacity: 0.35,
  }),
);
beacon.position.y = 9;
checkpoint.add(beacon);
scene.add(checkpoint);
const criminal = new THREE.Group();
const coat = new THREE.Mesh(
  new THREE.CapsuleGeometry(0.5, 1, 4, 8),
  mat("#774538"),
);
coat.position.y = 1.2;
criminal.add(coat);
const head = new THREE.Mesh(
  new THREE.SphereGeometry(0.3, 10, 8),
  mat("#b49279"),
);
head.position.y = 2.1;
criminal.add(head);
const bag = new THREE.Mesh(
  new THREE.BoxGeometry(0.5, 0.6, 0.4),
  mat("#344b4f", { emissive: "#3a927e", emissiveIntensity: 0.3 }),
);
bag.position.set(0.6, 1.1, 0);
criminal.add(bag);
scene.add(criminal);
criminal.visible = false;
const witnesses = [];
for (let i = 0; i < 3; i++) {
  const person = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.35, 0.8, 4, 8),
    mat(["#4c7281", "#806556", "#606a7b"][i]),
  );
  body.position.y = 1;
  person.add(body);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.25, 8, 6),
    mat("#ba947b"),
  );
  head.position.y = 1.7;
  person.add(head);
  person.position.set(113 + i * 3, 0, -122);
  scene.add(person);
  witnesses.push(person);
}
const rooftop = buildings.find((b) => b.x === 156 && b.z === -78);
const transmitter = new THREE.Group();
transmitter.position.set(rooftop.x, rooftop.h + 0.7, rooftop.z);
const mast = new THREE.Mesh(
  new THREE.CylinderGeometry(0.25, 0.6, 6, 10),
  mat("#2a3544"),
);
mast.position.y = 3;
transmitter.add(mast);
const core = new THREE.Mesh(
  new THREE.OctahedronGeometry(1.5),
  mat("#ab62dc", { emissive: "#833bbb", emissiveIntensity: 1.5 }),
);
core.position.y = 5;
transmitter.add(core);
scene.add(transmitter);
const missionTargets = [
  new THREE.Vector3(39, 0, -25),
  new THREE.Vector3(39, 0, -110),
  new THREE.Vector3(39, 0, -110),
  new THREE.Vector3(117, 0, -117),
  new THREE.Vector3(rooftop.x, rooftop.h + 1, rooftop.z),
  new THREE.Vector3(39, 0, 39),
  new THREE.Vector3(39, 0, 39),
];
const missionNames = [
  "Answer the distress call",
  "Investigate the robbery",
  "Catch the fleeing courier",
  "Protect the witnesses",
  "Disable the rooftop transmitter",
  "Reach the confrontation",
  "Defeat the Warden",
];
const routes = [
  new THREE.Vector3(39, 0, -195),
  new THREE.Vector3(117, 0, -195),
  new THREE.Vector3(117, 0, -39),
  new THREE.Vector3(39, 0, -39),
];
let route = 0,
  mission = 0,
  missionWait = 0;
function radio(name, line) {
  $("#comms").style.display = "block";
  $("#speaker").textContent = name;
  $("#dialogue").textContent = line;
  clearTimeout(radio.timer);
  radio.timer = setTimeout(() => ($("#comms").style.display = "none"), 11000);
}
function spawnGuard(position, boss = false) {
  const mesh = new THREE.Group();
  const body = new THREE.Mesh(
    boss
      ? new THREE.IcosahedronGeometry(2.4, 1)
      : new THREE.CapsuleGeometry(0.5, 1, 4, 8),
    mat(boss ? "#4b2549" : "#513340", {
      emissive: boss ? "#7b164f" : "#280f20",
      emissiveIntensity: 0.6,
      metalness: 0.4,
      roughness: 0.4,
    }),
  );
  body.position.y = boss ? 3 : 1.2;
  mesh.add(body);
  const eye = new THREE.Mesh(
    new THREE.TorusGeometry(boss ? 3.2 : 0.6, 0.08, 6, 20),
    mat("#fa667c", { emissive: "#ff3344", emissiveIntensity: 1.8 }),
  );
  eye.position.y = boss ? 3 : 1.6;
  mesh.add(eye);
  mesh.position.copy(position);
  scene.add(mesh);
  enemies.push({ mesh, hp: boss ? 400 : 65, freeze: 0, boss });
}
function advanceMission() {
  mission++;
  missionWait = 0;
  state.hp = Math.min(100, state.hp + 20);
  witnesses.forEach((w) => (w.visible = mission >= 3 && mission <= 4));
  checkpoint.visible = true;
  checkpoint.position.copy(missionTargets[mission] || missionTargets[6]);
  sound(500, 0.3);
  switch (mission) {
    case 1:
      radio(
        "ULTIMATEMAN",
        "I can hear the sirens. These powers are still new—but I can’t stand by.",
      );
      break;
    case 2:
      criminal.position.set(39, 0, -125);
      criminal.visible = true;
      checkpoint.visible = false;
      route = 0;
      radio(
        "MIRA VALE",
        "That courier has the stolen core. Stay on him! Sprint to close the gap—don’t let him reach the bridge.",
      );
      break;
    case 3:
      criminal.visible = false;
      for (const offset of [
        [-5, -5],
        [5, -5],
        [-5, 5],
        [5, 5],
      ])
        spawnGuard(
          missionTargets[3]
            .clone()
            .add(new THREE.Vector3(offset[0], 0, offset[1])),
        );
      radio(
        "COURIER",
        "The Warden paid me. His machines are hunting the witnesses. Please—you have to help them.",
      );
      break;
    case 4:
      radio(
        "MIRA VALE",
        "There’s a control signal from the roof above you. Face that building and use your dragon step. Disable the transmitter with E.",
      );
      break;
    case 5:
      transmitter.visible = false;
      state.aura = 100;
      radio(
        "THE WARDEN",
        "You think that suit makes you a guardian? Meet me on East Ninth. I’ll show you what dragon power really is.",
      );
      break;
    case 6:
      checkpoint.visible = false;
      bossSpawned = true;
      spawnGuard(new THREE.Vector3(39, 0, 24), true);
      radio("ULTIMATEMAN", "You put this city in danger. It ends here.");
      break;
  }
}
function updateStory(dt) {
  missionWait += dt;
  checkpoint.rotation.y += dt;
  core.rotation.y += dt * 1.5;
  if (mission === 0 && state.pos.distanceTo(missionTargets[0]) < 7)
    advanceMission();
  else if (mission === 1 && state.pos.distanceTo(missionTargets[1]) < 14)
    advanceMission();
  else if (mission === 2) {
    const delta = routes[route].clone().sub(criminal.position);
    if (delta.length() < 2) route = (route + 1) % routes.length;
    else {
      delta.normalize();
      criminal.position.addScaledVector(delta, 11 * dt);
      criminal.rotation.y = Math.atan2(-delta.x, -delta.z);
      coat.rotation.z = Math.sin(clock * 14) * 0.1;
    }
    if (state.pos.distanceTo(criminal.position) < 4) {
      toast("COURIER STOPPED");
      advanceMission();
    }
  } else if (
    mission === 3 &&
    enemies.length === 0 &&
    state.pos.distanceTo(missionTargets[3]) < 15
  ) {
    advanceMission();
  } else if (mission === 5 && state.pos.distanceTo(missionTargets[5]) < 9)
    advanceMission();
  else if (mission === 6 && bossDefeated) {
    radio(
      "MIRA VALE",
      "You did it, Elias. The witnesses are safe. But this goes deeper. Get some rest—we have work to do.",
    );
    finish(true);
  }
  const target = mission === 2 ? criminal.position : missionTargets[mission];
  $("#objective").textContent = missionNames[mission];
  $("#progress").textContent =
    (mission === 2 ? "COURIER · " : mission === 4 ? "E TO DISABLE · " : "") +
    Math.round(state.pos.distanceTo(target)) +
    " m · CHAPTER ONE";
}
reset();
let last = performance.now();
function frame(t) {
  const elapsed = Math.max(0, (t - last) / 1000);
  const dt = Math.min(elapsed, 0.1);
  last = t;
  if (active && !paused && !ended) {
    if (cinematic > 0) {
      cinematic = Math.max(0, cinematic - Math.min(elapsed, 1));
      clock += dt;
    } else {
      const steps = Math.max(1, Math.ceil(dt / 0.025));
      for (let i = 0; i < steps && !ended; i++) update(dt / steps);
    }
    for (const vehicle of traffic) {
      vehicle.car.position.z += vehicle.speed * dt;
      if (Math.abs(vehicle.car.position.z) > 365)
        vehicle.car.position.z = -Math.sign(vehicle.car.position.z) * 365;
    }
  }
  document.body.classList.toggle("in-cinematic", active && cinematic > 0);
  const target = state.pos.clone().add(new THREE.Vector3(0, 1.8, 0));
  if (active && cinematic > 0) {
    const progress = 1 - cinematic / 6,
      angle = 0.8 + progress * 3;
    camera.position.set(
      target.x + Math.sin(angle) * (7 - progress * 2),
      target.y + 3 - progress * 1.5,
      target.z + Math.cos(angle) * (7 - progress * 2),
    );
    camera.lookAt(target);
    $("#cinematic").style.display = "block";
  } else {
    const offset = new THREE.Vector3(
      Math.sin(yaw) * Math.cos(pitch) * 7,
      2.5 + Math.sin(pitch) * 7,
      Math.cos(yaw) * Math.cos(pitch) * 7,
    );
    let desired = target.clone().add(offset); // Pull the camera forward when a building blocks its view.
    for (let n = 1; n <= 12; n++) {
      const point = target.clone().lerp(desired, n / 12);
      if (buildings.some((b) => inside(b, point, 0.3) && point.y < b.h + 1)) {
        desired = target.clone().lerp(desired, Math.max(0.12, (n - 1) / 12));
        break;
      }
    }
    camera.position.lerp(desired, 1 - Math.exp(-dt * 10));
    camera.position.x += (Math.random() - 0.5) * shake;
    camera.position.y += (Math.random() - 0.5) * shake;
    camera.lookAt(target);
    $("#cinematic").style.display = "none";
  }
  const fov = keys.has("shift") && active ? 73 : 62;
  camera.fov = THREE.MathUtils.lerp(camera.fov, fov, dt * 4);
  camera.updateProjectionMatrix();
  sun.position.copy(state.pos).add(new THREE.Vector3(-100, 65, 80));
  sun.target.position.copy(state.pos);
  drawRadar();
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
