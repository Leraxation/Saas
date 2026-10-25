import * as THREE from "three";
import { clamp, profile, smoothstep, spow } from "./curves";

/**
 * The Vespera — a procedural grand tourer.
 *
 * Nothing here is loaded from disk. The body is a lofted superellipse whose
 * width, height and roundness are keyframed along the length of the car, the
 * glass canopy is a second loft, the wheel wells are carved out of the loft
 * analytically. It is a design-studio clay model, not a photoreal production
 * car, and that is a deliberate ceiling: for a real vehicle drop a glTF in
 * `public/unveil/car.glb` and point `CAR_MODEL_URL` at it (see README).
 *
 * Coordinates: metres, Y up, the nose points toward +Z, floor at y = 0.
 */

export type CarParts = {
  root: THREE.Group;
  /** Upper body: shell, canopy, lamps, aero. Lifts during the exploded view. */
  body: THREE.Group;
  /** The canopy, nested in `body`, separates a little further than the shell. */
  canopy: THREE.Mesh;
  /** The EV skateboard: floor pan + battery. Drops during the exploded view. */
  skateboard: THREE.Group;
  battery: THREE.Mesh;
  /** Front-left, front-right, rear-left, rear-right. */
  wheels: THREE.Group[];
  /** Rest positions of each wheel, so the exploded offsets are additive. */
  wheelRest: THREE.Vector3[];
  headlamp: THREE.MeshStandardMaterial;
  taillamp: THREE.MeshStandardMaterial;
  /** Battery cell seams, lit during the exploded view. */
  cells: THREE.MeshStandardMaterial;
  /** Named points the UI anchors callouts to. */
  anchors: Record<string, THREE.Object3D>;
  /** Every material whose envMapIntensity the scene drives. */
  envMaterials: Array<THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial>;
  dims: { length: number; width: number; height: number };
};

export const CAR = {
  length: 4.7,
  width: 1.96,
  wheelRadius: 0.37,
  wheelWidth: 0.28,
  wheelX: 0.8,
  wheelZ: 1.5,
  archRadius: 0.46,
} as const;

/* ── Materials ─────────────────────────────────────────────────────────── */

export function makeMaterials() {
  const paint = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#0d3340"),
    metalness: 0.58,
    roughness: 0.3,
    clearcoat: 1,
    clearcoatRoughness: 0.035,
    envMapIntensity: 1.1,
  });
  const glass = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#07111a"),
    metalness: 0.2,
    roughness: 0.05,
    clearcoat: 1,
    clearcoatRoughness: 0.02,
    transparent: true,
    opacity: 0.92,
    envMapIntensity: 0.8,
  });
  const carbon = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#0a0a0c"),
    metalness: 0.45,
    roughness: 0.5,
    envMapIntensity: 0.6,
  });
  const rim = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#cfcac1"),
    metalness: 1,
    roughness: 0.22,
    envMapIntensity: 1.2,
  });
  const tire = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#131314"),
    roughness: 0.94,
    metalness: 0,
    envMapIntensity: 0.3,
  });
  const brake = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#2a2a2c"),
    metalness: 0.9,
    roughness: 0.35,
  });
  const caliper = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#c98a3a"),
    metalness: 0.4,
    roughness: 0.4,
  });
  const headlamp = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#0a0a0a"),
    emissive: new THREE.Color("#dff4ff"),
    emissiveIntensity: 0,
    roughness: 0.3,
  });
  const taillamp = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#1a0404"),
    emissive: new THREE.Color("#ff2a1a"),
    emissiveIntensity: 0,
    roughness: 0.4,
  });
  const cell = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#101214"),
    emissive: new THREE.Color("#3fb9c9"),
    emissiveIntensity: 0.0,
    metalness: 0.6,
    roughness: 0.4,
  });
  const all = { paint, glass, carbon, rim, tire, brake, caliper, headlamp, taillamp, cell };
  // The scene scales envMapIntensity globally; remember each material's own
  // level so the scale is relative, not absolute.
  for (const m of Object.values(all)) m.userData.envScale = m.envMapIntensity;
  return all;
}

export type CarMaterials = ReturnType<typeof makeMaterials>;

/* ── Loft ───────────────────────────────────────────────────────────────── */

type Section = (t: number) => {
  halfW: number;
  yBottom: number;
  yTop: number;
  /** Superellipse exponent: 2 = ellipse, higher = squarer. */
  n: number;
};

