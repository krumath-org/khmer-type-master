import { describe, expect, it } from "vitest";

import { mergeProgress, type ProgressMap } from "@/lib/progress";

describe("mergeProgress", () => {
  it("unions completion and keeps the higher best scores", () => {
    const local: ProgressMap = {
      "1:a": { completed: false, bestWpm: 20, bestAccuracy: 80 },
      "1:b": { completed: true, bestWpm: 30, bestAccuracy: 95 },
    };
    const remote: ProgressMap = {
      "1:a": { completed: true, bestWpm: 15, bestAccuracy: 98 },
      "2:c": { completed: true, bestWpm: 40, bestAccuracy: 90 },
    };

    expect(mergeProgress(local, remote)).toEqual({
      "1:a": { completed: true, bestWpm: 20, bestAccuracy: 98 },
      "1:b": { completed: true, bestWpm: 30, bestAccuracy: 95 },
      "2:c": { completed: true, bestWpm: 40, bestAccuracy: 90 },
    });
  });

  it("returns local progress when remote is empty", () => {
    const local: ProgressMap = { "1:a": { completed: true, bestWpm: 25, bestAccuracy: 90 } };
    expect(mergeProgress(local, {})).toEqual(local);
  });

  it("keeps remote progress when local is empty", () => {
    const remote: ProgressMap = { "1:a": { completed: true, bestWpm: 25, bestAccuracy: 90 } };
    expect(mergeProgress({}, remote)).toEqual(remote);
  });

  it("does not mutate the inputs", () => {
    const local: ProgressMap = { "1:a": { completed: true, bestWpm: 10, bestAccuracy: 50 } };
    const remote: ProgressMap = { "1:a": { completed: false, bestWpm: 99, bestAccuracy: 99 } };
    mergeProgress(local, remote);
    expect(local["1:a"]).toEqual({ completed: true, bestWpm: 10, bestAccuracy: 50 });
    expect(remote["1:a"]).toEqual({ completed: false, bestWpm: 99, bestAccuracy: 99 });
  });
});
