import test from "node:test";
import assert from "node:assert/strict";
import {
  createFilmScrub,
  framePath,
  linearSegments,
  nearestDecodedFrame,
  progressToFrameT,
} from "./filmScrub.ts";

test("linearSegments weights advancing sections and preserves holds", () => {
  const segments = linearSegments([
    { section: "intro", weight: 200 },
    { section: "chapter", weight: 100 },
    { section: "chapter", weight: 50, hold: true },
  ]);

  assert.deepEqual(segments, [
    { section: "intro", weight: 200, from: 0, to: 2 / 3 },
    { section: "chapter", weight: 100, from: 2 / 3, to: 1 },
    { section: "chapter", weight: 50, from: 1, to: 1 },
  ]);
});

test("progressToFrameT respects weighted holds and explicit gaps", () => {
  const segments = [
    { section: "a", weight: 2, from: 0, to: 0.4 },
    { section: "b", weight: 1, from: 0.4, to: 0.4 },
    { section: "c", weight: 1, from: 0.6, to: 1 },
  ];

  assert.equal(progressToFrameT(0.25, segments), 0.2);
  assert.equal(progressToFrameT(0.625, segments), 0.4);
  assert.equal(progressToFrameT(0.875, segments), 0.8);
});

test("framePath zero-pads printf-style patterns", () => {
  assert.equal(framePath("/vision2040/frames/f%04d.jpg", 7), "/vision2040/frames/f0007.jpg");
  assert.equal(framePath("f%d.jpg", 12), "f12.jpg");
});

test("nearestDecodedFrame keeps interpolation on the wanted frame when decoded", () => {
  assert.deepEqual(nearestDecodedFrame(4.25, [false, false, false, false, true, true]), {
    index: 4,
    frac: 0.25,
  });
});

test("nearestDecodedFrame falls back to the nearest decoded neighbour", () => {
  assert.deepEqual(nearestDecodedFrame(4.6, [true, false, false, true, false, false]), {
    index: 3,
    frac: 0,
  });
  assert.deepEqual(nearestDecodedFrame(2.1, [false, false, false, false, true]), {
    index: 4,
    frac: 0,
  });
  assert.equal(nearestDecodedFrame(1, [false, false]), null);
});

function waitTurn() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function installFilmDom() {
  const previous = {
    window: globalThis.window,
    document: globalThis.document,
    fetch: globalThis.fetch,
    Image: globalThis.Image,
    requestAnimationFrame: globalThis.requestAnimationFrame,
    cancelAnimationFrame: globalThis.cancelAnimationFrame,
  };

  const rafs = new Map();
  let nextRafId = 1;
  const warnings = [];
  const section = { getBoundingClientRect: () => ({ height: 800 }) };
  const gradient = { addColorStop() {} };
  const ctx = {
    drawImage() {},
    createLinearGradient() {
      return gradient;
    },
    fillRect() {},
    save() {},
    restore() {},
    setTransform() {},
    globalAlpha: 1,
  };
  const canvas = {
    width: 0,
    height: 0,
    style: {},
    dataset: {},
    getContext: () => ctx,
  };
  const trigger = { offsetTop: 0, offsetHeight: 1600 };

  globalThis.window = {
    devicePixelRatio: 1,
    innerWidth: 1200,
    innerHeight: 800,
    scrollY: 0,
    matchMedia: () => ({ matches: false }),
    addEventListener() {},
    removeEventListener() {},
  };
  globalThis.document = {
    getElementById(id) {
      return id === "overture" ? section : null;
    },
  };
  globalThis.fetch = async () => ({
    ok: true,
    async json() {
      return { count: 2, pattern: "/vision2040/frames/f%04d.jpg" };
    },
  });
  globalThis.requestAnimationFrame = (cb) => {
    const id = nextRafId++;
    rafs.set(id, cb);
    return id;
  };
  globalThis.cancelAnimationFrame = (id) => {
    rafs.delete(id);
  };
  globalThis.Image = class MockImage {
    constructor() {
      this.decoding = "async";
      this.naturalWidth = 1600;
      this.naturalHeight = 900;
      this.onload = null;
      this.onerror = null;
    }

    set src(value) {
      this._src = value;
      queueMicrotask(() => {
        this.onload?.();
      });
    }

    get src() {
      return this._src ?? "";
    }
  };

  return {
    canvas,
    trigger,
    rafs,
    warnings,
    restore() {
      globalThis.window = previous.window;
      globalThis.document = previous.document;
      globalThis.fetch = previous.fetch;
      globalThis.Image = previous.Image;
      globalThis.requestAnimationFrame = previous.requestAnimationFrame;
      globalThis.cancelAnimationFrame = previous.cancelAnimationFrame;
    },
    withWarnings(fn) {
      const originalWarn = console.warn;
      console.warn = (msg) => warnings.push(String(msg));
      return Promise.resolve(fn()).finally(() => {
        console.warn = originalWarn;
      });
    },
  };
}

test("createFilmScrub upgrades from native fallback to lazy-loaded GSAP", async () => {
  const env = installFilmDom();
  let registered = null;
  let created = 0;

  await env.withWarnings(async () => {
    const handle = createFilmScrub({
      canvas: env.canvas,
      trigger: env.trigger,
      manifestUrl: "/vision2040/frames/manifest.json",
      segments: linearSegments([{ section: "overture", weight: 100 }]),
      loadDriver: async () => ({
        gsap: {
          registerPlugin(plugin) {
            registered = plugin;
          },
        },
        ScrollTrigger: {
          create() {
            created += 1;
            return { kill() {} };
          },
        },
      }),
    });

    await waitTurn();
    await waitTurn();

    assert.equal(env.canvas.dataset.driver, "gsap");
    assert.equal(env.canvas.dataset.frame, "0");
    assert.equal(registered && typeof registered.create, "function");
    assert.equal(created, 1);
    assert.equal(env.rafs.size, 0);

    handle.destroy();
  });

  env.restore();
});

test("createFilmScrub stays on native fallback when lazy driver is unavailable", async () => {
  const env = installFilmDom();

  await env.withWarnings(async () => {
    const handle = createFilmScrub({
      canvas: env.canvas,
      trigger: env.trigger,
      manifestUrl: "/vision2040/frames/manifest.json",
      segments: linearSegments([{ section: "overture", weight: 100 }]),
      loadDriver: async () => null,
    });

    await waitTurn();
    await waitTurn();

    assert.equal(env.canvas.dataset.driver, "native");
    assert.equal(env.canvas.dataset.frame, "0");
    assert.match(env.warnings.join("\n"), /using native scrub/);

    handle.destroy();
  });

  env.restore();
});
