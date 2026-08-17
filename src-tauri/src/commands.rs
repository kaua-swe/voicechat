use crate::backend::{self, BackendValidationResult};
use crate::errors::{command_error, AppError};
use crate::models::{AppSettings, AudioDevice, RuntimeStatus, SessionSnapshot};
use crate::AppState;
use tauri::{Manager, State};

#[tauri::command]
pub fn get_runtime_status(state: State<'_, AppState>) -> Result<RuntimeStatus, String> {
    let settings = state.settings_store.load().map_err(command_error)?;
    let manager = state
        .session_manager
        .lock()
        .map_err(|_| command_error(AppError::Internal))?;
    Ok(manager.runtime_status(&settings))
}

#[tauri::command]
pub fn list_audio_devices() -> Result<Vec<AudioDevice>, String> {
    crate::audio::enumerate_audio_devices().map_err(command_error)
}

#[tauri::command]
pub fn load_settings(state: State<'_, AppState>) -> Result<AppSettings, String> {
    state.settings_store.load().map_err(command_error)
}

#[tauri::command]
pub fn save_settings(
    state: State<'_, AppState>,
    settings: AppSettings,
) -> Result<AppSettings, String> {
    state
        .settings_store
        .save(&settings)
        .map_err(command_error)?;
    Ok(settings)
}

#[tauri::command]
pub fn save_backend_token(state: State<'_, AppState>, token: String) -> Result<bool, String> {
    state
        .settings_store
        .save_backend_token(&token)
        .map_err(command_error)?;
    Ok(true)
}

#[tauri::command]
pub fn clear_backend_token(state: State<'_, AppState>) -> Result<bool, String> {
    state
        .settings_store
        .clear_backend_token()
        .map_err(command_error)?;
    Ok(true)
}

#[tauri::command]
pub fn validate_backend(
    state: State<'_, AppState>,
    settings: AppSettings,
) -> Result<BackendValidationResult, String> {
    crate::security::validate_settings(&settings).map_err(command_error)?;
    backend::validate_backend_for_session(&settings.backend, &state.settings_store)
        .map_err(command_error)
}

#[tauri::command]
pub fn start_session(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    settings: AppSettings,
) -> Result<SessionSnapshot, String> {
    state
        .settings_store
        .save(&settings)
        .map_err(command_error)?;
    let mut manager = state
        .session_manager
        .lock()
        .map_err(|_| command_error(AppError::Internal))?;
    manager
        .start(app, settings, state.settings_store.clone())
        .map_err(command_error)
}

#[tauri::command]
pub fn pause_session(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<SessionSnapshot, String> {
    let mut manager = state
        .session_manager
        .lock()
        .map_err(|_| command_error(AppError::Internal))?;
    manager.pause(&app).map_err(command_error)
}

#[tauri::command]
pub fn resume_session(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<SessionSnapshot, String> {
    let mut manager = state
        .session_manager
        .lock()
        .map_err(|_| command_error(AppError::Internal))?;
    manager.resume(&app).map_err(command_error)
}

#[tauri::command]
pub fn stop_session(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<SessionSnapshot, String> {
    let mut manager = state
        .session_manager
        .lock()
        .map_err(|_| command_error(AppError::Internal))?;
    manager.stop(&app).map_err(command_error)
}

#[tauri::command]
pub fn clear_session_data(state: State<'_, AppState>) -> Result<SessionSnapshot, String> {
    let mut manager = state
        .session_manager
        .lock()
        .map_err(|_| command_error(AppError::Internal))?;
    Ok(manager.clear_local_data())
}

#[tauri::command]
pub fn set_always_on_top(app: tauri::AppHandle, enabled: bool) -> Result<bool, String> {
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| command_error(AppError::Window("main window not found".to_string())))?;
    window
        .set_always_on_top(enabled)
        .map_err(|err| command_error(AppError::Window(err.to_string())))?;
    Ok(enabled)
}
