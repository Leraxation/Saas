/**
 * Geography for the network scene.
 *
 * IMPORTANT: the outline below is a STYLISED silhouette drawn for visual
 * effect. It is not a cartographic or legal boundary and must not be
 * presented as one. The caption rendered under the map says so.
 *
 * Airport coordinates are approximate, to diagram precision.
 * Route lists are illustrative — confirm against the current published
 * schedule before the meeting.
 */

export type LonLat = [number, number];

/** Stylised mainland Oman silhouette, traced coast-first then inland. */
export const OMAN_MAINLAND: LonLat[] = [
  // North coast, Batinah, running south-east
  [56.47, 24.75],
  [56.71, 24.34],
  [57.05, 24.12],
  [57.45, 23.9],
  [57.89, 23.7],
  [58.25, 23.63],
  [58.59, 23.61],
  [58.92, 23.26],
  [59.2, 22.9],
  [59.53, 22.57],
  [59.8, 22.52],
  // East coast running south
  [59.6, 21.78],
  [59.35, 21.3],
  [58.95, 20.9],
  [58.8, 20.65],
  [58.3, 20.25],
  [57.95, 19.95],
  [57.7, 19.66],
  [57.83, 18.99],
  [57.55, 18.4],
  [57.3, 17.42],
  [56.5, 17.15],
  [55.6, 17.05],
  [54.7, 16.99],
  [54.09, 17.02],
  [53.98, 16.94],
  [53.25, 16.7],
  [52.6, 16.68],
  [52.0, 16.65],
  // Inland, western border running north
  [52.0, 18.2],
  [52.4, 19.0],
  [53.6, 19.6],
  [55.0, 20.0],
  [55.2, 21.2],
  [55.2, 22.0],
  [55.67, 22.0],
  [55.2, 22.7],
  [55.5, 23.4],
  [55.79, 24.02],
  [56.03, 24.07],
  [55.8, 24.24],
  [56.06, 24.74],
  [56.47, 24.75],
];

/** Stylised Musandam silhouette (separated from the mainland by the UAE). */
export const OMAN_MUSANDAM: LonLat[] = [
  [56.16, 26.06],
  [56.24, 26.18],
  [56.28, 26.39],
  [56.4, 26.32],
  [56.45, 26.1],
  [56.6, 25.95],
  [56.35, 25.8],
  [56.14, 25.86],
  [56.16, 26.06],
];

export type Airport = {
  code: string;
  name: string;
  lonlat: LonLat;
  /** "hub" draws larger and lights first. */
  tier: "hub" | "regional";
};

/** Omani airports shown in the domestic constellation. */
export const AIRPORTS: Airport[] = [
  { code: "MCT", name: "Muscat", lonlat: [58.284, 23.593], tier: "hub" },
  { code: "SLL", name: "Salalah", lonlat: [54.091, 17.039], tier: "hub" },
  { code: "DQM", name: "Duqm", lonlat: [57.634, 19.502], tier: "regional" },
  { code: "OHS", name: "Sohar", lonlat: [56.626, 24.386], tier: "regional" },
  { code: "KHS", name: "Khasab", lonlat: [56.241, 26.171], tier: "regional" },
  { code: "MSH", name: "Masirah", lonlat: [58.89, 20.675], tier: "regional" },
  { code: "SUW", name: "Suwaiq", lonlat: [57.19, 23.66], tier: "regional" },
  { code: "AOM", name: "Adam", lonlat: [57.53, 22.38], tier: "regional" },
  { code: "OMM", name: "Marmul", lonlat: [55.18, 18.13], tier: "regional" },
];

/** Muscat — origin for every international arc. */
export const HUB: LonLat = [58.284, 23.593];

export type Destination = {
  city: string;
  lonlat: LonLat;
  region: "gulf" | "levant" | "europe" | "africa" | "southasia" | "seasia";
};

/**
 * Illustrative international reach. NOT a schedule.
 * Replace this list with the current published network before the meeting.
 */
