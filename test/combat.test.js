const { test } = require("node:test");
const assert = require("node:assert/strict");
async function arena(options = {}) {
  const { Arena } = await import("../engine.mjs");
  const a = new Arena({ mode: "local", ...options });
  a.countdown = 0;
  for (const f of a.fighters) {
    f.invincible = 0;
    f.y = a.stage.platforms[0].y - f.h;
    f.grounded = true;
    f.platform = a.stage.platforms[0];
  }
  return a;
}
const step = (a, n, input = [{}, {}]) => {
  for (let i = 0; i < n; i++) a.update(1 / 60, input);
};
test("movement, double jump and platform landing", async () => {
  const a = await arena();
  const f = a.fighters[0];
  const before = f.x;
  step(a, 20, [{ right: true }, {}]);
  assert.ok(f.x > before + 50);
  step(a, 1, [{ jump: true }, {}]);
  assert.equal(f.jumps, 1);
  assert.ok(f.vy < 0);
  step(a, 1);
  step(a, 1, [{ jump: true }, {}]);
  assert.equal(f.jumps, 2);
  step(a, 1);
  const vy = f.vy;
  step(a, 1, [{ jump: true }, {}]);
  assert.equal(f.jumps, 2);
  assert.ok(f.vy > vy);
  step(a, 130);
  assert.equal(f.grounded, true);
  assert.equal(f.jumps, 0);
});
test("melee connects once per attack and damage strengthens knockback", async () => {
  const a = await arena(),
    [f, t] = a.fighters;
  f.x = 500;
  t.x = 570;
  step(a, 10, [{ attack: true }, {}]);
  assert.equal(t.damage, 6);
  const low = t.vx;
  a.freeze = 0;
  t.invincible = 0;
  t.damage = 150;
  a.hit(t, f, 6, "forward");
  assert.ok(t.vx > low);
  assert.ok(t.stun > 0);
});
test("shield blocks damage and breaks under repeated heavy pressure", async () => {
  const a = await arena(),
    [f, t] = a.fighters;
  t.shielding = true;
  const guard = t.guard;
  a.hit(t, f, 17);
  assert.equal(t.damage, 0);
  assert.ok(t.guard < guard);
  t.invincible = 0;
  t.shielding = true;
  a.hit(t, f, 30);
  assert.equal(t.shielding, false);
  assert.ok(t.stun >= 1.5);
});
test("roster specials are distinct and consume energy", async () => {
  for (const id of ["naruto", "luffy", "goku"]) {
    const a = await arena({ p1: id }),
      f = a.fighters[0];
    step(a, 1, [{ special: true }, {}]);
    assert.ok(f.energy < 80);
    assert.equal(
      f.attack.kind,
      id === "naruto" ? "rasengan" : id === "luffy" ? "stretch" : "beam",
    );
    if (id === "goku") {
      step(a, 30);
      assert.ok(a.projectiles.length > 0);
    }
  }
});
test("projectile collision remains reliable with a swept fast beam", async () => {
  const a = await arena({ p1: "goku" }),
    [f, t] = a.fighters;
  f.x = 400;
  t.x = 650;
  a.projectiles.push({
    x: 430,
    y: t.cy,
    vx: 10000,
    owner: 0,
    life: 1,
    r: 18,
    damage: 17,
    color: "#fff",
  });
  a.stepProjectiles(0.04);
  assert.equal(t.damage, 17);
  assert.equal(a.projectiles.length, 0);
});
test("air recovery is available once before landing", async () => {
  const a = await arena(),
    f = a.fighters[0];
  f.grounded = false;
  f.y = 200;
  a.startSpecial(f, { up: true });
  assert.equal(f.recovery, true);
  assert.equal(f.vy, -920);
  const energy = f.energy;
  a.startSpecial(f, { up: true });
  assert.equal(f.energy, energy);
});
test("ring-outs consume stocks and the final stock ends the match", async () => {
  const a = await arena(),
    f = a.fighters[0];
  f.damage = 140;
  f.y = 900;
  step(a, 1);
  assert.equal(f.stocks, 2);
  assert.ok(f.respawn > 0);
  step(a, 80);
  assert.equal(f.damage, 0);
  assert.equal(f.stocks, 2);
  f.stocks = 1;
  f.invincible = 0;
  f.y = 900;
  step(a, 1);
  assert.equal(a.winner, 1);
});
test("pause freezes the match clock and timeout resolves by stocks", async () => {
  const a = await arena();
  a.paused = true;
  step(a, 90);
  assert.equal(a.time, 180);
  a.paused = false;
  a.time = 0.01;
  a.fighters[0].stocks = 2;
  step(a, 1);
  assert.equal(a.winner, 1);
});
test("CPU actively pursues and attacks a nearby opponent", async () => {
  const a = await arena({ mode: "cpu", difficulty: "hard" });
  a.fighters[0].x = 500;
  a.fighters[1].x = 575;
  a.fighters[1].facing = -1;
  step(a, 100);
  assert.ok(a.fighters[0].damage > 0);
});

test('CPU turns to face a close opponent after crossing sides',async()=>{const a=await arena({mode:'cpu'});const [human,cpu]=a.fighters;human.x=600;cpu.x=550;cpu.facing=-1;step(a,70);assert.ok(human.damage>0);});
