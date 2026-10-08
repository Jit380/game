import * as THREE from "/vendor/three.module.js";

// These models are built from original meshes. All characters face local +Z.
// Shoulders, elbows, hips, and knees stay independently articulated in combat.
export function createCharacter(id = "naruto") {
  const root = new THREE.Group();
  root.name = `fighter-${id}`;
  const joints = {};
  const tall =
    id === "broly" ? 1.3 : id === "frieza" ? 0.96 : id === "dende" ? 0.78 : 1;
  const muscular = id === "broly" ? 1.45 : id === "goku" ? 1.12 : 1;
  const colors = {
    naruto: { skin: 0xffce9c, hair: 0xffd236, cloth: 0xf47a21, trim: 0x182b40 },
    goku: { skin: 0xf2b98c, hair: 0x141625, cloth: 0xf48220, trim: 0x124d9d },
    sasuke: { skin: 0xf0c3a6, hair: 0x182136, cloth: 0xdae0ed, trim: 0x252d60 },
    pain: { skin: 0xecc2ad, hair: 0xe96d26, cloth: 0x171e30, trim: 0xb8323e },
    frieza: { skin: 0xe8e5fb, hair: 0x8b45c0, cloth: 0xf0ecff, trim: 0x893cca },
    broly: { skin: 0xddb687, hair: 0x94e65a, cloth: 0x562b82, trim: 0x92c747 },
    kakashi: {
      skin: 0xf0c9ae,
      hair: 0xc8d0dc,
      cloth: 0x617b54,
      trim: 0x26364f,
    },
    dende: { skin: 0x7cc766, hair: 0x7cc766, cloth: 0xf0e6d3, trim: 0x8a558f },
  }[id] || { skin: 0xffce9c, hair: 0xffd236, cloth: 0xf47a21, trim: 0x182b40 };
  const mat = (color, extra = {}) =>
    new THREE.MeshStandardMaterial({
      color,
      roughness: 0.78,
      metalness: 0,
      ...extra,
    });
  const skin = mat(colors.skin),
    cloth = mat(colors.cloth),
    trim = mat(colors.trim),
    hair = mat(colors.hair);
  const black = mat(0x172032),
    white = mat(0xffffff),
    sole = mat(0x172437);
  const gold = mat(0xf8cf54, { metalness: 0.45, roughness: 0.4 });
  const geometry = new Map();
  const geo = (key, make) => {
    if (!geometry.has(key)) geometry.set(key, make());
    return geometry.get(key);
  };
  const ball = geo("ball", () => new THREE.SphereGeometry(1, 16, 12));
  const capsule = geo("capsule", () => new THREE.CapsuleGeometry(1, 1, 5, 12));
  const cube = geo("cube", () => new THREE.BoxGeometry(1, 1, 1));
  const cone = geo("cone", () => new THREE.ConeGeometry(1, 1, 6));
  function mesh(g, m, position = [0, 0, 0], scale = [1, 1, 1], parent = root) {
    const object = new THREE.Mesh(g, m);
    object.position.set(...position);
    object.scale.set(...scale);
    object.castShadow = true;
    object.receiveShadow = true;
    parent.add(object);
    return object;
  }
  function pivot(name, p, parent = root) {
    const group = new THREE.Group();
    group.position.set(...p);
    parent.add(group);
    joints[name] = group;
    return group;
  }
  function oval(m, p, s, parent = root) {
    return mesh(ball, m, p, s, parent);
  }
  function segment(m, length, radius, y, parent) {
    return mesh(capsule, m, [0, y, 0], [radius, length / 3, radius], parent);
  }
  function curve(points, radius, material, parent = root) {
    return mesh(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))),
        18,
        radius,
        7,
        false,
      ),
      material,
      [0, 0, 0],
      [1, 1, 1],
      parent,
    );
  }

  const pelvis = pivot("pelvis", [0, 1.04, 0]);
  oval(cloth, [0, 0.04, 0], [0.25 * muscular, 0.24, 0.19], pelvis);
  const chest = pivot("chest", [0, 1.42, 0]);
  oval(
    id === "broly" ? skin : cloth,
    [0, 0, 0],
    [0.34 * muscular, 0.4, 0.21],
    chest,
  );
  // Front and back clothing panels break up the silhouette without box bodies.
  if (id === "goku") {
    oval(trim, [0, 0.11, 0.17], [0.22, 0.23, 0.07], chest);
    const left = mesh(
      cube,
      cloth,
      [-0.14, 0.07, 0.21],
      [0.17, 0.54, 0.055],
      chest,
    );
    left.rotation.z = -0.23;
    const right = mesh(
      cube,
      cloth,
      [0.14, 0.07, 0.21],
      [0.17, 0.54, 0.055],
      chest,
    );
    right.rotation.z = 0.23;
    mesh(
      new THREE.CylinderGeometry(0.075, 0.075, 0.022, 20),
      white,
      [-0.17, 0.1, 0.27],
      [1, 1, 1],
      chest,
    ).rotation.x = Math.PI / 2;
    mesh(
      new THREE.CylinderGeometry(0.043, 0.043, 0.027, 16),
      black,
      [-0.17, 0.1, 0.282],
      [1, 1, 1],
      chest,
    ).rotation.x = Math.PI / 2;
  } else if (id === "naruto") {
    oval(trim, [0, 0.16, -0.09], [0.33, 0.19, 0.2], chest);
    mesh(cube, trim, [0, 0.04, 0.219], [0.032, 0.52, 0.035], chest);
    mesh(
      new THREE.TorusGeometry(0.085, 0.018, 5, 20),
      trim,
      [0.13, 0.03, 0.23],
      [1, 1, 1],
      chest,
    );
    mesh(
      new THREE.CylinderGeometry(0.265, 0.28, 0.08, 20),
      trim,
      [0, -0.34, 0],
      [1, 1, 1],
      chest,
    );
  } else if (id === "sasuke") {
    oval(trim, [0, -0.24, 0], [0.28, 0.1, 0.23], chest);
    mesh(cube, trim, [0, 0.12, 0.221], [0.06, 0.43, 0.03], chest);
    const collar = mesh(
      new THREE.CylinderGeometry(0.18, 0.27, 0.2, 16, 1, true),
      cloth,
      [0, 0.35, 0],
      [1, 1, 1],
      chest,
    );
    collar.rotation.x = -0.15;
    const rope = mat(0x8d73ad);
    mesh(
      new THREE.TorusGeometry(0.27, 0.055, 7, 20),
      rope,
      [0, -0.29, 0],
      [1, 1, 0.85],
      chest,
    ).rotation.x = Math.PI / 2;
    curve(
      [
        [0.21, 1.12, -0.16],
        [0.28, 0.95, -0.21],
        [0.22, 0.72, -0.18],
      ],
      0.035,
      rope,
    );
    const sword = pivot("sword", [-0.27, 1.25, -0.22]);
    sword.rotation.z = -0.3;
    mesh(
      new THREE.CylinderGeometry(0.034, 0.025, 1.04, 8),
      black,
      [0, -0.26, 0],
      [1, 1, 1],
      sword,
    );
    mesh(
      new THREE.CylinderGeometry(0.047, 0.047, 0.23, 10),
      trim,
      [0, 0.38, 0],
      [1, 1, 1],
      sword,
    );
    mesh(cube, gold, [0, 0.22, 0], [0.18, 0.045, 0.06], sword);
  } else if (id === "pain") {
    mesh(
      new THREE.CylinderGeometry(0.32, 0.44, 0.84, 18, 1),
      cloth,
      [0, -0.29, 0],
      [1, 1, 0.76],
      chest,
    );
    mesh(
      new THREE.CylinderGeometry(0.19, 0.27, 0.26, 16, 1, true),
      cloth,
      [0, 0.32, 0],
      [1, 1, 1],
      chest,
    );
    curve(
      [
        [0.04, 1.78, 0.23],
        [0.04, 1.1, 0.3],
        [0.04, 0.73, 0.31],
      ],
      0.012,
      trim,
    );
    for (const [x, y] of [
      [-0.13, 1.37],
      [0.15, 0.96],
    ]) {
      const cloud = new THREE.Group();
      cloud.position.set(x, y, 0.33);
      root.add(cloud);
      for (const [dx, dy, s] of [
        [0, 0, 0.065],
        [-0.07, -0.012, 0.047],
        [0.062, -0.01, 0.045],
        [0.018, 0.05, 0.049],
      ])
        oval(trim, [dx, dy, 0], [s, s * 0.67, 0.015], cloud);
    }
  } else if (id === "frieza") {
    oval(trim, [0, 0.1, 0.17], [0.21, 0.21, 0.085], chest);
    oval(trim, [0, -0.16, -0.17], [0.17, 0.2, 0.05], chest);
    const tail = pivot("tail", [0, 1.02, -0.15]);
    curve(
      [
        [0, 0, 0],
        [0.15, -0.12, -0.38],
        [0.43, -0.37, -0.72],
        [0.56, -0.23, -1.18],
        [0.4, 0.22, -1.43],
      ],
      0.078,
      skin,
      tail,
    );
  } else if (id === "broly") {
    oval(skin, [-0.22, 0.13, 0.18], [0.23, 0.19, 0.09], chest);
    oval(skin, [0.22, 0.13, 0.18], [0.23, 0.19, 0.09], chest);
    for (const y of [-0.06, -0.19])
      for (const x of [-0.1, 0.1])
        oval(skin, [x, y, 0.2], [0.1, 0.075, 0.033], chest);
    mesh(
      new THREE.CylinderGeometry(0.4, 0.45, 0.23, 15, 1),
      trim,
      [0, 1.02, 0],
      [1, 1, 0.74],
    );
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const fur = mesh(
        cone,
        trim,
        [Math.sin(a) * 0.37, 0.85, Math.cos(a) * 0.28],
        [0.085, 0.25, 0.07],
      );
      fur.rotation.z = Math.PI + Math.sin(a) * 0.2;
    }
    mesh(
      new THREE.TorusGeometry(0.17, 0.035, 6, 20),
      gold,
      [0, 1.77, 0],
      [1, 1, 1],
    ).rotation.x = Math.PI / 2;
  } else if (id === "kakashi") {
    for (const s of [-1, 1]) {
      mesh(cube, trim, [s * 0.16, 0.04, 0.2], [0.045, 0.48, 0.06], chest);
      mesh(cube, cloth, [s * 0.15, 0.01, 0.23], [0.2, 0.27, 0.055], chest);
      mesh(cube, trim, [s * 0.15, 0.15, 0.26], [0.2, 0.025, 0.02], chest);
    }
    mesh(
      new THREE.CylinderGeometry(0.19, 0.26, 0.17, 16, 1, true),
      cloth,
      [0, 0.34, 0],
      [1, 1, 1],
      chest,
    );
  } else if (id === "dende") {
    mesh(
      new THREE.CylinderGeometry(0.27, 0.36, 0.63, 16),
      trim,
      [0, -0.23, 0],
      [1, 1, 0.83],
      chest,
    );
    oval(cloth, [0, 0.24, 0.01], [0.42, 0.16, 0.24], chest);
    const vest = mat(0xb88d5b);
    for (const s of [-1, 1])
      oval(vest, [s * 0.22, -0.03, 0.16], [0.12, 0.29, 0.09], chest);
  }

  for (const side of [-1, 1]) {
    const label = side < 0 ? "left" : "right";
    const hip = pivot(`${label}Hip`, [side * 0.14 * muscular, 1.02, 0]);
    const legMaterial = ["pain", "kakashi", "dende"].includes(id)
      ? trim
      : cloth;
    segment(legMaterial, 0.48, 0.12 * muscular, -0.21, hip);
    const knee = pivot(`${label}Knee`, [0, -0.42, 0], hip);
    segment(
      id === "frieza" ? skin : legMaterial,
      0.43,
      0.095 * muscular,
      -0.19,
      knee,
    );
    const bootMaterial = id === "broly" ? white : id === "goku" ? trim : sole;
    oval(bootMaterial, [0, -0.44, 0.09], [0.125 * muscular, 0.12, 0.23], knee);
    if (id === "goku" || id === "broly") {
      mesh(
        new THREE.CylinderGeometry(0.108 * muscular, 0.12 * muscular, 0.22, 12),
        bootMaterial,
        [0, -0.29, 0.01],
        [1, 1, 1],
        knee,
      );
      mesh(
        new THREE.CylinderGeometry(
          0.115 * muscular,
          0.115 * muscular,
          0.045,
          12,
        ),
        id === "broly" ? trim : gold,
        [0, -0.22, 0.01],
        [1, 1, 1],
        knee,
      );
    }
    const shoulder = pivot(`${label}Shoulder`, [
      side * 0.31 * muscular,
      1.64,
      0,
    ]);
    shoulder.rotation.z = side * 0.12;
    if (id === "naruto" || id === "sasuke" || id === "pain" || id === "kakashi")
      segment(
        id === "naruto" || id === "kakashi" ? trim : cloth,
        0.29,
        0.14,
        -0.1,
        shoulder,
      );
    else oval(skin, [0, -0.07, 0], [0.14 * muscular, 0.18, 0.145], shoulder);
    segment(
      id === "pain" ? cloth : id === "kakashi" ? trim : skin,
      0.34,
      0.1 * muscular,
      -0.2,
      shoulder,
    );
    const elbow = pivot(`${label}Elbow`, [0, -0.34, 0], shoulder);
    segment(
      id === "naruto"
        ? cloth
        : id === "pain"
          ? cloth
          : id === "kakashi"
            ? trim
            : skin,
      0.32,
      0.082 * muscular,
      -0.14,
      elbow,
    );
    oval(skin, [0, -0.33, 0.025], [0.088 * muscular, 0.1, 0.09], elbow);
    if (["goku", "broly", "sasuke", "naruto"].includes(id))
      mesh(
        new THREE.CylinderGeometry(0.09 * muscular, 0.092 * muscular, 0.09, 12),
        id === "broly" ? gold : trim,
        [0, -0.24, 0],
        [1, 1, 1],
        elbow,
      );
    if (id === "frieza")
      oval(trim, [0, -0.13, 0.072], [0.055, 0.13, 0.028], elbow);
  }

  const neck = mesh(
    new THREE.CylinderGeometry(0.095, 0.12, 0.18, 12),
    skin,
    [0, 1.8, 0],
  );
  const head = pivot("head", [0, 2.02, 0]);
  oval(skin, [0, 0, 0], [0.255, 0.3, 0.245], head);
  oval(skin, [0, -0.15, 0.066], [0.2, 0.145, 0.19], head);
  oval(skin, [-0.26, -0.018, 0], [0.058, 0.089, 0.048], head);
  oval(skin, [0.26, -0.018, 0], [0.058, 0.089, 0.048], head);
  const eyeMaterial = mat(
    id === "pain"
      ? 0xdcbcf8
      : id === "sasuke" || id === "frieza"
        ? 0xbc3042
        : id === "broly"
          ? 0xbdf9dc
          : id === "naruto"
            ? 0x309fe8
            : 0x213644,
  );
  for (const side of [-1, 1]) {
    oval(white, [side * 0.096, 0.005, 0.22], [0.068, 0.037, 0.025], head);
    oval(
      eyeMaterial,
      [side * 0.098, 0.001, 0.243],
      [0.024, 0.028, 0.008],
      head,
    );
    oval(black, [side * 0.098, 0.001, 0.249], [0.01, 0.019, 0.006], head);
    const brow = mesh(
      cube,
      id === "frieza" ? trim : hair,
      [side * 0.1, 0.056, 0.241],
      [0.13, 0.014, 0.018],
      head,
    );
    brow.rotation.z = side * -0.19;
  }
  oval(skin, [0, -0.062, 0.255], [0.028, 0.045, 0.035], head);
  curve(
    [
      [-0.05, -0.135, 0.237],
      [0, -0.14, 0.249],
      [0.05, -0.135, 0.237],
    ],
    0.007,
    mat(0x925c53),
    head,
  );
  if (id === "frieza") {
    oval(trim, [0, 0.15, -0.02], [0.245, 0.185, 0.225], head);
    for (const s of [-1, 1]) {
      curve(
        [
          [s * 0.16, 0.04, 0.19],
          [s * 0.17, -0.1, 0.19],
          [s * 0.1, -0.2, 0.17],
        ],
        0.009,
        trim,
        head,
      );
    }
  } else if (id === "dende") {
    for (const s of [-1, 1]) {
      const ear = mesh(
        cone,
        skin,
        [s * 0.34, 0.025, -0.015],
        [0.087, 0.3, 0.056],
        head,
      );
      ear.rotation.z = s * -1.18;
      curve(
        [
          [s * 0.11, 0.24, 0.13],
          [s * 0.15, 0.4, 0.17],
          [s * 0.22, 0.36, 0.23],
        ],
        0.022,
        skin,
        head,
      );
      oval(skin, [s * 0.22, 0.36, 0.23], [0.031, 0.03, 0.03], head);
    }
  } else {
    oval(hair, [0, 0.16, -0.05], [0.27, 0.21, 0.235], head);
    const spikes =
      id === "goku" || id === "broly"
        ? 11
        : id === "sasuke"
          ? 9
          : id === "kakashi"
            ? 9
            : 14;
    for (let i = 0; i < spikes; i++) {
      const a = (i / spikes) * Math.PI * 2;
      const front = Math.cos(a) > 0.2;
      const length =
        id === "goku" || id === "broly"
          ? i % 3 === 0
            ? 0.55
            : 0.36
          : id === "sasuke" || id === "kakashi"
            ? 0.32
            : 0.19;
      const broadSpike = id === "goku" || id === "broly" ? 0.155 : 0.105;
      const spike = mesh(
        cone,
        hair,
        [
          Math.sin(a) * 0.21,
          0.17 + (front ? 0.07 : 0.01),
          Math.cos(a) * 0.14 - 0.03,
        ],
        [broadSpike, length, broadSpike],
        head,
      );
      const direction = new THREE.Vector3(
        Math.sin(a) * 0.65,
        front && id === "sasuke" ? -0.3 : 0.9,
        Math.cos(a) * 0.6,
      ).normalize();
      spike.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        direction,
      );
    }
    if (id === "naruto" || id === "sasuke")
      for (const s of [-1, 0, 1]) {
        const bang = mesh(
          cone,
          hair,
          [s * 0.13, 0.13, 0.22],
          [0.067, id === "sasuke" ? 0.23 : 0.105, 0.045],
          head,
        );
        bang.rotation.z = Math.PI + s * 0.22;
      }
    if (id === "naruto" || id === "pain" || id === "kakashi") {
      const band = mat(0x23334c),
        metal = mat(0xb8c8d8, { metalness: 0.55, roughness: 0.35 });
      mesh(
        new THREE.CylinderGeometry(0.26, 0.26, 0.09, 24, 1, true),
        band,
        [0, 0.112, 0],
        [1, 1, 0.95],
        head,
      );
      mesh(cube, metal, [0, 0.112, 0.25], [0.25, 0.077, 0.022], head);
      if (id === "kakashi") {
        oval(trim, [0, -0.105, 0.063], [0.235, 0.145, 0.218], head);
        const eyeCover = mesh(
          cube,
          band,
          [-0.113, 0.06, 0.245],
          [0.16, 0.17, 0.028],
          head,
        );
        eyeCover.rotation.z = -0.21;
        mesh(
          cube,
          metal,
          [-0.1, 0.09, 0.27],
          [0.14, 0.07, 0.02],
          head,
        ).rotation.z = -0.21;
      }
      curve(
        [
          [-0.04, 0.105, 0.265],
          [-0.02, 0.13, 0.265],
          [0.022, 0.12, 0.265],
          [0.028, 0.096, 0.265],
          [0, 0.091, 0.265],
        ],
        0.004,
        black,
        head,
      );
      if (id === "pain") {
        mesh(
          cube,
          black,
          [0, 0.112, 0.266],
          [0.25, 0.009, 0.007],
          head,
        ).rotation.z = -0.15;
      }
      for (const s of [-1, 1]) {
        const tie = mesh(
          cube,
          band,
          [s * 0.06, 0.02, -0.36],
          [0.07, 0.28, 0.015],
          head,
        );
        tie.rotation.x = -0.7;
        tie.rotation.z = s * 0.2;
      }
    }
    if (id === "naruto")
      for (const s of [-1, 1])
        for (let i = 0; i < 3; i++) {
          const whisker = mesh(
            cube,
            mat(0x795847),
            [s * 0.176, -0.051 - i * 0.024, 0.2],
            [0.084, 0.006, 0.006],
            head,
          );
          whisker.rotation.z = s * (0.08 + i * 0.07);
        }
    if (id === "pain")
      for (const s of [-1, 1])
        for (let i = 0; i < 2; i++)
          oval(
            black,
            [s * (0.09 + i * 0.05), -0.055, 0.236],
            [0.012, 0.012, 0.01],
            head,
          );
  }

  root.scale.setScalar(tall);
  root.userData = { id, joints, height: 2.42 * tall, baseScale: tall };
  animateCharacter(root, { time: 0, moving: false, grounded: true });
  return root;
}

