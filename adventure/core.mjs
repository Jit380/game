/** Pure, renderer-independent simulation for the third-person story adventure. */
export const SAVE_KEY = "anime-brawl-3d-adventure-v1";
export const REGIONS = [
  {
    id: "leaf",
    name: "Hidden Leaf Village",
    subtitle: "THE SKY BETWEEN WORLDS",
    hero: "naruto",
    color: "#ffba63",
    camp: { x: 0, y: 0, z: 30 },
    gate: { x: 0, y: 0, z: -78 },
    npc: { id: "kakashi", name: "Kakashi", x: -5, y: 0, z: 27 },
    fragments: [
      { x: -9, y: 0.8, z: 19 },
      { x: 13, y: 0.8, z: 10 },
      { x: -24, y: 0.8, z: -9 },
      { x: 48, y: 0.8, z: -7 },
      { x: -60, y: 0.8, z: -30 },
      { x: 6, y: 0.8, z: -65 },
    ],
  },
  {
    id: "namek",
    name: "Namek",
    subtitle: "ANOTHER WORLD ANSWERS",
    hero: "goku",
    color: "#80e6ce",
    camp: { x: 0, y: 0, z: 30 },
    gate: { x: 0, y: 0, z: -78 },
    npc: { id: "dende", name: "Dende", x: -5, y: 0, z: 27 },
    fragments: [
      { x: -10, y: 0.8, z: 18 },
      { x: 15, y: 0.8, z: 5 },
      { x: -24, y: 0.8, z: -12 },
      { x: 55, y: 0.8, z: -16 },
      { x: -63, y: 0.8, z: -37 },
      { x: 5, y: 0.8, z: -68 },
    ],
  },
];

export const QUESTS = [
  {
    id: "sasuke",
    name: "Sasuke",
    region: "leaf",
    x: 30,
    y: 0,
    z: -20,
    title: "OLD BONDS",
    locationLabel: "Lost patrol signal",
    objective: "Investigate the missing patrol's last signal",
    predicament:
      "A patrol flare dies at the training grounds. Something is wearing Naruto's chakra.",
    hp: 300,
    damage: 13,
    color: "#8989ff",
    ability: "CHIDORI",
    intro: [
      [
        "Sasuke",
        "Three patrols vanished. The thing that took them was wearing your chakra.",
      ],
      [
        "Naruto",
        "Then look at me. We break the false signal, not the village.",
      ],
    ],
    outro: [
      [
        "Sasuke",
        "The echoes were not you. Someone is copying two worlds. I can feel the other one.",
      ],
      ["Naruto", "Then I am going to find them. Stay with the village."],
    ],
  },
  {
    id: "pain",
    name: "Pain",
    region: "leaf",
    x: -48,
    y: 0,
    z: -48,
    title: "THE VILLAGE THAT REMAINS",
    locationLabel: "Gravity tremor",
    objective: "Reach the gravity tremor beyond the village",
    predicament:
      "The street rises beneath the evacuation route. A voice speaks from above the dust.",
    hp: 420,
    damage: 17,
    color: "#ff8973",
    ability: "ALMIGHTY PUSH",
    intro: [
      [
        "Pain",
        "A world that forgets its pain will feel the weight of it again.",
      ],
      [
        "Naruto",
        "Kakashi is getting everyone clear. You are not taking another street from them.",
      ],
    ],
    outro: [
      ["Naruto", "That green sky… there is a whole world on the other side."],
      [
        "Kakashi",
        "The northern gate is open. Someone there is waiting for your answer.",
      ],
    ],
  },
  {
    id: "frieza",
    name: "Frieza",
    region: "namek",
    x: 36,
    y: 0,
    z: -30,
    title: "THE EMPEROR OF NOTHING",
    locationLabel: "Refugee distress call",
    objective: "Answer Dende's distress call at the crashed transport",
    predicament:
      "A refugee transport falls silent. Above its wreckage, Frieza studies the new sky.",
    hp: 450,
    damage: 18,
    color: "#dc93ff",
    ability: "DEATH BEAM",
    intro: [
      [
        "Frieza",
        "Your refugees found a passage between worlds. Imagine how many planets I could own.",
      ],
      ["Goku", "Dende, get the survivors out. Frieza, your road ends here."],
    ],
    outro: [
      ["Goku", "The rift is still growing. That enormous energy… Broly!"],
      [
        "Dende",
        "He is trapped inside the fracture. Reach him before it consumes him.",
      ],
    ],
  },
  {
    id: "broly",
    name: "Broly",
    region: "namek",
    x: -42,
    y: 0,
    z: -55,
    title: "TWO WORLDS, ONE HEARTBEAT",
    locationLabel: "Seismic fracture",
    objective: "Follow the seismic pulses and rescue Broly",
    predicament:
      "Each pulse splits the plain. Broly is trapped inside the fracture, fighting to escape.",
    hp: 600,
    damage: 21,
    color: "#a6ff72",
    ability: "RIFT ERUPTION",
    intro: [
      [
        "Goku",
        "He is not the source. The fracture is turning his power against him.",
      ],
      [
        "Naruto",
        "I can hear you from the other side. We finish this together!",
      ],
    ],
    outro: [
      ["Broly", "The noise… it stopped."],
      ["Naruto", "Different worlds. Same promise. Nobody carries this alone."],
      ["Goku", "Next time we meet, we are training. No universe to save."],
    ],
  },
];

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const finite = (n, fallback = 0) => (Number.isFinite(n) ? n : fallback);
const ECHO_SPAWNS = [
  { x: 40, z: 30 },
  { x: -25, z: 10 },
  { x: 65, z: -60 },
];
const freshProgress = () => ({
  version: 1,
  region: "leaf",
  completed: [],
  shards: 0,
  fragments: [],
  echoes: [],
  introSeen: false,
  upgrades: { power: 0, vitality: 0, energy: 0 },
});
const defaultSpawn = { x: 0, y: 0, z: 36 };

