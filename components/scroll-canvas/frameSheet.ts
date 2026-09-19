/**
 * Cutting a reveal clip into frames, laid out in one sprite sheet.
 *
 * A reveal is scrubbed by the scrollbar, so every position has to be available
 * instantly. Two approaches do not survive contact with that:
 *
 * - Seeking a <video> as the scroll moves. Each seek is a decode, so the orbit
 *   stutters, and the frame arrives late.
 * - Capturing frames by seeking to each one. `seeked` fires when the seek has
 *   completed, not when the decoder has presented the new picture, so drawing
 *   in that handler copies whatever was on screen before. Measured against the
 *   generated clips, 36 seeks produced 3 distinct frames.
 *
 * What does work is playing the clip through at speed and keeping whatever the
 * compositor presents: requestVideoFrameCallback hands over each frame with the
 * media time it belongs to, which is what decides the slot it lands in. One
 * sheet then lives on the GPU and scrubbing costs a uniform, not an upload.
 */

export type Sheet = {
  canvas: HTMLCanvasElement;
  cols: number;
  rows: number;
  /** One frame's dimensions — what the fill-crop maths needs, not the sheet's. */
  tile: { width: number; height: number };
};

export type Tile = { width: number; height: number };

export const SHEET_COLS = 6;
export const SHEET_ROWS = 6;
export const SHEET_FRAMES = SHEET_COLS * SHEET_ROWS;

/** Media time is reported per presented frame; typed here as it is not in lib.dom. */
type FrameMeta = { mediaTime: number };
type FrameCallbackVideo = HTMLVideoElement & {
  requestVideoFrameCallback?: (cb: (now: number, meta: FrameMeta) => void) => number;
};

/**
 * The largest frame the GPU will hold six across.
 *
 * A device that caps textures at 2048 gets smaller frames rather than a sheet
 * it has to refuse, and `modest` holds phones to that cap regardless.
 */
export function tileSize(maxTexture: number, modest: boolean): Tile {
  const cap = Math.min(maxTexture || 2048, modest ? 2048 : 4096);
  const width = Math.max(160, Math.floor(cap / SHEET_COLS / 2) * 2);
  return { width, height: Math.round((width * 9) / 16 / 2) * 2 };
}

function blankSheet(tile: Tile): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement("canvas");
  canvas.width = SHEET_COLS * tile.width;
  canvas.height = SHEET_ROWS * tile.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2d context unavailable");
  ctx.fillStyle = "#050506";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  return { canvas, ctx };
}

const tileX = (i: number, tile: Tile) => (i % SHEET_COLS) * tile.width;
const tileY = (i: number, tile: Tile) => Math.floor(i / SHEET_COLS) * tile.height;

/** Any slot the source did not fill takes its nearest neighbour's frame. */
function patchGaps(
  ctx: CanvasRenderingContext2D,
  filled: boolean[],
  tile: Tile,
): boolean {
  for (let i = 0; i < SHEET_FRAMES; i++) {
    if (filled[i]) continue;
    let near = -1;
    for (let d = 1; d < SHEET_FRAMES && near < 0; d++) {
      if (filled[i - d]) near = i - d;
      else if (filled[i + d]) near = i + d;
    }
    if (near < 0) return false;
    ctx.drawImage(
      ctx.canvas,
      tileX(near, tile), tileY(near, tile), tile.width, tile.height,
      tileX(i, tile), tileY(i, tile), tile.width, tile.height,
    );
  }
  return true;
}

/** One still, as a single-tile sheet, so every source reads the same way. */
export function sheetFromImage(image: HTMLImageElement): Sheet {
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  canvas.getContext("2d")?.drawImage(image, 0, 0);
  return {
    canvas,
    cols: 1,
    rows: 1,
    tile: { width: image.naturalWidth, height: image.naturalHeight },
  };
}

