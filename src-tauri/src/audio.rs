use crate::diagnostics::now_ms;
use crate::errors::{AppError, AppResult};
use crate::models::{AudioDevice, AudioSelection, AudioSourceKind};
use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use cpal::{SampleFormat, Stream, StreamConfig};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{mpsc::Sender, Arc};
use std::thread::{self, JoinHandle};
use std::time::{Duration, Instant};

#[derive(Debug, Clone)]
pub struct AudioFrame {
    pub sequence: u64,
    pub rms: f32,
    pub peak: f32,
    pub sample_rate: u32,
    pub channels: u16,
    pub duration_ms: u16,
    pub captured_at_ms: u64,
}

pub struct CaptureRuntime {
    stop: Arc<AtomicBool>,
    join: Option<JoinHandle<()>>,
}

impl CaptureRuntime {
    pub fn stop(mut self) {
        self.stop.store(true, Ordering::SeqCst);
        if let Some(join) = self.join.take() {
            let _ = join.join();
        }
    }
}

pub fn enumerate_audio_devices() -> AppResult<Vec<AudioDevice>> {
    let host = cpal::default_host();
    let mut devices = Vec::new();

    devices.push(AudioDevice {
        id: "dev-mock".to_string(),
        label: "Sinal local de desenvolvimento".to_string(),
        kind: AudioSourceKind::DevelopmentMock,
        is_default: true,
        sample_rate: Some(16_000),
        channels: Some(1),
    });

    if let Ok(outputs) = host.output_devices() {
        let default_name = host
            .default_output_device()
            .and_then(|device| device.name().ok());
        for device in outputs {
            let name = device
                .name()
                .unwrap_or_else(|_| "Saida de audio".to_string());
            let config = device.default_output_config().ok();
            devices.push(AudioDevice {
                id: format!("loopback::{name}"),
                label: format!("Sistema via WASAPI loopback - {name}"),
                kind: AudioSourceKind::SystemLoopback,
                is_default: default_name.as_ref() == Some(&name),
                sample_rate: config.as_ref().map(|cfg| cfg.sample_rate().0),
                channels: config.as_ref().map(|cfg| cfg.channels()),
            });
        }
    }

    if let Ok(inputs) = host.input_devices() {
        let default_name = host
            .default_input_device()
            .and_then(|device| device.name().ok());
        for device in inputs {
            let name = device
                .name()
                .unwrap_or_else(|_| "Entrada de audio".to_string());
            let config = device.default_input_config().ok();
            devices.push(AudioDevice {
                id: format!("input::{name}"),
                label: format!("Microfone/dispositivo - {name}"),
                kind: AudioSourceKind::InputDevice,
                is_default: default_name.as_ref() == Some(&name),
                sample_rate: config.as_ref().map(|cfg| cfg.sample_rate().0),
                channels: config.as_ref().map(|cfg| cfg.channels()),
            });
        }
    }

    Ok(devices)
}

pub fn start_capture(
    selection: AudioSelection,
    tx: Sender<AudioFrame>,
    paused: Arc<AtomicBool>,
) -> AppResult<CaptureRuntime> {
    match selection.kind {
        AudioSourceKind::DevelopmentMock => Ok(start_mock_capture(tx, paused)),
        AudioSourceKind::SystemLoopback | AudioSourceKind::InputDevice => {
            start_cpal_capture(selection, tx, paused)
        }
    }
}

fn start_mock_capture(tx: Sender<AudioFrame>, paused: Arc<AtomicBool>) -> CaptureRuntime {
    let stop = Arc::new(AtomicBool::new(false));
    let thread_stop = stop.clone();
    let join = thread::spawn(move || {
        let mut sequence = 0_u64;
        let started = Instant::now();
        while !thread_stop.load(Ordering::SeqCst) {
            if !paused.load(Ordering::SeqCst) {
                let phase = started.elapsed().as_millis() as f32 / 1000.0;
                let rms = ((phase.sin() + 1.0) / 2.0 * 0.25 + 0.02).clamp(0.0, 1.0);
                let _ = tx.send(AudioFrame {
                    sequence,
                    rms,
                    peak: (rms * 1.8).clamp(0.0, 1.0),
                    sample_rate: 16_000,
                    channels: 1,
                    duration_ms: 250,
                    captured_at_ms: now_ms(),
                });
                sequence = sequence.saturating_add(1);
            }
            thread::sleep(Duration::from_millis(250));
        }
    });
    CaptureRuntime {
        stop,
        join: Some(join),
    }
}

fn start_cpal_capture(
    selection: AudioSelection,
    tx: Sender<AudioFrame>,
    paused: Arc<AtomicBool>,
) -> AppResult<CaptureRuntime> {
    let host = cpal::default_host();
    let (device, stream_config, sample_format) = match selection.kind {
        AudioSourceKind::SystemLoopback => {
            let device = select_output_device(&host, &selection.source_id)?;
            let supported = device
                .default_output_config()
                .map_err(|err| AppError::Audio(format!("output config unavailable: {err}")))?;
            (device, supported.config(), supported.sample_format())
        }
        AudioSourceKind::InputDevice => {
            let device = select_input_device(&host, &selection.source_id)?;
            let supported = device
                .default_input_config()
                .map_err(|err| AppError::Audio(format!("input config unavailable: {err}")))?;
            (device, supported.config(), supported.sample_format())
        }
        AudioSourceKind::DevelopmentMock => unreachable!("mock handled by caller"),
    };

    let stop = Arc::new(AtomicBool::new(false));
    let thread_stop = stop.clone();
    let join = thread::spawn(move || {
        let stream = build_stream(device, stream_config, sample_format, tx, paused);
        match stream {
            Ok(stream) => {
                if stream.play().is_ok() {
                    while !thread_stop.load(Ordering::SeqCst) {
                        thread::sleep(Duration::from_millis(100));
                    }
                }
            }
            Err(_) => {
                while !thread_stop.load(Ordering::SeqCst) {
                    thread::sleep(Duration::from_millis(100));
                }
            }
        }
    });

    Ok(CaptureRuntime {
        stop,
        join: Some(join),
    })
}

