# Changelog

Todas as mudanças relevantes da **aplicação** neste repositório são documentadas neste arquivo.

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e a aplicação usa [Semantic Versioning](https://semver.org/) (`package.json`).

## [Unreleased]

### Documentação

- `docs/desafio/README.md` e `GAPS.md` (baseline PRD vs `0.5.0-m5`).
- Links corrigidos ao PDF/`.pen`; as-built e runbook [deploy-vps](docs/desenvolvimento/deploy-vps.md).

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