type LoftOpts = {
  zFrom: number;
  zTo: number;
  section: Section;
  uSegs: number;
  vSegs: number;
  /** Fraction of the length over which each end rounds off to a point. */
  endRear: number;
  endFront: number;
  /** Rounding exponent: 2 is circular, 3 holds width then turns in (blunt), 1.5 tapers. */
  endPower?: number;
  /** Optional per-vertex sculpt applied after the section is evaluated. */
  sculpt?: (p: THREE.Vector3, t: number, theta: number) => void;
};

/** Evaluate a loft surface at (t along the length, theta around the section). */
function loftEvaluator(o: Omit<LoftOpts, "uSegs" | "vSegs">) {
  // Ends round off as a superellipse (exponent 3) rather than a circle: the
  // section holds its width almost to the tip, then turns in sharply, which
  // reads as a blunt nose and tail instead of a bullet.
  const k = o.endPower ?? 3;
  const endFactor = (t: number) => {
    let q = 0;
    if (t < o.endRear) q = (o.endRear - t) / o.endRear;
    else if (t > 1 - o.endFront) q = (t - (1 - o.endFront)) / o.endFront;
    return Math.pow(Math.max(0, 1 - Math.pow(q, k)), 1 / k);
  };
  return (t: number, theta: number, out: THREE.Vector3) => {
    const z = o.zFrom + (o.zTo - o.zFrom) * t;
    const s = o.section(t);
    const f = endFactor(t);
    const a = s.halfW * f;
    const yc = (s.yTop + s.yBottom) / 2;
    const b = ((s.yTop - s.yBottom) / 2) * (0.25 + 0.75 * f);
    const e = 2 / s.n;
    out.set(a * spow(Math.cos(theta), e), yc + b * spow(Math.sin(theta), e), z);
    o.sculpt?.(out, t, theta);
    return out;
  };
}

/** Surface point and outward normal of a loft, by finite differences. */
function surfaceFrame(
  ev: ReturnType<typeof loftEvaluator>,
  t: number,
  theta: number,
): { p: THREE.Vector3; n: THREE.Vector3 } {
  const p = ev(t, theta, new THREE.Vector3());
  const pt = ev(t + 0.002, theta, new THREE.Vector3()).sub(p);
  const pth = ev(t, theta + 0.01, new THREE.Vector3()).sub(p);
  const n = new THREE.Vector3().crossVectors(pth, pt).normalize();
  return { p, n };
}

