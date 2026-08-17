# PRD - Voice Chat

## 1. Visao geral

Voice Chat e um aplicativo desktop exclusivo para Windows que acompanha reunioes em navegador, especialmente Google Meet, e no Microsoft Teams. O produto captura continuamente audio autorizado do sistema ou da chamada, envia o fluxo em tempo real para um servico de IA por meio de um backend controlado pelo usuario e exibe um painel privado, flutuante e semelhante a chat com transcricao ao vivo e sugestoes do que o usuario conectado poderia dizer.

A experiencia central deve ser uma conversa realmente ao vivo. O audio, a transcricao parcial e as sugestoes precisam fluir continuamente enquanto as pessoas falam, sem depender de ciclos manuais de gravar, parar, processar e responder.

## 2. Problema

Participar de reunioes longas, tecnicas ou em outro idioma exige atencao constante, memoria de contexto e capacidade de formular respostas rapidamente. Ferramentas comuns de transcricao ajudam depois da reuniao ou trabalham em blocos, mas nao oferecem uma camada privada e continua de apoio ao usuario durante a conversa.

O usuario precisa de uma assistencia discreta que:

- acompanhe a conversa em tempo real;
- mantenha contexto recente suficiente para gerar sugestoes uteis;
- ajude a formular respostas enquanto a discussao ainda esta acontecendo;
- funcione em ambientes comuns de reuniao no Windows;
- preserve privacidade, controle de dados e seguranca operacional.

## 3. Objetivos

- Capturar audio autorizado de reunioes em Google Meet no navegador e Microsoft Teams no Windows.
- Transmitir audio continuamente para um backend configurado e controlado pelo usuario.
- Exibir transcricao parcial e final em tempo real, com baixa latencia perceptivel.
- Gerar sugestoes contextuais e atualizadas continuamente sobre o que o usuario poderia dizer.
- Manter um painel flutuante privado, discreto, responsivo e facil de posicionar.
- Separar claramente cliente desktop, backend do usuario e servicos de IA.
- Proteger credenciais, conteudo de audio, transcricoes e sugestoes contra exposicao indevida.
- Oferecer controles praticos de inicio, pausa, retomada, descarte e encerramento da sessao.

## 4. Publico-alvo

- Profissionais que participam frequentemente de reunioes online no Windows.
- Pessoas em vendas, sucesso do cliente, suporte tecnico, consultoria e gestao de projetos.
- Profissionais que precisam responder com precisao em conversas tecnicas ou comerciais.
- Usuarios que trabalham em reunioes multilíngues e precisam de apoio de compreensao e resposta.
- Equipes que preferem controlar seu proprio backend, chaves, politicas de retencao e integracoes.

## 5. Escopo do produto

### Incluido

- Aplicativo desktop Windows construido com Tauri 2.
- Logica nativa em Rust para audio, integracao com o sistema operacional, seguranca local e comunicacao segura.
- Interface em TypeScript e React.
- Captura continua de audio autorizado de sistema/chamada quando o usuario ativa uma sessao.
- Suporte prioritario a Google Meet em navegador e Microsoft Teams.
- Streaming em tempo real para backend configurado pelo usuario via HTTPS.
- Exibicao de transcricao incremental com indicacao de trechos parciais e confirmados.
- Sugestoes dinamicas de resposta, perguntas, follow-ups e clarificacoes.
- Painel flutuante privado com comportamento always-on-top configuravel.
- Configuracoes para endpoint do backend, estado de conexao, dispositivos de audio, idioma e preferencias de sugestao.
- Armazenamento local seguro de segredos e tokens necessarios.
- Controles de privacidade para pausar captura, limpar sessao e limitar retencao local.

### Fora do escopo deste documento

- Plano de implementacao detalhado.
- Estimativas de prazo.
- Codigo do aplicativo.
- Design visual final.
- Contratos definitivos de API.
- Politicas juridicas externas ou termos de uso organizacionais.

## 6. Jornadas principais

### 6.1 Primeira configuracao

1. Usuario instala e abre o Voice Chat no Windows.
2. O aplicativo apresenta configuracoes essenciais: backend do usuario, autenticacao, dispositivo/fonte de audio e idioma principal.
3. O aplicativo valida o endpoint HTTPS do backend e confirma capacidade de conexao autenticada.
4. Credenciais e tokens sao salvos somente em armazenamento local seguro do sistema.
5. Usuario conclui a configuracao e deixa o painel pronto para uso.

### 6.2 Entrada em reuniao

