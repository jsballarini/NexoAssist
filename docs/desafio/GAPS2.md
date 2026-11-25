# Gaps 2 — comportamento real vs PRD v5

**Data:** 2026-11-24  
**Versão app analisada:** `0.7.1-m7.1` (análise original; Etapa 01 em `0.8.0-m8.1`; Etapa 02 em `0.8.0-m8.2`; Etapa 03 em `0.8.0-m8.3`; **consolidação** paridade UI e E2E em `0.9.0`)  
**Baseline:** [PRD v5](Desafio_Tecnico_Nexo_Assist_PRD_v5.pdf) + protótipo [nexo/nexo.pen](nexo/nexo.pen)

Complementa [GAPS.md](GAPS.md). O `GAPS.md` mede a entrega contra a especificação interna (02-xx) e marca tudo como resolvido. Este documento mede o **comportamento do código** contra o PRD, com foco nos critérios de avaliação ("Qualidade das decisões", "Condução da conversa", "Transparência").

Legenda de severidade: **C** crítico · **M** médio · **B** baixo.  
Status: `aberto` | `em andamento` | `resolvido` | `adiado`.

---

## Resumo

| Grupo | Itens | C | M | B |
|-------|-------|---|---|---|
| A. Núcleo do agent | 4 | 3 | 1 | 0 |
| B. Regras do service desk (Anexo A) | 7 | 0 | 7 | 0 |
| C. Resiliência e privacidade | 2 | 0 | 2 | 0 |
| D. Interface do funcionário | 3 | 0 | 2 | 1 |
| E. Serviço de chamados | 2 | 0 | 2 | 0 |
| F. Console do analista | 2 | 0 | 1 | 1 |
| G. Qualidade e entrega | 5 | 0 | 3 | 2 |

Verificado em 2026-11-24: `npx tsc --noEmit` sem erros (`strict: true`); `vitest run tests/unit` com 15/15 testes passando. E2E, evals e testes de integração não foram executados nesta análise (dependem do banco).

---

## A. Núcleo do agent

### G2-AG-01 · C · O agent decide por regex, não por entendimento — `resolvido`

> **Resolução (0.8.0-m8.1):** `lib/agent/mastra/` expõe `runTool` como ferramentas Mastra; o modelo escolhe as ferramentas. A fixture (`AGENT_EVAL_FIXTURES=true`) ficou data-driven, sem nome de usuário nem IDs fixos.

**PRD:** "O agent: decide o que fazer a cada mensagem"; critério *Qualidade das decisões*.

**Situação:** `matchPlan` em `lib/agent/fixture-turn.ts` é uma cadeia de `if (/regex/.test(...))` acoplada ao seed (`INC-20311`, `INC-20150`, nome do usuário `diego`, "VPN Windows 11", "reunião 14h"). No modo LLM, `lib/agent/llm-turn.ts` executa o mesmo roteiro e usa o modelo apenas para reescrever o texto final. Mensagens fora do roteiro ("meu mouse parou", "preciso de acesso ao Jira") caem no fallback genérico com confiança 55%.

**Aceite:**
- O LLM escolhe as ferramentas (*tool calling*) a partir da mensagem e do histórico.
- Qualquer problema de TI descrito livremente gera o fluxo correto (KB, consulta, rascunho ou transferência).
- O modo fixture fica restrito a CI/evals determinísticos, sem regras dependentes de nome de usuário ou ID de chamado.

### G2-AG-02 · C · O agent não recebe o histórico da conversa — `resolvido`

> **Resolução (0.8.0-m8.1):** `loadTurnContext` entrega histórico (`AGENT_HISTORY_MAX_MESSAGES`), rascunho pendente, estado e chamado em foco via `TurnContext`. Quick reply de escopo refaz o rascunho (cancel + create).

**PRD:** histórias do funcionário 4 e 6; critério *Condução da conversa* ("mantém o contexto").