export class Adventure {
  constructor(storage = null) {
    this.storage = storage;
    this.saveAvailable = !!storage;
    this.progress = freshProgress();
    try {
      const stored = JSON.parse(storage?.getItem(SAVE_KEY) || "null");
      if (stored?.version === 1) {
        const completed = Array.isArray(stored.completed)
          ? stored.completed
          : [];
        for (const quest of QUESTS) {
          if (!completed.includes(quest.id)) break;
          this.progress.completed.push(quest.id);
        }
        this.progress.region =
          stored.region === "namek" && this.progress.completed.includes("pain")
            ? "namek"
            : "leaf";
        this.progress.shards = clamp(Math.floor(finite(stored.shards)), 0, 99);
        this.progress.fragments = [
          ...new Set(
            (Array.isArray(stored.fragments) ? stored.fragments : []).filter(
              (id) =>
                REGIONS.some((r) =>
                  r.fragments.some((_, i) => id === `${r.id}:${i}`),
                ),
            ),
          ),
        ];
        this.progress.echoes = [
          ...new Set(
            (Array.isArray(stored.echoes) ? stored.echoes : []).filter((id) =>
              REGIONS.some((r) =>
                ECHO_SPAWNS.some((_, i) => id === `${r.id}:echo:${i}`),
              ),
            ),
          ),
        ];
        this.progress.introSeen = stored.introSeen === true;
        for (const kind of Object.keys(this.progress.upgrades))
          this.progress.upgrades[kind] = clamp(
            Math.floor(finite(stored.upgrades?.[kind])),
            0,
            3,
          );
      }
    } catch {
      /* Invalid or unavailable storage never blocks the game. */
    }
    this.world = { colliders: [], platforms: [], spawn: { ...defaultSpawn } };
    this.player = {
      ...defaultSpawn,
      vx: 0,
      vy: 0,
      vz: 0,
      yaw: Math.PI,
      hp: this.maxHP,
      energy: this.maxEnergy,
      grounded: true,
      jumps: 0,
      action: "idle",
      attackTimer: 0,
      specialTimer: 0,
      dashTime: 0,
      hurtTimer: 0,
    };
    this.cameraYaw = 0;
    this.state = this.ending ? "ending" : "exploring";
    this.currentBoss = null;
    this.events = [];
    this.time = 0;
    this.attackCooldown = 0;
    this.specialCooldown = 0;
    this.dashCooldown = 0;
    this.riftCooldown = 0;
    this.invincible = 0;
    this.jumpBuffer = 0;
    this.coyote = 0.12;
    this.combo = 0;
    this.comboTimer = 0;
    this.resonance = 0;
    this.enemies = [];
    this.spawnEchoes();
    this._held = {};
  }

