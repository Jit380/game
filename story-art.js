import { drawFighter, drawArena } from "./art.js";
import { BOSSES } from "./story.mjs";
const fill = (c, color, x, y, w, h) => {
  c.fillStyle = color;
  c.fillRect(x, y, w, h);
};
function ellipse(c, x, y, rx, ry, color) {
  c.fillStyle = color;
  c.beginPath();
  c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  c.fill();
}
function poly(c, pts, color) {
  c.beginPath();
  pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.closePath();
  c.fillStyle = color;
  c.fill();
}
function text(c, t, x, y, size = 20, color = "#edf5fb", align = "left") {
  c.font = `700 ${size}px "DM Sans",sans-serif`;
  c.fillStyle = color;
  c.textAlign = align;
  c.fillText(t, x, y);
}
export function drawWorld(c, game) {
  const r = game.region,
    p = game.player,
    t = game.time,
    W = 1280,
    H = 720;
  game.camera ??= p.x;
  const target = Math.max(640, Math.min(r.width - 640, p.x));
  game.camera += (target - game.camera) * 0.07;
  c.clearRect(0, 0, W, H);
  const sky = c.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(
    0,
    r.id === "leaf" ? "#496fa0" : r.id === "namek" ? "#247e85" : "#141936",
  );
  sky.addColorStop(
    1,
    r.id === "leaf" ? "#f3c390" : r.id === "namek" ? "#bef3b2" : "#605881",
  );
  c.fillStyle = sky;
  c.fillRect(0, 0, W, H);
  ellipse(
    c,
    1050 - game.camera * 0.04,
    130,
    70,
    70,
    r.id === "leaf" ? "#fff0c4" : r.id === "namek" ? "#d7f4ac" : "#c7b2f8",
  );
  // Slow parallax: the world keeps its depth while the hero crosses it.
  c.save();
  c.translate(-(game.camera - 640) * 0.2, 0);
  if (r.id === "leaf") {
    poly(
      c,
      [
        [-500, 450],
        [-100, 235],
        [180, 335],
        [420, 145],
        [730, 300],
        [1060, 190],
        [1900, 470],
      ],
      "#a69391",
    );
    for (let i = 0; i < 5; i++) {
      const x = 290 + i * 105,
        y = 290 - (i % 2) * 14;
      ellipse(c, x, y, 34, 48, "#bda58f");
      poly(
        c,
        [
          [x - 35, y - 20],
          [x - 19, y - 52],
          [x + 8, y - 60],
          [x + 38, y - 20],
        ],
        "#927f78",
      );
      fill(c, "#8d7a70", x - 18, y - 6, 12, 3);
      fill(c, "#8d7a70", x + 8, y - 6, 12, 3);
      fill(c, "#9a8778", x - 5, y + 8, 8, 15);
      fill(c, "#8d7a70", x - 9, y + 30, 19, 3);
    }
  } else if (r.id === "namek") {
    fill(c, "#5799bd", -500, 430, 2400, 300);
    for (let i = 0; i < 13; i++) {
      const x = i * 180 - 150;
      poly(
        c,
        [
          [x, 460],
          [x + 30, 340 - (i % 3) * 35],
          [x + 90, 350 - (i % 3) * 35],
          [x + 120, 460],
        ],
        "#4e8d87",
      );
      fill(c, "#457474", x + 60, 270 - (i % 3) * 35, 6, 100);
      ellipse(c, x + 63, 270 - (i % 3) * 35, 38, 22, "#a7d77b");
    }
  } else {
    for (let i = 0; i < 90; i++)
      ellipse(c, ((i * 127) % 1900) - 200, (i * 63) % 460, 1.5, 1.5, "#b9acdf");
    for (let i = 0; i < 8; i++) {
      const x = i * 260 - 100,
        y = 300 + (i % 3) * 50;
      poly(
        c,
        [
          [x, y],
          [x + 150, y - 30],
          [x + 210, y + 40],
          [x + 50, y + 90],
        ],
        "#66587f",
      );
      fill(c, "#8677a4", x + 50, y - 120, 25, 100);
    }
  }
  c.restore();
  c.save();
  c.translate(640 - game.camera, 0);
  for (let i = 0; i < Math.ceil(r.width / 200); i++) {
    const x = i * 200;
    if (r.id === "leaf") {
      const y = 385 + (i % 3) * 30;
      fill(c, i % 2 ? "#c5af9c" : "#e1c0a0", x, y, 170, 170);
      poly(
        c,
        [
          [x - 15, y],
          [x + 85, y - 48],
          [x + 185, y],
        ],
        i % 2 ? "#667778" : "#b2685d",
      );
      fill(c, "#454f63", x + 55, y + 80, 42, 90);
      for (let j = 0; j < 4; j++) {
        fill(c, "#476b7b", x + 16 + j * 36, y + 22, 20, 26);
        fill(c, "#98adb2", x + 18 + j * 36, y + 24, 5, 22);
      }
      fill(c, "#d7945f", x + 30, y + 59, 111, 19);
      if (i % 3 === 0)
        text(c, "ラーメン", x + 85, y + 74, 13, "#fff0c3", "center");
    } else if (r.id === "namek") {
      if (i % 3 === 0) {
        ellipse(c, x + 80, 518, 72, 55, "#dfedd6");
        fill(c, "#3f7174", x + 56, 490, 42, 62);
        ellipse(c, x + 80, 468, 8, 8, "#d9cf78");
      } else {
        fill(c, "#426c6a", x + 85, 340 + (i % 2) * 25, 8, 210);
        ellipse(c, x + 90, 340 + (i % 2) * 25, 58, 30, "#98c969");
        ellipse(c, x + 76, 334 + (i % 2) * 25, 28, 11, "#b6df81");
      }
    } else {
      poly(
        c,
        [
          [x, 510],
          [x + 15, 450],
          [x + 140, 425],
          [x + 185, 520],
        ],
        "#514c73",
      );
      fill(c, "#746489", x + 40, 445, 11, 68);
    }
  }
  fill(
    c,
    r.id === "leaf" ? "#36434c" : r.id === "namek" ? "#406765" : "#39364f",
    0,
    r.ground,
    r.width,
    170,
  );
  fill(
    c,
    r.id === "leaf" ? "#d6b394" : r.id === "namek" ? "#b4df83" : "#b2a1d2",
    0,
    r.ground,
    r.width,
    12,
  );
  for (let x = 0; x < r.width; x += 80)
    fill(c, "#ffffff0c", x, r.ground + 35, 45, 2);
  for (const a of r.platforms) {
    fill(
      c,
      r.id === "leaf" ? "#725b55" : r.id === "namek" ? "#558075" : "#6d6287",
      a.x,
      a.y,
      a.w,
      18,
    );
    fill(c, r.color, a.x, a.y, a.w, 5);
    if (r.id === "leaf")
      for (let x = a.x; x < a.x + a.w; x += 20)
        fill(c, "#be8d75", x, a.y + 7, 12, 3);
  }
  for (const [i, s] of r.shards.entries())
    if (!game.save.collected.includes(r.id + ":" + i)) {
      c.save();
      c.shadowColor = "#7feee2";
      c.shadowBlur = 20;
      const yy = s.y + Math.sin(t * 3 + i) * 6;
      poly(
        c,
        [
          [s.x, yy - 15],
          [s.x + 9, yy],
          [s.x, yy + 15],
          [s.x - 9, yy],
        ],
        "#9affe5",
      );
      c.restore();
    }
  for (const x of r.camps) {
    fill(c, "#343c52", x - 30, 510, 60, 40);
    poly(
      c,
      [
        [x - 38, 510],
        [x, 473],
        [x + 38, 510],
      ],
      "#dcaa68",
    );
    ellipse(c, x, 528, 8, 12, "#ffdc84");
    ellipse(c, x, 530, 15, 7, "#ffbc5e55");
    text(c, "CAMP", x, 463, 12, "#ffdfa0", "center");
  }
  for (const n of r.npcs) {
    drawGuide(c, n.name, n.x, r.ground);
    text(c, n.name, n.x, r.ground - 96, 14, "#f9edcd", "center");
  }
  for (const g of r.gates) {
    const done = game.save.defeated.includes(g.boss),
      active = game.nextBoss === g.boss;
    c.save();
    c.shadowColor = done ? "#86f5c6" : active ? "#c199ff" : "#55596f";
    c.shadowBlur = 25;
    c.strokeStyle = c.shadowColor;
    c.lineWidth = 5;
    c.beginPath();
    c.ellipse(g.x, 480, 38, 67, 0, 0, Math.PI * 2);
    c.stroke();
    c.restore();
    drawFighter(c, g.boss, g.x, r.ground, 1.1, { facing: -1 });
    text(
      c,
      done ? "RESOLVED" : active ? "RIVAL ENCOUNTER" : "SEALED",
      g.x,
      386,
      12,
      done ? "#a4f6ca" : "#d7c5f9",
      "center",
    );
    text(c, g.boss.toUpperCase(), g.x, 408, 18, "#fff", "center");
  }
  const portalX = r.width - 140;
  c.save();
  c.shadowBlur = 30;
  c.shadowColor = "#c6a4ff";
  c.strokeStyle = "#d7c1ff";
  c.lineWidth = 8;
  c.beginPath();
  c.ellipse(portalX, 480, 42, 67, 0, 0, Math.PI * 2);
  c.stroke();
  c.restore();
  text(c, "WORLD GATE", portalX, 389, 14, "#e6d3ff", "center");
  for (const enemy of game.patrols) {
    const ey = r.ground + Math.sin(t * 4 + enemy.home) * 3;
    ellipse(c, enemy.x, ey + 3, 19, 4, "#10112633");
    poly(
      c,
      [
        [enemy.x - 18, ey],
        [enemy.x - 14, ey - 43],
        [enemy.x, ey - 66],
        [enemy.x + 14, ey - 43],
        [enemy.x + 18, ey],
      ],
      "#33344f",
    );
    ellipse(c, enemy.x, ey - 43, 13, 15, "#242f46");
    fill(c, "#d0a4ff", enemy.x - 8, ey - 44, 5, 3);
    fill(c, "#d0a4ff", enemy.x + 4, ey - 44, 5, 3);
    for (let i = 0; i < enemy.hp; i++)
      fill(c, "#cba5ff", enemy.x - 10 + i * 12, ey - 79, 9, 3);
  }
  for (const e of game.worldEffects) {
    c.save();
    c.globalAlpha = e.life / 0.35;
    ellipse(c, e.x, e.y, 25, 25, e.color);
    c.restore();
  }
  ellipse(c, p.x, p.y + 4, 24, 5, "#111a3033");
  drawFighter(c, r.hero, p.x, p.y, 1.1, {
    facing: p.facing,
    moving: Math.abs(p.vx) > 0,
    time: t,
    air: !p.grounded,
    attack:
      game.strike > 0
        ? {
            kind:
              game.worldAttackKind === "special"
                ? r.hero === "goku"
                  ? "beam"
                  : "rasengan"
                : "neutral",
            t: 0.12,
          }
        : null,
  });
  const nearest = game.interact();
  if (nearest) {
    fill(c, "#111a30dd", p.x - 120, p.y - 149, 240, 32);
    text(
      c,
      "E · " +
        (nearest.kind === "gate"
          ? "FACE " + nearest.boss.toUpperCase()
          : nearest.kind === "camp"
            ? "REST & UPGRADE"
            : nearest.kind === "portal"
              ? "TRAVEL"
              : "TALK"),
      p.x,
      p.y - 128,
      13,
      "#edfcf8",
      "center",
    );
  }
  c.restore();
  // Minimap and world HUD stay readable while the camera follows movement.
  fill(c, "#111a30d9", 28, 22, 335, 83);
  text(c, r.name.toUpperCase(), 46, 49, 18);
  text(
    c,
    game.nextBoss
      ? "Find " + game.nextBoss.toUpperCase() + " · follow the violet rift"
      : "THE WORLDS ARE SAFE · Explore freely",
    46,
    77,
    12,
    "#b9cbdf",
  );
  fill(c, "#111a30df", 934, 22, 318, 83);
  text(
    c,
    "FRAGMENTS " +
      game.save.shards +
      "   •   " +
      game.save.defeated.length +
      "/4 CHAPTERS",
    955,
    49,
    14,
    "#b3f6da",
  );
  fill(c, "#566279", 955, 76, 273, 3);
  for (const g of r.gates)
    ellipse(
      c,
      955 + (g.x / r.width) * 273,
      77,
      3,
      3,
      game.save.defeated.includes(g.boss) ? "#7beeb5" : "#c19cff",
    );
  ellipse(c, 955 + (p.x / r.width) * 273, 77, 4, 4, "#fff3c0");
  fill(c, "#111a30dc", 28, 118, 210, 65);
  text(c, "VITALITY", 45, 138, 10, "#b4c8da");
  fill(c, "#405165", 45, 149, 173, 6);
  fill(c, "#8ee5bc", 45, 149, (173 * game.worldHP) / 100, 6);
  fill(c, "#405165", 45, 164, 173, 4);
  fill(c, "#abccff", 45, 164, (173 * game.worldEnergy) / 100, 4);
  if (game.noticeTime > 0) {
    fill(c, "#112b34ef", 325, 116, 630, 42);
    text(c, game.notice, 640, 143, 14, "#b7f8da", "center");
  }
  if (!game.saveAvailable) {
    fill(c, "#402839", 325, 164, 630, 34);
    text(
      c,
      "Browser storage is unavailable. Progress lasts for this session.",
      640,
      187,
      13,
      "#ffd9b1",
      "center",
    );
  }
}
export function drawBoss(c, arena) {
  drawArena(c, arena);
  if (arena.collapse > 0) {
    const camera = arena.camera;
    c.save();
    c.translate(640, 360);
    c.scale(camera.zoom, camera.zoom);
    c.translate(-camera.x, -camera.y);
    c.globalAlpha = arena.collapse / 1.4;
    const fall = 1.4 - arena.collapse;
    for (const p of arena.brokenPlatforms)
      for (let i = 0; i < 6; i++) {
        const x = p.x + (i * p.w) / 6 + Math.sin(i * 8) * fall * 55,
          y = p.y + fall * fall * 180 + (i % 2) * 12;
        fill(c, "#c29383", x, y, p.w / 6 - 6, 12);
      }
    c.restore();
  }
  const w = arena.warning;
  if (w) {
    const camera = arena.camera,
      z = camera.zoom;
    c.save();
    c.translate(640, 360);
    c.scale(z, z);
    c.translate(-camera.x, -camera.y);
    c.fillStyle = w.fired ? "#e8a0ff88" : "#ef6a7733";
    c.strokeStyle = w.fired ? "#fff0b4" : "#ff9295";
    c.lineWidth = 3;
    c.setLineDash(w.fired ? [] : [10, 8]);
    const floor = arena.stage.platforms[0].y;
    if (w.kind === "pain") {
      c.beginPath();
      c.ellipse(w.x, w.y, 190, 130, 0, 0, Math.PI * 2);
      c.fill();
      c.stroke();
    } else if (w.kind === "frieza") {
      c.fillRect(0, w.y - 27, 1280, 54);
      c.strokeRect(0, w.y - 27, 1280, 54);
    } else {
      const xs = w.kind === "broly" ? [w.x - 240, w.x, w.x + 240] : [w.x];
      const width = w.kind === "pain" ? 380 : w.kind === "sasuke" ? 280 : 130;
      for (const x of xs) {
        c.fillRect(x - width / 2, floor - 110, width, 120);
        c.strokeRect(x - width / 2, floor - 110, width, 120);
      }
    }
    c.restore();
    fill(c, "#381a2bdf", 355, 90, 570, 48);
    text(
      c,
      (w.fired ? "IMPACT · " : "GET CLEAR · ") + BOSSES[arena.bossId].pattern,
      640,
      120,
      18,
      "#ffd5de",
      "center",
    );
  }
  const percent = arena.resonance;
  fill(c, "#101d32ec", 545, 636, 190, 60);
  text(
    c,
    percent >= 100
      ? "R · RIFTBREAK READY"
      : "RIFTBREAK · " + Math.floor(percent) + "%",
    640,
    660,
    13,
    percent >= 100 ? "#b2ffe0" : "#b7c7df",
    "center",
  );
  fill(c, "#445169", 564, 675, 152, 5);
  fill(c, "#98f4db", 564, 675, (152 * percent) / 100, 5);
  text(c, "BOSS PHASE " + arena.phase, 640, 70, 12, "#e2b9ff", "center");
  if (arena.riftFlash > 0) {
    fill(c, "#aaffed22", 0, 0, 1280, 720);
    const h = arena.fighters[0];
    c.save();
    c.translate(640, 360);
    c.scale(arena.camera.zoom, arena.camera.zoom);
    c.translate(-arena.camera.x, -arena.camera.y);
    c.globalAlpha = arena.riftFlash;
    drawFighter(
      c,
      h.character.id === "goku" ? "naruto" : "goku",
      h.cx - 70 * h.facing,
      h.y + h.h,
      1.3,
      { facing: h.facing, attack: { kind: "neutral", t: 0.15 } },
    );
    c.restore();
    text(c, "COURAGE TRAVELS.", 640, 180, 32, "#e7fff4", "center");
  }
}