**Situação:** `executeTurn` (`src/lib/conversation/turn-runner.ts`) passa só `params.content` para `runAgentTurn`. Consequências:
- Respostas rápidas ("Só eu", "Equipe (5–20)", "É VPN") chegam como mensagem isolada e caem no fallback; o fluxo de perguntas da Tela 2 não fecha.
- "Voltar outro dia e continuar de onde parei" funciona só visualmente.
- Rascunhos pendentes da conversa não são conhecidos pelo agent no turno seguinte.

**Aceite:**
- O agent recebe as últimas N mensagens (N configurável) e o estado relevante da conversa (rascunho pendente, chamado em foco).
- Responder "Só eu" a uma pergunta de escopo atualiza o rascunho em andamento.
- Ao retomar uma sessão anterior, o agent consegue referenciar o assunto dela.

### G2-AG-03 · C · Mastra / LangGraph.js não utilizados — `resolvido`

> **Resolução (0.8.0-m8.1):** `@mastra/core` em `lib/agent/mastra/`; fronteira `lib/agent/**` sem Prisma preservada (`INT-BOUNDARY-01`). Escolha documentada no README.

**PRD:** Requisitos técnicos — "Agent: Mastra (preferência) ou LangGraph.js".

**Situação:** orquestrador próprio; `@mastra/core` não está no `package.json`. A decisão está registrada como "aceita" em [04-03 §3](../04-registro-mudanca/04-03-as-built.md), mas é requisito técnico do PRD.

**Aceite:**
- Agent implementado com `@mastra/core` (Agent + tools), reaproveitando as ferramentas de `lib/agent/tools.ts` e os adapters existentes.
- README explica a escolha do framework e do modelo.

### G2-AG-04 · M · Justificativa ("por quê") ausente no trace — `resolvido`

> **Resolução (0.8.0-m8.1):** `AgentTrace.reasoning` e `usage` (migração `20261124233000_agent_trace_reasoning`), emitidos no SSE e exibidos como "Por quê"; `rulesFired` derivado das ferramentas executadas (`trace-rules.ts`); decisão estruturada via `report_decision` (schema Zod). Rótulos legíveis das regras ficam para a Etapa 03.

**PRD:** "ver em detalhe o que o agent entendeu, que ação tomou, com que grau de segurança e **por quê**". Marcada como a parte mais importante do desafio.

**Situação:** o trace tem `understanding`, `actions`, `confidence`, `rulesFired` (códigos como `SCOPE_IT`) e `evidence`. Não existe justificativa legível; `inferRulesFromContent` (`src/lib/domain/rules.ts`) infere regras por regex do texto (ex.: `inc-20311|vencido|prazo` → `TICKET_SLA_BREACH`), não pelo que realmente motivou a decisão.

**Aceite:**
- O trace inclui um campo `reasoning` em linguagem natural, curto, por ação.
- As regras disparadas vêm da execução real (ferramentas e validações), com rótulo legível na UI.
- Saída estruturada do modelo (schema Zod) para `understanding`, `confidence` e `reasoning`.

---

## B. Regras do service desk (Anexo A)

### G2-RG-01 · M · Classificação de tipo, categoria e prioridade fixa por caso — `resolvido`

> **Resolução (0.8.0-m8.2):** `classifyPriority(impact, urgency)` em `src/lib/domain/priority.ts` (matriz da 02-08); `create_draft` recebe `impact`/`urgency` e deriva a prioridade, ignorando a do modelo. Testes: `priority.test.ts`, `draft-guard.test.ts`.

**PRD:** "A prioridade combina o impacto (quantas pessoas são afetadas) e a urgência (se há um compromisso em risco)".

**Situação:** cada plano do roteiro traz `type`, `category` e `priority` fixos. Não há cálculo de impacto × urgência.

**Aceite:**
- Função de domínio pura `classifyPriority(impact, urgency)` com testes cobrindo a tabela do Anexo A.
- O agent coleta impacto e urgência e a prioridade final vem dessa função, não de texto livre do modelo.

### G2-RG-02 · M · Campos obrigatórios completados por padrão, sem perguntar — `resolvido`

