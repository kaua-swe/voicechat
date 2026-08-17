# Roadmap Estrategico - Voice Chat

## Visao do roadmap

Este roadmap organiza a evolucao do Voice Chat em fases estrategicas de produto. Ele nao substitui o plano operacional de implementacao: seu objetivo e orientar marcos de maturidade, decisoes importantes e capacidades esperadas ao longo da evolucao do produto.

O produto parte de uma base Windows-only, construida com Tauri 2, Rust para logica nativa de audio e seguranca, e TypeScript/React para a interface. A experiencia central deve permanecer continua e em tempo real: audio autorizado flui durante a conversa, transcricoes parciais surgem sem interrupcao e sugestoes sao atualizadas enquanto os participantes ainda estao falando.

## Principios estrategicos

- Experiencia ao vivo acima de fluxos em lote: o produto deve se comportar como apoio continuo de conversa, nao como processamento posterior.
- Controle do usuario sobre a infraestrutura sensivel: chamadas a IA passam por backend HTTPS controlado pelo usuario.
- Seguranca por desenho: nenhuma chave de IA no cliente, menor privilegio, armazenamento seguro de segredos, validacao de entradas, conectores auditaveis e logs sanitizados.
- Privacidade operacional: capturar, transmitir, armazenar e logar apenas o necessario.
- Robustez em ambiente real: funcionar com variacoes de audio, rede, reunioes longas e aplicativos de reuniao comuns no Windows.

## Fase 1 - Fundacoes do produto

### Proposito

Estabelecer a base tecnica, de seguranca e de experiencia do Voice Chat para sustentar todas as capacidades futuras sem retrabalho estrutural relevante.

### Resultados esperados

- Aplicacao desktop Windows estruturada em Tauri 2.
- Camada nativa em Rust preparada para operacoes sensiveis.
- Interface em TypeScript/React preparada para estados ao vivo.
- Separacao clara entre cliente desktop, backend do usuario e servicos de IA.
- Politicas iniciais de seguranca e privacidade documentadas e refletidas na arquitetura.

### Capacidades-chave

- Bootstrap do aplicativo Tauri 2 para Windows.
- Estrutura de repositorio, documentacao e padroes de desenvolvimento.
- Shell desktop basico com comunicacao segura entre frontend e Rust.
- Modelo inicial de configuracao sem segredos embutidos no cliente.
- Definicao de contratos internos para comandos, estados e eventos.

### Dependencias e gates de decisao

- Confirmar toolchain Windows para Rust, Node.js, TypeScript, React e Tauri 2.
- Definir padroes de empacotamento, assinatura futura e atualizacao segura.
- Validar estrategia de armazenamento local seguro no Windows.
- Confirmar que o cliente nunca armazenara chaves de provedores de IA.

### Sinal de conclusao

A base desktop abre no Windows, executa verificacoes essenciais de build e tipo, expoe um shell seguro para evolucao da UI e deixa documentada a separacao entre cliente, backend e IA.

## Fase 2 - Audio nativo Windows e sessao ao vivo

### Proposito

Transformar o shell desktop em uma experiencia real de sessao ao vivo, com captura autorizada de audio, controle de ciclo de vida e estados confiaveis.

### Resultados esperados

- Captura nativa de audio no Windows funcionando sob controle explicito do usuario.
- Sessao com inicio, pausa, retomada e encerramento claros.
- Buffers e recursos nativos controlados para reunioes longas.
- Painel flutuante privado pronto para acompanhar a conversa.

### Capacidades-chave

- Enumeracao e selecao de fontes de audio.
- Captura continua de audio autorizado do sistema, chamada ou dispositivo configurado.
- Controle imediato de pausa e encerramento.
- Estados de audio: pronto, capturando, silencio, falha de dispositivo, pausado e encerrado.
- Painel flutuante reposicionavel, discreto e configuravel para ficar acima de outras janelas.

### Dependencias e gates de decisao