export function animateCharacter(
  root,
  {
    time = 0,
    moving = false,
    speed = 1,
    grounded = true,
    attack = false,
    guard = false,
    hurt = false,
  } = {},
) {
  const j = root.userData.joints;
  if (!j) return;
  const run = moving ? Math.sin(time * (12 + Math.min(speed, 12) * 0.35)) : 0;
  const idle = Math.sin(time * 2.2);
  j.pelvis.position.y =
    1.04 + (moving && grounded ? Math.abs(run) * 0.035 : idle * 0.008);
  j.chest.rotation.set(
    grounded ? (moving ? 0.11 : idle * 0.014) : -0.1,
    0,
    hurt ? Math.sin(time * 35) * 0.05 : 0,
  );
  j.head.rotation.set(moving ? -0.06 : idle * 0.015, 0, 0);
  j.leftHip.rotation.x = grounded ? run * 0.66 : -0.64;
  j.rightHip.rotation.x = grounded ? -run * 0.66 : 0.35;
  j.leftKnee.rotation.x = grounded ? Math.max(0, -run) * 0.75 : 0.64;
  j.rightKnee.rotation.x = grounded ? Math.max(0, run) * 0.75 : 0.92;
  j.leftShoulder.rotation.set(grounded ? -run * 0.65 : -0.7, 0, -0.12);
  j.rightShoulder.rotation.set(grounded ? run * 0.65 : -0.7, 0, 0.12);
  j.leftElbow.rotation.x = moving ? -0.55 : -0.12;
  j.rightElbow.rotation.x = moving ? -0.55 : -0.12;
  if (root.userData.id === "naruto" && moving && grounded) {
    j.chest.rotation.x = 0.23;
    j.head.rotation.x = -0.17;
    j.leftShoulder.rotation.set(0.73, 0, -0.24);
    j.rightShoulder.rotation.set(0.73, 0, 0.24);
    j.leftElbow.rotation.x = -0.08;
    j.rightElbow.rotation.x = -0.08;
  }
  if (guard) {
    j.leftShoulder.rotation.set(-1.07, -0.4, -0.35);
    j.rightShoulder.rotation.set(-1.07, 0.4, 0.35);
    j.leftElbow.rotation.x = -1.1;
    j.rightElbow.rotation.x = -1.1;
    j.chest.rotation.x = 0.12;
  } else if (attack) {
    const type = typeof attack === "string" ? attack : attack.type || "punch";
    const special = ["special", "beam", "charge", "rasengan"].includes(type);
    const pulse = (Math.sin(time * 26) + 1) * 0.5;
    j.chest.rotation.y = special ? -0.18 : Math.sin(time * 26) * 0.18;
    j.rightShoulder.rotation.set(-1.4 - pulse * 0.25, special ? -0.3 : 0, 0.12);
    j.rightElbow.rotation.x = special ? -0.18 : -0.1 - (1 - pulse) * 1.1;
    if (special) {
      j.leftShoulder.rotation.set(-1.4, 0.3, -0.2);
      j.leftElbow.rotation.x = -0.26;
    } else {
      j.leftShoulder.rotation.x = -0.62;
      j.leftElbow.rotation.x = -0.95;
    }
  }
  if (j.tail) j.tail.rotation.y = Math.sin(time * 2.5) * 0.22;
}
