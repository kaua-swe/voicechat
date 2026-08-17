# Plano de Acao - Voice Chat

## Regra de execucao

A fila deve ser executada com apenas um item ativo por vez. Um novo item so deve iniciar quando o item anterior estiver concluido, validado e documentado, ou quando houver uma decisao explicita de reordenacao.

Cada item abaixo esta com status `Aguardando` ate ser selecionado para execucao.

## Fila de implementacao

### 1. Repositorio, toolchain e bootstrap Tauri 2 Windows

- Status: `Aguardando`
- Objetivo: criar a base do projeto Windows com Tauri 2, Rust, TypeScript e React, incluindo estrutura de pastas, scripts de desenvolvimento, formatacao, lint e verificacoes iniciais.
- Dependencias: PRD aprovado; ambiente Windows com Rust, Node.js e ferramentas nativas exigidas pelo Tauri 2.
- Entregaveis:
  - Repositorio inicial organizado.
  - Projeto Tauri 2 funcional em modo desenvolvimento.
  - UI React/TypeScript inicial carregando dentro do shell desktop.
  - Scripts documentados para instalar, rodar, testar e empacotar.
  - Configuracoes basicas de lint, formatacao e checagem de tipos.
- Criterios de aceitacao:
  - O aplicativo abre no Windows via comando de desenvolvimento.
  - Build basico do frontend e checagem Rust executam sem erro.
  - Nenhuma chave, token ou segredo existe no codigo, no bundle ou em arquivos versionados.
  - Estrutura do repositorio deixa claro onde ficarao cliente desktop, documentacao e testes.

### 2. Shell desktop seguro e desenho do painel flutuante

- Status: `Aguardando`
- Objetivo: implementar a janela principal e o painel privado flutuante com estados de sessao, controles principais e isolamento seguro entre UI e comandos nativos.
- Dependencias: item 1 concluido.
- Entregaveis:
  - Janela/painel always-on-top configuravel.
  - Controles de iniciar, pausar, retomar, encerrar e limpar sessao.
  - Estados visuais: pronto, capturando, conectando, processando, pausado, erro e encerrado.
  - Ponte Tauri com comandos Rust pequenos, tipados e validados.
  - Layout responsivo para uso junto de Google Meet e Microsoft Teams.
- Criterios de aceitacao:
  - O painel pode ser movido, redimensionado e mantido acima de outras janelas.
  - A UI nao renderiza HTML arbitrario vindo de dados externos.
  - Todos os comandos de UI para Rust validam parametros.
  - Erros aparecem de forma acionavel sem expor segredos ou conteudo sensivel.

### 3. Camada de captura de audio do Windows

- Status: `Aguardando`
- Objetivo: criar a camada nativa de captura autorizada de audio do sistema, chamada ou dispositivo selecionado, com controles de ciclo de vida e protecao contra captura fora de sessao.
- Dependencias: item 2 concluido.
- Entregaveis:
  - Enumeracao de fontes/dispositivos de audio disponiveis.
  - Captura continua com buffers controlados.
  - Inicio, pausa, retomada e encerramento confiaveis.
  - Deteccao de silencio, falha de dispositivo e perda de permissao.
  - Limites de memoria para buffers temporarios.
- Criterios de aceitacao:
  - O app captura audio apenas apos acao explicita do usuario.
  - Ao pausar ou encerrar, o envio e a captura param imediatamente.
  - Buffers nao crescem sem limite.
  - Audio bruto temporario e descartado quando nao e mais necessario.
  - Falhas de dispositivo nao travam o aplicativo.

### 4. Pipeline ao vivo com WebRTC/WebSocket e eventos de fala/transcricao

- Status: `Aguardando`
- Objetivo: implementar o transporte em tempo real entre cliente e backend para audio continuo e eventos incrementais de transcricao.
- Dependencias: item 3 concluido; contrato inicial de mensagens definido.
- Entregaveis:
  - Cliente de streaming seguro com WebSocket sobre TLS e/ou WebRTC conforme decisao tecnica.
  - Schema versionado para mensagens de audio, estado, transcricao parcial e transcricao confirmada.
  - Reconexao com backoff e controle de duplicacao.
  - Validacao de payloads recebidos.
  - Atualizacao incremental da UI.
- Criterios de aceitacao:
  - Audio flui continuamente para o backend em sessao ativa.
  - Transcricoes parciais aparecem sem fluxo manual de gravar/parar/processar.
  - Mensagens malformadas, inesperadas ou grandes demais sao rejeitadas.
  - Perdas temporarias de rede sao tratadas sem travar a UI.
  - Estado de conexao fica claro para o usuario.

### 5. Gateway backend HTTPS com segredos, autenticacao e rate limits