- Escolher APIs Windows adequadas para captura de audio e compatibilidade de dispositivos.
- Validar limites de uso de CPU, memoria e tamanho de buffers.
- Confirmar modelo de permissoes e menor privilegio para captura.
- Decidir como o app detecta ou orienta selecao de fontes em reunioes.

### Sinal de conclusao

O usuario consegue iniciar uma sessao local, capturar audio autorizado de forma continua, pausar e encerrar sem vazamento de captura ou crescimento indevido de recursos.

## Fase 3 - Inteligencia conversacional e experiencia de sugestoes

### Proposito

Entregar a proposta central do produto: transcricao ao vivo e sugestoes dinamicas em um painel privado que acompanha a conversa enquanto ela acontece.

### Resultados esperados

- Transcricao parcial e confirmada fluindo continuamente.
- Sugestoes atualizadas conforme o contexto muda.
- Experiencia de chat privado que nao exige alternar para um fluxo manual.
- Controles de contexto, idioma, tom e tipos de sugestao.

### Capacidades-chave

- Pipeline de eventos de fala, transcricao parcial, transcricao final e sugestao.
- Renderizacao incremental de texto no painel.
- Separacao visual entre transcricao e sugestoes.
- Sugestoes de resposta direta, pergunta de clarificacao, resumo e proxima acao.
- Janela de contexto limitada e configuravel para reduzir exposicao de dados.
- Copia rapida de sugestoes e descarte de sugestoes obsoletas.

### Dependencias e gates de decisao

- Definir contrato streaming entre cliente e backend.
- Selecionar transporte principal: WebSocket seguro, WebRTC ou combinacao por cenario.
- Estabelecer limites de contexto enviados ao backend e ao servico de IA.
- Validar que conteudo vindo do backend nao consegue injetar HTML, script ou comandos na UI.
- Definir criterios de qualidade para latencia, utilidade e estabilidade de sugestoes.

### Sinal de conclusao

Durante uma conversa real, o painel mostra transcricao parcial com baixa latencia e atualiza sugestoes enquanto os participantes ainda falam, sem exigir parar a gravacao ou disparar processamento manual.

## Fase 4 - Interoperabilidade com Google Meet e Microsoft Teams

### Proposito

Consolidar o comportamento do Voice Chat nos ambientes de reuniao prioritarios: Google Meet em navegador e Microsoft Teams no Windows.

### Resultados esperados

- Experiencia confiavel nos fluxos reais de reuniao suportados.
- Orientacoes claras para configuracao de audio em cada plataforma.
- Painel utilizavel junto das interfaces de Meet e Teams.
- Registro de limitacoes conhecidas por navegador, dispositivo ou politica corporativa.

### Capacidades-chave

- Validacao em Google Meet com navegadores suportados.
- Validacao em Microsoft Teams para Windows.
- Ajustes de UX para posicionamento do painel e visibilidade durante chamadas.
- Deteccao de estados problematicos, como ausencia de audio ou troca de dispositivo.
- Documentacao de compatibilidade e troubleshooting.

### Dependencias e gates de decisao

- Confirmar navegadores e versoes do Teams oficialmente suportados.
- Decidir se havera deteccao automatica de contexto de reuniao ou somente inicio manual.
- Auditar qualquer conector, integracao ou mecanismo auxiliar usado para interoperabilidade.
- Validar comportamento em ambientes com politicas corporativas restritivas.

### Sinal de conclusao

O produto funciona em cenarios representativos de Google Meet e Microsoft Teams, com captura, streaming, transcricao e sugestoes estaveis o suficiente para uso continuo em reunioes reais.

## Fase 5 - Backend seguro, qualidade e prontidao de release

### Proposito

Elevar o produto para um nivel de seguranca, resiliencia e operacao adequado para distribuicao profissional no Windows.

### Resultados esperados

- Backend HTTPS autenticado e resistente a abuso.
- Segredos protegidos fora do cliente desktop.
- Observabilidade sem exposicao de dados sensiveis.
- Testes de seguranca, estabilidade e recuperacao de falhas.
- Empacotamento Windows preparado para release.

