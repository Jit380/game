import * as THREE from "/vendor/three.module.js";
import { Adventure, REGIONS, QUESTS } from "./core.mjs";
import { createRegion } from "./world.js";
import { createCharacter, animateCharacter } from "./characters.js";
import { createVisuals } from "./visuals.js";
import { EncounterDirector } from "./director.mjs";
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
export function createAdventure({ sound, onExit }) {
  const $ = (s) => document.querySelector(s),
    canvas = $("#adventure-canvas"),
    viewport = $("#adventure-viewport");
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    preserveDrawingBuffer: true,
    powerPreference: "high-performance",
  });
  const scene = new THREE.Scene(),
    camera = new THREE.PerspectiveCamera(55, 1, 0.1, 360);
  const visuals = createVisuals(renderer, scene, camera);
  const director = new EncounterDirector();
  const powerLight = new THREE.PointLight("#b8eaff", 0, 12, 2);
  scene.add(powerLight);
  const qualityOrder = ["cinematic", "balanced", "fast"];
  let cinematicFrame = null,
    cinematicEncounter = null,
    cinematicClock = 0,
    visualTime = 0,
    impact = 0;
  let storage;
  try {
    const saved = localStorage.getItem("anime-brawl-visual-quality-v1");
    visuals.setQuality(
      qualityOrder.includes(saved)
        ? saved
        : matchMedia("(pointer:coarse)").matches
          ? "balanced"
          : "cinematic",
    );
  } catch {
    visuals.setQuality("balanced");
  }
  renderer.setPixelRatio(
    Math.min(
      devicePixelRatio,
      visuals.quality === "cinematic"
        ? 1.6
        : visuals.quality === "balanced"
          ? 1.15
          : 1,
    ),
  );
  try {
    storage = localStorage;
  } catch {}
  let world = null,
    hero = null,
    guide = null,
    assist = null,
    markers = null,
    gate = null,
    hazard = null,
    fragments = new Map(),
    rivals = new Map(),
    echoes = new Map(),
    effects = [],
    overlayDone = null;
  let yaw = 0.38,
    pitch = 0.3,
    distance = 6.8,
    accumulator = 0,
    drag = null,
    pending = {},
    wasLocked = false,
    toastTime = 0,
    musicBeat = 0,
    loadedRegion = null,
    lastWidth = 0,
    lastHeight = 0;
  const keys = new Set(),
    touch = new Set(),
    models = [];
  const controller = {
    active: false,
    state: "exploring",
    game: null,
    renderer,
    scene,
    camera,
    world: null,
    visuals,
    director,
    get cinematicFrame() {
      return cinematicFrame;
    },
  };
  const up = (...codes) => codes.some((c) => keys.has(c));
  function resize() {
    const w = viewport.clientWidth || 1280,
      h = viewport.clientHeight || 720;
    if (w === lastWidth && h === lastHeight) return;
    lastWidth = w;
    lastHeight = h;
    renderer.setSize(w, h, false);
    visuals.resize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  function clean(group) {
    if (!group) return;
    scene.remove(group);
    const geometries = new Set(),
      materials = new Set(),
      textures = new Set();
    group.traverse((o) => {
      if (o.geometry) geometries.add(o.geometry);
      for (const m of Array.isArray(o.material)
        ? o.material
        : o.material
          ? [o.material]
          : []) {
        materials.add(m);
        for (const slot of [
          "map",
          "bumpMap",
          "roughnessMap",
          "normalMap",
          "metalnessMap",
          "emissiveMap",
          "alphaMap",
        ])
          if (m[slot]) textures.add(m[slot]);
      }
    });
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
    textures.forEach((t) => t.dispose());
  }
  function label(text, color = "#e1f8ed") {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 96;
    const x = c.getContext("2d");
    x.fillStyle = "#172b42dd";
    x.beginPath();
    x.roundRect(5, 12, 502, 74, 14);
    x.fill();
    x.font = "700 25px sans-serif";
    x.textAlign = "center";
    x.fillStyle = color;
    if (x.measureText(text).width > 475)
      x.font =
        "700 " +
        Math.max(12, Math.floor((25 * 475) / x.measureText(text).width)) +
        "px sans-serif";
    x.fillText(text, 256, 58);
    const texture = new THREE.CanvasTexture(c);
    texture.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthTest: false,
      }),
    );
    sprite.scale.set(4.8, 0.9, 1);
    return sprite;
  }
  function ring(x, z, r, color) {
    const g = new THREE.Group();
    g.position.set(x, 0.08, z);
    const m = new THREE.Mesh(
      new THREE.TorusGeometry(r, 0.045, 6, 80),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8 }),
    );
    m.rotation.x = Math.PI / 2;
    g.add(m);
    return g;
  }
  function makeMarkers() {
    const g = new THREE.Group();
    for (const q of QUESTS.filter(
      (q) => q.region === controller.game.region.id,
    )) {
      const mark = ring(q.x, q.z, 3.8, q.color);
      mark.userData.quest = q;
      const title = label("INVESTIGATE · " + q.title.toUpperCase());
      title.position.y = 4.2;
      mark.add(title);
      const beacon = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16, 0.7, 18, 10, 1, true),
        new THREE.MeshBasicMaterial({
          color: "#cfabff",
          transparent: true,
          opacity: 0.24,
          side: THREE.DoubleSide,
          depthWrite: false,
        }),
      );
      beacon.position.y = 9;
      mark.add(beacon);
      g.add(mark);
    }
    const camp = ring(0, 30, 2.7, "#ffe3a8");
    camp.userData.camp = true;
    const l = label("RIFT CAMP · E", "#ffecbe");
    l.position.y = 3.4;
    camp.add(l);
    const tent = new THREE.Mesh(
      new THREE.ConeGeometry(1.5, 1.5, 4),
      new THREE.MeshToonMaterial({ color: "#e8ba79" }),
    );
    tent.position.set(0, 0.85, 30);
    tent.rotation.y = Math.PI / 4;
    tent.castShadow = true;
    g.add(tent);
    const fire = new THREE.Mesh(
      new THREE.SphereGeometry(0.26, 8, 6),
      new THREE.MeshBasicMaterial({ color: "#ffc57b" }),
    );
    fire.position.set(1.4, 0.28, 30.5);
    g.add(fire);
    g.add(camp);
    gate = new THREE.Group();
    gate.position.set(0, 2.55, -78);
    const edge = new THREE.Mesh(
      new THREE.TorusGeometry(2.45, 0.12, 10, 80),
      new THREE.MeshBasicMaterial({ color: "#bb9cff" }),
    );
    edge.scale.x = 0.8;
    gate.add(edge);
    const center = new THREE.Mesh(
      new THREE.CircleGeometry(2.3, 48),
      new THREE.MeshBasicMaterial({
        color: "#aa8edb",
        transparent: true,
        opacity: 0.45,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    center.scale.x = 0.8;
    gate.add(center);
    const gl = label("WORLD GATE · E", "#e4d3ff");
    gl.position.y = 3.5;
    gate.add(gl);
    g.add(gate);
    scene.add(g);
    return g;
  }
  function unload() {
    world?.dispose();
    world = null;
    loadedRegion = null;
    for (const m of models.splice(0)) clean(m);
    clean(markers);
    markers = null;
    clean(hazard);
    hazard = null;
    for (const f of fragments.values()) clean(f);
    fragments.clear();
    for (const e of effects) clean(e.mesh);
    effects = [];
    rivals.clear();
    echoes.clear();
  }
  function loadWorld() {
    unload();
    const game = controller.game,
      id = game.region.id;
    world = createRegion(scene, id);
    controller.world = world;
    loadedRegion = id;
    game.setWorld(world);
    visuals.setRegion(id);
    hero = createCharacter(game.hero);
    scene.add(hero);
    models.push(hero);
    guide = createCharacter(game.region.npc.id);
    guide.position.set(game.region.npc.x, 0, game.region.npc.z);
    guide.rotation.y = 0.4;
    scene.add(guide);
    models.push(guide);
    assist = createCharacter(game.hero === "naruto" ? "goku" : "naruto");
    assist.visible = false;
    assist.traverse((o) => {
      if (o.isMesh) {
        o.material.transparent = true;
        o.material.opacity = 0.6;
      }
    });
    scene.add(assist);
    models.push(assist);
    for (const q of QUESTS.filter((q) => q.region === id)) {
      const m = createCharacter(q.id);
      m.position.set(q.x, 0, q.z);
      m.visible = false;
      m.rotation.y = Math.PI;
      scene.add(m);
      models.push(m);
      rivals.set(q.id, m);
    }
    markers = makeMarkers();
    for (const f of game.fragments) {
      if (f.collected) continue;
      const mesh = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.42),
        new THREE.MeshStandardMaterial({
          color: "#b5ffea",
          emissive: "#52c6b7",
          emissiveIntensity: 0.9,
          roughness: 0.3,
        }),
      );
      mesh.position.set(f.x, f.y + 0.8, f.z);
      scene.add(mesh);
      fragments.set(f.id, mesh);
    }
    for (const e of game.enemies || []) {
      if (e.hp <= 0) continue;
      const m = createCharacter(e.hero || game.hero);
      const tinted = new Set();
      m.traverse((o) => {
        if (o.isMesh && !tinted.has(o.material)) {
          tinted.add(o.material);
          o.material.color?.lerp(new THREE.Color("#b895e6"), 0.3);
        }
      });
      scene.add(m);
      models.push(m);
      echoes.set(e.id, m);
    }
    yaw = 0.38;
    pitch = 0.3;
    hero.position.set(game.player.x, game.player.y, game.player.z);
    const target = new THREE.Vector3(
      game.player.x,
      game.player.y + 1.5,
      game.player.z,
    );
    camera.position
      .copy(target)
      .add(new THREE.Vector3(Math.sin(yaw) * 8, 3, Math.cos(yaw) * 8));
    camera.lookAt(target);
    resize();
    visuals.render(0, {
      time: visualTime,
      player: game.player,
      combat: false,
      impact,
    });
  }
  function toast(text) {
    $("#adventure-toast").textContent = text;
    $("#adventure-toast").hidden = false;
    toastTime = 3.5;
  }
  function overlay(caption, title, detail, actions) {
    keys.clear();
    touch.clear();
    pending = {};
    if (document.pointerLockElement === canvas) document.exitPointerLock();
    $("#adventure-overlay").hidden = false;
    $("#adventure-caption").textContent = caption;
    $("#adventure-title").textContent = title;
    $("#adventure-detail").textContent = detail;
    $("#adventure-actions").replaceChildren();
    for (const a of actions) {
      const b = document.createElement("button");
      b.textContent = a.label;
      b.disabled = !!a.disabled;
      b.onclick = a.run;
      $("#adventure-actions").append(b);
    }
  }
  function resume() {
    controller.state = controller.game.currentBoss ? "combat" : "exploring";
    $("#adventure-overlay").hidden = true;
    keys.clear();
    pending = {};
    touch.clear();
    canvas.focus();
    overlayDone = null;
  }
  function dialogue(lines, caption, onDone = resume) {
    controller.state = "dialogue";
    let i = 0;
    const next = () => {
      if (i >= lines.length) {
        overlayDone = null;
        onDone();
        return;
      }
      const row = lines[i++],
        speaker = Array.isArray(row) ? row[0] : "A VOICE IN THE WORLD",
        line = Array.isArray(row) ? row[1] : row;
      overlay(caption, speaker.toUpperCase(), line, [
        { label: i === lines.length ? "CONTINUE →" : "NEXT →", run: next },
      ]);
    };
    overlayDone = next;
    next();
  }
  function clearCinematic() {
    if (director.active) director.skip();
    cinematicFrame = null;
    cinematicEncounter = null;
    $("#adventure-cinematic").hidden = true;
    viewport.classList.remove("cinematic");
  }
  function startCinematic(event) {
    controller.state = "cinematic";
    cinematicEncounter = event;
    cinematicClock = performance.now();
    keys.clear();
    touch.clear();
    pending = {};
    accumulator = 0;
    drag = null;
    controller.game.player.vx = 0;
    controller.game.player.vz = 0;
    controller.game.player.yaw = Math.atan2(
      event.quest.x - controller.game.player.x,
      event.quest.z - controller.game.player.z,
    );
    if (document.pointerLockElement === canvas) document.exitPointerLock();
    $("#adventure-overlay").hidden = true;
    $("#adventure-cinematic").hidden = false;
    viewport.classList.add("cinematic");
    cinematicFrame = director.begin(event.quest.id, {
      player: controller.game.player,
      quest: event.quest,
    });
    renderCinematic();
    sound(110, 0.6, "triangle", 0.022, 260);
  }
  function renderCinematic() {
    const frame = cinematicFrame;
    if (!frame) return;
    for (const [id, value] of [
      ["#adventure-scene-title", frame.title],
      ["#adventure-scene-speaker", frame.speaker],
      ["#adventure-scene-text", frame.text],
    ]) {
      const node = $(id);
      if (node.textContent !== value) node.textContent = value;
    }
    $("#adventure-scene-progress").style.width =
      (frame.time / frame.duration) * 100 + "%";
    for (const cue of frame.cues || []) {
      if (cue.kind === "dust")
        dust(cue.x, cue.y || 0.2, cue.z, cue.color || "#bca987", 18);
      else if (cue.kind === "rift") {
        burst(cue.x, cue.y || 1, cue.z, cue.color || "#d3b4ff", 24);
        impact = 0.35;
      } else {
        const wave = ring(
          cue.x,
          cue.z,
          cue.radius || 2,
          cue.color || "#deb99c",
        );
        scene.add(wave);
        effects.push({ mesh: wave, life: 1.2, maxLife: 1.2, grow: true });
        dust(cue.x, 0.1, cue.z, cue.color || "#cbb69b", 22);
        impact = 0.55;
      }
      sound(
        cue.kind === "rift" ? 340 : 70,
        0.4,
        "sawtooth",
        0.02,
        cue.kind === "rift" ? 1100 : 35,
      );
    }
  }
  function finishCinematic() {
    const encounter = cinematicEncounter;
    clearCinematic();
    if (encounter) dialogue(encounter.lines, encounter.quest.title, resume);
    else resume();
  }
  function updateQualityButton() {
    $("#adventure-quality").textContent =
      "VISUALS · " + visuals.quality.toUpperCase();
    $("#adventure-quality").title =
      "Change graphics quality: Cinematic, Balanced, Fast";
  }
  $("#adventure-quality").onclick = () => {
    visuals.setQuality(
      qualityOrder[
        (qualityOrder.indexOf(visuals.quality) + 1) % qualityOrder.length
      ],
    );
    renderer.setPixelRatio(
      Math.min(
        devicePixelRatio,
        visuals.quality === "cinematic"
          ? 1.6
          : visuals.quality === "balanced"
            ? 1.15
            : 1,
      ),
    );
    lastWidth = 0;
    resize();
    try {
      localStorage.setItem("anime-brawl-visual-quality-v1", visuals.quality);
    } catch {}
    updateQualityButton();
  };
  $("#adventure-skip").onclick = () => {
    if (controller.state === "cinematic") {
      director.skip();
      finishCinematic();
    }
  };
  updateQualityButton();
  function map() {
    if (controller.game.currentBoss)
      return toast("Finish this encounter before traveling.");
    controller.state = "map";
    const game = controller.game;
    overlay(
      "WORLD ATLAS",
      "TWO WORLDS. ONE PROMISE.",
      "Travel freely between unlocked homelands. Namek opens after you resolve Pain’s fracture.",
      [
        ...REGIONS.map((r) => ({
          label:
            r.name +
            (r.id === "namek" && !game.progress.completed.includes("pain")
              ? " · LOCKED"
              : " →"),
          disabled:
            r.id === "namek" && !game.progress.completed.includes("pain"),
          run: () => {
            if (game.travel(r.id)) {
              loadWorld();
              resume();
            }
          },
        })),
        { label: "BACK", run: resume },
      ],
    );
  }
  function camp(
    note = "Rest, recover, and turn fragments into lasting strength.",
  ) {
    controller.state = "camp";
    const g = controller.game;
    g.player.hp = g.maxHP;
    g.player.energy = g.maxEnergy;
    overlay("CAMP · " + g.shards + " FRAGMENTS", "CARRY YOUR COURAGE.", note, [
      ...Object.entries({
        power: "POWER · stronger hits",
        vitality: "VITALITY · more health",
        energy: "ENERGY · more specials",
      }).map(([id, name]) => ({
        label: name + " · " + g.upgrades[id] + "/3",
        disabled: g.upgrades[id] >= 3,
        run: () => {
          const okay = g.purchaseUpgrade(id);
          camp(
            okay
              ? "Upgrade gained. The next fight starts stronger."
              : "Find more fragments. Upgrade prices rise with each level.",
          );
        },
      })),
      { label: "RETURN TO THE WORLD →", run: resume },
    ]);
    g.persist();
  }
  function interact() {
    if (controller.state !== "exploring") return;
    const target = controller.game.nearInteract;
    if (!target)
      return toast(
        "Approach a story disturbance, camp, guide, or world gate. Follow the quest marker.",
      );
    controller.game.interact();
    processEvents();
  }
  function pause() {
    if (!controller.active) return;
    if (controller.state === "pause") return resume();
    if (!["exploring", "combat"].includes(controller.state)) return;
    controller.state = "pause";
    overlay(
      "TIME TO BREATHE",
      "PAUSED",
      "Your chapters, collected fragments and upgrades are saved in this browser.",
      [
        { label: "RESUME →", run: resume },
        { label: "SAVE & EXIT", run: controller.exit },
      ],
    );
  }
  function burst(x, y, z, color, count = 15) {
    for (let i = 0; i < count; i++) {
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(0.025, 0.12, 0.025),
        new THREE.MeshBasicMaterial({
          color: new THREE.Color(color).multiplyScalar(2),
          transparent: true,
          opacity: 1,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      m.position.set(x, y, z);
      scene.add(m);
      effects.push({
        mesh: m,
        life: 0.5,
        maxLife: 0.5,
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 11,
          Math.random() * 6,
          (Math.random() - 0.5) * 11,
        ),
      });
    }
  }
  function dust(x, y, z, color, count = 14) {
    for (let i = 0; i < count; i++) {
      const material = new THREE.MeshStandardMaterial({
        color,
        transparent: true,
        opacity: 0.32,
        roughness: 1,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.18 + Math.random() * 0.2, 1),
        material,
      );
      mesh.position.set(
        x + (Math.random() - 0.5) * 2,
        y,
        z + (Math.random() - 0.5) * 2,
      );
      scene.add(mesh);
      effects.push({
        mesh,
        life: 1.1 + Math.random() * 0.4,
        maxLife: 1.5,
        dust: true,
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 4,
          Math.random() * 2,
          (Math.random() - 0.5) * 4,
        ),
      });
    }
  }
  function beam(event) {
    const p = controller.game.player,
      target = controller.game.currentBoss;
    const a = new THREE.Vector3(p.x, p.y + 1.35, p.z),
      b =
        event.hit && target
          ? new THREE.Vector3(target.x, target.y + 1.3, target.z)
          : a
              .clone()
              .add(
                new THREE.Vector3(
                  Math.sin(event.yaw) * 18,
                  0,
                  Math.cos(event.yaw) * 18,
                ),
              );
    const direction = b.clone().sub(a),
      length = direction.length();
    direction.normalize();
    const mesh = new THREE.Group(),
      glow = (color) =>
        new THREE.MeshBasicMaterial({
          color: new THREE.Color(color).multiplyScalar(2.7),
          transparent: true,
          opacity: 0.65,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        });
    if (controller.game.hero === "naruto") {
      mesh.position.copy(a).addScaledVector(direction, 0.9);
      mesh.add(
        new THREE.Mesh(new THREE.SphereGeometry(0.42, 20, 14), glow("#a0e7ff")),
      );
      for (let i = 0; i < 3; i++) {
        const spiral = new THREE.Mesh(
          new THREE.TorusGeometry(0.55 + i * 0.08, 0.018, 6, 32),
          glow("#d5f8ff"),
        );
        spiral.rotation.set(i * 0.9, i * 1.3, i * 0.55);
        mesh.add(spiral);
      }
      const trail = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.25, Math.max(0.2, length), 12),
        glow("#88bfff"),
      );
      trail.position.copy(direction).multiplyScalar(length / 2);
      trail.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        direction,
      );
      mesh.add(trail);
    } else {
      mesh.position.copy(a).add(b).multiplyScalar(0.5);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
      mesh.add(
        new THREE.Mesh(
          new THREE.CylinderGeometry(0.17, 0.26, Math.max(0.2, length), 16),
          glow("#e6faff"),
        ),
      );
      mesh.add(
        new THREE.Mesh(
          new THREE.CylinderGeometry(
            0.32,
            0.48,
            Math.max(0.2, length),
            16,
            1,
            true,
          ),
          glow("#61bcff"),
        ),
      );
      for (const y of [-length / 2, length / 2]) {
        const flare = new THREE.Mesh(
          new THREE.SphereGeometry(0.55, 16, 12),
          glow("#abebff"),
        );
        flare.position.y = y;
        mesh.add(flare);
      }
    }
    scene.add(mesh);
    effects.push({
      mesh,
      life: 0.4,
      maxLife: 0.4,
      spin: controller.game.hero === "naruto",
    });
  }
  function processEvents() {
    const g = controller.game;
    for (const e of g.events.splice(0)) {
      if (e.type === "boss-start") startCinematic(e);
      else if (e.type === "dialogue") dialogue(e.lines, e.name.toUpperCase());
      else if (e.type === "camp") camp();
      else if (e.type === "travel") {
        if (loadedRegion !== g.region.id) loadWorld();
        toast("ARRIVED · " + g.region.name.toUpperCase());
      } else if (e.type === "quest-complete") {
        sound(650, 0.3, "triangle", 0.03, 1100);
        dialogue(
          e.lines,
          "FRACTURE HEALED · +" + e.reward + " FRAGMENTS",
          () => {
            if (g.ending) {
              controller.state = "ending";
              overlay(
                "WORLDS COLLIDE · COMPLETE",
                "COURAGE TRAVELS.",
                "The village is safe. Namek is free. Two worlds found their way home because two heroes refused to give up.",
                [
                  { label: "EXPLORE THE HEALED WORLDS →", run: resume },
                  { label: "SAVE & EXIT", run: controller.exit },
                ],
              );
            } else {
              toast("Chapter complete. Follow the next quest marker.");
              resume();
            }
          },
        );
      } else if (e.type === "defeat") {
        controller.state = "defeated";
        overlay("A SETBACK. NOT THE END.", "GET BACK UP.", e.text, [
          {
            label: "RETURN TO CAMP →",
            run: () => {
              g.retry();
              resume();
            },
          },
        ]);
        sound(100, 0.3, "sawtooth", 0.03, 30);
      } else if (e.type === "message") toast(e.text);
      else if (e.type === "fragment") {
        toast("RIFT FRAGMENT +1");
        sound(700, 0.12, "triangle", 0.02, 1100);
        const f = fragments.get(e.id);
        if (f) {
          clean(f);
          fragments.delete(e.id);
        }
      } else if (e.type === "attack") {
        burst(
          e.x + Math.sin(e.yaw) * 1.8,
          e.y + 1.2,
          e.z + Math.cos(e.yaw) * 1.8,
          "#fff2c4",
          7,
        );
        sound(250, 0.08, "triangle", 0.022, 80);
      } else if (e.type === "special") {
        beam(e);
        burst(g.player.x, g.player.y + 1.3, g.player.z, "#82dbff", 14);
        sound(300, 0.25, "sawtooth", 0.022, 1000);
      } else if (e.type === "boss-hit" || e.type === "enemy-hit") {
        burst(
          e.x ?? g.currentBoss?.x ?? g.player.x,
          (e.y ?? 0) + 1.2,
          e.z ?? g.currentBoss?.z ?? g.player.z,
          "#fff2ae",
        );
        impact = Math.max(impact, 0.4);
        sound(140, 0.1, "sawtooth", 0.03, 45);
      } else if (e.type === "boss-phase") {
        toast(e.text || "PHASE TWO · WATCH THE DANGER ZONES");
        sound(160, 0.35, "sawtooth", 0.03, 50);
      } else if (e.type === "telegraph" || e.type === "enemy-telegraph")
        sound(420, 0.18, "triangle", 0.02, 150);
      else if (e.type === "boss-strike" || e.type === "enemy-strike") {
        impact = Math.max(impact, 0.65);
        const m = ring(e.x, e.z, e.radius, e.color || "#ff8877");
        scene.add(m);
        effects.push({ mesh: m, life: 0.6, maxLife: 0.6, grow: true });
        burst(e.x, 0.2, e.z, e.color || "#ff937f", 20);
      } else if (e.type === "player-hit") {
        impact = 0.8;
        burst(g.player.x, g.player.y + 1, g.player.z, "#ff8989", 10);
        sound(120, 0.13, "sawtooth", 0.025, 45);
      } else if (e.type === "jump" || e.type === "wall-jump")
        sound(430, 0.1, "triangle", 0.018, 750);
      else if (e.type === "riftbreak" || e.type === "rift") {
        toast("RIFTBREAK · COURAGE TRAVELS");
        sound(200, 0.5, "sawtooth", 0.035, 1200);
        impact = 1;
        assist.userData.life = 0.8;
        burst(g.player.x, g.player.y + 1.2, g.player.z, "#a2ffe1", 30);
      } else if (e.type === "enemy-defeated") {
        const mesh = echoes.get(e.id);
        if (mesh) {
          clean(mesh);
          echoes.delete(e.id);
          const index = models.indexOf(mesh);
          if (index >= 0) models.splice(index, 1);
        }
        toast("RIFT ECHO DISPERSED · +1 FRAGMENT");
      }
    }
  }
  function controls() {
    const right =
      (up("KeyD", "ArrowRight") || touch.has("right") ? 1 : 0) -
      (up("KeyA", "ArrowLeft") || touch.has("left") ? 1 : 0);
    const forward =
      (up("KeyW", "ArrowUp") || touch.has("forward") ? 1 : 0) -
      (up("KeyS", "ArrowDown") || touch.has("backward") ? 1 : 0);
    const len = Math.max(1, Math.hypot(right, forward));
    return {
      x: (right * Math.cos(yaw) - forward * Math.sin(yaw)) / len,
      z: (-right * Math.sin(yaw) - forward * Math.cos(yaw)) / len,
      jump: up("Space") || touch.has("jump"),
      up: up("KeyW", "ArrowUp") || touch.has("forward"),
      dash: up("ShiftLeft", "ShiftRight"),
      sprint: up("ShiftLeft", "ShiftRight"),
      attack: up("KeyJ") || touch.has("attack"),
      special: up("KeyK") || touch.has("special"),
      guard: up("KeyL") || touch.has("guard"),
      rift: up("KeyR") || touch.has("rift"),
    };
  }
  function updateHUD() {
    const g = controller.game,
      p = g.player,
      t = g.target,
      near = g.nearInteract;
    $("#adventure-location").textContent =
      g.region.name.toUpperCase() + " · 3D STORY";
    $("#adventure-hero").textContent = g.hero.toUpperCase();
    $("#adventure-hp").style.width =
      clamp((p.hp / g.maxHP) * 100, 0, 100) + "%";
    $("#adventure-energy").style.width =
      clamp((p.energy / g.maxEnergy) * 100, 0, 100) + "%";
    $("#adventure-fragments").textContent =
      g.shards + " FRAGMENTS · " + g.progress.completed.length + "/4 CHAPTERS";
    $("#adventure-objective").textContent = t.text;
    $("#adventure-chapter").textContent = g.nextQuest
      ? g.nextQuest.title
      : "THE WORLDS ARE SAFE";
    $("#adventure-hint").textContent = near
      ? "E · " + near.text
      : g.currentBoss
        ? "J ATTACK · K SPECIAL · L GUARD · WATCH RED ZONES"
        : Math.round(Math.hypot(t.x - p.x, t.z - p.z)) +
          " m · Follow the violet beacon";
    const bearing = yaw + Math.PI - Math.atan2(t.x - p.x, t.z - p.z);
    const arrow = ["↑", "↗", "→", "↘", "↓", "↙", "←", "↖"][
      ((Math.round(bearing / (Math.PI / 4)) % 8) + 8) % 8
    ];
    $("#adventure-compass").textContent =
      arrow + " QUEST · " + Math.round(Math.hypot(t.x - p.x, t.z - p.z)) + " m";
    $("#adventure-rift").textContent =
      g.resonance >= 100
        ? "R · RIFTBREAK READY"
        : "RIFTBREAK " + Math.floor(g.resonance || 0) + "%";
    $("#adventure-boss").hidden = !g.currentBoss;
    $("#adventure-map").disabled = !!g.currentBoss;
    if (g.currentBoss) {
      const b = g.currentBoss;
      $("#adventure-boss-name").textContent = b.name.toUpperCase();
      $("#adventure-boss-phase").textContent =
        "PHASE " + b.phase + " · RIVAL ENCOUNTER";
      $("#adventure-boss-hp").style.width = (b.hp / b.maxHp) * 100 + "%";
      $("#adventure-warning").textContent = b.telegraph
        ? "GET CLEAR · " + b.ability
        : b.vulnerable > 0
          ? "OPENING · STRIKE NOW"
          : "J COMBO · K SPECIAL · L GUARD";
    }
    if (!g.saveAvailable && toastTime <= 0)
      toast("Browser saves are unavailable. Progress lasts for this session.");
  }
  const tempTarget = new THREE.Vector3(),
    ideal = new THREE.Vector3(),
    direction = new THREE.Vector3(),
    hit = new THREE.Vector3(),
    box = new THREE.Box3();
  const ray = new THREE.Ray();
  function draw(dt) {
    const g = controller.game,
      p = g.player;
    visualTime += dt;
    impact *= Math.exp(-6 * dt);
    world?.update(visualTime);
    hero.position.set(p.x, p.y, p.z);
    hero.rotation.y = p.yaw;
    animateCharacter(hero, {
      time: visualTime,
      moving: Math.hypot(p.vx, p.vz) > 0.2,
      speed: Math.hypot(p.vx, p.vz) / 8,
      grounded: p.grounded,
      attack: p.specialTimer > 0 ? "special" : p.attackTimer > 0,
      guard: p.action === "guard",
      hurt: p.hurtTimer > 0,
    });
    if (guide) animateCharacter(guide, { time: visualTime, grounded: true });
    for (const q of QUESTS.filter((q) => q.region === g.region.id)) {
      const mesh = rivals.get(q.id),
        b = g.currentBoss?.id === q.id ? g.currentBoss : q;
      mesh.visible = g.currentBoss?.id === q.id;
      mesh.position.set(b.x, b.y || 0, b.z);
      mesh.rotation.y = b.yaw ?? Math.atan2(p.x - b.x, p.z - b.z);
      animateCharacter(mesh, {
        time: visualTime,
        moving: b.action === "run",
        grounded: true,
        attack: b.attackTimer > 0,
        guard: b.action === "charge",
        hurt: b.flash > 0,
      });
    }
    for (const enemy of g.enemies || []) {
      const m = echoes.get(enemy.id);
      if (!m) continue;
      m.visible = enemy.hp > 0;
      m.position.set(enemy.x, enemy.y || 0, enemy.z);
      m.rotation.y = enemy.yaw || 0;
      animateCharacter(m, {
        time: visualTime,
        moving: enemy.action === "run",
        grounded: true,
        attack: enemy.action === "attack",
        guard: enemy.action === "charge",
      });
    }
    for (const [id, mesh] of fragments) {
      const f = g.fragments.find((f) => f.id === id);
      if (f?.collected) {
        clean(mesh);
        fragments.delete(id);
        continue;
      }
      mesh.rotation.y = g.time * 1.6;
      mesh.rotation.z = Math.sin(g.time) * 0.15;
      mesh.position.y =
        (f?.y || 0.8) + 0.5 + Math.sin(g.time * 2 + mesh.position.x) * 0.15;
    }
    for (const mark of markers?.children || []) {
      if (mark.userData.camp)
        mark.children[1].visible = Math.hypot(p.x, p.z - 30) > 8;
      if (mark.userData.quest) {
        const q = mark.userData.quest,
          done = g.progress.completed.includes(q.id),
          next = g.nextQuest?.id === q.id;
        mark.children[0].material.color.set(
          done ? "#8ef4c0" : next ? q.color : "#697983",
        );
        mark.visible = next || done;
        mark.children[1].visible =
          next && !g.currentBoss && Math.hypot(p.x - q.x, p.z - q.z) < 55;
        mark.children[2].visible = next && !g.currentBoss;
      }
    }
    if (gate) gate.children[0].rotation.z = g.time * 0.2;
    clean(hazard);
    hazard = null;
    const warnings = [g.currentBoss, ...(g.enemies || [])].filter(
      (e) => e?.telegraph,
    );
    if (warnings.length) {
      hazard = new THREE.Group();
      for (const enemy of warnings) {
        const w = enemy.telegraph,
          area = ring(w.x, w.z, w.radius, "#ff817e");
        const disc = new THREE.Mesh(
          new THREE.CircleGeometry(w.radius, 64),
          new THREE.MeshBasicMaterial({
            color: "#ff6f70",
            transparent: true,
            opacity: 0.11 + 0.13 * (1 - w.time / w.total),
            side: THREE.DoubleSide,
            depthWrite: false,
          }),
        );
        disc.rotation.x = -Math.PI / 2;
        area.add(disc);
        hazard.add(area);
      }
      scene.add(hazard);
    }
    if (assist) {
      assist.userData.life = Math.max(0, (assist.userData.life || 0) - dt);
      assist.visible = assist.userData.life > 0;
      assist.position.set(
        p.x - Math.cos(p.yaw) * 1.5,
        p.y,
        p.z + Math.sin(p.yaw) * 1.5,
      );
      assist.rotation.y = p.yaw;
      animateCharacter(assist, {
        time: visualTime,
        attack: true,
        grounded: p.grounded,
      });
    }
    for (const e of effects) {
      e.life -= dt;
      if (e.velocity) {
        e.velocity.y -= (e.dust ? 1.5 : 12) * dt;
        e.mesh.position.addScaledVector(e.velocity, dt);
      }
      if (e.grow) e.mesh.scale.setScalar(1 + (e.maxLife - e.life) * 4);
      if (e.spin) {
        for (let i = 1; i < 4; i++)
          e.mesh.children[i].rotation.z += dt * (5 + i);
      }
      if (!e.mesh.material)
        e.mesh.traverse((o) => {
          if (o.material?.transparent)
            o.material.opacity = Math.max(0, e.life / e.maxLife) * 0.65;
        });
      if (e.mesh.material?.transparent)
        e.mesh.material.opacity =
          Math.max(0, e.life / e.maxLife) * (e.dust ? 0.32 : 1);
      if (e.dust) e.mesh.scale.multiplyScalar(1 + dt * 0.65);
      e.mesh.scale.multiplyScalar(e.velocity ? 0.985 : 1);
    }
    effects = effects.filter((e) => {
      if (e.life > 0) return true;
      clean(e.mesh);
      return false;
    });
    tempTarget.set(p.x, p.y + 1.5, p.z);
    direction.set(
      Math.sin(yaw) * Math.cos(pitch),
      Math.sin(pitch),
      Math.cos(yaw) * Math.cos(pitch),
    );
    let d = distance;
    ray.set(tempTarget, direction);
    for (const a of world?.colliders || []) {
      box.min.set(a.x - a.w / 2, 0, a.z - a.d / 2);
      box.max.set(a.x + a.w / 2, a.h, a.z + a.d / 2);
      if (ray.intersectBox(box, hit)) {
        const dist = hit.distanceTo(tempTarget);
        if (dist > 0.2 && dist < d) d = Math.max(0.55, dist - 0.35);
      }
    }
    ideal.copy(tempTarget).addScaledVector(direction, d);
    ideal.x += Math.cos(yaw) * 0.5;
    ideal.z -= Math.sin(yaw) * 0.5;
    camera.position.lerp(ideal, 1 - Math.exp(-10 * dt));
    // Interpolation must also stay in front of nearby walls while turning.
    direction.copy(camera.position).sub(tempTarget);
    d = direction.length();
    direction.normalize();
    ray.set(tempTarget, direction);
    for (const a of world?.colliders || []) {
      box.min.set(a.x - a.w / 2, 0, a.z - a.d / 2);
      box.max.set(a.x + a.w / 2, a.h, a.z + a.d / 2);
      if (ray.intersectBox(box, hit)) {
        const dist = hit.distanceTo(tempTarget);
        if (dist > 0.2 && dist < d) d = Math.max(0.55, dist - 0.35);
      }
    }
    camera.position.copy(tempTarget).addScaledVector(direction, d);
    camera.lookAt(tempTarget);
    if (controller.state === "cinematic" && cinematicFrame) {
      const frame = cinematicFrame,
        actor = rivals.get(director.id);
      if (actor) {
        actor.visible = frame.rival.visible;
        actor.position.set(...frame.rival.position);
        actor.rotation.y = frame.rival.yaw;
        animateCharacter(actor, {
          time: visualTime,
          grounded: frame.rival.position[1] < 0.2,
          moving: frame.rival.pose === "run",
          attack: ["attack", "special"].includes(frame.rival.pose)
            ? "special"
            : false,
          guard: frame.rival.pose === "charge",
        });
      }
      camera.position.set(...frame.camera.position);
      camera.lookAt(new THREE.Vector3(...frame.camera.target));
    }
    powerLight.position.set(
      p.x + Math.sin(p.yaw) * 0.7,
      p.y + 1.5,
      p.z + Math.cos(p.yaw) * 0.7,
    );
    powerLight.intensity = Math.min(
      16,
      (p.specialTimer > 0 ? 12 : 0) + impact * 5,
    );
    const speed = Math.hypot(p.vx, p.vz),
      fov =
        controller.state === "cinematic"
          ? 46
          : 55 + Math.min(7, speed * 0.45) + (g.currentBoss ? 3 : 0);
    if (Math.abs(camera.fov - fov) > 0.015) {
      camera.fov += (fov - camera.fov) * (1 - Math.exp(-5 * dt));
      camera.updateProjectionMatrix();
    }
    if (impact > 0.05 && controller.state !== "cinematic")
      camera.position.y += Math.sin(visualTime * 48) * impact * 0.035;
    visuals.render(dt, {
      time: visualTime,
      player: p,
      combat: !!g.currentBoss,
      cinematic: controller.state === "cinematic",
      impact,
    });
  }
  controller.start = () => {
    controller.game = new Adventure(storage);
    controller.active = true;
    controller.state = "exploring";
    clearCinematic();
    $("#adventure").hidden = false;
    $("#adventure-overlay").hidden = true;
    keys.clear();
    pending = {};
    touch.clear();
    accumulator = 0;
    loadWorld();
    if (!controller.game.progress.introSeen) {
      dialogue(
        [
          [
            "Naruto",
            "The sky split above the village. Through the fracture, I saw a green sun and someone fighting alone.",
          ],
          [
            "Goku",
            "I felt it too. Two worlds are being pulled together. We have to find what is holding them.",
          ],
          [
            "Naruto",
            "Then we start here. Find Sasuke. Gather fragments. Bring everyone home.",
          ],
        ],
        "PROLOGUE · THE SKY BETWEEN US",
        () => {
          controller.game.markIntroSeen();
          resume();
        },
      );
    } else resume();
    updateHUD();
  };
  controller.exit = () => {
    controller.game?.persist();
    controller.active = false;
    clearCinematic();
    keys.clear();
    pending = {};
    touch.clear();
    if (document.pointerLockElement === canvas) document.exitPointerLock();
    $("#adventure").hidden = true;
    $("#adventure-overlay").hidden = true;
    onExit();
  };
  controller.tick = (dt) => {
    if (!controller.active) return;
    resize();
    if (["exploring", "combat"].includes(controller.state)) {
      accumulator = Math.min(0.15, accumulator + dt);
      while (accumulator >= 1 / 60) {
        accumulator -= 1 / 60;
        controller.game.update(1 / 60, { ...controls(), ...pending });
        pending = {};
        if (controller.game.events.some((e) => e.type === "boss-start")) {
          accumulator = 0;
          break;
        }
      }
      processEvents();
      if (
        controller.game.state === "defeated" &&
        controller.state !== "defeated"
      ) {
        controller.state = "defeated";
        overlay(
          "THE CAMP IS STILL THERE",
          "GET BACK UP.",
          "Your progress is safe. Return to camp and try again.",
          [
            {
              label: "RETURN TO CAMP →",
              run: () => {
                controller.game.retry();
                resume();
              },
            },
          ],
        );
      }
    } else accumulator = 0;
    if (controller.state === "cinematic") {
      const now = performance.now();
      cinematicFrame = director.update((now - cinematicClock) / 1000);
      cinematicClock = now;
      renderCinematic();
      if (cinematicFrame.done) finishCinematic();
    }
    toastTime = Math.max(0, toastTime - dt);
    if (toastTime <= 0) $("#adventure-toast").hidden = true;
    draw(dt);
    updateHUD();
  };
  $("#adventure-exit").onclick = controller.exit;
  $("#adventure-map").onclick = map;
  $("#adventure-pause").onclick = pause;
  const lock = () => {
    if (
      !controller.active ||
      !["exploring", "combat"].includes(controller.state)
    )
      return;
    try {
      const request = canvas.requestPointerLock?.();
      request?.catch?.(() => toast("Drag on the world to rotate the camera."));
    } catch {
      toast("Drag on the world to rotate the camera.");
    }
  };
  $("#adventure-look").onclick = lock;
  canvas.tabIndex = 0;
  canvas.oncontextmenu = (e) => e.preventDefault();
  canvas.onpointerdown = (e) => {
    if (
      !controller.active ||
      !["exploring", "combat"].includes(controller.state)
    )
      return;
    canvas.focus();
    drag = { x: e.clientX, y: e.clientY, id: e.pointerId, moved: false };
    canvas.setPointerCapture(e.pointerId);
  };
  canvas.onpointermove = (e) => {
    if (!controller.active) return;
    if (document.pointerLockElement === canvas) {
      yaw -= e.movementX * 0.0035;
      pitch = clamp(pitch + e.movementY * 0.003, 0.08, 0.95);
    } else if (drag && drag.id === e.pointerId) {
      const dx = e.clientX - drag.x,
        dy = e.clientY - drag.y;
      drag.moved = drag.moved || Math.abs(dx) + Math.abs(dy) > 3;
      yaw -= dx * 0.005;
      pitch = clamp(pitch + dy * 0.004, 0.08, 0.95);
      drag.x = e.clientX;
      drag.y = e.clientY;
    }
  };
  canvas.onpointerup = (e) => {
    if (drag && !drag.moved && e.pointerType === "mouse") pending.attack = true;
    drag = null;
  };
  canvas.onpointercancel = () => (drag = null);
  canvas.addEventListener(
    "wheel",
    (e) => {
      if (!controller.active) return;
      e.preventDefault();
      distance = clamp(distance + e.deltaY * 0.01, 4, 15);
    },
    { passive: false },
  );
  document.addEventListener("pointerlockchange", () => {
    const locked = document.pointerLockElement === canvas;
    if (
      wasLocked &&
      !locked &&
      controller.active &&
      ["exploring", "combat"].includes(controller.state)
    )
      pause();
    wasLocked = locked;
  });
  addEventListener("keydown", (e) => {
    if (!controller.active) return;
    if (
      [
        "KeyW",
        "KeyA",
        "KeyS",
        "KeyD",
        "Space",
        "KeyJ",
        "KeyK",
        "KeyL",
        "KeyE",
        "KeyR",
        "KeyM",
        "ShiftLeft",
        "ShiftRight",
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
        "Escape",
        "Enter",
      ].includes(e.code)
    )
      e.preventDefault();
    keys.add(e.code);
    if (e.repeat) return;
    const action = {
      Space: "jump",
      KeyJ: "attack",
      KeyK: "special",
      KeyR: "rift",
      ShiftLeft: "dash",
      ShiftRight: "dash",
    }[e.code];
    if (action) pending[action] = true;
    if (e.code === "KeyE" && controller.state === "exploring") interact();
    if (e.code === "KeyM" && controller.state === "exploring") map();
    if (
      controller.state === "cinematic" &&
      ["Escape", "Enter"].includes(e.code)
    ) {
      director.skip();
      finishCinematic();
      return;
    }
    if (e.code === "Escape") pause();
    if (e.code === "Enter" && controller.state === "dialogue") overlayDone?.();
  });
  addEventListener("keyup", (e) => keys.delete(e.code));
  addEventListener("blur", () => {
    keys.clear();
    pending = {};
    touch.clear();
    if (controller.active && ["exploring", "combat"].includes(controller.state))
      pause();
  });
  addEventListener("resize", resize);
  for (const b of document.querySelectorAll("[data-adventure-touch]")) {
    b.onpointerdown = (e) => {
      e.preventDefault();
      b.setPointerCapture(e.pointerId);
      const id = b.dataset.adventureTouch;
      if (id === "interact") interact();
      else {
        touch.add(id);
        if (["jump", "attack", "special", "rift"].includes(id))
          pending[id] = true;
      }
    };
    b.onpointerup = b.onpointercancel = () =>
      touch.delete(b.dataset.adventureTouch);
  }
  setInterval(() => {
    if (
      !controller.active ||
      !["exploring", "combat", "dialogue"].includes(controller.state)
    )
      return;
    musicBeat++;
    const battle = !!controller.game.currentBoss;
    if (!battle && musicBeat % 3) return;
    const n = (
      battle
        ? [147, 220, 294, 349, 330, 294, 220, 196]
        : [196, 247, 294, 392, 330, 294, 247, 220]
    )[(battle ? musicBeat : Math.floor(musicBeat / 3)) % 8];
    sound(n, battle ? 0.14 : 0.45, "triangle", 0.008, n);
  }, 190);
  return controller;
}
