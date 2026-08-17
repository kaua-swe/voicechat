use serde::{Deserialize, Serialize};

pub const PROTOCOL_VERSION: u16 = 1;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
#[serde(rename_all = "camelCase")]
pub enum BackendMode {
    #[default]
    LocalMock,
    SecureRemote,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
#[serde(rename_all = "camelCase")]
pub enum AuthMode {
    #[default]
    None,
    StoredBearerToken,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum AudioSourceKind {
    SystemLoopback,
    InputDevice,
    DevelopmentMock,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum SuggestionKind {
    DirectResponse,
    ClarifyingQuestion,
    Summary,
    NextAction,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
#[serde(rename_all = "camelCase")]
pub enum SessionStatus {
    #[default]
    Ready,
    Connecting,
    Capturing,
    Processing,
    Paused,
    Error,
    Ended,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BackendConfig {
    pub mode: BackendMode,
    pub endpoint: String,
    pub auth_mode: AuthMode,
    pub allow_insecure_localhost: bool,
}

impl Default for BackendConfig {
    fn default() -> Self {
        Self {
            mode: BackendMode::LocalMock,
            endpoint: "https://voice-chat-backend.example.invalid".to_string(),
            auth_mode: AuthMode::None,
            allow_insecure_localhost: false,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AudioSelection {
    pub source_id: String,
    pub kind: AudioSourceKind,
}

impl Default for AudioSelection {
    fn default() -> Self {
        Self {
            source_id: "dev-mock".to_string(),
            kind: AudioSourceKind::DevelopmentMock,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SuggestionPreferences {
    pub language: String,
    pub tone: String,
    pub context_window_seconds: u16,
    pub enabled_kinds: Vec<SuggestionKind>,
}

impl Default for SuggestionPreferences {
    fn default() -> Self {
        Self {
            language: "pt-BR".to_string(),
            tone: "profissional".to_string(),
            context_window_seconds: 90,
            enabled_kinds: vec![
                SuggestionKind::DirectResponse,
                SuggestionKind::ClarifyingQuestion,
                SuggestionKind::NextAction,
            ],
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PrivacySettings {
    pub retain_local_transcript: bool,
    pub retain_diagnostics: bool,
    pub sanitize_logs: bool,
}

impl Default for PrivacySettings {
    fn default() -> Self {
        Self {
            retain_local_transcript: false,
            retain_diagnostics: true,
            sanitize_logs: true,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub backend: BackendConfig,
    pub audio: AudioSelection,
    pub suggestions: SuggestionPreferences,
    pub privacy: PrivacySettings,
    pub always_on_top: bool,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            backend: BackendConfig::default(),
            audio: AudioSelection::default(),
            suggestions: SuggestionPreferences::default(),
            privacy: PrivacySettings::default(),
            always_on_top: true,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AudioDevice {
    pub id: String,
    pub label: String,
    pub kind: AudioSourceKind,
    pub is_default: bool,
    pub sample_rate: Option<u32>,
    pub channels: Option<u16>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeStatus {
    pub protocol_version: u16,
    pub platform: String,
    pub windows_only: bool,
    pub active_session_id: Option<String>,
    pub status: SessionStatus,
    pub backend_mode: BackendMode,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TranscriptSegment {
    pub id: String,
    pub text: String,
    pub is_final: bool,
    pub speaker: Option<String>,
    pub started_at_ms: u64,
    pub updated_at_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Suggestion {
    pub id: String,
    pub kind: SuggestionKind,
    pub text: String,
    pub confidence: f32,
    pub created_at_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DiagnosticEvent {
    pub id: String,
    pub level: DiagnosticLevel,
    pub code: String,
    pub message: String,
    pub at_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum DiagnosticLevel {
    Info,
    Warn,
    Error,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionSnapshot {
    pub session_id: Option<String>,
    pub status: SessionStatus,
    pub transcript: Vec<TranscriptSegment>,
    pub suggestions: Vec<Suggestion>,
    pub diagnostics: Vec<DiagnosticEvent>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum SessionEvent {
    Status {
        session_id: String,
        status: SessionStatus,
    },
    Transcript {
        session_id: String,
        segment: TranscriptSegment,
    },
    Suggestion {
        session_id: String,
        suggestion: Suggestion,
    },
    Diagnostic {
        session_id: Option<String>,
        event: DiagnosticEvent,
    },
}
