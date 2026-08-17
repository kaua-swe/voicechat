use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("invalid input: {0}")]
    InvalidInput(String),
    #[error("security policy rejected request: {0}")]
    Security(String),
    #[error("settings error: {0}")]
    Settings(String),
    #[error("audio error: {0}")]
    Audio(String),
    #[error("session error: {0}")]
    Session(String),
    #[error("backend error: {0}")]
    Backend(String),
    #[error("window error: {0}")]
    Window(String),
    #[error("internal error")]
    Internal,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ErrorEnvelope {
    pub code: &'static str,
    pub message: String,
}

impl AppError {
    pub fn code(&self) -> &'static str {
        match self {
            Self::InvalidInput(_) => "invalid_input",
            Self::Security(_) => "security_policy",
            Self::Settings(_) => "settings_error",
            Self::Audio(_) => "audio_error",
            Self::Session(_) => "session_error",
            Self::Backend(_) => "backend_error",
            Self::Window(_) => "window_error",
            Self::Internal => "internal_error",
        }
    }

    pub fn into_envelope(self) -> ErrorEnvelope {
        ErrorEnvelope {
            code: self.code(),
            message: crate::security::sanitize_for_display(&self.to_string()),
        }
    }
}

pub type AppResult<T> = Result<T, AppError>;

pub fn command_error(err: AppError) -> String {
    serde_json::to_string(&err.into_envelope()).unwrap_or_else(|_| {
        "{\"code\":\"internal_error\",\"message\":\"internal error\"}".to_string()
    })
}
