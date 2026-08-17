import { describe, expect, it } from "vitest";
import { applySessionEvent, emptySnapshot } from "./sessionReducer";

describe("sessionReducer", () => {
  it("keeps latest suggestion per kind", () => {
    const first = applySessionEvent(emptySnapshot, {
      type: "suggestion",
      sessionId: "s1",
      suggestion: {
        id: "a",
        kind: "directResponse",
        text: "A",
        confidence: 0.6,
        createdAtMs: 1,
      },
    });
    const second = applySessionEvent(first, {
      type: "suggestion",
      sessionId: "s1",
      suggestion: {
        id: "b",
        kind: "directResponse",
        text: "B",
        confidence: 0.7,
        createdAtMs: 2,
      },
    });
    expect(second.suggestions).toHaveLength(1);
    expect(second.suggestions[0].text).toBe("B");
  });
});