function loft(o: LoftOpts): THREE.BufferGeometry {
  const { uSegs, vSegs } = o;
  const ev = loftEvaluator(o);
  const verts = (uSegs + 1) * (vSegs + 1);
  const pos = new Float32Array(verts * 3);
  const uv = new Float32Array(verts * 2);
  const idx: number[] = [];
  const p = new THREE.Vector3();

  for (let i = 0; i <= uSegs; i++) {
    const t = i / uSegs;
    for (let j = 0; j <= vSegs; j++) {
      const theta = (j / vSegs) * Math.PI * 2;
      ev(t, theta, p);
      const k = i * (vSegs + 1) + j;
      pos[k * 3] = p.x;
      pos[k * 3 + 1] = p.y;
      pos[k * 3 + 2] = p.z;
      uv[k * 2] = t;
      uv[k * 2 + 1] = j / vSegs;
    }
  }
  // Winding: theta runs counter-clockwise seen from the nose, t runs toward
  // the nose, so (a, a+1, b) faces outward.
  for (let i = 0; i < uSegs; i++) {
    for (let j = 0; j < vSegs; j++) {
      const a = i * (vSegs + 1) + j;
      const b = a + vSegs + 1;
      idx.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/* ── Body ───────────────────────────────────────────────────────────────── */

const L = CAR.length;
const ZR = -L / 2;
const ZF = L / 2;

// Silhouette keyframes, t runs 0 (tail) → 1 (nose).
const bodyHalfW = profile([
  [0, 0.78],
  [0.05, 0.92],
  [0.3, 0.98],
  [0.62, 0.97],
  [0.88, 0.9],
  [1, 0.74],
]);
const bodyTop = profile([
  [0, 0.82],
  [0.07, 0.96],
  [0.3, 0.93],
  [0.55, 0.9],
  [0.72, 0.84],
  [0.9, 0.73],
  [1, 0.6],
]);
const bodyBottom = profile([
  [0, 0.34],
  [0.08, 0.2],
  [0.5, 0.18],
  [0.9, 0.2],
  [1, 0.33],
]);
const bodyN = profile([
  [0, 2.4],
  [0.1, 3.4],
  [0.5, 3.6],
  [0.85, 3.2],
  [1, 2.2],
]);

const canopyHalfW = profile([
  [0, 0.5],
  [0.3, 0.84],
  [0.6, 0.88],
  [1, 0.62],
]);
const canopyTop = profile([
  [0, 0.92],
  [0.22, 1.14],
  [0.42, 1.23],
  [0.6, 1.21],
  [0.8, 1.08],
  [1, 0.88],
]);

/** Carve the wheel wells out of the lower flanks of the body loft. */
function carveArches(p: THREE.Vector3) {
  const ax = Math.abs(p.x);
  const side = smoothstep(CAR.wheelX - 0.38, CAR.wheelX - 0.1, ax);
  if (side <= 0) return;
  for (const zw of [-CAR.wheelZ, CAR.wheelZ]) {
    const dz = p.z - zw;
    const r = CAR.archRadius;
    if (Math.abs(dz) >= r) continue;
    const archY = CAR.wheelRadius + Math.sqrt(r * r - dz * dz);
    if (p.y < archY) p.y += (archY - p.y) * side;
  }
}

const BODY_LOFT: Omit<LoftOpts, "uSegs" | "vSegs"> = {
  zFrom: ZR,
  zTo: ZF,
  endRear: 0.07,
  endFront: 0.1,
  section: (t) => ({
    halfW: bodyHalfW(t),
    yBottom: bodyBottom(t),
    yTop: bodyTop(t),
    n: bodyN(t),
  }),
  sculpt: (p, t) => {
    // Shoulder line: a soft crease just under the belt, deepest mid-body.
    const belt = Math.exp(-Math.pow((p.y - 0.62) / 0.09, 2));
    const mid = Math.sin(Math.PI * clamp((t - 0.05) / 0.9, 0, 1));
    p.x *= 1 - 0.035 * belt * mid;
    carveArches(p);
  },
};

const bodySurface = loftEvaluator(BODY_LOFT);

function buildBody(m: CarMaterials) {
  const geo = loft({ ...BODY_LOFT, uSegs: 220, vSegs: 112 });
  const shell = new THREE.Mesh(geo, m.paint);
  shell.castShadow = true;
  shell.receiveShadow = true;
  shell.name = "shell";
  return shell;
}

function buildCanopy(m: CarMaterials) {
  const z0 = ZR + L * 0.17;
  const z1 = ZR + L * 0.74;
  const geo = loft({
    zFrom: z0,
    zTo: z1,
    uSegs: 90,
    vSegs: 64,
    endRear: 0.22,
    endFront: 0.28,
    endPower: 1.6,
    section: (t) => ({
      halfW: canopyHalfW(t),
      yBottom: 0.72,
      yTop: canopyTop(t),
      n: 2.4,
    }),
  });
  const canopy = new THREE.Mesh(geo, m.glass);
  canopy.castShadow = true;
  canopy.name = "canopy";
  return canopy;
}

function buildWheel(m: CarMaterials, side: 1 | -1) {
  const g = new THREE.Group();
  const R = CAR.wheelRadius;
  const W = CAR.wheelWidth;

  // Tire: a torus gives a rounded shoulder for free.
  const tube = 0.1;
  const tire = new THREE.Mesh(new THREE.TorusGeometry(R - tube, tube, 24, 72), m.tire);
  tire.rotation.y = Math.PI / 2;
  tire.scale.set(1, 1, W / (tube * 2));
  tire.castShadow = true;
  g.add(tire);

  const tread = new THREE.Mesh(new THREE.CylinderGeometry(R - 0.004, R - 0.004, W * 0.72, 72, 1, true), m.tire);
  tread.rotation.z = Math.PI / 2;
  g.add(tread);

  // Rim: a shallow dish with spokes.
  const rimR = R - tube - 0.005;
  const dish = new THREE.Mesh(new THREE.CylinderGeometry(rimR, rimR * 0.9, W * 0.5, 48, 1, true), m.rim);
  dish.rotation.z = Math.PI / 2;
  dish.position.x = side * W * 0.1;
  g.add(dish);

  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, W * 0.6, 24), m.rim);
  hub.rotation.z = Math.PI / 2;
  hub.position.x = side * W * 0.12;
  g.add(hub);

  const spokes = 7;
  for (let i = 0; i < spokes; i++) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.03, rimR * 1.9, 0.055), m.rim);
    s.rotation.x = (i / spokes) * Math.PI * 2;
    s.position.x = side * W * 0.22;
    s.castShadow = true;
    g.add(s);
  }

  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.02, 48), m.brake);
  disc.rotation.z = Math.PI / 2;
  g.add(disc);

  const cal = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.14, 0.1), m.caliper);
  cal.position.set(0, 0.11, side * 0.0 + 0.1);
  g.add(cal);

  g.position.y = R;
  return g;
}

