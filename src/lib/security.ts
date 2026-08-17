import type { AppSettings, BackendConfig } from "../types";

export interface ValidationResult {
  ok: boolean;
  message: string;
}

export function validateBackendConfig(config: BackendConfig): ValidationResult {
  if (config.endpoint.length > 2048) {
    return { ok: false, message: "Endpoint muito longo." };
  }

  let parsed: URL;
  try {
    parsed = new URL(config.endpoint);
  } catch {
    return { ok: false, message: "Endpoint invalido." };
  }

  if (parsed.username || parsed.password) {
    return { ok: false, message: "Nao embuta credenciais na URL." };
  }

  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname);
  const secure = parsed.protocol === "https:" || parsed.protocol === "wss:";
  const localDev =
    config.allowInsecureLocalhost &&
    loopback &&
    (parsed.protocol === "http:" || parsed.protocol === "ws:");

  if (config.mode === "secureRemote" && !secure && !localDev) {
    return { ok: false, message: "Backend remoto exige HTTPS ou WSS." };
  }

  if (config.mode === "localMock" && !secure && !loopback) {
    return { ok: false, message: "Mock local aceita somente HTTPS/WSS ou loopback." };
  }

  return { ok: true, message: "Configuracao aceita." };
}

export function validateSettings(settings: AppSettings): ValidationResult {
  const backend = validateBackendConfig(settings.backend);
  if (!backend.ok) {
    return backend;
  }
  if (!settings.suggestions.language.trim()) {
    return { ok: false, message: "Idioma obrigatorio." };
  }
  if (settings.suggestions.contextWindowSeconds < 1 || settings.suggestions.contextWindowSeconds > 600) {
    return { ok: false, message: "Janela de contexto fora do intervalo." };
  }
  return { ok: true, message: "Configuracao aceita." };
}

export function parseCommandError(value: unknown): string {
  if (typeof value !== "string") {
    return "Erro inesperado.";
  }
  try {
    const parsed = JSON.parse(value) as { message?: string };
    return parsed.message ?? "Erro inesperado.";
  } catch {
    return value.slice(0, 240);
  }
}