> **Resolução (0.8.0-m8.2):** `CreateTicketPayloadSchema` (`src/lib/domain/ticket-payload.ts`) valida os 6 campos em `createDraft` e revalida em `confirmDraft` sem defaults; a tool devolve `DRAFT_INCOMPLETE` com `missing[]` e o agent pergunta o que falta. Testes: `INT-TICKET-RULES`, `draft-guard.test.ts`.

**PRD:** "todo chamado precisa de título, descrição, tipo, categoria, prioridade e de quem é afetado"; Tela 2 ("perguntas para completar o chamado").

**Situação:** `confirmDraft` (`src/lib/ticket-service/impl/service.ts`, linhas 242–256) assume `type: "INC"`, `category: "outros"`, `affectedScope: "only_me"` e `priority: "medium"` quando o campo falta. `createDraft` só valida título e descrição.

**Aceite:**
- `createDraft` com `operation: "create"` rejeita rascunho sem os seis campos.
- O agent pergunta o que falta (com respostas rápidas) antes de gerar o rascunho.
- Nenhum default silencioso na confirmação.

### G2-RG-03 · M · Verificação de duplicidade só no caso "notebook lento" — `resolvido`

> **Resolução (0.8.0-m8.2):** Pré-checagem de duplicidade dentro de `create_draft` (`lib/agent/draft-guard.ts`): chamado aberto ou resolvido há ≤7 dias com título parecido devolve `DUPLICATE_CANDIDATE`; `confirmedNew=true` cria mesmo assim. Testes: `draft-guard.test.ts`.

**PRD:** "se já existe um chamado aberto sobre o mesmo problema, ele é atualizado, não duplicado. Chamados resolvidos há até 7 dias podem ser reabertos."

**Situação:** `resolveDraftOperation` (`src/lib/domain/dedup.ts`) só é chamada no plano do notebook, com texto fixo. Os demais rascunhos de criação não consultam chamados abertos nem resolvidos recentes.

**Aceite:**
- Toda criação passa pela checagem de duplicidade dentro da ferramenta (não depende do modelo lembrar).
- Havendo candidato, o agent pergunta "é o mesmo problema do X?" antes de propor update ou reopen.

### G2-RG-04 · M · Transferência automática em casos críticos não ocorre — `resolvido`

> **Resolução (0.8.0-m8.2):** `evaluateTransferNeed` (`lib/agent/transfer-policy.ts`) aplicada ao fim do turno (Mastra e fixture): prioridade `critical` cria o rascunho e chama `transfer_to_analyst` no mesmo turno (regra `TRANSFER_CRITICAL`). Testes: `transfer-policy.test.ts`, `handoff-and-transfer-step.test.ts`.

**PRD:** "Transferência: acontece quando o funcionário pede, em casos críticos, em chamados vencidos ou quando o agent não tem segurança".

**Situação:** o caso crítico (e-mail fora do ar para a empresa) só cria rascunho; não transfere nem oferece transferência.

**Aceite:** prioridade `critical` dispara transferência (após criar o chamado ou junto do rascunho), com regra registrada no trace.

### G2-RG-05 · M · Transferência por chamado vencido e por baixa confiança não generalizada — `resolvido`

> **Resolução (0.8.0-m8.2):** SLA vencido oferece "Chamar um analista"; confiança < `AGENT_CONFIDENCE_TRANSFER_OFFER` oferece e < `AGENT_CONFIDENCE_TRANSFER_STRONG` transfere (`agent_sem_seguranca`). Regras `TRANSFER_*` no trace. Testes: `transfer-policy.test.ts`.

**Situação:**
- Chamado vencido só é transferido se a mensagem contiver `INC-20311` e "vencid"/"analista".
- Baixa confiança só oferece a transferência via resposta rápida.
- `getConfidenceTransferOffer` e `getConfidenceTransferStrong` (`src/lib/domain/rules.ts`) nunca são chamadas; `AGENT_CONFIDENCE_TRANSFER_*` no `.env.example` não têm efeito.

