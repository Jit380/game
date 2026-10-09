const { test } = require("node:test");
const assert = require("node:assert/strict");
const storage = () => {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) || null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
};
const step = (a, frames, input = {}) => {
  for (let i = 0; i < frames; i++) a.update(1 / 60, input);
};

test("3D movement is frame-rate stable, normalized and blocked by solid buildings", async () => {
  const { Adventure } = await import("../adventure/core.mjs");
  const a = new Adventure(storage()),
    b = new Adventure(storage());
  a.setWorld({
    spawn: { x: 0, y: 0, z: 0 },
    colliders: [{ x: 8, z: 0, w: 4, d: 4, h: 4 }],
  });
  step(a, 120, { x: 1, z: 0 });
  assert.ok(a.player.x <= 5.53 && a.player.x >= 5.5);
  assert.equal(a.player.y, 0);
  assert.equal(a.player.yaw, Math.PI / 2);
  b.setWorld({ spawn: { x: 0, y: 0, z: 0 } });
  step(b, 60, { x: 1, z: 1 });
  assert.ok(Math.abs(Math.hypot(b.player.x, b.player.z) - 8) < 0.001);
  assert.equal(b.player.grounded, true);
  const c = new Adventure(storage());
  c.setWorld({ spawn: { x: 0, y: 0, z: 0 } });
  for (let i = 0; i < 120; i++) c.update(1 / 120, { x: 1, z: 1 });
  assert.ok(Math.abs(c.player.x - b.player.x) < 0.0001);
  assert.ok(Math.abs(c.player.z - b.player.z) < 0.0001);
});

test("3D hero double-jumps, cannot triple-jump, and lands on a walkable roof", async () => {
  const { Adventure } = await import("../adventure/core.mjs");
  const a = new Adventure(storage());
  a.setWorld({
    spawn: { x: 0, y: 0, z: 0 },
    platforms: [{ x: 4, z: 0, w: 4, d: 4, h: 3 }],
  });
  step(a, 1, { jump: true });
  step(a, 25, { x: 1 });
  step(a, 1, { x: 1, jump: true });
  assert.equal(a.player.jumps, 2);
  step(a, 1);
  const before = a.player.vy;
  step(a, 1, { jump: true });
  assert.ok(a.player.vy < before);
  step(a, 90);
  assert.equal(a.player.y, 3);
  assert.equal(a.player.grounded, true);
  assert.equal(a.player.jumps, 0);
});

test("3D boss activation requires the current chapter and physical proximity", async () => {
  const { Adventure, QUESTS } = await import("../adventure/core.mjs");
  const a = new Adventure(storage());
  assert.equal(a.startBoss("sasuke"), false);
  assert.equal(a.travel("namek"), false);
  assert.equal(a.completeQuest("pain"), false);
  Object.assign(a.player, { x: 30, y: 0, z: -16 });
  assert.equal(a.nearInteract.id, "sasuke");
  assert.equal(a.interact().id, "sasuke");
  assert.equal(a.currentBoss.maxHp, QUESTS[0].hp);
  assert.equal(a.state, "combat");
});

test("boss attack circles lock their position, can be dodged, and guard mitigates damage", async () => {
  const { Adventure } = await import("../adventure/core.mjs");
  const a = new Adventure(storage());
  Object.assign(a.player, { x: 30, y: 0, z: -17 });
  a.startBoss("sasuke");
  a.currentBoss.cooldown = 0;
  a.invincible = 0;
  step(a, 1);
  assert.ok(a.currentBoss.telegraph);
  const marker = { ...a.currentBoss.telegraph };
  step(a, 30, { x: 1, dash: true });
  assert.equal(a.currentBoss.telegraph.x, marker.x);
  step(a, 40);
  assert.equal(a.player.hp, 100);
  assert.ok(a.events.some((e) => e.type === "evade"));
  a.currentBoss.telegraph = {
    kind: "slash",
    x: a.player.x,
    z: a.player.z,
    radius: 5,
    time: 0.01,
    total: 1,
    damage: 20,
  };
  a.invincible = 0;
  const energy = a.player.energy;
  step(a, 1, { guard: true });
  assert.equal(a.player.hp, 97);
  assert.ok(a.player.energy < energy - 11);
});