fn select_output_device(host: &cpal::Host, source_id: &str) -> AppResult<cpal::Device> {
    let wanted = source_id.strip_prefix("loopback::").unwrap_or(source_id);
    if wanted == "default" {
        return host
            .default_output_device()
            .ok_or_else(|| AppError::Audio("default output device not found".to_string()));
    }
    let devices = host
        .output_devices()
        .map_err(|err| AppError::Audio(format!("output devices unavailable: {err}")))?;
    for device in devices {
        if device.name().ok().as_deref() == Some(wanted) {
            return Ok(device);
        }
    }
    Err(AppError::Audio(
        "selected output device not found".to_string(),
    ))
}

fn select_input_device(host: &cpal::Host, source_id: &str) -> AppResult<cpal::Device> {
    let wanted = source_id.strip_prefix("input::").unwrap_or(source_id);
    if wanted == "default" {
        return host
            .default_input_device()
            .ok_or_else(|| AppError::Audio("default input device not found".to_string()));
    }
    let devices = host
        .input_devices()
        .map_err(|err| AppError::Audio(format!("input devices unavailable: {err}")))?;
    for device in devices {
        if device.name().ok().as_deref() == Some(wanted) {
            return Ok(device);
        }
    }
    Err(AppError::Audio(
        "selected input device not found".to_string(),
    ))
}

fn build_stream(
    device: cpal::Device,
    config: StreamConfig,
    sample_format: SampleFormat,
    tx: Sender<AudioFrame>,
    paused: Arc<AtomicBool>,
) -> AppResult<Stream> {
    let channels = config.channels;
    let sample_rate = config.sample_rate.0;
    let err_fn = |err: cpal::StreamError| {
        eprintln!(
            "voice-chat audio stream error: {}",
            crate::security::sanitize_for_log(&err.to_string())
        );
    };

    match sample_format {
        SampleFormat::F32 => build_typed_stream(
            StreamBuildContext {
                device,
                config,
                tx,
                paused,
                channels,
                sample_rate,
            },
            err_fn,
            rms_peak_f32,
        ),
        SampleFormat::I16 => build_typed_stream(
            StreamBuildContext {
                device,
                config,
                tx,
                paused,
                channels,
                sample_rate,
            },
            err_fn,
            rms_peak_i16,
        ),
        SampleFormat::U16 => build_typed_stream(
            StreamBuildContext {
                device,
                config,
                tx,
                paused,
                channels,
                sample_rate,
            },
            err_fn,
            rms_peak_u16,
        ),
        other => Err(AppError::Audio(format!(
            "unsupported sample format: {other:?}"
        ))),
    }
}

struct StreamBuildContext {
    device: cpal::Device,
    config: StreamConfig,
    tx: Sender<AudioFrame>,
    paused: Arc<AtomicBool>,
    channels: u16,
    sample_rate: u32,
}

fn build_typed_stream<T, F>(
    context: StreamBuildContext,
    err_fn: impl FnMut(cpal::StreamError) + Send + 'static,
    level_fn: F,
) -> AppResult<Stream>
where
    T: cpal::SizedSample + Send + 'static,
    F: Fn(&[T]) -> (f32, f32) + Send + Sync + 'static,
{
    let StreamBuildContext {
        device,
        config,
        tx,
        paused,
        channels,
        sample_rate,
    } = context;
    let mut sequence = 0_u64;
    device
        .build_input_stream(
            &config,
            move |data: &[T], _| {
                if paused.load(Ordering::SeqCst) {
                    return;
                }
                let (rms, peak) = level_fn(data);
                let frames = (data.len() / channels.max(1) as usize).max(1);
                let duration_ms =
                    ((frames as u64 * 1000) / sample_rate.max(1) as u64).clamp(1, 1000) as u16;
                let _ = tx.send(AudioFrame {
                    sequence,
                    rms,
                    peak,
                    sample_rate,
                    channels,
                    duration_ms,
                    captured_at_ms: now_ms(),
                });
                sequence = sequence.saturating_add(1);
            },
            err_fn,
            None,
        )
        .map_err(|err| AppError::Audio(format!("failed to build audio stream: {err}")))
}

fn rms_peak_f32(data: &[f32]) -> (f32, f32) {
    levels(data.iter().copied())
}

fn rms_peak_i16(data: &[i16]) -> (f32, f32) {
    levels(data.iter().map(|v| *v as f32 / i16::MAX as f32))
}

fn rms_peak_u16(data: &[u16]) -> (f32, f32) {
    levels(data.iter().map(|v| (*v as f32 - 32768.0) / 32768.0))
}

fn levels(values: impl Iterator<Item = f32>) -> (f32, f32) {
    let mut sum = 0.0_f32;
    let mut peak = 0.0_f32;
    let mut count = 0.0_f32;
    for value in values {
        let abs = value.abs().clamp(0.0, 1.0);
        sum += abs * abs;
        peak = peak.max(abs);
        count += 1.0;
    }
    if count == 0.0 {
        (0.0, 0.0)
    } else {
        ((sum / count).sqrt().clamp(0.0, 1.0), peak)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn computes_levels() {
        let (rms, peak) = rms_peak_f32(&[0.0, 0.5, -0.5, 1.0]);
        assert!(rms > 0.0);
        assert_eq!(peak, 1.0);
    }
}