**Aceite:**
- Consulta a chamado com `slaBreached: true` oferece transferência (Tela 3).
- Confiança abaixo de `AGENT_CONFIDENCE_TRANSFER_OFFER` oferece transferência; abaixo de `AGENT_CONFIDENCE_TRANSFER_STRONG` transfere e marca o motivo "agent sem segurança".

### G2-RG-06 · M · Transferência sem resumo do caso — `resolvido`

> **Resolução (0.8.0-m8.2):** `HandoffSummary` (problema, passos, chamados, motivo, confiança, regras) persistido em `Conversation.handoffSummary` (migração `20261125000000_ticket_updates_transfer_handoff`) e exposto de forma aditiva em `getThreadMessages`. Teste: `INT-HANDOFF-01`.

**PRD:** "Leva um resumo do caso"; história do analista 1 ("descrição que não exija perguntar tudo de novo").

**Situação:** `transferToAnalyst` (`src/lib/conversation/agent-adapter.ts`) grava só uma mensagem de sistema com um motivo curto.

**Aceite:**
- A transferência persiste um resumo estruturado (problema, o que já foi tentado, chamados envolvidos, motivo, confiança).
- O console do analista exibe esse resumo no topo da conversa.

### G2-RG-07 · M · Escopo só detecta RH — `resolvido`

> **Resolução (0.8.0-m8.2):** `classifyOutOfScope` cobre RH, financeiro e facilities e a resposta nomeia a área correta (`outOfScopeReply`); instruções do Mastra alinhadas. Testes: `rules-scope.test.ts`, `handoff-and-transfer-step.test.ts`.

**PRD:** "Outros assuntos (RH, financeiro, facilities) são redirecionados."

**Situação:** `OUT_OF_SCOPE_RE` (`src/lib/domain/rules.ts`) cobre apenas termos de RH e benefícios; a resposta sempre cita RH.

**Aceite:**
- Financeiro (reembolso, nota fiscal, pagamento a fornecedor) e facilities (ar-condicionado, limpeza, sala, crachá físico) são detectados.
- A resposta indica a área correta.

---

## C. Resiliência e privacidade

### G2-RS-01 · M · Indisponibilidade do legado não tratada no agent — `resolvido`

> **Resolução (0.8.0-m8.2):** `createResilientTicketClient` (`src/lib/ticket-service/resilient-client.ts`) aplica retry/backoff por env (`TICKET_RETRY_*`) com teto por turno nos adapters do agent; ao esgotar, a tool devolve `TICKET_LEGACY_UNAVAILABLE`, o agent responde de forma amigável e o trace registra a regra. A API HTTP mantém o 503 imediato. Testes: `resilient-client.test.ts`, `legacy-unavailable.test.ts`.

**PRD:** "O sistema de chamados é legado e, de vez em quando, fica indisponível por alguns segundos"; critério *Interface* (estados de erro).

**Situação:** `fetchWithTicketRetry` (`src/lib/ticket-service/retry.ts`) só é usado em teste. `createAgentAdapters` chama o serviço direto; `TicketLegacyUnavailableError` dentro do turno vira `agent_error` genérico. Com `TICKET_CHAOS_RATE=0.03`, cerca de 3% das chamadas falham sem nova tentativa.

**Aceite:**
- Adapter do agent com retry e backoff (decorator sobre `TicketClient`).
- Esgotadas as tentativas, o agent responde de forma amigável ("o sistema de chamados está instável, tento de novo em instantes") e registra o evento no trace.

### G2-RS-02 · M · Acesso a chamado de terceiro vira erro genérico — `resolvido`

> **Resolução (0.8.0-m8.2):** `TicketForbiddenError`/`TicketNotFoundError` viram `{ found: false, messageKey }` idêntico nos dois casos; o agent nunca confirma a existência de chamado de terceiros. Testes: `draft-guard.test.ts`, `EVAL-PRIV-01`.

**PRD:** "Privacidade: informações de um chamado só podem ser passadas a quem o abriu."

