import * as THREE from "three";
import { drapeHeightField, heightFieldTexture, rasterizeHeightField, type Extent, type HeightField } from "./heightfield";

/**
 * The cover.
 *
 * What this is: a procedural drape. The fabric's resting shape is a height
 * field relaxed over the car (see heightfield.ts), and the pull is a closed-
 * form vertex displacement evaluated on the GPU: a hem sweeps from nose to
 * tail; everything behind the hem is still draped, everything ahead of it
 * folds back over the car, rises into an arc and flutters. Normals are
 * rebuilt per vertex from finite differences of the same function, so the
 * fabric is lit correctly however far through the pull it is, and because
 * every frame is a pure function of (pull, lift, time) the motion is exactly
 * reversible when the user scrolls back.
 *
 * What this is NOT: a cloth simulation. Nothing collides, nothing has mass,
 * the fabric never catches on a mirror. For that you bake a simulation (Houdini
 * Vellum, Blender cloth, Marvelous Designer) to an alembic or a glTF with
 * morph targets / per-frame geometry and scrub the bake. The README lists the
 * hand-off. This module is the honest stand-in for that bake.
 */

export type CoverParams = {
  pull: number;
  lift: number;
  alpha: number;
  time: number;
};

export type Cover = {
  mesh: THREE.Mesh;
  material: THREE.MeshPhysicalMaterial;
  field: HeightField;
  set(p: CoverParams): void;
  dispose(): void;
};

export const COVER_EXTENT: Extent = { xMin: -1.8, zMin: -3.25, xSize: 3.6, zSize: 6.5 };

const DRAPE_GLSL = /* glsl */ `
uniform sampler2D uHeight;
uniform vec2 uGrid;
uniform vec4 uExtent;   // xMin, zMin, xSize, zSize
uniform float uPull;
uniform float uLift;
uniform float uTime;
uniform float uEps;
uniform float uHem;
varying float vHem;

// Bilinear lookup on a NEAREST-filtered float texture: no reliance on
// float-linear filtering extensions. R = rest height, G = hem distance.
vec2 field(vec2 xz) {
  vec2 g = (xz - uExtent.xy) / uExtent.zw * uGrid - 0.5;
  vec2 g0 = floor(g);
  vec2 f = g - g0;
  vec2 inv = 1.0 / uGrid;
  vec2 c = (g0 + 0.5) * inv;
  vec2 h00 = texture2D(uHeight, c).rg;
  vec2 h10 = texture2D(uHeight, c + vec2(inv.x, 0.0)).rg;
  vec2 h01 = texture2D(uHeight, c + vec2(0.0, inv.y)).rg;
  vec2 h11 = texture2D(uHeight, c + inv).rg;
  return mix(mix(h00, h10, f.x), mix(h01, h11, f.x), f.y);
}
float restH(vec2 xz) { return field(xz).r; }

// Signed distance past the hem: positive fragments are cut away. The hem
// wanders a little so the edge reads as a cut sheet, not a rectangle.
float hemCut(vec2 xz) {
  float wander = 0.05 * sin(xz.x * 9.0 + xz.y * 3.0) + 0.03 * sin(xz.y * 13.0);
  return field(xz).g - (uHem + wander);
}

vec3 drape(vec2 xz) {
  float x = xz.x;
  float z = xz.y;
  float t = uTime;
  float front = uExtent.y + uExtent.w;
  float span = uExtent.w + 1.6;
  float sweep = front + 0.4 - uPull * span;
  float d = z - sweep;
  float live = smoothstep(0.0, 0.04, uPull) * (1.0 - smoothstep(0.97, 1.0, uPull));
  // Tension at the hem: a lift and a travelling ripple just before the fabric lets go.
  float hem = exp(-abs(d) * 2.2) * live;
  float tension = hem * (0.05 + 0.02 * sin(x * 6.0 + t * 3.0));

  if (d <= 0.0) {
    float y = restH(xz) + tension;
    y += hem * 0.012 * sin(z * 10.0 - t * 4.0 + x * 2.0);
    return vec3(x, y, z);
  }

  float gather = 1.0 - exp(-d * 0.55);
  float xf = x * (1.0 - 0.3 * gather);
  float zf = sweep - d * 0.7;
  float base = restH(vec2(xf, zf));
  float arc = 1.1 * gather + 0.14 * d;
  float ramp = smoothstep(0.0, 0.35, d);
  float flap = (0.03 + 0.06 * gather) * sin(d * 3.5 - t * 4.5 + x * 2.0)
             + 0.025 * gather * sin(x * 7.0 + d * 2.0 + t * 2.5);
  float y = base + tension + arc + (flap + 0.06) * ramp;
  y += uLift * (2.4 + 0.5 * sin(x * 2.5 + 1.0));
  zf -= uLift * 2.0;
  return vec3(xf, y, zf);
}
`;

