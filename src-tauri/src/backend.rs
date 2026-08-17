use crate::errors::{AppError, AppResult};
use crate::models::{AuthMode, BackendConfig, BackendMode};
use crate::security;
use crate::settings::SettingsStore;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BackendValidationResult {
    pub ok: bool,
    pub mode: BackendMode,
    pub secure_transport: bool,
    pub token_available: bool,
    pub message: String,
}

pub fn validate_backend_for_session(
    config: &BackendConfig,
    store: &SettingsStore,
) -> AppResult<BackendValidationResult> {
    security::validate_backend_config(config)?;
    let token_available = store.backend_token_available();

    if config.mode == BackendMode::SecureRemote
        && config.auth_mode == AuthMode::StoredBearerToken
        && !token_available
    {
        return Err(AppError::Backend(
            "remote backend requires a stored bearer token".to_string(),
        ));
    }

    let secure_transport = config.endpoint.starts_with("https://")
        || config.endpoint.starts_with("wss://")
        || (config.allow_insecure_localhost
            && (config.endpoint.starts_with("http://127.0.0.1")
                || config.endpoint.starts_with("http://localhost")
                || config.endpoint.starts_with("ws://127.0.0.1")
                || config.endpoint.starts_with("ws://localhost")));

    Ok(BackendValidationResult {
        ok: true,
        mode: config.mode.clone(),
        secure_transport,
        token_available,
        message: match config.mode {
            BackendMode::LocalMock => {
                "adaptador local de desenvolvimento ativo; nenhum segredo externo necessario"
                    .to_string()
            }
            BackendMode::SecureRemote => {
                "backend remoto configurado com politica de transporte validada".to_string()
            }
        },
    })
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StreamingEnvelope<T> {
    pub protocol_version: u16,
    pub session_id: String,
    pub sequence: u64,
    pub payload: T,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AudioChunkMetadata {
    pub sample_rate: u32,
    pub channels: u16,
    pub rms: f32,
    pub peak: f32,
    pub duration_ms: u16,
}

pub fn validate_audio_metadata(meta: &AudioChunkMetadata) -> AppResult<()> {
    if !(8_000..=96_000).contains(&meta.sample_rate) {
        return Err(AppError::InvalidInput("invalid sample rate".to_string()));
    }
    if meta.channels == 0 || meta.channels > 8 {
        return Err(AppError::InvalidInput("invalid channel count".to_string()));
    }
    if !meta.rms.is_finite() || !meta.peak.is_finite() || meta.rms < 0.0 || meta.peak < 0.0 {
        return Err(AppError::InvalidInput("invalid audio level".to_string()));
    }
    if meta.duration_ms == 0 || meta.duration_ms > 1000 {
        return Err(AppError::InvalidInput("invalid chunk duration".to_string()));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validates_audio_metadata_bounds() {
        let valid = AudioChunkMetadata {
            sample_rate: 48_000,
            channels: 2,
            rms: 0.1,
            peak: 0.4,
            duration_ms: 250,
        };
        assert!(validate_audio_metadata(&valid).is_ok());
        let invalid = AudioChunkMetadata {
            sample_rate: 1,
            ..valid
        };
        assert!(validate_audio_metadata(&invalid).is_err());
    }

    #[test]
    fn streaming_envelope_is_versioned() {
        let envelope = StreamingEnvelope {
            protocol_version: crate::models::PROTOCOL_VERSION,
            session_id: "session".to_string(),
            sequence: 7,
            payload: "chunk",
        };
        let encoded = serde_json::to_string(&envelope).unwrap();
        assert!(encoded.contains("protocolVersion"));
        assert!(encoded.contains("sequence"));
    }
}
