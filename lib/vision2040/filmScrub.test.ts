import test from "node:test";
import assert from "node:assert/strict";
import {
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