  get region() {
    return REGIONS.find((r) => r.id === this.progress.region);
  }
  get hero() {
    return this.region.hero;
  }
  get shards() {
    return this.progress.shards;
  }
  get upgrades() {
    return this.progress.upgrades;
  }
  get maxHP() {
    return 100 + this.upgrades.vitality * 20;
  }
  get maxEnergy() {
    return 100 + this.upgrades.energy * 20;
  }
  get nextQuest() {
    return QUESTS.find((q) => !this.progress.completed.includes(q.id)) || null;
  }
  get ending() {
    return this.progress.completed.length === QUESTS.length;
  }
  get fragments() {
    return this.region.fragments.map((f, i) => ({
      ...f,
      id: `${this.region.id}:${i}`,
      collected: this.progress.fragments.includes(`${this.region.id}:${i}`),
    }));
  }
  get target() {
    if (this.currentBoss)
      return {
        ...this.currentBoss,
        type: "boss",
        text: `Defeat ${this.currentBoss.name}`,
      };
    if (this.nextQuest?.region === this.region.id)
      return {
        ...this.nextQuest,
        type: "quest",
        name: this.nextQuest.locationLabel,
        text: this.nextQuest.objective,
      };
    if (this.nextQuest)
      return {
        ...this.region.gate,
        type: "gate",
        id: "gate",
        name: "World Gate",
        text: "Enter the northern gate to Namek",
      };
    return {
      ...this.region.camp,
      type: "camp",
      id: "camp",
      name: "Camp",
      text: "Worlds restored. Explore or return to camp.",
    };
  }
  get nearInteract() {
    if (this.state === "defeated" || this.currentBoss) return null;
    const choices = [
      {
        ...this.region.camp,
        type: "camp",
        id: "camp",
        name: "Camp",
        text: "Rest & upgrade",
      },
      {
        ...this.region.gate,
        type: "gate",
        id: "gate",
        name: "World Gate",
        locked:
          this.region.id === "leaf" &&
          !this.progress.completed.includes("pain"),
        text:
          this.region.id === "leaf"
            ? "Travel to Namek"
            : "Return to Hidden Leaf",
      },
      { ...this.region.npc, type: "npc", text: "Talk" },
    ];
    if (this.nextQuest?.region === this.region.id)
      choices.push({
        ...this.nextQuest,
        type: "quest",
        text: `Challenge ${this.nextQuest.name}`,
      });
    return (
      choices
        .filter(
          (t) =>
            distance(t, this.player) <= (t.type === "npc" ? 3.5 : 7) &&
            Math.abs(this.player.y - t.y) < 3,
        )
        .sort(
          (a, b) => distance(a, this.player) - distance(b, this.player),
        )[0] || null
    );
  }

  emit(type, detail = {}) {
    this.events.push({ type, ...detail });
    if (this.events.length > 100)
      this.events.splice(0, this.events.length - 100);
  }

  spawnEchoes() {
    this.enemies = ECHO_SPAWNS.map((spawn, i) => ({
      ...spawn,
      y: 0,
      id: `${this.region.id}:echo:${i}`,
      name: "Rift Echo",
      hero: this.region.id === "leaf" ? "sasuke" : "frieza",
      hp: 36,
      maxHp: 36,
      home: { ...spawn },
      yaw: Math.PI,
      action: "idle",
      attackTimer: 0,
      hurtTimer: 0,
      flash: 0,
      cooldown: 1.4,
      telegraph: null,
    })).filter((e) => !this.progress.echoes.includes(e.id));
  }

  setWorld(world = {}) {
    const shapes = (shapes) =>
      (Array.isArray(shapes) ? shapes : [])
        .filter(
          (s) =>
            [s.x, s.z, s.w, s.d, s.h].every(Number.isFinite) &&
            s.w > 0 &&
            s.d > 0 &&
            s.h >= 0,
        )
        .map((s) => ({ ...s }));
    this.world = {
      colliders: shapes(world.colliders),
      platforms: shapes(world.platforms),
      spawn: { ...defaultSpawn, ...world.spawn },
    };
    Object.assign(this.player, this.world.spawn, {
      vx: 0,
      vy: 0,
      vz: 0,
      grounded: this.world.spawn.y === 0,
      jumps: 0,
    });
    return this;
  }

  persist() {
    try {
      if (!this.storage) return false;
      this.storage.setItem(SAVE_KEY, JSON.stringify(this.progress));
      this.saveAvailable = true;
      return true;
    } catch {
      this.saveAvailable = false;
      return false;
    }
  }
  save() {
    return this.persist();
  }
  markIntroSeen() {
    this.progress.introSeen = true;
    this.persist();
  }
  reset() {
    this.progress = freshProgress();
    this.resonance = 0;
    this.riftCooldown = 0;
    this.currentBoss = null;
    this.state = "exploring";
    this.world = { colliders: [], platforms: [], spawn: { ...defaultSpawn } };
    this.spawnEchoes();
    this.retry();
    this.persist();
    this.emit("travel", { region: "leaf", reset: true });
  }

