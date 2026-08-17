import type { AppSettings } from "../types";

export const defaultSettings: AppSettings = {
  backend: {
    mode: "localMock",
    endpoint: "https://voice-chat-backend.example.invalid",
    authMode: "none",
    allowInsecureLocalhost: false,
  },
  audio: {
    sourceId: "dev-mock",
    kind: "developmentMock",
  },
  suggestions: {
    language: "pt-BR",
    tone: "profissional",
    contextWindowSeconds: 90,
    enabledKinds: ["directResponse", "clarifyingQuestion", "nextAction"],
  },
  privacy: {
    retainLocalTranscript: false,
    retainDiagnostics: true,
    sanitizeLogs: true,
  },
  alwaysOnTop: true,
};