1. Usuario entra em uma reuniao no Google Meet ou Microsoft Teams.
2. Usuario abre o Voice Chat e inicia uma sessao de captura.
3. O aplicativo mostra status de captura, conexao e processamento em tempo real.
4. O painel flutuante permanece visivel em uma posicao escolhida pelo usuario.

### 6.3 Conversa ao vivo

1. Enquanto os participantes falam, o audio e enviado continuamente ao backend.
2. O usuario ve transcricoes parciais surgindo com baixa latencia.
3. Trechos parciais sao refinados quando ha confirmacao do modelo ou do pipeline.
4. Sugestoes sao atualizadas enquanto a fala ainda esta acontecendo.
5. O usuario pode copiar uma sugestao, adaptar mentalmente a resposta ou ignorar o painel sem interromper a reuniao.

### 6.4 Pausa e retomada

1. Usuario pausa a captura quando necessario.
2. O aplicativo interrompe imediatamente o envio de audio.
3. O painel indica que a captura esta pausada.
4. Usuario retoma a sessao e o fluxo ao vivo volta sem exigir nova configuracao.

### 6.5 Encerramento da sessao

1. Usuario encerra a sessao.
2. O aplicativo para captura, streaming e atualizacoes.
3. Usuario pode limpar dados locais da sessao.
4. O aplicativo remove buffers temporarios e preserva apenas configuracoes permitidas.

## 7. Requisitos funcionais

### 7.1 Aplicativo desktop

- O produto deve funcionar exclusivamente em Windows.
- O aplicativo deve ser construido com Tauri 2.
- A camada nativa deve ser escrita em Rust.
- A UI deve ser escrita em TypeScript e React.
- O aplicativo deve iniciar rapidamente e permanecer leve durante reunioes.
- O painel deve poder ficar acima de outras janelas quando habilitado pelo usuario.
- O painel deve permitir reposicionamento e tamanho ajustavel.
- O painel deve ter estados claros: pronto, capturando, conectando, processando, pausado, erro e encerrado.

### 7.2 Captura de audio

- O aplicativo deve capturar audio autorizado do sistema, da chamada ou de dispositivo configurado pelo usuario.
- O usuario deve iniciar explicitamente a captura de cada sessao.
- O produto deve priorizar funcionamento com Google Meet em navegador e Microsoft Teams.
- A captura deve operar de forma continua, com buffering suficiente para estabilidade sem criar atraso excessivo.
- O aplicativo deve detectar ausencia de audio, falhas de dispositivo e perda de permissao.
- O usuario deve conseguir trocar fonte de audio nas configuracoes.
- O aplicativo nao deve capturar audio quando a sessao estiver pausada ou encerrada.

### 7.3 Streaming em tempo real

- O audio deve ser enviado continuamente ao backend do usuario.
- A conexao deve usar HTTPS ou WebSocket seguro sobre TLS.
- O cliente deve autenticar as requisicoes com credenciais armazenadas de forma segura.
- O cliente deve implementar reconexao controlada com backoff.
- O cliente deve evitar duplicacao excessiva de audio apos reconexao.
- O cliente deve exibir estado de conexao e erros acionaveis.

### 7.4 Transcricao ao vivo

- A UI deve exibir transcricao parcial em andamento.
- A UI deve diferenciar visualmente texto parcial de texto confirmado.
- A transcricao deve atualizar continuamente enquanto falas acontecem.
- O sistema deve preservar contexto recente suficiente para sugestoes relevantes.
- O usuario deve poder limpar a transcricao local da sessao.
- O produto deve lidar com sobreposicao de falas de forma robusta, ainda que a atribuicao perfeita de falante nao seja garantida.

### 7.5 Sugestoes em tempo real

- O produto deve gerar sugestoes enquanto a conversa esta em andamento.
- Sugestoes devem ser atualizadas conforme novas falas alteram o contexto.
- Sugestoes devem ser curtas, acionaveis e adequadas ao tom configurado.
- O usuario deve poder escolher tipos de sugestao, como resposta direta, pergunta de clarificacao, resumo do ponto atual ou proxima acao.
- O painel deve evitar excesso de sugestoes simultaneas.
- Sugestoes antigas devem ser substituidas ou rebaixadas quando o contexto mudar.
- O usuario deve poder copiar sugestoes.

### 7.6 Configuracoes