function drawGuide(c, name, x, y) {
  if (name === "Naruto") {
    drawFighter(c, "naruto", x, y, 1, { facing: -1 });
    return;
  }
  const dende = name === "Dende";
  fill(c, dende ? "#d5e8d6" : "#536f60", x - 11, y - 43, 22, 36);
  ellipse(c, x - 7, y - 3, 8, 4, "#313b54");
  ellipse(c, x + 8, y - 3, 8, 4, "#313b54");
  ellipse(c, x, y - 58, 12, 14, dende ? "#88bd72" : "#efc49f");
  if (dende) {
    poly(
      c,
      [
        [x - 10, y - 61],
        [x - 23, y - 68],
        [x - 19, y - 53],
        [x - 9, y - 50],
      ],
      "#88bd72",
    );
    poly(
      c,
      [
        [x + 10, y - 61],
        [x + 23, y - 68],
        [x + 19, y - 53],
        [x + 9, y - 50],
      ],
      "#88bd72",
    );
    fill(c, "#725390", x - 13, y - 44, 26, 5);
  } else {
    poly(
      c,
      [
        [x - 13, y - 58],
        [x - 17, y - 73],
        [x - 6, y - 72],
        [x - 8, y - 81],
        [x + 6, y - 76],
        [x + 16, y - 74],
        [x + 10, y - 58],
      ],
      "#c5d5dc",
    );
    fill(c, "#2d4054", x - 12, y - 68, 24, 7);
    fill(c, "#597184", x - 12, y - 54, 24, 11);
    fill(c, "#c3d8df", x - 7, y - 67, 13, 5);
  }
  ellipse(c, x + 5, y - 57, 2, 3, "#263649");
}
