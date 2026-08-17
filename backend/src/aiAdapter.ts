import type { AudioMetadata, ClientMessage } from "./protocol.js";

export interface AiAdapter {
  process(message: ClientMessage): Promise<unknown[]>;
}

export class LocalStreamingAdapter implements AiAdapter {
  private readonly transcript: string[] = [];

  async process(message: ClientMessage): Promise<unknown[]> {
    if (message.type === "start") {
      this.transcript.length = 0;
      return [{ type: "status", status: "processing" }];
    }
    if (message.type === "stop") {
      return [{ type: "status", status: "ended" }];
    }
    const segment = this.segmentFromAudio(message.metadata, message.sequence);
    this.transcript.push(segment.text);
    this.transcript.splice(0, Math.max(0, this.transcript.length - 12));
    return [
      { type: "transcript", segment },
      {
        type: "suggestion",
        suggestion: {
          id: `sg-${message.sequence}`,
          kind: message.sequence % 2 === 0 ? "directResponse" : "clarifyingQuestion",
          text:
            message.sequence % 2 === 0
              ? "Confirme o entendimento e proponha o proximo passo."
              : "Pergunte qual criterio deve guiar a decisao agora.",
          confidence: 0.71,
          createdAtMs: Date.now(),
        },
      },
    ];
  }

  private segmentFromAudio(metadata: AudioMetadata, sequence: number) {
    return {
      id: `tr-${sequence}`,
      text:
        metadata.rms > 0.02
          ? "Transcricao parcial recebida em fluxo continuo pelo backend."
          : "Janela atual sem fala relevante.",
      isFinal: sequence % 8 === 0,
      startedAtMs: Date.now() - metadata.durationMs,
      updatedAtMs: Date.now(),
    };
  }
}

export interface OpenAiTranscriptionConfig {
  apiKey: string;
  model: string;
  endpoint: string;
  modelsEndpoint: string;
  timeoutMs: number;
  fetchImpl?: typeof fetch;
}

export function createAiAdapterFromEnv(env: NodeJS.ProcessEnv): AiAdapter {
  const provider = (env.VOICECHAT_TRANSCRIPTION_PROVIDER ?? "mock").trim().toLowerCase();
  if (provider === "mock" || provider === "local") {
    return new LocalStreamingAdapter();
  }
  if (provider !== "openai") {
    throw new Error("unsupported transcription provider");
  }

  const apiKey = (env.OPENAI_API_KEY ?? "").trim();
  if (!isLikelyOpenAiKey(apiKey)) {
    throw new Error("OPENAI_API_KEY must be configured server-side for OpenAI transcription");
  }

  return new OpenAiTranscriptionAdapter({
    apiKey,
    model: env.VOICECHAT_OPENAI_TRANSCRIPTION_MODEL ?? "gpt-4o-mini-transcribe",
    endpoint: env.VOICECHAT_OPENAI_TRANSCRIPTION_ENDPOINT ?? "https://api.openai.com/v1/audio/transcriptions",
    modelsEndpoint: env.VOICECHAT_OPENAI_MODELS_ENDPOINT ?? "https://api.openai.com/v1/models",
    timeoutMs: parsePositiveInt(env.VOICECHAT_OPENAI_TIMEOUT_MS, 20_000),
  });
}

