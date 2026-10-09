import * as THREE from "/vendor/three.module.js";

// Original articulated character art. Feet are at zero; each fighter faces +Z.
// Geometry and surface textures are owned by this instance.
export function createCharacter(id = "naruto") {
  const palettes = {
    naruto: [0xe8b487, 0xe9b32c, 0xc85f1a, 0x202b35],
    goku: [0xcfa079, 0x15181c, 0xb9561a, 0x203e6a],
    sasuke: [0xd6b39d, 0x161c24, 0xc2c0b7, 0x29303e],
    pain: [0xd0a995, 0xb45727, 0x151920, 0x982c36],
    frieza: [0xcfd0da, 0x683793, 0xd4d4de, 0x653087],
    broly: [0xb9906c, 0x91b94b, 0x47334d, 0x607934],
    kakashi: [0xd5b49d, 0xa4aeb7, 0x4c5d40, 0x26303d],
    dende: [0x679c55, 0x679c55, 0xbdb4a0, 0x69516b],
  };
  const colors = palettes[id] || palettes.naruto;
  const root = new THREE.Group();
  root.name = "fighter-" + id;
  const joints = {}, geometries = new Set(), materials = new Set();
  const tall = id === "broly" ? 1.29 : id === "frieza" ? .96 : id === "dende" ? .76 : 1;
  const muscular = id === "broly" ? 1.37 : id === "goku" ? 1.12 : 1;
  const own = (geometry) => (geometries.add(geometry), geometry);

  function surface(kind, size = 128) {
    const pixels = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const noise = ((x * 73 + y * 151 + (x * y * 19) % 137) % 37) / 37;
      const value = kind === "cloth" ? 180 + ((x % 4 < 2) !== (y % 4 < 2) ? 19 : -11) + noise * 23
        : kind === "hair" ? 156 + Math.sin(x * 2.2 + Math.sin(y * .08)) * 32 + noise * 25
        : 190 + noise * 25 + Math.sin(x * .17) * Math.cos(y * .11) * 7;
      const i = (y * size + x) * 4;
      pixels[i] = pixels[i + 1] = pixels[i + 2] = value;
      pixels[i + 3] = 255;
    }
    const texture = new THREE.DataTexture(pixels, size, size, THREE.RGBAFormat);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.generateMipmaps = true;
    texture.repeat.set(kind === "cloth" ? 3 : 1, kind === "cloth" ? 4 : 1);
    texture.needsUpdate = true;
    return texture;
  }
  const weave = surface("cloth"), pores = surface("skin"), strands = surface("hair");
  const material = (color, extras = {}) => {
    const mat = new THREE.MeshStandardMaterial({ color, roughness: .78, metalness: 0, ...extras });
    materials.add(mat);
    return mat;
  };
  const fabric = (color) => material(color, { bumpMap: weave, bumpScale: .011, roughnessMap: weave, roughness: .96 });
  const skin = material(colors[0], { bumpMap: pores, bumpScale: .004, roughness: id === "frieza" ? .36 : .67 });
  const cloth = fabric(colors[2]), trim = fabric(colors[3]);
  const hair = material(colors[1], { bumpMap: strands, bumpScale: .012, roughness: .44 });
  const hairLight = material(new THREE.Color(colors[1]).multiplyScalar(1.15), { bumpMap: strands, bumpScale: .009, roughness: .48 });
  const black = material(0x171b20, { roughness: .55 }), ivory = material(0xcdd1cd, { roughness: .57 });
  const leather = material(0x20272b, { bumpMap: pores, bumpScale: .008, roughness: .51 });
  const metal = material(0x929ba0, { metalness: .78, roughness: .34 });
  const gold = material(0xbca365, { metalness: .72, roughness: .36 });
  const seam = fabric(new THREE.Color(colors[2]).multiplyScalar(.76));
  const skinShadow = material(new THREE.Color(colors[0]).multiplyScalar(.78), { roughness: .72 });
  const lips = material(id === "dende" ? 0x426945 : id === "frieza" ? 0x704675 : 0x955f52, { roughness: .66 });
  const ball = own(new THREE.SphereGeometry(1, 16, 12)), cube = own(new THREE.BoxGeometry(1, 1, 1));

  function mesh(geometry, mat, p = [0, 0, 0], s = [1, 1, 1], parent = root) {
    const object = new THREE.Mesh(geometry, mat);
    object.position.set(...p); object.scale.set(...s);
    object.castShadow = object.receiveShadow = true;
    parent.add(object);
    return object;
  }
  const oval = (mat, p, s, parent = root) => mesh(ball, mat, p, s, parent);
  function pivot(name, p, parent = root) {
    const group = new THREE.Group();
    group.position.set(...p); parent.add(group); joints[name] = group;
    return group;
  }
  function tube(points, radius, mat, parent = root, segments = 12) {
    return mesh(own(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))), segments, radius, 5, false)), mat, [0, 0, 0], [1, 1, 1], parent);
  }
  function band(radius, height, mat, p, parent = root, depth = 1) {
    return mesh(own(new THREE.CylinderGeometry(radius, radius, height, 20)), mat, p, [1, 1, depth], parent);
  }
  // Continuous elliptical rings create shoulders, waists, jaws and fabric folds.
  function loft(rings, mat, parent, folds = 0, segments = 20) {
    const positions = [], uvs = [], indices = [];
    for (let j = 0; j < rings.length; j++) {
      const [y, width, depth, centerZ = 0] = rings[j];
      for (let i = 0; i <= segments; i++) {
        const angle = i / segments * Math.PI * 2;
        const crease = 1 + folds * Math.sin(angle * 7 + j * .75) * Math.sin(j / (rings.length - 1) * Math.PI);
        positions.push(Math.sin(angle) * width * crease, y, Math.cos(angle) * depth * crease + centerZ);
        uvs.push(i / segments, j / (rings.length - 1));
        if (j < rings.length - 1 && i < segments) {
          const a = j * (segments + 1) + i, b = a + segments + 1;
          if (rings[rings.length - 1][0] > rings[0][0]) {
            indices.push(a, a + 1, b, b, a + 1, b + 1);
          } else {
            indices.push(a, b, a + 1, b, b + 1, a + 1);
          }
        }
      }
    }
    const geometry = own(new THREE.BufferGeometry());
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices); geometry.computeVertexNormals();
    return mesh(geometry, mat, [0, 0, 0], [1, 1, 1], parent);
  }
  function limb(length, topRadius, bottomRadius, mat, parent, soft = false) {
    return loft([[.025, topRadius * .75, topRadius * .73], [-.02, topRadius, topRadius * .92], [-length * .32, topRadius * 1.05, topRadius * .95], [-length * .7, bottomRadius * 1.14, bottomRadius], [-length, bottomRadius, bottomRadius * .86], [-length - .013, bottomRadius * .5, bottomRadius * .5]], mat, parent, soft ? .06 : .012, 16);
  }
  function clump(base, tip, width, depth, mat, parent, bend = 0) {
    const from = new THREE.Vector3(...base), to = new THREE.Vector3(...tip), direction = to.clone().sub(from).normalize();
    const across = new THREE.Vector3(0, 0, 1).cross(direction).normalize();
    if (across.lengthSq() < .01) across.set(1, 0, 0);
    const forward = direction.clone().cross(across).normalize();
    const positions = [], uvs = [], indices = [], rings = 6, sides = 7;
    for (let j = 0; j <= rings; j++) {
      const t = j / rings, center = from.clone().lerp(to, t).addScaledVector(forward, Math.sin(t * Math.PI) * bend);
      const taper = Math.pow(1 - t, .8) + .002;
      for (let k = 0; k <= sides; k++) {
        const a = k / sides * Math.PI * 2, p = center.clone().addScaledVector(across, Math.cos(a) * width * taper).addScaledVector(forward, Math.sin(a) * depth * taper);
        positions.push(p.x, p.y, p.z); uvs.push(k / sides, t);
        if (j < rings && k < sides) {
          const q = j * (sides + 1) + k, b = q + sides + 1;
          indices.push(q, q + 1, b, b, q + 1, b + 1);
        }
      }
    }
    const geometry = own(new THREE.BufferGeometry());
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices); geometry.computeVertexNormals();
    return mesh(geometry, mat, [0, 0, 0], [1, 1, 1], parent);
  }

  const pelvis = pivot("pelvis", [0, 1.065, 0]);
  loft([[-.10, .20 * muscular, .14], [0, .235 * muscular, .16], [.10, .205 * muscular, .14]], cloth, pelvis, .055);
  const chest = pivot("chest", [0, .49, 0], pelvis);
  const bare = id === "broly" || id === "frieza";
  const bodyRings = [[-.39, .22 * muscular, .14], [-.24, .235 * muscular, .15], [-.06, .275 * muscular, .17], [.12, .34 * muscular, .17], [.23, .30 * muscular, .14], [.29, .14, .1]];
  const denseRings = [];
  for (let k = 0; k < bodyRings.length - 1; k++) {
    for (let n = 0; n < 5; n++) {
      const t = n / 5;
      denseRings.push(bodyRings[k].map((v, i) => THREE.MathUtils.lerp(v, bodyRings[k + 1][i], t)));
    }
  }
  denseRings.push(bodyRings.at(-1));
  const torso = loft(bare ? denseRings : bodyRings, bare ? skin : cloth, chest, bare ? .006 : .018, bare ? 32 : 24);
  if (bare) {
    const position = torso.geometry.attributes.position;
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i), y = position.getY(i), z = position.getZ(i);
      if (z <= 0) continue;
      const front = Math.pow(Math.min(1, z / .14), 2);
      const mound = (cx, cy, rx, ry, strength) => Math.exp(-(((x - cx) / rx) ** 2) - ((y - cy) / ry) ** 2) * strength;
      let sculpt = 0;
      for (const side of [-1, 1]) {
        sculpt += mound(side * .16 * muscular, .087, .14 * muscular, .09, .045);
        for (let n = 0; n < 3; n++) sculpt += mound(side * .079 * muscular, -.10 - n * .075, .059 * muscular, .038, .022);
      }
      position.setZ(i, z + sculpt * front);
    }
    position.needsUpdate = true;
    torso.geometry.computeVertexNormals();
  }
  const neck = pivot("neck", [0, .39, 0], chest);
  band(.092 * muscular, .19, skin, [0, -.015, 0], neck);
  const head = pivot("head", [0, .19, .005], neck);
  loft([[-.205, .057, .079, .043], [-.168, .106, .115, .024], [-.105, .144, .145, .003], [-.025, .159, .154], [.065, .164, .156, -.006], [.155, .147, .142, -.012], [.202, .10, .10, -.012], [.217, .012, .014, -.012]], skin, head, 0, 28);
  for (const side of [-1, 1]) {
    oval(skin, [side * .163, -.028, -.005], [.031, .056, .024], head);
    oval(skinShadow, [side * .179, -.028, .007], [.012, .027, .013], head);
  }
  const eyes = material(id === "pain" ? 0x9e8db4 : id === "sasuke" || id === "frieza" ? 0x9e3140 : id === "broly" ? 0x8ccaba : id === "naruto" ? 0x327c99 : 0x283741, { roughness: .32 });
  const irisWhite = material(0xe5ddd0, { roughness: .45 });
  for (const side of [-1, 1]) {
    oval(irisWhite, [side * .069, .005, .148], [.049, .023, .012], head);
    oval(eyes, [side * .068, .004, .161], [.017, .019, .0045], head);
    oval(black, [side * .068, .004, .165], [.007, .012, .0025], head);
    oval(irisWhite, [side * .064, .011, .168], [.0035, .004, .002], head);
    tube([[side * .026, .017, .159], [side * .067, .026, .158], [side * .112, .012, .143]], .005, skinShadow, head);
    tube([[side * .026, .048, .157], [side * .066, .06, .154], [side * .116, .046, .134]], .007, id === "frieza" ? trim : hair, head);
    if (id === "pain") for (const r of [.008, .013, .019]) mesh(own(new THREE.TorusGeometry(r, .0018, 3, 20)), black, [side * .068, .004, .167], [1, 1, 1], head);
  }
  clump([0, .04, .147], [0, -.06, .196], .016, .018, skin, head, -.006);
  oval(skin, [0, -.063, .183], [.02, .016, .018], head);
  for (const side of [-1, 1]) oval(skinShadow, [side * .014, -.07, .185], [.005, .0035, .003], head);
  tube([[-.041, -.112, .144], [0, -.115, .157], [.041, -.112, .144]], .0038, lips, head);
  tube([[-.03, -.122, .149], [0, -.127, .159], [.03, -.122, .149]], .003, skinShadow, head);
  if (id === "naruto") for (const side of [-1, 1]) for (let i = 0; i < 3; i++) {
    tube([[side * .09, -.055 - i * .019, .144], [side * .132, -.061 - i * .022, .102]], .0025, skinShadow, head, 5);
  }

  if (id === "frieza") {
    oval(trim, [0, .133, -.015], [.153, .1, .14], head);
    oval(trim, [0, .04, .152], [.023, .093, .007], head);
    for (const side of [-1, 1]) tube([[side * .116, .006, .129], [side * .126, -.065, .113], [side * .066, -.172, .1]], .004, trim, head);
  } else if (id === "dende") {
    for (const side of [-1, 1]) {
      clump([side * .15, -.01, -.015], [side * .38, .04, -.033], .05, .022, skin, head, -.018);
      tube([[side * .07, .18, .1], [side * .11, .35, .15], [side * .175, .30, .2]], .011, skin, head);
      oval(skin, [side * .175, .3, .2], [.02, .018, .02], head);
    }
  } else {
    oval(hair, [0, .11, -.037], [.17, .137, .147], head);
    const powerHair = id === "goku" || id === "broly", count = powerHair ? 15 : id === "sasuke" ? 14 : 20;
    for (let i = 0; i < count; i++) {
      const a = i / count * Math.PI * 2, sin = Math.sin(a), cos = Math.cos(a);
      const length = powerHair ? .16 + (i % 3) * .047 : id === "kakashi" ? .15 : id === "sasuke" ? .125 : .095;
      const top = powerHair ? .16 + length * .79 : .21 + length * .5;
      const sweep = powerHair ? (id === "goku" ? -.052 : .018) : 0;
      const tilt = powerHair ? (i % 3 === 0 ? -.075 : .035) : 0;
      clump([sin * .12, .10 + Math.abs(cos) * .024, cos * .11 - .025], [sin * (.17 + (powerHair ? .18 : id === "kakashi" ? .16 : .1)) + sweep, top - Math.abs(sin) * .11 + tilt, cos * (powerHair ? .19 : .18) - (powerHair ? .075 : .025)], powerHair ? .075 : .039, powerHair ? .049 : .03, i % 4 === 0 ? hairLight : hair, head, -.025);
    }
    for (let i = 0; i < 5; i++) {
      const x = (i - 2) * .05, y = id === "sasuke" ? -.05 + Math.abs(i - 2) * .014 : powerHair ? .032 : .072;
      clump([x, .14, .12], [x * 1.35 + (powerHair ? .018 : 0), y, .158], powerHair ? .045 : .031, .017, i % 2 ? hairLight : hair, head, .018);
    }
    if (["naruto", "pain", "kakashi"].includes(id)) {
      const bandMat = fabric(0x252e38);
      band(.166, .066, bandMat, [0, .095, -.005], head, .97);
      mesh(cube, metal, [0, .096, .16], [.18, .055, .012], head).rotation.x = -.02;
      for (const side of [-1, 1]) for (const y of [.079, .113]) oval(black, [side * .075, y, .168], [.003, .003, .002], head);
      tube([[-.028, .09, .168], [-.017, .107, .17], [.012, .107, .17], [.022, .091, .17], [0, .085, .17], [-.002, .099, .17]], .0025, black, head);
      if (id === "pain") tube([[-.083, .093, .173], [.083, .104, .173]], .0025, black, head);
      const ties = pivot("ties", [0, .05, -.166], head);
      for (const side of [-1, 1]) clump([side * .024, 0, 0], [side * .10, -.12, -.21], .023, .004, bandMat, ties, .008);
      if (id === "kakashi") {
        loft([[-.19, .07, .074, .044], [-.13, .123, .12, .023], [-.055, .148, .148], [-.02, .153, .15]], trim, head, .025);
        mesh(cube, bandMat, [-.065, .041, .164], [.08, .106, .013], head).rotation.z = -.16;
      }
    }
    if (id === "pain") for (const side of [-1, 1]) {
      for (let i = 0; i < 3; i++) oval(metal, [side * (.059 + i * .029), -.063, .156 - i * .015], [.007, .007, .005], head);
      for (let i = 0; i < 3; i++) oval(black, [side * .173, -.019 - i * .018, .008], [.01, .008, .013], head);
    }
  }

  // Tailoring and recognizable equipment are fitted to the anatomy.
  if (id === "naruto") {
    oval(trim, [0, .117, -.153], [.31, .153, .035], chest);
    for (const side of [-1, 1]) oval(trim, [side * .275, .155, 0], [.064, .101, .132], chest);
    band(.119, .108, trim, [0, .29, 0], chest, .95);
    tube([[0, -.335, .153], [0, -.11, .177], [0, .1, .179], [0, .265, .119]], .006, metal, chest);
    mesh(cube, leather, [.205, -.23, .136], [.12, .09, .024], chest).rotation.z = -.1;
    for (const side of [-1, 1]) tube([[side * .12, -.245, .151], [side * .21, -.206, .121]], .003, seam, chest);
    const emblem = pivot("emblem", [0, .04, -.176], chest), points = [];
    for (let i = 0; i < 34; i++) {
      const a = i / 33 * Math.PI * 4, r = .075 * (1 - i / 40);
      points.push([Math.cos(a) * r, Math.sin(a) * r, -.002]);
    }
    tube(points, .007, material(0x7e2f25, { roughness: .93 }), emblem, 36);
    for (const side of [-1, 1]) mesh(cube, leather, [side * .235, .035, -.065], [.12, .155, .08], pelvis);
  } else if (id === "goku") {
    loft([[.08, .24, .18], [.21, .23, .144], [.28, .115, .096]], trim, chest);
    for (const side of [-1, 1]) tube([[side * .088, .266, .093], [side * .121, .12, .163], [side * .029, -.1, .178]], .016, cloth, chest);
    band(.222 * muscular, .09, trim, [0, -.324, 0], chest, .71);
    const sash = pivot("sash", [.15, -.325, .08], chest);
    clump([0, 0, 0], [.035, -.2, .09], .041, .008, trim, sash, -.028);
    for (const z of [.182, -.18]) {
      mesh(own(new THREE.CylinderGeometry(.083, .083, .008, 28)), ivory, [z > 0 ? -.17 : 0, .06, z], [1, 1, 1], chest).rotation.x = Math.PI / 2;
      const emblem = pivot(z > 0 ? "frontBadge" : "backBadge", [z > 0 ? -.17 : 0, .06, z > 0 ? .188 : -.187], chest);
      tube([[-.035, .037, 0], [.036, .037, 0], [0, .037, 0], [0, -.043, 0]], .004, black, emblem);
      tube([[-.038, -.028, 0], [-.038, .012, 0], [.038, .012, 0], [.038, -.028, 0], [-.038, -.028, 0]], .004, black, emblem);
    }
  } else if (id === "sasuke") {
    band(.157, .14, cloth, [0, .263, 0], chest, .95);
    tube([[0, .16, .176], [0, -.15, .176]], .018, skin, chest);
    const rope = fabric(0x78617e);
    mesh(own(new THREE.TorusGeometry(.224, .027, 7, 28)), rope, [0, -.3, 0], [1, 1, .71], chest).rotation.x = Math.PI / 2;
    for (const side of [-1, 1]) tube([[side * .06, -.28, .17], [side * .16, -.34, .22], [side * .12, -.5, .16]], .019, rope, chest);
    const sword = pivot("sword", [-.23, .1, -.15], pelvis); sword.rotation.z = -.24;
    band(.021, 1.08, black, [0, -.32, 0], sword);
    band(.032, .22, leather, [0, .29, 0], sword);
    for (let i = 0; i < 7; i++) band(.034, .013, ivory, [0, .2 + i * .025, 0], sword);
    mesh(cube, metal, [0, .164, 0], [.12, .025, .07], sword);
    for (const side of [-1, 1]) tube([[side * .05, .14, -.16], [side * .1, .16, -.17], [side * .14, .07, -.18]], .016, trim, chest);
  } else if (id === "pain") {
    loft([[-.75, .38, .226], [-.60, .35, .207], [-.38, .28, .183], [-.17, .26, .172], [.03, .315, .173], [.17, .336, .15]], cloth, chest, .035);
    band(.16, .205, cloth, [0, .235, 0], chest, 1.03);
    tube([[.016, .285, .163], [.016, .03, .18], [.03, -.36, .20], [.06, -.74, .238]], .006, trim, chest);
    for (const [x, y, z] of [[-.13, .04, .18], [.15, -.46, .23], [0, -.17, -.18]]) {
      const badge = new THREE.Group(); badge.position.set(x, y, z); chest.add(badge);
      for (const [dx, dy, r] of [[0, 0, .06], [-.055, -.008, .039], [.056, -.006, .042], [.015, .037, .035]]) {
        oval(ivory, [dx, dy, 0], [r * 1.12, r * .7, .008], badge);
        oval(trim, [dx, dy, z < 0 ? -.008 : .008], [r, r * .59, .006], badge);
      }
    }
  } else if (id === "frieza" || id === "broly") {
    if (id === "frieza") {
      oval(trim, [0, .11, -.163], [.19, .123, .016], chest);
      const tail = pivot("tail", [0, -.02, -.139], pelvis);
      tube([[0, 0, 0], [.11, -.12, -.4], [.38, -.34, -.73], [.49, -.16, -1.08], [.38, .12, -1.3]], .065, skin, tail, 24);
      oval(trim, [.38, .12, -1.3], [.053, .06, .08], tail);
    } else {
      band(.31, .125, trim, [0, -.01, 0], pelvis, .68);
      const pelt = pivot("pelt", [0, -.04, 0], pelvis);
      loft([[-.285, .34, .213], [-.2, .326, .201], [-.04, .326, .2], [.035, .31, .19]], trim, pelt, .12);
      for (let i = 0; i < 20; i++) {
        const a = i / 20 * Math.PI * 2;
        clump([Math.sin(a) * .32, -.19, Math.cos(a) * .2], [Math.sin(a) * .36, -.35 - (i % 3) * .025, Math.cos(a) * .23], .028, .013, i % 4 ? trim : seam, pelt, .018);
      }
      mesh(own(new THREE.TorusGeometry(.12, .013, 6, 24)), gold, [0, .295, .011], [1, 1, 1], chest).rotation.x = Math.PI / 2;
    }
  } else if (id === "kakashi") {
    for (const side of [-1, 1]) {
      mesh(cube, cloth, [side * .158, -.047, .168], [.19, .232, .03], chest);
      mesh(cube, seam, [side * .158, .08, .183], [.188, .033, .018], chest);
      tube([[side * .16, -.164, .189], [side * .16, .057, .189]], .003, trim, chest);
      tube([[side * .225, -.166, .158], [side * .225, .073, .158]], .003, trim, chest);
    }
    band(.145, .125, cloth, [0, .27, 0], chest);
    tube([[0, -.32, .162], [0, .15, .185], [0, .285, .143]], .006, black, chest);
    mesh(cube, leather, [.23, 0, -.03], [.125, .14, .1], pelvis);
  } else if (id === "dende") {
    loft([[-.72, .36, .227], [-.54, .34, .208], [-.27, .25, .17], [-.08, .28, .166]], trim, chest, .09);
    loft([[.07, .39, .227], [.19, .32, .19], [.31, .15, .106]], cloth, chest, .11);
    const vest = fabric(0x987c51);
    for (const side of [-1, 1]) {
      oval(vest, [side * .212, -.08, .079], [.098, .25, .117], chest);
      tube([[side * .14, .15, .18], [side * .16, -.15, .175], [side * .17, -.32, .14]], .008, gold, chest);
    }
  }

  for (const side of [-1, 1]) {
    const label = side < 0 ? "left" : "right";
    const legMat = id === "pain" ? cloth : ["kakashi", "dende", "sasuke"].includes(id) ? trim : id === "frieza" ? skin : cloth;
    const hip = pivot(label + "Hip", [side * .135 * muscular, -.035, 0], pelvis);
    limb(.49, .13 * muscular, .097 * muscular, legMat, hip, id !== "frieza");
    const knee = pivot(label + "Knee", [0, -.49, .004], hip);
    limb(.43, .095 * muscular, .065 * muscular, legMat, knee, id !== "frieza");
    const ankle = pivot(label + "Ankle", [0, -.435, 0], knee);
    const bootMat = id === "frieza" ? skin : id === "broly" ? ivory : id === "goku" ? trim : leather;
    oval(bootMat, [0, -.029, .066], [.079 * muscular, .055, .156], ankle);
    oval(black, [0, -.067, .069], [.08 * muscular, .016, .157], ankle);
    if (id !== "frieza") {
      band(.069 * muscular, id === "goku" || id === "broly" ? .23 : .09, bootMat, [0, id === "goku" || id === "broly" ? .086 : .032, 0], ankle);
      if (id === "goku" || id === "broly") {
        band(.073 * muscular, .028, id === "broly" ? gold : seam, [0, .183, 0], ankle);
        tube([[-.026, .155, .067], [.028, .08, .078], [-.031, .027, .089]], .003, gold, ankle);
      } else for (let i = 0; i < 3; i++) tube([[-.044, -.009, .052 + i * .025], [.044, -.009, .065 + i * .025]], .0025, trim, ankle);
      if (["naruto", "sasuke", "kakashi"].includes(id)) for (let i = 0; i < 5; i++) band(.082 * muscular, .014, ivory, [0, -.16 - i * .022, 0], knee);
      if (["naruto", "kakashi"].includes(id) && side === 1) {
        mesh(cube, leather, [0, -.28, -.12], [.145, .185, .059], hip);
        for (const y of [-.2, -.35]) band(.134, .033, leather, [0, y, 0], hip);
      }
    }
    if (id !== "frieza") for (let i = 0; i < 3; i++) tube([[-.09, -.1 - i * .035, .095], [.02, -.07 - i * .045, .118], [.08, -.12 - i * .027, .082]], .0028, seam, hip);
    const shoulder = pivot(label + "Shoulder", [side * .285 * muscular, .205, 0], chest);
    const longSleeve = ["naruto", "pain", "kakashi"].includes(id);
    const armMat = id === "pain" ? cloth : id === "naruto" || id === "kakashi" ? trim : skin;
    limb(.36, .092 * muscular, .074 * muscular, armMat, shoulder, longSleeve);
    if (id === "sasuke" || id === "goku") {
      limb(.125, .107, .098, cloth, shoulder, true);
      oval(cloth, [0, -.005, 0], [.108, .052, .096], shoulder);
    }
    if (bare || id === "goku") oval(skin, [0, -.11, .017], [.106 * muscular, .125, .084 * muscular], shoulder);
    const elbow = pivot(label + "Elbow", [0, -.36, 0], shoulder);
    limb(.32, .073 * muscular, .052 * muscular, id === "naruto" || id === "pain" ? cloth : id === "kakashi" ? trim : skin, elbow, longSleeve);
    const wrist = pivot(label + "Wrist", [0, -.318, .005], elbow);
    oval(id === "kakashi" ? leather : skin, [0, -.045, .006], [.049 * muscular, .068, .03 * muscular], wrist);
    for (let finger = 0; finger < 4; finger++) oval(skin, [(finger - 1.5) * .023 * muscular, -.098 + (finger === 0 || finger === 3 ? .009 : 0), .008], [.011 * muscular, .031, .016], wrist);
    oval(skin, [-side * .048 * muscular, -.042, .014], [.019, .033, .025], wrist).rotation.z = side * -.4;
    if (["goku", "broly", "sasuke", "naruto", "kakashi"].includes(id)) {
      band(.056 * muscular, .085, id === "broly" ? gold : trim, [0, -.26, 0], elbow);
      band(.058 * muscular, .012, id === "broly" ? gold : seam, [0, -.219, 0], elbow);
    }
    if (id === "frieza") oval(trim, [0, -.15, .064], [.048, .095, .016], elbow);
    if (id === "kakashi") mesh(cube, metal, [0, -.028, -.025], [.07, .075, .008], wrist);
    if (longSleeve) for (let i = 0; i < 2; i++) tube([[-.054, -.18 - i * .04, .045], [.024, -.205 - i * .04, .06], [.051, -.178 - i * .04, .036]], .002, seam, elbow);
  }

  // Batch only static siblings within each joint. Articulation stays independent.
  function batch(group) {
    for (const child of [...group.children]) if (child.isGroup) batch(child);
    const byMaterial = new Map();
    for (const child of group.children) {
      if (!child.isMesh) continue;
      child.updateMatrix();
      if (!byMaterial.has(child.material)) byMaterial.set(child.material, []);
      byMaterial.get(child.material).push(child);
    }
    for (const [mat, objects] of byMaterial) {
      if (objects.length < 2) continue;
      const position = [], normal = [], uv = [];
      for (const object of objects) {
        const clone = object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone();
        clone.applyMatrix4(object.matrix);
        for (const name of ["position", "normal", "uv"]) {
          const target = name === "position" ? position : name === "normal" ? normal : uv;
          for (const value of clone.getAttribute(name).array) target.push(value);
        }
        clone.dispose(); group.remove(object);
      }
      const merged = new THREE.BufferGeometry();
      merged.setAttribute("position", new THREE.Float32BufferAttribute(position, 3));
      merged.setAttribute("normal", new THREE.Float32BufferAttribute(normal, 3));
      merged.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
      mesh(merged, mat, [0, 0, 0], [1, 1, 1], group);
    }
  }
  batch(root);
  const retained = new Set(), retainedMaterials = new Set(), retainedTextures = new Set();
  root.traverse((object) => {
    if (!object.isMesh) return;
    retained.add(object.geometry);
    retainedMaterials.add(object.material);
    for (const key of ["map", "bumpMap", "roughnessMap"]) if (object.material[key]) retainedTextures.add(object.material[key]);
  });
  for (const geometry of geometries) if (!retained.has(geometry)) geometry.dispose();
  for (const mat of materials) if (!retainedMaterials.has(mat)) mat.dispose();
  for (const texture of [weave, pores, strands]) if (!retainedTextures.has(texture)) texture.dispose();
  root.scale.setScalar(tall);
  root.userData = { id, joints, height: 2.47 * tall, baseScale: tall };
  animateCharacter(root, { time: 0, moving: false, grounded: true });
  return root;
}

