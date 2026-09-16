import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import type { Capabilities } from "./capabilities";
import type { RevealSource } from "./revealSource";

/**
 * One WebGL context for the whole page.
 *
 * A fullscreen quad samples two vehicle textures at once so consecutive
 * sections cross-dissolve without tearing down and rebuilding a renderer, and
 * the cover that lifts off each vehicle is drawn in the fragment shader so it
 * passes through tone mapping and bloom with everything else.
 */

export type SilhouetteKind = "motorcycle" | "car" | "truck";

/** Profile index handed to the shader. */
const SILHOUETTE_KIND: Record<SilhouetteKind, number> = {
  motorcycle: 0,
  car: 1,
  truck: 2,
};

export type StageVehicle = {
  id: string;
  accent: string;
  source: RevealSource;
};

/** What the scroll engine tells the stage to draw on a given frame. */
export type StageState = {
  index: number;
  /** 0..1 within the active vehicle: cover lift then full orbit. */
  progress: number;
  /** 0..1 dissolve toward the next vehicle. */
  blend: number;
};

const VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const FRAGMENT = /* glsl */ `
  precision highp float;

  uniform sampler2D uTexA;
  uniform sampler2D uTexB;
  uniform vec2 uSizeA;
  uniform vec2 uSizeB;
  uniform vec2 uResolution;
  uniform float uBlend;
  uniform float uCoverA;
  uniform float uCoverB;
  uniform float uScrimA;
  uniform float uScrimB;
  uniform float uKindA;
  uniform float uKindB;
  uniform float uStandInA;
  uniform float uStandInB;
  uniform vec3 uAccentA;
  uniform vec3 uAccentB;
  uniform float uTime;

  varying vec2 vUv;

  const float PI = 3.141592653589793;
  /** Where the vehicle meets the floor, in uv space. */
  const float GROUND = 0.30;

  /** Crops a texture to fill the viewport, preserving its aspect. */
  vec2 coverUv(vec2 uv, vec2 texSize) {
    float viewAspect = uResolution.x / uResolution.y;
    float texAspect = texSize.x / max(texSize.y, 1.0);
    vec2 scale = viewAspect > texAspect
      ? vec2(1.0, texAspect / viewAspect)
      : vec2(viewAspect / texAspect, 1.0);
    return (uv - 0.5) * scale + 0.5;
  }

  float easeOutCubic(float t) { return 1.0 - pow(1.0 - t, 3.0); }

  /** Scene space: origin at the vehicle's contact patch, 1.0 = viewport height. */
  vec2 sceneSpace(vec2 uv) {
    return vec2((uv.x - 0.5) * (uResolution.x / uResolution.y), uv.y - GROUND);
  }

  float sdRoundBox(vec2 p, vec2 b, float r) {
    vec2 d = abs(p) - b + r;
    return min(max(d.x, d.y), 0.0) + length(max(d, 0.0)) - r;
  }

  float smin(float a, float b, float k) {
    float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
    return mix(b, a, h) - k * h * (1.0 - h);
  }

  /**
   * Body of the vehicle as a signed distance, built from rounded boxes so it
   * has a roofline, a cabin and squared ends rather than reading as a mound.
   */
  float sdBody(vec2 s, float kind) {
    if (kind < 0.5) {
      // Motorcycle: short, tall, tank and seat over a compact mass.
      float mass = sdRoundBox(s - vec2(0.00, 0.245), vec2(0.130, 0.090), 0.075);
      float tank = sdRoundBox(s - vec2(-0.040, 0.320), vec2(0.100, 0.050), 0.045);
      float tail = sdRoundBox(s - vec2(0.145, 0.305), vec2(0.100, 0.028), 0.026);
      return smin(smin(mass, tank, 0.05), tail, 0.05);
    }
    if (kind < 1.5) {
      // Car: long and low, cabin set back, tapering nose.
      float lower = sdRoundBox(s - vec2(0.00, 0.155), vec2(0.520, 0.085), 0.065);
      float cabin = sdRoundBox(s - vec2(0.060, 0.268), vec2(0.200, 0.072), 0.085);
      return smin(lower, cabin, 0.075);
    }
    // Truck: taller and squarer, cab forward, rack standing over the bed.
    float body = sdRoundBox(s - vec2(0.00, 0.235), vec2(0.520, 0.130), 0.045);
    float cab = sdRoundBox(s - vec2(-0.090, 0.395), vec2(0.245, 0.105), 0.050);
    float rack = sdRoundBox(s - vec2(0.250, 0.430), vec2(0.230, 0.045), 0.020);
    return smin(smin(body, cab, 0.05), rack, 0.04);
  }

  /** Wheel centres and radius for a profile. */
  vec3 wheelSpec(float kind) {
    if (kind < 0.5) return vec3(0.240, 0.105, 0.105);
    if (kind < 1.5) return vec3(0.345, 0.090, 0.090);
    return vec3(0.355, 0.125, 0.125);
  }

  float sdWheels(vec2 s, float kind) {
    vec3 spec = wheelSpec(kind);
    float a = length(s - vec2(-spec.x, spec.y)) - spec.z;
    float b = length(s - vec2(spec.x, spec.y)) - spec.z;
    return min(a, b);
  }

  /** The whole silhouette the cover is cut to. */
  float sdVehicle(vec2 s, float kind) {
    return smin(sdBody(s, kind), sdWheels(s, kind), 0.03);
  }

  /**
   * The cover: the vehicle's own silhouette, inflated so the fabric stands off
   * the body, drawn off from the nose backwards and gathering into a ridge at
   * the edge that is still being pulled.
   * Returns x = cloth coverage, y = the lit fold along its edge.
   */
  vec2 coverMask(vec2 s, float t, float kind) {
    float e = easeOutCubic(clamp(t, 0.0, 1.0));
    // Travels from ahead of the nose to past the tail.
    float pull = -0.75 + e * 1.75;

    // Fabric stands off the body, and bunches where it is gripped.
    float gather = exp(-pow((s.x - pull) / 0.17, 2.0));
    float slack = 0.030 + gather * 0.060;

    float d = sdVehicle(s, kind) - slack;
    float draped = smoothstep(0.004, -0.004, d);
    // A long, soft release so the fabric peels rather than cutting off.
    float remaining = smoothstep(pull - 0.07, pull + 0.13, s.x);
    // Cloth reaches the floor rather than stopping at the body.
    float skirt = smoothstep(-0.02, 0.01, s.y);

    float cloth = draped * remaining * skirt;
    float rim = (1.0 - smoothstep(0.0, 0.016, abs(d))) * remaining * skirt;
    rim = max(rim, gather * remaining * draped * 0.55);
    return vec2(clamp(cloth, 0.0, 1.0), clamp(rim, 0.0, 1.0));
  }

  /** Heavy cloth: shading follows the form it is lying on. */
  vec3 coverColour(vec2 s, float t, float kind) {
    float d = sdVehicle(s, kind);
    float drape = clamp(-d * 5.0, 0.0, 1.0);

    vec3 base = mix(vec3(0.048, 0.046, 0.044), vec3(0.155, 0.150, 0.142), drape);
    // Creases run over the form, low contrast, never full-height bands.
    float creases = sin(s.x * 34.0 + s.y * 12.0 + t * 1.5) * 0.5 + 0.5;
    base += (creases - 0.5) * 0.026;
    // Light from above catches the crown.
    base += smoothstep(0.18, 0.42, s.y) * 0.055;
    return base;
  }

  /**
   * Stand-in vehicle, drawn only until a render exists for this part. A lit
   * form under a spotlight, not a portrait — enough that the cover has
   * something to come off.
   */
  vec3 standIn(vec2 s, float kind, vec3 accent) {
    vec3 col = vec3(0.018, 0.018, 0.022);

    // Pool of light on the floor beneath the vehicle.
    float pool = exp(-pow(s.x / 0.75, 2.0)) * exp(-pow(s.y / 0.16, 2.0));
    col += vec3(0.085, 0.085, 0.095) * pool * step(s.y, 0.0);

    float dBody = sdBody(s, kind);
    float dWheel = sdWheels(s, kind);

    // Reflection, compressed and fading with distance from the contact patch.
    if (s.y < 0.0) {
      float dMirror = sdVehicle(vec2(s.x, -s.y * 2.6), kind);
      col += accent * smoothstep(0.01, -0.02, dMirror) * 0.12
           * smoothstep(-0.22, 0.0, s.y);
    }

    // Paint: darker low on the flank, specular along the crown.
    float body = smoothstep(0.004, -0.004, dBody);
    float height = clamp(s.y / 0.45, 0.0, 1.0);
    vec3 paint = mix(accent * 0.10, accent * 0.62, height);
    paint += pow(height, 5.0) * 0.5;
    col = mix(col, paint, body);

    // Tyres, then a hint of rim inside them.
    float wheel = smoothstep(0.004, -0.004, dWheel);
    col = mix(col, vec3(0.028, 0.027, 0.030), wheel);
    vec3 spec = wheelSpec(kind);
    float hubL = length(s - vec2(-spec.x, spec.y));
    float hubR = length(s - vec2(spec.x, spec.y));
    float hub = smoothstep(spec.z * 0.55, spec.z * 0.5, min(hubL, hubR));
    col += hub * 0.16;

    // Rim light separating the silhouette from the dark.
    float edge = 1.0 - smoothstep(0.0, 0.010, abs(sdVehicle(s, kind)));
    col += edge * (0.35 + 0.35 * smoothstep(0.1, 0.45, s.y));

    return col;
  }

  /**
   * Holds the frame back where the overlay sits, so the headline, body copy and
   * spec table keep contrast over a bright floor or a blown-out sky.
   */
  vec3 applyScrim(vec3 colour, float strength) {
    float lower = 1.0 - smoothstep(0.0, 0.80, vUv.y);
    float upper = smoothstep(0.86, 1.0, vUv.y);
    float mask = max(lower * 0.95, upper * 0.34) * clamp(strength, 0.0, 1.0);
    return mix(colour, colour * 0.11, mask);
  }

  vec3 sampleVehicle(
    sampler2D tex, vec2 size, float cover, vec3 accent,
    float scrim, float kind, float standInAmount
  ) {
    vec3 colour;
    if (standInAmount > 0.5) {
      colour = standIn(sceneSpace(vUv), kind, accent);
    } else {
      vec2 uv = coverUv(vUv, size);
      colour = texture2D(tex, clamp(uv, 0.0, 1.0)).rgb;
    }

    vec2 s = sceneSpace(vUv);
    vec2 mask = coverMask(s, cover, kind);
    colour = mix(colour, coverColour(s, cover, kind), mask.x);
    colour += mask.y * (0.10 + 0.16 * (1.0 - cover)) * mix(vec3(1.0), accent, 0.30);

    return applyScrim(colour, scrim);
  }

  void main() {
    vec3 a = sampleVehicle(uTexA, uSizeA, uCoverA, uAccentA, uScrimA, uKindA, uStandInA);
    vec3 b = sampleVehicle(uTexB, uSizeB, uCoverB, uAccentB, uScrimB, uKindB, uStandInB);
    vec3 colour = mix(a, b, clamp(uBlend, 0.0, 1.0));
    gl_FragColor = vec4(colour, 1.0);
  }
`;

