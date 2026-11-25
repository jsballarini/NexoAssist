# As Built — Nexo Assist

**Status:** Marcos **M2**–**M5** registrados; lacunas detalhadas em [GAPS.md](../desafio/GAPS.md); URL pública pós-deploy _TBD_.

**Versão app (M7.1):** `0.7.1-m7.1`  
**Baseline de especificação (docs):** 0.3.6  
**Data conclusão M3:** 2026-11-24  
**Data conclusão M4:** 2026-11-24  
**Data conclusão M5:** 2026-11-24  
**GP:** Juliano Ballarini

## Propósito

Registrar o sistema **como entregue**, divergências em relação a `docs/02-especificacao/*` e decisões tomadas durante o código.

## 1. Resumo executivo

Monólito **Next.js 15** + **PostgreSQL 16** com chat SSE para funcionários e console com polling ETag para analistas. **0.7.0-m7** fecha fidelidade do console analista (busca, inbox rica, painel summary, trace completo). **0.6.0-m6** entregou UI employee; **0.5.0-m5** cobria fluxos principais (login, KB, tickets, drafts, transfer, handoff, evals 15, E2E 13).

**URL deploy:** _TBD_  
**Commit release:** _definir na tag `0.5.0-m5`_  
**Subir local (3 comandos):**

```bash
docker compose up -d db && npx prisma migrate deploy && npx prisma db seed
npm run dev
```

Login: `http://localhost:3000/login`.

## 2. Arquitetura implementada

| Camada | Tecnologia |
|--------|------------|
| App | Next.js 15 App Router, React 19, TypeScript strict |
| Persistência | Prisma 6, PostgreSQL |
| Auth | iron-session, middleware RBAC |
| Agent | `lib/agent/mastra/` (`@mastra/core`, tool calling via OpenRouter); fixtures só com `AGENT_EVAL_FIXTURES=true` |
| Tickets/KB | `src/lib/ticket-service`, `src/lib/knowledge-base` (FTS) |
| Analista | `src/lib/analyst`, APIs `/api/analyst/*` |
| Container | Dockerfile `standalone`, Compose `db` + `app` |

Diagrama M5: [arquitetura-codigo.md](../desenvolvimento/arquitetura-codigo.md).

**Mastra (0.8.0-m8.1):** o runtime usa `@mastra/core` (supera a nota anterior de "orchestrator próprio"). Cada turno recebe um `TurnContext` (histórico, rascunho pendente, estado, chamado em foco) e expõe `runTool` como ferramentas Mastra mais `report_decision` (understanding/confidence/reasoning). Falha do LLM → resposta "assistente indisponível" + erro no trace (sem fallback silencioso). `AgentTrace` ganhou `reasoning` e `usage`.

**Regras do Anexo A e ticket-service (0.8.0-m8.2):**
- Prioridade vem de `classifyPriority(impact, urgency)` (domínio, sem Prisma); `create_draft` exige os 6 campos (`DRAFT_INCOMPLETE`), faz pré-checagem de duplicidade (`DUPLICATE_CANDIDATE`, `confirmedNew`) e ignora a prioridade enviada pelo modelo.
- `evaluateTransferNeed` roda ao fim de cada turno (Mastra e fixture): pedido do funcionário, prioridade `critical` e confiança abaixo de `AGENT_CONFIDENCE_TRANSFER_STRONG` transferem; SLA vencido e confiança abaixo de `AGENT_CONFIDENCE_TRANSFER_OFFER` oferecem "Chamar um analista".
- O handoff grava um **snapshot único** `Conversation.handoffSummary` (problema, passos, chamados, motivo, confiança, regras); a última transferência substitui a anterior. `transfer_to_analyst` também marca o chamado em foco como `waiting_analyst` (`Ticket.transferReason`).
- `update`/`reopen` **acrescentam** uma linha em `TicketUpdate` (histórico append-only); a descrição original do chamado nunca é sobrescrita. Divergência da spec anterior, que sobrescrevia.
- Os adapters do agent usam `createResilientTicketClient` (retry/backoff por env, teto por turno). A API HTTP mantém o 503 imediato.