test("melee and ranged specials respect range, spend energy, and enter boss phase two", async () => {
  const { Adventure } = await import("../adventure/core.mjs");
  const a = new Adventure(storage());
  Object.assign(a.player, { x: 30, y: 0, z: -16 });
  a.startBoss("sasuke");
  const max = a.currentBoss.maxHp;
  a.attack(false);
  assert.equal(a.currentBoss.hp, max - 6);
  Object.assign(a.player, { x: 30, z: -5 });
  a.attackCooldown = 0;
  a.attack(false);
  assert.equal(a.currentBoss.hp, max - 6);
  const energy = a.player.energy;
  a.attack(true);
  assert.equal(a.currentBoss.hp, max - 29);
  assert.equal(a.player.energy, energy - 25);
  assert.equal(a.attack(true), false, "special cannot bypass its cooldown");
  assert.equal(a.currentBoss.hp, max - 29);
  a.specialCooldown = 0;
  a.attack(true);
  assert.equal(a.currentBoss.hp, max - 52);
  a.currentBoss.hp = max * 0.49;
  step(a, 1);
  assert.equal(a.currentBoss.phase, 2);
  assert.ok(a.events.some((e) => e.type === "boss-phase"));
});

test("fragments, upgrades, ordered bosses and the ending persist independently of the 2D story", async () => {
  const { Adventure } = await import("../adventure/core.mjs");
  const s = storage(),
    a = new Adventure(s);
  assert.equal(a.collect("leaf:0"), true);
  assert.equal(a.collect("leaf:0"), false);
  a.collect("leaf:1");
  a.collect("leaf:2");
  Object.assign(a.player, { x: 0, z: 30 });
  assert.equal(a.purchaseUpgrade("vitality"), true);
  assert.equal(a.player.hp, 120);
  assert.equal(a.shards, 0);
  for (const id of ["sasuke", "pain"]) assert.equal(a.completeQuest(id), true);
  assert.equal(a.travel("namek"), true);
  for (const id of ["frieza", "broly"]) assert.equal(a.completeQuest(id), true);
  assert.equal(a.ending, true);
  assert.equal(a.state, "ending");
  const loaded = new Adventure(s);
  assert.equal(loaded.region.id, "namek");
  assert.equal(loaded.ending, true);
  assert.equal(loaded.player.hp, 120);
  assert.equal(loaded.upgrades.vitality, 1);
  assert.equal(loaded.shards, 20);
});

test("defeat pauses combat and retry restores the camp without erasing progression", async () => {
  const { Adventure } = await import("../adventure/core.mjs");
  const a = new Adventure(storage());
  a.completeQuest("sasuke");
  Object.assign(a.player, { x: -48, z: -44 });
  a.startBoss("pain");
  a.invincible = 0;
  a.damagePlayer(200);
  assert.equal(a.state, "defeated");
  const x = a.player.x;
  step(a, 30, { x: 1 });
  assert.equal(a.player.x, x);
  a.retry();
  assert.equal(a.currentBoss, null);
  assert.equal(a.player.hp, 100);
  assert.equal(a.player.x, 0);
  assert.equal(a.nextQuest.id, "pain");
  assert.equal(a.shards, 5);
});

test("invalid saves reject skipped bosses and unavailable storage remains playable", async () => {
  const { Adventure, SAVE_KEY } = await import("../adventure/core.mjs");
  const s = storage();
  s.setItem(
    SAVE_KEY,
    JSON.stringify({
      version: 1,
      completed: ["broly"],
      region: "namek",
      shards: -20,
      upgrades: { power: 999 },
    }),
  );
  const a = new Adventure(s);
  assert.equal(a.nextQuest.id, "sasuke");
  assert.equal(a.region.id, "leaf");
  assert.equal(a.shards, 0);
  assert.equal(a.upgrades.power, 3);
  const blocked = new Adventure({
    getItem() {
      throw Error("blocked");
    },
    setItem() {
      throw Error("blocked");
    },
  });
  blocked.collect("leaf:0");
  assert.equal(blocked.saveAvailable, false);
  assert.equal(blocked.shards, 1);
});