- O usuario deve configurar o endpoint do backend.
- O usuario deve configurar metodo de autenticacao suportado pelo backend.
- O usuario deve selecionar idioma principal e, quando disponivel, idiomas adicionais.
- O usuario deve selecionar fonte de audio.
- O usuario deve configurar preferencias de retencao local.
- O usuario deve ter controles para limpar credenciais, historico local e dados temporarios.

### 7.7 Observabilidade local

- O aplicativo deve mostrar eventos tecnicos relevantes sem expor conteudo sensivel.
- Logs locais devem omitir audio, transcricoes completas, sugestoes completas, tokens e chaves.
- Erros devem conter codigos ou mensagens suficientes para diagnostico sem vazar dados privados.

## 8. Requisitos de qualidade e desempenho

- Latencia alvo entre fala audivel e transcricao parcial visivel: ate 2 segundos em condicoes normais de rede e backend.
- Latencia alvo entre mudanca de contexto e sugestao atualizada: ate 5 segundos em condicoes normais.
- Captura e UI devem continuar responsivas durante reunioes longas.
- O aplicativo deve controlar uso de CPU e memoria para nao degradar a chamada.
- O app deve sobreviver a perdas temporarias de rede com reconexao transparente quando possivel.
- O app deve manter integridade de estado ao suspender, bloquear tela ou alternar dispositivos de audio.
- Falhas de backend ou IA nao devem travar o cliente desktop.
- Atualizacoes de UI devem ser incrementais e nao bloquear interacao do usuario.

## 9. Arquitetura e restricoes tecnicas

### 9.1 Visao geral

A arquitetura deve separar tres responsabilidades:

- Cliente desktop: captura autorizada de audio, seguranca local, UI, streaming e exibicao em tempo real.
- Backend do usuario: autenticacao, controle de acesso, rate limiting, validacao, roteamento para IA e politicas de retencao.
- Servico de IA: transcricao, interpretacao contextual e geracao de sugestoes.

### 9.2 Cliente Tauri

- Tauri 2 deve ser usado como base do aplicativo desktop.
- Rust deve cuidar de captura de audio, integracao com APIs do Windows, controle de buffers, armazenamento seguro e comunicacao de rede.
- React e TypeScript devem cuidar do painel, estados visuais, transcricao, sugestoes e configuracoes.
- A fronteira Rust-frontend deve expor comandos pequenos e validados.
- Nenhuma chave de API de servicos de IA deve estar no codigo cliente, no bundle da UI ou em arquivos distribuidos com o aplicativo.

### 9.3 Backend controlado pelo usuario

- O backend deve ser obrigatorio para chamadas a servicos de IA.
- O cliente deve se comunicar apenas com endpoints HTTPS configurados e validados.
- O backend deve autenticar usuarios e sessoes.
- O backend deve aplicar rate limit por usuario, dispositivo ou token.
- O backend deve validar tamanho, formato e frequencia de mensagens recebidas.
- O backend deve isolar credenciais de provedores de IA.
- O backend deve aplicar politicas de retencao e descarte de dados.

### 9.4 Comunicacao em tempo real

- O protocolo deve suportar envio continuo de audio e recebimento incremental de transcricoes e sugestoes.
- WebSocket seguro ou outro transporte streaming sobre TLS deve ser suportado.
- Mensagens devem ter schema versionado.
- O cliente deve rejeitar mensagens inesperadas, malformadas ou maiores que limites definidos.
- O sistema deve suportar identificadores de sessao sem expor dados sensiveis.

## 10. Dados, privacidade e seguranca

### 10.1 Principios

- Minimizar dados capturados, enviados, armazenados e logados.
- Manter chaves de IA e segredos fora do cliente desktop.
- Usar menor privilegio possivel para captura, rede, arquivos e armazenamento local.
- Tratar audio, transcricao e sugestoes como dados sensiveis.
- Dar ao usuario controles claros para iniciar, pausar, encerrar e limpar sessoes.

### 10.2 Segredos e credenciais

- Credenciais locais devem ser armazenadas com mecanismo seguro do Windows, como Windows Credential Manager ou protecao equivalente.
- Tokens nao devem ser gravados em texto claro.
- Segredos nao devem aparecer em logs, crash reports ou mensagens de erro.
- O aplicativo deve permitir revogar ou remover credenciais locais.
- Chaves de provedores de IA devem existir somente no backend do usuario ou em infraestrutura segura equivalente.

### 10.3 Seguranca de rede

