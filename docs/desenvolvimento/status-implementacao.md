# Status da implementação

**Atualizado:** 2026-11-24  
**Versão app:** `0.4.0-m4`  
**Registro formal as-built:** [04-03-as-built.md](../04-registro-mudanca/04-03-as-built.md) (parcial M4).

## Marcos M1–M5

| Marco | Fase | Objetivo (resumo) | Estado | Testes gate | Guia |
|-------|------|-------------------|--------|-------------|------|
| **M1** | F1 | Login, Prisma base | **Concluído** | E2E-LOGIN | [fase-01](../execucao/fase-01-fundacao.md) |
| **M2** | F2 | ticket-service, KB, SLA | **Concluído** | UNIT/INT M2 | [fase-02](../execucao/fase-02-tickets-kb.md) |
| **M3** | F3 | Agent leitura, SSE, trace | **Concluído** | EVAL-01–05, E2E-STATUS, E2E-KB, INT-CONV-01 | [fase-03](../execucao/fase-03-agent-leitura.md) |
| **M4** | F4 | Drafts, transfer, limite 30, OUT_OF_SCOPE | **Concluído** | EVAL-06–10, E2E-OPEN/TRANSFER/LIMIT/CHAOS, INT-TICKET-01/02 | [fase-04](../execucao/fase-04-mutacoes-regras.md) |
| M5 | F5 | Console analista | Pendente | F5 suite | [fase-05](../execucao/fase-05-console-analista-hardening.md) |

## Checklist M4 (Definition of Done)

| Item | Status |
|------|--------|
| Migration `m4_ticket_dedup_index` + drafts no ticket-service | Feito |
| APIs confirm/cancel draft + limites conversa | Feito |
| Tools mutação/transfer + dedup + OUT_OF_SCOPE | Feito |
| UI DraftCard, banner awaiting, modal 30, toast 503 | Feito |
| `npm run test` + `test:evals` (01–10) | Feito |
| `npm run build` | Feito |
| E2E 7/7 (incl. CHAOS mock 503) | Feito |

## Estabilidade SSE (0.4.0-m4)

- `turn-bus` e `withLlmConcurrency` em `globalThis` (evita duplicação de módulo no `next dev`).
- Cliente: `conversationId` ativo antes do stream; fallback `loadHistory` se `done` não chegar.
- Evento SSE `ready` confirma inscrição no bus antes do turno.

## Próximo passo

**M5** — [fase-05-console-analista-hardening.md](../execucao/fase-05-console-analista-hardening.md).