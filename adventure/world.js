import * as THREE from "/vendor/three.module.js";

// The collision map deliberately describes roofs separately from decoration:
// all walkable ground is y=0, with connected streets and landable low rooftops.
export function createRegion(scene, id = "leaf") {
  const leaf = id === "leaf";
  const group = new THREE.Group();
  group.name = `region-${id}`;
  scene.add(group);
  const colliders = [],
    platforms = [],
    animated = [];
  const materials = new Map(),
    geometries = new Map(),
    textures = [];
  const surfaces = new Map(),
    surfaceMaps = new Map(),
    leafCards = [],
    grassCards = [];
  const woodColors = new Set([
    0x786247, 0x564f42, 0x594d44, 0x645341, 0x8b6850, 0x907050, 0x947557,
    0x796046, 0xbfa783, 0x916341, 0x996951, 0x5e5347, 0x603f38, 0x775a43,
    0x6a5140,
  ]);
  const stoneColors = new Set([
    0x827563, 0xb4a08c, 0xab9987, 0xb5a492, 0x9a8a7c, 0x8e7e70, 0x958373,
    0xc4b3a0, 0xa89988, 0x605344, 0xdddac2, 0x8e9c80, 0x7fa89d,
  ]);
  const tileColors = new Set([0x3f7775, 0xab6751, 0xa66551]);
  const M = (color, extra = {}) => {
    const key = `${color}:${JSON.stringify(extra)}`;
    if (!materials.has(key))
      materials.set(
        key,
        new THREE.MeshStandardMaterial({ color, roughness: 0.9, ...extra }),
      );
    return materials.get(key);
  };
  const G = (key, make) => {
    if (!geometries.has(key)) geometries.set(key, make());
    return geometries.get(key);
  };
  const sphere = G("sphere", () => new THREE.SphereGeometry(1, 12, 9));
  const box = G("box", () => new THREE.BoxGeometry(1, 1, 1));
  const cylinder = G("cylinder", () => new THREE.CylinderGeometry(1, 1, 1, 12));
  function mesh(
    geometry,
    material,
    p = [0, 0, 0],
    s = [1, 1, 1],
    parent = group,
    shadow = true,
  ) {
    const object = new THREE.Mesh(geometry, material);
    object.position.set(...p);
    object.scale.set(...s);
    object.castShadow = shadow;
    object.receiveShadow = true;
    parent.add(object);
    return object;
  }
  const cube = (color, p, s, parent = group) =>
    mesh(
      box,
      woodColors.has(color)
        ? P("wood", color)
        : stoneColors.has(color)
          ? P("stone", color)
          : tileColors.has(color)
            ? P("tile", color)
            : M(color),
      p,
      s,
      parent,
    );
  const oval = (color, p, s, parent = group, shadow = true) =>
    mesh(
      sphere,
      stoneColors.has(color) ? P("stone", color) : M(color),
      p,
      s,
      parent,
      shadow,
    );
  function tube(points, radius, material, parent = group) {
    return mesh(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))),
        12,
        radius,
        6,
        false,
      ),
      material,
      [0, 0, 0],
      [1, 1, 1],
      parent,
    );
  }
  function label(text, foreground = "#f4ddb0", background = "#913e32") {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 160;
    const c = canvas.getContext("2d");
    c.fillStyle = background;
    c.fillRect(0, 0, 512, 160);
    c.strokeStyle = foreground;
    c.lineWidth = 8;
    c.strokeRect(10, 10, 492, 140);
    c.fillStyle = foreground;
    c.font = "bold 60px sans-serif";
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText(text, 256, 84);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    textures.push(texture);
    return new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.DoubleSide,
    });
  }
  let seed = leaf ? 4927 : 7293;
  function random() {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  }

  // Surface randomness is separate from world placement. These small authored
  // maps supply real colour, roughness and height detail without external assets.
  let surfaceSeed = leaf ? 782519 : 962281;
  function artRandom() {
    surfaceSeed = (surfaceSeed * 1664525 + 1013904223) >>> 0;
    return surfaceSeed / 4294967296;
  }
  function canvasMap(canvas, colour = false) {
    const t = new THREE.CanvasTexture(canvas);
    if (colour) t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 4;
    textures.push(t);
    return t;
  }
  function makeSurface(kind) {
    if (surfaceMaps.has(kind)) return surfaceMaps.get(kind);
    const size = 512,
      canvases = Array.from({ length: 3 }, () => {
        const c = document.createElement("canvas");
        c.width = c.height = size;
        return c;
      });
    const [colour, height, rough] = canvases.map((c) => c.getContext("2d"));
    for (const [index, ctx] of [colour, height, rough].entries()) {
      const pixels = ctx.createImageData(size, size);
      for (let i = 0; i < pixels.data.length; i += 4) {
        const grain = (artRandom() - 0.5) * (kind === "grass" ? 36 : 20);
        const v =
          (index === 0
            ? 211
            : index === 1
              ? 128
              : kind === "metal"
                ? 122
                : 208) + grain;
        pixels.data[i] = v;
        pixels.data[i + 1] = v + (kind === "grass" && index === 0 ? 12 : 0);
        pixels.data[i + 2] = v - (kind === "grass" && index === 0 ? 19 : 0);
        pixels.data[i + 3] = 255;
      }
      ctx.putImageData(pixels, 0, 0);
    }
    if (["brick", "paver", "tile"].includes(kind)) {
      const rows =
          kind === "brick"
            ? 20
            : kind === "tile"
              ? 13
              : kind === "paver"
                ? 10
                : 7,
        cols =
          kind === "brick"
            ? 9
            : kind === "tile"
              ? 11
              : kind === "paver"
                ? 10
                : 6;
      const bw = size / cols,
        bh = size / rows;
      for (let row = 0; row < rows; row++)
        for (let col = -1; col <= cols; col++) {
          const x = (col + (row % 2 ? 0.5 : 0)) * bw,
            y = row * bh,
            v = 190 + artRandom() * 47;
          colour.fillStyle = `rgb(${v},${v - 5},${v - 10})`;
          colour.fillRect(x + 2, y + 2, bw - 4, bh - 4);
          height.fillStyle = `rgb(${155 + artRandom() * 20},${155 + artRandom() * 20},${155 + artRandom() * 20})`;
          height.fillRect(x + 2, y + 2, bw - 4, bh - 4);
          colour.strokeStyle = "rgba(54,45,36,.46)";
          colour.lineWidth = 2;
          colour.strokeRect(x + 1, y + 1, bw - 2, bh - 2);
          height.strokeStyle = "#3c3c3c";
          height.lineWidth = 3;
          height.strokeRect(x + 1, y + 1, bw - 2, bh - 2);
          colour.fillStyle = "rgba(255,255,239,.2)";
          colour.fillRect(x + 3, y + 3, bw - 6, 1.5);
          if (kind === "tile") {
            colour.strokeStyle = "rgba(43,44,41,.18)";
            colour.beginPath();
            colour.moveTo(x + bw * 0.55, y + 3);
            colour.lineTo(x + bw * 0.5, y + bh - 2);
            colour.stroke();
          }
        }
    }
    if (kind === "stone") {
      // Carved monuments and shoreline rocks are geological surfaces, not
      // courses of masonry. Their layers bend and fade into the stone grain.
      for (let row = 0; row < 24; row++) {
        const y = row * 22 + artRandom() * 8;
        colour.strokeStyle = "rgba(88,79,60,.13)";
        height.strokeStyle = "rgba(159,159,159,.26)";
        for (const ctx of [colour, height]) {
          ctx.lineWidth = 0.7 + artRandom() * 2;
          ctx.beginPath();
          for (let x = 0; x <= size; x += 12) {
            const yy = y + Math.sin(x * 0.017 + row * 0.85) * 4;
            x ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy);
          }
          ctx.stroke();
        }
      }
    }
    if (kind === "wood") {
      for (let x = 0; x < size; x += 3) {
        const v = 130 + artRandom() * 86;
        colour.strokeStyle = `rgba(${v},${v - 13},${v - 25},.3)`;
        height.strokeStyle = `rgb(${110 + artRandom() * 34},${110 + artRandom() * 34},${110 + artRandom() * 34})`;
        for (const c of [colour, height]) {
          c.lineWidth = 0.5 + artRandom() * 1.3;
          c.beginPath();
          for (let y = 0; y <= size; y += 12) {
            const dx = Math.sin(y * 0.02 + x * 0.14) * 1.7;
            y ? c.lineTo(x + dx, y) : c.moveTo(x + dx, y);
          }
          c.stroke();
        }
      }
      for (let i = 0; i < 6; i++) {
        const x = artRandom() * size,
          y = artRandom() * size;
        colour.strokeStyle = "rgba(73,50,29,.28)";
        for (let r = 0; r < 5; r++) {
          colour.beginPath();
          colour.ellipse(x, y, 4 + r * 3, 12 + r * 8, 0.1, 0, Math.PI * 2);
          colour.stroke();
        }
      }
    }
    if (["plaster", "stone", "alien", "metal"].includes(kind)) {
      for (let i = 0; i < 150; i++) {
        const x = artRandom() * size,
          y = artRandom() * size,
          r = 8 + artRandom() * 60;
        const gradient = colour.createRadialGradient(x, y, 0, x, y, r);
        gradient.addColorStop(
          0,
          kind === "metal" ? "rgba(82,95,99,.1)" : "rgba(78,66,49,.12)",
        );
        gradient.addColorStop(1, "rgba(90,90,90,0)");
        colour.fillStyle = gradient;
        colour.fillRect(x - r, y - r, r * 2, r * 2);
      }
      for (let i = 0; i < 18; i++) {
        const x = artRandom() * size,
          y = artRandom() * size;
        colour.strokeStyle = "rgba(57,54,44,.17)";
        height.strokeStyle = "#747474";
        for (const c of [colour, height]) {
          c.lineWidth = kind === "alien" ? 2 : 0.75;
          c.beginPath();
          c.moveTo(x, y);
          c.lineTo(x + 4, y + 16);
          c.lineTo(x - 4, y + 29);
          c.lineTo(x + 5, y + 42);
          c.stroke();
        }
      }
    }
    if (kind === "water") {
      for (let y = 0; y < size; y += 8) {
        height.strokeStyle = `rgba(245,245,245,${0.15 + artRandom() * 0.35})`;
        height.lineWidth = 2;
        height.beginPath();
        for (let x = 0; x <= size; x += 8) {
          const yy = y + Math.sin(x * 0.035 + y * 0.021) * 3;
          x ? height.lineTo(x, yy) : height.moveTo(x, yy);
        }
        height.stroke();
      }
      colour.fillStyle = "#b2e1de";
      colour.fillRect(0, 0, size, size);
      rough.fillStyle = "#777";
      rough.fillRect(0, 0, size, size);
    }
    if (kind === "grass") {
      for (let i = 0; i < 8000; i++) {
        const x = artRandom() * size,
          y = artRandom() * size;
        colour.strokeStyle =
          i % 2 ? "rgba(101,114,79,.2)" : "rgba(247,239,197,.24)";
        colour.lineWidth = 0.7;
        colour.beginPath();
        colour.moveTo(x, y);
        colour.lineTo(x - 1 + artRandom() * 3, y + 1 + artRandom() * 4);
        colour.stroke();
      }
    }
    const result = {
      map: canvasMap(canvases[0], true),
      bumpMap: canvasMap(canvases[1]),
      roughnessMap: canvasMap(canvases[2]),
    };
    surfaceMaps.set(kind, result);
    return result;
  }
  function P(kind, color, extra = {}) {
    const key = `${kind}:${color}:${JSON.stringify(extra)}`;
    if (surfaces.has(key)) return surfaces.get(key);
    const m = new THREE.MeshStandardMaterial({
      color,
      roughness: kind === "metal" ? 0.55 : 0.92,
      metalness: kind === "metal" ? 0.58 : 0,
      ...makeSurface(kind),
      bumpScale:
        kind === "plaster"
          ? 0.025
          : kind === "tile"
            ? 0.065
            : kind === "wood"
              ? 0.035
              : kind === "grass"
                ? 0.02
                : 0.08,
      ...extra,
    });
    m.userData.worldTile =
      kind === "brick"
        ? 3
        : kind === "paver"
          ? 2.3
          : kind === "wood"
            ? 1.2
            : kind === "grass"
              ? 3
              : kind === "tile"
                ? 2
                : 4;
    surfaces.set(key, m);
    return m;
  }
  function foliageMap(blades = false) {
    const c = document.createElement("canvas");
    c.width = c.height = 512;
    const x = c.getContext("2d");
    x.clearRect(0, 0, 512, 512);
    if (blades) {
      for (let i = 0; i < 24; i++) {
        const px = 35 + artRandom() * 442,
          top = 30 + artRandom() * 240,
          bend = (artRandom() - 0.5) * 90;
        x.fillStyle = leaf
          ? ["#557449", "#7a9356", "#b0ad6d"][i % 3]
          : ["#3c9485", "#67b894", "#bad188"][i % 3];
        x.beginPath();
        x.moveTo(px - 5, 512);
        x.quadraticCurveTo(px + bend * 0.2, top + 150, px + bend, top);
        x.quadraticCurveTo(px + bend * 0.5 + 8, top + 160, px + 8, 512);
        x.closePath();
        x.fill();
      }
    } else
      for (let i = 0; i < 90; i++) {
        const px = 35 + artRandom() * 442,
          py = 35 + artRandom() * 442,
          a = artRandom() * Math.PI,
          w = 28 + artRandom() * 29,
          h = 13 + artRandom() * 13;
        x.save();
        x.translate(px, py);
        x.rotate(a);
        x.fillStyle = ["#416d49", "#6b8d52", "#8a9f60", "#315c40"][i % 4];
        x.beginPath();
        x.moveTo(-w, 0);
        x.quadraticCurveTo(-w * 0.12, -h * 1.5, w, 0);
        x.quadraticCurveTo(-w * 0.15, h * 1.3, -w, 0);
        x.fill();
        x.strokeStyle = "rgba(175,192,123,.35)";
        x.lineWidth = 1.2;
        x.beginPath();
        x.moveTo(-w + 3, 0);
        x.lineTo(w - 2, 0);
        x.stroke();
        x.restore();
      }
    const t = canvasMap(c, true);
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    return t;
  }

  const coast = [];
  for (let i = 0; i < 80; i++) {
    const a = (i / 80) * Math.PI * 2,
      r = 154 + Math.sin(a * 7) * 3 + Math.cos(a * 11) * 2;
    coast.push(new THREE.Vector2(Math.sin(a) * r, Math.cos(a) * r));
  }
  const terrainShape = new THREE.Shape(coast);
  const ground = mesh(
    leaf
      ? new THREE.PlaneGeometry(260, 260)
      : new THREE.ShapeGeometry(terrainShape),
    P("grass", leaf ? 0x829261 : 0x54a080),
    [0, -0.035, 0],
    [1, 1, 1],
    group,
    false,
  );
  ground.rotation.x = -Math.PI / 2;
  const roadSamples = [];
  function road(points, width, color) {
    const curve = new THREE.CatmullRomCurve3(
      points.map(([x, z]) => new THREE.Vector3(x, 0.018, z)),
    );
    const samples = curve.getPoints(80),
      positions = [],
      indices = [];
    roadSamples.push({ points: samples, width });
    for (let i = 0; i < samples.length; i++) {
      const tangent = curve.getTangent(i / (samples.length - 1));
      const n = new THREE.Vector3(-tangent.z, 0, tangent.x).multiplyScalar(
        width / 2,
      );
      positions.push(
        samples[i].x + n.x,
        0.019,
        samples[i].z + n.z,
        samples[i].x - n.x,
        0.019,
        samples[i].z - n.z,
      );
      if (i < samples.length - 1) {
        const a = i * 2;
        indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    mesh(
      geometry,
      P(leaf ? "paver" : "stone", color),
      [0, 0, 0],
      [1, 1, 1],
      group,
      false,
    );
    if (leaf)
      for (const side of [-1, 1]) {
        const vertices = [],
          faces = [];
        for (let i = 0; i < samples.length; i++) {
          const tangent = curve.getTangent(i / (samples.length - 1)),
            nx = -tangent.z * side,
            nz = tangent.x * side;
          const x = samples[i].x + (nx * width) / 2,
            z = samples[i].z + (nz * width) / 2;
          const crossing =
            (Math.abs(x) < 6 && Math.abs(z - 10) < 6) ||
            Math.hypot(x, z - 30) < 8.4;
          vertices.push(x, 0.105, z, x + nx * 0.26, 0.075, z + nz * 0.26);
          if (i < samples.length - 1 && !crossing) {
            const a = i * 2;
            faces.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
          }
        }
        const curb = new THREE.BufferGeometry();
        curb.setAttribute(
          "position",
          new THREE.Float32BufferAttribute(vertices, 3),
        );
        curb.setIndex(faces);
        curb.computeVertexNormals();
        mesh(
          curb,
          P("stone", 0x9b998a, { side: THREE.DoubleSide }),
          [0, 0, 0],
          [1, 1, 1],
          group,
          false,
        );
      }
  }
  const roadColor = leaf ? 0xb3aa95 : 0x9cac89;
  road(
    [
      [0, 100],
      [0, 45],
      [0, 10],
      [0, -38],
      [0, -90],
    ],
    9,
    roadColor,
  );
  road(
    [
      [-100, 8],
      [-50, 10],
      [-5, 10],
      [48, 10],
      [100, 8],
    ],
    7,
    roadColor,
  );
  road(
    [
      [-76, -55],
      [-49, -48],
      [-8, -44],
      [35, -28],
      [88, -40],
    ],
    6,
    roadColor,
  );
  road(
    [
      [0, 32],
      [20, 7],
      [30, -20],
    ],
    5,
    roadColor,
  );
  road(
    [
      [-50, 12],
      [-54, -12],
      [-48, -48],
    ],
    5,
    roadColor,
  );

  function stoneRing(x, z, radius, color = 0xb6b5a0) {
    const disk = mesh(
      new THREE.CircleGeometry(radius, 40),
      P(leaf ? "paver" : "stone", color),
      [x, 0.025, z],
      [1, 1, 1],
      group,
      false,
    );
    disk.rotation.x = -Math.PI / 2;
    const ring = mesh(
      new THREE.RingGeometry(radius - 0.22, radius, 48),
      P("stone", leaf ? 0x7e8273 : 0x638475),
      [x, 0.032, z],
      [1, 1, 1],
      group,
      false,
    );
    ring.rotation.x = -Math.PI / 2;
  }
  const arenaPositions = leaf
    ? [
        [30, -20],
        [-48, -48],
      ]
    : [
        [36, -30],
        [-42, -55],
      ];
  const reserved = leaf
    ? [
        [-9, 19],
        [13, 10],
        [-24, -9],
        [48, -7],
        [-60, -30],
        [6, -65],
        [40, 30],
        [-25, 10],
        [65, -60],
        [-5, 27],
      ]
    : [
        [-10, 18],
        [15, 5],
        [-24, -12],
        [55, -16],
        [-63, -37],
        [5, -68],
        [40, 30],
        [-25, 10],
        [65, -60],
        [-5, 27],
      ];
  for (const [x, z] of arenaPositions)
    stoneRing(x, z, 14.5, leaf ? 0xa1a591 : 0x86a690);
  stoneRing(0, 30, 7.5, leaf ? 0xc0b8a0 : 0x92b6a0);

  function safe(x, z, r = 3) {
    if (Math.abs(x) < 9 + r || Math.abs(z - 10) < 5 + r) return false;
    if (Math.hypot(x, z - 32) < 12 + r || Math.hypot(x, z + 78) < 12 + r)
      return false;
    for (const [ax, az] of arenaPositions)
      if (Math.hypot(x - ax, z - az) < 17 + r) return false;
    for (const [rx, rz] of reserved)
      if (Math.hypot(x - rx, z - rz) < 2.5 + r) return false;
    if (
      Math.hypot(x + 54, z + 12) < 7 + r ||
      (Math.abs(x + 52) < 5 + r && z < 12 && z > -45)
    )
      return false;
    return true;
  }
  function tree(x, z, scale = 1) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.scale.setScalar(scale);
    group.add(g);
    if (leaf) {
      mesh(
        new THREE.CylinderGeometry(0.23, 0.44, 4.2, 12),
        P("wood", 0x665543),
        [0, 2.1, 0],
        [1, 1, 1],
        g,
      );
      for (let r = 0; r < 5; r++) {
        const a = (r / 5) * Math.PI * 2;
        tube(
          [
            [Math.sin(a) * 0.85, 0.05, Math.cos(a) * 0.85],
            [Math.sin(a) * 0.25, 0.55, Math.cos(a) * 0.25],
            [0, 1.1, 0],
          ],
          0.12,
          P("wood", 0x665543),
          g,
        );
      }
      tube(
        [
          [0, 2.3, 0],
          [-0.9, 3.4, 0.2],
          [-1.25, 3.85, 0.3],
        ],
        0.17,
        P("wood", 0x665543),
        g,
      );
      tube(
        [
          [0, 2.7, 0],
          [0.85, 3.7, -0.3],
        ],
        0.16,
        P("wood", 0x665543),
        g,
      );
      for (const [dx, dy, dz, s] of [
        [0, 4.8, 0, 2.15],
        [-1.25, 4.3, 0.4, 1.6],
        [1.2, 4.5, -0.5, 1.7],
        [0.25, 5.8, -0.2, 1.55],
      ])
        for (let k = 0; k < 34; k++) {
          const a = artRandom() * Math.PI * 2,
            yy = (artRandom() - 0.5) * s * 1.45,
            rr = Math.sqrt(artRandom()) * s;
          leafCards.push({
            x: x + (dx + Math.cos(a) * rr) * scale,
            y: (dy + yy) * scale,
            z: z + (dz + Math.sin(a) * rr) * scale,
            w: (1.2 + artRandom() * 0.8) * scale,
            h: (1.2 + artRandom() * 0.7) * scale,
            rx: (artRandom() - 0.5) * 2.7,
            ry: artRandom() * Math.PI,
            rz: (artRandom() - 0.5) * 1.3,
            tint: 0.78 + artRandom() * 0.32,
          });
        }
    } else {
      mesh(cylinder, P("wood", 0x919f8f), [0, 3, 0], [0.26, 6, 0.26], g);
      for (let i = 0; i < 4; i++)
        mesh(
          new THREE.TorusGeometry(0.265, 0.027, 4, 12),
          M(0x788f88),
          [0, 1.1 + i, 0],
          [1, 1, 1],
          g,
        ).rotation.x = Math.PI / 2;
      mesh(sphere, P("alien", 0x408b9d), [0, 6.8, 0], [2.75, 1.85, 2.75], g);
      mesh(
        sphere,
        P("alien", 0x70b4aa),
        [-0.2, 7.65, 0.15],
        [2.1, 0.78, 2.1],
        g,
      );
      for (let l = 0; l < 10; l++) {
        const a = (l / 10) * Math.PI * 2;
        const frond = mesh(
          new THREE.ConeGeometry(0.23, 1.4, 5),
          P("alien", 0x69a693),
          [Math.sin(a) * 2.3, 5.9, Math.cos(a) * 2.3],
          [1, 1, 1],
          g,
        );
        frond.rotation.z = Math.PI + Math.sin(a) * 0.4;
        frond.rotation.x = Math.cos(a) * 0.4;
      }
    }
    colliders.push({
      x,
      z,
      w: 0.7 * scale,
      d: 0.7 * scale,
      h: leaf ? 3.5 * scale : 6 * scale,
    });
  }
  function lantern(x, z) {
    mesh(cylinder, P("metal", 0x4a4b43), [x, 1.5, z], [0.09, 3, 0.09]);
    cube(0x594d44, [x, 3.04, z], [0.7, 0.12, 0.7]);
    const glow = mesh(
      new THREE.CylinderGeometry(0.28, 0.32, 0.65, 10),
      P("plaster", 0xffd987, {
        emissive: 0xff9e44,
        emissiveIntensity: 1.1,
        bumpScale: 0.014,
      }),
      [x, 2.63, z],
    );
    for (let i = 0; i < 4; i++)
      cube(
        0x645341,
        [
          x + Math.sin((i * Math.PI) / 2) * 0.28,
          2.62,
          z + Math.cos((i * Math.PI) / 2) * 0.28,
        ],
        [0.045, 0.66, 0.045],
      );
    return glow;
  }
  function curvedRoof(width, depth, height, color, parent, y) {
    // A curved tiled roof uses a sampled profile, lifting the eaves at its ends.
    const vertices = [],
      indices = [],
      segments = 10;
    for (let i = 0; i <= segments; i++) {
      const t = (i / segments) * 2 - 1;
      const ry = height * (1 - Math.abs(t)) + Math.pow(Math.abs(t), 5) * 0.18;
      vertices.push(
        (t * width) / 2,
        y + ry,
        -depth / 2,
        (t * width) / 2,
        y + ry,
        depth / 2,
      );
      if (i < segments) {
        const a = i * 2;
        indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    mesh(
      geo,
      P("tile", color, { side: THREE.DoubleSide }),
      [0, 0, 0],
      [1, 1, 1],
      parent,
    );
    for (let i = 0; i <= 8; i++) {
      const z = -depth / 2 + (i / 8) * depth;
      const points = [];
      for (let j = 0; j <= segments; j++) {
        const t = (j / segments) * 2 - 1;
        points.push([
          (t * width) / 2,
          y +
            height * (1 - Math.abs(t)) +
            Math.pow(Math.abs(t), 5) * 0.18 +
            0.025,
          z,
        ]);
      }
      tube(points, 0.045, M(color === 0x3f7775 ? 0x559290 : 0x995942), parent);
    }
    tube(
      [
        [-width / 2, y + 0.17, -depth / 2],
        [0, y + height, -depth / 2],
        [width / 2, y + 0.17, -depth / 2],
      ],
      0.12,
      M(0x4d534d),
      parent,
    );
    tube(
      [
        [-width / 2, y + 0.17, depth / 2],
        [0, y + height, depth / 2],
        [width / 2, y + 0.17, depth / 2],
      ],
      0.12,
      M(0x4d534d),
      parent,
    );
  }
  function house(
    x,
    z,
    width = 8,
    depth = 7,
    height = 3.3,
    color = 0xf0d4a6,
    roof = 0x3f7775,
    store = false,
  ) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    group.add(g);
    cube(0x827563, [0, 0.18, 0], [width + 0.3, 0.36, depth + 0.3], g);
    mesh(
      box,
      P("plaster", color),
      [0, height / 2, 0],
      [width, height, depth],
      g,
    );
    mesh(
      box,
      P("brick", 0xa58d77),
      [0, 0.4, 0],
      [width + 0.035, 0.57, depth + 0.035],
      g,
    );
    cube(
      0x8b6850,
      [0, height * 0.93, 0],
      [width + 0.12, 0.16, depth + 0.12],
      g,
    );
    for (const a of [-1, 1])
      for (const b of [-1, 1])
        cube(
          0x907050,
          [a * (width / 2 - 0.14), height / 2, b * (depth / 2 - 0.14)],
          [0.24, height, 0.24],
          g,
        );
    const roofY = height - 0.05,
      roofHeight = 0.8;
    curvedRoof(width + 1.4, depth + 1.4, roofHeight, roof, g, roofY);
    // The central ridge has a subtle horizontal landing strip at its exact h.
    cube(roof, [0, height + 0.72, 0], [1.6, 0.1, depth + 0.75], g);
    for (const wx of [-width * 0.29, width * 0.29]) {
      mesh(
        box,
        P("metal", 0x3d5d60, {
          roughness: 0.28,
          metalness: 0.18,
          emissive: store ? 0xe7b36e : 0x98714b,
          emissiveIntensity: store ? 0.35 : 0.11,
          bumpScale: 0.005,
        }),
        [wx, height * 0.58, depth / 2 + 0.015],
        [1.55, 1.18, 0.04],
        g,
      );
      for (let i = -1; i <= 1; i++)
        cube(
          0x947557,
          [wx + i * 0.47, height * 0.58, depth / 2 + 0.05],
          [0.05, 1.25, 0.06],
          g,
        );
      cube(
        0x947557,
        [wx, height * 0.58, depth / 2 + 0.06],
        [1.65, 0.05, 0.06],
        g,
      );
      cube(
        0x947557,
        [wx, height * 0.58 - 0.65, depth / 2 + 0.15],
        [1.9, 0.1, 0.38],
        g,
      );
      for (const side of [-1, 1]) {
        const shutter = cube(
          0x907050,
          [wx + side * 0.92, height * 0.58, depth / 2 + 0.13],
          [0.24, 1.24, 0.1],
          g,
        );
        shutter.rotation.y = side * 0.25;
        for (let slat = 0; slat < 5; slat++)
          cube(
            0x796046,
            [
              wx + side * 0.92,
              height * 0.58 - 0.46 + slat * 0.23,
              depth / 2 + 0.2,
            ],
            [0.24, 0.045, 0.035],
            g,
          );
      }
    }
    cube(0x796046, [0, 1.12, depth / 2 + 0.045], [1.26, 2.2, 0.09], g);
    cube(0xbfa783, [0, 1.12, depth / 2 + 0.1], [0.065, 2.05, 0.05], g);
    cube(0x827563, [0, 0.08, depth / 2 + 0.25], [1.65, 0.16, 0.5], g);
    for (const side of [-1, 1]) {
      const drain = mesh(
        cylinder,
        P("metal", 0x65716b),
        [side * (width / 2 - 0.3), height * 0.45, depth / 2 + 0.12],
        [0.045, height * 0.86, 0.045],
        g,
      );
      mesh(
        cylinder,
        P("metal", 0x65716b),
        [0, height - 0.12, side * (depth / 2 + 0.06)],
        [0.055, width + 0.4, 0.055],
        g,
      ).rotation.z = Math.PI / 2;
      for (const back of [-1, 1])
        cube(
          0x907050,
          [side * (width / 2 + 0.12), 0.64, back * (depth / 2 - 0.3)],
          [0.12, 1.28, 0.12],
          g,
        );
      for (const y of [0.45, 0.9])
        cube(
          0x796046,
          [side * (width / 2 + 0.12), y, 0],
          [0.075, 0.09, depth - 0.6],
          g,
        );
    }
    // Stains, roof flashings and a small chimney ground the houses in daily use.
    cube(
      0x8b6850,
      [0, height - 0.28, -depth / 2 - 0.035],
      [width - 0.2, 0.075, 0.075],
      g,
    );
    const chimneyX = width * 0.25,
      chimneyZ = -depth * 0.22;
    mesh(
      box,
      P("brick", 0x938675),
      [chimneyX, height + 0.38, chimneyZ],
      [0.7, 1.12, 0.7],
      g,
    );
    mesh(
      box,
      P("stone", 0x6f756c),
      [chimneyX, height + 0.96, chimneyZ],
      [0.9, 0.16, 0.9],
      g,
    );
    colliders.push({
      x: x + chimneyX,
      z: z + chimneyZ,
      w: 0.9,
      d: 0.9,
      h: height + 1.04,
    });
    if (store) {
      const sign = mesh(
        new THREE.PlaneGeometry(width * 0.77, 0.95),
        label("ICHIRAKU"),
        [0, 2.55, depth / 2 + 0.15],
        [1, 1, 1],
        g,
        false,
      );
      for (let i = 0; i < 5; i++) {
        const curtain = mesh(
          box,
          P("plaster", i % 2 ? 0x9b5545 : 0xb99061, { bumpScale: 0.012 }),
          [-width * 0.31 + i * width * 0.155, 1.96, depth / 2 + 0.6],
          [width * 0.148, 0.67, 0.04],
          g,
        );
        animated.push({ type: "curtain", mesh: curtain, phase: i });
      }
      const fabric = document.createElement("canvas");
      fabric.width = 512;
      fabric.height = 256;
      const fc = fabric.getContext("2d");
      for (let i = 0; i < 8; i++) {
        fc.fillStyle = i % 2 ? "#9b4b3d" : "#d5bd91";
        fc.fillRect(i * 64, 0, 64, 256);
      }
      for (let i = 0; i < 2400; i++) {
        fc.fillStyle = "rgba(40,30,20,.07)";
        fc.fillRect(artRandom() * 512, artRandom() * 256, 1, 2);
      }
      const awning = mesh(
        new THREE.PlaneGeometry(width * 0.9, 1.7),
        new THREE.MeshStandardMaterial({
          map: canvasMap(fabric, true),
          side: THREE.DoubleSide,
          roughness: 1,
        }),
        [0, 2.87, depth / 2 + 0.85],
        [1, 1, 1],
        g,
      );
      awning.rotation.x = -Math.PI / 2 + 0.15;
      for (const s of [-1, 1])
        tube(
          [
            [s * width * 0.43, 2.75, depth / 2 + 0.1],
            [s * width * 0.43, 2.62, depth / 2 + 1.65],
          ],
          0.04,
          P("metal", 0x4e5850),
          g,
        );
      for (const dx of [-width * 0.38, width * 0.38]) {
        mesh(
          new THREE.CylinderGeometry(0.26, 0.29, 0.6, 16),
          P("plaster", 0xceae7a, {
            emissive: 0xf6a453,
            emissiveIntensity: 0.55,
          }),
          [dx, 2.08, depth / 2 + 0.82],
          [1, 1, 1],
          g,
        );
        mesh(
          cylinder,
          P("metal", 0x565148),
          [dx, 2.4, depth / 2 + 0.82],
          [0.28, 0.055, 0.28],
          g,
        );
      }
      cube(0x916341, [0, 0.9, depth / 2 + 0.55], [width * 0.77, 0.16, 0.8], g);
      for (const dx of [-2, 0, 2]) {
        mesh(
          cylinder,
          M(0x996951),
          [dx, 0.46, depth / 2 + 1.3],
          [0.33, 0.08, 0.33],
          g,
        );
        mesh(
          cylinder,
          M(0x5e5347),
          [dx, 0.22, depth / 2 + 1.3],
          [0.075, 0.4, 0.075],
          g,
        );
      }
    }
    colliders.push({ x, z, w: width, d: depth, h: height + 0.82 });
    platforms.push({
      x,
      z,
      w: width,
      d: depth,
      h: height + 0.82,
      name: store ? "Ramen roof" : "Village rooftop",
    });
  }
  function dome(x, z, radius = 4) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    group.add(g);
    mesh(
      new THREE.SphereGeometry(radius, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2),
      P("plaster", 0xc1d4bd),
      [0, 0.15, 0],
      [1, 1, 1],
      g,
    );
    mesh(
      new THREE.TorusGeometry(radius, 0.12, 6, 32),
      P("metal", 0x477570),
      [0, 0.18, 0],
      [1, 1, 1],
      g,
    ).rotation.x = Math.PI / 2;
    cube(0x789c9e, [0, 1.22, radius - 0.22], [1.56, 2.3, 0.18], g);
    mesh(
      new THREE.TorusGeometry(1, 0.09, 6, 20, Math.PI),
      M(0x9bc4b5),
      [0, 2, radius - 0.16],
      [0.77, 0.94, 1],
      g,
    );
    for (const s of [-1, 1]) {
      const window = mesh(
        new THREE.CircleGeometry(0.5, 16),
        P("metal", 0x4d9aaa, {
          emissive: 0x287b87,
          emissiveIntensity: 0.22,
          roughness: 0.23,
        }),
        [s * 2.45, 1.8, radius * 0.64],
        [1, 1, 1],
        g,
      );
      window.rotation.y = s * 0.7;
      tube(
        [
          [s * radius * 0.43, 3, 0],
          [s * radius * 0.57, 4.3, -0.15],
          [s * radius * 0.62, 5.4, -0.18],
        ],
        0.09,
        P("plaster", 0xc7d5bf),
        g,
      );
      oval(0xd6e8cc, [s * radius * 0.62, 5.4, -0.18], [0.23, 0.23, 0.23], g);
      for (let stripe = 0; stripe < 3; stripe++)
        mesh(
          new THREE.TorusGeometry(radius * 0.82, 0.025, 4, 32, Math.PI * 0.58),
          P("metal", 0x7b9c91),
          [0, 0.5 + stripe * 0.28, 0],
          [1, 1, 1],
          g,
        ).rotation.x = Math.PI / 2;
    }
    colliders.push({
      x,
      z,
      w: radius * 1.65,
      d: radius * 1.65,
      h: radius + 0.15,
    });
    platforms.push({
      x,
      z,
      w: radius * 1.25,
      d: radius * 1.25,
      h: radius + 0.15,
      name: "Namek dome",
    });
  }

  if (leaf) {
    // A village set at human scale, rather than a sparse grid of blocks.
    house(-19, 27, 9, 7, 3.1, 0xe8cca0, 0xab6751, true);
    house(19, 34, 8, 7, 3.6, 0xe1dbc0, 0x3f7775);
    house(-24, 52, 9, 8, 3.5, 0xe6bc93, 0x3f7775);
    house(24, 62, 8, 8, 3.1, 0xebd8ab, 0xa66551);
    house(-43, 35, 10, 8, 3.6, 0xb9c4ae, 0x3f7775);
    house(50, 38, 11, 8, 3.4, 0xe8d4ae, 0xa66551);
    house(-23, -15, 8, 8, 3.4, 0xe3c39e, 0x3f7775);
    house(17, -61, 9, 7, 3.3, 0xe8ccb2, 0xab6751);
    house(58, -57, 10, 8, 3.6, 0xd4d1b2, 0x3f7775);
    house(-72, -12, 8, 7, 3.4, 0xe2bba1, 0xa66551);
    house(72, -8, 9, 9, 3.4, 0xe6d0a6, 0x3f7775);
    for (const [i, [x, z]] of [
      [-17, 81],
      [17, 83],
      [-45, 68],
      [44, 70],
      [-68, 51],
      [69, 56],
      [-85, 29],
      [84, 28],
      [-68, 81],
      [75, 84],
      [-86, -41],
      [86, -49],
      [-79, -78],
      [-62, -80],
      [-18, -42],
      [16, -39],
      [46, -1],
    ].entries()) {
      house(
        x,
        z,
        7.5 + (i % 3),
        6.5 + (i % 2),
        3 + (i % 3) * 0.23,
        [0xe9cfab, 0xd5cfb1, 0xe3baa0][i % 3],
        i % 2 ? 0x3f7775 : 0xa66551,
      );
    }
    // Administrative tower and inset balconies, a recognizable leaf skyline.
    const tower = new THREE.Group();
    tower.position.set(-29, 0, -70);
    group.add(tower);
    mesh(
      new THREE.CylinderGeometry(6, 7.2, 9.8, 20),
      P("brick", 0xb99c88),
      [0, 4.9, 0],
      [1, 1, 1],
      tower,
    );
    for (let floor = 0; floor < 3; floor++) {
      const y = 2.2 + floor * 2.7;
      mesh(
        new THREE.CylinderGeometry(6.4, 6.4, 0.18, 20),
        M(0xa26956),
        [0, y - 1.02, 0],
        [1, 1, 1],
        tower,
      );
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        const win = cube(
          0x5e8e98,
          [Math.sin(a) * 6.04, y, Math.cos(a) * 6.04],
          [0.7, 1.14, 0.12],
          tower,
        );
        win.rotation.y = a;
      }
    }
    for (const [y, r] of [
      [10.2, 7.7],
      [12.2, 5.7],
    ])
      mesh(
        new THREE.ConeGeometry(r, 2.1, 20),
        P("tile", 0x634e44),
        [0, y, 0],
        [1, 1, 1],
        tower,
      );
    mesh(
      new THREE.PlaneGeometry(3.8, 2.2),
      label("火", "#d82e28", "#f1e2bc"),
      [0, 8, 6.12],
      [1, 1, 1],
      tower,
      false,
    );
    colliders.push({ x: -29, z: -70, w: 13, d: 13, h: 13.25 });
    // Monument cliff: multiple carved human silhouettes set into weathered rock.
    // The monument is embedded in an irregular stone escarpment.
    for (let r = 0; r < 9; r++) {
      const x = (r - 4) * 15;
      const rock = mesh(
        new THREE.CylinderGeometry(8.5, 10.6, 21 + Math.sin(r * 1.8) * 3, 7),
        P("stone", r % 2 ? 0x968b78 : 0x887e6d),
        [x, 10.5, -110],
        [1, 1, 1],
      );
      rock.rotation.y = r * 0.47;
      oval(0xadb095, [x, 22 + Math.sin(r * 1.8) * 1.5, -112], [9, 3, 8]);
    }
    for (let i = 0; i < 5; i++) {
      const x = (i - 2) * 21;
      oval(0xb5a492, [x, 16, -98], [7.8, 9.4, 3.7]);
      oval(0x9a8a7c, [x, 10.8, -96], [4.8, 3.3, 1.5]);
      for (const s of [-1, 1]) {
        cube(0x8e7e70, [x + s * 2.3, 17, -94.9], [2.5, 0.7, 0.8]);
        oval(0x958373, [x + s * 5.9, 15.2, -96.6], [1.3, 2.4, 1.2]);
      }
      mesh(
        new THREE.ConeGeometry(1.7, 4.6, 5),
        M(0xc4b3a0),
        [x, 15, -94.1],
        [1, 1, 0.7],
      ).rotation.x = Math.PI * 0.08;
      cube(0x8e7e70, [x, 12, -94.3], [3, 0.38, 0.75]);
      for (let h = 0; h < 5; h++)
        oval(
          0xa89988,
          [x - 5.5 + h * 2.7, 23 - Math.abs(h - 2) * 0.65, -97.2],
          [2.25, 1.7, 2],
        );
    }
    for (let i = 0; i < 7; i++)
      mesh(
        sphere,
        P("grass", 0x4f6144),
        [-78 + i * 27, 6, -125],
        [19, 14 + random() * 10, 16],
        group,
        false,
      );
    for (const [x, z] of [
      [-6, 23],
      [6, 23],
      [-6, -9],
      [6, -9],
      [-7, -60],
      [7, -60],
      [-38, 15],
      [40, 15],
    ])
      lantern(x, z);
  } else {
    for (const [x, z, r] of [
      [-20, 33, 4],
      [22, 52, 4.5],
      [-40, 46, 4.3],
      [48, 30, 4.4],
      [65, -6, 4.8],
      [-65, -15, 4.7],
      [20, -64, 4.1],
    ])
      dome(x, z, r);
    // Sea stays outside the playable level; the walkable island is solid ground.
    const water = mesh(
      new THREE.PlaneGeometry(900, 900),
      P("water", 0x286c87, {
        roughness: 0.25,
        metalness: 0.22,
        bumpScale: 0.16,
      }),
      [0, -1.4, 0],
      [1, 1, 1],
      group,
      false,
    );
    water.rotation.x = -Math.PI / 2;
    animated.push({ type: "water", texture: water.material.bumpMap });
    const bankVertices = [],
      bankIndices = [];
    for (let i = 0; i <= coast.length; i++) {
      const p = coast[i % coast.length],
        normal = p.clone().normalize();
      bankVertices.push(
        p.x,
        -0.02,
        -p.y,
        p.x + normal.x * 1.8,
        -1.35,
        -p.y - normal.y * 1.8,
      );
      if (i < coast.length) {
        const a = i * 2;
        bankIndices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    const bank = new THREE.BufferGeometry();
    bank.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(bankVertices, 3),
    );
    bank.setIndex(bankIndices);
    bank.computeVertexNormals();
    mesh(
      bank,
      P("stone", 0x91aa83, { side: THREE.DoubleSide }),
      [0, 0, 0],
      [1, 1, 1],
      group,
      false,
    );
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2,
        x = Math.sin(a) * 219,
        z = Math.cos(a) * 219;
      oval(
        0x328f91,
        [x, -1.4, z],
        [22 + random() * 20, 5 + random() * 7, 25 + random() * 12],
        group,
        false,
      );
      oval(
        0x68b598,
        [x, 1.6, z],
        [16 + random() * 10, 1.8, 20 + random() * 9],
        group,
        false,
      );
    }
    const moonCanvas = document.createElement("canvas");
    moonCanvas.width = moonCanvas.height = 512;
    const mc = moonCanvas.getContext("2d");
    mc.fillStyle = "#dbd2b6";
    mc.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 140; i++) {
      const x = artRandom() * 512,
        y = artRandom() * 512,
        r = 3 + artRandom() * 20;
      mc.fillStyle = "rgba(88,105,94,.13)";
      mc.beginPath();
      mc.ellipse(x, y, r, r * 0.63, 0, 0, Math.PI * 2);
      mc.fill();
      mc.strokeStyle = "rgba(246,245,206,.28)";
      mc.stroke();
    }
    const moonTexture = canvasMap(moonCanvas, true);
    mesh(
      sphere,
      new THREE.MeshStandardMaterial({
        color: 0xe0dab9,
        map: moonTexture,
        roughness: 1,
        fog: false,
      }),
      [-85, 48, -165],
      [19, 19, 19],
      group,
      false,
    );
    mesh(
      sphere,
      new THREE.MeshStandardMaterial({
        color: 0xa8ddd5,
        map: moonTexture,
        roughness: 1,
        fog: false,
      }),
      [112, 35, -145],
      [12, 12, 12],
      group,
      false,
    );
    // Broken alien spacecraft beside the battlefields, with rounded strakes.
    const craft = new THREE.Group();
    craft.position.set(70, 0, -74);
    craft.rotation.z = -0.14;
    group.add(craft);
    mesh(
      new THREE.CylinderGeometry(2.5, 5.7, 2, 32),
      P("metal", 0x9eaba9, { metalness: 0.55, roughness: 0.44 }),
      [0, 2.4, 0],
      [1, 1, 1],
      craft,
    );
    oval(0x885fbb, [0, 3.42, 0], [2.7, 1.4, 2.7], craft);
    mesh(
      new THREE.TorusGeometry(5.2, 0.2, 6, 32),
      M(0x745491),
      [0, 1.8, 0],
      [1, 1, 1],
      craft,
    ).rotation.x = Math.PI / 2;
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      mesh(
        cylinder,
        M(0x6b7773),
        [Math.sin(a) * 4.3, 0.85, Math.cos(a) * 4.3],
        [0.17, 1.7, 0.17],
        craft,
      );
    }
    colliders.push({ x: 70, z: -74, w: 10, d: 10, h: 4.8 });
    platforms.push({
      x: 70,
      z: -74,
      w: 5,
      d: 5,
      h: 4.8,
      name: "Spacecraft hull",
    });
  }

  // Shared inter-world gate. A glowing interior indicates the travel objective.
  const gate = new THREE.Group();
  gate.position.set(0, 0, -78);
  group.add(gate);
  if (leaf) {
    for (const s of [-1, 1]) {
      mesh(cylinder, M(0xac4e3d), [s * 4.2, 3.65, 0], [0.31, 7.3, 0.31], gate);
      cube(0x605344, [s * 4.2, 0.2, 0], [0.9, 0.4, 0.9], gate);
    }
    tube(
      [
        [-5.2, 7.1, 0],
        [0, 6.85, 0],
        [5.2, 7.1, 0],
      ],
      0.29,
      M(0xac4e3d),
      gate,
    );
    cube(0x603f38, [0, 6.17, 0], [9.7, 0.23, 0.28], gate);
  } else {
    for (const s of [-1, 1])
      oval(0xdddac2, [s * 3.8, 3.2, 0], [0.5, 3.2, 0.5], gate);
    tube(
      [
        [-3.8, 5.7, 0],
        [-2.6, 7, 0],
        [0, 7.7, 0],
        [2.6, 7, 0],
        [3.8, 5.7, 0],
      ],
      0.45,
      M(0xdddac2),
      gate,
    );
  }
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0x7cdbef,
    transparent: true,
    opacity: 0.16,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const portal = mesh(
    new THREE.PlaneGeometry(6.4, 5.6),
    glowMat,
    [0, 3.2, 0],
    [1, 1, 1],
    gate,
    false,
  );
  const gateRing = mesh(
    new THREE.TorusGeometry(2.6, 0.055, 5, 64),
    new THREE.MeshBasicMaterial({ color: 0x9bffef }),
    [0, 3.2, 0.02],
    [1, 1, 1],
    gate,
    false,
  );
  animated.push(
    { type: "portal", mesh: gateRing },
    { type: "glow", mesh: portal },
  );
  const travelSign = mesh(
    new THREE.PlaneGeometry(3.6, 0.65),
    label(leaf ? "TO NAMEK" : "TO THE LEAF", "#b9f4e4", "#253e49"),
    [0, 6.04, 0.14],
    [1, 1, 1],
    gate,
    false,
  );
  // A small quiet camp. Its centre remains free for the player and interaction.
  for (const s of [-1, 1]) {
    if (leaf) lantern(s * 6, 31);
    else oval(0x83e8c4, [s * 6, 0.7, 31], [0.4, 0.7, 0.4]);
  }
  const campRing = mesh(
    new THREE.RingGeometry(3, 3.12, 48),
    new THREE.MeshBasicMaterial({
      color: 0x88ecd3,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
    }),
    [0, 0.065, 30],
    [1, 1, 1],
    group,
    false,
  );
  campRing.rotation.x = -Math.PI / 2;
  animated.push({ type: "camp", mesh: campRing });
  if (leaf) {
    cube(0x775a43, [4.5, 0.64, 34], [2.5, 0.18, 0.7]);
    for (const x of [3.5, 5.5])
      cube(0x6a5140, [x, 0.28, 34], [0.16, 0.56, 0.5]);
  }

  // Deterministic foliage avoids quest spaces and the connected roads.
  for (let i = 0; i < 115; i++) {
    const x = -99 + random() * 198,
      z = -93 + random() * 192;
    if (
      safe(x, z, 2.5) &&
      !colliders.some(
        (c) =>
          Math.abs(x - c.x) < c.w / 2 + 3.5 &&
          Math.abs(z - c.z) < c.d / 2 + 3.5,
      )
    )
      tree(x, z, 0.82 + random() * 0.3);
  }
  // Small wildflower clusters and rocks add scale cues without physical traps.
  for (let i = 0; i < 100; i++) {
    const x = -93 + random() * 186,
      z = -91 + random() * 182;
    if (
      !safe(x, z, 0.3) ||
      colliders.some(
        (c) =>
          Math.abs(x - c.x) < c.w / 2 + 1 && Math.abs(z - c.z) < c.d / 2 + 1,
      )
    )
      continue;
    if (i % 3 === 0) {
      oval(
        leaf ? 0x8e9c80 : 0x7fa89d,
        [x, 0.18, z],
        [0.4 + random() * 0.4, 0.3, 0.5],
      );
    } else {
      for (let b = 0; b < 3; b++) {
        const dx = random() * 0.8,
          dz = random() * 0.8;
        mesh(
          cylinder,
          M(leaf ? 0x628657 : 0x499e82),
          [x + dx, 0.15, z + dz],
          [0.012, 0.3, 0.012],
          group,
          false,
        );
        oval(
          leaf ? [0xffdf83, 0xe9b5bb, 0xc4b9e5][i % 3] : 0xc6efac,
          [x + dx, 0.31, z + dz],
          [0.065, 0.035, 0.065],
          group,
          false,
        );
      }
    }
  }
  function onRoad(x, z) {
    for (const path of roadSamples)
      for (let i = 0; i < path.points.length - 1; i++) {
        const a = path.points[i],
          b = path.points[i + 1],
          dx = b.x - a.x,
          dz = b.z - a.z,
          t = Math.max(
            0,
            Math.min(
              1,
              ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz),
            ),
          );
        if (
          (x - a.x - t * dx) ** 2 + (z - a.z - t * dz) ** 2 <
          (path.width / 2 + 0.4) ** 2
        )
          return true;
      }
    return false;
  }
  function canGrow(x, z) {
    if (
      Math.hypot(x, z - 30) < 9 ||
      Math.hypot(x, z + 78) < 7 ||
      arenaPositions.some(([ax, az]) => Math.hypot(x - ax, z - az) < 15) ||
      reserved.some(([rx, rz]) => Math.hypot(x - rx, z - rz) < 1.6) ||
      onRoad(x, z)
    )
      return false;
    return !colliders.some(
      (c) =>
        Math.abs(x - c.x) < c.w / 2 + 0.45 &&
        Math.abs(z - c.z) < c.d / 2 + 0.45,
    );
  }
  for (let i = 0; i < 2600; i++) {
    const range = leaf ? 105 : 142,
      x = -range + artRandom() * range * 2,
      z = -range + artRandom() * range * 2;
    if ((!leaf && Math.hypot(x, z) > 148) || !canGrow(x, z)) continue;
    for (let k = 0; k < 3; k++) {
      const px = x + (artRandom() - 0.5) * 1.5,
        pz = z + (artRandom() - 0.5) * 1.5;
      if (!canGrow(px, pz)) continue;
      const h = 0.26 + artRandom() * 0.38,
        rotation = artRandom() * Math.PI;
      for (let side = 0; side < 2; side++)
        grassCards.push({
          x: px,
          y: h / 2,
          z: pz,
          w: 0.65 + artRandom() * 0.5,
          h,
          rx: 0,
          ry: rotation + (side * Math.PI) / 2,
          rz: 0,
          tint: 0.8 + artRandom() * 0.28,
        });
    }
  }
  // Weathered aftermath belongs to the scenery. Encounter state and active
  // effects remain in the controller, and the clear combat surfaces stay flat.
  const scorchCanvas = document.createElement("canvas");
  scorchCanvas.width = scorchCanvas.height = 512;
  const sc = scorchCanvas.getContext("2d");
  const burn = sc.createRadialGradient(256, 256, 15, 256, 256, 244);
  burn.addColorStop(0, "rgba(42,37,30,.6)");
  burn.addColorStop(0.65, "rgba(48,44,35,.38)");
  burn.addColorStop(1, "rgba(45,45,38,0)");
  sc.fillStyle = burn;
  sc.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 19; i++) {
    const a = artRandom() * Math.PI * 2;
    sc.strokeStyle = "rgba(38,33,28,.4)";
    sc.lineWidth = 1 + artRandom() * 3;
    sc.beginPath();
    sc.moveTo(256 + Math.cos(a) * 25, 256 + Math.sin(a) * 25);
    sc.lineTo(256 + Math.cos(a + 0.08) * 130, 256 + Math.sin(a + 0.08) * 130);
    sc.lineTo(256 + Math.cos(a) * 220, 256 + Math.sin(a) * 220);
    sc.stroke();
  }
  const scorchTexture = canvasMap(scorchCanvas, true);
  scorchTexture.wrapS = scorchTexture.wrapT = THREE.ClampToEdgeWrapping;
  for (const [index, [x, z]] of arenaPositions.entries()) {
    if (!leaf || index === 1) {
      const mark = mesh(
        new THREE.PlaneGeometry(index === 1 ? 16 : 9, index === 1 ? 16 : 9),
        new THREE.MeshBasicMaterial({
          map: scorchTexture,
          transparent: true,
          opacity: leaf ? 0.35 : 0.65,
          depthWrite: false,
        }),
        [x, 0.044, z],
        [1, 1, 1],
        group,
        false,
      );
      mark.rotation.x = -Math.PI / 2;
    }
    for (let d = 0; d < 11; d++) {
      const a = (d / 11) * Math.PI * 2,
        r = 14.4 + artRandom() * 1.8;
      const rock = mesh(
        sphere,
        P("stone", leaf ? 0x8e9282 : 0x5e8574),
        [x + Math.cos(a) * r, 0.08, z + Math.sin(a) * r],
        [
          0.25 + artRandom() * 0.4,
          0.12 + artRandom() * 0.12,
          0.25 + artRandom() * 0.4,
        ],
        group,
        false,
      );
      rock.rotation.set(artRandom(), artRandom(), artRandom());
    }
  }
  const windUniforms = [];
  function instances(cards, blades = false) {
    const map = foliageMap(blades),
      geometry = new THREE.PlaneGeometry(1, 1);
    const material = new THREE.MeshStandardMaterial({
      map,
      alphaTest: 0.34,
      alphaToCoverage: true,
      side: THREE.DoubleSide,
      roughness: 1,
      metalness: 0,
      color: 0xffffff,
      emissive: leaf ? 0x49673b : 0x417c66,
      emissiveIntensity: blades ? 0.55 : 0.65,
    });
    material.onBeforeCompile = (shader) => {
      shader.uniforms.foliageTime = { value: 0 };
      windUniforms.push(shader.uniforms.foliageTime);
      shader.vertexShader =
        "uniform float foliageTime;\n" + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\n#ifdef USE_INSTANCING\ntransformed.x += sin(foliageTime*1.4 + instanceMatrix[3].x*.23 + instanceMatrix[3].z*.19) * " +
          (blades ? ".075" : ".035") +
          " * (position.y+.5);\n#endif",
      );
    };
    material.customProgramCacheKey = () =>
      blades ? "world-grass-wind" : "world-canopy-wind";
    const chunks = new Map();
    for (const card of cards) {
      const key = Math.floor(card.x / 48) + ":" + Math.floor(card.z / 48);
      if (!chunks.has(key)) chunks.set(key, []);
      chunks.get(key).push(card);
    }
    const matrix = new THREE.Matrix4(),
      position = new THREE.Vector3(),
      rotation = new THREE.Quaternion(),
      scale = new THREE.Vector3(),
      euler = new THREE.Euler();
    for (const chunk of chunks.values()) {
      const canopy = new THREE.InstancedMesh(geometry, material, chunk.length);
      canopy.name = blades ? "wind-grass" : "layered-leaf-canopy";
      canopy.castShadow = !blades;
      canopy.receiveShadow = true;
      for (const [i, card] of chunk.entries()) {
        position.set(card.x, card.y, card.z);
        euler.set(card.rx, card.ry, card.rz);
        rotation.setFromEuler(euler);
        scale.set(card.w, card.h, 1);
        matrix.compose(position, rotation, scale);
        canopy.setMatrixAt(i, matrix);
        canopy.setColorAt(i, new THREE.Color(card.tint, card.tint, card.tint));
      }
      canopy.computeBoundingSphere();
      group.add(canopy);
    }
  }
  if (leafCards.length) instances(leafCards);
  if (grassCards.length) instances(grassCards, true);
  for (let i = 0; i < 12; i++) {
    const cloud = new THREE.Group();
    cloud.position.set(-150 + i * 28, 38 + random() * 12, -70 - random() * 80);
    group.add(cloud);
    for (let p = 0; p < 3; p++)
      oval(
        leaf ? 0xf8f2dc : 0xcaf5d9,
        [p * 4 - 4, Math.sin(p) * 1.4, 0],
        [5.5, 2.1, 3.1],
        cloud,
        false,
      );
    animated.push({
      type: "cloud",
      mesh: cloud,
      origin: cloud.position.x,
      phase: i,
    });
  }
  // Bake static surfaces into material batches. The detail stays in the geometry,
  // but the renderer submits a few dozen surfaces rather than thousands of tiny
  // window bars, tiles, flowers, and leaves on every frame.
  const sourceGeometries = new Set();
  const dynamic = new Set();
  for (const item of animated)
    item.mesh?.traverse((object) => dynamic.add(object));
  group.updateMatrixWorld(true);
  const batches = new Map();
  group.traverse((object) => {
    if (!object.isMesh) return;
    sourceGeometries.add(object.geometry);
    if (
      object.isInstancedMesh ||
      dynamic.has(object) ||
      Array.isArray(object.material)
    )
      return;
    const key = `${object.material.uuid}:${object.castShadow}:${object.receiveShadow}`;
    if (!batches.has(key)) batches.set(key, []);
    batches.get(key).push(object);
  });
  for (const sources of batches.values()) {
    if (sources.length < 4 && !sources[0].material.userData.worldTile) continue;
    let count = 0;
    for (const object of sources)
      count += object.geometry.index
        ? object.geometry.index.count
        : object.geometry.attributes.position.count;
    const positions = new Float32Array(count * 3),
      normals = new Float32Array(count * 3),
      uvs = new Float32Array(count * 2);
    let cursor = 0;
    const p = new THREE.Vector3(),
      n = new THREE.Vector3(),
      normalMatrix = new THREE.Matrix3();
    for (const object of sources) {
      const attributes = object.geometry.attributes,
        index = object.geometry.index;
      const length = index ? index.count : attributes.position.count;
      normalMatrix.getNormalMatrix(object.matrixWorld);
      for (let i = 0; i < length; i++) {
        const v = index ? index.getX(i) : i;
        p.fromBufferAttribute(attributes.position, v).applyMatrix4(
          object.matrixWorld,
        );
        positions[cursor * 3] = p.x;
        positions[cursor * 3 + 1] = p.y;
        positions[cursor * 3 + 2] = p.z;
        if (attributes.normal)
          n.fromBufferAttribute(attributes.normal, v)
            .applyMatrix3(normalMatrix)
            .normalize();
        else n.set(0, 1, 0);
        normals[cursor * 3] = n.x;
        normals[cursor * 3 + 1] = n.y;
        normals[cursor * 3 + 2] = n.z;
        const tile = object.material.userData.worldTile;
        if (tile) {
          if (Math.abs(n.y) > 0.6) {
            uvs[cursor * 2] = p.x / tile;
            uvs[cursor * 2 + 1] = p.z / tile;
          } else if (Math.abs(n.x) > Math.abs(n.z)) {
            uvs[cursor * 2] = p.z / tile;
            uvs[cursor * 2 + 1] = p.y / tile;
          } else {
            uvs[cursor * 2] = p.x / tile;
            uvs[cursor * 2 + 1] = p.y / tile;
          }
        } else if (attributes.uv) {
          uvs[cursor * 2] = attributes.uv.getX(v);
          uvs[cursor * 2 + 1] = attributes.uv.getY(v);
        }
        cursor++;
      }
      object.removeFromParent();
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
    geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
    geometry.computeBoundingSphere();
    const batch = new THREE.Mesh(geometry, sources[0].material);
    batch.name = "static-world-batch";
    batch.castShadow = sources[0].castShadow;
    batch.receiveShadow = sources[0].receiveShadow;
    group.add(batch);
  }
  return {
    group,
    colliders,
    platforms,
    spawn: { x: 0, y: 0, z: 36 },
    update(time) {
      for (const uniform of windUniforms) uniform.value = time;
      for (const a of animated) {
        if (a.type === "water") {
          a.texture.offset.set(time * 0.012, time * 0.004);
          continue;
        }
        if (a.type === "curtain")
          a.mesh.rotation.x = Math.sin(time * 1.8 + a.phase) * 0.035;
        if (a.type === "portal") a.mesh.rotation.z = time * 0.13;
        if (a.type === "glow")
          a.mesh.material.opacity = 0.1 + Math.sin(time * 1.8) * 0.045;
        if (a.type === "camp")
          a.mesh.material.opacity = 0.4 + Math.sin(time * 1.9) * 0.16;
        if (a.type === "cloud")
          a.mesh.position.x = a.origin + Math.sin(time * 0.022 + a.phase) * 7;
      }
    },
    dispose() {
      const geometriesToDispose = new Set(sourceGeometries),
        materialsToDispose = new Set();
      group.traverse((object) => {
        if (object.isInstancedMesh) object.dispose();
        if (object.geometry) geometriesToDispose.add(object.geometry);
        if (object.material)
          for (const m of Array.isArray(object.material)
            ? object.material
            : [object.material])
            materialsToDispose.add(m);
      });
      for (const geometry of geometriesToDispose) geometry.dispose();
      for (const material of materialsToDispose) material.dispose();
      for (const texture of textures) texture.dispose();
      scene.remove(group);
    },
  };
}
