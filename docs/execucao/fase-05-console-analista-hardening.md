# Fase 5 — Console analista, evals finais e hardening

| | |
|--|--|
| **EAP** | 1.5 (pacotes 1.5.1 – 1.5.9) |
| **Marco** | M5 |
| **Docs ref.** | 0.1.9 |

## 1. Cabeçalho e objetivo da fase

**Objetivo vertical:** Console `/atendente/conversas` (3 colunas), polling com ETag, handoff assume/return/close com **409**; painel traces; seeds `CONV-ana-transfer` e `CONV-carla-transfer`; evals **EVAL-11–15** (incl. Diego + **INC-20150**); suíte **E2E completa** 03-02 com regressão **E2E-CHAOS**; GitHub Actions test → image → deploy; README final e `.env.example` espelho **02-09**.

**Dependências:** F4 (M4) — mutações, transfer, chaos E2E verde.

**Fora de escopo:**

- Novas features fora do PRD v5
- Alteração da baseline funcional PDF

---

## 2. Checklist de implementação (ordem topológica)

### 2.1 Banco de dados e migrations/seeds

| Passo | WBS | Ação |
|-------|-----|------|
| 1 | 1.5.5 | Seed conversas: **CONV-ana-transfer** (Ana, `awaiting_analyst`, contexto INC-20311 vencido), **CONV-carla-transfer** (Carla, `awaiting_analyst`) — [personas-seed](../anexos/personas-seed.md) |
| 2 | 1.5.3 | Campos analista ativo, timestamps assume/return |
| 3 | 1.5.6 | Garantir **INC-20150** + **Diego Ramos** para **EVAL-12** / **INT-TICKET-03** |

### 2.2 Domínio e serviços

| Passo | WBS | Ação |
|-------|-----|------|
| 4 | 1.5.2 | Polling inbox: gerar ETag; `If-None-Match` → **304** (**INT-POLL-01**) |
| 5 | 1.5.3 | `assume`, `return`, `close` — lock otimista; segundo analista → **409** (**INT-409-01**) |
| 6 | 1.5.3 | Após assume: fetch mensagens/tickets laterais atualizados |
| 7 | 1.5.4 | Servir traces completos para mensagens assistant |
| 8 | 1.5.6 | **INT-TICKET-03** — reopen `INC-20150` via draft; novo `dueAt` |

### 2.3 Contratos de API e SSE/polling

| Passo | WBS | Ação |
|-------|-----|------|
| 9 | 1.5.2 | `GET /api/analyst/inbox` + headers ETag ([02-07](../02-especificacao/02-07-contratos-api.md)) |
| 10 | 1.5.2 | Intervalos canônicos [02-09](../02-especificacao/02-09-variaveis-ambiente.md): `ANALYST_POLL_INTERVAL_MS` (inbox visível), `ANALYST_POLL_BACKGROUND_MS` (aba em background), `ANALYST_THREAD_POLL_MS` (thread selecionada) |
| 11 | 1.5.3 | `POST /api/analyst/conversations/:id/assume` \| `return` \| `close` |
| 12 | 1.5.4 | `GET /api/analyst/conversations/:id/traces` — **E2E-TRACE** |
| 13 | — | Employee SSE inalterado; analista não usa SSE para inbox |

### 2.4 Interface e componentes UI

| Passo | WBS | Ação |
|-------|-----|------|
| 14 | 1.5.1 | `/atendente/conversas` — rail **64px** + lista **380px** + thread flex + painel **340px** ([protótipo-mapeamento](../anexos/protótipo-mapeamento.md)) |
| 15 | 1.5.7 | **E2E-INBOX** — filtros e fila |
| 16 | 1.5.7 | **E2E-ASSUME** — Rafael assume Ana → composer habilitado |
| 17 | 1.5.7 | **E2E-RETURN** — devolver → nota sistema |
| 18 | 1.5.7 | **E2E-CLOSE** — encerrar conversa |
| 19 | 1.5.7 | **E2E-PANEL** — painel chamados lateral |
| 20 | 1.5.4 | **E2E-TRACE** — log trace expandível analista |
| 21 | 1.5.7 | Playwright **todos** E2E do catálogo 03-02, incluindo **E2E-CHAOS** regressão |

### 2.5 Variáveis de ambiente e infra

| Passo | WBS | Ação |
|-------|-----|------|
| 22 | 1.5.2 | `.env.example` += `ANALYST_POLL_INTERVAL_MS`, `ANALYST_POLL_BACKGROUND_MS`, `ANALYST_THREAD_POLL_MS` (nomes fixos — não renomear sem CR + atualizar 02-09) |
| 23 | 1.5.8 | `PROXY_API_RATE_LIMIT_PER_MIN` documentado |
| 24 | 1.5.8 | GHA workflow: `npm run test` → build image → SSH deploy (secrets documentados, sem valores) |
| 25 | 1.5.9 | Checklist diff: `.env.example` **byte-a-byte** alinhado a [02-09](../02-especificacao/02-09-variaveis-ambiente.md) |
| 26 | 1.5.9 | README raiz final: demo completa, chaos, credenciais seed, ordem F1–F5 |

---

## 3. Regras de arquitetura e restrições críticas

- Apenas **analyst** acessa rotas `/api/analyst/*` e grupo `(analyst)`.
- Um analista por conversa em `with_analyst`; conflito → 409.
- **EVAL-11:** “todo mundo sem e-mail” → prioridade crítica.
- **EVAL-12:** login **diego.ramos@nexo.com.br** — SAP bloqueado → **reopen** INC-20150, não novo ID.
- **EVAL-13–15:** confiança baixa, cancel draft, transfer com contexto vencido.
- CI: PR — unit + integration + evals subset; main/nightly — E2E full ([03-02](../03-processos-validacao/03-02-plano-testes.md)).

---

## 4. Checklist de testes obrigatórios da fase

| ID | Assert esperado |
|----|-----------------|
| **INT-409-01** | Dois analistas assumem mesma conversa → segundo 409 |
| **INT-POLL-01** | Inbox `If-None-Match` → 304 |
| **INT-TICKET-03** | Reopen draft → INC-20150; `dueAt` novo |
| **EVAL-11** – **EVAL-15** | Tabela 03-02 Fase 5 |
| **E2E-INBOX**, **ASSUME**, **RETURN**, **CLOSE**, **PANEL**, **TRACE** | Fluxos analista |
| Regressão | **E2E-LOGIN**, **STATUS**, **KB**, **OPEN**, **TRANSFER**, **LIMIT**, **CHAOS** |

---

## 5. Definition of Done

### Comandos

```bash
cp .env.example .env    # revisar todas as chaves 02-09
docker compose up --build
npx prisma migrate dev
npx prisma db seed
npm run test
npm run test:evals      # EVAL-01 – EVAL-15
npx playwright test     # suíte E2E completa
npm run build
```

### Verificação manual

1. Rafael login → inbox mostra Ana/Carla transferidas.
2. Assume Ana → responde → return → nota sistema visível para employee.
3. Diego login → cenário reopen SAP (eval/manual).
4. Pipeline GHA verde no repositório.

### Documentação

- README: deploy, rate limit, polling analista.
- `.env.example` = 02-09.
- Implementação concluída: preencher [04-03-as-built.md](../04-registro-mudanca/04-03-as-built.md) com desvios reais.