# Fase 2 — Tickets, KB e domínio SLA

| | |
|--|--|
| **EAP** | 1.2 (pacotes 1.2.1 – 1.2.7) |
| **Marco** | M2 |
| **Docs ref.** | 0.1.9 |

## 1. Cabeçalho e objetivo da fase

**Objetivo vertical:** Módulo isolado `lib/ticket-service` + `lib/knowledge-base`; APIs REST de **leitura** para tickets e busca KB (FTS PT); seeds completos do demo; domínio de relógio/SLA; simulação de outage 503; **sem** Mastra, SSE ou mutação confirmada de chamados.

**Dependências:** F1 concluída (M1) — auth, Prisma base, Docker, `User`.

**Fora de escopo (adiado):**

- Mastra, `lib/agent` funcional, OpenRouter
- `POST /api/conversations/.../messages`, SSE
- Confirm/cancel draft, tools `create_draft` / `update_ticket` / `reopen_ticket` (F4)
- Console analista operacional, polling inbox
- UI de chat com respostas do agent

---

## 2. Checklist de implementação (ordem topológica)

### 2.1 Banco de dados e migrations/seeds

| Passo | WBS | Ação |
|-------|-----|------|
| 1 | 1.2.x | Migration: `Ticket` (campos [02-06](../02-especificacao/02-06-modelo-dados.md): `publicId` UK INC/REQ, `requesterId`, status/priority/categoria enums, `dueAt`, `resolvedAt`, etc.) |
| 2 | 1.2.x | `TicketDraft` — schema persistido com `operation` enum (`create`\|`update`\|`reopen`), `payload` Json, `status` draft; **sem** endpoints confirm nesta fase (interface stub no client) |
| 3 | 1.2.x | `KnowledgeArticle` — `slug` UK, `title`, `body`, `searchVector` ou índice FTS `portuguese` |
| 4 | 1.2.4 | Seed elenco completo [personas-seed](../anexos/personas-seed.md): Ana, Carla, Bruno, **Diego**, Elisa, Fábio, Gabriela; Rafael, Mariana |
| 5 | 1.2.4 | Chamados: **INC-20311**, **INC-20298**, **REQ-10442**, **INC-20150** (requester **Diego Ramos**), demais do anexo conforme necessário para UI futura |
| 6 | 1.2.4 | INC-20311: `dueAt` no passado (vencido na demo); INC-20150: `resolvedAt` ~4 dias atrás |
| 7 | 1.2.4 | 8 artigos KB — slugs exatos (`vpn-erro-809`, `horario-service-desk`, …) |

### 2.2 Domínio e serviços

| Passo | WBS | Ação |
|-------|-----|------|
| 8 | 1.2.1 | `lib/ticket-service/` — **único writer** de tickets no sistema ([02-03](../02-especificacao/02-03-especificacao-tecnica.md)); export `TicketServiceClient` |
| 9 | 1.2.1 | Métodos F2: `listOpenByUser(userId)`, `getByPublicId(id, userId)`, `listRecentResolved(userId)`; stubs tipados para draft confirm/cancel (retornam `notImplemented` ou mock interno) |
| 10 | 1.2.3 | `lib/knowledge-base/` — `search(query, limit)` FTS PT; sem expor Prisma fora do módulo |
| 11 | 1.2.6 | `lib/domain/clock.ts` — injetável; `TEST_USE_WALL_CLOCK` para testes fixos |
| 12 | 1.2.6 | `lib/domain/sla.ts` — `computeDueAt(priority, openedAt)`, `isBreached(dueAt, now)` conforme regras [02-08](../02-especificacao/02-08-regras-service-desk.md) |
| 13 | 1.2.7 | `lib/agent/` — pasta placeholder (`index.ts` vazio ou comentário); **proibir** `@/lib/db` via regra ESLint + teste **INT-BOUNDARY-01** |

### 2.3 Contratos de API e SSE/polling

