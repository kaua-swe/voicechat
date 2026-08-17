use crate::errors::{AppError, AppResult};
use crate::models::{AppSettings, BackendConfig, BackendMode};
use url::Url;

const MAX_ENDPOINT_LEN: usize = 2048;
const MAX_LANGUAGE_LEN: usize = 24;
const MAX_TONE_LEN: usize = 48;
const MAX_SOURCE_ID_LEN: usize = 256;

pub fn sanitize_for_display(input: &str) -> String {
    sanitize_line(input, 240)
}

pub fn sanitize_for_log(input: &str) -> String {
    let lowered = input.to_ascii_lowercase();
    if lowered.contains("authorization:")
        || lowered.contains("bearer ")
        || lowered.contains("api-key")
        || lowered.contains("x-api-key")
        || lowered.contains("sk-")
    {
        return "[redacted-sensitive-value]".to_string();
    }
    sanitize_line(input, 180)
}

fn sanitize_line(input: &str, max_len: usize) -> String {
    let mut clean = input
        .chars()
        .filter(|ch| !ch.is_control() || *ch == '\n' || *ch == '\t')
        .collect::<String>()
        .replace(['\n', '\r'], " ");
    if clean.len() > max_len {
        clean.truncate(max_len);
        clean.push_str("...");
    }
    clean
}

pub fn validate_settings(settings: &AppSettings) -> AppResult<()> {
    validate_backend_config(&settings.backend)?;
    validate_short_text("language", &settings.suggestions.language, MAX_LANGUAGE_LEN)?;
    validate_short_text("tone", &settings.suggestions.tone, MAX_TONE_LEN)?;
    validate_short_text("audio source", &settings.audio.source_id, MAX_SOURCE_ID_LEN)?;
    if settings.suggestions.context_window_seconds == 0
        || settings.suggestions.context_window_seconds > 600
    {
        return Err(AppError::InvalidInput(
            "context window must be between 1 and 600 seconds".to_string(),
        ));
    }
    if settings.suggestions.enabled_kinds.len() > 4 {
        return Err(AppError::InvalidInput(
            "too many suggestion kinds requested".to_string(),
        ));
    }
    Ok(())
}

pub fn validate_backend_config(config: &BackendConfig) -> AppResult<()> {
    if config.endpoint.len() > MAX_ENDPOINT_LEN {
        return Err(AppError::InvalidInput(
            "backend endpoint is too long".to_string(),
        ));
    }

    if config.mode == BackendMode::LocalMock {
        if config.endpoint.trim().is_empty() {
            return Ok(());
        }
        let parsed = Url::parse(config.endpoint.trim()).map_err(|_| {
            AppError::InvalidInput("backend endpoint is not a valid URL".to_string())
        })?;
        let scheme = parsed.scheme();
        let is_loopback = is_loopback_host(&parsed);
        if is_loopback && matches!(scheme, "http" | "ws" | "https" | "wss") {
            return reject_url_credentials(&parsed);
        }
        if matches!(scheme, "https" | "wss") {
            return reject_url_credentials(&parsed);
        }
        return Err(AppError::Security(
            "local mock mode accepts only HTTPS/WSS or loopback HTTP/WS endpoints".to_string(),
        ));
    }

    let parsed = Url::parse(config.endpoint.trim())
        .map_err(|_| AppError::InvalidInput("backend endpoint is not a valid URL".to_string()))?;
    reject_url_credentials(&parsed)?;

    let scheme = parsed.scheme();
    if matches!(scheme, "https" | "wss") {
        return Ok(());
    }

    if config.allow_insecure_localhost
        && is_loopback_host(&parsed)
        && matches!(scheme, "http" | "ws")
    {
        return Ok(());
    }

    Err(AppError::Security(
        "remote backend must use HTTPS or WSS; loopback HTTP/WS is allowed only when explicitly enabled for local development".to_string(),
    ))
}

fn reject_url_credentials(url: &Url) -> AppResult<()> {
    if !url.username().is_empty() || url.password().is_some() {
        return Err(AppError::Security(
            "backend endpoint must not embed credentials in the URL".to_string(),
        ));
    }
    if url.host_str().is_none() {
        return Err(AppError::InvalidInput(
            "backend endpoint must include a host".to_string(),
        ));
    }
    Ok(())
}

fn is_loopback_host(url: &Url) -> bool {
    matches!(
        url.host_str().map(|host| host.to_ascii_lowercase()),
        Some(host) if host == "localhost" || host == "127.0.0.1" || host == "::1"
    )
}

fn validate_short_text(field: &str, value: &str, max_len: usize) -> AppResult<()> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return Err(AppError::InvalidInput(format!("{field} is required")));
    }
    if trimmed.len() > max_len {
        return Err(AppError::InvalidInput(format!("{field} is too long")));
    }
    if trimmed.chars().any(|ch| ch.is_control()) {
        return Err(AppError::InvalidInput(format!(
            "{field} contains control characters"
        )));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::{AuthMode, BackendConfig, BackendMode};

    #[test]
    fn rejects_remote_http_without_local_override() {
        let config = BackendConfig {
            mode: BackendMode::SecureRemote,
            endpoint: "http://api.example.com".to_string(),
            auth_mode: AuthMode::StoredBearerToken,
            allow_insecure_localhost: false,
        };
        assert!(validate_backend_config(&config).is_err());
    }

    #[test]
    fn accepts_remote_https() {
        let config = BackendConfig {
            mode: BackendMode::SecureRemote,
            endpoint: "https://api.example.com/v1".to_string(),
            auth_mode: AuthMode::StoredBearerToken,
            allow_insecure_localhost: false,
        };
        assert!(validate_backend_config(&config).is_ok());
    }

    #[test]
    fn rejects_credentials_in_endpoint() {
        let config = BackendConfig {
            mode: BackendMode::SecureRemote,
            endpoint: "https://token@example.com".to_string(),
            auth_mode: AuthMode::StoredBearerToken,
            allow_insecure_localhost: false,
        };
        assert!(validate_backend_config(&config).is_err());
    }

    #[test]
    fn redacts_obvious_secret_patterns() {
        assert_eq!(
            sanitize_for_log("Authorization: Bearer abc"),
            "[redacted-sensitive-value]"
        );
        assert_eq!(sanitize_for_log("sk-test"), "[redacted-sensitive-value]");
    }
}
