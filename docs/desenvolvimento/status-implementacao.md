# Status da implementação

**Atualizado:** 2026-11-24  
**Versão app:** `0.5.0-m5`  
**Registro formal as-built:** [04-03-as-built.md](../04-registro-mudanca/04-03-as-built.md) (M5).

## Marcos M1–M5

| Marco | Fase | Objetivo (resumo) | Estado | Testes gate | Guia |
|-------|------|-------------------|--------|-------------|------|
| **M1** | F1 | Login, Prisma base | **Concluído** | E2E-LOGIN | [fase-01](../execucao/fase-01-fundacao.md) |
| **M2** | F2 | ticket-service, KB, SLA | **Concluído** | UNIT/INT M2 | [fase-02](../execucao/fase-02-tickets-kb.md) |
| **M3** | F3 | Agent leitura, SSE, trace | **Concluído** | EVAL-01–05, E2E-STATUS, E2E-KB, INT-CONV-01 | [fase-03](../execucao/fase-03-agent-leitura.md) |
| **M4** | F4 | Drafts, transfer, limite 30, OUT_OF_SCOPE | **Concluído** | EVAL-06–10, E2E-OPEN/TRANSFER/LIMIT/CHAOS, INT-TICKET-01/02 | [fase-04](../execucao/fase-04-mutacoes-regras.md) |
| **M5** | F5 | Console analista, evals 11–15, CI/hardening | **Concluído** | EVAL-11–15, E2E 01–13, INT-POLL/409/TICKET-03 | [fase-05](../execucao/fase-05-console-analista-hardening.md) |

## Checklist M5 (Definition of Done)

| Item | Status |
|------|--------|
| `src/lib/analyst` + APIs ETag/409/423 | Feito |
| UI console + POST mensagem analista | Feito |
| Seeds transfer + restore E2E | Feito |
| EVAL-11–15 + INT analista/ticket reopen | Feito |
| E2E 13/13 + regressão employee | Feito |
| GHA CI, rate limit, `.env.example` | Feito |
| `npm run test` + `test:evals` + `test:e2e` + `build` | Feito (2026-11-24) |

## Estabilidade E2E (0.5.0-m5)

- Servidor dedicado `127.0.0.1:3099`, `CHAOS_ENDPOINT_ENABLED=true` no `webServer`.
- Reset de fila analista antes de specs 08–13 (`resetAnalystTransferSeeds`).
- Nova sessão do funcionário fecha **todas** as conversas em estados ativos (não só a mais recente).

## Próximo passo

**M6** — as-built final e deploy documentado (ver [04-03](../04-registro-mudanca/04-03-as-built.md)).