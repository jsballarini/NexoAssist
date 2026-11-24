# Status da implementação

**Atualizado:** 2026-11-24  
**Versão app:** `0.3.0-m3`  
**Registro formal as-built:** [04-03-as-built.md](../04-registro-mudanca/04-03-as-built.md) (parcial M3).

## Marcos M1–M5

| Marco | Fase | Objetivo (resumo) | Estado | Testes gate | Guia |
|-------|------|-------------------|--------|-------------|------|
| **M1** | F1 | Login, Prisma base | **Concluído** | E2E-LOGIN | [fase-01](../execucao/fase-01-fundacao.md) |
| **M2** | F2 | ticket-service, KB, SLA | **Concluído** | UNIT/INT M2 | [fase-02](../execucao/fase-02-tickets-kb.md) |
| **M3** | F3 | Agent leitura, SSE, trace | **Concluído** | EVAL-01–05, E2E-STATUS, E2E-KB, INT-CONV-01 | [fase-03](../execucao/fase-03-agent-leitura.md) |
| M4 | F4 | Drafts, transfer, limite 30 | Pendente | F4 suite | [fase-04](../execucao/fase-04-mutacoes-regras.md) |
| M5 | F5 | Console analista | Pendente | F5 suite | [fase-05](../execucao/fase-05-console-analista-hardening.md) |

## Checklist M3 (Definition of Done)

| Item | Status |
|------|--------|
| Migration `add_agent_trace` | Feito |
| APIs conversa + SSE | Feito |
| `lib/agent` sem Prisma | Feito |
| `npm run test` + `test:evals` | Feito |
| `npm run build` | Feito |

## Preparação F4 (a partir de M3)

| Tópico | Ação planejada |
|--------|----------------|
| Orchestrator | Estender `lib/agent/run-turn` + `fixture-turn`; pin Mastra opcional |
| Tools mutação | Delegar a `ticket-service` stubs → impl F4 |
| UI | Cards draft (Confirmar/Cancelar), bloqueio 30 msgs |
| Testes | EVAL-06–10, E2E-OPEN/TRANSFER/LIMIT/CHAOS |
| E2E | Manter `workers: 1`; `webServer.timeout` generoso |

## Nota E2E (M3)

Flakiness no login pode ocorrer no *cold start* do Playwright. Rodar `npm run dev` antes e `reuseExistingServer` em dev, ou `CI=1` com retries.

## Próximo passo

**M4** — [fase-04-mutacoes-regras.md](../execucao/fase-04-mutacoes-regras.md).