function box(w: number, h: number, d: number, mat: THREE.Material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/* ── Assembly ───────────────────────────────────────────────────────────── */

export function buildCar(mats: CarMaterials = makeMaterials()): CarParts {
  const root = new THREE.Group();
  root.name = "vespera";

  const body = new THREE.Group();
  body.name = "body";
  const shell = buildBody(mats);
  const canopy = buildCanopy(mats);
  body.add(shell, canopy);

  // Lamps are thin lenses laid flush on the loft surface: two slim eyes high
  // on the nose, a light bar across its tip, a blade across the tail.
  // Emissive intensity is driven by the scene.
  const lens = (w: number, h: number, mat: THREE.Material, t: number, theta: number) => {
    const { p, n } = surfaceFrame(bodySurface, t, theta);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.02), mat);
    mesh.position.copy(p).addScaledVector(n, 0.006);
    mesh.lookAt(p.clone().add(n));
    body.add(mesh);
    return mesh;
  };
  lens(0.26, 0.018, mats.headlamp, 0.982, Math.PI / 2 - 0.8);
  lens(0.26, 0.018, mats.headlamp, 0.982, Math.PI / 2 + 0.8);
  lens(0.6, 0.014, mats.headlamp, 0.994, Math.PI / 2);
  lens(1.2, 0.03, mats.taillamp, 0.018, Math.PI / 2);

  // Intake: a dark slot low in the nose so the front reads as a face, not a loaf.
  const intake = box(1.0, 0.11, 0.16, mats.carbon);
  intake.position.set(0, 0.37, ZF - 0.1);
  body.add(intake);

  // Aero: splitter and diffuser as dark blades just proud of the body.
  const splitter = box(1.42, 0.03, 0.42, mats.carbon);
  splitter.position.set(0, 0.2, ZF - 0.32);
  body.add(splitter);
  const diffuser = box(1.3, 0.1, 0.42, mats.carbon);
  diffuser.position.set(0, 0.25, ZR + 0.3);
  body.add(diffuser);

  // Skateboard: floor pan and battery pack.
  const skateboard = new THREE.Group();
  skateboard.name = "skateboard";
  const pan = box(1.5, 0.05, 3.9, mats.carbon);
  pan.position.set(0, 0.21, 0.05);
  skateboard.add(pan);
  const battery = box(1.46, 0.13, 2.4, mats.cell);
  battery.position.set(0, 0.27, 0.05);
  battery.name = "battery";
  skateboard.add(battery);
  // Cell seams: thin raised ribs read as modules in the exploded view.
  for (let i = -3; i <= 3; i++) {
    const rib = box(1.42, 0.012, 0.02, mats.rim);
    rib.position.set(0, 0.34, 0.05 + i * 0.33);
    skateboard.add(rib);
  }

  const wheels: THREE.Group[] = [];
  const wheelRest: THREE.Vector3[] = [];
  const corners: Array<[number, number]> = [
    [-CAR.wheelX, CAR.wheelZ],
    [CAR.wheelX, CAR.wheelZ],
    [-CAR.wheelX, -CAR.wheelZ],
    [CAR.wheelX, -CAR.wheelZ],
  ];
  corners.forEach(([x, z], i) => {
    const side: 1 | -1 = x < 0 ? -1 : 1;
    const w = buildWheel(mats, side);
    w.position.set(x, CAR.wheelRadius, z);
    w.name = ["wheel-fl", "wheel-fr", "wheel-rl", "wheel-rr"][i];
    wheels.push(w);
    wheelRest.push(w.position.clone());
  });

  root.add(body, skateboard, ...wheels);

  const anchors: Record<string, THREE.Object3D> = {};
  const anchor = (name: string, parent: THREE.Object3D, x: number, y: number, z: number) => {
    const o = new THREE.Object3D();
    o.position.set(x, y, z);
    o.name = `anchor-${name}`;
    parent.add(o);
    anchors[name] = o;
  };
  anchor("shell", body, -0.95, 0.72, 0.9);
  anchor("canopy", canopy, 0.5, 1.18, 0.2);
  anchor("battery", skateboard, 0.4, 0.3, -1.8);
  anchor("wheel", wheels[0], 0, 0.3, 0);
  anchor("splitter", body, 0.6, 0.22, ZF - 0.5);
  anchor("tail", body, 0, 0.9, ZR + 0.16);

  return {
    root,
    body,
    canopy,
    skateboard,
    battery,
    wheels,
    wheelRest,
    headlamp: mats.headlamp,
    taillamp: mats.taillamp,
    cells: mats.cell,
    anchors,
    envMaterials: [mats.paint, mats.glass, mats.carbon, mats.rim, mats.tire, mats.cell],
    dims: { length: CAR.length, width: CAR.width, height: 1.3 },
  };
}