export const DESTINATIONS: Destination[] = [
  { city: "Dubai", lonlat: [55.36, 25.25], region: "gulf" },
  { city: "Doha", lonlat: [51.53, 25.28], region: "gulf" },
  { city: "Kuwait", lonlat: [47.98, 29.38], region: "gulf" },
  { city: "Riyadh", lonlat: [46.72, 24.71], region: "gulf" },
  { city: "Jeddah", lonlat: [39.19, 21.49], region: "gulf" },
  { city: "Manama", lonlat: [50.59, 26.23], region: "gulf" },
  { city: "Cairo", lonlat: [31.24, 30.04], region: "levant" },
  { city: "Amman", lonlat: [35.93, 31.95], region: "levant" },
  { city: "Istanbul", lonlat: [28.98, 41.01], region: "levant" },
  { city: "London", lonlat: [-0.13, 51.51], region: "europe" },
  { city: "Frankfurt", lonlat: [8.68, 50.11], region: "europe" },
  { city: "Paris", lonlat: [2.35, 48.86], region: "europe" },
  { city: "Milan", lonlat: [9.19, 45.46], region: "europe" },
  { city: "Zurich", lonlat: [8.54, 47.38], region: "europe" },
  { city: "Moscow", lonlat: [37.62, 55.76], region: "europe" },
  { city: "Nairobi", lonlat: [36.82, -1.29], region: "africa" },
  { city: "Zanzibar", lonlat: [39.2, -6.16], region: "africa" },
  { city: "Dar es Salaam", lonlat: [39.28, -6.79], region: "africa" },
  { city: "Karachi", lonlat: [67.01, 24.86], region: "southasia" },
  { city: "Lahore", lonlat: [74.34, 31.55], region: "southasia" },
  { city: "Islamabad", lonlat: [73.09, 33.68], region: "southasia" },
  { city: "Delhi", lonlat: [77.21, 28.61], region: "southasia" },
  { city: "Mumbai", lonlat: [72.88, 19.08], region: "southasia" },
  { city: "Bengaluru", lonlat: [77.59, 12.97], region: "southasia" },
  { city: "Chennai", lonlat: [80.27, 13.08], region: "southasia" },
  { city: "Kochi", lonlat: [76.27, 9.93], region: "southasia" },
  { city: "Colombo", lonlat: [79.86, 6.93], region: "southasia" },
  { city: "Malé", lonlat: [73.51, 4.18], region: "southasia" },
  { city: "Dhaka", lonlat: [90.41, 23.81], region: "southasia" },
  { city: "Kathmandu", lonlat: [85.32, 27.72], region: "southasia" },
  { city: "Bangkok", lonlat: [100.5, 13.76], region: "seasia" },
  { city: "Kuala Lumpur", lonlat: [101.69, 3.14], region: "seasia" },
  { city: "Singapore", lonlat: [103.82, 1.35], region: "seasia" },
  { city: "Jakarta", lonlat: [106.85, -6.21], region: "seasia" },
  { city: "Manila", lonlat: [120.98, 14.6], region: "seasia" },
];

/* ── Projection ───────────────────────────────────────────────────────── */

export type Viewport = {
  /** Longitude/latitude window shown. */
  lon0: number;
  lon1: number;
  lat0: number;
  lat1: number;
};

/** Tight on Oman — used for the domestic constellation. */
export const VIEW_OMAN: Viewport = { lon0: 51.2, lon1: 60.8, lat0: 16.0, lat1: 27.0 };

/** Wide — used when the international arcs bloom outward. */
export const VIEW_REGION: Viewport = { lon0: -14, lon1: 132, lat0: -14, lat1: 60 };

/** Linear interpolation between two viewports, for the scroll-driven zoom out. */
export function lerpViewport(a: Viewport, b: Viewport, t: number): Viewport {
  const m = (x: number, y: number) => x + (y - x) * t;
  return {
    lon0: m(a.lon0, b.lon0),
    lon1: m(a.lon1, b.lon1),
    lat0: m(a.lat0, b.lat0),
    lat1: m(a.lat1, b.lat1),
  };
}

/**
 * Project lon/lat into canvas pixels for a viewport, preserving aspect ratio
 * and centring the window inside the canvas (contain-fit).
 */
export function makeProjector(v: Viewport, w: number, h: number) {
  const lonSpan = v.lon1 - v.lon0;
  // Mercator-ish latitude compression so the shapes do not look stretched.
  const latSpan = (v.lat1 - v.lat0) * 1.15;
  const scale = Math.min(w / lonSpan, h / latSpan);
  const cx = (v.lon0 + v.lon1) / 2;
  const cy = (v.lat0 + v.lat1) / 2;
  return (p: LonLat): [number, number] => [
    w / 2 + (p[0] - cx) * scale,
    h / 2 - (p[1] - cy) * scale * 1.15,
  ];
}

/**
 * Quadratic arc between two projected points, bowed away from the hub so the
 * routes read as flight paths rather than straight lines.
 */
export function arcPoint(
  a: [number, number],
  b: [number, number],
  t: number,
  bow: number,
): [number, number] {
  const mx = (a[0] + b[0]) / 2;
  const my = (a[1] + b[1]) / 2;
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  // Perpendicular offset, always lifting the arc "upward" on screen.
  const nx = -dy / len;
  const ny = dx / len;
  const lift = Math.min(len * bow, 260);
  const cxp = mx + nx * lift * Math.sign(ny || -1) * -1;
  const cyp = my + ny * lift * Math.sign(ny || -1) * -1;
  const u = 1 - t;
  return [
    u * u * a[0] + 2 * u * t * cxp + t * t * b[0],
    u * u * a[1] + 2 * u * t * cyp + t * t * b[1],
  ];
}
