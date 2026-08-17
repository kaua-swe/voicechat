# Voice Chat

Aplicativo desktop Windows-only em Tauri 2 para acompanhamento contínuo de reuniões com transcrição ao vivo e sugestões de resposta em painel flutuante privado.

## Stack

- Tauri 2
- Rust para captura nativa, sessão, validação, armazenamento seguro e comandos
- TypeScript + React para UI
- Vite + pnpm para frontend

## Execução local

```powershell
corepack pnpm install
corepack pnpm tauri:dev
```

## Validação

```powershell
corepack pnpm build
corepack pnpm test
cargo test --manifest-path src-tauri/Cargo.toml
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings
corepack pnpm tauri:build
```

## Segurança

O cliente desktop não aceita chaves de provedores de IA. Tokens do backend do usuário são armazenados via cofre local do Windows usando a crate `keyring`; configurações persistidas em JSON não devem conter segredos.

Para operação com IA real, configure um backend próprio HTTPS/WSS autenticado e rate-limited. O modo local de desenvolvimento usa um adaptador mock para exercitar fluxo contínuo sem enviar dados a serviços externos.
