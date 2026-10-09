/** Authored encounter shots. Pure data/math: the browser owns rendering and audio. */
const DURATION = 7.2;
const SETUP_END = 2;
const ARRIVAL_END = 5;
const finite = (value, fallback = 0) =>
  Number.isFinite(value) ? value : fallback;
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const smooth = (t) => {
  t = clamp(t, 0, 1);
  return t * t * (3 - 2 * t);
};
const mix = (a, b, t) => a + (b - a) * t;
const mix3 = (a, b, t) => a.map((value, i) => mix(value, b[i], t));

const ENCOUNTERS = {
  sasuke: {
    titles: ["PATROL SIGNAL LOST", "A RIVAL IN THE FRACTURE", "OLD BONDS"],
    dialogue: [
      [
        "Kakashi",
        "A patrol flare went dark. Naruto, something is moving ahead.",
      ],
      ["Sasuke", "Stay back. That signal is wearing your chakra."],
      ["Naruto", "Look at me, Sasuke. We break the false signal together."],
    ],
    arrival: [-10, 4.8, -7],
    arc: 3,
    pose: "jump",
    cues: [
      {
        at: 0.2,
        kind: "rift",
        local: [2, 0.3, -3],
        color: "#a897ff",
        radius: 2,
      },
      {
        at: 2.15,
        kind: "dust",
        local: [-10, 4.5, -7],
        color: "#e5c59b",
        radius: 1.3,
      },
      {
        at: 4.8,
        kind: "dust",
        local: [0, 0.1, 0],
        color: "#e5c59b",
        radius: 2.6,
      },
      {
        at: 5.5,
        kind: "rift",
        local: [0, 1.2, 0.3],
        color: "#88caff",
        radius: 0.8,
      },
    ],
  },
  pain: {
    titles: [
      "THE EARTH LOSES ITS WEIGHT",
      "A VOICE ABOVE THE DUST",
      "THE VILLAGE THAT REMAINS",
    ],
    dialogue: [
      ["Kakashi", "The evacuation road is lifting. Get clear of the tremor!"],
      ["Pain", "Your village will remember the weight of its choices."],
      ["Naruto", "Everyone is getting out. You are not taking this street."],
    ],
    arrival: [0, 8.5, -1],
    arc: 0,
    pose: "special",
    cues: [
      {
        at: 0.15,
        kind: "dust",
        local: [0, 0.1, 2],
        color: "#e5b28a",
        radius: 6,
      },
      {
        at: 0.8,
        kind: "shockwave",
        local: [0, 0.15, 0],
        color: "#e7a189",
        radius: 8,
      },
      {
        at: 2.15,
        kind: "rift",
        local: [0, 7.5, -1],
        color: "#ff987b",
        radius: 2.5,
      },
      {
        at: 4.9,
        kind: "shockwave",
        local: [0, 0.15, 0],
        color: "#ffb89c",
        radius: 6,
      },
    ],
  },
  frieza: {
    titles: [
      "THE LAST TRANSPORT",
      "THE EMPEROR DESCENDS",
      "THE EMPEROR OF NOTHING",
    ],
    dialogue: [
      ["Dende", "The refugee transport crashed. His energy is above you!"],
      ["Frieza", "A road to another universe. How generous of you."],
      ["Goku", "Dende, get the survivors out. I have got this."],
    ],
    arrival: [6, 7, -5],
    arc: 1,
    pose: "special",
    cues: [
      {
        at: 0.15,
        kind: "dust",
        local: [-3, 0.2, 4],
        color: "#8bccb9",
        radius: 4,
      },
      {
        at: 2.1,
        kind: "rift",
        local: [6, 6, -5],
        color: "#dd8dff",
        radius: 2.7,
      },
      {
        at: 4.85,
        kind: "shockwave",
        local: [0, 0.2, 0],
        color: "#eac8ff",
        radius: 2.4,
      },
    ],
  },
  broly: {
    titles: [
      "A HEARTBEAT INSIDE THE FRACTURE",
      "THE RIFT BREAKS OPEN",
      "TWO WORLDS, ONE HEARTBEAT",
    ],
    dialogue: [
      ["Dende", "Broly is inside the fracture. Every pulse tears him apart."],
      ["Goku", "Broly! Listen to my voice. We are getting you out."],
      ["Naruto", "I can reach you. Break the rift, not the man."],
    ],
    arrival: [0, 0.3, -6],
    arc: 4.5,
    pose: "jump",
    cues: [
      {
        at: 0.15,
        kind: "rift",
        local: [0, 1.2, -4],
        color: "#b2fc79",
        radius: 4,
      },
      {
        at: 1.1,
        kind: "shockwave",
        local: [0, 0.15, 0],
        color: "#b2fc79",
        radius: 8,
      },
      {
        at: 4.75,
        kind: "dust",
        local: [0, 0.15, 0],
        color: "#99bfa4",
        radius: 5,
      },
      {
        at: 5.4,
        kind: "rift",
        local: [0, 1.5, 0],
        color: "#ba82ff",
        radius: 3,
      },
    ],
  },
};

export class EncounterDirector {
  constructor() {
    this._id = null;
    this._active = false;
    this._done = false;
    this.elapsed = 0;
    this._cueIndex = 0;
    this._context = null;
  }

