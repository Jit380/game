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
    mesh(box, M(color), p, s, parent);
  const oval = (color, p, s, parent = group, shadow = true) =>
    mesh(sphere, M(color), p, s, parent, shadow);
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

  const groundCanvas = document.createElement("canvas");
  groundCanvas.width = groundCanvas.height = 512;
  const gc = groundCanvas.getContext("2d");
  gc.fillStyle = leaf ? "#82ad5e" : "#59b89d";
  gc.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 4800; i++) {
    gc.fillStyle = leaf
      ? i % 2
        ? "#99ba6d"
        : "#749c59"
      : i % 2
        ? "#65c0a5"
        : "#48a991";
    const x = random() * 512,
      y = random() * 512;
    gc.fillRect(x, y, 1 + random() * 3, 2);
  }
  const groundTexture = new THREE.CanvasTexture(groundCanvas);
  groundTexture.colorSpace = THREE.SRGBColorSpace;
  groundTexture.wrapS = groundTexture.wrapT = THREE.RepeatWrapping;
  groundTexture.repeat.set(20, 20);
  textures.push(groundTexture);
  const ground = mesh(
    new THREE.PlaneGeometry(240, 240),
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: groundTexture,
      roughness: 1,
    }),
    [0, -0.035, 0],
    [1, 1, 1],
    group,
    false,
  );
  ground.rotation.x = -Math.PI / 2;
  function road(points, width, color) {
    const curve = new THREE.CatmullRomCurve3(
      points.map(([x, z]) => new THREE.Vector3(x, 0.018, z)),
    );
    const samples = curve.getPoints(80),
      positions = [],
      indices = [];
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
    mesh(geometry, M(color), [0, 0, 0], [1, 1, 1], group, false);
  }
  const roadColor = leaf ? 0xdac99a : 0xc1d4a7;
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
      M(color),
      [x, 0.025, z],
      [1, 1, 1],
      group,
      false,
    );
    disk.rotation.x = -Math.PI / 2;
    const ring = mesh(
      new THREE.RingGeometry(radius - 0.22, radius, 48),
      M(leaf ? 0x9a967b : 0x78a490),
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
    stoneRing(x, z, 14.5, leaf ? 0xbec396 : 0x9dc4a5);
  stoneRing(0, 30, 7.5, leaf ? 0xd5caa7 : 0xa5d5bb);

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
      mesh(cylinder, M(0x786247), [0, 2.1, 0], [0.34, 4.2, 0.34], g);
      tube(
        [
          [0, 2.3, 0],
          [-0.9, 3.4, 0.2],
          [-1.25, 3.85, 0.3],
        ],
        0.17,
        M(0x786247),
        g,
      );
      tube(
        [
          [0, 2.7, 0],
          [0.85, 3.7, -0.3],
        ],
        0.16,
        M(0x786247),
        g,
      );
      for (const [dx, dy, dz, s] of [
        [0, 4.8, 0, 2.15],
        [-1.25, 4.3, 0.4, 1.6],
        [1.2, 4.5, -0.5, 1.7],
        [0.25, 5.8, -0.2, 1.55],
      ])
        oval(
          leaf ? (dy > 5 ? 0x6fa16a : 0x4f8057) : 0x48a986,
          [dx, dy, dz],
          [s, s * 0.76, s],
          g,
        );
    } else {
      mesh(cylinder, M(0xa7b8b0), [0, 3, 0], [0.26, 6, 0.26], g);
      for (let i = 0; i < 4; i++)
        mesh(
          new THREE.TorusGeometry(0.265, 0.027, 4, 12),
          M(0x788f88),
          [0, 1.1 + i, 0],
          [1, 1, 1],
          g,
        ).rotation.x = Math.PI / 2;
      oval(0x5c99d0, [0, 6.8, 0], [2.75, 1.85, 2.75], g);
      oval(0x7bc0df, [-0.2, 7.65, 0.15], [2.1, 0.78, 2.1], g);
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
    mesh(cylinder, M(0x564f42), [x, 1.5, z], [0.09, 3, 0.09]);
    cube(0x594d44, [x, 3.04, z], [0.7, 0.12, 0.7]);
    const glow = mesh(
      new THREE.CylinderGeometry(0.28, 0.32, 0.65, 10),
      M(0xffd987, { emissive: 0xffb45e, emissiveIntensity: 0.25 }),
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
      M(color, { side: THREE.DoubleSide }),
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
    cube(color, [0, height / 2, 0], [width, height, depth], g);
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
      cube(
        0x709ca0,
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
    }
    cube(0x796046, [0, 1.12, depth / 2 + 0.045], [1.26, 2.2, 0.09], g);
    cube(0xbfa783, [0, 1.12, depth / 2 + 0.1], [0.065, 2.05, 0.05], g);
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
        const curtain = cube(
          i % 2 ? 0xc87057 : 0xcc9f65,
          [-width * 0.31 + i * width * 0.155, 1.96, depth / 2 + 0.6],
          [width * 0.148, 0.67, 0.04],
          g,
        );
        animated.push({ type: "curtain", mesh: curtain, phase: i });
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
      M(0xedf1d9),
      [0, 0.15, 0],
      [1, 1, 1],
      g,
    );
    mesh(
      new THREE.TorusGeometry(radius, 0.12, 6, 32),
      M(0x618980),
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
        M(0x78b3d3, { emissive: 0x21677b, emissiveIntensity: 0.15 }),
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
        M(0xe5edde),
        g,
      );
      oval(0xd6e8cc, [s * radius * 0.62, 5.4, -0.18], [0.23, 0.23, 0.23], g);
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
      M(0xe3b3a0),
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
        M(0x715751),
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
        M(r % 2 ? 0xb4a08c : 0xab9987),
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
      oval(0x6d865d, [-78 + i * 27, 6, -119], [19, 14 + random() * 10, 16]);
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
      new THREE.MeshStandardMaterial({
        color: 0x287fcc,
        roughness: 0.38,
        metalness: 0.16,
      }),
      [0, -1.4, 0],
      [1, 1, 1],
      group,
      false,
    );
    water.rotation.x = -Math.PI / 2;
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2,
        x = Math.sin(a) * 151,
        z = Math.cos(a) * 151;
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
    oval(0xfff4bf, [-110, 115, -180], [19, 19, 19], group, false);
    oval(0xb6ffe9, [126, 80, -190], [12, 12, 12], group, false);
    // Broken alien spacecraft beside the battlefields, with rounded strakes.
    const craft = new THREE.Group();
    craft.position.set(70, 0, -74);
    craft.rotation.z = -0.14;
    group.add(craft);
    mesh(
      new THREE.CylinderGeometry(2.5, 5.7, 2, 32),
      M(0xd0d5d3, { metalness: 0.35, roughness: 0.55 }),
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
  for (let i = 0; i < 72; i++) {
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
    item.mesh.traverse((object) => dynamic.add(object));
  group.updateMatrixWorld(true);
  const batches = new Map();
  group.traverse((object) => {
    if (!object.isMesh) return;
    sourceGeometries.add(object.geometry);
    if (dynamic.has(object) || Array.isArray(object.material)) return;
    const key = `${object.material.uuid}:${object.castShadow}:${object.receiveShadow}`;
    if (!batches.has(key)) batches.set(key, []);
    batches.get(key).push(object);
  });
  for (const sources of batches.values()) {
    if (sources.length < 4) continue;
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
        if (attributes.uv) {
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
      for (const a of animated) {
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