export function animateCharacter(root, { time = 0, moving = false, speed = 1, grounded = true, attack = false, guard = false, hurt = false } = {}) {
  const j = root.userData.joints;
  if (!j) return;
  const phase = time * (10.5 + Math.min(speed, 2) * 2.7), stride = moving ? Math.sin(phase) : 0, idle = Math.sin(time * 1.8);
  const sprint = Math.min(1, Math.max(0, speed - .8));
  j.pelvis.position.y = 1.065 + (moving && grounded ? Math.cos(phase * 2) * .018 : idle * .0035);
  j.pelvis.rotation.set(0, moving ? stride * .07 : 0, moving ? stride * .022 : 0);
  j.chest.position.y = .49 + idle * .0025;
  j.chest.rotation.set(grounded ? moving ? .08 + sprint * .11 : idle * .007 : -.06, moving ? -stride * .06 : idle * .008, hurt ? Math.sin(time * 35) * .05 : 0);
  j.head.rotation.set(moving ? -.035 - sprint * .05 : idle * .008, moving ? stride * .015 : Math.sin(time * .65) * .022, 0);
  j.leftHip.rotation.set(grounded ? stride * (.54 + sprint * .17) : -.67, 0, -.012);
  j.rightHip.rotation.set(grounded ? -stride * (.54 + sprint * .17) : .33, 0, .012);
  j.leftKnee.rotation.x = grounded ? .035 + Math.max(0, -stride) * .94 : 1.02;
  j.rightKnee.rotation.x = grounded ? .035 + Math.max(0, stride) * .94 : .79;
  j.leftAnkle.rotation.x = grounded ? Math.max(0, stride) * -.2 : .24;
  j.rightAnkle.rotation.x = grounded ? Math.max(0, -stride) * -.2 : .24;
  j.leftShoulder.rotation.set(grounded ? -stride * .57 : -.52, 0, -.085);
  j.rightShoulder.rotation.set(grounded ? stride * .57 : -.52, 0, .085);
  j.leftElbow.rotation.x = moving ? -.48 - Math.max(0, stride) * .22 : -.11;
  j.rightElbow.rotation.x = moving ? -.48 - Math.max(0, -stride) * .22 : -.11;
  j.leftWrist.rotation.set(0, 0, 0); j.rightWrist.rotation.set(0, 0, 0);
  if (root.userData.id === "naruto" && moving && grounded && !guard && !attack) {
    j.chest.rotation.x = .19 + sprint * .12; j.head.rotation.x = -.15 - sprint * .06;
    j.leftShoulder.rotation.set(.55 + Math.cos(phase) * .035, -.08, -.22);
    j.rightShoulder.rotation.set(.55 - Math.cos(phase) * .035, .08, .22);
    j.leftElbow.rotation.x = j.rightElbow.rotation.x = -.12;
  }
  if (guard) {
    j.chest.rotation.set(.095, -.06, -.035);
    j.leftShoulder.rotation.set(-1.08, -.36, -.33); j.rightShoulder.rotation.set(-1.05, .28, .30);
    j.leftElbow.rotation.x = -1.35; j.rightElbow.rotation.x = -1.33;
    j.leftHip.rotation.x *= .6; j.rightHip.rotation.x *= .6;
  } else if (attack) {
    const type = typeof attack === "string" ? attack : attack.type || "punch";
    const special = ["special", "beam", "charge", "rasengan"].includes(type), pulse = .5 + .5 * Math.sin(time * (special ? 12 : 20));
    j.chest.rotation.y = special ? -.17 : -.24 + pulse * .47;
    j.chest.rotation.x = special ? .1 : .08 + pulse * .055; j.head.rotation.y = -j.chest.rotation.y * .6;
    j.rightShoulder.rotation.set(-1.34 - pulse * .2, special ? -.16 : -.09, special ? .19 : .04);
    j.rightElbow.rotation.x = special ? -.28 : -.12 - (1 - pulse) * 1.21; j.rightWrist.rotation.x = -.09;
    if (special) {
      j.leftShoulder.rotation.set(-1.24, .27, -.25); j.leftElbow.rotation.x = -.45; j.leftWrist.rotation.y = .38;
      j.leftHip.rotation.x = -.11; j.rightHip.rotation.x = .18;
    } else {
      j.leftShoulder.rotation.set(-.71, -.13, -.12); j.leftElbow.rotation.x = -1.09;
    }
  }
  if (hurt && !guard) { j.chest.rotation.x -= .12; j.head.rotation.x += .085; }
  if (j.tail) j.tail.rotation.y = Math.sin(time * 2.4) * .18;
  if (j.ties) j.ties.rotation.x = moving ? -.3 + Math.sin(phase * .7) * .08 : Math.sin(time * 2) * .035;
  if (j.sash) j.sash.rotation.x = moving ? Math.sin(phase) * .13 : idle * .025;
  if (j.pelt) j.pelt.rotation.x = moving ? stride * .075 : idle * .008;
}
