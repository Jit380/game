const TAU = Math.PI * 2;
function shape(c, points, fill, stroke = "#172333", line = 2) {
  c.beginPath();
  points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.closePath();
  c.fillStyle = fill;
  c.fill();
  if (stroke) {
    c.strokeStyle = stroke;
    c.lineWidth = line;
    c.stroke();
  }
}
function oval(c, x, y, rx, ry, color, outline = true) {
  c.beginPath();
  c.ellipse(x, y, rx, ry, 0, 0, TAU);
  c.fillStyle = color;
  c.fill();
  if (outline) {
    c.lineWidth = 1.6;
    c.strokeStyle = "#162536";
    c.stroke();
  }
}
function line(c, x, y, xx, yy, color, width) {
  c.beginPath();
  c.moveTo(x, y);
  c.lineTo(xx, yy);
  c.strokeStyle = color;
  c.lineWidth = width;
  c.lineCap = "round";
  c.stroke();
}
export function drawFighter(c, id, x, y, scale = 1, pose = {}) {
  if (["midoriya", "ryuga", "pikachu"].includes(id))
    return drawNewFighter(c, id, x, y, scale, pose);
  const facing = pose.facing || 1,
    walk = pose.moving ? Math.sin((pose.time || 0) * 16) : 0,
    air = pose.air,
    attack = pose.attack;
  c.save();
  c.translate(x, y);
  c.scale(scale * facing, scale);
  if (pose.alpha !== undefined) c.globalAlpha = pose.alpha;
  c.lineJoin = "round";
  const skin = "#ffcc9b",
    shadow = "#d78a66",
    ink = "#152236",
    pants = id === "naruto" ? "#ff9639" : id === "goku" ? "#ed8930" : "#398ed5";
  // Back limbs and boots move separately, so attacks have a readable silhouette.
  const rearFoot = air ? -10 : -7 - walk * 7,
    frontFoot = air ? 10 : 7 + walk * 7;
  line(c, -5, -22, rearFoot, -5, ink, 10);
  line(c, -5, -22, rearFoot, -5, pants, 7);
  line(c, 5, -22, frontFoot, -5, ink, 10);
  line(c, 5, -22, frontFoot, -5, pants, 7);
  if (id === "luffy") {
    line(c, -5, -14, rearFoot, -4, skin, 5);
    line(c, 5, -14, frontFoot, -4, skin, 5);
  }
  oval(c, rearFoot + 1, -3, 6, 3, id === "luffy" ? "#795344" : "#243e70");
  oval(c, frontFoot + 2, -3, 6, 3, id === "luffy" ? "#795344" : "#243e70");
  // Rear arm.
  const backHand = air ? [-16, -49] : [-14 - walk * 4, -25 + walk * 4];
  line(c, -8, -41, ...backHand, ink, 8);
  line(
    c,
    -8,
    -41,
    ...backHand,
    id === "luffy" ? skin : id === "goku" ? "#f5a142" : "#26364c",
    5,
  );
  oval(c, ...backHand, 3.5, 4, skin);
  // Torso, tailored clothing and character-specific accents.
  shape(
    c,
    [
      [-9, -44],
      [9, -44],
      [11, -26],
      [8, -21],
      [-8, -21],
      [-11, -26],
    ],
    id === "luffy" ? skin : id === "naruto" ? "#26354a" : "#ff9f39",
  );
  if (id === "naruto") {
    shape(
      c,
      [
        [-9, -36],
        [9, -36],
        [10, -22],
        [-9, -22],
      ],
      "#ffad42",
    );
    line(c, 0, -44, 0, -22, "#e2d8c7", 1.5);
    line(c, -8, -31, -5, -31, "#fff0b4", 1.2);
    oval(c, 9, -39, 2.5, 2.5, "#e56b32");
  } else if (id === "goku") {
    shape(
      c,
      [
        [-7, -44],
        [0, -36],
        [7, -44],
        [4, -37],
        [0, -31],
        [-5, -38],
      ],
      "#244fc3",
    );
    line(c, -9, -23, 9, -23, "#285ac6", 5);
    oval(c, -5, -37, 3.8, 3.8, "#ffeed4");
    line(c, -6, -38, -4, -35, "#1c2c3b", 1);
    line(c, -7, -36, -3, -36, "#1c2c3b", 1);
  } else {
    shape(
      c,
      [
        [-10, -45],
        [-3, -43],
        [-5, -25],
        [-11, -24],
      ],
      "#f95765",
    );
    shape(
      c,
      [
        [4, -43],
        [10, -45],
        [11, -25],
        [5, -25],
      ],
      "#f95765",
    );
    line(c, -7, -22, 10, -22, "#edc469", 3);
    line(c, -4, -35, 1, -31, "#b67e5f", 1);
    line(c, 2, -35, -3, -31, "#b67e5f", 1);
  }
  // Neck and oversized anime face.
  oval(c, 0, -46, 4, 4, skin);
  oval(c, 0, -58, 10.5, 11.5, skin);
  shape(
    c,
    [
      [6, -49],
      [10, -55],
      [9, -62],
      [7, -59],
    ],
    shadow,
    null,
  );
  // Hair silhouettes are drawn as complete shapes, rather than hats on circles.
  if (id === "goku")
    shape(
      c,
      [
        [-10, -58],
        [-12, -68],
        [-20, -67],
        [-10, -74],
        [-14, -79],
        [-4, -76],
        [2, -84],
        [6, -77],
        [14, -80],
        [12, -72],
        [21, -72],
        [13, -64],
        [9, -58],
        [6, -64],
        [1, -63],
        [-3, -69],
        [-5, -61],
      ],
      "#263445",
    );
  if (id === "naruto") {
    shape(
      c,
      [
        [-10, -60],
        [-14, -69],
        [-8, -68],
        [-8, -76],
        [-2, -72],
        [2, -80],
        [5, -73],
        [12, -75],
        [10, -68],
        [17, -67],
        [10, -60],
        [7, -66],
        [-7, -65],
      ],
      "#ffe263",
    );
    shape(
      c,
      [
        [-11, -65],
        [10, -65],
        [11, -58],
        [-10, -58],
      ],
      "#2c4165",
    );
    shape(
      c,
      [
        [-7, -64],
        [7, -64],
        [7, -59],
        [-7, -59],
      ],
      "#bcd2d9",
    );
    c.beginPath();
    c.arc(0, -61.6, 1.4, 0, TAU);
    c.strokeStyle = "#40536a";
    c.lineWidth = 0.9;
    c.stroke();
    line(c, -1, -61, 2, -61, "#40536a", 0.8);
    line(c, -11, -62, -20, -57, "#2b4266", 3);
  }
  if (id === "luffy") {
    shape(
      c,
      [
        [-10, -56],
        [-12, -65],
        [-7, -69],
        [2, -70],
        [10, -65],
        [12, -57],
        [8, -61],
        [6, -56],
        [2, -60],
        [-4, -58],
        [-6, -64],
      ],
      "#263442",
    );
    oval(c, 0, -70, 13, 8, "#f4ce75");
    shape(
      c,
      [
        [-13, -71],
        [13, -71],
        [13, -67],
        [-13, -67],
      ],
      "#e95555",
    );
    oval(c, 0, -66, 19, 3.5, "#f9d88b");
    line(c, -12, -70, 12, -70, "#d0a24f", 0.8);
  }
  // Eyes, eyebrows, mouth, whiskers and scar are legible even at game size.
  for (const ex of [-4.2, 4.2]) {
    oval(c, ex, -55.5, 2.6, 2.8, "#fff8e9", false);
    oval(
      c,
      ex + 0.5,
      -55.4,
      1.05,
      2.0,
      id === "naruto" ? "#519ddd" : "#263447",
      false,
    );
    line(c, ex - 2.5, -59, ex + 2, -58.8, ink, 1);
  }
  line(c, -2, -49, 3, -49.2, ink, 1);
  if (id === "naruto")
    for (let n = 0; n < 3; n++) {
      line(c, -9, -53 + n * 1.6, -6, -52.6 + n * 1.6, "#96705c", 0.65);
      line(c, 6, -52.6 + n * 1.6, 9, -53 + n * 1.6, "#96705c", 0.65);
    }
  if (id === "luffy") {
    line(c, 3, -52, 8, -52, "#a7705a", 0.8);
    line(c, 6, -53, 6, -51, "#a7705a", 0.8);
  }
  // Leading arm stretches, charges, uppercuts or jabs.
  let hand = [12 + walk * 4, -30 - walk * 5];
  if (air) hand = [15, -44];
  if (attack) {
    const t = attack.t,
      wind = Math.min(1, t / 0.09);
    if (attack.kind === "up") hand = [5, -83];
    else if (attack.kind === "down") hand = [12, -16];
    else if (attack.kind === "beam") hand = [18, -37];
    else if (attack.kind === "stretch")
      hand = [18 + Math.sin(Math.min(1, t / 0.4) * Math.PI) * 270, -34];
    else hand = [12 + wind * 23, -38];
  }
  line(
    c,
    8,
    -41,
    ...hand,
    ink,
    id === "luffy" && attack?.kind === "stretch" ? 7 : 9,
  );
  line(
    c,
    8,
    -41,
    ...hand,
    id === "luffy" ? skin : id === "naruto" ? "#26364c" : "#ffab40",
    id === "luffy" ? 4.8 : 6,
  );
  if (id === "goku") {
    line(c, hand[0] - 3, hand[1], hand[0] - 1, hand[1], "#2859c0", 6);
  }
  oval(c, ...hand, 4.2, 4.5, skin);
  if (attack?.kind === "rasengan") {
    c.shadowColor = "#6fe5ff";
    c.shadowBlur = 12;
    oval(c, hand[0] + 5, hand[1], 8, 8, "#87f2ff", false);
    c.shadowBlur = 0;
    c.strokeStyle = "white";
    c.lineWidth = 1.4;
    c.beginPath();
    c.arc(hand[0] + 5, hand[1], 5, attack.t * 35, attack.t * 35 + 4);
    c.stroke();
  }
  if (attack?.kind === "beam") {
    const r = 5 + Math.min(1, attack.t / 0.43) * 8;
    c.shadowColor = "#6be1ff";
    c.shadowBlur = 20;
    oval(c, hand[0] + 6, hand[1], r, r, "#83e7ff", false);
    c.shadowBlur = 0;
  }
  c.restore();
}
export function drawPortrait(canvas, id) {
  const c = canvas.getContext("2d");
  canvas.width = 300;
  canvas.height = 240;
  c.clearRect(0, 0, 300, 240);
  drawFighter(c, id, 150, 285, 3.3, { facing: 1, time: 0 });
}
function cloud(c, x, y, s, alpha = 1) {
  c.save();
  c.globalAlpha = alpha;
  c.fillStyle = "#fff";
  c.beginPath();
  c.ellipse(x, y, 70 * s, 17 * s, 0, 0, TAU);
  c.ellipse(x - 25 * s, y - 11 * s, 28 * s, 27 * s, 0, 0, TAU);
  c.ellipse(x + 16 * s, y - 19 * s, 36 * s, 30 * s, 0, 0, TAU);
  c.fill();
  c.restore();
}
function mountain(c, x, y, w, h, color) {
  shape(
    c,
    [
      [x - w / 2, y],
      [x - w * 0.25, y - h * 0.48],
      [x - w * 0.08, y - h * 0.35],
      [x + w * 0.12, y - h],
      [x + w * 0.35, y - h * 0.38],
      [x + w / 2, y],
    ],
    color,
    null,
  );
}
export function drawStage(c, stage, time = 0) {
  c.save();
  const id = stage.id;
  if (["leaf", "namek", "ring"].includes(id)) {
    drawNewStage(c, stage, time);
    c.restore();
    return;
  }
  const sky = c.createLinearGradient(0, 0, 0, 720);
  if (id === "temple") {
    sky.addColorStop(0, "#416ec6");
    sky.addColorStop(0.55, "#b6e1ed");
    sky.addColorStop(1, "#edf2d8");
  } else if (id === "docks") {
    sky.addColorStop(0, "#494e98");
    sky.addColorStop(0.48, "#f1a48c");
    sky.addColorStop(1, "#ffe0ad");
  } else {
    sky.addColorStop(0, "#151b4c");
    sky.addColorStop(0.65, "#535190");
    sky.addColorStop(1, "#9381ad");
  }
  c.fillStyle = sky;
  c.fillRect(0, 0, 1280, 720);
  if (id === "moon") {
    for (let i = 0; i < 100; i++) {
      const x = (i * 193.7) % 1280,
        y = (i * 79.3) % 440;
      c.globalAlpha = 0.3 + Math.sin(time + i) * 0.25;
      c.fillStyle = "#e3ebff";
      c.fillRect(x, y, i % 5 === 0 ? 2 : 1, 2);
    }
    c.globalAlpha = 1;
    oval(c, 940, 160, 85, 85, "#dedafb", false);
    oval(c, 970, 145, 65, 75, "#d1cceb", false);
    c.strokeStyle = "#72d9d766";
    c.lineWidth = 28;
    c.beginPath();
    for (let x = 0; x < 1280; x += 20) {
      const y = 140 + Math.sin(x * 0.006 + time * 0.08) * 65;
      x ? c.lineTo(x, y) : c.moveTo(x, y);
    }
    c.stroke();
  } else {
    const glow = c.createRadialGradient(980, 155, 0, 980, 155, 140);
    glow.addColorStop(0, id === "docks" ? "#fff7cf" : "#f9fff1");
    glow.addColorStop(1, "#fff0");
    c.fillStyle = glow;
    c.fillRect(820, 0, 320, 320);
    oval(c, 980, 155, 48, 48, id === "docks" ? "#ffe9bb" : "#f8fff1", false);
    for (let i = 0; i < 6; i++)
      cloud(
        c,
        ((i * 260 + time * 3) % 1560) - 140,
        95 + (i % 3) * 75,
        0.6 + (i % 2) * 0.4,
        0.45,
      );
  }
  if (id === "docks") {
    mountain(c, 200, 420, 550, 180, "#826b9b");
    mountain(c, 1100, 440, 570, 210, "#9d7f9b");
    c.fillStyle = "#557fad";
    c.fillRect(0, 420, 1280, 300);
    for (let y = 425; y < 720; y += 16) {
      c.strokeStyle = y % 3 ? "#92b1c377" : "#e8d3bcaa";
      c.lineWidth = 2;
      c.beginPath();
      for (let x = 0; x < 1280; x += 10) {
        const yy = y + Math.sin(x * 0.016 + time * 1.3 + y) * 3;
        x ? c.lineTo(x, yy) : c.moveTo(x, yy);
      }
      c.stroke();
    }
    // A distant original pirate ship provides scale without obstructing the fight.
    shape(
      c,
      [
        [110, 427],
        [300, 427],
        [269, 450],
        [138, 450],
      ],
      "#354768",
    );
    line(c, 210, 425, 210, 295, "#405172", 5);
    shape(
      c,
      [
        [215, 302],
        [280, 386],
        [215, 390],
      ],
      "#e2c6ad",
    );
    shape(
      c,
      [
        [205, 319],
        [155, 400],
        [205, 400],
      ],
      "#f1d8b8",
    );
  } else {
    mountain(c, 160, 610, 800, 290, id === "moon" ? "#3a3a68" : "#739fba");
    mountain(c, 960, 620, 1050, 380, id === "moon" ? "#484675" : "#8fb6bc");
    mountain(c, 550, 710, 1100, 380, id === "moon" ? "#2e335a" : "#496f87");
    if (id === "temple") {
      // Temple gates and curved eaves behind the arena.
      for (const x of [150, 1115]) {
        line(c, x, 520, x, 290, "#47566d", 15);
        line(c, x - 42, 345, x + 42, 345, "#566b78", 10);
        shape(
          c,
          [
            [x - 62, 294],
            [x - 40, 277],
            [x, 260],
            [x + 40, 277],
            [x + 62, 294],
            [x + 42, 292],
            [x, 281],
            [x - 42, 292],
          ],
          "#3f5b79",
        );
        line(c, x - 42, 345, x - 42, 435, "#708689", 4);
        line(c, x + 42, 345, x + 42, 435, "#708689", 4);
      }
      for (let i = 0; i < 11; i++) {
        const x = i * 127;
        shape(
          c,
          [
            [x - 45, 655],
            [x, 535 + (i % 3) * 25],
            [x + 45, 655],
          ],
          "#2e5f77",
          null,
        );
        shape(
          c,
          [
            [x - 35, 610],
            [x, 510 + (i % 3) * 25],
            [x + 35, 610],
          ],
          "#396f83",
          null,
        );
      }
    }
  }
  for (const p of stage.platforms) {
    if (id === "docks") {
      c.fillStyle = "#594657";
      c.fillRect(p.x, p.y, p.w, p.h);
      c.fillStyle = "#b68066";
      c.fillRect(p.x, p.y, p.w, 10);
      c.strokeStyle = "#e2ae80";
      c.lineWidth = 2;
      for (let x = p.x + 12; x < p.x + p.w; x += 28) {
        c.beginPath();
        c.moveTo(x, p.y);
        c.lineTo(x, p.y + 8);
        c.stroke();
      }
      c.fillStyle = "#765368";
      c.fillRect(p.x, p.y + 12, p.w, p.h - 12);
      if (p.main) {
        for (const x of [p.x + 50, p.x + p.w - 50]) {
          c.fillStyle = "#53435d";
          c.fillRect(x, p.y + 40, 12, 200);
        }
        line(c, p.x, p.y + 22, p.x + p.w, p.y + 22, "#2f3447", 5);
      }
    } else {
      shape(
        c,
        [
          [p.x, p.y + 7],
          [p.x + p.w, p.y + 7],
          [p.x + p.w - 15, p.y + p.h],
          [p.x + p.w * 0.6, p.y + p.h + 14],
          [p.x + 20, p.y + p.h],
        ],
        id === "moon" ? "#655780" : "#64798a",
        "#314960",
        3,
      );
      c.fillStyle = id === "moon" ? "#aaa0c9" : "#d1d6c1";
      c.fillRect(p.x, p.y, p.w, 9);
      c.fillStyle = id === "moon" ? "#7762a8" : "#567e72";
      c.fillRect(p.x, p.y + 9, p.w, 5);
      c.strokeStyle = id === "moon" ? "#bc9de5" : "#8da8a6";
      c.lineWidth = 1;
      for (let x = p.x + 12; x < p.x + p.w; x += 50) {
        c.beginPath();
        c.moveTo(x, p.y + 17);
        c.lineTo(x - 8, p.y + p.h);
        c.stroke();
      }
      if (p.main) {
        c.fillStyle = id === "moon" ? "#9480b7" : "#768d87";
        for (let i = 0; i < 5; i++) {
          c.beginPath();
          c.arc(p.x + 90 + i * 155, p.y + 32, 7, 0, TAU);
          c.fill();
        }
        if (id === "temple") {
          for (const x of [p.x + 30, p.x + p.w - 30]) {
            line(c, x, p.y + 40, x - 12, p.y + 100, "#477462", 5);
            oval(c, x - 15, p.y + 80, 7, 4, "#5c9175", false);
            oval(c, x - 5, p.y + 68, 6, 3, "#6c9d73", false);
          }
        }
      }
    }
  }
  c.restore();
}
export function drawArena(c, arena) {
  const t = arena.elapsed;
  c.clearRect(0, 0, 1280, 720);
  c.save();
  if (arena.shake > 0)
    c.translate(
      Math.sin(t * 170) * arena.shake * 0.45,
      Math.cos(t * 155) * arena.shake * 0.3,
    );
  const [a, b] = arena.fighters;
  const separation = Math.max(
    Math.abs(a.cx - b.cx),
    Math.abs(a.cy - b.cy) * 1.4,
  );
  const desiredZoom = Math.max(1, Math.min(1.35, 1.5 - separation / 1600));
  arena.camera ??= { x: 640, y: 360, zoom: 1 };
  arena.camera.zoom += (desiredZoom - arena.camera.zoom) * 0.065;
  const z = arena.camera.zoom;
  const fx = Math.max(640 / z, Math.min(1280 - 640 / z, (a.cx + b.cx) / 2));
  const fy = Math.max(360 / z, Math.min(720 - 360 / z, (a.cy + b.cy) / 2 + 45));
  arena.camera.x += (fx - arena.camera.x) * 0.09;
  arena.camera.y += (fy - arena.camera.y) * 0.09;
  c.translate(640, 360);
  c.scale(z, z);
  c.translate(-arena.camera.x, -arena.camera.y);
  drawStage(c, arena.stage, t);
  for (const p of arena.projectiles) {
    c.save();
    c.shadowBlur = 22;
    c.shadowColor = p.color;
    const tail = p.x - Math.sign(p.vx) * 100;
    const gradient = c.createLinearGradient(tail, p.y, p.x, p.y);
    gradient.addColorStop(0, "#71dfff00");
    gradient.addColorStop(1, p.color);
    c.fillStyle = gradient;
    c.fillRect(Math.min(tail, p.x), p.y - 12, 100, 24);
    oval(c, p.x, p.y, p.r + 4, p.r * 0.8, p.color, false);
    oval(c, p.x + Math.sign(p.vx) * 3, p.y, 10, 10, "#f0fdff", false);
    if (p.kind === "thunder") {
      for (let i = 0; i < 5; i++)
        line(
          c,
          p.x - Math.sign(p.vx) * i * 18,
          p.y + (i % 2 ? 12 : -12),
          p.x - Math.sign(p.vx) * (i + 1) * 18,
          p.y + (i % 2 ? -12 : 12),
          "#fff19b",
          4,
        );
    } else if (p.kind === "dragon") {
      const d = Math.sign(p.vx);
      shape(
        c,
        [
          [p.x + d * 28, p.y],
          [p.x + d * 9, p.y - 24],
          [p.x - d * 22, p.y - 30],
          [p.x - d * 12, p.y - 10],
          [p.x - d * 30, p.y + 18],
          [p.x, p.y + 15],
        ],
        p.color,
      );
      oval(c, p.x + d * 12, p.y - 7, 4, 3, "#fff4b1", false);
    }
    c.restore();
  }
  for (const f of arena.fighters) {
    if (f.respawn > 0) continue;
    c.save();
    if (f.invincible > 0 && Math.floor(t * 15) % 2 === 0) c.globalAlpha = 0.6;
    oval(c, f.cx, f.y + f.h + 3, 25, 5, "#102e4833", false);
    if (f.dodge > 0) {
      c.globalAlpha = 0.25;
      drawFighter(c, f.character.id, f.cx - f.facing * 24, f.y + f.h, 0.96, {
        facing: f.facing,
        moving: true,
        time: t,
      });
      c.globalAlpha = 0.8;
    }
    drawFighter(c, f.character.id, f.cx, f.y + f.h, 0.9, {
      facing: f.facing,
      time: f.animation,
      moving: Math.abs(f.vx) > 60,
      air: !f.grounded,
      attack: f.attack,
    });
    if (f.shielding) {
      c.beginPath();
      c.arc(f.cx, f.cy, 45 * (0.6 + f.guard / 250), 0, TAU);
      c.fillStyle = f.slot === 0 ? "#73eac63a" : "#fa729f3a";
      c.fill();
      c.strokeStyle = f.slot === 0 ? "#86ffe1" : "#ff99ba";
      c.lineWidth = 2;
      c.stroke();
    }
    c.fillStyle = f.slot === 0 ? "#5cefca" : "#ff91b0";
    c.font = "bold 11px sans-serif";
    c.textAlign = "center";
    c.fillText(
      f.slot === 0 ? "P1" : arena.mode === "cpu" ? "CPU" : "P2",
      f.cx,
      f.y - 15,
    );
    c.beginPath();
    c.moveTo(f.cx - 4, f.y - 11);
    c.lineTo(f.cx + 4, f.y - 11);
    c.lineTo(f.cx, f.y - 6);
    c.fill();
    if (f.attack?.kind === "beam") {
      c.strokeStyle = "#9aeaff99";
      c.lineWidth = 1;
      for (let i = 0; i < 6; i++) {
        const a = t * 9 + (i * TAU) / 6;
        c.beginPath();
        c.moveTo(f.cx + Math.cos(a) * 45, f.cy + Math.sin(a) * 45);
        c.lineTo(f.cx + Math.cos(a) * 25, f.cy + Math.sin(a) * 25);
        c.stroke();
      }
    }
    c.restore();
  }
  for (const e of arena.effects) {
    const age = 1 - e.life / e.maxLife;
    c.save();
    c.globalAlpha = 1 - age;
    c.translate(e.x, e.y);
    if (e.kind === "hit") {
      c.rotate(t * 2);
      const points = [];
      for (let i = 0; i < 16; i++) {
        const r = (i % 2 ? 9 : 28) * (1 + age * 0.6);
        points.push([
          Math.cos((i * TAU) / 16) * r,
          Math.sin((i * TAU) / 16) * r,
        ]);
      }
      shape(c, points, "#fff7cc", e.color, 3);
    } else if (e.kind === "damage") {
      c.font = "bold 20px sans-serif";
      c.textAlign = "center";
      c.fillStyle = "#fff";
      c.strokeStyle = "#263449";
      c.lineWidth = 3;
      c.strokeText(e.text, 0, -age * 35);
      c.fillText(e.text, 0, -age * 35);
    } else if (e.kind === "ko") {
      c.globalAlpha = Math.max(0, 1 - age);
      for (let i = 0; i < 18; i++) {
        const a = (i * TAU) / 18;
        line(
          c,
          Math.cos(a) * age * 40,
          Math.sin(a) * age * 40,
          Math.cos(a) * (40 + age * 180),
          Math.sin(a) * (40 + age * 180),
          e.color,
          6 * (1 - age),
        );
      }
      c.strokeStyle = "#fff";
      c.lineWidth = 6;
      c.beginPath();
      c.arc(0, 0, 10 + age * 140, 0, TAU);
      c.stroke();
    } else {
      c.strokeStyle = e.color;
      c.lineWidth = 3 * (1 - age);
      c.beginPath();
      c.ellipse(
        0,
        0,
        14 + age * 35,
        e.kind === "jump" ? 4 + age * 8 : 14 + age * 35,
        0,
        0,
        TAU,
      );
      c.stroke();
    }
    c.restore();
  }
  c.restore();
  // Dark bottom gradient keeps stock and damage HUD readable.
  const shade = c.createLinearGradient(0, 590, 0, 720);
  shade.addColorStop(0, "#10223d00");
  shade.addColorStop(1, "#101e38d9");
  c.fillStyle = shade;
  c.fillRect(0, 590, 1280, 130);
  for (const f of arena.fighters) {
    const x = f.slot === 0 ? 250 : 810;
    c.save();
    c.translate(x, 646);
    const color = f.character.color;
    c.fillStyle = "#102037dd";
    c.beginPath();
    c.roundRect(-75, -4, 230, 66, 12);
    c.fill();
    c.strokeStyle = f.slot === 0 ? "#6ce7c2" : "#ff94b3";
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(-74, -3);
    c.lineTo(155, -3);
    c.stroke();
    drawFighter(c, f.character.id, -40, 57, 1.12, { facing: 1 });
    c.fillStyle = "#f8fbff";
    c.font = "bold 12px sans-serif";
    c.textAlign = "left";
    c.fillText(f.character.name.toUpperCase(), 0, 14);
    c.fillStyle =
      f.damage < 60 ? "#fff" : f.damage < 120 ? "#ffda79" : "#ff7c83";
    c.font = "900 34px sans-serif";
    c.fillText(Math.floor(f.damage) + "%", 0, 48);
    for (let i = 0; i < 3; i++) {
      oval(c, 112 + i * 15, 12, 4, 4, i < f.stocks ? color : "#47576e", false);
    }
    c.fillStyle = "#344760";
    c.fillRect(95, 41, 48, 4);
    c.fillStyle = color;
    c.fillRect(95, 41, (48 * f.energy) / 100, 4);
    c.font = "8px sans-serif";
    c.fillStyle = "#a4c1d4";
    c.fillText("SPECIAL", 96, 55);
    c.restore();
  }
  c.textAlign = "center";
  c.fillStyle = "#112a49b8";
  c.beginPath();
  c.roundRect(565, 22, 150, 46, 12);
  c.fill();
  c.fillStyle = "#fff";
  c.font = "bold 24px sans-serif";
  const sec = Math.ceil(arena.time);
  c.fillText(
    Math.floor(sec / 60) + ":" + String(sec % 60).padStart(2, "0"),
    640,
    53,
  );
  c.font = "10px sans-serif";
  c.fillStyle = "#e5edf6";
  c.fillText("3 STOCK · " + arena.stage.name.toUpperCase(), 640, 86);
  if (arena.countdown > 0) {
    c.save();
    c.textAlign = "center";
    c.font = "italic 900 105px sans-serif";
    c.lineWidth = 9;
    c.strokeStyle = "#182c49";
    c.fillStyle = arena.countdown > 0.75 ? "#fff0a7" : "#79f3ce";
    const text =
      arena.countdown > 0.75
        ? String(Math.ceil(arena.countdown - 0.75))
        : "FIGHT!";
    c.strokeText(text, 640, 300);
    c.fillText(text, 640, 300);
    c.restore();
  }
}

