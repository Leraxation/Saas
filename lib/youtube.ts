export interface ParsedVideo {
  id: string;
  startSeconds?: number;
}

const VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/;

/** Parse a "t" / "start" query value like "90", "90s", "1m30s" or "1h2m3s" into seconds. */
function parseTimeParam(value: string | null): number | undefined {
  if (!value) return undefined;
  if (/^\d+$/.test(value)) return parseInt(value, 10);
  const match = value.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/);
  if (!match) return undefined;
  const [, h, m, s] = match;
  const seconds =
    (h ? parseInt(h, 10) * 3600 : 0) +
    (m ? parseInt(m, 10) * 60 : 0) +
    (s ? parseInt(s, 10) : 0);
  return seconds > 0 ? seconds : undefined;
}

/**
 * Extract a video id (and optional start time) from any common YouTube link:
 * watch URLs, youtu.be short links, Shorts/reels, embeds, live URLs,
 * YouTube Music links, or a bare 11-character video id.
 */
export function parseYouTubeUrl(input: string): ParsedVideo | null {
  const raw = input.trim();
  if (!raw) return null;
  if (VIDEO_ID_RE.test(raw)) return { id: raw };

  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  const startSeconds = parseTimeParam(url.searchParams.get("t") ?? url.searchParams.get("start"));

  if (host === "youtu.be") {
    const id = url.pathname.split("/").filter(Boolean)[0] ?? "";
    return VIDEO_ID_RE.test(id) ? { id, startSeconds } : null;
  }

  const isYouTubeHost =
    host === "youtube.com" ||
    host === "m.youtube.com" ||
    host === "music.youtube.com" ||
    host === "youtube-nocookie.com";
  if (!isYouTubeHost) return null;

  const segments = url.pathname.split("/").filter(Boolean);

  if (segments[0] === "watch") {
    const id = url.searchParams.get("v") ?? "";
    return VIDEO_ID_RE.test(id) ? { id, startSeconds } : null;
  }

  // /shorts/ID (reels), /embed/ID, /live/ID, /v/ID
  if (["shorts", "embed", "live", "v"].includes(segments[0]) && segments[1]) {
    const id = segments[1];
    return VIDEO_ID_RE.test(id) ? { id, startSeconds } : null;
  }

  return null;
}

let apiPromise: Promise<typeof YT> | null = null;

/** Load the YouTube IFrame Player API exactly once and resolve when it is ready. */
export function loadYouTubeApi(): Promise<typeof YT> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("YouTube API can only load in the browser"));
  }
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (apiPromise) return apiPromise;

  apiPromise = new Promise((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve(window.YT!);
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.onerror = () => {
      apiPromise = null;
      reject(new Error("Failed to load the YouTube IFrame API"));
    };
    document.head.appendChild(script);
  });
  return apiPromise;
}

export function formatTime(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return "0:00";
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