  travel(id) {
    if (
      !REGIONS.some((r) => r.id === id) ||
      this.currentBoss ||
      (id === "namek" && !this.progress.completed.includes("pain"))
    )
      return false;
    this.progress.region = id;
    this.world = { colliders: [], platforms: [], spawn: { ...defaultSpawn } };
    this.spawnEchoes();
    this.retry();
    this.persist();
    this.emit("travel", { region: id });
    return true;
  }

  retry() {
    this.currentBoss = null;
    Object.assign(this.player, this.world.spawn, {
      hp: this.maxHP,
      energy: this.maxEnergy,
      vx: 0,
      vy: 0,
      vz: 0,
      jumps: 0,
      grounded: this.world.spawn.y === 0,
      action: "idle",
      dashTime: 0,
      attackTimer: 0,
      specialTimer: 0,
      hurtTimer: 0,
    });
    this.state = this.ending ? "ending" : "exploring";
    this.invincible = 1;
    this.attackCooldown = this.specialCooldown = this.dashCooldown = 0;
    this.jumpBuffer = 0;
    this.coyote = 0.12;
    this.combo = 0;
    this.comboTimer = 0;
    this.spawnEchoes();
    this._held = {};
    this.emit("retry");
    return true;
  }

  purchaseUpgrade(kind) {
    if (
      !(kind in this.upgrades) ||
      this.upgrades[kind] >= 3 ||
      this.currentBoss ||
      distance(this.player, this.region.camp) > 8
    )
      return false;
    const price = 3 + 2 * this.upgrades[kind];
    if (this.shards < price) return false;
    this.progress.shards -= price;
    this.upgrades[kind]++;
    this.player.hp = this.maxHP;
    this.player.energy = this.maxEnergy;
    this.persist();
    this.emit("upgrade", { kind, level: this.upgrades[kind], price });
    return true;
  }

  interact() {
    const target = this.nearInteract;
    if (!target) return false;
    if (target.type === "quest") {
      this.startBoss(target.id, { trigger: "interact" });
      return target;
    }
    if (target.type === "camp") {
      this.player.hp = this.maxHP;
      this.player.energy = this.maxEnergy;
      this.persist();
      this.emit("camp", {
        text: "Your allies hold the line. Rest, then choose an upgrade.",
      });
    } else if (target.type === "gate") {
      if (target.locked)
        this.emit("message", {
          text: "Defeat Pain to open the gate between worlds.",
        });
      else this.travel(this.region.id === "leaf" ? "namek" : "leaf");
    } else {
      this.emit("dialogue", {
        name: target.name,
        lines:
          this.region.id === "leaf"
            ? [
                "The violet fragments carry the power of both worlds. Bring them to camp.",
                this.nextQuest?.id === "sasuke"
                  ? "A patrol flare went dark at the eastern training grounds. Find out what happened."
                  : "The evacuation road is lifting in the northwest district. Reach the tremor before it spreads.",
              ]
            : [
                "Namek is answering the village on the other side. The worlds need both heroes.",
                this.nextQuest?.id === "frieza"
                  ? "Our refugee transport crashed on the eastern plain. Please, follow its distress signal."
                  : "The northwest fracture pulses with Broly's heartbeat. Reach him before it tears him apart.",
              ],
      });
    }
    return target;
  }

  startBoss(id, options = {}) {
    const quest = this.nextQuest;
    if (
      this.currentBoss ||
      !quest ||
      quest.id !== id ||
      quest.region !== this.region.id ||
      distance(quest, this.player) > (options.automatic ? 13.5 : 7)
    )
      return false;
    this.currentBoss = {
      ...quest,
      maxHp: quest.hp,
      phase: 1,
      telegraph: null,
      cooldown: 1.7,
      action: "idle",
      attackTimer: 0,
      flash: 0,
      yaw: 0,
      attacks: 0,
      vulnerable: 0,
      resisting: false,
      home: { x: quest.x, z: quest.z },
    };
    this.state = "combat";
    this.player.energy = this.maxEnergy;
    this.invincible = 1;
    this.emit("boss-start", {
      id,
      quest,
      lines: quest.intro,
      predicament: quest.predicament,
      trigger: options.automatic ? "approach" : options.trigger || "manual",
    });
    return true;
  }

  completeQuest(id) {
    if (this.nextQuest?.id !== id) return false;
    const quest = this.nextQuest;
    this.progress.completed.push(id);
    this.progress.shards = Math.min(99, this.shards + 5);
    this.currentBoss = null;
    this.player.hp = this.maxHP;
    this.player.energy = this.maxEnergy;
    this.state = this.ending ? "ending" : "exploring";
    this.persist();
    this.emit("quest-complete", { id, quest, reward: 5, lines: quest.outro });
    if (this.ending)
      this.emit("ending", {
        title: "TWO WORLDS. ONE PROMISE.",
        lines: quest.outro,
      });
    return true;
  }

