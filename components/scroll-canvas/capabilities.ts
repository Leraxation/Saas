/**
 * What this device can actually be asked to render.
 *
 * The WebGL path is the intended experience; everything here exists so the page
 * degrades on its own rather than shipping a blank canvas or exhausting memory
 * on a phone holding two frame sequences at once.
 */
export type DeviceTier = "full" | "lite" | "fallback";

export type Capabilities = {
  tier: DeviceTier;
  webgl: boolean;
  reducedMotion: boolean;
  /** Bloom and grain are the first things dropped on the lite tier. */
  postProcessing: boolean;
  /** Cut the sheet from the mp4 rather than from an ingested frame sequence. */
  preferVideo: boolean;
  maxPixelRatio: number;
};

function hasWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      canvas.getContext("webgl2") ||
        canvas.getContext("webgl") ||
        canvas.getContext("experimental-webgl"),
    );
  } catch {
    return false;
  }
}

export function detectCapabilities(): Capabilities {
  if (typeof window === "undefined") {
    return {
      tier: "fallback",
      webgl: false,
      reducedMotion: false,
      postProcessing: false,
      preferVideo: false,
      maxPixelRatio: 1,
    };
  }

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const webgl = hasWebGL();

  // Coarse pointer plus a narrow viewport is the phone case; deviceMemory is
  // only exposed by Chromium, so a missing value is treated as adequate.
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const narrow = window.innerWidth < 900;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  const lowMemory = typeof memory === "number" && memory <= 4;
  const lite = (coarse && narrow) || lowMemory;

  if (!webgl) {
    return {
      tier: "fallback",
      webgl: false,
      reducedMotion,
      postProcessing: false,
      preferVideo: false,
      maxPixelRatio: 1,
    };
  }

  return {
    tier: lite ? "lite" : "full",
    webgl: true,
    reducedMotion,
    postProcessing: !lite && !reducedMotion,
    preferVideo: lite,
    maxPixelRatio: lite ? 1.5 : 2,
  };
}