test("holding jump toward a wall climbs higher roofs while consuming energy", async () => {
  const { Adventure } = await import("../adventure/core.mjs");
  const a = new Adventure(storage());
  a.setWorld({
    spawn: { x: 0, y: 0, z: 0 },
    colliders: [{ x: 6, z: 0, w: 4, d: 4, h: 8 }],
  });
  step(a, 30, { x: 1 });
  step(a, 95, { x: 1, jump: true });
  assert.ok(
    a.player.y >= 8,
    "wall climb reaches a roof beyond double-jump height",
  );
  assert.ok(
    a.player.x > 3.6,
    "hero crosses onto the rooftop once above the wall",
  );
  assert.ok(a.player.energy < 99);
});

test("roaming echoes pursue, fight and reward once across save reloads", async () => {
  const { Adventure } = await import("../adventure/core.mjs");
  const s = storage(),
    a = new Adventure(s),
    echo = a.enemies[0];
  Object.assign(a.player, { x: echo.x - 5, z: echo.z });
  const previous = echo.x;
  step(a, 30);
  assert.ok(echo.x < previous);
  a.attack(true);
  step(a, 121);
  a.attack(true);
  assert.equal(a.enemies.length, 2);
  assert.equal(a.shards, 1);
  assert.ok(a.resonance > 0);
  assert.equal(new Adventure(s).enemies.length, 2);
});

test("Riftbreak requires resonance, interrupts a telegraph and summons the other hero", async () => {
  const { Adventure } = await import("../adventure/core.mjs");
  const a = new Adventure(storage());
  Object.assign(a.player, { x: 30, z: -16 });
  a.startBoss("sasuke");
  const max = a.currentBoss.maxHp;
  a.currentBoss.telegraph = {
    kind: "slash",
    x: a.player.x,
    z: a.player.z,
    radius: 4,
    time: 1,
    total: 1,
    damage: 20,
  };
  step(a, 1, { rift: true });
  assert.equal(a.currentBoss.hp, max);
  step(a, 1);
  a.resonance = 100;
  step(a, 1, { rift: true });
  assert.equal(a.resonance, 0);
  assert.equal(a.currentBoss.hp, max - 38);
  assert.equal(a.currentBoss.telegraph, null);
  assert.ok(a.invincible > 1);
  assert.equal(a.events.find((e) => e.type === "rift").ally, "goku");
});

test("bosses resist attacks during windups and expose a stronger counter window after striking", async () => {
  const { Adventure } = await import("../adventure/core.mjs");
  const a = new Adventure(storage());
  Object.assign(a.player, { x: 30, z: -16 });
  a.startBoss("sasuke");
  const max = a.currentBoss.maxHp;
  a.currentBoss.telegraph = {
    kind: "slash",
    x: 30,
    z: -16,
    radius: 4,
    time: 0.01,
    total: 1,
    damage: 12,
  };
  a.damageBoss(20, "melee");
  assert.equal(a.currentBoss.hp, max - 9);
  step(a, 1);
  assert.equal(a.currentBoss.telegraph, null);
  assert.ok(a.currentBoss.vulnerable > 0);
  assert.equal(a.currentBoss.resisting, false);
  a.damageBoss(20, "melee");
  assert.equal(a.currentBoss.hp, max - 37);
  step(a, 62);
  assert.equal(a.currentBoss.vulnerable, 0);
});

test("approaching the current predicament starts one ordered encounter without interacting", async () => {
  const { Adventure } = await import("../adventure/core.mjs");
  const a = new Adventure(storage());
  Object.assign(a.player, { x: -48, y: 0, z: -40 });
  step(a, 1);
  assert.equal(a.currentBoss, null, "the later encounter cannot start first");
  Object.assign(a.player, { x: 30, y: 0, z: -6 });
  step(a, 1);
  assert.equal(a.currentBoss, null, "outside the approach radius");
  step(a, 8, { z: -1 });
  assert.equal(a.currentBoss.id, "sasuke");
  assert.equal(a.events.filter((e) => e.type === "boss-start").length, 1);
  assert.equal(
    a.events.find((e) => e.type === "boss-start").trigger,
    "approach",
  );
  assert.ok(
    a.events
      .find((e) => e.type === "boss-start")
      .predicament.includes("patrol"),
  );
  step(a, 10);
  assert.equal(a.events.filter((e) => e.type === "boss-start").length, 1);
  a.completeQuest("sasuke");
  Object.assign(a.player, { x: 30, y: 0, z: -6 });
  step(a, 1);
  assert.equal(a.currentBoss, null, "the completed rival cannot restart");
  Object.assign(a.player, { x: -48, y: 0, z: -36 });
  step(a, 1);
  assert.equal(a.currentBoss.id, "pain");
  assert.equal(a.events.filter((e) => e.type === "boss-start").length, 2);
});

