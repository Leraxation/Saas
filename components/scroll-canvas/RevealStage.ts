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
  uniform vec2 uResolution;
  uniform float uBlend;
  uniform float uCoverA;
  uniform float uCoverB;
  uniform vec3 uAccentA;
  uniform vec3 uAccentB;
  uniform float uScrimA;
  uniform float uScrimB;
  uniform float uTime;

  varying vec2 vUv;

  const float PI = 3.141592653589793;

  /** Crops a texture to fill the viewport, preserving its aspect. */
  vec2 coverUv(vec2 uv, vec2 texSize) {
    float viewAspect = uResolution.x / uResolution.y;
    float texAspect = texSize.x / max(texSize.y, 1.0);
    vec2 scale = viewAspect > texAspect
      ? vec2(1.0, texAspect / viewAspect)
      : vec2(viewAspect / texAspect, 1.0);
    return (uv - 0.5) * scale + 0.5;
  }

  float easeOutCubic(float t) {
    return 1.0 - pow(1.0 - t, 3.0);
  }

  /**
   * The cover: an opaque sheet whose lower edge sweeps up and off the vehicle.
   * Returns x = how much of this pixel is cloth, y = proximity to the lit edge.
   */
  vec2 clothMask(vec2 uv, float t) {
    float e = easeOutCubic(clamp(t, 0.0, 1.0));
    float edge = -0.12 + e * 1.44;
    float amp = 0.03 * (1.0 - e) + 0.009;
    float wave = sin(e * PI * 2.0 + uv.x * PI * 2.4) * amp;
    float y = edge + wave;
    float cloth = smoothstep(y - 0.004, y + 0.004, uv.y);
    float rim = 1.0 - smoothstep(0.0, 0.016, abs(uv.y - y));
    return vec2(cloth, rim);
  }

  /** Folded fabric: vertical bands plus the shape pressing up underneath. */
  vec3 clothColour(vec2 uv, float t) {
    float e = easeOutCubic(clamp(t, 0.0, 1.0));
    vec3 base = mix(vec3(0.031, 0.031, 0.043), vec3(0.118, 0.118, 0.145), uv.y * 0.8 + 0.1);
    float folds = sin(uv.x * PI * 14.0 + e * PI * 2.0) * 0.5 + 0.5;
    base += (folds - 0.5) * 0.055;
    float bulge = 1.0 - smoothstep(0.0, 0.62, distance(uv, vec2(0.5, 0.42)));
    base += bulge * 0.06;
    return base;
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

  vec3 sampleVehicle(sampler2D tex, vec2 size, float cover, vec3 accent, float scrim) {
    vec2 uv = coverUv(vUv, size);
    vec3 colour = texture2D(tex, clamp(uv, 0.0, 1.0)).rgb;

    vec2 mask = clothMask(vUv, cover);
    vec3 cloth = clothColour(vUv, cover);
    colour = mix(colour, cloth, mask.x);
    // Edge catches light, tinted toward the vehicle's accent as it lifts.
    colour += mask.y * (0.16 + 0.22 * (1.0 - cover)) * mix(vec3(1.0), accent, 0.35);
    return applyScrim(colour, scrim);
  }

  void main() {
    vec3 a = sampleVehicle(uTexA, uSizeA, uCoverA, uAccentA, uScrimA);
    vec3 b = sampleVehicle(uTexB, uSizeB, uCoverB, uAccentB, uScrimB);
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
  ) {
    const u = this.material.uniforms;
    if (texture) u[`uTex${slot}`].value = texture;
    (u[`uSize${slot}`].value as THREE.Vector2).set(size.width, size.height);
    (u[`uAccent${slot}`].value as THREE.Color).set(accent);
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
