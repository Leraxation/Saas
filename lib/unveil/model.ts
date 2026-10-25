import * as THREE from "three";
import { CAR, type CarParts } from "./car";

/**
 * Optional production car model.
 *
 * Set this to a glTF/GLB path (for example "/unveil/car.glb") and the scene
 * replaces the procedural Vespera with it once loaded. The procedural car is
 * always built first so the page never shows an empty stage.
 *
 * The file is NOT in this repository. See app/unveil/README.md for where to
 * source one, the licence to check, and how to prepare it.
 */
export const CAR_MODEL_URL: string | null = null;

/**
 * How the loaded scene graph is carved into parts the exploded view can move.
 * Matched case-insensitively against node names; the first pattern that
 * matches wins. Anything unmatched stays with the body.
 */
export const MODEL_MANIFEST = {
  wheels: /wheel|tire|tyre|rim/i,
  skateboard: /chassis|floor|underbody|battery|platform/i,
  canopy: /glass|window|windshield|canopy/i,
  /** Nodes whose material should act as a lamp, with the emissive to use. */
  headlamp: /headlight|headlamp|drl/i,
  taillamp: /taillight|taillamp|brake_light|rear_light/i,
  /** Length of the real car in metres; the model is scaled to CAR.length. */
  fitLength: CAR.length,
  /** Which axis of the file runs nose-to-tail, after any rotation below. */
  rotationY: 0,
};

export async function loadCarModel(url: string): Promise<CarParts> {
  // Loaders are imported on demand: they are dead weight until a model is
  // configured, and DRACOLoader resolves its decoder path with import.meta.url
  // at module scope, which the single-file build cannot provide.
  const [{ GLTFLoader }, { DRACOLoader }] = await Promise.all([
    import("three/examples/jsm/loaders/GLTFLoader.js"),
    import("three/examples/jsm/loaders/DRACOLoader.js"),
  ]);
  const loader = new GLTFLoader();
  const draco = new DRACOLoader();
  draco.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.7/");
  loader.setDRACOLoader(draco);
  const gltf = await loader.loadAsync(url);
  const src = gltf.scene;
  src.rotation.y = MODEL_MANIFEST.rotationY;
  src.updateMatrixWorld(true);

  // Fit: scale to the Vespera's length and put the lowest point on the floor.
  const box = new THREE.Box3().setFromObject(src);
  const size = box.getSize(new THREE.Vector3());
  const scale = MODEL_MANIFEST.fitLength / Math.max(size.z, 1e-6);
  src.scale.setScalar(scale);
  src.updateMatrixWorld(true);
  box.setFromObject(src);
  const center = box.getCenter(new THREE.Vector3());
  src.position.set(-center.x, -box.min.y, -center.z);
  src.updateMatrixWorld(true);

  const root = new THREE.Group();
  const body = new THREE.Group();
  const skateboard = new THREE.Group();
  const wheels: THREE.Group[] = [];
  const wheelRest: THREE.Vector3[] = [];
  const envMaterials: Array<THREE.MeshStandardMaterial> = [];
  const headlamp = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, emissive: 0xdff4ff, emissiveIntensity: 0 });
  const taillamp = new THREE.MeshStandardMaterial({ color: 0x1a0404, emissive: 0xff2a1a, emissiveIntensity: 0 });
  const cells = new THREE.MeshStandardMaterial({ color: 0x101214, emissive: 0x3fb9c9, emissiveIntensity: 0 });
  let canopy: THREE.Mesh | null = null;

  // Reparent by name while preserving world transforms.
  const meshes: THREE.Mesh[] = [];
  src.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh);
  });
  for (const m of meshes) {
    m.castShadow = true;
    m.receiveShadow = true;
    const name = `${m.name} ${m.parent?.name ?? ""}`;
    const mats = Array.isArray(m.material) ? m.material : [m.material];
    for (const mat of mats) {
      const sm = mat as THREE.MeshStandardMaterial;
      if (sm.isMeshStandardMaterial) {
        sm.userData.envScale = sm.envMapIntensity || 1;
        envMaterials.push(sm);
      }
    }
    if (MODEL_MANIFEST.headlamp.test(name)) m.material = headlamp;
    else if (MODEL_MANIFEST.taillamp.test(name)) m.material = taillamp;

    const world = new THREE.Matrix4().copy(m.matrixWorld);
    const place = (parent: THREE.Object3D) => {
      parent.attach(m);
      m.matrixWorld.copy(world);
      m.matrix.copy(world).premultiply(parent.matrixWorld.clone().invert());
      m.matrix.decompose(m.position, m.quaternion, m.scale);
    };

    if (MODEL_MANIFEST.wheels.test(name)) {
      // Group wheels by quadrant so a wheel split across several meshes
      // (tyre, rim, brake) still moves as one.
      const c = new THREE.Box3().setFromObject(m).getCenter(new THREE.Vector3());
      const sx = c.x < 0 ? -1 : 1;
      const sz = c.z < 0 ? -1 : 1;
      let g = wheels.find((w) => Math.sign(w.userData.sx) === sx && Math.sign(w.userData.sz) === sz);
      if (!g) {
        g = new THREE.Group();
        g.userData = { sx, sz };
        g.position.set(sx * CAR.wheelX, CAR.wheelRadius, sz * CAR.wheelZ);
        root.add(g);
        g.updateMatrixWorld(true);
        wheels.push(g);
      }
      place(g);
    } else if (MODEL_MANIFEST.skateboard.test(name)) {
      place(skateboard);
    } else {
      if (MODEL_MANIFEST.canopy.test(name) && !canopy) canopy = m;
      place(body);
    }
  }
  root.add(body, skateboard);
  for (const w of wheels) wheelRest.push(w.position.clone());
  // Order wheels FL, FR, RL, RR for the anchors.
  wheels.sort((a, b) => b.userData.sz - a.userData.sz || a.userData.sx - b.userData.sx);

  if (!canopy) {
    canopy = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ visible: false }));
    body.add(canopy);
  }
  const battery = new THREE.Mesh(new THREE.BufferGeometry(), cells);
  battery.position.y = 0.27;
  skateboard.add(battery);

  const anchors: Record<string, THREE.Object3D> = {};
  const anchor = (n: string, parent: THREE.Object3D, x: number, y: number, z: number) => {
    const o = new THREE.Object3D();
    o.position.set(x, y, z);
    parent.add(o);
    anchors[n] = o;
  };
  const dims = { length: CAR.length, width: size.x * scale, height: size.y * scale };
  anchor("shell", body, -dims.width * 0.35, dims.height * 0.7, dims.length * 0.2);
  anchor("canopy", body, dims.width * 0.25, dims.height * 0.98, 0);
  anchor("battery", skateboard, dims.width * 0.3, 0.3, -0.4);
  anchor("wheel", wheels[1] ?? body, 0, 0.3, 0);
  anchor("splitter", body, 0.6, 0.22, dims.length / 2 - 0.5);
  anchor("tail", body, 0, dims.height * 0.65, -dims.length / 2 + 0.16);

  return {
    root,
    body,
    canopy,
    skateboard,
    battery,
    wheels,
    wheelRest,
    headlamp,
    taillamp,
    cells,
    anchors,
    envMaterials,
    dims,
  };
}
