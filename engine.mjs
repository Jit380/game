export const ROSTER = [
  {
    id: "naruto",
    name: "Naruto",
    title: "THE SHINOBI",
    color: "#ffaf42",
    secondary: "#263752",
    speed: 350,
    weight: 0.96,
    special: "Rasengan",
    tag: "Speed · close-range pressure",
  },
  {
    id: "luffy",
    name: "Luffy",
    title: "THE CAPTAIN",
    color: "#ff5868",
    secondary: "#438ee4",
    speed: 325,
    weight: 1.04,
    special: "Gum-Gum Pistol",
    tag: "Reach · powerful launches",
  },
  {
    id: "goku",
    name: "Goku",
    title: "THE SAIYAN",
    color: "#fca248",
    secondary: "#2366cb",
    speed: 330,
    weight: 1.08,
    special: "Kamehameha",
    tag: "Power · ranged control",
  },
];
export const STAGES = [
  {
    id: "temple",
    name: "Sky Temple",
    subtitle: "Three platforms. Endless possibilities.",
    platforms: [
      { x: 240, y: 510, w: 800, h: 60, main: true },
      { x: 350, y: 350, w: 175, h: 15 },
      { x: 755, y: 350, w: 175, h: 15 },
      { x: 555, y: 230, w: 170, h: 15 },
    ],
  },
  {
    id: "docks",
    name: "Sunset Docks",
    subtitle: "Settle the score above the sea.",
    platforms: [
      { x: 205, y: 510, w: 870, h: 55, main: true },
      { x: 325, y: 340, w: 195, h: 18 },
      { x: 750, y: 340, w: 195, h: 18 },
    ],
  },
  {
    id: "moon",
    name: "Moon Arena",
    subtitle: "No cover. Just you and your rival.",
    platforms: [{ x: 250, y: 505, w: 780, h: 45, main: true }],
  },
];
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export class Fighter {
  constructor(character, slot) {
    this.character = ROSTER.find((r) => r.id === character) || ROSTER[slot];
    this.slot = slot;
    this.w = 38;
    this.h = 66;
    this.stocks = 3;
    this.damage = 0;
    this.energy = 100;
    this.guard = 100;
    this.reset();
  }
  reset() {
    this.x = this.slot === 0 ? 455 : 825;
    this.y = 180;
    this.vx = 0;
    this.vy = 0;
    this.facing = this.slot === 0 ? 1 : -1;
    this.grounded = false;
    this.jumps = 0;
    this.stun = 0;
    this.cool = 0;
    this.attack = null;
    this.invincible = 1;
    this.shielding = false;
    this.respawn = 0;
    this.recovery = false;
    this.combo = 0;
    this.comboTime = 0;
    this.dodgeCooldown = 0;
    this.dodge = 0;
    this.previous = {};
    this.animation = 0;
    this.aiTimer = 0;
    this.aiInput = {};
    this.ledgeCooldown = 0;
  }
  get cx() {
    return this.x + this.w / 2;
  }
  get cy() {
    return this.y + this.h / 2;
  }
}
export class Arena {
  constructor({
    p1 = "naruto",
    p2 = "goku",
    stage = "temple",
    mode = "cpu",
    difficulty = "normal",
  } = {}) {
    this.fighters = [new Fighter(p1, 0), new Fighter(p2, 1)];
    this.stage = STAGES.find((s) => s.id === stage) || STAGES[0];
    this.mode = mode;
    this.difficulty = difficulty;
    this.time = 180;
    this.elapsed = 0;
    this.countdown = 2.2;
    this.winner = null;
    this.paused = false;
    this.projectiles = [];
    this.effects = [];
    this.events = [];
    this.shake = 0;
    this.freeze = 0;
    this.seed = 64;
  }
  random() {
    this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }
  event(type, data = {}) {
    this.events.push({ type, ...data });
  }
  effect(kind, x, y, color, life = 0.4, extra = {}) {
    this.effects.push({ kind, x, y, color, life, maxLife: life, ...extra });
  }
  update(dt, inputs = [{}, {}]) {
    if (this.paused || this.winner !== null) return;
    this.elapsed += dt;
    this.shake = Math.max(0, this.shake - dt * 22);
    this.effects.forEach((e) => (e.life -= dt));
    this.effects = this.effects.filter((e) => e.life > 0);
    if (this.countdown > 0) {
      this.countdown = Math.max(0, this.countdown - dt);
      if (this.countdown === 0) this.event("go");
      return;
    }
    if (this.freeze > 0) {
      this.freeze = Math.max(0, this.freeze - dt);
      return;
    }
    this.time = Math.max(0, this.time - dt);
    for (let i = 0; i < 2; i++) {
      const f = this.fighters[i],
        input =
          i === 1 && this.mode === "cpu"
            ? this.ai(f, this.fighters[0], dt)
            : inputs[i] || {};
      this.stepFighter(f, input, dt);
    }
    this.resolveAttacks();
    this.stepProjectiles(dt);
    for (const f of this.fighters) {
      if (
        f.respawn <= 0 &&
        (f.cx < -140 || f.cx > 1420 || f.y > 880 || f.y + f.h < -200)
      )
        this.knockout(f);
    }
    if (this.time <= 0) {
      const [a, b] = this.fighters;
      this.winner =
        a.stocks !== b.stocks
          ? a.stocks > b.stocks
            ? 0
            : 1
          : a.damage !== b.damage
            ? a.damage < b.damage
              ? 0
              : 1
            : "draw";
      this.event("end", { winner: this.winner });
    }
  }
  ai(f, enemy, dt) {
    f.aiTimer -= dt;
    if (f.aiTimer > 0) return f.aiInput;
    const hard = this.difficulty === "hard",
      easy = this.difficulty === "easy";
    f.aiTimer = hard ? 0.065 : easy ? 0.25 : 0.13;
    const dx = enemy.cx - f.cx,
      dy = enemy.cy - f.cy,
      main = this.stage.platforms[0];
    let input = {};
    const off = f.cx < main.x + 8 || f.cx > main.x + main.w - 8;
    if(!off && !f.attack && Math.abs(dx)>5)f.facing=Math.sign(dx);
    if (off && f.y > main.y - 120) {
      input.left = f.cx > 640;
      input.right = f.cx < 640;
      input.jump = f.jumps < 2;
      input.up = f.jumps >= 2;
      input.special = f.jumps >= 2 && !f.recovery;
    } else {
      input.left = dx < -64;
      input.right = dx > 64;
      input.attack = Math.abs(dx) < 125 && Math.abs(dy) < 82;
      input.special =
        Math.abs(dx) < (f.character.id === "goku" ? 500 : 240) &&
        Math.abs(dy) < 90 &&
        f.energy > 35 &&
        this.random() > (easy ? 0.75 : 0.35);
      input.jump =
        (dy < -70 && Math.abs(dx) < 230) ||
        (f.grounded && Math.abs(dx) > 200 && this.random() > 0.88);
      input.up = dy < -55 && Math.abs(dx) < 100;
      input.down = !f.grounded && dy > 55 && Math.abs(dx) < 60;
      if (hard && enemy.attack && Math.abs(dx) < 100) {
        input.shield = this.random() > 0.45;
        input.dodge = this.random() > 0.8;
      }
      for (const p of this.projectiles)
        if (
          p.owner !== f.slot &&
          Math.abs(p.x - f.cx) < 160 &&
          Math.abs(p.y - f.cy) < 70 &&
          !easy
        )
          input.shield = true;
    }
    // Release jump between decisions so double jumps remain intentional.
    if (input.jump && f.previous.jump) input.jump = false;
    f.aiInput = input;
    return input;
  }
  stepFighter(f, input, dt) {
    f.animation += dt;
    f.cool = Math.max(0, f.cool - dt);
    f.stun = Math.max(0, f.stun - dt);
    f.invincible = Math.max(0, f.invincible - dt);
    f.dodgeCooldown = Math.max(0, f.dodgeCooldown - dt);
    f.dodge = Math.max(0, f.dodge - dt);
    f.comboTime = Math.max(0, f.comboTime - dt);
    f.ledgeCooldown = Math.max(0, f.ledgeCooldown - dt);
    f.energy = Math.min(100, f.energy + 14 * dt);
    if (f.respawn > 0) {
      f.respawn -= dt;
      if (f.respawn <= 0) {
        const stocks = f.stocks;
        f.reset();
        f.stocks = stocks;
        f.energy = 100;
        f.damage = 0;
        f.invincible = 2;
      }
      return;
    }
    f.shielding =
      !!input.shield && f.stun <= 0 && f.grounded && f.guard > 3 && !f.attack;
    if (f.shielding) {
      f.guard -= 25 * dt;
      if (f.guard <= 3) this.breakShield(f);
    } else f.guard = Math.min(100, f.guard + 20 * dt);
    if (f.attack) {
      f.attack.t += dt;
      if (f.attack.kind === "beam" && !f.attack.fired && f.attack.t > 0.43) {
        f.attack.fired = true;
        this.projectiles.push({
          x: f.cx + f.facing * 30,
          y: f.cy - 7,
          vx: f.facing * 950,
          owner: f.slot,
          life: 1.25,
          r: 18,
          damage: 17,
          color: "#62ddff",
          kind: "beam",
        });
        this.event("special", { character: "goku" });
      }
      if (
        f.attack.kind === "rasengan" &&
        f.attack.t > 0.1 &&
        f.attack.t < 0.35
      ) {
        f.vx = f.facing * 650;
        f.invincible = Math.max(f.invincible, 0.02);
      }
      if (f.attack.t >= f.attack.duration) f.attack = null;
    }
    const canMove = f.stun <= 0 && !f.shielding && f.dodge <= 0;
    let direction = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    if (canMove) {
      if (direction) {
        f.facing = direction;
        const speed =
          f.character.speed * (f.attack?.kind === "beam" ? 0.15 : 1);
        f.vx +=
          (direction * speed - f.vx) * Math.min(1, dt * (f.grounded ? 18 : 9));
      } else f.vx *= Math.pow(f.grounded ? 0.001 : 0.2, dt);
      if (input.jump && !f.previous.jump && f.jumps < 2) {
        if (input.down && f.grounded && f.platform && !f.platform.main) {
          f.y += 8;
          f.vy = 100;
          f.grounded = false;
          f.platform = null;
        } else {
          f.vy = f.jumps === 0 ? -650 : -575;
          f.jumps++;
          f.grounded = false;
          this.effect("jump", f.cx, f.y + f.h, "#eef6ff", 0.32);
          this.event("jump");
        }
      }
      if (!input.jump && f.previous.jump && f.vy < -220) f.vy *= 0.65;
      if (input.dodge && !f.previous.dodge && f.dodgeCooldown <= 0) {
        f.dodge = 0.2;
        f.invincible = 0.22;
        f.dodgeCooldown = 1;
        f.vx = (direction || f.facing) * 620;
        this.effect("dash", f.cx, f.cy, f.character.color, 0.3);
        this.event("dodge");
      }
      if (input.attack && f.cool <= 0 && !f.attack) this.startAttack(f, input);
      else if (input.special && f.cool <= 0 && !f.attack && f.energy >= 24)
        this.startSpecial(f, input);
    }
    const oldBottom = f.y + f.h;
    f.vy = Math.min(1000, f.vy + 1600 * dt);
    f.x += f.vx * dt;
    f.y += f.vy * dt;
    f.grounded = false;
    for (const p of this.stage.platforms) {
      if (
        f.vy >= 0 &&
        oldBottom <= p.y + 3 &&
        f.y + f.h >= p.y &&
        f.x + f.w > p.x &&
        f.x < p.x + p.w
      ) {
        f.y = p.y - f.h;
        f.vy = 0;
        f.grounded = true;
        f.jumps = 0;
        f.recovery = false;
        f.platform = p;
        break;
      }
    }
    // Ledge grab gives a recovering fighter a fair chance to return.
    const main = this.stage.platforms[0];
    if (
      !f.grounded &&
      f.vy > 0 &&
      f.stun <= 0 &&
      f.ledgeCooldown <= 0 &&
      f.y < main.y + 18 &&
      f.y > main.y - 50
    ) {
      if (
        Math.abs(f.cx - main.x) < 24 ||
        Math.abs(f.cx - (main.x + main.w)) < 24
      ) {
        f.x = clamp(f.x, main.x + 5, main.x + main.w - f.w - 5);
        f.y = main.y - f.h;
        f.vy = 0;
        f.jumps = 0;
        f.recovery = false;
        f.invincible = 0.35;
        f.ledgeCooldown = 1;
        this.effect("jump", f.cx, main.y, "#fff", 0.3);
      }
    }
    f.previous = { ...input };
  }
  startAttack(f, input) {
    const vertical = input.up ? "up" : input.down ? "down" : "neutral";
    f.combo = f.comboTime > 0 ? (f.combo + 1) % 3 : 0;
    f.comboTime = 0.65;
    const finisher = f.combo === 2;
    f.cool = finisher ? 0.42 : 0.25;
    f.attack = {
      kind: vertical,
      t: 0,
      duration: finisher ? 0.35 : 0.24,
      start: 0.04,
      end: finisher ? 0.22 : 0.16,
      hit: new Set(),
      damage: vertical === "down" ? 12 : finisher ? 11 : 6,
      range: vertical === "neutral" ? 78 : 55,
      finisher,
    };
    this.event("swing");
  }
  startSpecial(f, input) {
    if (input.up && !f.grounded) {
      if (f.recovery) return;
      f.recovery = true;
      f.energy -= 24;
      f.vy = -920;
      f.jumps = 2;
      f.cool = 0.55;
      f.invincible = 0.18;
      f.attack = null;
      this.effect("recover", f.cx, f.cy, f.character.color, 0.55);
      this.event("recovery");
      return;
    }
    f.energy -= 24;
    f.cool = 1.05;
    if (f.character.id === "goku")
      f.attack = {
        kind: "beam",
        t: 0,
        duration: 0.72,
        hit: new Set(),
        damage: 0,
      };
    else
      f.attack = {
        kind: f.character.id === "luffy" ? "stretch" : "rasengan",
        t: 0,
        duration: f.character.id === "luffy" ? 0.48 : 0.4,
        start: f.character.id === "luffy" ? 0.16 : 0.1,
        end: f.character.id === "luffy" ? 0.34 : 0.35,
        hit: new Set(),
        range: f.character.id === "luffy" ? 235 : 86,
        damage: f.character.id === "luffy" ? 17 : 14,
        finisher: true,
      };
    this.event("special", { character: f.character.id });
  }
  resolveAttacks() {
    for (const f of this.fighters) {
      const a = f.attack;
      if (
        !a ||
        a.kind === "beam" ||
        a.t < a.start ||
        a.t > a.end ||
        f.respawn > 0
      )
        continue;
      const target = this.fighters[1 - f.slot];
      if (a.hit.has(target.slot) || target.respawn > 0) continue;
      let hx = f.cx + f.facing * (a.range * 0.65),
        hy = f.cy + 2,
        hw = a.range,
        hh = 45;
      if (a.kind === "up") {
        hx = f.cx;
        hy = f.y - 12;
        hw = 70;
        hh = 65;
      } else if (a.kind === "down") {
        hx = f.cx;
        hy = f.y + f.h + 8;
        hw = 80;
        hh = 60;
      }
      if (
        Math.abs(target.cx - hx) < (hw + target.w) / 2 &&
        Math.abs(target.cy - hy) < (hh + target.h) / 2
      ) {
        a.hit.add(target.slot);
        this.hit(
          target,
          f,
          a.damage,
          a.kind === "down" && !f.grounded
            ? "spike"
            : a.kind === "up"
              ? "up"
              : "forward",
          a.finisher,
        );
      }
    }
  }
  hit(target, source, damage, direction = "forward", strong = false) {
    if (target.invincible > 0 || target.respawn > 0) return false;
    if (target.shielding) {
      target.guard -= damage * 2.7;
      target.vx = source.facing * 90;
      this.effect("shield", target.cx, target.cy, "#82cfff", 0.28);
      this.event("block");
      if (target.guard <= 3) this.breakShield(target);
      return false;
    }
    target.damage += damage;
    target.attack = null;
    target.shielding = false;
    const force = (strong ? 400 : 215) + target.damage * (strong ? 6.2 : 4.2);
    const knock = force / target.character.weight;
    target.vx = source.facing * knock;
    target.vy =
      direction === "spike"
        ? knock * 1.2
        : direction === "up"
          ? -knock * 1.3
          : -knock * 0.62;
    if (direction === "up") target.vx = source.facing * knock * 0.3;
    target.grounded = false;
    target.stun = Math.min(
      0.8,
      0.13 + target.damage * 0.0025 + (strong ? 0.08 : 0),
    );
    target.invincible = 0.055;
    this.shake = strong ? 9 : 5;
    this.freeze = strong ? 0.045 : 0.025;
    this.effect("hit", target.cx, target.cy, source.character.color, 0.3, {
      strong,
    });
    this.effect("damage", target.cx, target.y, "#fff", 0.7, {
      text: "+" + damage,
    });
    this.event("hit", { strong, damage });
    return true;
  }
  breakShield(f) {
    f.guard = 0;
    f.shielding = false;
    f.stun = 1.5;
    f.vy = -320;
    f.invincible = 0;
    this.effect("shieldBreak", f.cx, f.cy, "#a7d9ff", 0.6);
    this.event("break");
  }
  stepProjectiles(dt) {
    for (const p of this.projectiles) {
      const old = p.x;
      p.x += p.vx * dt;
      p.life -= dt;
      const f = this.fighters[1 - p.owner];
      const lo = Math.min(old, p.x) - p.r,
        hi = Math.max(old, p.x) + p.r;
      if (
        p.life > 0 &&
        f.respawn <= 0 &&
        f.cx > lo - f.w / 2 &&
        f.cx < hi + f.w / 2 &&
        Math.abs(p.y - f.cy) < p.r + f.h / 2
      ) {
        this.hit(f, this.fighters[p.owner], p.damage, "forward", true);
        p.life = 0;
      }
    }
    this.projectiles = this.projectiles.filter(
      (p) => p.life > 0 && p.x > -200 && p.x < 1480,
    );
  }
  knockout(f) {
    f.stocks--;
    this.shake = 15;
    this.freeze = 0.12;
    this.effect(
      "ko",
      clamp(f.cx, 0, 1280),
      clamp(f.cy, 0, 700),
      f.character.color,
      1,
      { slot: f.slot },
    );
    this.event("ko", { slot: f.slot });
    f.attack = null;
    if (f.stocks <= 0) {
      this.winner = 1 - f.slot;
      this.event("end", { winner: this.winner });
    } else {
      f.respawn = 1.1;
      f.x = f.slot === 0 ? 455 : 825;
      f.y = -80;
      f.vx = f.vy = 0;
    }
  }
}
