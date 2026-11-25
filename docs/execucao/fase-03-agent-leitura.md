# Fase 3 — Agent (somente leitura)

| | |
|--|--|
| **EAP** | 1.3 (pacotes 1.3.1 – 1.3.7) |
| **Marco** | M3 |
| **Docs ref.** | 0.1.9 |

## 1. Cabeçalho e objetivo da fase

**Objetivo vertical:** Mastra + OpenRouter em `lib/agent` (sem Prisma); tools de **leitura**; fluxo chat employee com **SSE**; persistência de mensagens + `AgentTrace`; UI `/atendimento` com seletor de conversa, cards de consulta e quick replies **sem** abrir INC; evals 01–05 em CI.

**Dependências:** F2 (M2) — ticket-service client, KB, SLA, seeds, boundary agent.

**Fora de escopo (adiado):**

- `create_draft`, `update_ticket`, `reopen_ticket`, `cancel_draft` confirmados
- Transfer para analista, `awaiting_analyst`, limite 30 mensagens
- Console analista, polling, handoff
- `E2E-OPEN`, `E2E-TRANSFER`, `E2E-CHAOS`, `E2E-LIMIT`

---

## 2. Checklist de implementação (ordem topológica)

### 2.1 Banco de dados e migrations/seeds

| Passo | WBS | Ação |
|-------|-----|------|
| 1 | 1.3.4 | Migration **aditiva apenas:** `npx prisma migrate dev --name add_agent_trace` |
| 2 | 1.3.4 | Modelo `AgentTrace`: FK `messageId` (1:1 com `Message` assistant), `turnId`, `toolsCalled` Json, `rulesFired` Json, `confidence` int **0–100**, `raw` Json opcional |
| 3 | 1.3.4 | **Não** reset destrutivo — usuários e conversas F1 válidos após migrate |
| 4 | — | **Não** usar campos fake em `Message` para trace; trace só em `AgentTrace` |
| 5 | 1.3.5 | Seed opcional: conversa ativa Ana (`with_agent`), sem drafts pendentes |

### 2.2 Domínio e serviços

| Passo | WBS | Ação |
|-------|-----|------|
| 6 | 1.3.1 | Configurar **Mastra** + OpenRouter (`OPENROUTER_*`); agent em `lib/agent` |
| 7 | 1.3.1 | Agent recebe contexto via **adapters** injetados (`ticketClient`, `kbSearch`) — **zero** import `@/lib/db` |
| 8 | 1.3.2 | Tools: `list_open_tickets`, `list_recent_resolved`, `get_ticket`, `search_kb` — paridade com ticket-service/KB |
| 9 | 1.3.4 | `lib/conversation/` — orquestra turno: grava `Message`, chama agent, persiste `AgentTrace` pós-turno |
| 10 | 1.3.2 | **Proibido** nesta fase: tools de mutação de ticket |

### 2.3 Contratos de API e SSE/polling

| Passo | WBS | Ação |
|-------|-----|------|
| 11 | 1.3.3 | `POST /api/conversations/active/messages` — body `{ content }`; retorna `turnId` ([02-07](../02-especificacao/02-07-contratos-api.md)) |
| 12 | 1.3.3 | `GET /api/conversations/:id/stream?turnId=` — canônico [02-07](../02-especificacao/02-07-contratos-api.md); `:id` = `conversationId` da conversa ativa (`GET /api/conversations/active` ou 202 do POST). Ordem cliente: abrir SSE **antes** do POST. Eventos: `trace`, `token`, `message`, `done`, `error` |
| 13 | 1.3.3 | `GET /api/conversations/active` — metadados conversa + `messageCount` |
| 14 | 1.3.3 | Respostas assistant incluem `uiBlocks` JSON (cards ticket, chips KB, confidence) |
| 15 | — | Sem rotas analista nesta fase |

### 2.4 Interface e componentes UI

| Passo | WBS | Ação |
|-------|-----|------|
| 16 | 1.3.5 | `/atendimento` — layout chat ([protótipo-mapeamento](../anexos/protótipo-mapeamento.md)); sidebar employee 232px |
| 17 | 1.3.5 | Seletor de sessão/conversa; composer + envio via API |
| 18 | 1.3.5 | Render `uiBlocks`: card **INC-20311** com badge **vencido**; expandir trace resumido |
| 19 | 1.3.5 | Quick replies sugeridas — **não** disparam criação de chamado nesta fase |
| 20 | 1.3.5 | Confidence exibida 0–100 inteiro |

### 2.5 Variáveis de ambiente e infra

| Passo | WBS | Ação |
|-------|-----|------|
| 21 | 1.3.1 | `.env.example` += `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `LLM_MAX_CONCURRENCY`, opcionais `AGENT_CONFIDENCE_*` leitura |
| 22 | 1.3.6 | Job/script `npm run test:evals` — corpus F3 |

---

## 3. Regras de arquitetura e restrições críticas

- Fronteira agent: [02-03](../02-especificacao/02-03-especificacao-tecnica.md) — regressão **INT-BOUNDARY-01**.
- Confiança e regras: [02-08](../02-especificacao/02-08-regras-service-desk.md) — só leitura; sem `out_of_scope` obrigatório em RH nesta fase (F4).
- Privacidade evals: nunca citar ticket de outro requester.
- `E2E-KB`: resposta KB VPN 809 Win10 — **sem** card draft/chamado ([03-02](../03-processos-validacao/03-02-plano-testes.md)).

---

## 4. Checklist de testes obrigatórios da fase

| ID | Assert esperado |
|----|-----------------|
| **EVAL-01** | Saudação; sem chamada de ticket tools |
| **EVAL-02** | “Status meu chamado” → `list_open_tickets` |
| **EVAL-03** | VPN 809 win10 → `search_kb`; cita artigo |
| **EVAL-04** | INC-20311 → `get_ticket`; menciona vencido |
| **EVAL-05** | Horário desk → KB `horario-service-desk` |
| **E2E-STATUS** | UI consulta → INC-20311 vencido visível |
| **E2E-KB** | VPN 809 Win10 → resposta KB; **sem** draft/chamado |
| **INT-CONV-01** | Após restart app/DB, mensagens + traces persistidos |

Cada eval: assert `rulesFired`, allow-list de tools, sem vazamento de ticket alheio.

---

## 5. Definition of Done

### Comandos

```bash
npx prisma migrate dev
npx prisma db seed
npm run test
npm run test:evals    # EVAL-01 – EVAL-05
npm run build
docker compose up --build
```

E2E isolado: `npm run test:e2e` (servidor dedicado `127.0.0.1:3099`; exige seed aplicado).

### Verificação manual

1. Ana login → `/atendimento` → perguntar status → vê INC-20311 vencido.
2. Perguntar VPN 809 Win10 → resposta com artigo; nenhum botão “confirmar chamado”.
3. Reiniciar container app → histórico e trace expandíveis intactos.

### Documentação

- README: OpenRouter, limite concorrência, como rodar evals.
- Desvios → [04-03-as-built.md](../04-registro-mudanca/04-03-as-built.md).