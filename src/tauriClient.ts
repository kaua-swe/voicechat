import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type {
  AppSettings,
  AudioDevice,
  BackendValidationResult,
  RuntimeStatus,
  SessionEvent,
  SessionSnapshot,
} from "./types";
import { defaultSettings } from "./lib/defaults";
import { emptySnapshot } from "./lib/sessionReducer";

const hasTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

export const tauriClient = {
  async runtimeStatus(): Promise<RuntimeStatus> {
    if (!hasTauri) {
      return {
        protocolVersion: 1,
        platform: "browser-preview",
        windowsOnly: false,
        status: "ready",
        backendMode: "localMock",
      };
    }
    return invoke<RuntimeStatus>("get_runtime_status");
  },

  async listAudioDevices(): Promise<AudioDevice[]> {
    if (!hasTauri) {
      return [
        {
          id: "dev-mock",
          label: "Sinal local de desenvolvimento",
          kind: "developmentMock",
          isDefault: true,
          sampleRate: 16000,
          channels: 1,
        },
      ];
    }
    return invoke<AudioDevice[]>("list_audio_devices");
  },

  async loadSettings(): Promise<AppSettings> {
    if (!hasTauri) {
      return defaultSettings;
    }
    return invoke<AppSettings>("load_settings");
  },

  async saveSettings(settings: AppSettings): Promise<AppSettings> {
    if (!hasTauri) {
      return settings;
    }
    return invoke<AppSettings>("save_settings", { settings });
  },

  async saveBackendToken(token: string): Promise<boolean> {
    if (!hasTauri) {
      return token.trim().length >= 8;
    }
    return invoke<boolean>("save_backend_token", { token });
  },

  async clearBackendToken(): Promise<boolean> {
    if (!hasTauri) {
      return true;
    }
    return invoke<boolean>("clear_backend_token");
  },

  async validateBackend(settings: AppSettings): Promise<BackendValidationResult> {
    if (!hasTauri) {
      return {
        ok: true,
        mode: settings.backend.mode,
        secureTransport: true,
        tokenAvailable: false,
        message: "Preview local sem backend externo.",
      };
    }
    return invoke<BackendValidationResult>("validate_backend", { settings });
  },

  async startSession(settings: AppSettings): Promise<SessionSnapshot> {
    if (!hasTauri) {
      return { ...emptySnapshot, status: "capturing", sessionId: "preview" };
    }
    return invoke<SessionSnapshot>("start_session", { settings });
  },

  async pauseSession(): Promise<SessionSnapshot> {
    if (!hasTauri) {
      return { ...emptySnapshot, status: "paused", sessionId: "preview" };
    }
    return invoke<SessionSnapshot>("pause_session");
  },

  async resumeSession(): Promise<SessionSnapshot> {
    if (!hasTauri) {
      return { ...emptySnapshot, status: "capturing", sessionId: "preview" };
    }
    return invoke<SessionSnapshot>("resume_session");
  },

  async stopSession(): Promise<SessionSnapshot> {
    if (!hasTauri) {
      return { ...emptySnapshot, status: "ended", sessionId: "preview" };
    }
    return invoke<SessionSnapshot>("stop_session");
  },

  async clearSessionData(): Promise<SessionSnapshot> {
    if (!hasTauri) {
      return emptySnapshot;
    }
    return invoke<SessionSnapshot>("clear_session_data");
  },

  async setAlwaysOnTop(enabled: boolean): Promise<boolean> {
    if (!hasTauri) {
      return enabled;
    }
    return invoke<boolean>("set_always_on_top", { enabled });
  },

  async onSessionEvent(handler: (event: SessionEvent) => void): Promise<UnlistenFn> {
    if (!hasTauri) {
      return () => undefined;
    }
    return listen<SessionEvent>("voicechat-session-event", (event) => handler(event.payload));
  },
};
