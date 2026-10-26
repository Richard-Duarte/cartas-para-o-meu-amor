import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  blockFontSize,
  canvasBackgroundClick,
  clampBlockPosition,
  duplicateBlock,
  newBlock,
  reorderBlock,
  resizeBox,
  rotationFromPointer,
  snapBlock,
  stickerBlock,
} from "./pages.ts";

describe("snapBlock free placement", () => {
  it("keeps a far-from-guide position instead of clamping to the old 0–92 box", () => {
    const block = newBlock({ w: 20, h: 12, x: 0, y: 0 });
    // Old bug: Math.min(92, x) capped every block at x/y <= 92 even when
    // width was small, so the bottom-right of the page was unreachable.
    // Stay clear of the 4%/96%/50% magnetic lines so this asserts freedom.
    const moved = snapBlock(block, [], 72, 68);
    assert.equal(moved.x, 72);
    assert.equal(moved.y, 68);
    assert.deepEqual(moved.guides, []);
  });

  it("allows hanging slightly past the page edge while staying selectable", () => {
    const block = stickerBlock("data:image/png;base64,xx");
    block.w = 30;
    block.h = 24;
    const moved = snapBlock(block, [], 90, 88);
    assert.ok(moved.x > 70, `expected free right placement, got x=${moved.x}`);
    assert.ok(moved.y > 70, `expected free bottom placement, got y=${moved.y}`);
    const clamped = clampBlockPosition(block, 200, 200);
    assert.equal(clamped.x, 98);
    assert.equal(clamped.y, 98);
  });

  it("shows center guides and soft-snaps when close, without locking far moves", () => {
    const block = newBlock({ w: 20, h: 10 });
    const near = snapBlock(block, [], 40.2, 45.1);
    assert.ok(near.guides.some((g) => g.axis === "v" && g.pos === 50));
    assert.ok(near.guides.some((g) => g.axis === "h" && g.pos === 50));
    assert.ok(Math.abs(near.x - (50 - block.w / 2)) < 0.01);
    assert.ok(Math.abs(near.y - (50 - block.h / 2)) < 0.01);

    const far = snapBlock(block, [], 12, 70);
    assert.equal(far.guides.length, 0);
    assert.equal(far.x, 12);
    assert.equal(far.y, 70);
  });

  it("aligns to another block and still reports the guide line", () => {
    const block = newBlock({ id: "a", w: 16, h: 10 });
    const other = newBlock({ id: "b", x: 30, y: 20, w: 16, h: 10 });
    // y=62 keeps bottom/mid away from the page-center guide at 50%.
    const snapped = snapBlock(block, [other], 29.2, 62);
    assert.equal(snapped.x, 30);
    assert.ok(snapped.guides.some((g) => g.axis === "v" && g.pos === 30));
    assert.equal(snapped.y, 62);
  });
});

describe("canvasBackgroundClick selection", () => {
  it("keeps selection when the click is on paper, text box or chrome", () => {
    // Old bug: any pointerdown on the workspace cleared active, so tapping
    // the page or toolbar after typing dropped the selected text block.
    assert.equal(
      canvasBackgroundClick({
        closest: (query) => (query.includes(".canva-box") ? {} : null),
      }),
      false,
    );
    assert.equal(
      canvasBackgroundClick({
        closest: (query) => (query.includes(".canva-page") ? {} : null),
      }),
      false,
    );
    assert.equal(
      canvasBackgroundClick({
        closest: (query) => (/\bbutton\b/.test(query) ? {} : null),
      }),
      false,
    );
    assert.equal(
      canvasBackgroundClick({
        closest: (query) => (query.includes("[contenteditable='true']") ? {} : null),
      }),
      false,
    );
  });

  it("clears selection only on the empty workspace background", () => {
    assert.equal(canvasBackgroundClick({ closest: () => null }), true);
    assert.equal(canvasBackgroundClick(null), false);
  });
});

describe("free transform helpers", () => {
  it("scales font size with the paper width (cqw), keeping 420px as reference", () => {
    assert.equal(blockFontSize(42), "10cqw");
    assert.equal(blockFontSize(21), "5cqw");
    assert.equal(blockFontSize(Number.NaN), blockFontSize(22));
  });

  it("resizes from the east edge without moving the west edge", () => {
    const next = resizeBox({ x: 10, y: 10, w: 20, h: 10, rotate: 0 }, "e", 40, 0, 400, 400);
    assert.ok(Math.abs(next.x - 10) < 1e-9);
    assert.ok(Math.abs(next.w - 30) < 1e-9);
    assert.ok(Math.abs(next.h - 10) < 1e-9);
  });

  it("resizes from the north-west corner keeping the south-east corner fixed", () => {
    const next = resizeBox({ x: 20, y: 20, w: 20, h: 20, rotate: 0 }, "nw", -40, -40, 400, 400);
    assert.ok(Math.abs(next.x - 10) < 1e-9);
    assert.ok(Math.abs(next.y - 10) < 1e-9);
    assert.ok(Math.abs(next.x + next.w - 40) < 1e-9);
    assert.ok(Math.abs(next.y + next.h - 40) < 1e-9);
  });

  it("keeps aspect ratio on corners when asked and never collapses below the minimum", () => {
    const ratio = resizeBox({ x: 0, y: 0, w: 20, h: 10, rotate: 0 }, "se", 80, 0, 400, 400, { keepRatio: true });
    assert.ok(Math.abs(ratio.w / ratio.h - 2) < 1e-9);
    const tiny = resizeBox({ x: 0, y: 0, w: 20, h: 10, rotate: 0 }, "e", -1000, 0, 400, 400);
    assert.ok(tiny.w >= 4 - 1e-9);
  });

  it("resizes a rotated block along its own axis", () => {
    // Girado 90°: arrastar para baixo na tela aumenta a largura do bloco.
    const next = resizeBox({ x: 40, y: 40, w: 20, h: 10, rotate: 90 }, "e", 0, 40, 400, 400);
    assert.ok(Math.abs(next.w - 30) < 1e-6);
    assert.ok(Math.abs(next.h - 10) < 1e-6);
  });

  it("computes rotation from the pointer with optional steps", () => {
    assert.equal(rotationFromPointer(0, 0, 0, -10), 0);
    assert.equal(rotationFromPointer(0, 0, 10, 0), 90);
    assert.equal(rotationFromPointer(0, 0, 10, -9.8, { step: 15 }), 45);
    assert.equal(rotationFromPointer(0, 0, 10, -10.3, { snap: true }), 45);
  });

  it("brings a block to the front or back and duplicates with a new id", () => {
    const a = newBlock({ id: "a" });
    const b = newBlock({ id: "b" });
    const c = newBlock({ id: "c" });
    assert.deepEqual(reorderBlock([a, b, c], "a", "front").map((x) => x.id), ["b", "c", "a"]);
    assert.deepEqual(reorderBlock([a, b, c], "c", "back").map((x) => x.id), ["c", "a", "b"]);
    const copy = duplicateBlock(a);
    assert.notEqual(copy.id, a.id);
    assert.equal(copy.text, a.text);
    assert.ok(copy.x > a.x);
  });
});
