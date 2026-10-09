import * as THREE from "/vendor/three.module.js";

// A small, local render pipeline. Scene materials remain in linear light until
// the final pass: lighting, bloom, grading, then one display conversion.
const vertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const skyVertex = /* glsl */ `
  varying vec3 vDirection;
  void main() {
    vDirection = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const skyFragment = /* glsl */ `
  varying vec3 vDirection;
  uniform vec3 zenith;
  uniform vec3 horizon;
  uniform vec3 dusk;
  uniform vec3 sunDirection;
  uniform vec3 sunColor;
  uniform float time;
  uniform float alien;
  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x),
      mix(hash(i + vec2(0, 1)), hash(i + vec2(1)), f.x), f.y);
  }
  float cloudNoise(vec2 p) {
    return noise(p) * 0.56 + noise(p * 2.04 + 12.7) * 0.28
      + noise(p * 4.13 + 8.9) * 0.12;
  }
  void main() {
    vec3 dir = normalize(vDirection);
    float h = max(dir.y, 0.0);
    vec3 color = mix(horizon, zenith, pow(h, 0.43));
    float alignment = max(dot(dir, sunDirection), 0.0);
    color = mix(color, dusk, pow(1.0 - h, 7.0) * (0.16 + alignment * 0.48));
    color += sunColor * pow(alignment, 15.0) * 0.11;
    color += sunColor * pow(alignment, 110.0) * 0.16;
    color += sunColor * smoothstep(0.99942, 0.99976, alignment) * 5.0;
    // Slow, layered cirrus stays above the horizon and is also present in the
    // reflected environment. No downloaded skybox or separate weather asset.
    vec2 cloudUV = dir.xz / (0.22 + h) * 2.7 + vec2(time * 0.0014, 0.0);
    float clouds = smoothstep(0.53, 0.72, cloudNoise(cloudUV));
    clouds *= smoothstep(0.025, 0.20, h) * (1.0 - smoothstep(0.7, 1.0, h));
    vec3 cloudColor = mix(vec3(0.68, 0.72, 0.76), dusk * 1.08, alignment * 0.7);
    color = mix(color, cloudColor, clouds * (0.45 - alien * 0.15));
    color = mix(color, horizon * 0.58, 1.0 - smoothstep(-0.34, 0.0, dir.y));
    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const thresholdFragment = /* glsl */ `
  varying vec2 vUv;
  uniform sampler2D image;
  uniform vec2 texel;
  uniform float threshold;
  void main() {
    vec3 color = texture2D(image, vUv + texel * vec2(-0.5, -0.5)).rgb;
    color += texture2D(image, vUv + texel * vec2(0.5, -0.5)).rgb;
    color += texture2D(image, vUv + texel * vec2(-0.5, 0.5)).rgb;
    color += texture2D(image, vUv + texel * vec2(0.5, 0.5)).rgb;
    color *= 0.25;
    float luminance = max(color.r, max(color.g, color.b));
    float knee = threshold * 0.45;
    float soft = clamp(luminance - threshold + knee, 0.0, 2.0 * knee);
    soft = soft * soft / (4.0 * knee + 0.0001);
    float amount = max(luminance - threshold, soft) / max(luminance, 0.0001);
    gl_FragColor = vec4(color * amount, 1.0);
  }
`;

const blurFragment = /* glsl */ `
  varying vec2 vUv;
  uniform sampler2D image;
  uniform vec2 direction;
  void main() {
    vec3 color = texture2D(image, vUv).rgb * 0.227027;
    color += texture2D(image, vUv + direction * 1.384615).rgb * 0.316216;
    color += texture2D(image, vUv - direction * 1.384615).rgb * 0.316216;
    color += texture2D(image, vUv + direction * 3.230769).rgb * 0.070270;
    color += texture2D(image, vUv - direction * 3.230769).rgb * 0.070270;
    gl_FragColor = vec4(color, 1.0);
  }
`;

const compositeFragment = /* glsl */ `
  varying vec2 vUv;
  uniform sampler2D image;
  uniform sampler2D depth;
  uniform sampler2D bloom;
  uniform vec2 resolution;
  uniform mat4 inverseProjection;
  uniform float aoSamples;
  uniform float bloomStrength;
  uniform float exposure;
  uniform float warmth;
  uniform float impact;
  uniform float time;

  vec3 edgeSmooth(vec2 uv) {
    vec2 pixel = 1.0 / resolution;
    vec3 center = texture2D(image, uv).rgb;
    vec3 north = texture2D(image, uv + vec2(0.0, pixel.y)).rgb;
    vec3 south = texture2D(image, uv - vec2(0.0, pixel.y)).rgb;
    vec3 east = texture2D(image, uv + vec2(pixel.x, 0.0)).rgb;
    vec3 west = texture2D(image, uv - vec2(pixel.x, 0.0)).rgb;
    vec3 luma = vec3(0.2126, 0.7152, 0.0722);
    float l = dot(center, luma);
    float minL = min(l, min(min(dot(north, luma), dot(south, luma)), min(dot(east, luma), dot(west, luma))));
    float maxL = max(l, max(max(dot(north, luma), dot(south, luma)), max(dot(east, luma), dot(west, luma))));
    float edge = smoothstep(0.14, 0.6, (maxL - minL) / max(0.3, maxL));
    return mix(center, (north + south + east + west + center * 4.0) / 8.0, edge * 0.65);
  }

  vec3 viewPosition(vec2 uv, float z) {
    vec4 p = inverseProjection * vec4(uv * 2.0 - 1.0, z * 2.0 - 1.0, 1.0);
    return p.xyz / p.w;
  }
  float contactShading(vec2 uv) {
    float d = texture2D(depth, uv).x;
    if (d > 0.99996 || aoSamples < 1.0) return 1.0;
    vec3 p = viewPosition(uv, d);
    vec3 n = normalize(cross(dFdx(p), dFdy(p)));
    float radius = clamp(resolution.y * 0.66 / max(-p.z, 1.0), 2.0, 26.0);
    float obscurance = 0.0;
    // Fixed spatial rotation avoids a crawling grain pattern on still shots.
    float rotate = fract(sin(dot(floor(uv * resolution / 3.0),
      vec2(12.9898, 78.233))) * 43758.5453) * 6.283185;
    for (int i = 0; i < 8; i++) {
      if (float(i) >= aoSamples) break;
      float angle = rotate + float(i) * 2.399963;
      float ring = 0.48 + float(i) / aoSamples * 0.52;
      vec2 sampleUV = uv + vec2(cos(angle), sin(angle)) * radius * ring / resolution;
      vec3 delta = viewPosition(sampleUV, texture2D(depth, sampleUV).x) - p;
      float distance = length(delta);
      float facing = max(dot(n, delta / max(distance, 0.001)) - 0.08, 0.0);
      obscurance += facing * (1.0 - smoothstep(0.08, 1.7, distance));
    }
    return clamp(1.0 - obscurance * 2.25 / aoSamples, 0.64, 1.0);
  }
  vec3 filmic(vec3 x) {
    // ACES fitted transform; one tone map after linear bloom and color grading.
    mat3 inputMatrix = mat3(
      0.59719, 0.07600, 0.02840,
      0.35458, 0.90834, 0.13383,
      0.04823, 0.01566, 0.83777
    );
    mat3 outputMatrix = mat3(
      1.60475, -0.10208, -0.00327,
      -0.53108, 1.10813, -0.07276,
      -0.07367, -0.00605, 1.07602
    );
    x = inputMatrix * x;
    vec3 a = x * (x + 0.0245786) - 0.000090537;
    vec3 b = x * (0.983729 * x + 0.4329510) + 0.238081;
    return clamp(outputMatrix * (a / b), 0.0, 1.0);
  }
  vec3 displayColor(vec3 linearColor) {
    return mix(linearColor * 12.92,
      1.055 * pow(max(linearColor, vec3(0.0)), vec3(1.0 / 2.4)) - 0.055,
      step(vec3(0.0031308), linearColor));
  }
  void main() {
    vec3 color = edgeSmooth(vUv);
    color *= contactShading(vUv);
    color += texture2D(bloom, vUv).rgb * bloomStrength;
    float luminance = dot(color, vec3(0.2126, 0.7152, 0.0722));
    float highlights = smoothstep(0.3, 2.0, luminance);
    vec3 shadowTint = mix(vec3(0.955, 0.98, 1.035), vec3(0.95, 1.018, 1.015), 1.0 - warmth);
    vec3 lightTint = mix(vec3(1.025, 1.008, 0.982), vec3(1.04, 1.003, 0.964), warmth);
    color *= mix(shadowTint, lightTint, highlights);
    color *= exposure / 0.6 * (1.0 + impact * 0.035);
    color = filmic(color);
    // Quiet lens falloff; keeps corners and combat telegraphs readable.
    vec2 lens = vUv * 2.0 - 1.0;
    color *= 1.0 - dot(lens, lens) * 0.055;
    color = displayColor(color);
    float grain = fract(sin(dot(vUv * resolution + fract(time) * 79.0,
      vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
    color += grain / 380.0;
    gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
  }
`;

const regions = {
  leaf: {
    zenith: "#6684ab",
    horizon: "#edca9a",
    dusk: "#ffc590",
    sun: "#ffe1b0",
    sky: "#bed1e0",
    ground: "#545548",
    fog: "#c9bcaa",
    direction: [-42, 57, -48],
    sunIntensity: 3.75,
    environment: 0.42,
    exposure: 1.02,
    warmth: 1,
  },
  namek: {
    zenith: "#296c7b",
    horizon: "#b8d9b1",
    dusk: "#dbdebc",
    sun: "#e9f3de",
    sky: "#a7d4db",
    ground: "#365e55",
    fog: "#93b8a4",
    direction: [-36, 66, -44],
    sunIntensity: 3.45,
    environment: 0.46,
    exposure: 1.04,
    warmth: 0,
  },
};

export function createVisuals(renderer, scene, camera) {
  const gl = renderer.getContext();
  const hdr = Boolean(gl.getExtension("EXT_color_buffer_float"));
  const targetType = hdr ? THREE.HalfFloatType : THREE.UnsignedByteType;
  const previous = {
    environment: scene.environment,
    environmentIntensity: scene.environmentIntensity,
    fog: scene.fog,
    background: scene.background,
    toneMapping: renderer.toneMapping,
    exposure: renderer.toneMappingExposure,
  };
  let disposed = false,
    region = "leaf",
    quality = "balanced",
    width = 1,
    height = 1,
    environmentTarget = null,
    elapsed = 0;

  const hemi = new THREE.HemisphereLight(0xc4d7e9, 0x53574d, 0.56);
  // A broad, faint camera-side bounce keeps faces legible against backlight;
  // it does not cast a second shadow or flatten the primary sun direction.
  const bounce = new THREE.DirectionalLight(0xd5e2ef, 0.32);
  const sun = new THREE.DirectionalLight(0xffe1b0, 3.75);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1536, 1536);
  Object.assign(sun.shadow.camera, {
    left: -38,
    right: 38,
    top: 38,
    bottom: -38,
    near: 0.5,
    far: 190,
  });
  sun.shadow.bias = -0.00016;
  sun.shadow.normalBias = 0.035;
  sun.shadow.radius = 2;
  const skyMaterial = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      zenith: { value: new THREE.Color() },
      horizon: { value: new THREE.Color() },
      dusk: { value: new THREE.Color() },
      sunDirection: { value: new THREE.Vector3() },
      sunColor: { value: new THREE.Color() },
      time: { value: 0 },
      alien: { value: 0 },
    },
    vertexShader: skyVertex,
    fragmentShader: skyFragment,
  });
  const skyGeometry = new THREE.SphereGeometry(280, 32, 20);
  const sky = new THREE.Mesh(skyGeometry, skyMaterial);
  sky.renderOrder = -1000;
  sky.frustumCulled = false;
  scene.add(hemi, sun, sun.target, bounce, bounce.target, sky);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const environmentScene = new THREE.Scene();
  const reflectionSky = new THREE.Mesh(skyGeometry, skyMaterial);
  environmentScene.add(reflectionSky);
  const renderTarget = new THREE.WebGLRenderTarget(1, 1, {
    type: targetType,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    depthBuffer: true,
  });
  renderTarget.texture.colorSpace = THREE.LinearSRGBColorSpace;
  renderTarget.depthTexture = new THREE.DepthTexture(1, 1, THREE.UnsignedIntType);
  const bloomA = new THREE.WebGLRenderTarget(1, 1, {
    type: targetType,
    depthBuffer: false,
  });
  const bloomB = bloomA.clone();
  const black = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
  black.needsUpdate = true;
  const screenScene = new THREE.Scene();
  const screenCamera = new THREE.Camera();
  const screenGeometry = new THREE.PlaneGeometry(2, 2);
  const material = (fragmentShader, uniforms) =>
    new THREE.ShaderMaterial({
      vertexShader: vertex,
      fragmentShader,
      uniforms,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });
  const threshold = material(thresholdFragment, {
    image: { value: renderTarget.texture },
    texel: { value: new THREE.Vector2(1, 1) },
    threshold: { value: hdr ? 1.1 : 0.82 },
  });
  const blur = material(blurFragment, {
    image: { value: bloomA.texture },
    direction: { value: new THREE.Vector2(1, 0) },
  });
  const composite = material(compositeFragment, {
    image: { value: renderTarget.texture },
    depth: { value: renderTarget.depthTexture },
    bloom: { value: black },
    resolution: { value: new THREE.Vector2(1, 1) },
    inverseProjection: { value: new THREE.Matrix4() },
    aoSamples: { value: 4 },
    bloomStrength: { value: 0 },
    exposure: { value: 1.02 },
    warmth: { value: 1 },
    impact: { value: 0 },
    time: { value: 0 },
  });
  const quad = new THREE.Mesh(screenGeometry, composite);
  quad.frustumCulled = false;
  screenScene.add(quad);
  const drawingSize = new THREE.Vector2();
  const info = {
    quality,
    region,
    hdr,
    width,
    height,
    passes: ["scene", "contact shading + filmic composite"],
    shadowSize: 1536,
    bloomSize: [1, 1],
    aoSamples: 4,
    drawCalls: 0,
    triangles: 0,
    calls: 0,
    pixelRatio: renderer.getPixelRatio(),
    effects: { bloom: false, contactAO: true, filmicGrading: true, environmentReflections: hdr, edgeSmoothing: true },
  };

  function resize(w, h) {
    if (disposed) return;
    width = Math.max(1, Math.floor(w || 1));
    height = Math.max(1, Math.floor(h || 1));
    renderer.getDrawingBufferSize(drawingSize);
    const rw = Math.max(1, Math.floor(drawingSize.x));
    const rh = Math.max(1, Math.floor(drawingSize.y));
    renderTarget.setSize(rw, rh);
    const bw = Math.max(1, Math.ceil(rw / 4));
    const bh = Math.max(1, Math.ceil(rh / 4));
    bloomA.setSize(bw, bh);
    bloomB.setSize(bw, bh);
    threshold.uniforms.texel.value.set(1 / rw, 1 / rh);
    composite.uniforms.resolution.value.set(rw, rh);
    Object.assign(info, { width: rw, height: rh, bloomSize: [bw, bh], pixelRatio: renderer.getPixelRatio() });
  }

  function setQuality(value) {
    if (disposed) return quality;
    if (!["cinematic", "balanced", "fast"].includes(value)) value = "balanced";
    quality = value;
    const shadowSize = value === "cinematic" ? 2048 : value === "balanced" ? 1536 : 1024;
    if (sun.shadow.mapSize.x !== shadowSize) {
      sun.shadow.map?.dispose();
      sun.shadow.map = null;
      sun.shadow.mapSize.set(shadowSize, shadowSize);
      sun.shadow.needsUpdate = true;
    }
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderTarget.samples = value === "cinematic" ? 2 : 0;
    // Setting samples changes framebuffer allocation, even at the same size.
    renderTarget.dispose();
    composite.uniforms.aoSamples.value = value === "cinematic" ? 8 : 4;
    composite.uniforms.bloom.value = value === "cinematic" ? bloomA.texture : black;
    composite.uniforms.bloomStrength.value = value === "cinematic" ? 0.115 : 0;
    Object.assign(info, {
      quality,
      shadowSize,
      aoSamples: value === "fast" ? 0 : composite.uniforms.aoSamples.value,
      effects: {
        bloom: value === "cinematic",
        contactAO: value !== "fast",
        filmicGrading: value !== "fast",
        environmentReflections: hdr,
        edgeSmoothing: value !== "fast",
      },
      passes:
        value === "fast"
          ? ["direct ACES scene"]
          : value === "cinematic"
            ? ["HDR scene", "bloom threshold", "bloom horizontal", "bloom vertical", "contact shading + filmic composite"]
            : ["scene", "contact shading + filmic composite"],
    });
    resize(width, height);
    return quality;
  }

  function setRegion(id) {
    if (disposed) return;
    region = regions[id] ? id : "leaf";
    const settings = regions[region];
    const uniforms = skyMaterial.uniforms;
    for (const key of ["zenith", "horizon", "dusk", "sunColor"]) {
      uniforms[key].value.set(key === "sunColor" ? settings.sun : settings[key]);
    }
    uniforms.sunDirection.value.set(...settings.direction).normalize();
    uniforms.alien.value = region === "namek" ? 1 : 0;
    sun.color.set(settings.sun);
    sun.intensity = settings.sunIntensity;
    hemi.color.set(settings.sky);
    hemi.groundColor.set(settings.ground);
    scene.fog = new THREE.Fog(settings.fog, 72, region === "namek" ? 240 : 210);
    scene.background = new THREE.Color(settings.fog);
    scene.environmentIntensity = settings.environment;
    composite.uniforms.exposure.value = settings.exposure;
    composite.uniforms.warmth.value = settings.warmth;
    const oldMapping = renderer.toneMapping;
    const oldTarget = renderer.getRenderTarget();
    renderer.toneMapping = THREE.NoToneMapping;
    environmentTarget?.dispose();
    if (hdr) {
      environmentTarget = pmrem.fromScene(environmentScene, 0.04, 0.1, 700);
      scene.environment = environmentTarget.texture;
    } else {
      // Rare WebGL2 devices without float render attachments retain the
      // complete 8-bit grading path and a brighter hemispherical fill.
      environmentTarget = null;
      scene.environment = null;
      hemi.intensity = 0.78;
    }
    renderer.toneMapping = oldMapping;
    renderer.setRenderTarget(oldTarget);
    info.region = region;
  }

  function pass(target, passMaterial) {
    quad.material = passMaterial;
    renderer.setRenderTarget(target);
    renderer.render(screenScene, screenCamera);
  }

  function render(dt = 0, frame = {}) {
    if (disposed) return;
    elapsed = Number.isFinite(frame.time) ? frame.time : elapsed + Math.min(dt || 0, 0.1);
    sky.position.copy(camera.position);
    skyMaterial.uniforms.time.value = elapsed;
    const player = frame.player || { x: 0, y: 0, z: 0 };
    const offset = regions[region].direction;
    sun.position.set(player.x + offset[0], offset[1] + Math.max(0, player.y || 0) * 0.3, player.z + offset[2]);
    sun.target.position.set(player.x, 0, player.z);
    sun.target.updateMatrixWorld();
    bounce.position.copy(camera.position);
    bounce.position.y += 4;
    bounce.target.position.set(player.x, (player.y || 0) + 1.5, player.z);
    bounce.target.updateMatrixWorld();
    const oldAutoClear = renderer.autoClear;
    const oldInfoReset = renderer.info.autoReset;
    renderer.autoClear = true;
    renderer.info.autoReset = false;
    renderer.info.reset();
    if (quality === "fast") {
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = regions[region].exposure;
      renderer.setRenderTarget(null);
      renderer.render(scene, camera);
    } else {
      renderer.toneMapping = THREE.NoToneMapping;
      renderer.setRenderTarget(renderTarget);
      renderer.render(scene, camera);
      if (quality === "cinematic") {
        pass(bloomA, threshold);
        blur.uniforms.image.value = bloomA.texture;
        blur.uniforms.direction.value.set(1 / bloomA.width, 0);
        pass(bloomB, blur);
        blur.uniforms.image.value = bloomB.texture;
        blur.uniforms.direction.value.set(0, 1 / bloomA.height);
        pass(bloomA, blur);
      }
      composite.uniforms.inverseProjection.value.copy(camera.projectionMatrixInverse);
      composite.uniforms.time.value = elapsed;
      composite.uniforms.impact.value = Math.max(0, Math.min(1, frame.impact || 0));
      pass(null, composite);
    }
    info.drawCalls = renderer.info.render.calls;
    info.calls = info.drawCalls;
    info.triangles = renderer.info.render.triangles;
    renderer.autoClear = oldAutoClear;
    renderer.info.autoReset = oldInfoReset;
    // The canvas remains the active readable framebuffer for captures and HUD.
    renderer.setRenderTarget(null);
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    scene.remove(hemi, sun, sun.target, bounce, bounce.target, sky);
    sun.shadow.map?.dispose();
    skyGeometry.dispose();
    skyMaterial.dispose();
    renderTarget.depthTexture?.dispose();
    renderTarget.dispose();
    bloomA.dispose();
    bloomB.dispose();
    threshold.dispose();
    blur.dispose();
    composite.dispose();
    screenGeometry.dispose();
    black.dispose();
    environmentTarget?.dispose();
    pmrem.dispose();
    scene.environment = previous.environment;
    scene.environmentIntensity = previous.environmentIntensity;
    scene.fog = previous.fog;
    scene.background = previous.background;
    renderer.toneMapping = previous.toneMapping;
    renderer.toneMappingExposure = previous.exposure;
  }

  setRegion("leaf");
  setQuality("balanced");
  return {
    get quality() { return quality; },
    setQuality,
    setRegion,
    resize,
    render,
    dispose,
    info,
  };
}
