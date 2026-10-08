import { Arena } from "./engine.mjs";
export const SAVE_KEY = "anime-brawl-worlds-collide-v1";
export const REGIONS = [
  {
    id: "leaf",
    name: "Hidden Leaf Village",
    subtitle: "ROOFTOPS • TRAINING GROUNDS • OLD BONDS",
    hero: "naruto",
    width: 3400,
    color: "#ffba63",
    ground: 550,
    platforms: [
      { x: 360, y: 410, w: 260 },
      { x: 780, y: 360, w: 260 },
      { x: 1450, y: 400, w: 270 },
      { x: 1940, y: 340, w: 240 },
      { x: 2420, y: 390, w: 240 },
      { x: 2930, y: 330, w: 230 },
    ],
    shards: [
      { x: 460, y: 365 },
      { x: 900, y: 315 },
      { x: 1580, y: 355 },
      { x: 2050, y: 295 },
      { x: 2530, y: 345 },
      { x: 3050, y: 285 },
    ],
    npcs: [
      {
        x: 560,
        name: "Kakashi",
        text: [
          "The skies cracked before dawn. Those violet lights are not chakra.",
          "Sasuke is waiting near the training grounds. Find him before this rift finds us.",
          "Climb the rooftops for fragments. Spend them at a camp; you will need every advantage.",
        ],
      },
    ],
    camps: [220, 1820],
    gates: [
      { x: 1240, boss: "sasuke" },
      { x: 2780, boss: "pain" },
    ],
  },
  {
    id: "namek",
    name: "Namek",
    subtitle: "EMERALD SKIES • LOST ISLANDS • A FAMILIAR TYRANT",
    hero: "goku",
    width: 3200,
    color: "#84e7c4",
    ground: 550,
    platforms: [
      { x: 350, y: 390, w: 260 },
      { x: 790, y: 330, w: 220 },
      { x: 1320, y: 400, w: 240 },
      { x: 1740, y: 330, w: 250 },
      { x: 2260, y: 385, w: 230 },
      { x: 2770, y: 315, w: 210 },
    ],
    shards: [
      { x: 450, y: 345 },
      { x: 890, y: 285 },
      { x: 1440, y: 355 },
      { x: 1850, y: 285 },
      { x: 2370, y: 340 },
      { x: 2870, y: 270 },
    ],
    npcs: [
      {
        x: 680,
        name: "Dende",
        text: [
          "The water reflects a different sky. Someone is feeding this fracture.",
          "Frieza took the core to the far island. He thinks it is another Dragon Ball.",
          "You are not alone, Goku. I heard another world answer when you arrived.",
        ],
      },
    ],
    camps: [220, 1520],
    gates: [{ x: 2480, boss: "frieza" }],
  },
  {
    id: "rift",
    name: "The In-Between",
    subtitle: "BROKEN WORLDS • SHARED COURAGE • ONE LAST FIGHT",
    hero: "goku",
    width: 2900,
    color: "#c0a5ff",
    ground: 550,
    platforms: [
      { x: 370, y: 400, w: 220 },
      { x: 850, y: 335, w: 260 },
      { x: 1370, y: 380, w: 220 },
      { x: 1800, y: 310, w: 250 },
      { x: 2370, y: 380, w: 240 },
    ],
    shards: [
      { x: 470, y: 355 },
      { x: 970, y: 290 },
      { x: 1470, y: 335 },
      { x: 1920, y: 265 },
      { x: 2480, y: 335 },
    ],
    npcs: [
      {
        x: 640,
        name: "Naruto",
        text: [
          "Our worlds are pulling apart. I can feel every heartbeat on the other side.",
          "Broly is not the source. The rift is turning his pain into a weapon.",
          "When he roars, look for the safe ground. Then hit back together.",
        ],
      },
    ],
    camps: [220, 1600],
    gates: [{ x: 2420, boss: "broly" }],
  },
];
export const BOSSES = {
  sasuke: {
    region: "leaf",
    stage: "leaf",
    hero: "naruto",
    chapter: "01 · OLD BONDS",
    title: "A RIVAL AT THE FRACTURE",
    pattern: "CHIDORI CROSSING",
    intro: [
      [
        "Sasuke",
        "Something is wearing our memories. I will cut the rift open, even if I have to cut through you.",
      ],
      ["Naruto", "You do not get to carry this alone. Not this time."],
    ],
    outro: [
      ["Sasuke", "That power… it answered you from another world."],
      ["Naruto", "Then we find who is on the other side. Together."],
    ],
  },
  pain: {
    region: "leaf",
    stage: "leaf",
    hero: "naruto",
    chapter: "02 · THE COST OF PEACE",
    title: "THE SKY PUSHES BACK",
    pattern: "ALMIGHTY PUSH",
    intro: [
      [
        "Pain",
        "A world without borders. A world that shares its pain. The fracture can make it real.",
      ],
      [
        "Naruto",
        "Sharing pain is not the same as taking away everyone’s choice.",
      ],
    ],
    outro: [
      ["Pain", "The rift will not obey you simply because you believe."],
      ["Naruto", "Good. I will ask the people on the other side for help."],
    ],
  },
  frieza: {
    region: "namek",
    stage: "namek",
    hero: "goku",
    chapter: "03 · THE WRONG WISH",
    title: "AN EMPEROR WITHOUT A WORLD",
    pattern: "DEATH BEAM SWEEP",
    intro: [
      [
        "Frieza",
        "An infinite collection of planets. I must thank you for delivering the door.",
      ],
      ["Goku", "You never learn, do you? These worlds are not yours to take."],
    ],
    outro: [
      ["Frieza", "That was not Saiyan energy. What are you?"],
      ["Goku", "Someone with friends you have not met yet."],
    ],
  },
  broly: {
    region: "rift",
    stage: "ring",
    hero: "goku",
    chapter: "04 · COURAGE ACROSS WORLDS",
    title: "THE LAST HEARTBEAT",
    pattern: "GIGANTIC ERUPTION",
    intro: [
      ["Broly", "Too many voices… make them stop!"],
      ["Goku", "The rift is hurting him. Naruto, help me break its hold!"],
      [
        "Naruto",
        "We are right here, Broly. You do not have to fight this alone.",
      ],
    ],
    outro: [
      ["Broly", "It is… quiet."],
      ["Naruto", "Your world, my world. Turns out courage travels."],
      ["Goku", "Let us go home. And maybe have that rematch someday."],
    ],
  },
};
const emptySave = () => ({
  version: 1,
  region: "leaf",
  x: 220,
  defeated: [],
  patrols: [],
  collected: [],
  shards: 0,
  upgrades: { power: 0, focus: 0, vitality: 0 },
  introSeen: false,
});
export function readSave(storage) {
  try {
    const raw = JSON.parse(storage?.getItem(SAVE_KEY));
    if (!raw || raw.version !== 1) return emptySave();
    const s = emptySave();
    s.defeated = ["sasuke", "pain", "frieza", "broly"].filter((id) =>
      raw.defeated?.includes(id),
    );
    // A save cannot skip prerequisite chapters.
    s.defeated = s.defeated.slice(
      0,
      ["sasuke", "pain", "frieza", "broly"].findIndex(
        (id) => !s.defeated.includes(id),
      ) < 0
        ? 4
        : ["sasuke", "pain", "frieza", "broly"].findIndex(
            (id) => !s.defeated.includes(id),
          ),
    );
    const allowed = new Set(
      REGIONS.flatMap((r) => r.shards.map((_, i) => r.id + ":" + i)),
    );
    s.collected = [
      ...new Set(Array.isArray(raw.collected) ? raw.collected : []),
    ].filter((id) => allowed.has(id));
    const patrolIds = new Set(
      REGIONS.flatMap((r) =>
        Array.from({ length: 3 }, (_, i) => r.id + ":echo:" + i),
      ),
    );
    s.patrols = [
      ...new Set(Array.isArray(raw.patrols) ? raw.patrols : []),
    ].filter((id) => patrolIds.has(id));
    s.shards = Number.isFinite(raw.shards)
      ? Math.max(0, Math.min(99, Math.floor(raw.shards)))
      : 0;
    for (const key of Object.keys(s.upgrades))
      s.upgrades[key] = Number.isFinite(raw.upgrades?.[key])
        ? Math.max(0, Math.min(3, Math.floor(raw.upgrades[key])))
        : 0;
    const unlocked = [
      "leaf",
      ...(s.defeated.includes("pain") ? ["namek"] : []),
      ...(s.defeated.includes("frieza") ? ["rift"] : []),
    ];
    s.region = unlocked.includes(raw.region) ? raw.region : "leaf";
    const r = REGIONS.find((r) => r.id === s.region);
    s.x = Number.isFinite(raw.x)
      ? Math.max(40, Math.min(r.width - 40, raw.x))
      : 220;
    s.introSeen = raw.introSeen === true;
    return s;
  } catch {
    return emptySave();
  }
}
export class Campaign {
  constructor(storage) {
    this.storage = storage;
    this.save = readSave(storage);
    this.time = 0;
    this.resetPlayer();
    this.notice = "";
    this.noticeTime = 0;
    this.saveAvailable = !!storage && typeof storage.setItem === "function";
    this.worldHP = 100;
    this.worldEnergy = 100;
    this.attackCooldown = 0;
    this.invincible = 0;
    this.strike = 0;
    this.worldEffects = [];
    this.resetPatrols();
  }
  resetPatrols() {
    this.patrols = Array.from({ length: 3 }, (_, i) => ({
      id: this.region.id + ":echo:" + i,
      x: 850 + i * 850,
      home: 850 + i * 850,
      hp: 2,
      cool: 0,
    })).filter((e) => !this.save.patrols.includes(e.id));
  }
  get region() {
    return REGIONS.find((r) => r.id === this.save.region);
  }
  get nextBoss() {
    return (
      ["sasuke", "pain", "frieza", "broly"].find(
        (id) => !this.save.defeated.includes(id),
      ) || null
    );
  }
  resetPlayer() {
    this.player = {
      x: this.save.x,
      y: this.region.ground,
      vx: 0,
      vy: 0,
      facing: 1,
      jumps: 0,
      grounded: true,
    };
    this.previous = {};
    this.checkpoint = this.region.camps.reduce(
      (a, b) => (Math.abs(b - this.save.x) < Math.abs(a - this.save.x) ? b : a),
      this.region.camps[0],
    );
  }
  persist() {
    this.save.x = this.player.x;
    try {
      this.storage?.setItem(SAVE_KEY, JSON.stringify(this.save));
    } catch {
      this.saveAvailable = false;
    }
  }
  message(text) {
    this.notice = text;
    this.noticeTime = 3;
  }
  unlock(id) {
    return (
      id === "leaf" ||
      (id === "namek" && this.save.defeated.includes("pain")) ||
      (id === "rift" && this.save.defeated.includes("frieza"))
    );
  }
  travel(id) {
    if (!this.unlock(id)) return false;
    this.save.region = id;
    this.save.x = 220;
    this.resetPlayer();
    this.resetPatrols();
    this.worldHP = 100;
    this.worldEnergy = 100;
    this.persist();
    return true;
  }
  collect(index) {
    const key = this.region.id + ":" + index;
    if (this.save.collected.includes(key)) return false;
    this.save.collected.push(key);
    this.save.shards++;
    this.message("RIFT FRAGMENT +1 · Visit a camp to upgrade");
    this.persist();
    return true;
  }
  purchase(key) {
    if (!Object.hasOwn(this.save.upgrades, key) || this.save.upgrades[key] >= 3)
      return false;
    const cost = 3 + this.save.upgrades[key];
    if (this.save.shards < cost) return false;
    this.save.shards -= cost;
    this.save.upgrades[key]++;
    this.persist();
    return true;
  }
  complete(id) {
    if (id !== this.nextBoss) return false;
    this.save.defeated.push(id);
    this.save.shards += 3;
    this.persist();
    return true;
  }
  interact() {
    const p = this.player,
      r = this.region;
    const objects = [
      ...r.camps.map((x) => ({ kind: "camp", x, name: "Rift Camp" })),
      ...r.npcs.map((n) => ({ kind: "npc", ...n })),
      ...r.gates.map((g) => ({
        kind: "gate",
        ...g,
        name: BOSSES[g.boss].title,
      })),
      { kind: "portal", x: r.width - 140, name: "World Gate" },
    ];
    return (
      objects
        .filter((o) => Math.abs(o.x - p.x) < 110 && p.y > r.ground - 110)
        .sort((a, b) => Math.abs(a.x - p.x) - Math.abs(b.x - p.x))[0] || null
    );
  }
  update(dt, input = {}) {
    this.time += dt;
    this.noticeTime = Math.max(0, this.noticeTime - dt);
    const p = this.player,
      r = this.region;
    const direction = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    p.vx = direction * (input.dodge ? 560 : 310);
    if (direction) p.facing = direction;
    if (input.jump && !this.previous.jump && p.jumps < 2) {
      p.vy = -640;
      p.jumps++;
      p.grounded = false;
    }
    if (
      input.special &&
      !this.previous.special &&
      input.up &&
      p.jumps > 0 &&
      p.jumps < 3
    ) {
      p.vy = -820;
      p.jumps = 3;
      p.grounded = false;
    }
    if (!input.jump && p.vy < -260) p.vy += 1250 * dt;
    const old = p.y;
    p.vy += 1500 * dt;
    p.x = Math.max(35, Math.min(r.width - 35, p.x + p.vx * dt));
    p.y += p.vy * dt;
    p.grounded = false;
    const platforms = [{ x: 0, y: r.ground, w: r.width }, ...r.platforms];
    for (const a of platforms)
      if (
        p.vy >= 0 &&
        old <= a.y + 2 &&
        p.y >= a.y &&
        p.x > a.x - 12 &&
        p.x < a.x + a.w + 12
      ) {
        p.y = a.y;
        p.vy = 0;
        p.grounded = true;
        p.jumps = 0;
        break;
      }
    for (const [i, s] of r.shards.entries())
      if (Math.abs(s.x - p.x) < 35 && Math.abs(s.y - (p.y - 35)) < 48)
        this.collect(i);
    if (p.y > 800) {
      p.x = this.checkpoint;
      p.y = r.ground;
      p.vy = 0;
    }
    for (const x of r.camps)
      if (Math.abs(p.x - x) < 70 && p.grounded) this.checkpoint = x;
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    this.invincible = Math.max(0, this.invincible - dt);
    this.strike = Math.max(0, this.strike - dt);
    this.worldEnergy = Math.min(100, this.worldEnergy + 18 * dt);
    this.worldEffects.forEach((e) => (e.life -= dt));
    this.worldEffects = this.worldEffects.filter((e) => e.life > 0);
    if (input.dodge && direction)
      this.invincible = Math.max(this.invincible, 0.08);
    if (
      this.attackCooldown <= 0 &&
      ((input.attack && !this.previous.attack) ||
        (input.special &&
          !input.up &&
          !this.previous.special &&
          this.worldEnergy >= 24))
    ) {
      const special = !!input.special;
      this.worldAttackKind = special ? "special" : "neutral";
      this.attackCooldown = special ? 0.55 : 0.28;
      this.strike = special ? 0.3 : 0.16;
      if (special) this.worldEnergy -= 24;
      for (const enemy of this.patrols) {
        const dx = enemy.x - p.x;
        if (
          Math.abs(dx) < (special ? 270 : 95) &&
          dx * p.facing > -20 &&
          p.y > r.ground - 105
        ) {
          enemy.hp -= special ? 2 : 1;
          enemy.x += p.facing * 35;
          this.worldEffects.push({
            x: enemy.x,
            y: r.ground - 35,
            life: 0.3,
            color: r.color,
          });
        }
      }
    }
    for (const enemy of this.patrols) {
      enemy.cool = Math.max(0, enemy.cool - dt);
      const dx = p.x - enemy.x;
      enemy.x +=
        Math.abs(dx) < 330
          ? Math.sign(dx) * 75 * dt
          : Math.sin(this.time + enemy.home) * 25 * dt;
      if (enemy.hp <= 0) {
        this.save.patrols.push(enemy.id);
        this.save.shards++;
        this.message("RIFT ECHO DISPERSED · +1 fragment");
        this.persist();
        continue;
      }
      if (Math.abs(dx) < 42 && p.y > r.ground - 75 && enemy.cool <= 0) {
        enemy.cool = 1.1;
        if (input.shield || this.invincible > 0) continue;
        this.worldHP -= 18;
        this.invincible = 0.6;
        p.x -= Math.sign(dx) * 35;
        this.worldEffects.push({
          x: p.x,
          y: p.y - 35,
          life: 0.35,
          color: "#ff8b8b",
        });
      }
    }
    this.patrols = this.patrols.filter((e) => e.hp > 0);
    if (this.worldHP <= 0) {
      p.x = this.checkpoint;
      p.y = r.ground;
      p.vy = 0;
      this.worldHP = 100;
      this.worldEnergy = 100;
      this.message("BACK AT CAMP · Your fragments and chapters are safe");
    }
    for (const x of r.camps)
      if (Math.abs(x - p.x) < 65 && p.grounded) {
        this.worldHP = 100;
        this.worldEnergy = 100;
      }
    this.previous = { ...input };
  }
}
export class BossArena extends Arena {
  constructor(id, upgrades = {}) {
    const b = BOSSES[id];
    super({
      p1: b.hero,
      p2: id,
      stage: b.stage,
      mode: "cpu",
      difficulty: id === "sasuke" ? "normal" : "hard",
    });
    this.stage = {
      ...this.stage,
      platforms: this.stage.platforms.map((p) => ({ ...p })),
    };
    if (id === "broly")
      this.stage = {
        id: "fracture",
        name: "The In-Between",
        platforms: [
          { x: 245, y: 510, w: 790, h: 55, main: true },
          { x: 355, y: 335, w: 190, h: 18 },
          { x: 735, y: 335, w: 190, h: 18 },
        ],
      };
    this.collapse = 0;
    this.brokenPlatforms = [];
    this.bossId = id;
    this.upgrades = { power: 0, focus: 0, vitality: 0, ...upgrades };
    this.time = 240;
    this.resonance = 35;
    this.phase = 1;
    this.patternTimer = 6;
    this.warning = null;
    this.riftFlash = 0;
    this.riftUsed = false;
    this.attackCount = 0;
    this.pressure = 0;
    this.previousRift = false;
    for (const f of this.fighters) {
      f.y = this.stage.platforms[0].y - f.h;
      f.grounded = true;
      f.platform = this.stage.platforms[0];
      f.stocks = f.slot === 0 ? 3 + this.upgrades.vitality : 2;
    }
  }
  startSpecial(f, input) {
    super.startSpecial(f, input);
    if (
      f.slot === 1 &&
      this.phase === 2 &&
      this.bossId === "frieza" &&
      f.attack?.kind === "beam"
    ) {
      f.attack.charge = 0.18;
      f.attack.projectileSpeed = 1250;
      f.attack.projectileDamage = 20;
    }
  }
  hit(target, source, damage, direction = "forward", strong = false) {
    const boosted =
      source.slot === 0
        ? Math.round(damage * (1.12 + this.upgrades.power * 0.12))
        : damage;
    const result = super.hit(target, source, boosted, direction, strong);
    if (result)
      this.resonance = Math.min(
        100,
        this.resonance + boosted * (source.slot === 0 ? 1.2 : 0.6),
      );
    return result;
  }
  ai(f, enemy, dt) {
    const input = { ...super.ai(f, enemy, dt) };
    if (
      ["frieza", "pain"].includes(this.bossId) &&
      Math.abs(enemy.cx - f.cx) > 150 &&
      Math.abs(enemy.cy - f.cy) < 100 &&
      f.energy > 30
    )
      input.special = true;
    if (f.slot === 1 && !f.grounded) {
      if (f.jumps === 1 && f.vy < -160) input.jump = true;
      if (f.jumps >= 2) input.jump = f.vy < -160;
    }
    if (
      f.slot === 1 &&
      enemy.cy < f.cy - 110 &&
      f.jumps >= 2 &&
      !f.grounded &&
      !f.recovery &&
      f.energy >= 24
    ) {
      input.up = true;
      input.special = true;
    }
    return input;
  }
  update(dt, inputs = [{}, {}]) {
    const input = inputs[0] || {};
    if (!this.paused && this.winner === null && this.countdown <= 0) {
      this.riftFlash = Math.max(0, this.riftFlash - dt);
      this.collapse = Math.max(0, this.collapse - dt);
      const [hero, boss] = this.fighters;
      hero.energy = Math.min(100, hero.energy + this.upgrades.focus * 7 * dt);
      if (
        input.rift &&
        !this.previousRift &&
        this.resonance >= 100 &&
        hero.respawn <= 0
      ) {
        this.resonance = 0;
        this.warning = null;
        this.patternTimer = 7;
        this.riftFlash = 0.8;
        this.riftUsed = true;
        hero.invincible = 0.8;
        boss.invincible = 0;
        hero.facing = boss.cx > hero.cx ? 1 : -1;
        this.hit(boss, hero, 28, "up", true);
        this.resonance = 0;
        this.event("riftbreak");
      }
      if (this.phase === 1 && (boss.stocks < 2 || boss.damage >= 85)) {
        this.phase = 2;
        boss.character = {
          ...boss.character,
          speed: boss.character.speed * 1.12,
        };
        if (this.bossId === "pain") {
          this.brokenPlatforms = this.stage.platforms.filter((p) => !p.main);
          this.stage.platforms = this.stage.platforms.filter((p) => p.main);
          this.collapse = 1.4;
          this.shake = 15;
          this.effect("damage", 640, 230, "#fff", 1.8, {
            text: "ROOFTOPS SHATTER",
          });
        }
        this.patternTimer = 2;
        this.effect("damage", boss.cx, boss.y, "#fff", 1.7, {
          text: "PHASE TWO",
        });
        this.event("phase");
      }
      this.patternTimer -= dt;
      if (!this.warning && this.patternTimer <= 0) {
        this.attackCount++;
        this.warning = {
          kind: this.bossId,
          x: hero.cx,
          y: hero.cy,
          t: 1.3,
          life: 0.4,
          fired: false,
        };
        this.patternTimer = this.phase === 2 ? 5 : 7;
        this.event("warning");
      }
      if (this.warning) {
        const w = this.warning;
        w.t -= dt;
        if (w.t <= 0 && !w.fired) {
          w.fired = true;
          this.pressure++;
          const floor = this.stage.platforms[0].y;
          let hit = false;
          if (w.kind === "frieza") hit = Math.abs(hero.cy - w.y) < 35;
          else if (w.kind === "pain")
            hit =
              Math.abs(hero.cx - w.x) < 190 && Math.abs(hero.cy - w.y) < 130;
          else if (w.kind === "broly")
            hit =
              [w.x - 240, w.x, w.x + 240].some(
                (x) => Math.abs(hero.cx - x) < 65,
              ) && hero.y + hero.h > floor - 130;
          else
            hit = Math.abs(hero.cx - w.x) < 140 && hero.y + hero.h > floor - 90;
          if (hit && hero.respawn <= 0) {
            boss.facing = hero.cx > boss.cx ? 1 : -1;
            this.hit(hero, boss, this.phase === 2 ? 17 : 12, "up", true);
          }
          this.shake = 12;
        }
        if (w.t < -0.4) this.warning = null;
      }
    }
    this.previousRift = !!input.rift;
    super.update(dt, inputs);
  }
}