/** An already-extracted frame sequence, packed into the same layout. */
export async function sheetFromFrames(
  urls: string[],
  tile: Tile,
  onStep?: (fraction: number) => void,
): Promise<Sheet> {
  const { canvas, ctx } = blankSheet(tile);
  const filled: boolean[] = [];
  let done = 0;

  // The sequence is usually longer than the sheet, so it is sampled across.
  await Promise.all(
    Array.from({ length: SHEET_FRAMES }, async (_unused, slot) => {
      const pick = Math.min(urls.length - 1, Math.round((slot / (SHEET_FRAMES - 1)) * (urls.length - 1)));
      const image = await new Promise<HTMLImageElement>((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.decoding = "async";
        img.onload = img.onerror = () => resolve(img);
        img.src = urls[pick];
      });
      done += 1;
      onStep?.(done / SHEET_FRAMES);
      if (!image.naturalWidth) return;
      ctx.drawImage(image, tileX(slot, tile), tileY(slot, tile), tile.width, tile.height);
      filled[slot] = true;
    }),
  );

  if (!filled.some(Boolean) || !patchGaps(ctx, filled, tile)) {
    throw new Error("no frames loaded");
  }
  return { canvas, cols: SHEET_COLS, rows: SHEET_ROWS, tile };
}

/**
 * Plays a clip through and keeps one frame per slot.
 *
 * Browsers without requestVideoFrameCallback fall back to seeking, which is
 * imperfect for the reason in this module's note but still better than no
 * reveal at all.
 */
export function sheetFromClip(
  url: string,
  tile: Tile,
  onStep?: (fraction: number) => void,
): Promise<Sheet> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video") as FrameCallbackVideo;
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    // Held in the document, barely: a video that is never rendered may never
    // have its frames presented, and then nothing is ever handed back.
    video.style.cssText =
      "position:fixed;left:0;top:0;width:2px;height:2px;opacity:0.01;" +
      "pointer-events:none;z-index:-1";
    document.body.appendChild(video);

    const { canvas, ctx } = blankSheet(tile);
    const filled: boolean[] = [];
    let count = 0;
    let settled = false;
    const guard = window.setTimeout(() => finish(new Error("clip timed out")), 60000);

    function cleanup() {
      window.clearTimeout(guard);
      try {
        video.pause();
      } catch {
        /* already stopped */
      }
      video.removeAttribute("src");
      video.load();
      video.remove();
    }

    function finish(err: Error | null) {
      if (settled) return;
      settled = true;
      cleanup();
      if (!err && count > 0 && patchGaps(ctx, filled, tile)) {
        resolve({ canvas, cols: SHEET_COLS, rows: SHEET_ROWS, tile });
        return;
      }
      reject(err ?? new Error("no frames captured"));
    }

    function take(mediaTime: number) {
      const duration = video.duration || 1;
      const slot = Math.max(
        0,
        Math.min(SHEET_FRAMES - 1, Math.round((mediaTime / duration) * (SHEET_FRAMES - 1))),
      );
      if (filled[slot]) return;
      ctx.drawImage(video, tileX(slot, tile), tileY(slot, tile), tile.width, tile.height);
      filled[slot] = true;
      count += 1;
      onStep?.(count / SHEET_FRAMES);
      if (count >= SHEET_FRAMES) finish(null);
    }

    function seekThrough() {
      let i = 0;
      const first = Math.min(0.02, video.duration * 0.01);
      const last = Math.max(first, video.duration - 0.08);
      const times = Array.from(
        { length: SHEET_FRAMES },
        (_unused, k) => first + ((last - first) * k) / (SHEET_FRAMES - 1),
      );
      video.addEventListener("seeked", () => {
        if (settled) return;
        // A frame's worth of grace for the decoder to put the picture up.
        window.setTimeout(() => {
          if (settled) return;
          take(times[i]);
          i += 1;
          if (i < SHEET_FRAMES) video.currentTime = times[i];
          else finish(null);
        }, 60);
      });
      video.currentTime = times[0];
    }

    video.addEventListener("loadedmetadata", () => {
      if (!Number.isFinite(video.duration) || video.duration <= 0) {
        finish(new Error("clip has no duration"));
        return;
      }
      if (!video.requestVideoFrameCallback) {
        seekThrough();
        return;
      }
      // Fast enough to be over before the section is reached, slow enough that
      // the decoder still presents far more frames than there are slots.
      video.playbackRate = 4;
      const onFrame = (_now: number, meta: FrameMeta) => {
        if (settled) return;
        take(meta.mediaTime);
        if (!settled) video.requestVideoFrameCallback?.(onFrame);
      };
      video.requestVideoFrameCallback(onFrame);
      video.play().catch(() => seekThrough());
    });
    video.addEventListener("ended", () => finish(null));
    video.addEventListener("error", () => finish(new Error("clip failed to load")));
    video.src = url;
  });
}