export class OpenAiTranscriptionAdapter implements AiAdapter {
  private readonly transcript: string[] = [];
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly config: OpenAiTranscriptionConfig) {
    this.fetchImpl = config.fetchImpl ?? fetch;
    if (!config.endpoint.startsWith("https://") || !config.modelsEndpoint.startsWith("https://")) {
      throw new Error("OpenAI endpoint must use HTTPS");
    }
    if (!isLikelyOpenAiKey(config.apiKey)) {
      throw new Error("invalid OpenAI API key format");
    }
  }

  async process(message: ClientMessage): Promise<unknown[]> {
    if (message.type === "start") {
      this.transcript.length = 0;
      return [{ type: "status", status: "processing", provider: "openai" }];
    }
    if (message.type === "stop") {
      return [{ type: "status", status: "ended", provider: "openai" }];
    }
    if (!message.audio) {
      return [{ type: "status", status: "waiting_for_audio_chunk" }];
    }

    const text = await this.transcribe(message);
    if (!text) {
      return [{ type: "status", status: "no_transcript" }];
    }

    const segment = {
      id: `tr-${message.sequence}`,
      text,
      isFinal: true,
      startedAtMs: Date.now() - message.metadata.durationMs,
      updatedAtMs: Date.now(),
    };
    this.transcript.push(text);
    this.transcript.splice(0, Math.max(0, this.transcript.length - 12));

    return [
      { type: "transcript", segment },
      {
        type: "suggestion",
        suggestion: {
          id: `sg-${message.sequence}`,
          kind: "directResponse",
          text: buildSuggestion(this.transcript),
          confidence: 0.67,
          createdAtMs: Date.now(),
        },
      },
    ];
  }

  private async transcribe(message: Extract<ClientMessage, { type: "audio" }>): Promise<string> {
    const audio = message.audio;
    if (!audio) {
      return "";
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);
    try {
      const bytes = Buffer.from(audio.data, "base64");
      const form = new FormData();
      form.append("model", this.config.model);
      form.append("response_format", "json");
      form.append(
        "file",
        new Blob([new Uint8Array(bytes)], { type: audio.mimeType }),
        filenameFor(audio.mimeType),
      );

      const response = await this.fetchImpl(this.config.endpoint, {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.config.apiKey}`,
        },
        body: form,
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`OpenAI transcription failed with status ${response.status}`);
      }
      const body = (await response.json()) as { text?: unknown };
      return typeof body.text === "string" ? body.text.trim().slice(0, 4000) : "";
    } finally {
      clearTimeout(timeout);
    }
  }
}

export async function checkAiProviderFromEnv(
  env: NodeJS.ProcessEnv,
  fetchImpl: typeof fetch = fetch,
): Promise<{ ok: true; provider: "mock" | "openai"; model?: string }> {
  const provider = (env.VOICECHAT_TRANSCRIPTION_PROVIDER ?? "mock").trim().toLowerCase();
  if (provider === "mock" || provider === "local") {
    return { ok: true, provider: "mock" };
  }
  if (provider !== "openai") {
    throw new Error("unsupported transcription provider");
  }
  const apiKey = (env.OPENAI_API_KEY ?? "").trim();
  if (!isLikelyOpenAiKey(apiKey)) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
  const model = env.VOICECHAT_OPENAI_TRANSCRIPTION_MODEL ?? "gpt-4o-mini-transcribe";
  const modelsEndpoint = env.VOICECHAT_OPENAI_MODELS_ENDPOINT ?? "https://api.openai.com/v1/models";
  if (!modelsEndpoint.startsWith("https://")) {
    throw new Error("OpenAI models endpoint must use HTTPS");
  }
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    parsePositiveInt(env.VOICECHAT_OPENAI_TIMEOUT_MS, 20_000),
  );
  try {
    const response = await fetchImpl(modelsEndpoint, {
      method: "GET",
      headers: { authorization: `Bearer ${apiKey}` },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`OpenAI model check failed with status ${response.status}`);
    }
    return { ok: true, provider: "openai", model };
  } finally {
    clearTimeout(timeout);
  }
}

export function isLikelyOpenAiKey(value: string): boolean {
  return /^sk-[A-Za-z0-9_-]{20,}$/.test(value);
}

function filenameFor(mimeType: string): string {
  const extension = mimeType.split("/")[1]?.replace("mpeg", "mp3") || "wav";
  return `voicechat-chunk.${extension}`;
}

function buildSuggestion(transcript: string[]): string {
  const last = transcript.at(-1)?.toLowerCase() ?? "";
  if (last.includes("?")) {
    return "Responda diretamente e confirme o criterio antes de aprofundar.";
  }
  return "Confirme o ponto principal e proponha o proximo passo em uma frase curta.";
}

function parsePositiveInt(value: string | undefined, fallback: number) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
