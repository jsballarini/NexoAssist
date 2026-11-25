# Planos de execução — Nexo Assist (F1–F5)

**Pacote docs:** 0.3.0  
**Especificação de referência:** 0.2.9+  
**Data:** 2026-11-24

Guias de implementação por fase compilável. Cada fase entrega um slice vertical que compila, sobe via Docker Compose e passa os testes listados no guia.

## Ordem obrigatória

| Ordem | Marco | Guia | EAP |
|-------|-------|------|-----|
| 1 | M1 | [fase-01-fundacao.md](fase-01-fundacao.md) | 1.1.x |
| 2 | M2 | [fase-02-tickets-kb.md](fase-02-tickets-kb.md) | 1.2.x |
| 3 | M3 | [fase-03-agent-leitura.md](fase-03-agent-leitura.md) | 1.3.x |
| 4 | M4 | [fase-04-mutacoes-regras.md](fase-04-mutacoes-regras.md) | 1.4.x |
| 5 | M5 | [fase-05-console-analista-hardening.md](fase-05-console-analista-hardening.md) | 1.5.x |

## Pós-M5 — fechamento de gaps (M6 sugerido)

Após `0.5.0-m5`, lacunas abertas vs [PRD v5](../desafio/Desafio_Tecnico_Nexo_Assist_PRD_v5.pdf) estão catalogadas em [desafio/GAPS.md](../desafio/GAPS.md). **20 gaps** `aberto` têm guias de execução isolados:

| Ordem | Guia | Foco |
|-------|------|------|
| 1 | [gaps/etapa-01-ui-funcionario.md](gaps/etapa-01-ui-funcionario.md) | UI employee + AC-7 parcial |
| 2 | [gaps/etapa-02-ui-analista.md](gaps/etapa-02-ui-analista.md) | UI analista + AC-7 parcial |
| 3 | [gaps/etapa-03-ci-hardening-crs.md](gaps/etapa-03-ci-hardening-crs.md) | CI E2E, CR G-UI-E08, docs evals |

Índice e mapa ID → etapa: [gaps/README.md](gaps/README.md).

**Versão alvo pós-código:** app `0.6.0-m6`, docs `0.3.1`.

## Pós-M7 — gaps-v2 (comportamento PRD)

Após `0.7.1-m7.1`, lacunas de **comportamento do agent** vs [PRD v5](../desafio/Desafio_Tecnico_Nexo_Assist_PRD_v5.pdf) estão em [desafio/GAPS2.md](../desafio/GAPS2.md). **25 itens** `G2-*` têm guias em [gaps-v2/](gaps-v2/README.md) (docs-only nesta fase; implementação segue os guias):

| Ordem | Guia | Foco |
|-------|------|------|
| 1 | [gaps-v2/etapa-01-agent-mastra-contexto-transparencia.md](gaps-v2/etapa-01-agent-mastra-contexto-transparencia.md) | Mastra, tool calling, histórico, `reasoning` |
| 2 | [gaps-v2/etapa-02-regras-anexo-a-resiliencia-ticket-service.md](gaps-v2/etapa-02-regras-anexo-a-resiliencia-ticket-service.md) | Anexo A, resiliência, ticket-service |
| 3 | [gaps-v2/etapa-03-ui-rascunho-console-e-entrega.md](gaps-v2/etapa-03-ui-rascunho-console-e-entrega.md) | UI, console, evals, README, eficiência LLM |

Índice e mapa G2-*: [gaps-v2/README.md](gaps-v2/README.md).

**Versão alvo pós-código (gaps-v2):** app `0.8.0-m8`, docs `0.3.4`.

Relação com [gaps/](gaps/README.md): gaps-v1 fechou UI/CI (GAPS.md); gaps-v2 fecha qualidade de decisão e regras do desafio.

## Mapa WBS → fase

| WBS | Fase |
|-----|------|
| 1.1.1 – 1.1.6 | F1 |
| 1.2.1 – 1.2.7 | F2 |
| 1.3.1 – 1.3.7 | F3 |
| 1.4.1 – 1.4.8 | F4 |
| 1.5.1 – 1.5.9 | F5 |

Detalhe: [03-eap-wbs.md](../01-iniciacao/03-eap-wbs.md).

## Mapa testes → fase

Catálogo canônico: [03-02-plano-testes.md](../03-processos-validacao/03-02-plano-testes.md).

| Fase | UNIT | INT | E2E | EVAL |
|------|------|-----|-----|------|
| F1 | — | (prep INT-CONV-01) | E2E-LOGIN | — |
| F2 | UNIT-SLA-01,02,03; UNIT-RBAC-01 | INT-503-01, INT-BOUNDARY-01 | — | — |
| F3 | — | INT-CONV-01 | E2E-STATUS, E2E-KB | EVAL-01 – EVAL-05 |
| F4 | UNIT-SESSION-01, UNIT-DEDUP-01, UNIT-RULES-01 | INT-TICKET-01, INT-TICKET-02 | E2E-OPEN, E2E-TRANSFER, E2E-LIMIT, **E2E-CHAOS** (estreia) | EVAL-06 – EVAL-10 |
| F5 | — | INT-409-01, INT-POLL-01, INT-TICKET-03 | E2E-INBOX, ASSUME, RETURN, CLOSE, PANEL, TRACE + **regressão E2E-CHAOS** | EVAL-11 – EVAL-15 |

## `.env.example` incremental

| Fase | Novas variáveis |
|------|-----------------|
| F1 | `DATABASE_URL`, `SESSION_SECRET` |
| F2 | `TICKET_CHAOS_RATE`, `CHAOS_ENDPOINT_ENABLED`, `TEST_USE_WALL_CLOCK` |
| F3 | `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `LLM_MAX_CONCURRENCY`, `AGENT_CONFIDENCE_*` |
| F4 | (uso documentado; sem novas obrigatórias) |
| F5 | `ANALYST_POLL_INTERVAL_MS`, `ANALYST_POLL_BACKGROUND_MS`, `ANALYST_THREAD_POLL_MS`, `PROXY_API_RATE_LIMIT_PER_MIN` + espelho [02-09](../02-especificacao/02-09-variaveis-ambiente.md) |

## Referências cruzadas

- Arquitetura: [02-03-especificacao-tecnica.md](../02-especificacao/02-03-especificacao-tecnica.md)
- API/SSE: [02-07-contratos-api.md](../02-especificacao/02-07-contratos-api.md)
- Seeds: [personas-seed.md](../anexos/personas-seed.md)
- UI: [protótipo-mapeamento.md](../anexos/protótipo-mapeamento.md)