  collect(id) {
    const fragment = this.fragments.find((f) => f.id === id);
    if (!fragment || fragment.collected) return false;
    this.progress.fragments.push(id);
    this.progress.shards = Math.min(99, this.shards + 1);
    this.persist();
    this.emit("fragment", { id, ...fragment });
    return true;
  }

  update(dt, input = {}) {
    dt = clamp(finite(dt), 0, 0.05);
    if (!dt || this.state === "defeated") return;
    this.time += dt;
    const p = this.player;
    for (const key of [
      "attackCooldown",
      "specialCooldown",
      "dashCooldown",
      "riftCooldown",
      "invincible",
      "comboTimer",
      "jumpBuffer",
    ])
      this[key] = Math.max(0, this[key] - dt);
    for (const key of ["attackTimer", "specialTimer", "dashTime", "hurtTimer"])
      p[key] = Math.max(0, p[key] - dt);
    if (p.grounded) this.coyote = 0.12;
    else this.coyote = Math.max(0, this.coyote - dt);
    if (input.jump && !this._held.jump) this.jumpBuffer = 0.13;
    if (this.jumpBuffer > 0 && (p.grounded || this.coyote > 0 || p.jumps < 2)) {
      p.jumps = p.grounded || this.coyote > 0 ? 1 : p.jumps + 1;
      p.vy = 12;
      p.grounded = false;
      this.coyote = 0;
      this.jumpBuffer = 0;
      this.emit("jump", { double: p.jumps === 2 });
    }
    const ix = finite(input.x),
      iz = finite(input.z),
      mag = Math.hypot(ix, iz);
    const nx = mag > 0 ? ix / Math.max(1, mag) : 0,
      nz = mag > 0 ? iz / Math.max(1, mag) : 0;
    if (mag > 0.05) p.yaw = Math.atan2(nx, nz);
    const climbing =
      !!input.jump &&
      !p.grounded &&
      p.energy > 0 &&
      p.vy < 6 &&
      this.world.colliders.some((s) => {
        if (p.y >= s.h - 0.05) return false;
        const closestX = clamp(p.x, s.x - s.w / 2, s.x + s.w / 2),
          closestZ = clamp(p.z, s.z - s.d / 2, s.z + s.d / 2);
        return (
          Math.hypot(p.x - closestX, p.z - closestZ) < 0.8 &&
          (closestX - p.x) * nx + (closestZ - p.z) * nz > 0.05
        );
      });
    if (climbing) {
      p.vy = 5.5;
      p.energy = Math.max(0, p.energy - 23 * dt);
    }
    if (
      input.dash &&
      !this._held.dash &&
      this.dashCooldown <= 0 &&
      p.energy >= 10
    ) {
      p.energy -= 10;
      p.dashTime = 0.23;
      this.dashCooldown = 0.65;
      this.invincible = Math.max(this.invincible, 0.3);
      this._dash = {
        x: mag > 0.05 ? nx : Math.sin(p.yaw),
        z: mag > 0.05 ? nz : Math.cos(p.yaw),
      };
      this.emit("dash", { x: p.x, y: p.y, z: p.z });
    }
    const guarding =
      !!input.guard && p.energy > 1 && p.grounded && p.dashTime <= 0;
    const speed = guarding ? 3 : input.sprint ? 14 : 8;
    p.vx = p.dashTime > 0 ? this._dash.x * 29 : nx * speed;
    p.vz = p.dashTime > 0 ? this._dash.z * 29 : nz * speed;
    const oldY = p.y;
    this.moveHorizontal(p, p.vx * dt, p.vz * dt);
    p.vy -= 25 * dt;
    p.y += p.vy * dt;
    p.grounded = false;
    let floor = 0;
    for (const shape of [...this.world.colliders, ...this.world.platforms]) {
      if (
        Math.abs(p.x - shape.x) <= shape.w / 2 + 0.25 &&
        Math.abs(p.z - shape.z) <= shape.d / 2 + 0.25 &&
        oldY >= shape.h - 0.08 &&
        p.y <= shape.h &&
        p.vy <= 0
      )
        floor = Math.max(floor, shape.h);
    }
    if (p.y <= floor) {
      p.y = floor;
      p.vy = 0;
      p.grounded = true;
      p.jumps = 0;
    }
    p.energy = clamp(
      p.energy +
        (climbing ? 0 : guarding ? -12 : 9 + this.upgrades.energy * 2) * dt,
      0,
      this.maxEnergy,
    );
    p.action =
      p.hurtTimer > 0
        ? "hurt"
        : p.dashTime > 0
          ? "dash"
          : p.specialTimer > 0
            ? "special"
            : p.attackTimer > 0
              ? "attack"
              : climbing
                ? "climb"
                : guarding
                  ? "guard"
                  : !p.grounded
                    ? "jump"
                    : mag > 0.05
                      ? "run"
                      : "idle";
    if (input.attack && this.attackCooldown <= 0 && !guarding)
      this.attack(false);
    if (input.special && this.specialCooldown <= 0 && !guarding)
      this.attack(true);
    if (
      (input.rift || input.ultimate) &&
      !this._held.rift &&
      this.riftCooldown <= 0 &&
      this.currentBoss &&
      this.resonance >= 100
    ) {
      this.resonance = 0;
      this.riftCooldown = 12;
      this.currentBoss.telegraph = null;
      this.currentBoss.cooldown = 2.5;
      this.invincible = 1.5;
      this.damageBoss(38 + this.upgrades.power * 5, "rift");
      this.emit("rift", {
        hero: this.hero,
        ally: this.hero === "goku" ? "naruto" : "goku",
        x: p.x,
        y: p.y,
        z: p.z,
      });
    }
    if (this.currentBoss) this.updateBoss(dt, guarding);
    else this.updateEchoes(dt, guarding);
    for (const f of this.fragments)
      if (!f.collected && distance(p, f) < 1.7 && Math.abs(p.y + 0.8 - f.y) < 2)
        this.collect(f.id);
    if (input.interact && !this._held.interact) this.interact();
    this._held = {
      jump: !!input.jump,
      dash: !!input.dash,
      interact: !!input.interact,
      rift: !!(input.rift || input.ultimate),
    };
    const encounter = this.nextQuest;
    if (
      !this.currentBoss &&
      this.state === "exploring" &&
      encounter?.region === this.region.id &&
      distance(encounter, p) <= 13.5 &&
      p.grounded &&
      Math.abs(p.y - encounter.y) <= 0.6
    )
      this.startBoss(encounter.id, { automatic: true });
  }