### Capacidades-chave

- Gateway backend com autenticacao, autorizacao e rate limits.
- Gerenciamento seguro de chaves de IA no servidor.
- Validacao de payloads, limites de tamanho e protecao contra mensagens malformadas.
- Logs sanitizados no cliente e no backend.
- Armazenamento local seguro de tokens e configuracoes sensiveis.
- Reconexao com backoff, recuperacao de falhas e degradacao controlada.
- Instalador, assinatura de codigo e estrategia de atualizacao segura.

### Dependencias e gates de decisao

- Definir mecanismo de autenticacao entre cliente e backend.
- Confirmar politica de retencao de audio, transcricoes, sugestoes e logs.
- Executar revisao de ameacas para cliente, backend, transporte e integracoes.
- Validar dependencias contra vulnerabilidades conhecidas.
- Decidir estrategia de distribuicao, assinatura e atualizacao.

### Sinal de conclusao

O Voice Chat pode ser instalado e executado em um Windows limpo de teste, conecta-se a um backend seguro, nao expoe segredos, lida com falhas previsiveis e possui verificacoes de qualidade e seguranca antes de distribuicao.

## Fase 6 - Evolucao posterior do produto

### Proposito

Expandir valor, controles e maturidade do Voice Chat apos a consolidacao da experiencia central, mantendo a arquitetura segura e controlada pelo usuario.

### Resultados esperados

- Experiencia mais configuravel para diferentes perfis profissionais.
- Recursos avancados de contexto e memoria controlada.
- Melhor suporte a idiomas, dominios e formatos de reuniao.
- Opcoes organizacionais sem comprometer privacidade e seguranca.

### Capacidades-chave

- Perfis de sugestao por tipo de reuniao, como vendas, suporte, entrevistas ou planejamento.
- Controles refinados de idioma, tom, formalidade e nivel de assertividade.
- Resumos locais de sessao quando explicitamente habilitados.
- Integracoes futuras auditadas e com permissoes minimas.
- Politicas administraveis para equipes, incluindo configuracao de backend e retencao.
- Melhorias de diarizacao, deteccao de topicos e acompanhamento de decisoes.

### Dependencias e gates de decisao

- Validar demanda real dos usuarios por cada expansao.
- Confirmar que novos conectores ou integracoes passam por auditoria de seguranca.
- Definir limites de retencao e consentimento operacional para recursos de memoria ou resumo.
- Garantir que novas capacidades nao prejudiquem latencia da experiencia ao vivo.
- Reavaliar custos de IA, rate limits e escalabilidade do backend.

### Sinal de conclusao

O produto evolui alem da experiencia central com capacidades configuraveis e integracoes auditadas, preservando interacao continua, privacidade, seguranca e controle do usuario sobre infraestrutura sensivel.

## Marcos transversais

### Seguranca e privacidade

- Nenhuma chave de API deve existir no cliente, no bundle ou em arquivos distribuidos.
- Credenciais locais devem usar armazenamento seguro do Windows.
- Todo transporte externo deve usar HTTPS/TLS ou equivalente seguro.
- Entradas do usuario, do backend e de servicos externos devem ser validadas.
- Logs devem ser sanitizados e minimizados.
- Conectores e integracoes devem ser auditaveis e operar com menor privilegio.

### Qualidade da experiencia ao vivo

- Transcricao parcial deve aparecer com baixa latencia.
- Sugestoes devem acompanhar a conversa sem depender de turnos manuais.
- Falhas de rede, backend ou audio devem degradar a experiencia sem travar o app.
- O painel deve permanecer legivel, discreto e responsivo durante reunioes longas.

### Sustentabilidade tecnica

- Contratos de eventos devem ser versionados.
- Componentes criticos devem ter testes automatizados.
- Dependencias devem ser monitoradas contra vulnerabilidades.
- Decisoes de arquitetura devem ser documentadas quando afetarem seguranca, privacidade ou interoperabilidade.