**Paridade Desafio e estabilidade (0.9.0):**
- Tokens `nexo.*`, login split, chat e console analista alinhados aos PNG/`nexo.pen`; chip **Encerrados**; handback visível em **Com o agent** ("Agent retomou"); mensagens do funcionário em `with_analyst`; E2E em `127.0.0.1:3099` com `NEXT_DIST_DIR=.next-playwright` (16 specs).
- `GET /api/dev/reset-employee-chat` normaliza sessão do funcionário entre testes (não produção).
- README com diagrama interface → agent → serviços; versão semver `0.9.0`.

**UI de rascunho, console e entrega (0.8.0-m8.3):**
- `PATCH /api/tickets/drafts/:draftId` edita os seis campos do rascunho pendente (`DraftPatchSchema`, só o dono). O rascunho guardado não tem impacto/urgência: a prioridade editada vale como está e o SLA previsto é recalculado a partir dela.
- `draft_card` e `DraftSummary` expõem, de forma aditiva, `ticketType`/`type`, `category` e `description`; o `DraftCard` mostra tudo em português e edita inline.
- A fila do analista inclui conversas `with_agent` com baixa confiança (`needsReview`, `inboxKind: review`); o filtro "Com o agent" virou "Revisão sugerida". O analista só visualiza; assumir exige transferência.
- As quick replies de status derivam dos chamados reais; "Chamar um analista" vem da política de transferência.
- Evals: matriz de variações de frase (determinística) e `npm run test:evals:llm` (opcional, modelo real).
- Chamado de terceiros e inexistente retornam `{ found: false, messageKey }`, sem distinguir os casos.

### 2.1 Fronteira ticket-service

Todas as tools do agent usam client HTTP/serviço — **sem** import de `@/lib/db` em `lib/agent/**`. Gate: **INT-BOUNDARY-01** (Vitest).

### 2.2 Tempo real

- **Employee:** SSE em `GET /api/conversations/:id/stream`; cliente abre `EventSource` e só envia `POST` após `open`. **M4:** `turn-bus` singleton em `globalThis`; evento `ready`.
- **Mutações:** único writer `ticket-service` via drafts confirmados; agent chama `create_draft` / tools derivadas; dedup em `src/lib/domain/dedup.ts`.
- **Chaos:** `TICKET_CHAOS_RATE` no ticket-service; UI toast 503; E2E-CHAOS mocka rota confirm.
- **Analista (M5+):** polling inbox/thread via `ANALYST_*_MS`; `GET /api/analyst/inbox` com **ETag** / **304**; UI em `/atendente/conversas`. **M7:** busca client-side, `department`/`linkedTicketId` no inbox, painel `summary` + destaque ticket, trace com `durationMs`.

## 3. Divergências da especificação

| Spec ref | Especificado | As built | Motivo |
|----------|--------------|----------|--------|
| 02-03 estrutura pastas | `lib/ticket-service`, `lib/domain` na raiz | `src/lib/ticket-service`, `src/lib/domain`, `src/lib/knowledge-base` | Padrão Next.js M1 (`@/lib/*`); `lib/agent/` permanece na raiz para boundary |
| 02-03 `lib/conversation` | Raiz `lib/conversation` | `src/lib/conversation` | Mesmo padrão `@/lib/*` |
| 02-03 Mastra | Pacote `@mastra/core` | **Alinhado** em 0.8.0-m8.1 (`lib/agent/mastra/`); fixture só CI | Substitui o orchestrator próprio das iterações M3–M7 |
| Harness E2E | Mesma porta que dev (3000) | Dev `localhost:3000`; E2E dedicado `127.0.0.1:3099` | Evita reutilizar processo desatualizado; não altera contrato HTTP |
| 02-07 mensagem analista | Não listado em 0.2.8 | `POST /api/analyst/conversations/:id/messages` | Necessário para E2E-ASSUME e UC-08; documentado em 02-07 / docs 0.2.9 |
| 02-02 composer em handoff | Ativo em `awaiting_analyst` / `with_analyst` (versão anterior) | **Bloqueado** + `POST` employee **423** | UX clara de pausa; E2E-TRANSFER; CR docs **0.3.3** — gap **G-UI-E08** `aceito` |

