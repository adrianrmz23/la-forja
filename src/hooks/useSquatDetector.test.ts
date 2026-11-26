// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSquatDetector } from "./useSquatDetector.ts";

/*
 * Pierna vista de lado: tobillo fijo, espinilla vertical y muslo girado
 * según el ángulo de la rodilla. 180° = de pie, 90° = muslo paralelo.
 */
const SHANK = 0.2;
const THIGH = 0.2;

function poseWithKneeAngle(kneeAngleDegrees: number): NormalizedLandmark[] {
  const radians = (kneeAngleDegrees * Math.PI) / 180;
  const ankle = { x: 0.5, y: 0.9 };
  const knee = { x: 0.5, y: ankle.y - SHANK };
  const hip = {
    x: knee.x + THIGH * Math.sin(radians),
    y: knee.y + THIGH * Math.cos(radians),
  };

  const landmarks = Array.from({ length: 33 }, () => ({
    x: 0.5,
    y: 0.5,
    z: 0,
    visibility: 1,
  })) as NormalizedLandmark[];

  for (const index of [23, 24]) landmarks[index] = { ...hip, z: 0, visibility: 1 };
  for (const index of [25, 26]) landmarks[index] = { ...knee, z: 0, visibility: 1 };
  for (const index of [27, 28]) landmarks[index] = { ...ankle, z: 0, visibility: 1 };

  return landmarks;
}

/** Recorre una sentadilla: de pie → baja hasta `depth` → sube → de pie. */
function runSquat(
  process: (landmarks: NormalizedLandmark[]) => void,
  clock: { now: number },
  depth: number,
) {
  const standing = 172;
  const frameMs = 33;

  const feed = (angle: number) => {
    clock.now += frameMs;
    act(() => process(poseWithKneeAngle(angle)));
  };

  for (let i = 0; i < 12; i += 1) feed(standing);

  const steps = 16;
  for (let i = 1; i <= steps; i += 1) {
    feed(standing + ((depth - standing) * i) / steps);
  }

  for (let i = 0; i < 6; i += 1) feed(depth);

  for (let i = 1; i <= steps; i += 1) {
    feed(depth + ((standing - depth) * i) / steps);
  }

  for (let i = 0; i < 14; i += 1) feed(standing);
}

describe("useSquatDetector", () => {
  const clock = { now: 1000 };

  beforeEach(() => {
    clock.now = 1000;
    vi.spyOn(performance, "now").mockImplementation(() => clock.now);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function setup() {
    const onValidRepetition = vi.fn();
    const onInvalidRepetition = vi.fn();

    const { result } = renderHook(() =>
      useSquatDetector({
        enabled: true,
        onValidRepetition,
        onInvalidRepetition,
      }),
    );

    return { result, onValidRepetition, onInvalidRepetition };
  }

  it("cuenta una sentadilla profunda", () => {
    const { result, onValidRepetition } = setup();

    runSquat(result.current.processLandmarks, clock, 85);

    expect(onValidRepetition).toHaveBeenCalledTimes(1);
  });

  it("cuenta una sentadilla cómoda (rodilla cerca de 105°)", () => {
    const { result, onValidRepetition } = setup();

    runSquat(result.current.processLandmarks, clock, 105);

    expect(onValidRepetition).toHaveBeenCalledTimes(1);
  });

  it("NO cuenta una media sentadilla (rodilla en 135°)", () => {
    const { result, onValidRepetition } = setup();

    runSquat(result.current.processLandmarks, clock, 135);

    expect(onValidRepetition).not.toHaveBeenCalled();
  });

  it("cuenta varias repeticiones seguidas", () => {
    const { result, onValidRepetition } = setup();

    runSquat(result.current.processLandmarks, clock, 95);
    runSquat(result.current.processLandmarks, clock, 95);
    runSquat(result.current.processLandmarks, clock, 95);

    expect(onValidRepetition).toHaveBeenCalledTimes(3);
  });
});
