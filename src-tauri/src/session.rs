use crate::audio::{self, AudioFrame, CaptureRuntime};
use crate::backend::{validate_audio_metadata, AudioChunkMetadata};
use crate::diagnostics::{diagnostic, now_ms};
use crate::errors::{AppError, AppResult};
use crate::models::{
    AppSettings, DiagnosticEvent, DiagnosticLevel, RuntimeStatus, SessionEvent, SessionSnapshot,
    SessionStatus, Suggestion, TranscriptSegment, PROTOCOL_VERSION,
};
use crate::settings::SettingsStore;
use crate::{backend, suggestions};
use std::collections::VecDeque;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{mpsc, Arc};
use std::thread::{self, JoinHandle};
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter};
use uuid::Uuid;

const MAX_TRANSCRIPT_SEGMENTS: usize = 80;
const MAX_SUGGESTIONS: usize = 3;
const MAX_DIAGNOSTICS: usize = 80;
const EVENT_NAME: &str = "voicechat://session-event";

pub struct SessionRuntime {
    pub session_id: String,
    stop: Arc<AtomicBool>,
    paused: Arc<AtomicBool>,
    capture: Option<CaptureRuntime>,
    worker: Option<JoinHandle<()>>,
}

impl SessionRuntime {
    fn stop(mut self) {
        self.stop.store(true, Ordering::SeqCst);
        if let Some(capture) = self.capture.take() {
            capture.stop();
        }
        if let Some(worker) = self.worker.take() {
            let _ = worker.join();
        }
    }
}

#[derive(Default)]
pub struct SessionManager {
    current: Option<SessionRuntime>,
    status: SessionStatus,
    transcript: VecDeque<TranscriptSegment>,
    suggestions: Vec<Suggestion>,
    diagnostics: VecDeque<DiagnosticEvent>,
}

impl SessionManager {
    pub fn runtime_status(&self, settings: &AppSettings) -> RuntimeStatus {
        RuntimeStatus {
            protocol_version: PROTOCOL_VERSION,
            platform: std::env::consts::OS.to_string(),
            windows_only: cfg!(windows),
            active_session_id: self
                .current
                .as_ref()
                .map(|session| session.session_id.clone()),
            status: self.status.clone(),
            backend_mode: settings.backend.mode.clone(),
        }
    }

    pub fn snapshot(&self) -> SessionSnapshot {
        SessionSnapshot {
            session_id: self
                .current
                .as_ref()
                .map(|session| session.session_id.clone()),
            status: self.status.clone(),
            transcript: self.transcript.iter().cloned().collect(),
            suggestions: self.suggestions.clone(),
            diagnostics: self.diagnostics.iter().cloned().collect(),
        }
    }

    pub fn start(
        &mut self,
        app: AppHandle,
        settings: AppSettings,
        settings_store: SettingsStore,
    ) -> AppResult<SessionSnapshot> {
        if self.current.is_some() {
            return Err(AppError::Session("session already active".to_string()));
        }
        crate::security::validate_settings(&settings)?;
        backend::validate_backend_for_session(&settings.backend, &settings_store)?;

        let session_id = Uuid::new_v4().to_string();
        let (tx, rx) = mpsc::channel::<AudioFrame>();
        let stop = Arc::new(AtomicBool::new(false));
        let paused = Arc::new(AtomicBool::new(false));
        let capture = audio::start_capture(settings.audio.clone(), tx, paused.clone())?;

        self.status = SessionStatus::Capturing;
        self.transcript.clear();
        self.suggestions.clear();
        self.diagnostics.clear();
        let started = diagnostic(
            DiagnosticLevel::Info,
            "session_started",
            "sessao iniciada com captura continua",
        );
        self.push_diagnostic(started.clone());
        emit(
            &app,
            SessionEvent::Status {
                session_id: session_id.clone(),
                status: SessionStatus::Capturing,
            },
        );
        emit(
            &app,
            SessionEvent::Diagnostic {
                session_id: Some(session_id.clone()),
                event: started,
            },
        );

        let worker_stop = stop.clone();
        let worker_paused = paused.clone();
        let worker_session = session_id.clone();
        let worker_settings = settings.clone();
        let worker_app = app.clone();
        let worker = thread::spawn(move || {
            run_processor(
                worker_app,
                worker_session,
                worker_settings,
                rx,
                worker_stop,
                worker_paused,
            );
        });

        self.current = Some(SessionRuntime {
            session_id,
            stop,
            paused,
            capture: Some(capture),
            worker: Some(worker),
        });
        Ok(self.snapshot())
    }

    pub fn pause(&mut self, app: &AppHandle) -> AppResult<SessionSnapshot> {
        let session = self
            .current
            .as_ref()
            .ok_or_else(|| AppError::Session("no active session".to_string()))?;
        session.paused.store(true, Ordering::SeqCst);
        self.status = SessionStatus::Paused;
        emit(
            app,
            SessionEvent::Status {
                session_id: session.session_id.clone(),
                status: SessionStatus::Paused,
            },
        );
        Ok(self.snapshot())
    }

    pub fn resume(&mut self, app: &AppHandle) -> AppResult<SessionSnapshot> {
        let session = self
            .current
            .as_ref()
            .ok_or_else(|| AppError::Session("no active session".to_string()))?;
        session.paused.store(false, Ordering::SeqCst);
        self.status = SessionStatus::Capturing;
        emit(
            app,
            SessionEvent::Status {
                session_id: session.session_id.clone(),
                status: SessionStatus::Capturing,
            },
        );
        Ok(self.snapshot())
    }

