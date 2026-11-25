# Fase 4 — Mutações, regras e resiliência

| | |
|--|--|
| **EAP** | 1.4 (pacotes 1.4.1 – 1.4.8) |
| **Marco** | M4 |
| **Docs ref.** | 0.1.9 |

## 1. Cabeçalho e objetivo da fase

**Objetivo vertical:** Fluxo draft → confirm/cancel com `operation` create/update/reopen; tools de mutação no agent; quick replies (afetados/prioridade); transfer humano → `awaiting_analyst`; limite 30 mensagens + nova sessão; rules engine (`out_of_scope`, dedup reabertura); evals 06–10; **primeira execução obrigatória de `E2E-CHAOS`** (gate M4).

**Dependências:** F3 (M3) — SSE, trace, tools leitura, UI chat.

**Fora de escopo (adiado):**

- Console analista 3 colunas, assume/return/close, polling ETag
- Evals 11–15, E2E inbox/panel/trace (F5)
- CI deploy SSH completo (F5)

---

## 2. Checklist de implementação (ordem topológica)

### 2.1 Banco de dados e migrations/seeds

| Passo | WBS | Ação |
|-------|-----|------|
| 1 | 1.4.1 | Garantir `TicketDraft` completo: estados, `operation`, vínculo requester |
| 2 | 1.4.2 | Índices/constraints para dedup reabertura (INC resolvido ≤7d mesmo requester) |
| 3 | 1.4.4 | `Conversation.state` inclui `awaiting_analyst`; campos handoff conforme [02-06](../02-especificacao/02-06-modelo-dados.md) |
| 4 | 1.4.5 | Persistir `sessionSequence`, `messageCount`; reset em nova sessão |

### 2.2 Domínio e serviços

| Passo | WBS | Ação |
|-------|-----|------|
| 5 | 1.4.1 | `ticket-service`: `confirmDraft(draftId, userId)`, `cancelDraft(...)` — único writer |
| 6 | 1.4.2 | Tools: `create_draft`, `update_ticket`, `reopen_ticket`, `cancel_draft` — delegam ao client |
| 7 | 1.4.2 | **INT-TICKET-01/02** — create via draft confirm gera `INC-#####`; update com `operation: update` |
| 8 | 1.4.6 | Rules engine em `lib/agent` ou `lib/rules` — RH refeição → `outOfScope` (**UNIT-RULES-01**, **EVAL-10**) |
| 9 | 1.4.2 | **UNIT-DEDUP-01** — reopen ≤7d vs novo ID (**Diego / INC-20150** lógica na F5 eval; dedup unitária aqui) |
| 10 | 1.4.4 | Tool `transfer_to_analyst` → `lib/conversation` seta `awaiting_analyst`, mensagem sistema |
| 11 | 1.4.5 | `messageLimit` 30 — bloqueio próximo envio (**UNIT-SESSION-01**); `POST .../new-session` incrementa `sessionSequence` |

### 2.3 Contratos de API e SSE/polling

| Passo | WBS | Ação |
|-------|-----|------|
| 12 | 1.4.1 | `POST /api/tickets/drafts/:id/confirm` — [02-07](../02-especificacao/02-07-contratos-api.md) |
| 13 | 1.4.1 | `POST /api/tickets/drafts/:id/cancel` |
| 14 | 1.4.1 | **Sem** reopen HTTP direto — só via draft `operation: reopen` |
| 15 | 1.4.5 | `POST /api/conversations/active/new-session` — zera contador sessão |
| 16 | — | SSE existente enriquecido com uiBlocks draft (confirm/cancel) |

### 2.4 Interface e componentes UI

| Passo | WBS | Ação |
|-------|-----|------|
| 17 | 1.4.3 | Quick replies: número afetados, prioridade — alimentam payload draft |
| 18 | 1.4.3 | Exibir SLA calculado em cards de abertura/atualização |
| 19 | 1.4.4 | Estado visual “aguardando analista” pós-transfer |
| 20 | 1.4.5 | Ao atingir limite: modal/banner + ação nova sessão (**E2E-LIMIT**) |
| 21 | 1.4.8 | **E2E-CHAOS:** com chaos ativo no fluxo chat, toast/erro 503 amigável — **obrigatório verde antes de fechar M4** |

### 2.5 Variáveis de ambiente e infra

| Passo | WBS | Ação |
|-------|-----|------|
| 22 | 1.4.8 | Documentar uso runtime de `CHAOS_ENDPOINT_ENABLED` / `TICKET_CHAOS_RATE` em test E2E |
| 23 | — | F4 **não** exige novas chaves obrigatórias no `.env.example` |

---

## 3. Regras de arquitetura e restrições críticas

- Drafts: confiança mínima para confirm automático conforme [02-08](../02-especificacao/02-08-regras-service-desk.md); employee confirma na UI.
- **EVAL-06:** novo VPN Win11 → draft alta; pergunta afetados antes de confirm.
- **EVAL-07/08:** mesmo notebook lento → **update** INC-20311, não create.
- **EVAL-09:** pedido humano → transfer, não ticket.
- Reabertura: **INT-TICKET-03** implementação pode ser finalizada na F5 com Diego; estrutura draft reopen obrigatória F4.
- Regressão: **INT-503-01**, **INT-BOUNDARY-01** verdes.

---

## 4. Checklist de testes obrigatórios da fase

| ID | Assert esperado |
|----|-----------------|
| **INT-TICKET-01** | create draft → confirm → ID formato INC |
| **INT-TICKET-02** | update via draft `operation: update` |
| **UNIT-SESSION-01** | 30ª mensagem bloqueia envio |
| **UNIT-DEDUP-01** | reopen ≤7d vs novo ID |
| **UNIT-RULES-01** | Pedido RH → outOfScope |
| **EVAL-06** – **EVAL-10** | Conforme [03-02](../03-processos-validacao/03-02-plano-testes.md) |
| **E2E-OPEN** | VPN Win11 → draft → confirm INC |
| **E2E-TRANSFER** | falar analista → `awaiting_analyst` |
| **E2E-LIMIT** | 30 msgs → nova sessão |
| **E2E-CHAOS** | **Estreia** — outage 503 na UI employee |

| Teste | F2 | F4 | F5 |
|-------|----|----|-----|
| INT-503-01 | Obrigatório | Regressão | Regressão |
| E2E-CHAOS | — | **Primeira execução (gate M4)** | Suíte completa |

---

## 5. Definition of Done

### Comandos

```bash
npx prisma migrate dev    # se houver ajustes draft/conversation
npx prisma db seed
npm run test
npm run test:evals        # EVAL-06 – EVAL-10
npx playwright test       # E2E-OPEN, TRANSFER, LIMIT, CHAOS
npm run build
```

### Verificação manual

1. Ana: abrir VPN Win11 → confirm → novo INC na lista.
2. Transferir → conversa `awaiting_analyst` persistida no DB.
3. Chaos 503 durante consulta ticket → mensagem/toast clara.
4. **E2E-CHAOS verde** antes de marcar M4.

### Documentação

- README: fluxo draft, chaos demo para entrevista.
- Desvios → [04-03-as-built.md](../04-registro-mudanca/04-03-as-built.md).