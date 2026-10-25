import * as THREE from "three";

/**
 * A top-down height field of whatever sits under the cover.
 *
 * The cover does not know what a car is. It is handed a grid of "how high is
 * the thing below me at (x, z)" and drapes over that. Rasterising the car's
 * triangles into the grid on the CPU is what lets the same cover fall over the
 * procedural model and over any glTF the user drops in: no raycasts, no
 * special cases, and it runs in a few milliseconds even for a 200k-triangle
 * production model.
 */

export type Extent = { xMin: number; zMin: number; xSize: number; zSize: number };

export type HeightField = {
  nx: number;
  nz: number;
  extent: Extent;
  /** Row-major, z-major: data[iz * nx + ix]. */
  data: Float32Array;
  /**
   * Distance in metres from each cell to the nearest cell where the fabric
   * is off the floor. Zero under the drape; grows outward across the floor.
   * The cover uses it to cut its hem a hand's width past where it lands.
   */
  edge?: Float32Array;
};

export function rasterizeHeightField(root: THREE.Object3D, extent: Extent, nx: number, nz: number, floor = 0): HeightField {
  const data = new Float32Array(nx * nz).fill(floor);
  root.updateWorldMatrix(true, true);

  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const sx = nx / extent.xSize;
  const sz = nz / extent.zSize;

  const raster = (p0: THREE.Vector3, p1: THREE.Vector3, p2: THREE.Vector3) => {
    // Project to grid space.
    const x0 = (p0.x - extent.xMin) * sx, z0 = (p0.z - extent.zMin) * sz;
    const x1 = (p1.x - extent.xMin) * sx, z1 = (p1.z - extent.zMin) * sz;
    const x2 = (p2.x - extent.xMin) * sx, z2 = (p2.z - extent.zMin) * sz;
    const minX = Math.max(0, Math.floor(Math.min(x0, x1, x2)));
    const maxX = Math.min(nx - 1, Math.ceil(Math.max(x0, x1, x2)));
    const minZ = Math.max(0, Math.floor(Math.min(z0, z1, z2)));
    const maxZ = Math.min(nz - 1, Math.ceil(Math.max(z0, z1, z2)));
    if (minX > maxX || minZ > maxZ) return;
    const det = (x1 - x0) * (z2 - z0) - (x2 - x0) * (z1 - z0);
    if (Math.abs(det) < 1e-9) return;
    const inv = 1 / det;
    for (let iz = minZ; iz <= maxZ; iz++) {
      const pz = iz + 0.5;
      for (let ix = minX; ix <= maxX; ix++) {
        const px = ix + 0.5;
        const w1 = ((px - x0) * (z2 - z0) - (x2 - x0) * (pz - z0)) * inv;
        const w2 = ((x1 - x0) * (pz - z0) - (px - x0) * (z1 - z0)) * inv;
        const w0 = 1 - w1 - w2;
        // A touch of slack so thin slivers between cells still register.
        if (w0 < -0.02 || w1 < -0.02 || w2 < -0.02) continue;
        const y = w0 * p0.y + w1 * p1.y + w2 * p2.y;
        const k = iz * nx + ix;
        if (y > data[k]) data[k] = y;
      }
    }
  };

  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh || !mesh.geometry) return;
    const geo = mesh.geometry as THREE.BufferGeometry;
    const pos = geo.getAttribute("position");
    if (!pos) return;
    const index = geo.getIndex();
    const m = mesh.matrixWorld;
    const tri = (i0: number, i1: number, i2: number) => {
      a.fromBufferAttribute(pos, i0).applyMatrix4(m);
      b.fromBufferAttribute(pos, i1).applyMatrix4(m);
      c.fromBufferAttribute(pos, i2).applyMatrix4(m);
      raster(a, b, c);
    };
    if (index) {
      for (let i = 0; i < index.count; i += 3) tri(index.getX(i), index.getX(i + 1), index.getX(i + 2));
    } else {
      for (let i = 0; i < pos.count; i += 3) tri(i, i + 1, i + 2);
    }
  });

  return { nx, nz, extent, data };
}

/**
 * Turn a hard height field into something fabric would settle into.
 *
 * 1. Lift everything by the fabric's air gap.
 * 2. Chamfer relaxation: no cell may sit lower than `slope` per metre below a
 *    neighbour. This is what makes the cover fall in a taut tent from the
 *    roof line to the floor instead of hugging every wheel well.
 * 3. A light blur for tension across hard steps (bonnet → canopy).
 * 4. Folds: low-frequency noise, stronger where the fabric hangs steeply.
 *
 * Returns a new field; the input is not mutated.
 */