- Status: `Aguardando`
- Objetivo: criar o backend controlado pelo usuario para receber streaming autenticado, proteger chaves de IA, aplicar politicas de abuso e encaminhar dados ao servico de IA.
- Dependencias: item 4 concluido ou contrato de streaming suficientemente estabilizado.
- Entregaveis:
  - API HTTPS autenticada.
  - Gerenciamento seguro de segredos no servidor.
  - Rate limits por usuario, token, dispositivo ou sessao.
  - Validacao de entrada para audio, metadados e eventos.
  - Sanitizacao de logs.
  - Adaptador inicial para servico de IA de transcricao.
- Criterios de aceitacao:
  - Chaves de IA nunca sao enviadas ao cliente desktop.
  - Endpoints exigem autenticacao.
  - Payloads invalidos sao recusados com erro controlado.
  - Rate limiting reduz abuso, custo indevido e tentativas automatizadas.
  - Logs nao contem audio bruto, transcricoes completas, sugestoes completas, tokens ou segredos.

### 6. Motor de sugestoes ao vivo e controles de contexto

- Status: `Aguardando`
- Objetivo: gerar sugestoes dinamicas e contextuais enquanto a conversa acontece, com controles para tipo, tom, idioma e janela de contexto.
- Dependencias: itens 4 e 5 concluidos.
- Entregaveis:
  - Pipeline de contexto recente para sugestoes.
  - Eventos de sugestao incremental.
  - Preferencias de tipo de sugestao: resposta direta, pergunta de clarificacao, resumo e proxima acao.
  - Controles de idioma e tom.
  - Politica de substituicao/rebaixamento de sugestoes antigas.
- Criterios de aceitacao:
  - Sugestoes atualizam enquanto os participantes ainda estao falando.
  - Sugestoes antigas nao poluem a tela quando o contexto muda.
  - A UI limita quantidade e tamanho das sugestoes.
  - O usuario consegue copiar sugestoes.
  - Dados enviados ao modelo respeitam minimizacao e janela de contexto configurada.

### 7. Validacao com Google Meet e Microsoft Teams

- Status: `Aguardando`
- Objetivo: validar o comportamento real do produto em reunioes no Google Meet em navegador e no Microsoft Teams para Windows.
- Dependencias: itens 3, 4, 5 e 6 concluidos em nivel testavel.
- Entregaveis:
  - Matriz de testes por aplicativo, navegador, dispositivo de audio e cenario de rede.
  - Testes de reuniao com fala unica, multiplos falantes, silencio e sobreposicao.
  - Registro de incompatibilidades e alternativas de configuracao.
  - Ajustes de UX para uso simultaneo com as janelas de reuniao.
- Criterios de aceitacao:
  - Captura e transcricao funcionam em cenarios representativos de Google Meet.
  - Captura e transcricao funcionam em cenarios representativos de Microsoft Teams.
  - O painel permanece utilizavel sem atrapalhar controles essenciais da reuniao.
  - Problemas conhecidos ficam documentados com mitigacoes claras.

### 8. Observabilidade, resiliencia e testes de seguranca

- Status: `Aguardando`
- Objetivo: fortalecer confiabilidade e seguranca com logs sanitizados, diagnosticos, testes automatizados e revisao de cenarios de abuso.
- Dependencias: itens 4, 5, 6 e 7 concluidos.
- Entregaveis:
  - Logs locais e de backend com sanitizacao.
  - Testes unitarios e de integracao para validacao de comandos, payloads e estados.
  - Testes de reconexao, falha de backend, queda de rede e troca de dispositivo.
  - Revisao de armazenamento local seguro.
  - Checklist de seguranca para autenticacao, autorizacao, injecao, rate limit, logs, dependencias e configuracoes.
- Criterios de aceitacao:
  - Testes principais executam sem erro.
  - Falhas previsiveis retornam estados controlados.
  - Nenhum segredo aparece em logs, erros ou artefatos de build.
  - Dependencias passam por verificacao de vulnerabilidades conhecidas.
  - Abusos comuns de entrada e conexao sao bloqueados ou limitados.

### 9. Instalador, atualizador e prontidao de release

- Status: `Aguardando`
- Objetivo: preparar distribuicao Windows com instalador, assinatura, atualizacao, documentacao operacional e verificacoes finais de release.
- Dependencias: item 8 concluido.
- Entregaveis:
  - Configuracao de empacotamento Tauri para Windows.
  - Instalador validado.
  - Estrategia de assinatura de codigo.
  - Estrategia de atualizacao segura.
  - Guia de instalacao, configuracao de backend e troubleshooting.
  - Checklist final de release.
- Criterios de aceitacao:
  - Instalador cria uma instalacao funcional em Windows limpo de teste.
  - Atualizacao valida integridade e origem antes de aplicar mudanças.
  - Build de release nao contem segredos.
  - Documentacao permite configurar backend e iniciar uma sessao real.
  - Checklist de release nao possui bloqueios criticos em aberto.

## Proxima acao recomendada

Iniciar o item 1: repositorio, toolchain e bootstrap Tauri 2 Windows. Essa etapa estabelece a base tecnica para todo o restante da fila e deve confirmar que Rust, Tauri 2, TypeScript e React funcionam corretamente no ambiente Windows antes de qualquer implementacao de captura, streaming ou IA.
