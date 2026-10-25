import * as THREE from "three";
import { CAR, type CarParts } from "./car";

/**
 * The production car model.
 *
 * `public/unveil/car.glb` is a Ferrari 458 Italia: the model by vicent091036
 * (Sketchfab) that ships with the three.js examples, decoded from Draco and
 * recompressed with meshopt (13 MB → 2.2 MB). The meshopt decoder is bundled
 * with three, so nothing is fetched from a third-party CDN at runtime. The
 * path is relative so the same file serves the Next route, the single-file
 * build and the published preview.
 *
 * Set this to null to fall back to the procedural Vespera in car.ts.
 */
export const CAR_MODEL_URL: string | null = "unveil/car.glb";

/**
 * How the loaded scene graph is carved into the parts the sequence moves.
 * Patterns match case-insensitively against "<mesh name> <parent name>".
 */
export const MODEL_MANIFEST = {
  /** A mesh whose parent (or own name) matches is a wheel; grouped by quadrant. */
  wheels: /\bwheel_(fl|fr|rl|rr)\b|\b(tire|tyre|rim_\w+)\b/i,
  /** Nodes that drop with the floor pan in the exploded view. */
  skateboard: /chassis|underbody|battery|platform/i,
  /** The glasshouse lifts a little further than the body. */
  canopy: /^glass\b/i,
  /** Material names that become lamps, driven by the timeline. */
  headlampMaterial: /projector|headlight|headlamp/i,
  taillampMaterial: /taillight|tail_light|brake_light/i,
  /** The file's nose points down −Z; the stage wants +Z. */
  rotationY: Math.PI,
  /** Real length of the car in metres (the file is already at scale). */
  fitLength: 4.527,
};

function makeMaterials() {
  const paint = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#c81414"),
    metalness: 0.5,
    roughness: 0.28,
    clearcoat: 1,
    clearcoatRoughness: 0.03,
    envMapIntensity: 1.1,
  });
  const glass = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#0b1116"),
    metalness: 0.2,
    roughness: 0.05,
    clearcoat: 1,
    transparent: true,
    opacity: 0.82,
    envMapIntensity: 0.9,
    // The file's glass normals face inward; draw both sides so the
    // windscreen and roof glass read from outside.
    side: THREE.DoubleSide,
  });
  const headlamp = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, emissive: 0xdff4ff, emissiveIntensity: 0 });
  const taillamp = new THREE.MeshStandardMaterial({ color: 0x2a0606, emissive: 0xff2a1a, emissiveIntensity: 0 });
  const cells = new THREE.MeshStandardMaterial({ color: 0x101214, emissive: 0x3fb9c9, emissiveIntensity: 0, metalness: 0.6, roughness: 0.4 });
  const carbon = new THREE.MeshStandardMaterial({ color: 0x0a0a0c, metalness: 0.45, roughness: 0.5, envMapIntensity: 0.6 });
  for (const m of [paint, glass, headlamp, taillamp, cells, carbon]) m.userData.envScale = m.envMapIntensity;
  return { paint, glass, headlamp, taillamp, cells, carbon };
}

/** Tune the file's own PBR materials so they sit in the studio's light. */
function dressMaterial(m: THREE.MeshStandardMaterial) {
  const n = m.name.toLowerCase();
  if (n.includes("chrome")) {
    m.metalness = 1;
    m.roughness = 0.12;
    m.envMapIntensity = 1.4;
  } else if (n.includes("metal")) {
    m.color.set("#cfcac1");
    m.metalness = 0.9;
    m.roughness = 0.32;
    m.envMapIntensity = 1.2;
  } else if (n.includes("tire")) {
    m.roughness = 0.92;
    m.metalness = 0;
    m.envMapIntensity = 0.3;
  } else if (n.includes("carbon")) {
    m.roughness = 0.35;
    m.metalness = 0.5;
    m.envMapIntensity = 0.9;
  } else if (n.includes("yellow")) {
    m.color.set("#f2c21b");
    m.roughness = 0.4;
  } else if (!m.envMapIntensity) {
    m.envMapIntensity = 1;
  }
  m.userData.envScale = m.envMapIntensity || 1;
}