function drawNewFighter(c, id, x, y, scale, pose) {
  c.save();
  c.translate(x, y);
  c.scale(scale * (pose.facing || 1), scale);
  const walk = pose.moving ? Math.sin((pose.time || 0) * 16) * 8 : 0;
  const hit = pose.attack && pose.attack.t > 0.04;
  const color =
    id === "midoriya" ? "#29b98b" : id === "ryuga" ? "#ecedef" : "#ffe054";
  if (id === "pikachu") {
    shape(
      c,
      [
        [-13, -18],
        [-28, -28],
        [-20, -36],
        [-36, -44],
        [-29, -51],
        [-11, -33],
      ],
      "#e7ba30",
    );
    oval(c, 0, -29, 18, 25, color);
    oval(c, 0, -55, 20, 17, color);
    shape(
      c,
      [
        [-15, -63],
        [-26, -97],
        [-18, -97],
        [-5, -65],
      ],
      color,
    );
    shape(
      c,
      [
        [7, -65],
        [20, -98],
        [27, -96],
        [18, -61],
      ],
      color,
    );
    shape(
      c,
      [
        [-26, -97],
        [-18, -97],
        [-15, -86],
        [-22, -86],
      ],
      "#263247",
    );
    shape(
      c,
      [
        [20, -98],
        [27, -96],
        [24, -86],
        [16, -86],
      ],
      "#263247",
    );
    oval(c, -10, -55, 3, 5, "#172436");
    oval(c, 10, -55, 3, 5, "#172436");
    oval(c, -15, -47, 5, 4, "#f65d43");
    oval(c, 15, -47, 5, 4, "#f65d43");
    line(c, -2, -43, 2, -43, "#263247", 2);
    oval(c, 1, -50, 2, 1, "#263247");
    line(c, -12, -31, -20, -22 - walk / 2, color, 8);
    line(c, 12, -31, hit ? 34 : 21, hit ? -40 : -22 + walk / 2, color, 8);
    oval(c, -10 - walk / 2, -5, 8, 5, color);
    oval(c, 10 + walk / 2, -5, 8, 5, color);
  } else {
    const suit = id === "midoriya" ? "#147761" : "#353443";
    line(c, -6, -23, -9 - walk, -5, "#172436", 12);
    line(c, 6, -23, 9 + walk, -5, "#172436", 12);
    line(c, -6, -23, -9 - walk, -6, suit, 8);
    line(c, 6, -23, 9 + walk, -6, suit, 8);
    oval(c, -9 - walk, -4, 7, 4, id === "midoriya" ? "#ec594c" : "#a63b4e");
    oval(c, 9 + walk, -4, 7, 4, id === "midoriya" ? "#ec594c" : "#a63b4e");
    if (id === "ryuga")
      shape(
        c,
        [
          [-13, -45],
          [-24, -25],
          [-25, -5],
          [0, -20],
          [25, -5],
          [23, -25],
          [13, -45],
        ],
        "#eee9dc",
      );
    shape(
      c,
      [
        [-11, -47],
        [11, -47],
        [13, -22],
        [-11, -22],
      ],
      suit,
    );
    line(c, -12, -26, 12, -26, id === "midoriya" ? "#e45c56" : "#a62d45", 5);
    line(c, -9, -42, -17, -24 - walk / 2, color, 9);
    line(c, 9, -42, hit ? 35 : 18, hit ? -38 : -24 + walk / 2, color, 9);
    oval(c, hit ? 35 : 18, hit ? -38 : -24 + walk / 2, 5, 5, "#ffcc9b");
    if (id === "ryuga") {
      const bx = hit ? 36 : 20,
        by = hit ? -33 : -19 + walk / 2;
      oval(c, bx, by, 7, 3, "#8fa1d0");
      oval(c, bx, by - 3, 8, 3, "#e65b66");
      oval(c, bx, by - 5, 3, 2, "#f4db73");
    }
    oval(c, 0, -59, 12, 13, "#ffcc9b");
    shape(
      c,
      [
        [-12, -54],
        [-17, -67],
        [-12, -68],
        [-15, -78],
        [-5, -73],
        [0, -83],
        [7, -75],
        [16, -79],
        [14, -69],
        [20, -66],
        [10, -56],
        [6, -66],
        [0, -62],
        [-5, -66],
      ],
      id === "midoriya" ? "#165443" : "#eaf2f5",
    );
    if (id === "ryuga") {
      shape(
        c,
        [
          [4, -77],
          [10, -74],
          [10, -59],
          [5, -61],
        ],
        "#ce414a",
      );
      line(c, -12, -66, 12, -66, "#b5424d", 3);
      oval(c, 0, -67, 3, 3, "#e6bc53");
    } else {
      line(c, -9, -44, 9, -44, "#d4e5d9", 5);
      line(c, -6, -42, -6, -35, "#242d38", 2);
      line(c, 6, -42, 6, -35, "#242d38", 2);
    }
    oval(c, -5, -58, 3, 3, "#fff");
    oval(c, 6, -58, 3, 3, "#fff");
    oval(c, -4, -58, 1.5, 2, "#163743");
    oval(c, 7, -58, 1.5, 2, "#163743");
    line(c, -3, -50, 4, -50, "#804e47", 1.5);
    if (id === "midoriya")
      for (const xx of [-8, -5, 7, 10])
        oval(c, xx, -53, 0.7, 0.7, "#915840", false);
  }
  if (hit || pose.attack?.kind === "beam") {
    c.shadowBlur = 15;
    c.shadowColor =
      id === "pikachu" ? "#ffe35d" : id === "midoriya" ? "#49e7a2" : "#d796ff";
    const glow = c.shadowColor;
    if (id === "midoriya" && pose.attack?.kind === "smash") {
      c.strokeStyle = glow;
      c.lineWidth = 5;
      c.beginPath();
      c.ellipse(72, -35, 50, 24, 0, -1.6, 1.6);
      c.stroke();
    }
    if (id === "ryuga") {
      oval(c, 32, -37, 14, 14, glow, false);
      line(c, 21, -38, 43, -38, "#fff", 2);
    } else
      for (let i = 0; i < 4; i++) {
        const xx = 24 + i * 8;
        line(c, xx, -42 + (i % 2) * 14, xx + 8, -28 - (i % 2) * 14, glow, 3);
      }
  }
  c.restore();
}
function drawNewStage(c, stage, time) {
  const id = stage.id,
    sky = c.createLinearGradient(0, 0, 0, 720);
  sky.addColorStop(
    0,
    id === "leaf" ? "#539ccb" : id === "namek" ? "#268e7e" : "#111629",
  );
  sky.addColorStop(
    1,
    id === "leaf" ? "#f2d9af" : id === "namek" ? "#b8eca1" : "#463851",
  );
  c.fillStyle = sky;
  c.fillRect(0, 0, 1280, 720);
  if (id === "leaf") {
    mountain(c, 640, 450, 1250, 320, "#b59376");
    for (let i = 0; i < 5; i++) {
      oval(c, 380 + i * 120, 270 - (i % 2) * 18, 40, 55, "#ceb299");
      const fx = 380 + i * 120,
        fy = 270 - (i % 2) * 18;
      shape(
        c,
        [
          [fx - 35, fy - 26],
          [fx - 36, fy - 45],
          [fx - 14, fy - 62],
          [fx + 16, fy - 60],
          [fx + 37, fy - 38],
          [fx + 36, fy - 23],
          [fx + 19, fy - 33],
          [fx, fy - 30],
          [fx - 18, fy - 35],
        ],
        i % 2 ? "#a3856f" : "#b39a81",
      );
      for (const ex of [fx - 15, fx + 15]) {
        line(c, ex - 7, fy - 8, ex + 7, fy - 9, "#8c725f", 3);
        line(c, ex - 7, fy - 1, ex + 7, fy - 1, "#ad9077", 2);
      }
      line(c, fx, fy - 4, fx - 4, fy + 13, "#a3856d", 2);
      line(c, fx - 4, fy + 13, fx + 6, fy + 13, "#aa8b70", 2);
      line(c, fx - 14, fy + 29, fx, fy + 34, "#b0957b", 3);
      line(c, fx, fy + 34, fx + 17, fy + 27, "#b0957b", 3);
      if (i === 0) line(c, fx - 27, fy - 21, fx + 28, fy - 21, "#b49a83", 6);
      if (i === 2)
        shape(
          c,
          [
            [fx - 18, fy - 52],
            [fx + 19, fy - 52],
            [fx + 30, fy - 29],
            [fx - 29, fy - 29],
          ],
          "#bc9b7b",
        );
      if (i === 3)
        for (const dx of [-28, -17, 19, 29])
          line(
            c,
            fx + dx,
            fy + 3,
            fx + dx + (dx > 0 ? 8 : -8),
            fy + 21,
            "#a58a72",
            2,
          );

      line(
        c,
        363 + i * 120,
        263 - (i % 2) * 18,
        390 + i * 120,
        263 - (i % 2) * 18,
        "#9e816d",
        4,
      );
      line(
        c,
        374 + i * 120,
        288 - (i % 2) * 18,
        388 + i * 120,
        288 - (i % 2) * 18,
        "#9e816d",
        3,
      );
    }
    for (let i = 0; i < 14; i++) {
      const x = i * 100,
        y = 370 + (i % 3) * 30;
      c.fillStyle = i % 2 ? "#eac8a0" : "#cfb991";
      c.fillRect(x, y, 90, 150);
      shape(
        c,
        [
          [x - 10, y],
          [x + 45, y - 35],
          [x + 100, y],
        ],
        i % 2 ? "#b46050" : "#507776",
      );
      for (let j = 0; j < 3; j++) {
        c.fillStyle = "#516c75";
        c.fillRect(x + 14 + j * 24, y + 20, 12, 20);
      }
    }
    for (let i = 0; i < 5; i++)
      cloud(c, i * 290 + ((time * 4) % 290), 100 + (i % 2) * 60, 0.7, 0.6);
  } else if (id === "namek") {
    oval(c, 970, 120, 65, 65, "#e4f6a7", false);
    oval(c, 170, 160, 25, 25, "#b9e9cc", false);
    c.fillStyle = "#478dc3";
    c.fillRect(0, 420, 1280, 300);
    for (let i = 0; i < 9; i++) {
      const x = i * 157;
      shape(
        c,
        [
          [x - 50, 480],
          [x - 30, 360 - (i % 3) * 40],
          [x + 35, 355 - (i % 3) * 40],
          [x + 60, 480],
        ],
        "#63aa70",
      );
      line(c, x, 370 - (i % 3) * 40, x, 290 - (i % 3) * 40, "#3d7572", 7);
      oval(c, x, 273 - (i % 3) * 40, 37, 21, "#a7d976");
    }
    for (let y = 450; y < 720; y += 24) line(c, 0, y, 1280, y, "#9ee6ca44", 2);
  } else {
    for (let i = 0; i < 85; i++) {
      oval(
        c,
        (i * 151) % 1280,
        330 + (i % 5) * 25,
        8,
        8,
        i % 2 ? "#786580" : "#665a73",
        false,
      );
    }
    for (const x of [160, 1120]) {
      const g = c.createLinearGradient(x, 60, 640, 480);
      g.addColorStop(0, "#fff5d633");
      g.addColorStop(1, "#fff0");
      shape(
        c,
        [
          [x - 20, 60],
          [x + 20, 60],
          [950, 490],
          [330, 490],
        ],
        g,
        null,
      );
    }
    c.fillStyle = "#dfca91";
    c.font = "bold 42px sans-serif";
    c.textAlign = "center";
    c.fillText("ANIME BRAWL • MAIN EVENT", 640, 180);
    const p = stage.platforms[0];
    for (const x of [p.x, p.x + p.w])
      line(c, x, p.y, x, p.y - 125, "#cfb596", 10);
    for (let j = 0; j < 3; j++)
      line(
        c,
        p.x,
        p.y - 35 - j * 34,
        p.x + p.w,
        p.y - 35 - j * 34,
        j % 2 ? "#cfe8ef" : "#df646c",
        3,
      );
  }
  for (const p of stage.platforms) {
    c.fillStyle =
      id === "ring" ? "#343c60" : id === "leaf" ? "#8d5f50" : "#548674";
    c.fillRect(p.x, p.y, p.w, p.h);
    c.fillStyle =
      id === "ring" ? "#c7d6e9" : id === "leaf" ? "#cb8267" : "#b3dd79";
    c.fillRect(p.x, p.y, p.w, 10);
    if (p.main && id === "ring") {
      c.fillStyle = "#c69147";
      c.font = "bold 32px sans-serif";
      c.textAlign = "center";
      c.fillText("BRAWL", 640, p.y + 44);
    }
  }
}
