/**
 * Describes where a section's reveal footage comes from.
 *
 * `frames` is the preferred mode: a 360 orbit rendered to a JPEG sequence by
 * scripts/extract-frames.mjs, which scrubs perfectly under a scrollbar.
 * `video` scrubs an mp4 directly (seek latency varies by browser).
 * `stills` is the no-footage fallback so the page works before any render lands.
 */
export type RevealSource =
  | { mode: "frames"; count: number; pattern: string; width: number; height: number }
  | { mode: "video"; src: string; width: number; height: number }
  | { mode: "stills"; frames: string[] };

/** Expands "/garage/x/frames/%04d.jpg" for a 1-based frame index. */
export function framePath(pattern: string, index: number): string {
  return pattern.replace(/%(\d+)d/, (_m, width: string) =>
    String(index).padStart(Number(width), "0"),
  );
}

/**
 * Reads the manifest a render drops next to its frames. Missing or malformed
 * manifests are not an error — the section falls back to its stills.
 */
export async function loadRevealSource(
  slug: string,
  stills: string[],
  signal?: AbortSignal,
): Promise<RevealSource> {
  const fallback: RevealSource = { mode: "stills", frames: stills };
  try {
    const res = await fetch(`/garage/${slug}/reveal.json`, { signal, cache: "no-cache" });
    if (!res.ok) return fallback;
    const raw = (await res.json()) as Partial<RevealSource> & Record<string, unknown>;

    if (raw.mode === "frames" && typeof raw.count === "number" && typeof raw.pattern === "string") {
      return {
        mode: "frames",
        count: raw.count,
        pattern: raw.pattern,
        width: Number(raw.width) || 1280,
        height: Number(raw.height) || 720,
      };
    }
    if (raw.mode === "video" && typeof raw.src === "string") {
      return {
        mode: "video",
        src: raw.src,
        width: Number(raw.width) || 1280,
        height: Number(raw.height) || 720,
      };
    }
    return fallback;
  } catch {
    return fallback;
  }
}
