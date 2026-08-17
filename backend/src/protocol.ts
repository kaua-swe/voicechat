export interface AudioMetadata {
  sampleRate: number;
  channels: number;
  rms: number;
  peak: number;
  durationMs: number;
}

export type ClientMessage =
  | { type: "start"; sessionId: string; language: string; tone: string }
  | { type: "audio"; sessionId: string; sequence: number; metadata: AudioMetadata }
  | { type: "stop"; sessionId: string };

export function validateClientMessage(value: unknown): ClientMessage {
  if (!value || typeof value !== "object") {
    throw new Error("message must be an object");
  }
  const message = value as Record<string, unknown>;
  if (message.type === "start") {
    return {
      type: "start",
      sessionId: validateId(message.sessionId),
      language: validateShortText(message.language, 24),
      tone: validateShortText(message.tone, 48),
    };
  }
  if (message.type === "audio") {
    return {
      type: "audio",
      sessionId: validateId(message.sessionId),
      sequence: validateSequence(message.sequence),
      metadata: validateAudioMetadata(message.metadata),
    };
  }
  if (message.type === "stop") {
    return { type: "stop", sessionId: validateId(message.sessionId) };
  }
  throw new Error("unknown message type");
}

function validateAudioMetadata(value: unknown): AudioMetadata {
  if (!value || typeof value !== "object") {
    throw new Error("metadata must be an object");
  }
  const metadata = value as Record<string, unknown>;
  const sampleRate = numberInRange(metadata.sampleRate, 8000, 96000, "sampleRate");
  const channels = numberInRange(metadata.channels, 1, 8, "channels");
  const rms = numberInRange(metadata.rms, 0, 1, "rms");
  const peak = numberInRange(metadata.peak, 0, 1, "peak");
  const durationMs = numberInRange(metadata.durationMs, 1, 1000, "durationMs");
  return { sampleRate, channels, rms, peak, durationMs };
}

function validateId(value: unknown): string {
  if (typeof value !== "string" || !/^[a-zA-Z0-9_-]{1,80}$/.test(value)) {
    throw new Error("invalid session id");
  }
  return value;
}

function validateShortText(value: unknown, max: number): string {
  if (typeof value !== "string" || value.trim().length === 0 || value.length > max) {
    throw new Error("invalid text");
  }
  if (/[\r\n\t]/.test(value)) {
    throw new Error("invalid control character");
  }
  return value;
}

function validateSequence(value: unknown): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new Error("invalid sequence");
  }
  return value as number;
}

function numberInRange(value: unknown, min: number, max: number, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    throw new Error(`invalid ${field}`);
  }
  return value;
}
