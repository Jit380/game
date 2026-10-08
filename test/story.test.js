const { test } = require("node:test");
const assert = require("node:assert/strict");
const storage = () => {
  const map = new Map();
  return {
    getItem: (k) => map.get(k) || null,
    setItem: (k, v) => map.set(k, v),
    removeItem: (k) => map.delete(k),
  };
};
const step = (c, n, input = {}) => {
  for (let i = 0; i < n; i++) c.update(1 / 60, input);
};
test("campaign survives corrupt saves and rejects skipped chapters", async () => {
  const { Campaign, SAVE_KEY } = await import("../story.mjs");
  const s = storage();
  s.setItem(SAVE_KEY, "broken");
  assert.equal(new Campaign(s).region.id, "leaf");
  s.setItem(
    SAVE_KEY,
    JSON.stringify({
      version: 1,
      region: "rift",
      defeated: ["broly"],
      upgrades: { power: 900 },
      shards: -80,
    }),
  );
  const c = new Campaign(s);
  assert.equal(c.region.id, "leaf");
  assert.equal(c.nextBoss, "sasuke");
  assert.equal(c.save.upgrades.power, 3);
  assert.equal(c.save.shards, 0);
});
test("exploration supports movement, double jumps, rooftops and one-time fragments", async () => {
  const { Campaign } = await import("../story.mjs");
  const c = new Campaign(storage());
  step(c, 30, { right: true });
  assert.ok(c.player.x > 350);
  step(c, 1, { jump: true });
  assert.ok(c.player.vy < 0);
  step(c, 1);
  step(c, 1, { jump: true });
  assert.equal(c.player.jumps, 2);
  step(c, 100);
  assert.ok(c.player.grounded);
  c.player.x = c.region.shards[0].x;
  c.player.y = c.region.shards[0].y + 35;
  step(c, 1);
  assert.equal(c.save.shards, 1);
  assert.equal(c.collect(0), false);
});
test("roaming echoes fight, reward once and stay resolved after loading", async () => {
  const { Campaign } = await import("../story.mjs");
  const s = storage(),
    c = new Campaign(s);
  const enemy = c.patrols[0];
  c.player.x = enemy.x - 65;
  c.player.y = c.region.ground;
  c.player.facing = 1;
  step(c, 1, { special: true });
  assert.equal(c.patrols.length, 2);
  assert.equal(c.save.shards, 1);
  assert.equal(new Campaign(s).patrols.length, 2);
  const second = c.patrols[0];
  c.player.x = second.x - 20;
  c.invincible = 0;
  step(c, 1);
  assert.equal(c.worldHP, 82);
  step(c, 1, { shield: true });
  assert.equal(c.worldHP, 82);
  c.worldHP = 0;
  step(c, 1);
  assert.equal(c.worldHP, 100);
  assert.equal(c.player.x, c.checkpoint);
  assert.equal(c.save.shards, 1);
});
test("upgrades spend fragments and chapter gates unlock in order with persistence", async () => {
  const { Campaign } = await import("../story.mjs");
  const s = storage(),
    c = new Campaign(s);
  assert.equal(c.travel("namek"), false);
  assert.equal(c.complete("pain"), false);
  assert.equal(c.purchase("power"), false);
  c.collect(0);
  c.collect(1);
  c.collect(2);
  assert.equal(c.purchase("power"), true);
  assert.equal(c.save.upgrades.power, 1);
  assert.equal(c.save.shards, 0);
  assert.equal(c.purchase("missing"), false);
  assert.ok(c.complete("sasuke"));
  assert.ok(c.complete("pain"));
  assert.ok(c.travel("namek"));
  assert.ok(c.complete("frieza"));
  assert.ok(c.travel("rift"));
  assert.ok(c.complete("broly"));
  assert.equal(c.nextBoss, null);
  const loaded = new Campaign(s);
  assert.equal(loaded.region.id, "rift");
  assert.equal(loaded.nextBoss, null);
  assert.equal(loaded.save.upgrades.power, 1);
  assert.equal(c.complete("broly"), false);
});
test("boss danger zones telegraph, reward evasions and enter phase two", async () => {
  const { BossArena } = await import("../story.mjs");
  const a = new BossArena("pain");
  a.countdown = 0;
  a.fighters[0].invincible = 0;
  a.patternTimer = 0;
  a.update(1 / 60, [{}, {}]);
  assert.ok(a.warning && a.warning.t > 1);
  const x = a.warning.x;
  a.fighters[0].x = x + 400;
  a.fighters[1].x = 250;
  a.warning.t = 0.01;
  const damage = a.fighters[0].damage;
  a.update(1 / 60, [{}, {}]);
  assert.equal(a.fighters[0].damage, damage);
  assert.equal(a.pressure, 1);
  a.fighters[1].damage = 90;
  a.update(1 / 60, [{}, {}]);
  assert.equal(a.phase, 2);
});
test("Riftbreak consumes charge, interrupts hazards and grants a brief assist", async () => {
  const { BossArena } = await import("../story.mjs");
  const a = new BossArena("frieza", { power: 1, vitality: 1 });
  a.countdown = 0;
  a.resonance = 100;
  a.warning = { kind: "frieza", x: 640, y: 400, t: 0.9, fired: false };
  a.fighters[1].invincible = 0;
  a.update(1 / 60, [{ rift: true }, {}]);
  assert.equal(a.warning, null);
  assert.equal(a.resonance, 0);
  assert.ok(a.riftFlash > 0);
  assert.ok(a.fighters[1].damage >= 34);
  assert.equal(a.fighters[0].stocks, 4);
  const d = a.fighters[1].damage;
  a.update(1 / 60, [{ rift: true }, {}]);
  assert.equal(a.fighters[1].damage, d);
});
test("browser storage denial keeps the campaign playable", async () => {
  const { Campaign } = await import("../story.mjs");
  const c = new Campaign({
    getItem() {
      throw Error("blocked");
    },
    setItem() {
      throw Error("blocked");
    },
  });
  c.collect(0);
  assert.equal(c.saveAvailable, false);
  assert.equal(c.save.shards, 1);
});
test("a boss recovers upward to pursue a hero on high rooftops", async () => {
  const { BossArena } = await import("../story.mjs");
  const a = new BossArena("pain");
  a.countdown = 0;
  a.patternTimer = 100;
  a.fighters[0].x = 610;
  a.fighters[0].y = 164;
  a.fighters[0].invincible = 0;
  a.fighters[1].x = 670;
  for (let i = 0; i < 600; i++) {
    a.update(1 / 60, [{}, {}]);
    a.events = [];
  }
  assert.ok(
    a.fighters[0].damage > 0 || a.fighters[0].stocks < 3,
    "boss reaches and attacks a high platform",
  );
});
test("Pain shatters only his encounter rooftops, preserving the shared stage", async () => {
  const { BossArena } = await import("../story.mjs");
  const { STAGES } = await import("../engine.mjs");
  const count = STAGES.find((s) => s.id === "leaf").platforms.length;
  const a = new BossArena("pain");
  a.countdown = 0;
  a.fighters[1].damage = 90;
  a.update(1 / 60, [{}, {}]);
  assert.equal(a.stage.platforms.length, 1);
  assert.ok(a.collapse > 0);
  assert.equal(STAGES.find((s) => s.id === "leaf").platforms.length, count);
  assert.equal(new BossArena("pain").stage.platforms.length, count);
});