**Situação:** o bloqueio funciona (`TicketForbiddenError` em `getById`), mas o erro sobe até `executeTurn` e vira `agent_error`.

**Aceite:**
- A ferramenta converte `TicketForbiddenError` e `TicketNotFoundError` em resultado tratável.
- O agent responde sem confirmar a existência do chamado ("não encontrei esse chamado entre os seus").
- Eval cobrindo a tentativa de consulta cruzada.

---

## D. Interface do funcionário

### G2-UI-01 · M · Cartão de rascunho incompleto — `resolvido`

> **Resolução (0.8.0-m8.3):** O `draft_card` ganhou `ticketType`, `category` e `description` (aditivos; `DraftSummary` também). O `DraftCard` (`src/components/chat/draft-card.tsx`) mostra os seis campos e o SLA previsto com rótulos em português (`ticket-labels.ts`). Testes: `E2E-DRAFT-EDIT`, `draft-edit.test.ts`.

**PRD:** Tela 2 ("rascunho para confirmação"); Anexo A (seis campos obrigatórios).

**Situação:** o bloco `draft_card` (`src/lib/conversation/types.ts`) e o `DraftCard` (`src/components/chat/message-bubble.tsx`) não têm tipo, categoria nem descrição. Prioridade e escopo aparecem como valor cru (`high`, `only_me`).

**Aceite:** o cartão mostra os seis campos com rótulos em português (reaproveitar `src/lib/domain/ticket-labels.ts`) e o prazo previsto.

### G2-UI-02 · M · "Editar" rascunho não edita — `resolvido`

> **Resolução (0.8.0-m8.3):** Edição real: `PATCH /api/tickets/drafts/:draftId` (`TicketServiceImpl.updateDraft`, valida com `DraftPatchSchema`; só o dono, só `pending` e não expirado) e modo de edição inline no card (Salvar/Descartar edição), que atualiza o bloco na tela. A prioridade é editada diretamente e o SLA é recalculado. Testes: `INT-DRAFT-EDIT`, `E2E-DRAFT-EDIT`.

**Situação:** `handleEditDraft` (`src/components/chat/chat-workspace.tsx`) só copia o título para o campo de mensagem.

**Aceite:** edição dos campos do rascunho (inline ou pedido ao agent com o rascunho em contexto), gerando nova versão do rascunho antes da confirmação.

### G2-UI-03 · B · Oferta de analista ausente na consulta de chamado vencido — `resolvido`

> **Resolução (0.8.0-m8.3):** As quick replies do status vêm dos dados reais (`Detalhes do <chamado>`), sem item fixo de FAQ; com chamado vencido a política de transferência acrescenta "Chamar um analista". Testes: `handoff-and-transfer-step.test.ts` e `E2E-STATUS` (botão visível).

**PRD:** Tela 3 ("status com prazo vencido e oferta de chamar um analista").

**Situação:** a lista de chamados oferece "Detalhes do INC-20311" e "Horário do service desk" (fixos); não há "Falar com analista" quando há chamado vencido.

**Aceite:** respostas rápidas geradas a partir dos dados reais, incluindo "Chamar um analista" quando `slaBreached`. Depende de G2-RG-05.

---

## E. Serviço de chamados

### G2-TS-01 · M · Complemento sobrescreve a descrição — `resolvido`

> **Resolução (0.8.0-m8.2):** Modelo `TicketUpdate` (histórico append-only); `update`/`reopen` acrescentam a entrada e preservam a descrição original. Teste: `INT-TICKET-RULES` e `INT-TICKET-02`.

**PRD:** história do funcionário 3 ("complementar um chamado aberto com novas informações").

**Situação:** `confirmDraft` com `operation: "update"` substitui `description`. Não há registro das atualizações.

**Aceite:**
- Modelo `TicketUpdate` (ou equivalente) com autor, data e texto.
- O complemento é acrescentado; `lastUpdatedAt` atualizado.
- Painel do analista e consulta do funcionário mostram o histórico.

### G2-TS-02 · M · Operação "transferir" inexistente no serviço — `resolvido`

