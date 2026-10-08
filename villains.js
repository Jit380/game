const circle = (c, x, y, rx, ry, color) => {
  c.beginPath();
  c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  c.fillStyle = color;
  c.fill();
  c.strokeStyle = "#182234";
  c.lineWidth = 1.8;
  c.stroke();
};
const line = (c, x, y, xx, yy, color, w) => {
  c.beginPath();
  c.moveTo(x, y);
  c.lineTo(xx, yy);
  c.strokeStyle = color;
  c.lineWidth = w;
  c.lineCap = "round";
  c.stroke();
};
const poly = (c, pts, color) => {
  c.beginPath();
  pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.closePath();
  c.fillStyle = color;
  c.fill();
  c.strokeStyle = "#182234";
  c.lineWidth = 1.8;
  c.stroke();
};
export function drawVillain(c, id, x, y, scale = 1, pose = {}) {
  c.save();
  c.translate(x, y);
  c.scale(scale * (pose.facing || 1), scale);
  c.lineJoin = "round";
  const walk = pose.moving ? Math.sin((pose.time || 0) * 15) * 7 : 0,
    hit = !!pose.attack,
    skin = id === "frieza" ? "#f1e9fa" : "#efbc96";
  if (id === "frieza") {
    c.beginPath();
    c.moveTo(-9, -28);
    c.bezierCurveTo(-43, -16, -40, -62, -30, -64);
    c.strokeStyle = "#263247";
    c.lineWidth = 9;
    c.stroke();
    c.strokeStyle = "#e8daf3";
    c.lineWidth = 6;
    c.stroke();
  }
  const pants =
    id === "sasuke"
      ? "#3b455d"
      : id === "pain"
        ? "#282738"
        : id === "broly"
          ? "#e7e9df"
          : "#e3d6f1";
  line(c, -6, -24, -10 - walk, -5, pants, 12);
  line(c, 6, -24, 10 + walk, -5, pants, 12);
  circle(c, -10 - walk, -4, 7, 4, id === "broly" ? "#72344c" : "#39415b");
  circle(c, 10 + walk, -4, 7, 4, id === "broly" ? "#72344c" : "#39415b");
  if (id === "broly") {
    poly(
      c,
      [
        [-18, -48],
        [18, -48],
        [14, -22],
        [-14, -22],
      ],
      skin,
    );
    line(c, -12, -36, -2, -32, "#c68f6e", 2);
    line(c, 12, -36, 2, -32, "#c68f6e", 2);
    poly(
      c,
      [
        [-17, -24],
        [17, -24],
        [23, -12],
        [5, -16],
        [-9, -11],
        [-24, -15],
      ],
      "#6daf55",
    );
  } else {
    poly(
      c,
      [
        [-11, -45],
        [11, -45],
        [13, -24],
        [-13, -24],
      ],
      id === "sasuke" ? "#c5cbd5" : id === "pain" ? "#272a39" : skin,
    );
  }
  if (id === "sasuke") {
    poly(
      c,
      [
        [-8, -46],
        [0, -33],
        [8, -46],
      ],
      "#3a425b",
    );
    line(c, -12, -24, 12, -24, "#9d79c0", 5);
    line(c, 8, -25, 17, -13, "#9d79c0", 4);
  }
  if (id === "pain") {
    poly(
      c,
      [
        [-11, -44],
        [11, -44],
        [15, -12],
        [-15, -12],
      ],
      "#262736",
    );
    line(c, 1, -44, 1, -14, "#bd4b57", 2);
    circle(c, -5, -30, 5, 3, "#ce5362");
    circle(c, 7, -20, 4, 3, "#ce5362");
  }
  if (id === "frieza") {
    circle(c, 0, -37, 8, 6, "#9257bf");
    circle(c, -11, -43, 5, 5, "#af78df");
    circle(c, 11, -43, 5, 5, "#af78df");
  }
  const hx = hit ? 34 : 18,
    hy = hit ? -38 : -27 + walk / 2;
  line(c, -10, -41, -18, -25 - walk / 2, skin, id === "broly" ? 12 : 8);
  line(c, 10, -41, hx, hy, skin, id === "broly" ? 12 : 8);
  circle(c, hx, hy, 5, 5, skin);
  circle(c, 0, -59, 12, 13, skin);
  if (id === "frieza") {
    circle(c, 0, -67, 10, 7, "#9b62cb");
    poly(
      c,
      [
        [-12, -66],
        [-11, -52],
        [-7, -57],
        [-7, -65],
      ],
      "#e5daf0",
    );
    poly(
      c,
      [
        [12, -66],
        [11, -52],
        [7, -57],
        [7, -65],
      ],
      "#e5daf0",
    );
  } else {
    poly(
      c,
      [
        [-11, -55],
        [-16, -68],
        [-9, -68],
        [-15, -79],
        [-4, -74],
        [0, -83],
        [6, -74],
        [15, -78],
        [12, -68],
        [21, -66],
        [10, -55],
        [6, -66],
        [0, -61],
        [-5, -66],
      ],
      id === "pain" ? "#ee8a4c" : id === "broly" ? "#ade767" : "#303248",
    );
  }
  if (id === "pain") {
    line(c, -11, -66, 11, -66, "#424554", 6);
    line(c, -6, -66, 6, -66, "#b8c4d2", 4);
    for (const dx of [-6, -2, 3, 7])
      line(c, dx, -68, dx + 3, -64, "#425263", 1);
    for (const dx of [-9, -6, 7, 10]) circle(c, dx, -53, 0.8, 0.8, "#434252");
  }
  for (const ex of [-5, 6]) {
    circle(c, ex, -58, 3, 3, id === "pain" ? "#b39ada" : "#fff0df");
    circle(c, ex + 0.5, -58, 1.4, 2, id === "sasuke" ? "#bc3d59" : "#423552");
    if (id === "pain") {
      circle(c, ex, -58, 2, 2, "#ba9edb");
      circle(c, ex, -58, 0.8, 0.8, "#48446c");
    }
  }
  line(c, -3, -49, 4, -49, "#875867", 1.5);
  if (hit) {
    c.shadowColor =
      id === "broly" ? "#aff376" : id === "sasuke" ? "#9adfff" : "#d398fa";
    c.shadowBlur = 20;
    circle(c, hx + 6, hy, 10, 10, c.shadowColor);
    for (let i = 0; i < 3; i++)
      line(c, hx + i * 7, hy - 14, hx + i * 7 + 6, hy + 9, c.shadowColor, 2);
  }
  c.restore();
}
