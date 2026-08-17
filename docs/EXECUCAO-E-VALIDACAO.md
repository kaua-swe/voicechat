# Execucao e Validacao

## Preparar dependencias

```powershell
corepack pnpm install
```

Se o pnpm bloquear scripts de build, aprove apenas o pacote necessario do toolchain:

```powershell
corepack pnpm approve-builds esbuild
corepack pnpm install
```

## Rodar em desenvolvimento

```powershell
corepack pnpm tauri:dev
```

## Rodar somente frontend

```powershell
corepack pnpm dev
```

O preview web usa fallback local e nao substitui a validacao desktop Tauri.

## Testes e checks

```powershell
corepack pnpm build
corepack pnpm test
cargo test --manifest-path src-tauri/Cargo.toml
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings
corepack pnpm backend:build
corepack pnpm backend:test
corepack pnpm tauri:build
```

## Validacao manual recomendada

1. Abrir `corepack pnpm tauri:dev`.
2. Confirmar que a janela abre no Windows.
3. Verificar lista de fontes de audio.
4. Iniciar com `Sinal local de desenvolvimento`.
5. Confirmar transcricao parcial, transcricao final e sugestoes atualizando continuamente.
6. Pausar e confirmar parada de atualizacoes.
7. Retomar e encerrar.
8. Testar uma fonte `Sistema via WASAPI loopback` durante audio de Meet ou Teams.
9. Validar que erros aparecem em Diagnosticos sem segredos.

## Build de release local

```powershell
corepack pnpm tauri:build
```

O script usa `tauri build --no-bundle` para validar compilacao de producao sem gerar instalador completo. O empacotamento com instalador deve ser validado separadamente quando assinatura e politica de release forem definidas.
