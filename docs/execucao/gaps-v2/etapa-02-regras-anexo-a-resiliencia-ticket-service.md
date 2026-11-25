# Etapa 02 — Regras Anexo A, resiliência e ticket-service

**Data:** 2026-11-24  
**App entrada:** pós-Etapa 01 (`0.8.0-m8` parcial)  
**App alvo (código):** `0.8.0-m8` (completo domínio + tickets)

## 1. Cabeçalho e escopo da etapa

### IDs cobertos ([GAPS2.md](../../desafio/GAPS2.md))

| ID | Sev | Objetivo |
|----|-----|----------|
| G2-RG-01 | M | Prioridade por **impacto × urgência** (`classifyPriority`) |
| G2-RG-02 | M | Seis campos obrigatórios no `create`; sem defaults na confirmação |
| G2-RG-03 | M | Dedup/reabertura em **toda** operação `create` |
| G2-RG-04 | M | Transferência automática em prioridade **critical** |
| G2-RG-05 | M | SLA vencido + limiares `AGENT_CONFIDENCE_TRANSFER_*` |
| G2-RG-06 | M | Resumo estruturado no handoff para o analista |
| G2-RG-07 | M | Fora de escopo: RH, **financeiro**, **facilities** |
| G2-RS-01 | M | Retry/backoff no adapter; resposta amigável + trace |
| G2-RS-02 | M | RBAC consulta ticket sem vazar existência de terceiros |
| G2-TS-01 | M | Complementos com histórico (`TicketUpdate`) |
| G2-TS-02 | M | Operação **`transfer`** no ticket-service |

### Objetivo da etapa

Garantir que as regras do **Anexo A** (PRD) sejam aplicadas no **domínio e nas tools**, não em regex do planejador, e endurecer ticket-service, adapters e handoff.

### Pré-requisitos

- [Etapa 01](etapa-01-agent-mastra-contexto-transparencia.md) entregue: Mastra + tools + `TurnContext` + contrato `reasoning`.
- Banco migrado; seed estável ([personas-seed.md](../../anexos/personas-seed.md)).

### Fora desta etapa

- Polimento UI rascunho, inbox, evals e README → [etapa-03](etapa-03-ui-rascunho-console-e-entrega.md).

---

## 2. Diagnóstico do estado atual no repositório

| Gap ID | Arquivo(s) | Lacuna |
|--------|------------|--------|
| G2-RG-01 | [`lib/agent/fixture-turn.ts`](../../../lib/agent/fixture-turn.ts) | `priority: "high" \| "critical" \| "medium"` fixo por branch; sem `impact`/`urgency`. |
| G2-RG-02 | [`service.ts`](../../../src/lib/ticket-service/impl/service.ts) `createDraft` L178–181 | `create` valida só `title` + `description`. |
| G2-RG-02 | [`service.ts`](../../../src/lib/ticket-service/impl/service.ts) `confirmDraft` L242–256 | Defaults: `type: INC`, `category: outros`, `priority: medium`, `affectedScope: only_me`. |
| G2-RG-03 | [`dedup.ts`](../../../src/lib/domain/dedup.ts) | Função correta; só chamada no plano “notebook lento” do fixture. |
| G2-RG-04/05 | fixture; [`rules.ts`](../../../src/lib/domain/rules.ts) | `getConfidenceTransferOffer/Strong` nunca usados; transferência `INC-20311` + regex. |
| G2-RG-06 | [`agent-adapter.ts`](../../../src/lib/conversation/agent-adapter.ts) | `addSystemMessage` com string curta; sem JSON de resumo. |
| G2-RG-07 | [`rules.ts`](../../../src/lib/domain/rules.ts) `OUT_OF_SCOPE_RE` | Apenas RH/benefícios; resposta genérica “RH”. |
| G2-RS-01 | [`retry.ts`](../../../src/lib/ticket-service/retry.ts) | Usado só em [`tests/int/chaos-503.test.ts`](../../../tests/int/chaos-503.test.ts). |
| G2-RS-01 | [`adapters-factory.ts`](../../../src/lib/conversation/adapters-factory.ts) | Cliente ticket direto; erro sobe a [`turn-runner.ts`](../../../src/lib/conversation/turn-runner.ts). |
| G2-RS-02 | [`service.ts`](../../../src/lib/ticket-service/impl/service.ts) `getById` L149–150 | `TicketForbiddenError` propagado. |
| G2-TS-01 | [`service.ts`](../../../src/lib/ticket-service/impl/service.ts) `confirmDraft` update L273–284 | Substitui `description` integralmente. |
| G2-TS-02 | [`client.ts`](../../../src/lib/ticket-service/client.ts) | Sem método `transfer`. |
| G2-TS-02 | [`tools.ts`](../../../lib/agent/tools.ts) `transfer_to_analyst` | Só altera conversa via `conversationClient`. |

---

