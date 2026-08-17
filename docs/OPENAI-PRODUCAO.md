# OpenAI em producao

## Estado funcional

O backend possui dois adaptadores:

- `mock`: padrao para desenvolvimento local, testes automatizados e validacao sem segredos externos.
- `openai`: adaptador server-side para transcricao via OpenAI usando `POST /v1/audio/transcriptions`.

O backend aceita mensagens WebSocket autenticadas em `/v1/live`. Mensagens `audio` podem conter metadados e, para producao, um chunk de audio em base64 com MIME permitido (`audio/wav`, `audio/webm`, `audio/mp3`, `audio/mpeg`, `audio/mp4`, `audio/m4a`, `audio/ogg` ou `audio/flac`). Cada chunk e validado por tipo, base64 e limite de tamanho antes de qualquer chamada externa.

Limite atual importante: o desktop implementado captura audio e gera eventos locais, mas ainda nao envia chunks reais de audio para o backend remoto. Portanto, a integracao OpenAI fica pronta no servidor, mas a transcricao real de reunioes exige conectar o pipeline desktop -> WebSocket com audio bruto/chunked.

## Segredos

`OPENAI_API_KEY` nunca deve existir no cliente desktop, no frontend, no Git, em logs ou em arquivos de documentacao. Ela deve ficar apenas no ambiente protegido do VPS, em `/etc/voicechat/backend.env`, com permissao restrita.

Variaveis server-side:

```env
VOICECHAT_TRANSCRIPTION_PROVIDER=openai
VOICECHAT_OPENAI_TRANSCRIPTION_MODEL=gpt-4o-mini-transcribe
VOICECHAT_OPENAI_TRANSCRIPTION_ENDPOINT=https://api.openai.com/v1/audio/transcriptions
VOICECHAT_OPENAI_MODELS_ENDPOINT=https://api.openai.com/v1/models
VOICECHAT_OPENAI_TIMEOUT_MS=20000
OPENAI_API_KEY=definir_somente_no_vps
```

## Validacao segura

O endpoint autenticado `POST /v1/provider-check` valida a configuracao do provedor. Para OpenAI, ele faz uma chamada `GET` ao endpoint de modelos configurado, sem enviar audio de reuniao e sem retornar segredos.

Esse endpoint exige a mesma origem permitida, bearer token, HTTPS/WSS por proxy e rate limit dos demais endpoints de producao.

## Tokens do desktop

O backend aceita:

- `VOICECHAT_AUTH_TOKEN_SHA256`: hash principal.
- `VOICECHAT_AUTH_TOKEN_SHA256_LIST`: hashes adicionais separados por virgula para tokens de usuario/dispositivo.

Tokens em texto claro devem ser entregues ao usuario apenas por canal seguro aprovado. O repositorio armazena somente scripts e exemplos sem segredos.
