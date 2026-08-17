use crate::models::{DiagnosticEvent, DiagnosticLevel};
use uuid::Uuid;

pub fn now_ms() -> u64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis() as u64)
        .unwrap_or_default()
}

pub fn diagnostic(level: DiagnosticLevel, code: &str, message: &str) -> DiagnosticEvent {
    DiagnosticEvent {
        id: Uuid::new_v4().to_string(),
        level,
        code: code.to_string(),
        message: crate::security::sanitize_for_display(message),
        at_ms: now_ms(),
    }
}