const NORMAL_CHUNK = /* glsl */ `
vec3 dP0 = drape(position.xz);
vec3 dPx = drape(position.xz + vec2(uEps, 0.0));
vec3 dPz = drape(position.xz + vec2(0.0, uEps));
vec3 objectNormal = normalize(cross(dPz - dP0, dPx - dP0));
#ifdef USE_TANGENT
vec3 objectTangent = vec3(tangent.xyz);
#endif
`;

const VERTEX_CHUNK = /* glsl */ `
vec3 transformed = drape(position.xz);
vHem = hemCut(position.xz);
`;

const FRAG_DECL = /* glsl */ `
varying float vHem;
`;
const FRAG_CUT = /* glsl */ `
void main() {
  if (vHem > 0.0) discard;
`;

export function buildCover(car: THREE.Object3D, opts: { fieldNx?: number; fieldNz?: number } = {}): Cover {
  const nx = opts.fieldNx ?? 144;
  const nz = opts.fieldNz ?? 256;

  const raw = rasterizeHeightField(car, COVER_EXTENT, nx, nz, 0);
  const field = drapeHeightField(raw, { gap: 0.035, slope: 2.4, floor: 0.02, blurPasses: 3, foldAmp: 0.013 });
  const tex = heightFieldTexture(field);

  const uniforms = {
    uHeight: { value: tex },
    uGrid: { value: new THREE.Vector2(nx, nz) },
    uExtent: { value: new THREE.Vector4(COVER_EXTENT.xMin, COVER_EXTENT.zMin, COVER_EXTENT.xSize, COVER_EXTENT.zSize) },
    uPull: { value: 0 },
    uLift: { value: 0 },
    uTime: { value: 0 },
    uEps: { value: 0.02 },
    uHem: { value: 0.22 },
    uAlpha: { value: 1 },
  };

  const patchVertex = (shader: { vertexShader: string; uniforms: Record<string, THREE.IUniform> }) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>\n${DRAPE_GLSL}`)
      .replace("#include <beginnormal_vertex>", NORMAL_CHUNK)
      .replace("#include <begin_vertex>", VERTEX_CHUNK);
  };

  const material = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#2a090f"),
    roughness: 0.86,
    metalness: 0,
    sheen: 1,
    sheenRoughness: 0.7,
    sheenColor: new THREE.Color("#b8705f"),
    side: THREE.DoubleSide,
    transparent: true,
    envMapIntensity: 0.6,
  });
  material.onBeforeCompile = (shader) => {
    patchVertex(shader);
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\nuniform float uAlpha;${FRAG_DECL}`)
      .replace("void main() {", FRAG_CUT)
      .replace("#include <dithering_fragment>", "#include <dithering_fragment>\ngl_FragColor.a *= uAlpha;");
  };
  material.customProgramCacheKey = () => "unveil-cover";

  const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, side: THREE.DoubleSide });
  depth.onBeforeCompile = (shader) => {
    patchVertex(shader);
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>${FRAG_DECL}`)
      .replace("void main() {", FRAG_CUT);
  };
  depth.customProgramCacheKey = () => "unveil-cover-depth";

  const geo = new THREE.PlaneGeometry(COVER_EXTENT.xSize, COVER_EXTENT.zSize, 132, 236);
  geo.rotateX(-Math.PI / 2);
  // Translate so the plane's XZ matches the extent exactly.
  geo.translate(COVER_EXTENT.xMin + COVER_EXTENT.xSize / 2, 0, COVER_EXTENT.zMin + COVER_EXTENT.zSize / 2);
  // The displaced mesh leaves its rest bounds; never let it be culled.
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 1, -1), 12);

  const mesh = new THREE.Mesh(geo, material);
  mesh.customDepthMaterial = depth;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  mesh.renderOrder = 2;
  mesh.name = "cover";

  return {
    mesh,
    material,
    field,
    set(p) {
      uniforms.uPull.value = p.pull;
      uniforms.uLift.value = p.lift;
      uniforms.uTime.value = p.time;
      uniforms.uAlpha.value = p.alpha;
      mesh.visible = p.alpha > 0.002;
      mesh.castShadow = p.alpha > 0.5;
    },
    dispose() {
      geo.dispose();
      material.dispose();
      depth.dispose();
      tex.dispose();
    },
  };
}
