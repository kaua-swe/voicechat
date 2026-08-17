import { describe, expect, it } from "vitest";
import {
  checkAiProviderFromEnv,
  createAiAdapterFromEnv,
  isLikelyOpenAiKey,
  OpenAiTranscriptionAdapter,
} from "./aiAdapter.js";

const testKey = ["sk", "test_abcdefghijklmnopqrstuvwxyz123456"].join("-");

describe("backend AI adapters", () => {
  it("keeps mock adapter available by default", async () => {
    const adapter = createAiAdapterFromEnv({});
    const responses = await adapter.process({
      type: "start",
      sessionId: "session_1",
      language: "pt-BR",
      tone: "consultivo",
    });
    expect(responses).toMatchObject([{ type: "status", status: "processing" }]);
  });

  it("validates OpenAI key shape without exposing values", () => {
    expect(isLikelyOpenAiKey(testKey)).toBe(true);
    expect(isLikelyOpenAiKey("plain-text-key")).toBe(false);
  });

  it("transcribes bounded chunks through an injected fetch client", async () => {
    const adapter = new OpenAiTranscriptionAdapter({
      apiKey: testKey,
      model: "gpt-4o-mini-transcribe",
      endpoint: "https://api.openai.example/v1/audio/transcriptions",
      modelsEndpoint: "https://api.openai.example/v1/models",
      timeoutMs: 5000,
      fetchImpl: async (_input, init) => {
        expect(init?.headers).toHaveProperty("authorization");
        return Response.json({ text: "texto transcrito" });
      },
    });

    const responses = await adapter.process({
      type: "audio",
      sessionId: "session_1",
      sequence: 1,
      metadata: { sampleRate: 16000, channels: 1, rms: 0.1, peak: 0.2, durationMs: 250 },
      audio: {
        encoding: "base64",
        mimeType: "audio/wav",
        data: Buffer.from("tiny-audio").toString("base64"),
        byteLength: 10,
      },
    });

    expect(responses[0]).toMatchObject({
      type: "transcript",
      segment: { text: "texto transcrito", isFinal: true },
    });
  });

  it("checks OpenAI model reachability without sending audio", async () => {
    const result = await checkAiProviderFromEnv(
      {
        VOICECHAT_TRANSCRIPTION_PROVIDER: "openai",
        OPENAI_API_KEY: testKey,
        VOICECHAT_OPENAI_TRANSCRIPTION_MODEL: "gpt-4o-mini-transcribe",
        VOICECHAT_OPENAI_MODELS_ENDPOINT: "https://api.openai.example/v1/models",
      },
      async (input, init) => {
        expect(String(input)).toBe("https://api.openai.example/v1/models");
        expect(init?.method).toBe("GET");
        return Response.json({ data: [] });
      },
    );

    expect(result).toEqual({
      ok: true,
      provider: "openai",
      model: "gpt-4o-mini-transcribe",
    });
  });
});