export async function loadCarModel(url: string): Promise<CarParts> {
  // Loaders are imported on demand: dead weight until a model is configured.
  const [{ GLTFLoader }, { MeshoptDecoder }] = await Promise.all([
    import("three/examples/jsm/loaders/GLTFLoader.js"),
    import("three/examples/jsm/libs/meshopt_decoder.module.js"),
  ]);
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  const gltf = await loader.loadAsync(url);
  const src = gltf.scene;
  src.rotation.y = MODEL_MANIFEST.rotationY;
  src.updateMatrixWorld(true);

  // Fit: scale to the real length and put the lowest point on the floor.
  const box = new THREE.Box3().setFromObject(src);
  const size = box.getSize(new THREE.Vector3());
  const scale = MODEL_MANIFEST.fitLength / Math.max(size.z, 1e-6);
  src.scale.setScalar(scale);
  src.updateMatrixWorld(true);
  box.setFromObject(src);
  const center = box.getCenter(new THREE.Vector3());
  src.position.set(-center.x, -box.min.y, -center.z);
  src.updateMatrixWorld(true);
  const dims = { length: size.z * scale, width: size.x * scale, height: size.y * scale };

  const own = makeMaterials();
  const root = new THREE.Group();
  root.name = "ferrari-458";
  const body = new THREE.Group();
  body.name = "body";
  const skateboard = new THREE.Group();
  skateboard.name = "skateboard";
  const envMaterials: THREE.MeshStandardMaterial[] = [own.paint, own.glass, own.carbon];
  let canopy: THREE.Mesh | null = null;

  // Classify every mesh first; wheels are gathered per quadrant so a wheel
  // split into tyre, rim, disc and nuts still turns as one about its hub.
  const meshes: THREE.Mesh[] = [];
  src.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh);
  });
  const quadrants = new Map<string, { sx: number; sz: number; meshes: THREE.Mesh[]; box: THREE.Box3 }>();
  const bodyMeshes: THREE.Mesh[] = [];
  const panMeshes: THREE.Mesh[] = [];
  const seen = new Set<THREE.Material>();

  for (const m of meshes) {
    m.castShadow = true;
    m.receiveShadow = true;
    const name = `${m.name} ${m.parent?.name ?? ""}`;

    // Materials: swap paint, glass and lamps for the studio's own; dress the rest.
    const mats = Array.isArray(m.material) ? m.material : [m.material];
    const next = mats.map((mat) => {
      const sm = mat as THREE.MeshStandardMaterial;
      const mn = sm.name ?? "";
      if (/body_color|^body$|paint/i.test(mn)) return own.paint;
      if (/glass_gray|^glass$|window/i.test(mn) && !/tail|projector/i.test(mn)) return own.glass;
      if (MODEL_MANIFEST.headlampMaterial.test(mn)) return own.headlamp;
      if (MODEL_MANIFEST.taillampMaterial.test(mn)) return own.taillamp;
      if (sm.isMeshStandardMaterial && !seen.has(sm)) {
        seen.add(sm);
        dressMaterial(sm);
        envMaterials.push(sm);
      }
      return sm;
    });
    m.material = Array.isArray(m.material) ? next : next[0];

    if (MODEL_MANIFEST.wheels.test(name)) {
      const b = new THREE.Box3().setFromObject(m);
      const c = b.getCenter(new THREE.Vector3());
      const key = `${c.x < 0 ? "l" : "r"}${c.z < 0 ? "r" : "f"}`;
      let q = quadrants.get(key);
      if (!q) {
        q = { sx: c.x < 0 ? -1 : 1, sz: c.z < 0 ? -1 : 1, meshes: [], box: new THREE.Box3() };
        quadrants.set(key, q);
      }
      q.meshes.push(m);
      q.box.union(b);
    } else if (MODEL_MANIFEST.skateboard.test(name)) {
      panMeshes.push(m);
    } else {
      if (!canopy && MODEL_MANIFEST.canopy.test(name)) canopy = m;
      bodyMeshes.push(m);
    }
  }

  // Reparent, preserving world transforms. attach() keeps each mesh where it
  // is while the new parent takes over.
  for (const m of bodyMeshes) body.attach(m);
  for (const m of panMeshes) skateboard.attach(m);

  const wheels: THREE.Group[] = [];
  for (const q of quadrants.values()) {
    const g = new THREE.Group();
    const c = q.box.getCenter(new THREE.Vector3());
    g.position.copy(c);
    g.userData = { sx: q.sx, sz: q.sz };
    g.name = `wheel-${q.sz > 0 ? "f" : "r"}${q.sx < 0 ? "l" : "r"}`;
    root.add(g);
    g.updateMatrixWorld(true);
    for (const m of q.meshes) g.attach(m);
    wheels.push(g);
  }
  // FL, FR, RL, RR.
  wheels.sort((a, b) => b.userData.sz - a.userData.sz || a.userData.sx - b.userData.sx);
  const wheelRest = wheels.map((w) => w.position.clone());

  // A flat floor pan the exploded view can drop, since the file has no
  // separate chassis. It hides inside the underbody at rest.
  const pan = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.04, dims.length * 0.78), own.carbon);
  pan.position.set(0, 0.2, 0.05);
  pan.castShadow = true;
  skateboard.add(pan);
  const battery = new THREE.Mesh(new THREE.BufferGeometry(), own.cells);
  battery.position.y = 0.27;
  skateboard.add(battery);

  root.add(body, skateboard);

  if (!canopy) {
    canopy = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ visible: false }));
    body.add(canopy);
  }

  const anchors: Record<string, THREE.Object3D> = {};
  const anchor = (n: string, parent: THREE.Object3D, x: number, y: number, z: number) => {
    const o = new THREE.Object3D();
    o.position.set(x, y, z);
    parent.add(o);
    anchors[n] = o;
  };
  const hw = dims.width / 2;
  anchor("shell", body, -hw * 0.98, dims.height * 0.58, 0.55);
  anchor("canopy", body, hw * 0.45, dims.height * 0.98, -0.1);
  anchor("battery", skateboard, hw * 0.4, 0.2, -dims.length * 0.36);
  anchor("wheel", wheels[0] ?? body, 0, 0.26, 0);
  anchor("splitter", body, 0.6, 0.22, dims.length / 2 - 0.5);
  anchor("tail", body, 0, dims.height * 0.7, -dims.length / 2 + 0.16);

  return {
    root,
    body,
    canopy,
    skateboard,
    battery,
    wheels,
    wheelRest,
    headlamp: own.headlamp,
    taillamp: own.taillamp,
    cells: own.cells,
    anchors,
    envMaterials,
    dims: { ...dims, length: dims.length || CAR.length },
  };
}
