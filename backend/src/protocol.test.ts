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

  it("accepts bounded base64 audio chunks", () => {
    const message = validateClientMessage({
      type: "audio",
      sessionId: "session_1",
      sequence: 2,
      metadata: { sampleRate: 16000, channels: 1, rms: 0.2, peak: 0.5, durationMs: 250 },
      audio: {
        encoding: "base64",
        mimeType: "audio/wav",
        data: Buffer.from("tiny-audio").toString("base64"),
        byteLength: 10,
      },
    });
    expect(message).toMatchObject({ type: "audio", audio: { mimeType: "audio/wav" } });
  });

  it("rejects unsupported audio mime types", () => {
    expect(() =>
      validateClientMessage({
        type: "audio",
        sessionId: "session_1",
        sequence: 3,
        metadata: { sampleRate: 16000, channels: 1, rms: 0.2, peak: 0.5, durationMs: 250 },
        audio: {
          encoding: "base64",
          mimeType: "text/plain",
          data: Buffer.from("not-audio").toString("base64"),
          byteLength: 9,
        },
      }),
    ).toThrow();
  });
});