  get active() {
    return this._active;
  }
  get id() {
    return this._id;
  }
  get duration() {
    return this._id ? DURATION : 0;
  }

  begin(id, context = {}) {
    if (!ENCOUNTERS[id]) return false;
    const copy = (point) => ({
      x: finite(point?.x),
      y: finite(point?.y),
      z: finite(point?.z),
    });
    const player = copy(context.player),
      quest = copy(context.quest);
    let dx = player.x - quest.x,
      dz = player.z - quest.z;
    const length = Math.hypot(dx, dz);
    if (length < 0.001) {
      dx = 0;
      dz = 1;
    } else {
      dx /= length;
      dz /= length;
    }
    this._context = {
      player,
      quest,
      forward: { x: dx, z: dz },
      right: { x: dz, z: -dx },
    };
    this._id = id;
    this._active = true;
    this._done = false;
    this.elapsed = 0;
    this._cueIndex = 0;
    return this._frame([]);
  }

  update(dt = 0) {
    if (!this._id || !this._active) return this._frame([]);
    this.elapsed = clamp(this.elapsed + Math.max(0, finite(dt)), 0, DURATION);
    const cues = [];
    const authored = ENCOUNTERS[this._id].cues;
    while (
      this._cueIndex < authored.length &&
      authored[this._cueIndex].at <= this.elapsed
    ) {
      const cue = authored[this._cueIndex++];
      const [x, y, z] = this._local(cue.local);
      cues.push({
        kind: cue.kind,
        x,
        y,
        z,
        color: cue.color,
        radius: cue.radius,
      });
    }
    if (this.elapsed === DURATION) {
      this._active = false;
      this._done = true;
    }
    return this._frame(cues);
  }

  skip() {
    if (!this._id) return this._frame([]);
    this.elapsed = DURATION;
    this._active = false;
    this._done = true;
    this._cueIndex = ENCOUNTERS[this._id].cues.length;
    return this._frame([]);
  }

  _local([side, height, forward]) {
    const { quest, right, forward: facing } = this._context;
    return [
      quest.x + right.x * side + facing.x * forward,
      quest.y + height,
      quest.z + right.z * side + facing.z * forward,
    ];
  }

  _frame(cues) {
    if (!this._id)
      return {
        id: null,
        active: false,
        done: false,
        time: 0,
        duration: 0,
        shot: null,
        camera: { position: [0, 3, 8], target: [0, 1, 0] },
        rival: { position: [0, 0, 0], yaw: 0, pose: "idle", visible: false },
        title: "",
        speaker: "",
        text: "",
        cues,
      };
    const encounter = ENCOUNTERS[this._id];
    const { player, quest, forward } = this._context;
    const stage =
      this.elapsed < SETUP_END ? 0 : this.elapsed < ARRIVAL_END ? 1 : 2;
    const progress = smooth(
      stage === 0
        ? this.elapsed / SETUP_END
        : stage === 1
          ? (this.elapsed - SETUP_END) / (ARRIVAL_END - SETUP_END)
          : (this.elapsed - ARRIVAL_END) / (DURATION - ARRIVAL_END),
    );
    const arrivalProgress = clamp(
      (this.elapsed - SETUP_END) / (ARRIVAL_END - SETUP_END),
      0,
      1,
    );
    const landing = smooth(arrivalProgress);
    const rivalLocal = encounter.arrival.map((value) => value * (1 - landing));
    if (arrivalProgress > 0 && arrivalProgress < 1)
      rivalLocal[1] += Math.sin(Math.PI * arrivalProgress) * encounter.arc;
    const rivalPosition = this._local(rivalLocal);
    let cameraPosition, cameraTarget;
    if (stage === 0) {
      cameraPosition = this._local(mix3([6, 3.6, 16], [4, 2.8, 11], progress));
      cameraTarget = [
        mix(player.x, quest.x, 0.62),
        mix(player.y, quest.y, 0.62) + 1.3,
        mix(player.z, quest.z, 0.62),
      ];
    } else if (stage === 1) {
      cameraPosition = this._local(mix3([-10, 7, 11], [-7, 3.8, 8], progress));
      cameraTarget = [
        mix(rivalPosition[0], player.x, 0.14),
        rivalPosition[1] + 1.1,
        mix(rivalPosition[2], player.z, 0.14),
      ];
    } else {
      cameraPosition = this._local(mix3([6, 2.8, 7], [4.6, 2.3, 6], progress));
      cameraTarget = [quest.x, quest.y + 1.5, quest.z];
    }
    const [speaker, text] = encounter.dialogue[stage];
    return {
      id: this._id,
      active: this._active,
      done: this._done,
      time: this.elapsed,
      duration: DURATION,
      shot: ["setup", "arrival", "confrontation"][stage],
      camera: { position: cameraPosition, target: cameraTarget },
      rival: {
        position: rivalPosition,
        yaw: Math.atan2(forward.x, forward.z),
        pose: this._done
          ? "idle"
          : stage === 1
            ? encounter.pose
            : stage === 2
              ? "special"
              : "idle",
        visible: stage > 0,
      },
      title: encounter.titles[stage],
      speaker,
      text,
      cues,
    };
  }
}
