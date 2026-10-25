import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { buildCar, type CarParts } from "./car";
import { buildCover, type Cover } from "./cover";
import { CAR_MODEL_URL, loadCarModel } from "./model";

/**
 * One scene, one set of numbers.
 *
 * Everything that moves — fabric, camera, lamps, exposure, the exploded view —
 * reads from `params`. The scroll timeline (see timeline.ts) tweens those
 * numbers; this class never decides *when* anything happens, only *how* a
 * given set of numbers looks. That split is what makes the whole sequence
 * scrub forwards and backwards from a single scalar.
 */

export type SceneParams = {
  /** Cover: 0 draped → 1 fully pulled back. */
  pull: number;
  /** Cover lifted clear of the stage, 0..1. */
  lift: number;
  /** Cover opacity. */
  coverAlpha: number;
  /** Exploded view, 0 assembled → 1 apart. */
  explode: number;
  /** Lamps, as emissive multipliers. */
  headlamp: number;
  taillamp: number;
  cells: number;
  /** Lights. */
  top: number;
  key: number;
  rim: number;
  fill: number;
  ring: number;
  env: number;
  exposure: number;
  /** Camera rig, cylindrical about the look target. */
  ang: number;
  rad: number;
  h: number;
  tx: number;
  ty: number;
  tz: number;
  fov: number;
  /** Key light warmth, 0 = cold cyan rim-heavy, 1 = warm studio. */
  warmth: number;
  /** Car motion on the stage: metres rolled forward (wheels turn to match). */
  roll: number;
  /** Turntable yaw of the whole car, radians. */
  yaw: number;
  /** Front-wheel steering angle, radians. */
  steer: number;
};

export const INITIAL_PARAMS: SceneParams = {
  pull: 0,
  lift: 0,
  coverAlpha: 1,
  explode: 0,
  headlamp: 0,
  taillamp: 0,
  cells: 0,
  top: 1.0,
  key: 0.05,
  rim: 0.02,
  fill: 0.06,
  ring: 0,
  env: 0.12,
  exposure: 0.72,
  ang: 0.12,
  rad: 7.6,
  h: 2.3,
  tx: 0,
  ty: 0.55,
  tz: 0.1,
  fov: 34,
  warmth: 0.6,
  roll: 0,
  yaw: 0,
  steer: 0,
};

export type Anchor = { x: number; y: number; visible: boolean; depth: number };

export type SceneOptions = {
  reducedMotion?: boolean;
  /** Max device pixel ratio to render at. */
  maxDpr?: number;
};

export class UnveilScene {
  readonly params: SceneParams = { ...INITIAL_PARAMS };
  readonly canvas: HTMLCanvasElement;
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  car: CarParts;
  cover: Cover;
  private top: THREE.SpotLight;
  private key: THREE.DirectionalLight;
  private rim: THREE.SpotLight;
  private fill: THREE.HemisphereLight;
  private ring: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  private floorMat: THREE.MeshStandardMaterial;
  private readonly reduced: boolean;
  private time = 0;
  private running = false;
  private raf = 0;
  private last = 0;
  private width = 1;
  private height = 1;
  private disposed = false;
  private readonly tmp = new THREE.Vector3();
  private readonly warm = new THREE.Color("#ffe9cf");
  private readonly cold = new THREE.Color("#bcd7ff");
  readonly ready: Promise<void>;
  onFrame?: (scene: UnveilScene) => void;

