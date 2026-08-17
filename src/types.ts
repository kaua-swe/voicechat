export type BackendMode = "localMock" | "secureRemote";
export type AuthMode = "none" | "storedBearerToken";
export type AudioSourceKind = "systemLoopback" | "inputDevice" | "developmentMock";
export type SuggestionKind =
  | "directResponse"
  | "clarifyingQuestion"
  | "summary"
  | "nextAction";
export type SessionStatus =
  | "ready"
  | "connecting"
  | "capturing"
  | "processing"
  | "paused"
  | "error"
  | "ended";
export type DiagnosticLevel = "info" | "warn" | "error";

export interface BackendConfig {
  mode: BackendMode;
  endpoint: string;
  authMode: AuthMode;
  allowInsecureLocalhost: boolean;
}

export interface AudioSelection {
  sourceId: string;
  kind: AudioSourceKind;
}

export interface SuggestionPreferences {
  language: string;
  tone: string;
  contextWindowSeconds: number;
  enabledKinds: SuggestionKind[];
}

export interface PrivacySettings {
  retainLocalTranscript: boolean;
  retainDiagnostics: boolean;
  sanitizeLogs: boolean;
}

export interface AppSettings {
  backend: BackendConfig;
  audio: AudioSelection;
  suggestions: SuggestionPreferences;
  privacy: PrivacySettings;
  alwaysOnTop: boolean;
}

export interface AudioDevice {
  id: string;
  label: string;
  kind: AudioSourceKind;
  isDefault: boolean;
  sampleRate?: number;
  channels?: number;
}

export interface RuntimeStatus {
  protocolVersion: number;
  platform: string;
  windowsOnly: boolean;
  activeSessionId?: string;
  status: SessionStatus;
  backendMode: BackendMode;
}

export interface TranscriptSegment {
  id: string;
  text: string;
  isFinal: boolean;
  speaker?: string;
  startedAtMs: number;
  updatedAtMs: number;
}

export interface Suggestion {
  id: string;
  kind: SuggestionKind;
  text: string;
  confidence: number;
  createdAtMs: number;
}

export interface DiagnosticEvent {
  id: string;
  level: DiagnosticLevel;
  code: string;
  message: string;
  atMs: number;
}

export interface SessionSnapshot {
  sessionId?: string;
  status: SessionStatus;
  transcript: TranscriptSegment[];
  suggestions: Suggestion[];
  diagnostics: DiagnosticEvent[];
}

export type SessionEvent =
  | { type: "status"; sessionId: string; status: SessionStatus }
  | { type: "transcript"; sessionId: string; segment: TranscriptSegment }
  | { type: "suggestion"; sessionId: string; suggestion: Suggestion }
  | { type: "diagnostic"; sessionId?: string; event: DiagnosticEvent };

export interface BackendValidationResult {
  ok: boolean;
  mode: BackendMode;
  secureTransport: boolean;
  tokenAvailable: boolean;
  message: string;
}