| Passo | WBS | Ação |
|-------|-----|------|
| 14 | 1.2.2 | `GET /api/tickets` — lista abertos do `userId` sessão; **403/empty** para ticket de outro usuário |
| 15 | 1.2.2 | `GET /api/tickets/:publicId` — detalhe; **404** se não existir ou não pertencer ao requester |
| 16 | 1.2.2 | `GET /api/tickets/recent_resolved` — últimos resolvidos do usuário |
| 17 | 1.2.3 | `GET /api/kb/search?q=` — resultados públicos/autenticados employee; rate limit básico opcional |
| 18 | 1.2.5 | Em `ticket-service` ou rota proxy: quando `TICKET_CHAOS_RATE`/`CHAOS_ENDPOINT_ENABLED`, responder **503** JSON canônico; client com retry/backoff |
| 19 | — | **Sem** SSE, **sem** rotas draft confirm/cancel nesta fase |

### 2.4 Interface e componentes UI

| Passo | WBS | Ação |
|-------|-----|------|
| 20 | — | `/atendimento` permanece stub ou smoke page (opcional listar tickets via fetch interno para validação manual) |
| 21 | — | Mapear enums `TicketStatus` / prioridade para labels UI ([02-06](../02-especificacao/02-06-modelo-dados.md)) — preparação F3/F4 |

### 2.5 Variáveis de ambiente e infra

| Passo | WBS | Ação |
|-------|-----|------|
| 22 | 1.2.5 | Acrescentar ao `.env.example`: `TICKET_CHAOS_RATE` (ex. `0`), `CHAOS_ENDPOINT_ENABLED` (`false`), `TEST_USE_WALL_CLOCK` (`false`) |
| 23 | 1.1.6 | README: como forçar chaos em dev (`CHAOS_ENDPOINT_ENABLED=true`) |

---

## 3. Regras de arquitetura e restrições críticas

- **Privacidade:** `UNIT-RBAC-01` — User A nunca lê ticket com `requesterId` de B ([02-08](../02-especificacao/02-08-regras-service-desk.md)).
- **`lib/agent/**` não importa Prisma** — boundary estrutural até F3 ([02-03](../02-especificacao/02-03-especificacao-tecnica.md)).
- Tickets mutáveis apenas via `ticket-service`; rotas HTTP finas delegam ao client.
- SLA: Alta 4h úteis; Média/Baixa conforme anexo; Crítica 1h calendário 24/7.
- IDs públicos: formato `INC-#####`, `REQ-#####`; drafts futuros `D-###`.

---

## 4. Checklist de testes obrigatórios da fase

| ID | Assert esperado |
|----|-----------------|
| **UNIT-SLA-01** | Alta aberta sexta 14h → `dueAt` segunda + 4h úteis (ou equivalente regra seed) |
| **UNIT-SLA-02** | Média com `dueAt` passado → `isBreached === true` |
| **UNIT-SLA-03** | Crítica domingo → vencimento 1h calendário |
| **UNIT-RBAC-01** | Client `get` ticket de outro user → deny/erro |
| **INT-503-01** | `TICKET_CHAOS_RATE=1.0` → retries e corpo de erro estável |
| **INT-BOUNDARY-01** | Análise estática: nenhum arquivo em `lib/agent/**` importa `@/lib/db` |

---

## 5. Definition of Done

### Comandos

```bash
docker compose up -d db
npx prisma migrate deploy   # setup: migrations já no repo; migrate dev só ao alterar schema
npx prisma db seed
npm run test          # UNIT-SLA-*, UNIT-RBAC-01, INT-503-01, INT-BOUNDARY-01
npm run build
```

Ver [ambiente-e-comandos.md](../desenvolvimento/ambiente-e-comandos.md) (FTS `search_vector`: não aceitar migration que dropa a coluna).

### Verificação manual

1. Login Ana → `curl`/Playwright `GET /api/tickets` — contém INC-20311, INC-20298, REQ-10442; **não** contém INC-20150 (Diego).
2. `GET /api/tickets/INC-20311` — status e indicador SLA vencido no JSON.
3. `GET /api/kb/search?q=809` — retorna `vpn-erro-809`.
4. Com chaos ligado, `GET /api/tickets` retorna 503 e client registra retry.

### Documentação

- README raiz: seção F2 (M2), variáveis chaos/clock.
- Desvios → [04-03-as-built.md](../04-registro-mudanca/04-03-as-built.md).