  constructor(canvas: HTMLCanvasElement, opts: SceneOptions = {}) {
    this.canvas = canvas;
    this.reduced = !!opts.reducedMotion;
    const maxDpr = opts.maxDpr ?? 1.75;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = this.params.exposure;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer = renderer;

    this.scene.background = new THREE.Color("#07070a");
    this.scene.fog = new THREE.FogExp2(0x07070a, 0.052);

    // Studio environment, procedurally lit. An HDRI of a real studio drops in
    // here (see README) and everything with envMapIntensity picks it up.
    const pmrem = new THREE.PMREMGenerator(renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    this.camera = new THREE.PerspectiveCamera(34, 1, 0.1, 80);

    // Lights.
    this.top = new THREE.SpotLight(0xfff3e2, 45, 18, 0.36, 0.75, 1.5);
    this.top.position.set(0.3, 7.5, 0.6);
    this.top.castShadow = true;
    this.top.shadow.mapSize.set(1024, 1024);
    this.top.shadow.bias = -0.0005;
    this.top.shadow.radius = 4;
    this.scene.add(this.top, this.top.target);

    this.key = new THREE.DirectionalLight(0xfff0dc, 0);
    this.key.position.set(5.5, 6, 6.5);
    this.key.castShadow = true;
    this.key.shadow.mapSize.set(2048, 2048);
    const sc = this.key.shadow.camera;
    sc.left = -6; sc.right = 6; sc.top = 6; sc.bottom = -6; sc.near = 1; sc.far = 30;
    this.key.shadow.bias = -0.0006;
    this.key.shadow.normalBias = 0.02;
    this.key.shadow.radius = 3;
    this.scene.add(this.key, this.key.target);

    // Rim: a cold spot from behind, not a directional, so it edges the car
    // without washing the whole floor.
    this.rim = new THREE.SpotLight(0x8fd3ff, 0, 30, 0.24, 0.55, 1.2);
    this.rim.position.set(-7, 4.6, -8);
    this.rim.target.position.set(0, 0.9, 0);
    this.scene.add(this.rim, this.rim.target);

    this.fill = new THREE.HemisphereLight(0x2b3442, 0x050505, 0.1);
    this.scene.add(this.fill);

    // Floor: a vast dark disc with a faint ring pattern baked into a canvas
    // texture, so the camera always has something to measure depth against.
    this.floorMat = new THREE.MeshStandardMaterial({
      color: 0x0a0a0d,
      roughness: 0.5,
      metalness: 0.15,
      envMapIntensity: 0.2,
      map: makeFloorTexture(),
    });
    const floor = new THREE.Mesh(new THREE.CircleGeometry(40, 96), this.floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // A light ring inlaid in the floor around the car. Emissive only; the
    // glow it throws on the car is sold by the key and fill lights waking up.
    this.ring = new THREE.Mesh(
      new THREE.RingGeometry(4.15, 4.24, 128),
      new THREE.MeshBasicMaterial({ color: 0xffd9a8, transparent: true, opacity: 0, toneMapped: false }),
    );
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.position.y = 0.004;
    this.scene.add(this.ring);

    // Car and cover. The procedural car is built synchronously and kept as
    // the fallback; when a glTF is configured the stage waits for it (the
    // canvas fades in on `ready`) so the viewer never sees a swap.
    this.car = buildCar();
    this.cover = buildCover(this.car.root);
    if (!CAR_MODEL_URL) {
      this.scene.add(this.car.root, this.cover.mesh);
    }

    this.ready = this.maybeLoadModel();

    this.apply();
  }

  private async maybeLoadModel() {
    if (!CAR_MODEL_URL) return;
    try {
      const loaded = await loadCarModel(CAR_MODEL_URL);
      if (this.disposed) return;
      this.cover.dispose();
      this.car = loaded;
      this.cover = buildCover(this.car.root);
      this.scene.add(this.car.root, this.cover.mesh);
      this.apply();
    } catch (err) {
      console.warn("[unveil] car model failed to load, showing the procedural car:", err);
      if (this.disposed) return;
      this.scene.add(this.car.root, this.cover.mesh);
    }
  }

  /** Resize to the canvas's CSS box. */
  resize(width: number, height: number) {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    this.renderer.setSize(this.width, this.height, false);
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.render();
  }

  start() {
    if (this.running || this.disposed) return;
    this.running = true;
    this.last = performance.now();
    const loop = (now: number) => {
      if (!this.running) return;
      const dt = Math.min(0.05, (now - this.last) / 1000);
      this.last = now;
      // Reduced motion: the fabric still moves with the scroll, it just stops
      // fluttering on its own.
      this.time += this.reduced ? dt * 0.15 : dt;
      this.apply();
      this.render();
      this.onFrame?.(this);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  /** Push `params` into the scene graph. Cheap; called every frame. */
  apply() {
    const p = this.params;
    const car = this.car;

    this.cover.set({ pull: p.pull, lift: p.lift, alpha: p.coverAlpha, time: this.time });

    // Exploded view. Offsets are additive on rest positions so this is
    // idempotent and reversible.
    const e = p.explode;
    car.body.position.y = 0.62 * e;
    car.canopy.position.y = 0.3 * e;
    car.skateboard.position.y = -0.3 * e;
    car.battery.position.y = 0.27 - 0.2 * e;
    // Stage motion: the car rolls and turns as one; wheels turn by the
    // distance rolled, and the front pair steer.
    const wheelR = car.wheelRest[0]?.y ?? 0.36;
    car.root.rotation.y = p.yaw;
    car.root.position.z = p.roll;
    this.ring.position.z = p.roll;
    car.wheels.forEach((w, i) => {
      const rest = car.wheelRest[i];
      const side = rest.x < 0 ? -1 : 1;
      w.position.set(rest.x + side * 1.05 * e, rest.y + 0.08 * e, rest.z);
      w.rotation.order = "YXZ";
      w.rotation.y = i < 2 ? p.steer : 0;
      w.rotation.x = p.roll / wheelR + e * 1.6;
    });

    car.headlamp.emissiveIntensity = p.headlamp;
    car.taillamp.emissiveIntensity = p.taillamp;
    car.cells.emissiveIntensity = p.cells;

    this.top.intensity = p.top * 45;
    this.key.intensity = p.key * 1.7;
    this.rim.intensity = p.rim * 70;
    this.fill.intensity = p.fill * 0.7;
    this.key.color.copy(this.cold).lerp(this.warm, p.warmth);
    this.ring.material.opacity = p.ring * 0.95;
    for (const m of car.envMaterials) m.envMapIntensity = p.env * m.userData.envScale;
    this.cover.material.envMapIntensity = p.env * 0.6;
    this.floorMat.envMapIntensity = p.env * 0.2;
    this.renderer.toneMappingExposure = p.exposure;

    // Camera rig.
    const sway = this.reduced ? 0 : 1;
    const t = this.time;
    const ang = p.ang + sway * Math.sin(t * 0.21) * 0.012;
    const h = p.h + sway * Math.sin(t * 0.33 + 1) * 0.03;
    // The rig is framed for landscape; a portrait phone backs off so the car
    // still fits the narrow frame.
    const aspect = this.camera.aspect;
    const rad = p.rad * (aspect < 1.25 ? Math.pow(1.25 / aspect, 0.8) : 1);
    const tz = p.tz + p.roll;
    this.camera.position.set(p.tx + Math.sin(ang) * rad, h, tz + Math.cos(ang) * rad);
    this.camera.lookAt(p.tx, p.ty, tz);
    if (this.camera.fov !== p.fov) {
      this.camera.fov = p.fov;
      this.camera.updateProjectionMatrix();
    }
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  /** Screen-space position of a named car anchor, in CSS pixels. */
  project(name: string): Anchor | null {
    const o = this.car.anchors[name];
    if (!o) return null;
    o.getWorldPosition(this.tmp);
    const depth = this.tmp.distanceTo(this.camera.position);
    this.tmp.project(this.camera);
    const visible = this.tmp.z < 1 && Math.abs(this.tmp.x) < 1.2 && Math.abs(this.tmp.y) < 1.2;
    return {
      x: (this.tmp.x * 0.5 + 0.5) * this.width,
      y: (-this.tmp.y * 0.5 + 0.5) * this.height,
      visible,
      depth,
    };
  }

  dispose() {
    this.disposed = true;
    this.stop();
    this.cover.dispose();
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.geometry?.dispose();
        const mat = m.material as THREE.Material | THREE.Material[];
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else mat?.dispose();
      }
    });
    this.scene.environment?.dispose();
    this.renderer.dispose();
  }
}

function makeFloorTexture(): THREE.CanvasTexture {
  const size = 1024;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "#141418");
  g.addColorStop(0.35, "#0e0e12");
  g.addColorStop(1, "#070709");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = "rgba(255,255,255,0.045)";
  ctx.lineWidth = 1;
  for (let r = 40; r < size / 2; r += 40) {
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}