## 3. Checklist de implementação (ordem topológica)

### 3.1 Domínio — prioridade e escopo (G2-RG-01, G2-RG-07)

| Passo | Ação |
|-------|------|
| 1 | Criar [`src/lib/domain/priority.ts`](../../../src/lib/domain/priority.ts): tipos `ImpactScope` (`only_me`, `team`, `organization`), `Urgency` (`low`, `same_day_commitment`, `blocking_work`); `classifyPriority(impact, urgency) → TicketPriority` alinhado à tabela Anexo A (crítica/alta/média/baixa). |
| 2 | Testes **UNIT** com matriz de casos + borda (equipe vs organização parada). |
| 3 | Integrar com [`sla.ts`](../../../src/lib/domain/sla.ts) `computeDueAt` após classificação. |
| 4 | Estender `detectOutOfScope` → `classifyOutOfScope(input): { out: boolean; area?: 'rh' | 'financeiro' | 'facilities' }`; expandir regex/lista de termos PRD. |
| 5 | Respostas do agent (Mastra instruction + tool guard opcional) citam área correta; trace `rulesFired` inclui `OUT_OF_SCOPE` com `label` legível. |

### 3.2 Rascunho — validação e UI blocks (G2-RG-02)

| Passo | Ação |
|-------|------|
| 6 | Zod em [`draft-payload.ts`](../../../src/lib/ticket-service/draft-payload.ts): schema `CreateTicketPayload` com `type`, `category`, `title`, `description`, `priority`, `affectedScope` obrigatórios. |
| 7 | `TicketServiceImpl.createDraft`: para `operation === 'create'`, falhar com `DraftInvalidError` se campo faltar (antes de persistir). |
| 8 | `confirmDraft`: **remover** defaults silenciosos; revalidar payload completo; transação falha se incompleto. |
| 9 | Agent: instruir coleta progressiva; emitir `quick_replies` até payload válido (Etapa 03 enriquece card). |

### 3.3 Dedup generalizada (G2-RG-03)

| Passo | Ação |
|-------|------|
| 10 | Dentro de [`runTool`](../../../lib/agent/tools.ts) ou wrapper `create_draft` pré-flight: `listOpen` + `listRecentResolved(7)` + `resolveDraftOperation(title + ' ' + description, ...)`. |
| 11 | Se `update` ou `reopen` sugerido: retorno estruturado ao modelo `{ operation, targetTicketId, matchReason }`; resposta ao usuário pergunta confirmação (“é o mesmo problema do INC-…?”). |
| 12 | Testes **UNIT** dedup já em [`dedup.test.ts`](../../../tests/unit/dedup.test.ts); adicionar casos integrados INT-TICKET. |

### 3.4 Política de transferência (G2-RG-04, G2-RG-05)

| Passo | Ação |
|-------|------|
| 13 | Novo módulo `lib/agent/transfer-policy.ts` (sem Prisma): `evaluateTransferNeed({ confidence, priority, slaBreached, userRequested })` usando env `AGENT_CONFIDENCE_TRANSFER_OFFER` / `STRONG`. |
| 14 | Pós-tool hook ou step Mastra: após `get_ticket` / `list_open_tickets`, se algum `slaBreached`, setar flag `offerTransfer` e `quick_replies` incluindo “Chamar um analista”. |
| 15 | `priority === critical` após classificação → chamar `transfer_to_analyst` (e opcionalmente criar rascunho antes conforme fluxo PRD). |
| 16 | Confiança final &lt; `STRONG` → transferência automática, motivo `agent_sem_seguranca` no resumo (G2-RG-06). |
| 17 | Registrar `rulesFired`: `TRANSFER_USER_REQUEST`, `TRANSFER_SLA_BREACH`, `TRANSFER_CRITICAL`, `TRANSFER_LOW_CONFIDENCE`. |

### 3.5 Handoff estruturado (G2-RG-06)

| Passo | Ação |
|-------|------|
| 18 | Schema `HandoffSummary`: `{ problem, stepsTried?, ticketIds[], reason, confidence, rulesFired[] }`. |
| 19 | Persistência: campo `Conversation.handoffSummary` (Json) **ou** tabela `ConversationHandoff` — preferir Json se único snapshot por transferência ativa. Migração Prisma. |
| 20 | [`transferToAnalyst`](../../../src/lib/conversation/agent-adapter.ts): receber summary do agent; gravar JSON + `addSystemMessage` resumido. |
| 21 | API analista [`handoff.ts`](../../../src/lib/analyst/handoff.ts) / messages: expor summary para UI (Etapa 03). |

### 3.6 Resiliência (G2-RS-01)