- Toda comunicacao com backend deve usar HTTPS/TLS.
- Certificados invalidos nao devem ser aceitos silenciosamente.
- O cliente deve validar origem, protocolo e formato do endpoint configurado.
- O backend deve exigir autenticacao para streaming e operacoes administrativas.
- O backend deve aplicar rate limiting e limites de payload para reduzir abuso e custo indevido.
- O sistema deve considerar protecoes contra replay, sequestro de sessao e conexoes nao autorizadas.

### 10.4 Validacao e abuso

- Todos os comandos da UI para Rust devem validar parametros.
- Entradas vindas do backend devem ser tratadas como nao confiaveis ate validacao.
- O app deve impor limites para tamanho de transcricao, quantidade de sugestoes e crescimento de buffers.
- O backend deve validar audio, metadados, identificadores de sessao e configuracoes recebidas.
- O sistema deve evitar que mensagens de IA renderizem HTML ou scripts arbitrarios na UI.

### 10.5 Retencao e logs

- Audio bruto deve ser descartado assim que nao for mais necessario para streaming e recuperacao curta.
- Retencao local de transcricoes deve ser configuravel e desligavel.
- Logs devem ser sanitizados para remover conteudo de reuniao, tokens, endpoints sensiveis e identificadores desnecessarios.
- Dados temporarios devem ser apagados ao encerrar sessao quando a configuracao assim determinar.

## 11. Requisitos de interface

- O painel deve ser discreto e utilizavel junto com Google Meet e Microsoft Teams.
- O usuario deve conseguir identificar rapidamente se o app esta ouvindo, pausado ou desconectado.
- A transcricao deve ser legivel em reunioes longas.
- Sugestoes devem ocupar area separada da transcricao.
- Controles principais devem estar sempre acessiveis: iniciar, pausar, retomar, encerrar e limpar.
- Alertas de erro devem explicar acao recomendada sem expor detalhes sensiveis.
- O painel deve suportar tema claro/escuro ou acompanhar configuracao do sistema quando possivel.

## 12. Nao objetivos

- Nao substituir o cliente oficial do Google Meet ou Microsoft Teams.
- Nao gravar reunioes automaticamente sem acao do usuario.
- Nao armazenar chaves de IA no cliente desktop.
- Nao oferecer uma experiencia baseada em upload manual de arquivos de audio.
- Nao depender de processamento em lotes como fluxo principal.
- Nao criar codigo de aplicativo neste documento.
- Nao definir plano de acao, backlog sprint a sprint ou cronograma neste PRD.

## 13. Metricas de sucesso

- Percentual de sessoes com transcricao parcial iniciada em ate 2 segundos apos audio detectado.
- Latencia mediana de sugestoes abaixo de 5 segundos em condicoes normais.
- Taxa de sessoes encerradas sem erro critico.
- Uso medio de CPU e memoria dentro de limites aceitaveis durante reunioes de 60 minutos.
- Percentual de reconexoes recuperadas sem reinicio manual.
- Frequencia de uso dos controles de copiar sugestao e pausar captura.
- Satisfacao do usuario com utilidade, discricao e confiabilidade das sugestoes.
- Numero de incidentes de exposicao de dados sensiveis igual a zero.

## 14. Riscos

- Captura de audio do sistema no Windows pode variar por dispositivo, driver, navegador e configuracao corporativa.
- Mudancas em Google Meet, Microsoft Teams ou politicas do Windows podem afetar a confiabilidade da captura.
- Latencia de rede, backend ou provedor de IA pode prejudicar a sensacao de conversa ao vivo.
- Sugestoes ruins, tardias ou fora de contexto podem distrair o usuario.
- Uso elevado de CPU pode degradar a reuniao.
- Configuracoes inseguras de backend do usuario podem expor audio, transcricoes ou credenciais.
- Logs e diagnosticos mal projetados podem vazar conteudo sensivel.
- Ambientes corporativos podem bloquear instalacao, captura de audio, WebSocket ou endpoints externos.

## 15. Perguntas em aberto

- Quais metodos de captura de audio no Windows serao suportados oficialmente por versao do sistema?
- O produto deve detectar automaticamente Google Meet e Teams ou depender somente de inicio manual da sessao?
- Quais provedores de IA e modelos de transcricao/sugestao serao suportados inicialmente pelo backend?
- Qual contrato de mensagens streaming sera adotado entre cliente e backend?
- Quais politicas padrao de retencao local devem vir habilitadas?
- Havera suporte a diarizacao de falantes ou apenas transcricao agregada?
- Quais controles administrativos serao exigidos para uso em equipes?
- Quais requisitos de distribuicao, assinatura de codigo e atualizacao automatica serao obrigatorios no Windows?
