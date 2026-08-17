import {
  AlertTriangle,
  Check,
  Copy,
  Eraser,
  Loader2,
  Mic,
  Pause,
  Play,
  RotateCcw,
  Settings,
  Shield,
  Square,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { defaultSettings } from "../lib/defaults";
import { applySessionEvent, emptySnapshot } from "../lib/sessionReducer";
import { parseCommandError, validateSettings } from "../lib/security";
import { tauriClient } from "../tauriClient";
import type {
  AppSettings,
  AudioDevice,
  BackendMode,
  SessionSnapshot,
  SuggestionKind,
} from "../types";

const suggestionLabels: Record<SuggestionKind, string> = {
  directResponse: "Resposta",
  clarifyingQuestion: "Pergunta",
  summary: "Resumo",
  nextAction: "Acao",
};

const statusLabels: Record<SessionSnapshot["status"], string> = {
  ready: "Pronto",
  connecting: "Conectando",
  capturing: "Capturando",
  processing: "Processando",
  paused: "Pausado",
  error: "Erro",
  ended: "Encerrado",
};

export function App() {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [snapshot, setSnapshot] = useState<SessionSnapshot>(emptySnapshot);
  const [devices, setDevices] = useState<AudioDevice[]>([]);
  const [activeTab, setActiveTab] = useState<"live" | "settings" | "diagnostics">("live");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string>("");
  const [tokenDraft, setTokenDraft] = useState("");

  useEffect(() => {
    void boot();
    void tauriClient.onSessionEvent((event) => {
      setSnapshot((current) => applySessionEvent(current, event));
    });
  }, []);

  const validation = useMemo(() => validateSettings(settings), [settings]);
  const active = snapshot.status === "capturing" || snapshot.status === "processing";
  const paused = snapshot.status === "paused";

  async function boot() {
    try {
      const [loaded, audioDevices, runtime] = await Promise.all([
        tauriClient.loadSettings(),
        tauriClient.listAudioDevices(),
        tauriClient.runtimeStatus(),
      ]);
      setSettings(loaded);
      setDevices(audioDevices);
      setSnapshot((current) => ({ ...current, status: runtime.status }));
    } catch (error) {
      setNotice(parseCommandError(error));
    }
  }

  async function runAction(action: () => Promise<SessionSnapshot | AppSettings | boolean>) {
    setBusy(true);
    setNotice("");
    try {
      const result = await action();
      if (typeof result === "object" && "status" in result && "transcript" in result) {
        setSnapshot(result);
      }
    } catch (error) {
      setNotice(parseCommandError(error));
      setSnapshot((current) => ({ ...current, status: "error" }));
    } finally {
      setBusy(false);
    }
  }

  function updateSettings(patch: Partial<AppSettings>) {
    setSettings((current) => ({ ...current, ...patch }));
  }

  function updateBackend(mode: BackendMode) {
    setSettings((current) => ({
      ...current,
      backend: {
        ...current.backend,
        mode,
        authMode: mode === "secureRemote" ? "storedBearerToken" : "none",
      },
    }));
  }

  async function copyText(text: string) {
    await navigator.clipboard.writeText(text);
    setNotice("Copiado.");
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <div className="product-name">Voice Chat</div>
          <div className={`status-pill status-${snapshot.status}`}>
            <span className="status-dot" />
            {statusLabels[snapshot.status]}
          </div>
        </div>
        <div className="top-actions">
          <button
            className="icon-button"
            title="Manter acima"
            aria-label="Manter acima"
            onClick={() => {
              const next = !settings.alwaysOnTop;
              updateSettings({ alwaysOnTop: next });
              void tauriClient.setAlwaysOnTop(next);
            }}
          >
            <Shield size={18} />
          </button>
          <button
            className="icon-button"
            title="Configuracoes"
            aria-label="Configuracoes"
            onClick={() => setActiveTab(activeTab === "settings" ? "live" : "settings")}
          >
            <Settings size={18} />
          </button>
        </div>
      </header>

      <section className="controls" aria-label="Controles da sessao">
        <button
          className="primary-action"
          disabled={busy || !validation.ok || active}
          onClick={() => runAction(() => tauriClient.startSession(settings))}
        >
          {busy ? <Loader2 className="spin" size={17} /> : <Play size={17} />}
          Iniciar
        </button>
        <button disabled={busy || !active} onClick={() => runAction(() => tauriClient.pauseSession())}>
          <Pause size={17} />
          Pausar
        </button>
        <button disabled={busy || !paused} onClick={() => runAction(() => tauriClient.resumeSession())}>
          <RotateCcw size={17} />
          Retomar
        </button>
        <button disabled={busy || (!active && !paused)} onClick={() => runAction(() => tauriClient.stopSession())}>
          <Square size={17} />
          Encerrar
        </button>
      </section>

      <nav className="tabs" aria-label="Vistas">
        <button className={activeTab === "live" ? "selected" : ""} onClick={() => setActiveTab("live")}>
          Ao vivo
        </button>
        <button className={activeTab === "settings" ? "selected" : ""} onClick={() => setActiveTab("settings")}>
          Config
        </button>
        <button
          className={activeTab === "diagnostics" ? "selected" : ""}
          onClick={() => setActiveTab("diagnostics")}
        >
          Diag
        </button>
      </nav>

      {notice ? <div className="notice">{notice}</div> : null}
      {!validation.ok ? <div className="notice error">{validation.message}</div> : null}

      {activeTab === "live" ? (
        <LivePanel snapshot={snapshot} onCopy={copyText} />
      ) : activeTab === "settings" ? (
        <SettingsPanel
          settings={settings}
          devices={devices}
          tokenDraft={tokenDraft}
          setTokenDraft={setTokenDraft}
          updateSettings={setSettings}
          updateBackend={updateBackend}
          saveSettings={() => runAction(() => tauriClient.saveSettings(settings))}
          saveToken={() =>
            runAction(async () => {
              const saved = await tauriClient.saveBackendToken(tokenDraft);
              setTokenDraft("");
              setNotice("Token salvo no cofre local.");
              return saved;
            })
          }
          clearToken={() =>
            runAction(async () => {
              const cleared = await tauriClient.clearBackendToken();
              setNotice("Token removido.");
              return cleared;
            })
          }
          validateBackend={() =>
            runAction(async () => {
              const result = await tauriClient.validateBackend(settings);
              setNotice(result.message);
              return true;
            })
          }
        />
      ) : (
        <DiagnosticsPanel snapshot={snapshot} onClear={() => runAction(() => tauriClient.clearSessionData())} />
      )}
    </main>
  );
}

function LivePanel({
  snapshot,
  onCopy,
}: {
  snapshot: SessionSnapshot;
  onCopy: (text: string) => Promise<void>;
}) {
  return (
    <section className="live-grid">
      <div className="panel transcript-panel">
        <div className="panel-title">
          <Mic size={16} />
          Transcricao
        </div>
        <div className="transcript-list">
          {snapshot.transcript.length === 0 ? (
            <div className="empty">Aguardando fluxo de audio.</div>
          ) : (
            snapshot.transcript.map((segment) => (
              <div key={segment.id} className={`transcript-line ${segment.isFinal ? "final" : "partial"}`}>
                <span>{segment.text}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="panel suggestion-panel">
        <div className="panel-title">
          <Check size={16} />
          Sugestoes
        </div>
        <div className="suggestion-list">
          {snapshot.suggestions.length === 0 ? (
            <div className="empty">Sem sugestoes ainda.</div>
          ) : (
            snapshot.suggestions.map((suggestion) => (
              <article key={suggestion.id} className="suggestion-item">
                <div className="suggestion-meta">
                  <span>{suggestionLabels[suggestion.kind]}</span>
                  <span>{Math.round(suggestion.confidence * 100)}%</span>
                </div>
                <p>{suggestion.text}</p>
                <button className="copy-button" onClick={() => onCopy(suggestion.text)}>
                  <Copy size={15} />
                  Copiar
                </button>
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function SettingsPanel({
  settings,
  devices,
  tokenDraft,
  setTokenDraft,
  updateSettings,
  updateBackend,
  saveSettings,
  saveToken,
  clearToken,
  validateBackend,
}: {
  settings: AppSettings;
  devices: AudioDevice[];
  tokenDraft: string;
  setTokenDraft: (value: string) => void;
  updateSettings: (settings: AppSettings) => void;
  updateBackend: (mode: BackendMode) => void;
  saveSettings: () => void;
  saveToken: () => void;
  clearToken: () => void;
  validateBackend: () => void;
}) {
  const selectedDevice = devices.find((device) => device.id === settings.audio.sourceId);

  return (
    <section className="settings-stack">
      <div className="field-row">
        <label>Backend</label>
        <div className="segmented">
          <button
            className={settings.backend.mode === "localMock" ? "selected" : ""}
            onClick={() => updateBackend("localMock")}
          >
            Local
          </button>
          <button
            className={settings.backend.mode === "secureRemote" ? "selected" : ""}
            onClick={() => updateBackend("secureRemote")}
          >
            Remoto
          </button>
        </div>
      </div>

      <label className="field">
        Endpoint
        <input
          value={settings.backend.endpoint}
          onChange={(event) =>
            updateSettings({
              ...settings,
              backend: { ...settings.backend, endpoint: event.currentTarget.value },
            })
          }
        />
      </label>

      <label className="check-row">
        <input
          type="checkbox"
          checked={settings.backend.allowInsecureLocalhost}
          onChange={(event) =>
            updateSettings({
              ...settings,
              backend: {
                ...settings.backend,
                allowInsecureLocalhost: event.currentTarget.checked,
              },
            })
          }
        />
        Loopback HTTP/WS local
      </label>

      <div className="field compact-token">
        <label>Token do backend</label>
        <div className="token-row">
          <input
            type="password"
            value={tokenDraft}
            placeholder="armazenado no cofre"
            onChange={(event) => setTokenDraft(event.currentTarget.value)}
          />
          <button disabled={tokenDraft.trim().length < 8} onClick={saveToken}>
            Salvar
          </button>
          <button onClick={clearToken}>Limpar</button>
        </div>
      </div>

      <label className="field">
        Fonte de audio
        <select
          value={settings.audio.sourceId}
          onChange={(event) => {
            const device = devices.find((item) => item.id === event.currentTarget.value);
            if (!device) return;
            updateSettings({
              ...settings,
              audio: { sourceId: device.id, kind: device.kind },
            });
          }}
        >
          {devices.map((device) => (
            <option key={device.id} value={device.id}>
              {device.label}
            </option>
          ))}
        </select>
      </label>

      {selectedDevice ? (
        <div className="device-meta">
          {selectedDevice.sampleRate ?? "-"} Hz · {selectedDevice.channels ?? "-"} canal(is)
        </div>
      ) : null}

      <div className="settings-grid">
        <label className="field">
          Idioma
          <input
            value={settings.suggestions.language}
            onChange={(event) =>
              updateSettings({
                ...settings,
                suggestions: { ...settings.suggestions, language: event.currentTarget.value },
              })
            }
          />
        </label>
        <label className="field">
          Tom
          <input
            value={settings.suggestions.tone}
            onChange={(event) =>
              updateSettings({
                ...settings,
                suggestions: { ...settings.suggestions, tone: event.currentTarget.value },
              })
            }
          />
        </label>
      </div>

      <label className="field">
        Contexto
        <input
          type="range"
          min={15}
          max={300}
          step={15}
          value={settings.suggestions.contextWindowSeconds}
          onChange={(event) =>
            updateSettings({
              ...settings,
              suggestions: {
                ...settings.suggestions,
                contextWindowSeconds: Number(event.currentTarget.value),
              },
            })
          }
        />
        <span className="range-value">{settings.suggestions.contextWindowSeconds}s</span>
      </label>

      <div className="action-row">
        <button onClick={validateBackend}>
          <Shield size={16} />
          Validar
        </button>
        <button onClick={saveSettings}>
          <Check size={16} />
          Salvar
        </button>
      </div>
    </section>
  );
}

function DiagnosticsPanel({
  snapshot,
  onClear,
}: {
  snapshot: SessionSnapshot;
  onClear: () => void;
}) {
  return (
    <section className="panel diagnostics-panel">
      <div className="panel-title">
        <AlertTriangle size={16} />
        Diagnosticos
      </div>
      <div className="diagnostics-list">
        {snapshot.diagnostics.length === 0 ? (
          <div className="empty">Sem eventos.</div>
        ) : (
          snapshot.diagnostics.map((event) => (
            <div key={event.id} className={`diagnostic ${event.level}`}>
              <span>{event.code}</span>
              <p>{event.message}</p>
            </div>
          ))
        )}
      </div>
      <button className="clear-button" onClick={onClear}>
        <Eraser size={16} />
        Limpar
      </button>
    </section>
  );
}
