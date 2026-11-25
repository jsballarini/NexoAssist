# Status da implementação

**Atualizado:** 2026-11-25  
**Versão app:** `0.9.0` — ver [CHANGELOG.md](../../CHANGELOG.md) § 0.9.0  
**Registro formal as-built:** [04-03-as-built.md](../04-registro-mudanca/04-03-as-built.md).

## Marcos M1–M5

| Marco | Fase | Objetivo (resumo) | Estado | Testes gate | Guia |
|-------|------|-------------------|--------|-------------|------|
| **M1** | F1 | Login, Prisma base | **Concluído** | E2E-LOGIN | [fase-01](../execucao/fase-01-fundacao.md) |
| **M2** | F2 | ticket-service, KB, SLA | **Concluído** | UNIT/INT M2 | [fase-02](../execucao/fase-02-tickets-kb.md) |
| **M3** | F3 | Agent leitura, SSE, trace | **Concluído** | EVAL-01–05, E2E-STATUS, E2E-KB, INT-CONV-01 | [fase-03](../execucao/fase-03-agent-leitura.md) |
| **M4** | F4 | Drafts, transfer, limite 30, OUT_OF_SCOPE | **Concluído** | EVAL-06–10, E2E-OPEN/TRANSFER/LIMIT/CHAOS, INT-TICKET-01/02 | [fase-04](../execucao/fase-04-mutacoes-regras.md) |
| **M5** | F5 | Console analista, evals 11–15, CI/hardening | **Concluído** | EVAL-11–15, E2E 01–13, INT-POLL/409/TICKET-03 | [fase-05](../execucao/fase-05-console-analista-hardening.md) |

## Entrega visual (Desafio — nov/2025)

| Área | Estado | Referência |
|------|--------|------------|
| Tokens `nexo.*` + login split | Feito | [protótipo-mapeamento](../anexos/protótipo-mapeamento.md) |
| Shell funcionário + chat Telas 1–2 | Feito | `chat-workspace`, `message-bubble`, `draft-card`, `ticket-blocks` |
| Meu perfil | Feito | `/perfil` |
| Console analista Telas Conversas 1–2 | Feito | `analyst-workspace` e submódulos |
| Linha de sistema ao assumir + painel chamados/trace | Feito | `assumeConversation`, `tickets-panel` |

Chips do console (rótulos do PNG): **Todas | Para você | Com o agent | Minhas**. A lógica de `needsReview` permanece; o rótulo antigo “Revisão sugerida” foi trocado por **Com o agent** na UI.

## Checklist de qualidade (atual)

| Item | Status |
|------|--------|
| Unit Vitest (incl. `inbox-view`, formatação, UI blocks) | Feito |
| E2E Playwright **16** specs (`e2e-01` … `e2e-16`) | Feito |
| Cache E2E isolado (`.next-playwright`) | Feito |
| `npm run build` | Manter antes de release |
| GHA CI | Ver workflow na raiz |

## Estabilidade E2E

- Servidor dedicado `127.0.0.1:3099`, `NEXT_DIST_DIR=.next-playwright` no `playwright.config.ts`.
- **Não** rodar `npm run dev` (:3000) em paralelo com a suite (corrupção de `.next` — ver [ambiente-e-comandos.md](ambiente-e-comandos.md)).
- `CHAOS_ENDPOINT_ENABLED=true` no `webServer`; `resetAnalystTransferSeeds` antes dos specs do analista.

## Próximo passo

As-built M6 / deploy público opcional (`G2-QA-05`) conforme [04-03](../04-registro-mudanca/04-03-as-built.md).