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
  uniform vec2 uGridA;
  uniform vec2 uGridB;
  uniform float uFrameA;
  uniform float uFrameB;
  uniform vec2 uResolution;
  uniform float uBlend;
  uniform float uScrimA;
  uniform float uScrimB;
  uniform float uTime;

  varying vec2 vUv;

  /** Crops one frame to fill the viewport, preserving its aspect. */
  vec2 coverUv(vec2 uv, vec2 frameSize) {
    float viewAspect = uResolution.x / uResolution.y;
    float texAspect = frameSize.x / max(frameSize.y, 1.0);
    vec2 scale = viewAspect > texAspect
      ? vec2(1.0, texAspect / viewAspect)
      : vec2(viewAspect / texAspect, 1.0);
    return (uv - 0.5) * scale + 0.5;
  }

  /**
   * Places a coordinate inside one frame onto its tile in the sheet. Frames run
   * left to right, top to bottom. The inset keeps linear filtering from pulling
   * a neighbouring tile in along the seams, which would smear one moment of the
   * orbit into the next.
   */
  vec2 atlasUv(vec2 uv, vec2 grid, float index) {
    float i = clamp(index, 0.0, grid.x * grid.y - 1.0);
    float col = mod(i, grid.x);
    float row = floor(i / grid.x);
    vec2 cell = clamp(uv, 0.0015, 0.9985);
    return vec2(col + cell.x, row + (1.0 - cell.y)) / grid;
  }

  /**
   * One vehicle at one point in its reveal. Consecutive frames are mixed by the
   * fractional part of the position, so the orbit reads as continuous motion
   * rather than stepping from one frame to the next.
   */
  vec3 sampleVehicle(sampler2D tex, vec2 size, vec2 grid, float pos) {
    vec2 uv = coverUv(vUv, size);
    float lo = floor(pos);
    vec3 a = texture2D(tex, atlasUv(uv, grid, lo)).rgb;
    vec3 b = texture2D(tex, atlasUv(uv, grid, lo + 1.0)).rgb;
    return mix(a, b, pos - lo);
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

  void main() {
    vec3 a = applyScrim(sampleVehicle(uTexA, uSizeA, uGridA, uFrameA), uScrimA);
    vec3 b = applyScrim(sampleVehicle(uTexB, uSizeB, uGridB, uFrameB), uScrimB);
    gl_FragColor = vec4(mix(a, b, clamp(uBlend, 0.0, 1.0)), 1.0);
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
        uGridA: { value: new THREE.Vector2(1, 1) },
        uGridB: { value: new THREE.Vector2(1, 1) },
        uFrameA: { value: 0 },
        uFrameB: { value: 0 },
        uBlend: { value: 0 },
        uScrimA: { value: 0 },
        uScrimB: { value: 0 },
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

  /** The widest texture this GPU accepts, which caps the frame sheet. */
  get maxTextureSize(): number {
    return this.renderer.capabilities.maxTextureSize;
  }

  /** Points a slot at one vehicle's sheet, and at the frame within it. */
  setTextures(
    slot: "A" | "B",
    texture: THREE.Texture | null,
    size: { width: number; height: number },
    grid: { cols: number; rows: number },
  ) {
    const u = this.material.uniforms;
    if (texture) u[`uTex${slot}`].value = texture;
    (u[`uSize${slot}`].value as THREE.Vector2).set(size.width, size.height);
    (u[`uGrid${slot}`].value as THREE.Vector2).set(grid.cols, grid.rows);
  }

  setState(
    frames: { a: number; b: number },
    scrims: { a: number; b: number },
    blend: number,
    time: number,
  ) {
    const u = this.material.uniforms;
    u.uFrameA.value = frames.a;
    u.uFrameB.value = frames.b;
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
