import type { Vehicle } from "@/lib/vehicles/manifest";
import { revealPaths } from "@/lib/vehicles/manifest";

/**
 * Where a vehicle's reveal imagery comes from, in order of preference.
 *
 * Everything here is generated. Reference photographs live outside `public/`
 * and are never a source — they inform the generation prompt and nothing else.
 *
 * `frames` is what the pipeline produces: scripts/extract-frames.mjs renders the
 * reveal clip to a JPEG sequence, which scrubs deterministically under a
 * scrollbar with no seek latency.
 * `video` scrubs the mp4 directly — fewer requests, but seek cost varies by
 * browser, so it is the low-memory path rather than the default.
 * `hero` is the single generated still, shown until a clip exists.
 * `none` means nothing has been generated for this part yet; the section renders
 * as an empty lit stage rather than as a broken image.
 */
export type RevealSource =
  | { mode: "frames"; urls: string[]; width: number; height: number; poster: string }
  | { mode: "video"; src: string; width: number; height: number; poster: string }
  | { mode: "hero"; urls: string[]; poster: string }
  | { mode: "none" };

type RawManifest = {
  mode?: string;
  count?: number;
  pattern?: string;
  width?: number;
  height?: number;
  video?: string;
};

/** Expands "/vehicles/part-1/frames/%04d.jpg" for a 1-based index. */
export function framePath(pattern: string, index: number): string {
  return pattern.replace(/%(\d+)d/, (_m, width: string) =>
    String(index).padStart(Number(width), "0"),
  );
}

/** True when the asset exists — a missing generated file is the normal case. */
async function exists(url: string, signal?: AbortSignal): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "HEAD", signal, cache: "no-cache" });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Resolves a vehicle's reveal source. `preferVideo` picks the mp4 when one is
 * listed, which keeps memory flat on devices that cannot hold a frame sequence.
 */
export async function loadRevealSource(
  vehicle: Vehicle,
  { preferVideo = false, signal }: { preferVideo?: boolean; signal?: AbortSignal } = {},
): Promise<RevealSource> {
  const paths = revealPaths(vehicle);

  try {
    const res = await fetch(paths.manifest, { signal, cache: "no-cache" });

    if (res.ok) {
      const raw = (await res.json()) as RawManifest;
      const width = Number(raw.width) || 1920;
      const height = Number(raw.height) || 1080;
      const poster = paths.poster;

      if (preferVideo && typeof raw.video === "string") {
        return { mode: "video", src: raw.video, width, height, poster };
      }
      if (raw.mode === "frames" && raw.count && raw.pattern) {
        const pattern = raw.pattern;
        return {
          mode: "frames",
          urls: Array.from({ length: raw.count }, (_, i) => framePath(pattern, i + 1)),
          width,
          height,
          poster,
        };
      }
      if (typeof raw.video === "string") {
        return { mode: "video", src: raw.video, width, height, poster };
      }
    }
  } catch {
    // Fall through to the hero still.
  }

  const hero = vehicle.display.hero;
  if (await exists(hero, signal)) {
    return { mode: "hero", urls: [hero], poster: hero };
  }

  // Nothing ingested yet: play the renders straight off Higgsfield's CDN so the
  // collection shows real footage before anyone runs the ingest script.
  if (vehicle.remote?.video) {
    return {
      mode: "video",
      src: vehicle.remote.video,
      width: 1920,
      height: 1080,
      poster: vehicle.remote.hero ?? "",
    };
  }
  if (vehicle.remote?.hero) {
    return { mode: "hero", urls: [vehicle.remote.hero], poster: vehicle.remote.hero };
  }

  return { mode: "none" };
}