export function drapeHeightField(
  hf: HeightField,
  opts: { gap?: number; slope?: number; floor?: number; blurPasses?: number; foldAmp?: number } = {},
): HeightField {
  const { nx, nz, extent } = hf;
  const gap = opts.gap ?? 0.035;
  const slope = opts.slope ?? 2.3;
  const floor = opts.floor ?? 0.02;
  const blurPasses = opts.blurPasses ?? 2;
  const foldAmp = opts.foldAmp ?? 0.012;
  const dx = extent.xSize / nx;
  const dz = extent.zSize / nz;
  const dd = Math.hypot(dx, dz);

  // Dilate by one cell first: a lamp lens or a rib narrower than a cell would
  // otherwise be averaged away and poke through the fabric.
  const raw = new Float32Array(nx * nz);
  for (let iz = 0; iz < nz; iz++) {
    for (let ix = 0; ix < nx; ix++) {
      let m = 0;
      for (let oz = -1; oz <= 1; oz++) {
        const z = iz + oz;
        if (z < 0 || z >= nz) continue;
        for (let ox = -1; ox <= 1; ox++) {
          const x = ix + ox;
          if (x < 0 || x >= nx) continue;
          const v = hf.data[z * nx + x];
          if (v > m) m = v;
        }
      }
      raw[iz * nx + ix] = m;
    }
  }

  const h = new Float32Array(nx * nz);
  for (let i = 0; i < h.length; i++) h[i] = raw[i] > floor ? raw[i] + gap : floor;

  // Two-pass chamfer (forward then backward) converges for this metric.
  const relax = (ix0: number, ix1: number, sx: number, iz0: number, iz1: number, sz: number) => {
    for (let iz = iz0; iz !== iz1; iz += sz) {
      for (let ix = ix0; ix !== ix1; ix += sx) {
        const k = iz * nx + ix;
        let v = h[k];
        const pz = iz - sz;
        const px = ix - sx;
        if (px >= 0 && px < nx) v = Math.max(v, h[iz * nx + px] - slope * dx);
        if (pz >= 0 && pz < nz) {
          v = Math.max(v, h[pz * nx + ix] - slope * dz);
          if (px >= 0 && px < nx) v = Math.max(v, h[pz * nx + px] - slope * dd);
          const qx = ix + sx;
          if (qx >= 0 && qx < nx) v = Math.max(v, h[pz * nx + qx] - slope * dd);
        }
        h[k] = v;
      }
    }
  };
  for (let pass = 0; pass < 2; pass++) {
    relax(0, nx, 1, 0, nz, 1);
    relax(nx - 1, -1, -1, nz - 1, -1, -1);
  }

  // Blur.
  let src = h;
  let dst = new Float32Array(nx * nz);
  for (let pass = 0; pass < blurPasses; pass++) {
    for (let iz = 0; iz < nz; iz++) {
      for (let ix = 0; ix < nx; ix++) {
        let s = 0;
        let n = 0;
        for (let oz = -1; oz <= 1; oz++) {
          const z = iz + oz;
          if (z < 0 || z >= nz) continue;
          for (let ox = -1; ox <= 1; ox++) {
            const x = ix + ox;
            if (x < 0 || x >= nx) continue;
            s += src[z * nx + x];
            n++;
          }
        }
        dst[iz * nx + ix] = s / n;
      }
    }
    [src, dst] = [dst, src];
  }

  // Hem distance: chamfer distance transform from the drape's footprint.
  const edge = new Float32Array(nx * nz);
  const FAR = 1e3;
  for (let i = 0; i < edge.length; i++) edge[i] = src[i] > floor + 0.006 ? 0 : FAR;
  const relaxEdge = (ix0: number, ix1: number, sx: number, iz0: number, iz1: number, sz: number) => {
    for (let iz = iz0; iz !== iz1; iz += sz) {
      for (let ix = ix0; ix !== ix1; ix += sx) {
        const k = iz * nx + ix;
        let v = edge[k];
        const pz = iz - sz;
        const px = ix - sx;
        if (px >= 0 && px < nx) v = Math.min(v, edge[iz * nx + px] + dx);
        if (pz >= 0 && pz < nz) {
          v = Math.min(v, edge[pz * nx + ix] + dz);
          if (px >= 0 && px < nx) v = Math.min(v, edge[pz * nx + px] + dd);
          const qx = ix + sx;
          if (qx >= 0 && qx < nx) v = Math.min(v, edge[pz * nx + qx] + dd);
        }
        edge[k] = v;
      }
    }
  };
  relaxEdge(0, nx, 1, 0, nz, 1);
  relaxEdge(nx - 1, -1, -1, nz - 1, -1, -1);

  // Folds: amplitude follows the local slope so the roof stays smooth and the
  // hanging skirts gather.
  const out = new Float32Array(nx * nz);
  for (let iz = 0; iz < nz; iz++) {
    for (let ix = 0; ix < nx; ix++) {
      const k = iz * nx + ix;
      const xl = src[iz * nx + Math.max(0, ix - 1)];
      const xr = src[iz * nx + Math.min(nx - 1, ix + 1)];
      const zl = src[Math.max(0, iz - 1) * nx + ix];
      const zr = src[Math.min(nz - 1, iz + 1) * nx + ix];
      const g = Math.hypot((xr - xl) / (2 * dx), (zr - zl) / (2 * dz));
      const x = extent.xMin + (ix + 0.5) * dx;
      const z = extent.zMin + (iz + 0.5) * dz;
      const fold =
        Math.sin(x * 7.3 + z * 2.1) * Math.sin(z * 4.7 - x * 1.3) * 0.7 +
        Math.sin(x * 15.1 + 1.7) * Math.cos(z * 11.3) * 0.3;
      const amp = foldAmp * (0.35 + Math.min(3, g) * 0.9);
      const v = src[k] + fold * amp;
      // Blur and folds may dip below a sharp crest (a fender top); the fabric
      // must still clear the surface everywhere.
      const minAbove = raw[k] > floor ? raw[k] + gap * 0.6 : floor * 0.6;
      out[k] = Math.max(minAbove, v);
    }
  }

  return { nx, nz, extent, data: out, edge };
}

/**
 * Pack a height field into a two-channel float texture the vertex shader can
 * sample: R = height, G = hem distance.
 */
export function heightFieldTexture(hf: HeightField): THREE.DataTexture {
  const n = hf.nx * hf.nz;
  const packed = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    packed[i * 2] = hf.data[i];
    packed[i * 2 + 1] = hf.edge ? hf.edge[i] : 0;
  }
  const tex = new THREE.DataTexture(packed, hf.nx, hf.nz, THREE.RGFormat, THREE.FloatType);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}
