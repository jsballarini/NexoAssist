# Histórias de usuário

Formato: Como [persona], quero [ação], para [benefício]. Critérios de aceite resumidos; fase de entrega entre parênteses.

## Funcionário

### US-F01 — Tirar dúvida sem chamado

Como funcionário, quero perguntar sobre um problema de TI e receber resposta da central de ajuda no chat, para não abrir chamado desnecessário.

**Aceite:** Agent busca KB; cita artigo no trace; não cria INC/REQ se resolvido. **(F3)**

### US-F02 — Consultar status sem número

Como funcionário, quero saber como estão meus chamados abertos mesmo sem lembrar o ID, para acompanhar andamento.

**Aceite:** Lista seletor; card com SLA e indicação de vencido. **(F3)**

### US-F03 — Complementar, atualizar ou reabrir chamado

Como funcionário, quero adicionar informações a um chamado **aberto** ou **reabrir** um resolvido recentemente (≤ 7 dias) pela conversa, para o analista ter contexto sem duplicar IDs.

**Aceite:** Update em aberto com confirmação; reabertura do mesmo ID quando aplicável (SLA `dueAt` recalculado); nunca duplicar INC/REQ para o mesmo problema. **(F4)**

### US-F04 — Abrir chamado conversando

Como funcionário, quero descrever o problema e revisar um rascunho antes de criar o chamado, para evitar erros.

**Aceite:** Perguntas de completude; card rascunho; Confirmar/Editar/Cancelar. **(F4)**

### US-F05 — Falar com analista

Como funcionário, quero ser transferido quando preferir ou quando for grave, para atendimento humano.

**Aceite:** Transferência; agent silenciado; mensagem clara de espera. **(F4–F5)**

### US-F06 — Continuar outro dia

Como funcionário, quero retomar a conversa após logout/restart, para não repetir tudo.

**Aceite:** Histórico persistido; nova sessão após 30 msgs preserva arquivo. **(F1–F3)**

### US-F07 — Ver o que o agent fez

Como funcionário, quero chips e detalhe de decisão, para confiar e auditar respostas.

**Aceite:** Status line + painel expand com confidence e regras. **(F3)**

### US-F08 — Perfil e sair

Como funcionário, quero ver meus dados e sair com segurança.

**Aceite:** Tela perfil; logout invalida sessão. **(F1)**

## Analista

### US-A01 — Chamados bem qualificados

Como analista, quero receber chamados com tipo, categoria, prioridade e descrição úteis, para não refazer triagem.

**Aceite:** Chamados criados pelo agent passam validação ticket-service. **(F4–F5)**

### US-A02 — Ver fila de conversas

Como analista, quero listar conversas que precisam de mim, inclusive quando o agent não tinha segurança, para priorizar.

**Aceite:** Filtros do protótipo; badges de estado e confiança. **(F5)**

### US-A03 — Assumir conversa

Como analista, quero assumir atendimento com o agent pausado, para responder sem conflito com a IA.

**Aceite:** Estado `with_analyst`; composer desbloqueado; 409 se já assumida. **(F5)**

### US-A04 — Devolver ao agent

Como analista, quero devolver a conversa ao agent com histórico preservado, para o funcionário continuar com o assistente.

**Aceite:** Nota de sistema visível; mensagens `role=analyst` no histórico; agent pode retomar. **(F5)**

### US-A05 — Encerrar atendimento

Como analista, quero encerrar a conversa quando resolvido, para tirar da fila.

**Aceite:** Estado `closed`; sem respostas agent posteriores. **(F5)**

### US-A06 — Contexto de chamados

Como analista, quero ver chamados do funcionário no painel lateral, para decisão rápida.

**Aceite:** Painel 340px; chamado desta conversa destacado. **(F5)**

### US-A07 — Trace completo

Como analista, quero log estruturado das decisões do agent na conversa, para entender triagem prévia.

**Aceite:** UI analista com mais detalhe que expand do funcionário. **(F5)**