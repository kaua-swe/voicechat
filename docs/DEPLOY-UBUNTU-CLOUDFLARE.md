# Deploy Ubuntu com Cloudflare

## Isolamento

O Voice Chat deve usar recursos proprios:

- diretorio do app: `/home/ubuntu/voicechat`;
- usuario de servico: `voicechat`;
- env server-side: `/etc/voicechat/backend.env`;
- logs: `/var/log/voicechat`;
- ACME webroot isolado: `/var/www/voicechat-acme`;
- certificados de origin: `/etc/ssl/voicechat`;
- unit systemd: `voicechat-backend.service`;
- vhost Nginx especifico: `voicechat.sproce.com.br`.

Nao editar vhosts default nem configuracoes globais compartilhadas para este deploy.

## Cloudflare

O proxy Cloudflare pode ficar habilitado, mas o modo SSL/TLS nao deve ser `Flexible`.

Alvo:

- Cloudflare SSL/TLS: `Full (strict)`;
- Cloudflare para origin: HTTPS criptografado;
- Origin com certificado valido para Cloudflare.

Abordagens seguras:

- Cloudflare Origin Certificate instalado em `/etc/ssl/voicechat/origin.crt` e chave em `/etc/ssl/voicechat/origin.key`;
- ou certificado publico ACME via DNS-01 usando token Cloudflare com permissao minima para a zona.

Nao emitir certificado publico HTTP-01 se a validacao atraves do proxy nao for confiavel.

## Backend

O backend escuta somente em `127.0.0.1:4378` e fica atras do Nginx. Segredos ficam apenas em `/etc/voicechat/backend.env`.

Variavel obrigatoria:

- `VOICECHAT_AUTH_TOKEN_SHA256`: digest SHA-256 do token bearer usado pelo app desktop.

## Validacao antes de reload

Antes de ativar o vhost:

```bash
sudo nginx -t
```

Recarregar apenas se a sintaxe estiver valida:

```bash
sudo systemctl reload nginx
```

## Health check

O endpoint publico esperado, depois de TLS/proxy:

```bash
curl -fsS https://voicechat.sproce.com.br/healthz
```

Resposta esperada:

```json
{"ok":true,"service":"voice-chat-backend"}
```