test("automatic encounters wait for ground-level landing instead of freezing a jump or rooftop", async () => {
  const { Adventure } = await import("../adventure/core.mjs");
  const a = new Adventure(storage());
  Object.assign(a.player, { x: 30, y: 0, z: -8, grounded: true });
  step(a, 1, { jump: true });
  assert.equal(a.player.grounded, false);
  assert.equal(a.currentBoss, null);
  step(a, 20);
  assert.ok(a.player.y > 1);
  assert.equal(
    a.currentBoss,
    null,
    "the hero remains free while airborne inside the encounter radius",
  );
  step(a, 45);
  assert.equal(a.player.grounded, true);
  assert.equal(a.currentBoss.id, "sasuke");
  assert.equal(a.events.filter((e) => e.type === "boss-start").length, 1);

  const roof = new Adventure(storage());
  roof.setWorld({
    spawn: { x: 30, y: 4, z: -8 },
    platforms: [{ x: 30, z: -8, w: 4, d: 4, h: 4 }],
  });
  step(roof, 30);
  assert.equal(roof.player.grounded, true);
  assert.equal(roof.player.y, 4);
  assert.equal(
    roof.currentBoss,
    null,
    "standing on a roof cannot trigger the ground-level cinematic",
  );
});

test("cinematic encounters use three authored shots, one-shot cues and exact combat landing positions", async () => {
  const { EncounterDirector } = await import("../adventure/director.mjs");
  const { QUESTS } = await import("../adventure/core.mjs");
  for (const quest of QUESTS) {
    const director = new EncounterDirector();
    const context = { player: { x: quest.x, y: 0, z: quest.z + 12 }, quest };
    const start = director.begin(quest.id, context);
    assert.equal(start.shot, "setup");
    assert.equal(start.rival.visible, false);
    assert.equal(director.active, true);
    assert.equal(director.id, quest.id);
    const cues = [],
      shots = new Set();
    let end;
    for (let i = 0; i < 73; i++) {
      end = director.update(0.1);
      shots.add(end.shot);
      cues.push(...end.cues);
      for (const point of [
        end.camera.position,
        end.camera.target,
        end.rival.position,
      ])
        assert.ok(point.every(Number.isFinite));
      assert.ok(end.text && end.title && end.speaker);
    }
    assert.equal(shots.size, 3);
    assert.equal(end.done, true);
    assert.equal(end.active, false);
    assert.equal(end.rival.visible, true);
    assert.deepEqual(end.rival.position, [quest.x, quest.y, quest.z]);
    assert.ok(cues.length >= 3);
    assert.ok(cues.some((c) => c.kind === "rift"));
    assert.ok(
      cues.every((c) => [c.x, c.y, c.z, c.radius].every(Number.isFinite)),
    );
    assert.deepEqual(
      director.update(2).cues,
      [],
      "finished timelines cannot replay effects",
    );
  }
});

test("cinematic context is copied, seeking is deterministic and skipping suppresses queued effects", async () => {
  const { EncounterDirector } = await import("../adventure/director.mjs");
  const first = new EncounterDirector(),
    second = new EncounterDirector();
  const context = {
    player: { x: 22, y: 0, z: -9 },
    quest: { x: 30, y: 0, z: -20 },
  };
  first.begin("sasuke", context);
  second.begin("sasuke", context);
  const expected = second.update(3);
  context.player.x = 9000;
  context.quest.z = 9000;
  const actual = first.update(3);
  assert.deepEqual(actual.camera, expected.camera);
  assert.deepEqual(actual.rival, expected.rival);
  assert.deepEqual(actual.cues, expected.cues);
  assert.deepEqual(
    first.update(0).cues,
    [],
    "zero delta does not repeat earlier effects",
  );
  const end = first.skip();
  assert.equal(end.done, true);
  assert.equal(first.active, false);
  assert.deepEqual(end.rival.position, [30, 0, -20]);
  assert.deepEqual(end.cues, []);
  assert.deepEqual(first.update(5).cues, []);
  assert.equal(first.begin("missing", context), false);
  assert.ok(first.update(Number.NaN).camera.position.every(Number.isFinite));
});
