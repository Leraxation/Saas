import * as THREE from "three";
import type { RevealSource } from "./revealSource";

/**
 * Holds one vehicle's reveal imagery as a single GPU texture whose contents are
 * swapped as the scroll position moves.
 *
 * Only one texture object exists per vehicle for the life of the section — the
 * frame swap replaces `texture.image` rather than allocating, which keeps a
 * 120-frame orbit to one upload per changed frame instead of 120 live textures.
 * `dispose()` is what the stage calls when a vehicle scrolls out of range.
 */
export class VehicleTextures {
  readonly texture = new THREE.Texture();
  size = { width: 1920, height: 1080 };

  private source: RevealSource;
  private stride: number;
  private images: HTMLImageElement[] = [];
  private video: HTMLVideoElement | null = null;
  private lastIndex = -1;
  private loadedCount = 0;
  private total = 0;
  private aborted = false;

  constructor(source: RevealSource, stride = 1) {
    this.source = source;
    this.stride = Math.max(1, stride);

    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;
    this.texture.generateMipmaps = false;

    if (source.mode !== "stills") {
      this.size = { width: source.width, height: source.height };
    }
  }

  get progress(): number {
    return this.total ? this.loadedCount / this.total : 0;
  }

  get ready(): boolean {
    return this.loadedCount > 0;
  }

  /** Loads enough of the source to draw, resolving once the first frame is up. */
  async load(onProgress?: (pct: number) => void): Promise<void> {
    if (this.source.mode === "video") {
      await this.loadVideo(this.source.src);
      onProgress?.(1);
      return;
    }

    const urls =
      this.source.mode === "frames"
        ? this.source.urls.filter((_, i) => i % this.stride === 0)
        : this.source.urls;

    this.total = urls.length;
    let cursor = 0;

    // Bounded concurrency: a full orbit should not open one socket per frame.
    const worker = async (): Promise<void> => {
      while (cursor < urls.length && !this.aborted) {
        const index = cursor++;
        const img = await this.loadImage(urls[index]);
        this.images[index] = img;
        this.loadedCount += 1;
        onProgress?.(this.progress);

        if (this.loadedCount === 1) this.applyImage(img, 0);
      }
    };

    await Promise.all(Array.from({ length: Math.min(6, urls.length) }, worker));
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

  private loadVideo(src: string): Promise<void> {
    return new Promise((resolve) => {
      const video = document.createElement("video");
      video.src = src;
      video.muted = true;
      video.playsInline = true;
      video.preload = "auto";
      video.crossOrigin = "anonymous";
      video.addEventListener(
        "loadeddata",
        () => {
          this.video = video;
          this.size = { width: video.videoWidth || 1920, height: video.videoHeight || 1080 };
          this.texture.image = video;
          this.texture.needsUpdate = true;
          this.loadedCount = 1;
          this.total = 1;
          resolve();
        },
        { once: true },
      );
      video.addEventListener("error", () => resolve(), { once: true });
      video.load();
    });
  }

  private applyImage(img: HTMLImageElement, index: number) {
    if (!img.naturalWidth) return;
    this.size = { width: img.naturalWidth, height: img.naturalHeight };
    this.texture.image = img;
    this.texture.needsUpdate = true;
    this.lastIndex = index;
  }

  /** Points the texture at whatever this scroll position should be showing. */
  seek(progress: number) {
    const p = Math.min(0.9999, Math.max(0, progress));

    if (this.video) {
      const duration = this.video.duration;
      if (Number.isFinite(duration) && duration > 0) {
        const target = p * (duration - 0.05);
        if (Math.abs(this.video.currentTime - target) > 0.02) this.video.currentTime = target;
      }
      this.texture.needsUpdate = true;
      return;
    }

    const loaded = this.images.filter(Boolean);
    if (!loaded.length) return;

    const index = Math.min(loaded.length - 1, Math.floor(p * loaded.length));
    if (index === this.lastIndex) return;
    const img = this.images[index];
    if (img?.complete) this.applyImage(img, index);
  }

  dispose() {
    this.aborted = true;
    this.texture.dispose();
    if (this.video) {
      this.video.pause();
      this.video.removeAttribute("src");
      this.video.load();
      this.video = null;
    }
    this.images = [];
  }
}