  moveHorizontal(actor, dx, dz) {
    const radius = 0.48;
    const overlap = (shape) =>
      actor.y < shape.h - 0.05 &&
      actor.y + 1.8 > 0 &&
      Math.abs(actor.x - shape.x) < shape.w / 2 + radius &&
      Math.abs(actor.z - shape.z) < shape.d / 2 + radius;
    actor.x = clamp(actor.x + dx, -98, 98);
    for (const shape of this.world.colliders) {
      if (!overlap(shape) || !dx) continue;
      actor.x =
        dx > 0
          ? shape.x - shape.w / 2 - radius
          : shape.x + shape.w / 2 + radius;
    }
    actor.z = clamp(actor.z + dz, -98, 98);
    for (const shape of this.world.colliders) {
      if (!overlap(shape) || !dz) continue;
      actor.z =
        dz > 0
          ? shape.z - shape.d / 2 - radius
          : shape.z + shape.d / 2 + radius;
    }
  }

  attack(special = false) {
    const p = this.player;
    if (
      this.state === "defeated" ||
      (special ? this.specialCooldown > 0 : this.attackCooldown > 0)
    )
      return false;
    if (special && p.energy < 25) {
      this.specialCooldown = 0.2;
      return false;
    }
    if (special) {
      p.energy -= 25;
      this.specialCooldown = 2;
      p.specialTimer = 0.5;
    } else {
      this.combo = this.comboTimer > 0 ? (this.combo % 3) + 1 : 1;
      this.comboTimer = 1.1;
      this.attackCooldown = this.combo === 3 ? 0.62 : 0.5;
      p.attackTimer = 0.25;
    }
    const boss =
      this.currentBoss ||
      [...this.enemies].sort((a, b) => distance(p, a) - distance(p, b))[0];
    const range = special ? 18 : 4.5;
    const inRange =
      boss &&
      distance(p, boss) <= range &&
      Math.abs(p.y - boss.y) < (special ? 12 : 4);
    if (boss && inRange) {
      p.yaw = Math.atan2(boss.x - p.x, boss.z - p.z);
      const damage = special
        ? this.hero === "goku"
          ? 25
          : 23
        : this.combo === 3
          ? 10
          : 6;
      const dealt = damage + this.upgrades.power * 3;
      if (this.currentBoss)
        this.damageBoss(dealt, special ? "special" : "melee");
      else this.damageEcho(boss, dealt, special ? "special" : "melee");
    }
    this.emit(special ? "special" : "attack", {
      hero: this.hero,
      x: p.x,
      y: p.y,
      z: p.z,
      yaw: p.yaw,
      combo: this.combo,
      hit: !!inRange,
    });
    return true;
  }

