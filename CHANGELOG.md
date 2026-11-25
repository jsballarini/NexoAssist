# Changelog

Todas as mudanças relevantes da **aplicação** neste repositório são documentadas neste arquivo.

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e a aplicação usa [Semantic Versioning](https://semver.org/) (`package.json`).

## [Unreleased]

## [0.8.0-m8.3] - 2026-11-25

### Adicionado

- **Edição de rascunho (G2-UI-02):** `PATCH /api/tickets/drafts/:draftId` e `TicketServiceImpl.updateDraft` (`DraftPatchSchema`; só o dono, só rascunho pendente e não expirado; 400 com `fields`). O `DraftCard` ganhou modo de edição inline.
- **Cartão de rascunho completo (G2-UI-01):** `DraftSummary` e o bloco `draft_card` expõem, de forma aditiva, `type`/`ticketType`, `category` e `description`; o card mostra os seis campos e o SLA previsto em português.
- **Fila de revisão sugerida (G2-AN-01/02):** `listInboxItems` inclui conversas com o agent e baixa confiança (`needsReview`, `inboxKind`); selo "Agent sem segurança", filtro "Revisão sugerida" e `handoffSummary` no cabeçalho da conversa; seed de demonstração (`ensureLowConfidenceConversation`).
- **Trace legível (G2):** regras com rótulo em português (`RULE_LABELS`) e consumo de tokens/latência no chat e no console.
- **Evals (G2-QA-01):** matriz de 35 frases em 8 intenções (`tests/evals/variations.ts`) validada por ações/regras/blocos e `npm run test:evals:llm` (opcional, com o modelo real e relatório de acurácia).
- **README (G2-QA-02/04):** "Como o agent decide" (Mermaid), "Garantia da qualidade", "Escolha do modelo", trade-offs, "O que faria com mais tempo" e "Custo por conversa".
- **Testes:** INT-DRAFT-EDIT, INT-INBOX-REVIEW, unit de `draft-edit`, `review` e `trace-format`; E2E-DRAFT-EDIT (14) e E2E-REVIEW (15).

### Alterado

- As quick replies da consulta de status derivam dos chamados reais; com chamado vencido a política acrescenta "Chamar um analista" (G2-UI-03).
- Fixture: rascunhos de SAP e de e-mail crítico agora emitem o card de rascunho; o reconhecimento de status, atualização, e-mail e pedido de analista aceita mais formulações. O pedido de analista ("me passa para um humano", "transfere para um atendente") também é reconhecido na política de transferência.
- O filtro "Com o agent" do console virou "Revisão sugerida"; a fila lista transferências antes das revisões.
- `vitest.config.ts`: `AGENT_EVAL_FIXTURES` segue `EVAL_USE_LLM` (apenas para `test:evals:llm`).

### Observações

- `G2-QA-05` (deploy público) permanece `adiado`.
- Medição com `gpt-4o-mini` (35 turnos): ≈ 9.600 tokens de entrada e ≈ 230 de saída por turno; acurácia da matriz 77%.

## [0.8.0-m8.2] - 2026-11-25

### Adicionado

- **Prioridade por impacto × urgência (G2-RG-01):** `classifyPriority` (`src/lib/domain/priority.ts`); `create_draft` recebe `impact`/`urgency` e calcula a prioridade.
- **Campos obrigatórios sem defaults (G2-RG-02):** validação dos 6 campos em `createDraft` e revalidação em `confirmDraft`; `DRAFT_INCOMPLETE` com os campos faltantes.
- **Duplicidade em toda criação (G2-RG-03):** pré-checagem em `create_draft` (`DUPLICATE_CANDIDATE`, `confirmedNew`).
- **Política de transferência (G2-RG-04/05):** `evaluateTransferNeed` — crítico transfere junto do rascunho; SLA vencido e confiança intermediária oferecem "Chamar um analista"; confiança abaixo de `AGENT_CONFIDENCE_TRANSFER_STRONG` transfere; regras `TRANSFER_*` no trace.
- **Resumo de handoff (G2-RG-06):** `HandoffSummary` em `Conversation.handoffSummary` e em `getThreadMessages` (campo aditivo `handoffSummary`).
- **Fora de escopo por área (G2-RG-07):** RH, financeiro e facilities, com resposta que nomeia a área.
- **Resiliência (G2-RS-01):** `createResilientTicketClient` com retry/backoff por env (`TICKET_RETRY_ATTEMPTS`, `TICKET_RETRY_BACKOFF_MS`, `TICKET_RETRY_TURN_BUDGET_MS`); resposta amigável e regra `TICKET_LEGACY_UNAVAILABLE` no trace.
- **Privacidade (G2-RS-02):** chamado de terceiros e inexistente retornam o mesmo `{ found: false }`.
- **ticket-service (G2-TS-01/02):** modelo `TicketUpdate` (histórico de complementos) e operação `transfer` (`waiting_analyst` + `transferReason`); migração `20261125000000_ticket_updates_transfer_handoff`.
- **Testes:** unit (priority, guards, transfer-policy, handoff, resilient-client, legacy-unavailable), INT-TICKET-RULES, INT-HANDOFF-01 e EVAL-PRIV-01.

### Alterado

- **Fluxo VPN em dois passos:** o fixture pergunta "quem é afetado?" e só cria o rascunho após a resposta (EVAL-06, E2E-OPEN e E2E-CHAOS atualizados).
- `update`/`reopen` acrescentam uma entrada de histórico em vez de sobrescrever a descrição do chamado.
- Rascunho com campos obrigatórios ausentes ou inválidos responde 400 com a lista aditiva `fields` (ex.: `POST /api/tickets/drafts/:id/confirm`).
- Os testes de integração de chamados deixaram de depender de estado persistente do seed.

## [0.8.0-m8.1] - 2026-11-24

### Adicionado

- **Agent em Mastra (G2-AG-01/03):** `lib/agent/mastra/` com tool calling sobre `lib/agent/tools.ts` e a ferramenta `report_decision` (`understanding`, `confidence`, `reasoning`, `quickReplies`, `outOfScope`); blocos de UI e regras disparadas derivados dos resultados reais das ferramentas.
- **Contexto de conversa (G2-AG-02):** `TurnContext` (histórico, rascunho pendente, estado, chamado em foco) carregado por `loadTurnContext`; `findPendingDraft` (somente leitura) no ticket-service.
- **Transparência (G2-AG-04):** `AgentTrace.reasoning` e `usage` (migração `20261124233000_agent_trace_reasoning`), emitidos no SSE (`trace` aditivo) e exibidos como "Por quê" no chat e no console do analista.
- **Configuração:** `AGENT_HISTORY_MAX_MESSAGES`, `AGENT_MAX_STEPS`, `AGENT_MAX_OUTPUT_TOKENS`, `AGENT_LLM_TIMEOUT_MS`.
- **Testes:** unit para ferramentas Mastra, stream adapter e falha do LLM; INT-CTX-01 e INT-TRACE-01; fixture com `pendingDraft` e sem acoplamento a usuário.

### Alterado

- Fixtures determinísticas só com `AGENT_EVAL_FIXTURES=true`; cenários data-driven (sem nome de usuário nem IDs fixos) e quick reply de escopo refaz o rascunho.
- `rawToolCalls` passa a registrar as chamadas reais de ferramenta (antes `actions`).
- Falha do LLM (HTTP, timeout, modelo sem tool calling) responde "assistente indisponível" e registra o erro no trace, sem fallback silencioso.

### Removido

- `lib/agent/llm-turn.ts` e `lib/agent/openrouter.ts` (planner + reescrita de texto), substituídos pelo agent Mastra.

## [0.7.1-m7.1] - 2026-11-24

### Adicionado

- **CI (Etapa 03):** job `e2e` (Playwright 13, `workers: 1`); `npm run build` no job `test`; Docker `build` após e2e; deploy SSH alinhado ao runbook (`DEPLOY_PATH` secret).
- **Governança:** CR **G-UI-E08** — [02-02](docs/02-especificacao/02-02-especificacao-funcional.md) composer bloqueado + HTTP 423 em handoff.

### Documentação

- Perfis ENV (local / CI / demo LLM), matriz de gates, [03-02](docs/03-processos-validacao/03-02-plano-testes.md) sem Mastra runtime nos evals; docs **0.3.3**; gaps E09, OPS-02, PRD-02/03 resolvidos.

## [0.7.0-m7] - 2026-11-24

### Adicionado

- **Console analista (Etapa 02):** busca na fila, avatar/iniciais, badge não lida, hora relativa; header com área (`department`), ticket vinculado e badge de modo; painel `Abertos/Fechados` e destaque “Desta conversa”; trace expandido (confidence, actions, evidence, rawToolCalls, `durationMs`).
- **API aditiva:** inbox `employeeDepartment`, `linkedTicketId`; `GET .../employees/:id/tickets` com `summary`; traces com duração derivada (1 query + cálculo in-memory).

### Documentação

- Docs **0.3.2**; `G-UI-A01`–`A05` e **`G-AC-07`** → resolvido em [GAPS.md](docs/desafio/GAPS.md).

## [0.6.0-m6] - 2026-11-24

### Adicionado

- **UI employee (Etapa 01):** chips de status (`action-labels`), trace com evidence e JSON técnico, placeholder “Escreva para o Nexo…”, histórico `GET /api/conversations/sessions` (somente leitura), indicador “Nexo está digitando…”, **Editar** em `draft_card`, `ticket_selector` em fixtures e UI, skeleton/spinner de envio.
- **`UiBlock`:** variante `ticket_selector`.
- **Perfil:** texto “Senha alterada há N dias” (`data-profile-password-age`).

### Documentação

- Docs **0.3.1** — 02-07 sessions; GAPS E01–E07, E09, E10 → resolvido (E08 e G-AC-07 parcial permanecem abertos).

## [0.5.0-m5] - 2026-11-24

### Adicionado

- **Console analista** (`/atendente/conversas`): layout 64+380+flex+340, polling ETag, filtros, takeover, painel de chamados, trace viewer.
- **APIs `/api/analyst/*`:** inbox, assume, return-to-agent, close, mensagens, traces, tickets do funcionário; **POST** mensagem do analista (lacuna documentada em 02-07 / 04-03).
- **Seeds** `CONV-ana-transfer` / `CONV-carla-transfer`; reset idempotente E2E (`/api/dev/reset-analyst-seeds`).
- **Employee `with_analyst`:** conversa ativa, banner, POST mensagens **423** `CONVERSATION_WITH_ANALYST`.
- **Evals EVAL-11**–**EVAL-15**; **INT-POLL-01**, **INT-409-01**, **INT-TICKET-03** (reopen Diego / INC-20150).
- **E2E 08**–**13** (inbox, assume, return, close, panel, trace) + regressão 01–07.
- **CI** `.github/workflows/ci.yml` (Postgres health → migrate → seed → Vitest); rate limit leve em `/api/*`; `.env.example` alinhado a 02-09.

### Corrigido

- **`archiveAndCreateNew`:** encerra todas as conversas ativas do funcionário (evita colisão pós-transfer com seed na fila).
- **Rate limit:** isento com `CHAOS_ENDPOINT_ENABLED` (suíte E2E) e rotas `/api/auth/*`, `/api/dev/*`.
- **`sla.ts`:** parâmetro morto removido para build ESLint limpo.

## [0.4.0-m4] - 2026-11-24

### Adicionado

- **ticket-service:** `createDraft` / `confirmDraft` / `cancelDraft`, IDs `D-*` / `INC-*` / `REQ-*`, dedup (`src/lib/domain/dedup.ts`).
- **API:** `POST /api/tickets/drafts/:draftId/confirm` e `cancel`; 429 limite 30 msgs; 423 `awaiting_analyst`.
- **Agent:** tools de mutação + `transfer_to_analyst`; regra `OUT_OF_SCOPE`; fixtures **EVAL-06**–**EVAL-10**.
- **Conversa:** transferência analista, `draft_card` em uiBlocks, mensagens `system`.
- **UI:** DraftCard, banner aguardando analista, modal limite 30, toast 503.
- **Testes:** UNIT-DEDUP/SESSION/RULES, INT-TICKET-01/02, E2E-OPEN/TRANSFER/LIMIT/CHAOS.
- Migration `m4_ticket_dedup_index` em `Ticket`.

### Corrigido

- `turn-bus` e contador LLM em `globalThis` (SSE confiável no `next dev`).
- Cliente SSE: sync `conversationId` ativo, fallback `loadHistory`, evento `ready` no stream.

## [0.3.1] - 2026-11-24

### Corrigido

- `POST /api/auth/login`: cookie iron-session gravado na mesma `NextResponse` (`getIronSessionFromRequest`).
- Chat: cliente aguarda evento `open` do `EventSource` antes do `POST` do turno (evita perda de eventos SSE).
- Playwright: servidor E2E dedicado em `127.0.0.1:3099`, carrega `.env`, não reutiliza `next dev` na porta 3000 por padrão.
- `next.config`: `allowedDevOrigins` para requisições de dev a partir de `127.0.0.1`.
- Helper E2E `loginAsAna`: autenticação via API com mensagem de falha explícita.

## [0.3.0-m3] - 2026-11-24

### Adicionado

- Modelo `AgentTrace` (migration `add_agent_trace`) 1:1 com mensagens assistant.
- `lib/agent`: orchestrator de turno, tools de leitura, modo fixture (`AGENT_EVAL_FIXTURES`) e OpenRouter-ready.
- `src/lib/conversation`: persistência, SSE (`turn-bus`), APIs canônicas 02-07.
- UI chat em `/atendimento` (SSE antes do POST, uiBlocks, quick replies, nova sessão).
- Evals **EVAL-01**–**EVAL-05**, **INT-CONV-01**, E2E **E2E-STATUS**, **E2E-KB**.
- ENV OpenRouter, concorrência LLM, limiares de confidence.

### Corrigido

- Seed: único SLA vencido da Ana = **INC-20311**; **INC-20517** → Fábio Nunes.

## [0.2.0-m2] - 2026-11-24

### Adicionado

- Prisma: `Ticket`, `TicketDraft`, `KnowledgeArticle` + FTS.
- ticket-service, knowledge-base, SLA, chaos 503, Vitest M2.

## [0.1.0-m1] - 2026-11-24

### Adicionado

- Bootstrap Next.js 15, auth, Prisma base, E2E-LOGIN.