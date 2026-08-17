# Seguranca

## Regras implementadas

- Chaves de provedores de IA nao ficam no cliente.
- Backend remoto exige HTTPS/WSS por padrao.
- HTTP/WS so e aceito para loopback quando explicitamente habilitado.
- URLs com credenciais embutidas sao rejeitadas.
- Token do backend e salvo no cofre local do Windows via `keyring`.
- Configuracoes JSON sao validadas e nao carregam token.
- Logs e erros passam por sanitizacao antes de exibicao.
- Eventos de audio carregam metadados para o adaptador local; audio bruto nao e persistido.
- A UI renderiza texto React normal e nao usa `dangerouslySetInnerHTML`.
- Payloads de audio e configuracao possuem limites de tamanho, formato e faixa.

## Backend de producao esperado

O backend do usuario deve:

- autenticar sessoes;
- aplicar rate limit por usuario, token, dispositivo ou sessao;
- validar todos os eventos recebidos;
- armazenar chaves de IA somente no servidor;
- usar HTTPS/TLS valido;
- sanitizar logs;
- descartar audio bruto conforme politica de minimizacao;
- registrar auditoria operacional sem conteudo sensivel.

## Itens que dependem do usuario

- Endpoint HTTPS/WSS real.
- Token ou mecanismo de autenticacao do backend.
- Politica de retencao do backend.
- Chaves do provedor de IA mantidas somente no backend.