/** Vignette, lift and animated grain, applied after bloom. */
const GRADE_SHADER = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uTime: { value: 0 },
    uVignette: { value: 1.0 },
    uGrain: { value: 0.045 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    precision highp float;
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uVignette;
    uniform float uGrain;
    varying vec2 vUv;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }

    void main() {
      vec3 colour = texture2D(tDiffuse, vUv).rgb;

      vec2 centred = vUv - 0.5;
      float falloff = 1.0 - dot(centred, centred) * 1.45 * uVignette;
      colour *= clamp(falloff, 0.0, 1.0);

      colour += (hash(vUv * 1024.0 + uTime) - 0.5) * uGrain;

      gl_FragColor = vec4(colour, 1.0);
    }
  `,
};

const BLACK = new THREE.Color("#050506");

export class RevealStage {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private material: THREE.ShaderMaterial;
  private composer: EffectComposer;
  private gradePass: ShaderPass;
  private bloomPass: UnrealBloomPass | null = null;
  private caps: Capabilities;
  private disposed = false;

  constructor(canvas: HTMLCanvasElement, caps: Capabilities) {
    this.caps = caps;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
      powerPreference: caps.tier === "full" ? "high-performance" : "default",
    });
    this.renderer.setClearColor(BLACK, 1);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.06;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    const blank = new THREE.Texture();
    this.material = new THREE.ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uTexA: { value: blank },
        uTexB: { value: blank },
        uSizeA: { value: new THREE.Vector2(16, 9) },
        uSizeB: { value: new THREE.Vector2(16, 9) },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uBlend: { value: 0 },
        uCoverA: { value: 0 },
        uCoverB: { value: 0 },
        uAccentA: { value: new THREE.Color("#ffffff") },
        uAccentB: { value: new THREE.Color("#ffffff") },
        uScrimA: { value: 0 },
        uScrimB: { value: 0 },
        uKindA: { value: 1 },
        uKindB: { value: 1 },
        uStandInA: { value: 1 },
        uStandInB: { value: 1 },
        uTime: { value: 0 },
      },
    });

    this.scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material));

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));

    if (caps.postProcessing) {
      // Restrained: only true speculars on chrome and paint should bloom.
      this.bloomPass = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.34, 0.62, 0.84);
      this.composer.addPass(this.bloomPass);
    }

    this.gradePass = new ShaderPass(GRADE_SHADER);
    this.gradePass.uniforms.uGrain.value = caps.postProcessing ? 0.045 : 0;
    this.composer.addPass(this.gradePass);

    this.resize();
  }

  setTextures(
    slot: "A" | "B",
    texture: THREE.Texture | null,
    size: { width: number; height: number },
    accent: string,
    silhouette: SilhouetteKind,
    /** True until a render exists for this part; draws the stand-in form. */
    standIn: boolean,
  ) {
    const u = this.material.uniforms;
    if (texture) u[`uTex${slot}`].value = texture;
    (u[`uSize${slot}`].value as THREE.Vector2).set(size.width, size.height);
    (u[`uAccent${slot}`].value as THREE.Color).set(accent);
    u[`uKind${slot}`].value = SILHOUETTE_KIND[silhouette];
    u[`uStandIn${slot}`].value = standIn ? 1 : 0;
  }

  setState(
    covers: { a: number; b: number },
    scrims: { a: number; b: number },
    blend: number,
    time: number,
  ) {
    const u = this.material.uniforms;
    u.uCoverA.value = covers.a;
    u.uCoverB.value = covers.b;
    u.uScrimA.value = scrims.a;
    u.uScrimB.value = scrims.b;
    u.uBlend.value = blend;
    u.uTime.value = time;
    this.gradePass.uniforms.uTime.value = time;
  }

  resize() {
    if (this.disposed) return;
    const width = window.innerWidth;
    const height = window.innerHeight;
    const ratio = Math.min(window.devicePixelRatio || 1, this.caps.maxPixelRatio);

    this.renderer.setPixelRatio(ratio);
    this.renderer.setSize(width, height, false);
    this.composer.setPixelRatio(ratio);
    this.composer.setSize(width, height);
    this.bloomPass?.setSize(width, height);
    (this.material.uniforms.uResolution.value as THREE.Vector2).set(width, height);
  }

  render() {
    if (this.disposed) return;
    this.composer.render();
  }

  dispose() {
    this.disposed = true;
    this.composer.dispose();
    this.material.dispose();
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) obj.geometry.dispose();
    });
    this.renderer.dispose();
  }
}