> **Resolução (0.8.0-m8.2):** `TicketServiceImpl.transfer` (status `waiting_analyst` + `transferReason`) exposta em `TicketServiceClient`; `transfer_to_analyst` a aciona para o chamado em foco. Teste: `INT-TICKET-RULES`.

**PRD:** "Serviço de chamados simulado ... permitindo consultar, criar, atualizar e **transferir** chamados."

**Situação:** só a conversa muda de estado; o chamado vinculado não é marcado nem atribuído.

**Aceite:** método `transfer(requesterId, ticketId, reason)` no `TicketServiceClient`, que muda o status para `waiting_analyst`, registra o motivo e é chamado pela ferramenta `transfer_to_analyst` quando há chamado em foco.

---

## F. Console do analista

### G2-AN-01 · M · Casos de baixa confiança não chegam ao console — `resolvido`

> **Resolução (0.8.0-m8.3):** `listInboxItems` inclui conversas `with_agent` cujo último turno tem confiança abaixo de `AGENT_CONFIDENCE_TRANSFER_OFFER` ou a regra `TRANSFER_LOW_CONFIDENCE` (`inboxKind: "review"`, `needsReview`). O console mostra o selo "Agent sem segurança", o aviso de revisão e o `handoffSummary` no cabeçalho da conversa. O seed cria uma conversa de demonstração (Gabriela Rocha). Testes: `INT-INBOX-REVIEW`, `E2E-REVIEW`.

**PRD:** história do analista 2 ("incluindo os casos em que o agent não teve segurança para decidir").

**Situação:** `listInboxItems` (`src/lib/analyst/inbox.ts`) só retorna conversas em `awaiting_analyst` e `with_analyst`. Conversas com o agent em baixa confiança não aparecem.

**Aceite:** a fila inclui conversas `with_agent` cuja última confiança ficou abaixo do limiar, com indicador visual "agent sem segurança". Depende de G2-RG-05.

### G2-AN-02 · B · Filtro "Com o agent" sempre vazio — `resolvido`

> **Resolução (0.8.0-m8.3):** `listInboxItems` alimenta revisão sugerida (`needsReview`). Na UI do Desafio o chip voltou ao rótulo **"Com o agent"** (paridade PNG); a lógica continua filtrando só conversas com baixa confiança, não todas em `with_agent`. Seed Gabriela Rocha. Testes: `E2E-REVIEW`.

**Situação (histórico):** o filtro antigo `with_agent` no workspace não encontrava nada porque o endpoint não retornava esse estado.

**Aceite:** resolvido junto de G2-AN-01; rótulo visual documentado em [protótipo-mapeamento](../anexos/protótipo-mapeamento.md).

---

## G. Qualidade e entrega

### G2-QA-01 · M · Evals circulares — `resolvido`

> **Resolução (0.8.0-m8.3):** Matriz `tests/evals/variations.ts` com 8 intenções e 35 frases validadas por ações, regras e blocos (`intent-variations.test.ts`); fixture e política de transferência ampliados de forma genérica. `npm run test:evals:llm` roda a mesma matriz com o modelo real e imprime a acurácia por intenção (77% com `gpt-4o-mini`; piso configurável).

**PRD:** README deve explicar "como você garantiu a qualidade dessas decisões".

**Situação:** os evals EVAL-01..15 rodam no modo fixture e validam as próprias frases do roteiro de regex.

**Aceite:**
- Conjunto de casos com variações de frase por intenção (dúvida, status, abertura, complemento, transferência, fora de escopo, privacidade).
- Asserções sobre a ação escolhida e as regras aplicadas, não sobre o texto.
- Execução opcional contra o LLM real (`npm run test:evals:llm`), com relatório de acerto.

### G2-QA-02 · M · README sem as seções exigidas — `resolvido`

> **Resolução (0.8.0-m8.3):** README com "Como o agent decide" (diagrama Mermaid), "Garantia da qualidade", "Escolha do modelo", trade-offs ampliados e "O que faria com mais tempo".

