use crate::errors::{AppError, AppResult};
use crate::models::AppSettings;
use crate::security;
use std::fs;
use std::path::PathBuf;

const SETTINGS_FILE: &str = "settings.json";
const SERVICE_NAME: &str = "com.voicechat.desktop";
const BACKEND_TOKEN_ACCOUNT: &str = "backend-token";

#[derive(Debug, Clone)]
pub struct SettingsStore {
    app_data_dir: PathBuf,
}

impl SettingsStore {
    pub fn new(app_data_dir: PathBuf) -> Self {
        Self { app_data_dir }
    }

    pub fn load(&self) -> AppResult<AppSettings> {
        let path = self.settings_path();
        if !path.exists() {
            return Ok(AppSettings::default());
        }
        let raw = fs::read_to_string(&path)
            .map_err(|err| AppError::Settings(format!("failed to read settings: {err}")))?;
        let settings: AppSettings = serde_json::from_str(&raw)
            .map_err(|err| AppError::Settings(format!("failed to parse settings: {err}")))?;
        security::validate_settings(&settings)?;
        Ok(settings)
    }

    pub fn save(&self, settings: &AppSettings) -> AppResult<()> {
        security::validate_settings(settings)?;
        fs::create_dir_all(&self.app_data_dir)
            .map_err(|err| AppError::Settings(format!("failed to create settings dir: {err}")))?;
        let path = self.settings_path();
        let tmp = path.with_extension("json.tmp");
        let raw = serde_json::to_string_pretty(settings)
            .map_err(|err| AppError::Settings(format!("failed to encode settings: {err}")))?;
        if raw.to_ascii_lowercase().contains("authorization")
            || raw.to_ascii_lowercase().contains("bearer ")
            || raw.contains("sk-")
        {
            return Err(AppError::Security(
                "settings payload appears to contain a secret".to_string(),
            ));
        }
        fs::write(&tmp, raw)
            .map_err(|err| AppError::Settings(format!("failed to write settings: {err}")))?;
        fs::rename(&tmp, &path)
            .map_err(|err| AppError::Settings(format!("failed to commit settings: {err}")))?;
        Ok(())
    }

    pub fn save_backend_token(&self, token: &str) -> AppResult<()> {
        validate_token_shape(token)?;
        let entry = keyring::Entry::new(SERVICE_NAME, BACKEND_TOKEN_ACCOUNT)
            .map_err(|err| AppError::Settings(format!("credential store unavailable: {err}")))?;
        entry
            .set_password(token)
            .map_err(|err| AppError::Settings(format!("failed to save credential: {err}")))?;
        Ok(())
    }

    pub fn backend_token_available(&self) -> bool {
        self.load_backend_token().is_ok()
    }

    pub fn load_backend_token(&self) -> AppResult<String> {
        let entry = keyring::Entry::new(SERVICE_NAME, BACKEND_TOKEN_ACCOUNT)
            .map_err(|err| AppError::Settings(format!("credential store unavailable: {err}")))?;
        entry
            .get_password()
            .map_err(|_| AppError::Settings("backend token is not stored".to_string()))
    }

    pub fn clear_backend_token(&self) -> AppResult<()> {
        let entry = keyring::Entry::new(SERVICE_NAME, BACKEND_TOKEN_ACCOUNT)
            .map_err(|err| AppError::Settings(format!("credential store unavailable: {err}")))?;
        match entry.delete_credential() {
            Ok(()) => Ok(()),
            Err(_) => Ok(()),
        }
    }

    fn settings_path(&self) -> PathBuf {
        self.app_data_dir.join(SETTINGS_FILE)
    }
}

fn validate_token_shape(token: &str) -> AppResult<()> {
    let trimmed = token.trim();
    if trimmed.len() < 8 {
        return Err(AppError::InvalidInput("token is too short".to_string()));
    }
    if trimmed.len() > 4096 {
        return Err(AppError::InvalidInput("token is too long".to_string()));
    }
    if trimmed.chars().any(|ch| ch.is_control()) {
        return Err(AppError::InvalidInput(
            "token contains control characters".to_string(),
        ));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn settings_roundtrip_does_not_require_token() {
        let dir = tempfile::tempdir().unwrap();
        let store = SettingsStore::new(dir.path().to_path_buf());
        let settings = AppSettings::default();
        store.save(&settings).unwrap();
        let loaded = store.load().unwrap();
        assert_eq!(loaded.backend.mode, settings.backend.mode);
    }

    #[test]
    fn rejects_secret_like_settings_payload() {
        let dir = tempfile::tempdir().unwrap();
        let store = SettingsStore::new(dir.path().to_path_buf());
        let mut settings = AppSettings::default();
        settings.suggestions.tone = "Bearer test".to_string();
        assert!(store.save(&settings).is_err());
    }
}
