import type { Vehicle } from "@/lib/vehicles/manifest";
import { revealPaths, scrubImages } from "@/lib/vehicles/manifest";

/**
 * Where a vehicle's reveal imagery comes from, in order of preference.
 *
 * `frames` is what the pipeline produces: scripts/extract-frames.mjs renders the
 * Higgsfield mp4 to a JPEG sequence, which scrubs deterministically under a
 * scrollbar with no seek latency.
 * `video` scrubs the mp4 directly — fewer requests, but seek cost varies by
 * browser, so it is the mobile/low-memory path rather than the default.
 * `stills` keeps the page working before any clip has been generated.
 */
export type RevealSource =
  | { mode: "frames"; urls: string[]; width: number; height: number; poster: string }
  | { mode: "video"; src: string; width: number; height: number; poster: string }
  | { mode: "stills"; urls: string[]; poster: string };

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

/**
 * Resolves a vehicle's reveal source, preferring generated frames and falling
 * back to its source photos. `preferVideo` picks the mp4 when one is listed,
 * which keeps memory flat on devices that cannot hold a frame sequence.
 */
export async function loadRevealSource(
  vehicle: Vehicle,
  { preferVideo = false, signal }: { preferVideo?: boolean; signal?: AbortSignal } = {},
): Promise<RevealSource> {
  const paths = revealPaths(vehicle);
  const stills = scrubImages(vehicle);
  const fallback: RevealSource = { mode: "stills", urls: stills, poster: stills[0] };

  try {
    const res = await fetch(paths.manifest, { signal, cache: "no-cache" });
    if (!res.ok) return fallback;

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

    return fallback;
  } catch {
    return fallback;
  }
}