**PRD (Entregáveis, item 2):** como rodar, visão geral da arquitetura, **como o agent decide o que fazer**, **como você garantiu a qualidade dessas decisões**, principais trade-offs e **o que faria com mais tempo**. Requisitos técnicos: **explicar a escolha do modelo**.

**Situação:** o README tem início rápido, stack, testes e tabela de trade-offs. Faltam as seções em negrito.

**Aceite:** README com uma seção para cada item acima, com diagrama de arquitetura (interface → agent → serviços).

### G2-QA-03 · M · Histórico de commits fora do padrão — `resolvido`

> **Resolução (0.8.0-m8.3):** A Etapa 03 foi entregue em commits pequenos no padrão Conventional Commits (`feat(ticket-service)`, `feat(chat)`, `feat(agent)`, `feat(analyst)`, `test(evals)`, `docs(readme)`).

**PRD:** "commits que contem a história do desenvolvimento". Regra do projeto: Conventional Commits.

**Situação:** 7 commits no formato "Update to version X: ..." agrupando marcos inteiros. Trabalho OpenRouter (`llm-turn.ts`, `openrouter.ts`, `openrouter-config.test.ts`) não commitado.

**Aceite:** a partir daqui, commits pequenos em Conventional Commits (`feat(agent): ...`, `fix(ticket-service): ...`), um por mudança coerente.

### G2-QA-04 · B · Eficiência e custo por conversa não documentados — `resolvido`

> **Resolução (0.8.0-m8.3):** O trace já registra tokens e latência (0.8.0-m8.1) e a UI os exibe ("Consumo"). O README traz a medição por turno (`test:evals:llm`), a fórmula e a estimativa por conversa (≈ US$ 0,05 para 30 mensagens com `gpt-4o-mini`).

**PRD:** "respostas rápidas e uso consciente do modelo, pensando em custo por conversa".

**Situação:** há `LLM_MAX_CONCURRENCY`, mas não há limite de tokens por turno, janela de histórico definida nem registro de tokens/latência no trace.

**Aceite:**
- Trace registra tokens de entrada/saída e latência por turno.
- Janela de histórico e `max_tokens` configuráveis.
- README estima o custo médio por conversa com o modelo escolhido.

### G2-QA-05 · B · Deploy não publicado (diferencial) — `adiado`

**PRD:** diferencial; "a ausência não penaliza". Se fizer: proteger chaves, limitar uso e explicar no README.

**Situação:** runbook em [deploy-vps.md](../desenvolvimento/deploy-vps.md) com URL `TBD`. O rate limit é em memória por IP.

**Aceite:** URL pública no README, limite de uso por sessão/IP e teto de gasto no provedor de LLM documentado.

---

## Ordem de execução sugerida

1. **Agent em Mastra com tool calling, histórico e saída estruturada** — G2-AG-01, G2-AG-02, G2-AG-03, G2-AG-04.
2. **Regras do Anexo A garantidas dentro das ferramentas** — G2-RG-01 a G2-RG-07.
3. **Resiliência e privacidade no adapter** — G2-RS-01, G2-RS-02.
4. **Serviço de chamados** — G2-TS-01, G2-TS-02.
5. **UI do rascunho e console** — G2-UI-01 a G2-UI-03, G2-AN-01, G2-AN-02.
6. **Entrega** — G2-QA-01 a G2-QA-04; G2-QA-05 se houver tempo.

## O que já atende ao PRD (sem ação)

Login com qualquer senha; persistência em Postgres de conversas, chamados e estado; streaming SSE; limite de 30 mensagens por sessão; estados de transferência com o funcionário bloqueado; console do analista (assumir, devolver, encerrar, painel de chamados, busca); prazos em horas e dias úteis; reabertura até 7 dias no serviço; bloqueio por dono do chamado; simulação de indisponibilidade do legado; seed com 7 funcionários, 2 analistas e 8 artigos; `.env.example`; TypeScript estrito.

Atualizar este arquivo quando um item mudar de status.