  damageBoss(damage, kind) {
    const b = this.currentBoss;
    if (!b) return;
    this.resonance = Math.min(
      100,
      this.resonance + (kind === "special" ? 18 : kind === "rift" ? 0 : 12),
    );
    const multiplier =
      kind === "rift" ? 1 : b.telegraph ? 0.45 : b.vulnerable > 0 ? 1.4 : 1;
    damage = Math.max(1, Math.round(damage * multiplier));
    b.hp = Math.max(0, b.hp - damage);
    b.flash = 0.18;
    if (kind !== "rift") {
      const length = Math.max(0.01, distance(this.player, b));
      const recoil = kind === "special" ? 0.45 : 0.9;
      this.moveHorizontal(
        b,
        ((b.x - this.player.x) / length) * recoil,
        ((b.z - this.player.z) / length) * recoil,
      );
    }
    this.emit("boss-hit", { id: b.id, damage, kind, x: b.x, y: b.y, z: b.z });
    if (b.hp <= 0) this.completeQuest(b.id);
  }

  damagePlayer(damage, guarding = false, from = null) {
    if (this.invincible > 0 || this.state === "defeated") return false;
    if (guarding && this.player.energy >= 12) {
      this.player.energy = Math.max(0, this.player.energy - 12);
      damage = Math.ceil(damage * 0.15);
      this.emit("guard", {
        x: this.player.x,
        y: this.player.y,
        z: this.player.z,
      });
    }
    this.player.hp = Math.max(0, this.player.hp - damage);
    this.player.hurtTimer = 0.3;
    this.invincible = 0.7;
    if (from && !guarding) {
      const length = Math.max(0.01, distance(this.player, from));
      this.moveHorizontal(
        this.player,
        ((this.player.x - from.x) / length) * 1.2,
        ((this.player.z - from.z) / length) * 1.2,
      );
    }
    this.emit("player-hit", { damage, guarded: guarding });
    if (this.player.hp <= 0) {
      this.state = "defeated";
      this.player.action = "defeated";
      this.emit("defeat", {
        boss: this.currentBoss?.id,
        text: "The camp is still there. Your progress is safe.",
      });
    }
    return true;
  }

  damageEcho(enemy, damage, kind) {
    enemy.hp = Math.max(0, enemy.hp - damage);
    enemy.flash = enemy.hurtTimer = 0.2;
    this.resonance = Math.min(
      100,
      this.resonance + (kind === "special" ? 15 : 10),
    );
    this.emit("enemy-hit", {
      id: enemy.id,
      damage,
      kind,
      x: enemy.x,
      y: enemy.y,
      z: enemy.z,
    });
    if (enemy.hp > 0) return;
    this.enemies = this.enemies.filter((e) => e !== enemy);
    this.progress.echoes.push(enemy.id);
    this.progress.shards = Math.min(99, this.shards + 1);
    this.persist();
    this.emit("enemy-defeated", {
      id: enemy.id,
      x: enemy.x,
      y: enemy.y,
      z: enemy.z,
      reward: 1,
    });
  }

  updateEchoes(dt, guarding) {
    const p = this.player;
    for (const e of this.enemies) {
      e.flash = Math.max(0, e.flash - dt);
      e.hurtTimer = Math.max(0, e.hurtTimer - dt);
      e.attackTimer = Math.max(0, e.attackTimer - dt);
      e.cooldown -= dt;
      if (e.telegraph) {
        e.action = "charge";
        e.telegraph.time -= dt;
        if (e.telegraph.time <= 0) {
          if (distance(p, e.telegraph) < e.telegraph.radius && p.y < 2.2)
            this.damagePlayer(e.telegraph.damage, guarding, e);
          this.emit("enemy-strike", { id: e.id, ...e.telegraph });
          e.telegraph = null;
          e.attackTimer = 0.4;
          e.cooldown = 1.7;
        }
        continue;
      }
      const dist = distance(p, e),
        homeDist = distance(p, e.home);
      if (dist < 11 && homeDist < 15) {
        e.yaw = Math.atan2(p.x - e.x, p.z - e.z);
        if (dist > 2.4) {
          this.moveHorizontal(
            e,
            ((p.x - e.x) / dist) * 3.8 * dt,
            ((p.z - e.z) / dist) * 3.8 * dt,
          );
          e.action = "run";
        } else if (e.cooldown <= 0) {
          e.telegraph = {
            kind: "slash",
            x: p.x,
            z: p.z,
            y: 0,
            radius: 2.5,
            time: 0.75,
            total: 0.75,
            damage: 8,
            color: "#b39bff",
          };
          e.action = "charge";
          this.emit("enemy-telegraph", { id: e.id, ...e.telegraph });
        } else e.action = e.attackTimer > 0 ? "attack" : "idle";
      } else {
        const distHome = distance(e, e.home);
        if (distHome > 0.3) {
          this.moveHorizontal(
            e,
            ((e.home.x - e.x) / distHome) * 2 * dt,
            ((e.home.z - e.z) / distHome) * 2 * dt,
          );
          e.action = "run";
        } else e.action = "idle";
      }
    }
  }

