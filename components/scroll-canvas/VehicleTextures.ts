import * as THREE from "three";
import type { RevealSource } from "./revealSource";
import {
  type Sheet,
  type Tile,
  sheetFromClip,
  sheetFromFrames,
  sheetFromImage,
} from "./frameSheet";

/**
 * Holds one vehicle's reveal as a single sprite sheet on the GPU.
 *
 * Every frame of the reveal lives in one texture, so moving through the orbit
 * changes a uniform rather than uploading a new image — see frameSheet.ts for
 * why the frames are cut the way they are. A vehicle starts on its generated
 * still, a one-tile sheet, so the section is never empty while the clip is
 * being cut and keeps a real image if the clip never arrives.
 *
 * `dispose()` is what the stage calls when a vehicle scrolls out of range.
 */
export class VehicleTextures {
  readonly texture = new THREE.Texture();
  size = { width: 1920, height: 1080 };
  grid = { cols: 1, rows: 1 };
  frames = 1;

  private source: RevealSource;
  private tile: Tile;
  private loaded = 0;
  private aborted = false;
  private cut = false;

  constructor(source: RevealSource, tile: Tile) {
    this.source = source;
    this.tile = tile;

    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;
    this.texture.generateMipmaps = false;
    // The sheet is addressed top-down by the shader, so it is not flipped.
    this.texture.flipY = false;
  }

  get ready(): boolean {
    return this.loaded > 0;
  }

  /** Where the orbit stands, 0..frames-1, for a position within the reveal. */
  at(progress: number): number {
    const p = progress < 0 ? 0 : progress > 1 ? 1 : progress;
    return p * (this.frames - 1);
  }

  private apply(sheet: Sheet) {
    this.texture.image = sheet.canvas;
    this.texture.needsUpdate = true;
    this.grid = { cols: sheet.cols, rows: sheet.rows };
    this.frames = sheet.cols * sheet.rows;
    this.size = { width: sheet.tile.width, height: sheet.tile.height };
    this.loaded = 1;
  }

  private loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve) => {
      const img = new Image();
      img.decoding = "async";
      img.crossOrigin = "anonymous";
      img.onload = img.onerror = () => resolve(img);
      img.src = src;
    });
  }

  /** Puts the still up, then replaces it with the cut frames when they land. */
  async load(onProgress?: (pct: number) => void): Promise<void> {
    if (this.source.mode === "none") {
      onProgress?.(1);
      return;
    }

    // "hero" has no clip behind it, so its still is the whole reveal.
    const still = this.source.mode === "hero" ? this.source.urls[0] : this.source.poster;
    if (still) {
      const img = await this.loadImage(still);
      if (this.aborted) return;
      if (img.naturalWidth && !this.cut) this.apply(sheetFromImage(img));
      onProgress?.(0.3);
    }

    try {
      let sheet: Sheet | null = null;
      if (this.source.mode === "video") {
        sheet = await sheetFromClip(this.source.src, this.tile, (f) =>
          onProgress?.(0.3 + f * 0.7),
        );
      } else if (this.source.mode === "frames") {
        sheet = await sheetFromFrames(this.source.urls, this.tile, (f) =>
          onProgress?.(0.3 + f * 0.7),
        );
      }
      if (sheet && !this.aborted) {
        this.cut = true;
        this.apply(sheet);
      }
    } catch {
      // The still carries the section: a missing clip is not a broken page.
    }
    onProgress?.(1);
  }

  dispose() {
    this.aborted = true;
    this.texture.dispose();
  }
}
