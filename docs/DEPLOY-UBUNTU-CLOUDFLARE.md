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
- container: `voicechat-backend`;
- compose file: `ops/docker/docker-compose.voicechat.yml`;
- vhost Nginx especifico: `voicechat.sproce.com.br`.
- proxy host especifico do Nginx Proxy Manager: `ops/nginx-proxy-manager/voicechat.proxy_host.conf`.

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

Se Cloudflare redirecionar HTTP para HTTPS e o origin ainda nao tiver certificado valido, HTTP-01 fica bloqueado. Nesse caso, usar uma das opcoes:

- Cloudflare Origin Certificate gerado para `voicechat.sproce.com.br` e instalado no origin;
- ACME DNS-01 com token Cloudflare de permissao minima para editar DNS da zona.

Quando o token Cloudflare for usado somente como ambiente temporario e nao persistido no VPS, a renovacao automatica DNS-01 nao tera credencial permanente. Agendar uma janela de renovacao antes do vencimento do certificado e executar novamente o fluxo DNS-01 com token temporario, ou autorizar uma credencial persistente de permissao minima em armazenamento root-only.

## Backend

O backend escuta somente em `127.0.0.1:4378` e fica atras do proxy de origem. Segredos ficam apenas em `/etc/voicechat/backend.env`.

Variavel obrigatoria:

- `VOICECHAT_AUTH_TOKEN_SHA256`: digest SHA-256 do token bearer usado pelo app desktop.

O script `ops/ubuntu/prepare-voicechat-backend.sh` cria um token de bootstrap se `/etc/voicechat/backend.env` ainda nao existir. O token em texto claro fica somente no VPS em `/etc/voicechat/bootstrap-token.txt` com permissao restrita; o servico usa apenas o hash.

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
