import { describe, it, expect } from "vitest";
import { CoordinateMapper, ContainerRect } from "../coordinate-mapper";

describe("Phase 5: CoordinateMapper Coordinate Normalization & Letterboxing", () => {
  const container: ContainerRect = { left: 0, top: 0, width: 1000, height: 500 };
  const videoWidth = 1920;
  const videoHeight = 1080; // 16:9 aspect ratio

  it("calculates pillarbox bounds correctly in contain mode", () => {
    // Container is 2:1 (wider than 16:9), so there are pillarbox black bars on left/right
    const bounds = CoordinateMapper.calculateContentBounds(
      container,
      videoWidth,
      videoHeight,
      "contain",
    );

    expect(bounds.height).toBe(500);
    expect(bounds.width).toBeCloseTo(500 * (16 / 9), 1);
    expect(bounds.x).toBeGreaterThan(0);
    expect(bounds.y).toBe(0);
  });

  it("normalizes points inside content bounds to [0, 1]", () => {
    const bounds = CoordinateMapper.calculateContentBounds(
      container,
      videoWidth,
      videoHeight,
      "contain",
    );
    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;

    const normCenter = CoordinateMapper.normalizePoint(
      centerX,
      centerY,
      container,
      videoWidth,
      videoHeight,
      "contain",
    );
    expect(normCenter).not.toBeNull();
    expect(normCenter?.x).toBeCloseTo(0.5, 2);
    expect(normCenter?.y).toBeCloseTo(0.5, 2);

    const normTopLeft = CoordinateMapper.normalizePoint(
      bounds.x,
      bounds.y,
      container,
      videoWidth,
      videoHeight,
      "contain",
    );
    expect(normTopLeft?.x).toBeCloseTo(0, 2);
    expect(normTopLeft?.y).toBeCloseTo(0, 2);
  });

  it("rejects points outside content bounds (in letterbox/pillarbox areas)", () => {
    // Click at x=10 (inside pillarbox bar)
    const norm = CoordinateMapper.normalizePoint(
      10,
      250,
      container,
      videoWidth,
      videoHeight,
      "contain",
    );
    expect(norm).toBeNull();
  });

  it("rejects NaN and Infinity coordinates", () => {
    const normNaN = CoordinateMapper.normalizePoint(
      NaN,
      100,
      container,
      videoWidth,
      videoHeight,
      "contain",
    );
    expect(normNaN).toBeNull();

    const normInf = CoordinateMapper.normalizePoint(
      100,
      Infinity,
      container,
      videoWidth,
      videoHeight,
      "contain",
    );
    expect(normInf).toBeNull();
  });

  it("translates normalized point to host physical pixels with DPI scaling", () => {
    const normPoint = { x: 0.5, y: 0.5 };
    const hostPixels = CoordinateMapper.toHostPhysicalPixels(normPoint, 1920, 1080, 1.25);

    expect(hostPixels.x).toBe(1200); // 0.5 * 1920 * 1.25 = 1200
    expect(hostPixels.y).toBe(675); // 0.5 * 1080 * 1.25 = 675
  });
});