M2: `0.2.0-m2` (tickets/KB/SLA). M3: `0.3.0-m3` (agent leitura, SSE, AgentTrace). Patch app `0.3.1`: estabilidade E2E. M4: `0.4.0-m4` (drafts, transfer, limite 30, evals 06–10). M5: `0.5.0-m5` (console analista, evals 11–15, CI). M6: `0.6.0-m6` (UI employee). M7: `0.7.0-m7` (UI analista G-UI-A01–A05, `G-AC-07` resolvido).

_Demais divergências pós-código devem ser acrescentadas na tabela até M8._

## 4. Configuração de produção

- **Compose:** [`docker-compose.yml`](../../docker-compose.yml) — serviços `db` (Postgres) e `app` (imagem Dockerfile).
- **ENV:** catálogo [02-09](../02-especificacao/02-09-variaveis-ambiente.md); espelho [`.env.example`](../../.env.example).
- **Rate limit:** `PROXY_API_RATE_LIMIT_PER_MIN` no [`middleware`](../../src/middleware.ts); desabilitado com `CHAOS_ENDPOINT_ENABLED=true` (E2E).
- **LLM:** produção com `AGENT_EVAL_FIXTURES=false`, `OPENROUTER_API_KEY`, modelo em `OPENROUTER_MODEL` (sugerido `openai/gpt-4o-mini`).
- **Runbook VPS:** [deploy-vps.md](../desenvolvimento/deploy-vps.md).
- **CI:** `.github/workflows/ci.yml` — job `test` (Vitest + evals + `next build`); job `e2e` (Playwright 13, `workers: 1`); job `build` (Docker); job `deploy` (SSH + [deploy-vps.md](../desenvolvimento/deploy-vps.md), secrets `DEPLOY_*`).

## 5. Testes executados

| Camada | Escopo M5 | Comando / IDs |
|--------|-----------|----------------|
| Unit / integração | dedup, SLA, drafts, analyst poll/409, boundary, chaos, ticket reopen | `npm run test:unit` (28 arquivos) |
| Evals agent | `EVAL-01`–`EVAL-15` (fixtures) | `npm run test:evals` |
| E2E | 13 specs (`01`–`13` employee + analista) | `npm run test:e2e` (servidor 3099) |
| Gate local | Suite combinada | `npm run test` |

Pré-requisito E2E: `npx prisma migrate deploy` + `npx prisma db seed`. Última verificação local: **2026-11-24** — `npm run test:unit` (32), `test:evals` (15), `test:e2e` (13/13), `npm run build` OK.

_CI: `test` → `e2e` → `build` → `deploy` (main + secrets). Local: `test:unit`, `test:evals`, `test:e2e`, `build`._

## 6. Lições aprendidas

- **SSE no `next dev`:** singleton `turn-bus` em `globalThis`; cliente abre stream antes do POST.
- **E2E:** servidor dedicado `127.0.0.1:3099`; `archiveAndCreateNew` fecha todas as conversas ativas para não colidir seed analista × employee.
- **Rate limit:** isentar `/api/auth` e ambiente E2E evita falsos 429 na suíte Playwright.
- **Fixtures vs LLM:** evals e CI determinísticos; demo “inteligente” exige OpenRouter em produção.
- **Gaps UI:** fidelidade parcial ao Pencil — inventário em [GAPS.md](../desafio/GAPS.md).

## 7. Referências finais

- Repositório: _URL git remota / portfolio — TBD_
- README raiz: [README.md](../../README.md)
- Documentação: [docs/README.md](../README.md)
- Gaps baseline: [GAPS.md](../desafio/GAPS.md)
- PRD baseline: [Desafio_Tecnico_Nexo_Assist_PRD_v5.pdf](../desafio/Desafio_Tecnico_Nexo_Assist_PRD_v5.pdf)

## Aprovação As Built

| Papel | Nome | Data | Assinatura |
|-------|------|------|------------|
| GP | Juliano Ballarini | | Pendente |