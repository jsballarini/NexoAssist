# Plano de testes

## Estratégia

| Nível | Ferramenta | Foco |
|-------|------------|------|
| Unitário | Vitest | SLA, clock, rules, session limit, RBAC helpers |
| Integração | Vitest + route handlers / DB test | ticket-service, APIs, boundary agent/prisma |
| E2E | Playwright | Fluxos PRD ponta a ponta |
| Evals agent | Vitest + `lib/agent/fixture-turn.ts` (determinístico) | Decisão/ação esperada PT-BR; Mastra = premissa charter, runtime = orchestrator próprio |

## Ambiente de teste

- `TEST_USE_WALL_CLOCK=true` + fixed instant para SLA determinístico.
- `DATABASE_URL` test; reset entre suítes integração.
- `TICKET_CHAOS_RATE=0` default em CI; job opcional chaos.

## Catálogo de IDs de teste

Os códigos abaixo são a **fonte canônica**; [03-01-matriz-rastreabilidade.md](03-01-matriz-rastreabilidade.md) usa exatamente estes identificadores.

### Unitários

| ID | Caso | Assert |
|----|------|--------|
| UNIT-SLA-01 | Alta aberta sex 14h | dueAt seg + 4h úteis |
| UNIT-SLA-02 | Média vencida | `isBreached === true` |
| UNIT-SLA-03 | Crítica domingo | due 1h calendário |
| UNIT-SESSION-01 | 30ª msg | bloqueio próximo envio |
| UNIT-RBAC-01 | User A get ticket B | deny |
| UNIT-RULES-01 | Pedido RH | outOfScope |
| UNIT-DEDUP-01 | reopen ≤7d vs novo ID | regra Anexo A |
| UNIT-PRIORITY-01 | classifyPriority (impacto × urgência) | matriz 02-08 |
| UNIT-GUARD-01 | create_draft incompleto/duplicado/prioridade derivada | DRAFT_INCOMPLETE, DUPLICATE_CANDIDATE |
| UNIT-TRANSFER-01 | valuateTransferNeed e passo de fim de turno | transfere/oferece conforme limiares |
| UNIT-RETRY-01 | createResilientTicketClient | backoff, teto por turno, erro original |

### Integração

| ID | Caso |
|----|------|
| INT-TICKET-01 | create draft → confirm → INC id format |
| INT-TICKET-02 | update via draft `operation: update` |
| INT-TICKET-03 | reopen via draft `operation: reopen`; `dueAt` novo |
| INT-503-01 | chaos rate 1.0 → retries then error shape |
| INT-BOUNDARY-01 | static analysis: `lib/agent/**` sem `@/lib/db` |
| INT-409-01 | dois analistas assume mesma conversa |
| INT-POLL-01 | inbox `If-None-Match` → 304 |
| INT-CONV-01 | mensagens/trace persistem após restart |
| INT-TICKET-RULES | 6 campos obrigatórios, histórico TicketUpdate, 	ransfer |
| INT-HANDOFF-01 | handoffSummary persistido e exposto ao analista |
| EVAL-PRIV-01 | chamado de terceiros = inexistente (sem vazar) |

### E2E Playwright

| ID | Fluxo |
|----|-------|
| E2E-LOGIN | ana.souza → atendimento |
| E2E-KB | VPN 809 Win10 → resposta KB; **sem** card draft/chamado |
| E2E-STATUS | consulta → INC-20311 → vencido visible |
| E2E-OPEN | VPN Win11 → pergunta abrangência → quick reply → draft → confirm INC |
| E2E-TRANSFER | falar analista → awaiting |
| E2E-INBOX | filtros e fila analista |
| E2E-ASSUME | rafael assume ana → composer |
| E2E-RETURN | devolver → nota sistema |
| E2E-CLOSE | encerrar conversa |
| E2E-PANEL | painel chamados lateral |
| E2E-TRACE | log trace completo analista |
| E2E-CHAOS | dev chaos outage → UI mensagem |
| E2E-LIMIT | 30 msgs → nova sessão |

## Evals do agent (corpus 5 → 15)

**Numeração:** `EVAL-01`–`EVAL-05` (F3), `EVAL-06`–`EVAL-10` (F4), `EVAL-11`–`EVAL-15` (F5) — sequencial, sem saltos.

### Fase 3 (5)

| ID | Entrada resumida | Ação esperada |
|----|------------------|---------------|
| EVAL-01 | Olá | saudação; sem ticket |
| EVAL-02 | Status meu chamado | list_open_tickets |
| EVAL-03 | VPN 809 win10 | search_kb; cite artigo |
| EVAL-04 | INC-20311 andamento | get_ticket; mencionar vencido |
| EVAL-05 | Horário desk | search_kb horario |

### Fase 4 (5)

| ID | Entrada | Ação |
|----|---------|------|
| EVAL-06 | Novo VPN win11 reunião 14h | draft alta; perguntar afetados |
| EVAL-07 | Mesmo notebook lento | update INC-20311 não create |
| EVAL-08 | Adicionar info INC-20311 | update após confirmação |
| EVAL-09 | Preciso falar humano | transfer |
| EVAL-10 | Vale refeição RH | out_of_scope |

### Fase 5 (5)

| ID | Entrada | Ação |
|----|---------|------|
| EVAL-11 | Todo mundo sem e-mail | prioridade crítica |
| EVAL-12 | SAP bloqueado de novo (4d) | reopen rule |
| EVAL-13 | confidence baixa cenário ambíguo | offer transfer |
| EVAL-14 | Confirmar cancelar draft | cancel_draft |
| EVAL-15 | Chamado vencido quer analista | transfer + context |

Cada eval assert: `rulesFired`, tools chamadas (allow list), **não** vazar ticket de outro user.

## Chaos / entrevista

- `CHAOS_ENDPOINT_ENABLED=true` em dev.
- Script demo 503 para avaliador.

## Critérios de saída por fase

Conforme [EAP](../01-iniciacao/03-eap-wbs.md) — testes mínimos verdes antes de marcar marco.

## Regressão

CI em PR: unit + integration + evals (subset rápido); nightly ou main: E2E full.