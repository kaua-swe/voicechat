import { describe, expect, it } from "vitest";
import { validateClientMessage } from "./protocol.js";

describe("backend protocol", () => {
  it("accepts valid audio metadata", () => {
    expect(
      validateClientMessage({
        type: "audio",
        sessionId: "session_1",
        sequence: 1,
        metadata: { sampleRate: 48000, channels: 2, rms: 0.2, peak: 0.5, durationMs: 250 },
      }),
    ).toMatchObject({ type: "audio" });
  });

  it("rejects oversized sample rate", () => {
    expect(() =>
      validateClientMessage({
        type: "audio",
        sessionId: "session_1",
        sequence: 1,
        metadata: { sampleRate: 384000, channels: 2, rms: 0.2, peak: 0.5, durationMs: 250 },
      }),
    ).toThrow();
  });
});