    pub fn stop(&mut self, app: &AppHandle) -> AppResult<SessionSnapshot> {
        let session = self
            .current
            .take()
            .ok_or_else(|| AppError::Session("no active session".to_string()))?;
        let session_id = session.session_id.clone();
        session.stop();
        self.status = SessionStatus::Ended;
        emit(
            app,
            SessionEvent::Status {
                session_id,
                status: SessionStatus::Ended,
            },
        );
        Ok(self.snapshot())
    }

    pub fn clear_local_data(&mut self) -> SessionSnapshot {
        self.transcript.clear();
        self.suggestions.clear();
        self.diagnostics.clear();
        self.snapshot()
    }

    fn push_diagnostic(&mut self, event: DiagnosticEvent) {
        self.diagnostics.push_back(event);
        while self.diagnostics.len() > MAX_DIAGNOSTICS {
            self.diagnostics.pop_front();
        }
    }
}

fn run_processor(
    app: AppHandle,
    session_id: String,
    settings: AppSettings,
    rx: mpsc::Receiver<AudioFrame>,
    stop: Arc<AtomicBool>,
    paused: Arc<AtomicBool>,
) {
    let mut transcript = Vec::<TranscriptSegment>::new();
    let mut last_partial = Instant::now();
    let mut last_final = Instant::now();
    let mut last_suggestion = Instant::now();
    let mut last_sequence = 0_u64;

    while !stop.load(Ordering::SeqCst) {
        if paused.load(Ordering::SeqCst) {
            thread::sleep(Duration::from_millis(100));
            continue;
        }

        match rx.recv_timeout(Duration::from_millis(250)) {
            Ok(frame) => {
                let meta = AudioChunkMetadata {
                    sample_rate: frame.sample_rate,
                    channels: frame.channels,
                    rms: frame.rms,
                    peak: frame.peak,
                    duration_ms: frame.duration_ms,
                };
                if validate_audio_metadata(&meta).is_err() {
                    emit(
                        &app,
                        SessionEvent::Diagnostic {
                            session_id: Some(session_id.clone()),
                            event: diagnostic(
                                DiagnosticLevel::Warn,
                                "invalid_audio_chunk",
                                "chunk de audio rejeitado por validacao local",
                            ),
                        },
                    );
                    continue;
                }

                last_sequence = frame.sequence;
                if last_partial.elapsed() >= Duration::from_millis(700) {
                    let segment = mock_transcript_segment(&frame, false);
                    emit(
                        &app,
                        SessionEvent::Transcript {
                            session_id: session_id.clone(),
                            segment: segment.clone(),
                        },
                    );
                    transcript.push(segment);
                    trim_transcript(&mut transcript);
                    last_partial = Instant::now();
                }

                if last_final.elapsed() >= Duration::from_secs(3) {
                    let segment = mock_transcript_segment(&frame, true);
                    emit(
                        &app,
                        SessionEvent::Transcript {
                            session_id: session_id.clone(),
                            segment: segment.clone(),
                        },
                    );
                    transcript.push(segment);
                    trim_transcript(&mut transcript);
                    last_final = Instant::now();
                }

                if last_suggestion.elapsed() >= Duration::from_millis(1500) {
                    for suggestion in
                        suggestions::build_suggestions(&transcript, &settings.suggestions)
                            .into_iter()
                            .take(MAX_SUGGESTIONS)
                    {
                        emit(
                            &app,
                            SessionEvent::Suggestion {
                                session_id: session_id.clone(),
                                suggestion,
                            },
                        );
                    }
                    last_suggestion = Instant::now();
                }
            }
            Err(mpsc::RecvTimeoutError::Timeout) => {
                if last_partial.elapsed() >= Duration::from_secs(2) {
                    emit(
                        &app,
                        SessionEvent::Diagnostic {
                            session_id: Some(session_id.clone()),
                            event: diagnostic(
                                DiagnosticLevel::Info,
                                "waiting_for_audio",
                                &format!(
                                    "aguardando audio continuo; ultimo pacote {last_sequence}"
                                ),
                            ),
                        },
                    );
                    last_partial = Instant::now();
                }
            }
            Err(mpsc::RecvTimeoutError::Disconnected) => break,
        }
    }
}

fn mock_transcript_segment(frame: &AudioFrame, is_final: bool) -> TranscriptSegment {
    let text = if frame.rms < 0.015 {
        "silencio detectado na janela atual".to_string()
    } else if is_final {
        "Trecho confirmado: a conversa continua com contexto suficiente para sugerir uma resposta."
            .to_string()
    } else {
        "Transcricao parcial em fluxo continuo enquanto os participantes falam...".to_string()
    };
    TranscriptSegment {
        id: Uuid::new_v4().to_string(),
        text,
        is_final,
        speaker: None,
        started_at_ms: frame
            .captured_at_ms
            .saturating_sub(frame.duration_ms as u64),
        updated_at_ms: now_ms(),
    }
}

fn trim_transcript(transcript: &mut Vec<TranscriptSegment>) {
    if transcript.len() > MAX_TRANSCRIPT_SEGMENTS {
        let drain = transcript.len() - MAX_TRANSCRIPT_SEGMENTS;
        transcript.drain(0..drain);
    }
}

fn emit(app: &AppHandle, event: SessionEvent) {
    let _ = app.emit(EVENT_NAME, event);
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn trims_transcript() {
        let mut segments = (0..100)
            .map(|idx| TranscriptSegment {
                id: idx.to_string(),
                text: "x".to_string(),
                is_final: false,
                speaker: None,
                started_at_ms: 0,
                updated_at_ms: 0,
            })
            .collect::<Vec<_>>();
        trim_transcript(&mut segments);
        assert_eq!(segments.len(), MAX_TRANSCRIPT_SEGMENTS);
    }
}
