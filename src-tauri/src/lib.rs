mod audio;
mod backend;
mod commands;
mod diagnostics;
mod errors;
mod models;
mod security;
mod session;
mod settings;
mod suggestions;

use std::sync::Mutex;
use tauri::Manager;

pub struct AppState {
    settings_store: settings::SettingsStore,
    session_manager: Mutex<session::SessionManager>,
}

pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let app_data = app
                .path()
                .app_data_dir()
                .map_err(|err| format!("app data dir unavailable: {err}"))?;
            std::fs::create_dir_all(&app_data)
                .map_err(|err| format!("failed to create app data dir: {err}"))?;
            app.manage(AppState {
                settings_store: settings::SettingsStore::new(app_data),
                session_manager: Mutex::new(session::SessionManager::default()),
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_runtime_status,
            commands::list_audio_devices,
            commands::load_settings,
            commands::save_settings,
            commands::save_backend_token,
            commands::clear_backend_token,
            commands::validate_backend,
            commands::start_session,
            commands::pause_session,
            commands::resume_session,
            commands::stop_session,
            commands::clear_session_data,
            commands::set_always_on_top
        ])
        .run(tauri::generate_context!())
        .expect("error while running Voice Chat");
}