| Passo | Ação |
|-------|------|
| 22 | `createResilientTicketClient(inner: TicketClient)`: envolver cada método; em `TicketLegacyUnavailableError`, repetir com backoff [`BACKOFF_MS`](../../../src/lib/ticket-service/retry.ts) (3 tentativas). |
| 23 | Se esgotar: **não** throw até `turn-runner`; tools retornam `{ ok: false, code: 'TICKET_LEGACY_UNAVAILABLE', retryAfterMs }`. |
| 24 | Mastra formata resposta amigável ao usuário; trace `evidence` ou `rulesFired` registra indisponibilidade. |
| 25 | Manter `TICKET_CHAOS_RATE` e **E2E-CHAOS** / **INT-503-01** verdes. |

### 3.7 Privacidade (G2-RS-02)

| Passo | Ação |
|-------|------|
| 26 | Em `runTool` `get_ticket`: catch `TicketForbiddenError` / `TicketNotFoundError` → `{ found: false, messageKey: 'ticket_not_in_your_list' }`. |
| 27 | Instrução Mastra: nunca afirmar que chamado existe para outro usuário. |
| 28 | Novo eval ou estender **EVAL** existente: usuário A consulta `publicId` de B → sem dados vazados. |

### 3.8 Ticket-service — complementos e transfer (G2-TS-01, G2-TS-02)

| Passo | Ação |
|-------|------|
| 29 | Migração: model `TicketUpdate` — `id`, `ticketPublicId`, `authorId`, `body` (Text), `createdAt`; índice por ticket. |
| 30 | `confirmDraft` `update`: append em `TicketUpdate`; concatenar ou manter `description` como “último texto completo” + histórico separado (documentar escolha no as-built). |
| 31 | `TicketServiceClient.transfer(requesterId, publicId, reason)`: validar dono; `status → waiting_analyst`; registrar motivo (campo novo `transferReason` em `Ticket` ou em `TicketUpdate` tipo system). |
| 32 | Tool `transfer_to_analyst`: se `focusedTicketId` no contexto, chamar `transfer` antes/depois de pausar conversa. |
| 33 | Atualizar [02-07](../../02-especificacao/02-07-contratos-api.md) se novas rotas de listagem de updates.

---

## 4. Restrições arquiteturais e regressão

- **Único writer** de `Ticket`: [`TicketServiceImpl`](../../../src/lib/ticket-service/impl/service.ts); agent **nunca** importa Prisma.
- **Draft confirm/cancel:** rotas existentes `/api/tickets/drafts/:id/*` permanecem; client HTTP pode ganhar retry na UI (já trata 503 em [`use-chat-stream.ts`](../../../src/components/chat/use-chat-stream.ts)).
- **Chaos:** não desativar testes de 503 no CI.
- **Confidence env:** ler apenas de `process.env` já documentado em [`.env.example`](../../../.env.example); não hardcodar 50/35.
- **G-UI-E08:** transferência ainda bloqueia composer employee — independente de regras automáticas.

---

## 5. Definition of Done

### Comandos

```bash
npx tsc --noEmit
npm run test:unit
npm run test:evals
npm run test:e2e
npm run build
```

Foco de regressão: E2E-OPEN, E2E-TRANSFER, E2E-CHAOS, E2E-STATUS, evals 06–15.

### Verificação manual por gap

| ID | Roteiro |
|----|---------|
| G2-RG-01 | Descrever impacto organizacional + compromisso hoje → prioridade alta/crítica conforme tabela; trace mostra regra aplicada. |
| G2-RG-02 | Tentar confirmar rascunho incompleto via API → 400; agent pergunta campos faltantes. |
| G2-RG-03 | Abrir problema igual a chamado aberto → proposta **update**, não novo INC. |
| G2-RG-04 | Incidente crítico (e-mail empresa) → transferência registrada. |
| G2-RG-05 | Consultar chamado vencido → oferta “Chamar analista”; confiança 40% → transferência ou oferta conforme limiar. |
| G2-RG-06 | Console analista: bloco resumo com problema + tickets + confiança. |
| G2-RG-07 | “Preciso reembolso de viagem” → redirecionamento financeiro, não TI. |
| G2-RS-01 | `TICKET_CHAOS_RATE=1` temporário: chat informa instabilidade, não tela de erro crua. |
| G2-RS-02 | Funcionário A pergunta INC de B → “não encontrei entre os seus”. |
| G2-TS-01 | Complementar chamado → histórico com entrada datada. |
| G2-TS-02 | Após transfer, ticket em `waiting_analyst` no painel analista. |

### Documentação

- [GAPS2.md](../../desafio/GAPS2.md): G2-RG-* , G2-RS-* , G2-TS-* → `resolvido`.
- [04-03-as-built.md](../../04-registro-mudanca/04-03-as-built.md): § ticket-service, handoff, modelos `TicketUpdate` / `handoffSummary`.
- [04-02](../../04-registro-mudanca/04-02-registro-mudancas.md): migrações Prisma.
- [03-02](../../03-processos-validacao/03-02-plano-testes.md): novos UNIT/evals se criados.