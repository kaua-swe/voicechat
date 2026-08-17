# Arquitetura Tecnica - Voice Chat

## Componentes

### Cliente desktop

- Tauri 2 com janela principal `alwaysOnTop` configuravel.
- Rust em `src-tauri/src` para audio, seguranca, persistencia e estado de sessao.
- TypeScript/React em `src` para painel, controles, configuracao, diagnosticos, transcricao e sugestoes.

### Captura de audio

A camada `audio.rs` enumera:

- fonte local de desenvolvimento;
- saidas do Windows como candidatos a `SystemLoopback`;
- entradas de audio como `InputDevice`.

Para `SystemLoopback`, o app usa CPAL sobre WASAPI criando stream de entrada a partir do dispositivo de saida selecionado. Essa estrategia segue o comportamento documentado para captura digital de audio de renderizacao no Windows via WASAPI loopback. A captura nao roda quando a sessao esta pausada ou encerrada.

Audio bruto nao e persistido. A implementacao atual transforma callbacks de audio em metadados de nivel (`rms`, `peak`, taxa, canais, duracao e sequencia) para exercitar o pipeline local sem enviar conteudo sensivel.

### Sessao ao vivo

`session.rs` coordena:

- inicio explicito da sessao;
- pausa, retomada e encerramento;
- captura continua;
- eventos Tauri incrementais em `voicechat://session-event`;
- transcricao parcial/final gerada pelo adaptador local;
- sugestoes atualizadas enquanto frames continuam chegando.

O adaptador local permite testar o comportamento de produto sem credenciais externas. Ele nao afirma transcricao cloud real.

### Backend controlado pelo usuario

`backend.rs` define validacao e contrato de envelope versionado. O modo remoto exige transporte HTTPS/WSS, sem credenciais embutidas na URL. Loopback HTTP/WS so pode ser aceito quando explicitamente habilitado para desenvolvimento local.

Chamadas reais a provedores de IA devem ocorrer apenas no backend do usuario. O cliente nunca deve conter chaves OpenAI ou equivalentes.

## Fronteira Rust/UI

Comandos Tauri expostos:

- `get_runtime_status`
- `list_audio_devices`
- `load_settings`
- `save_settings`
- `save_backend_token`
- `clear_backend_token`
- `validate_backend`
- `start_session`
- `pause_session`
- `resume_session`
- `stop_session`
- `clear_session_data`
- `set_always_on_top`

Todos os comandos que recebem configuracao passam por validacao Rust. A UI tambem valida localmente para feedback rapido.

## Persistencia

- `settings.json` fica no diretorio de dados do app.
- Tokens ficam no cofre local via `keyring`.
- O app rejeita payloads de configuracao que parecam conter segredos.

## Limites atuais

- O adaptador local gera transcricao/sugestao deterministica para desenvolvimento.
- Backend remoto real depende de endpoint do usuario, autenticacao e servico de IA configurados fora do cliente.
- Validacao real com Google Meet e Microsoft Teams exige reunioes em ambiente do usuario.