  updateBoss(dt, guarding) {
    const b = this.currentBoss;
    if (!b) return;
    const p = this.player;
    b.flash = Math.max(0, b.flash - dt);
    b.attackTimer = Math.max(0, b.attackTimer - dt);
    b.vulnerable = Math.max(0, b.vulnerable - dt);
    b.resisting = !!b.telegraph;
    if (b.hp <= b.maxHp * 0.5 && b.phase === 1) {
      b.phase = 2;
      b.cooldown = Math.min(b.cooldown, 0.65);
      this.emit("boss-phase", {
        id: b.id,
        phase: 2,
        name: b.name,
        ability: b.ability,
        text: `${b.name} is unleashing their full power!`,
      });
    }
    b.yaw = Math.atan2(p.x - b.x, p.z - b.z);
    if (b.telegraph) {
      b.action = "charge";
      b.telegraph.time -= dt;
      if (b.telegraph.time <= 0) {
        const hazard = b.telegraph;
        const inZone = distance(p, hazard) <= hazard.radius;
        const hitHeight = hazard.kind === "wave" ? p.y < 2.1 : true;
        this.emit("boss-strike", { id: b.id, ...hazard });
        if (inZone && hitHeight) this.damagePlayer(hazard.damage, guarding, b);
        else this.emit("evade", { id: b.id });
        b.telegraph = null;
        b.attackTimer = 0.5;
        b.vulnerable = 1;
        b.resisting = false;
        b.action = "attack";
        b.cooldown = b.phase === 2 ? 1.25 : 1.9;
      }
      return;
    }
    b.cooldown -= dt;
    const dist = distance(b, p);
    const tacticalRetreat =
      (b.id === "sasuke" || b.id === "frieza") &&
      dist < 6.5 &&
      b.cooldown > 0.75 &&
      b.vulnerable <= 0;
    if (tacticalRetreat && distance(b, b.home) < 17) {
      const direction = b.attacks % 2 === 0 ? 1 : -1;
      const awayX = (b.x - p.x) / Math.max(0.01, dist),
        awayZ = (b.z - p.z) / Math.max(0.01, dist);
      this.moveHorizontal(
        b,
        (awayX * 0.65 - awayZ * direction * 0.75) * 5.5 * dt,
        (awayZ * 0.65 + awayX * direction * 0.75) * 5.5 * dt,
      );
      b.action = "run";
    } else if (dist > 3.7 && distance(p, b.home) < 26) {
      const speed =
        (b.id === "sasuke" ? 6 : b.id === "broly" ? 4.6 : 4.2) *
        (b.phase === 2 ? 1.2 : 1);
      const old = { x: b.x, z: b.z };
      this.moveHorizontal(
        b,
        ((p.x - b.x) / dist) * speed * dt,
        ((p.z - b.z) / dist) * speed * dt,
      );
      if (distance(b, b.home) > 20) {
        b.x = old.x;
        b.z = old.z;
      }
      b.action = "run";
    } else b.action = b.attackTimer > 0 ? "attack" : "idle";
    if (b.cooldown <= 0 && dist < 26) {
      b.attacks++;
      const wave = b.id === "pain" || (b.id === "broly" && b.attacks % 2 === 0);
      const radius = wave
        ? b.phase === 2
          ? 7.5
          : 5.5
        : b.id === "sasuke"
          ? 3.7
          : 4.5;
      const kind = wave ? "wave" : b.id === "sasuke" ? "slash" : "column";
      const total = b.phase === 2 ? 0.72 : 1.05;
      b.telegraph = {
        kind,
        x: wave ? b.x : p.x,
        z: wave ? b.z : p.z,
        y: 0,
        radius,
        time: total,
        total,
        damage: b.damage + (b.phase === 2 ? 5 : 0),
        color: b.color,
      };
      b.action = "charge";
      b.resisting = true;
      this.emit("telegraph", { id: b.id, ...b.telegraph });
    }
  }
}
