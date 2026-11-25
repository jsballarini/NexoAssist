# Registro de mudanças

**Versão atual do pacote `docs/`:** 0.3.6 — 2026-11-25  
**Baseline funcional:** [PRD v5](../../Desafio_Tecnico_Nexo_Assist_PRD_v5.pdf) — **não alterável** exceto por decisão formal com justificativa.

**Aprovador:** Juliano Ballarini (GP / Tech Lead)

## Política de versionamento (docs)

| Tipo | SemVer | Exemplo |
|------|--------|---------|
| Patch | 0.1.x | Correções texto, clarificações |
| Minor | 0.x.0 | Novo requisito não-PRD acordado, fase extra doc |
| Major | x.0.0 | Mudança de arquitetura ou exclusão de entrega |

## Histórico

| Versão | Data | Descrição | Aprovador |
|--------|------|-----------|-----------|
| 0.1.0 | 2026-11-24 | Pacote inicial de especificação pós-entrevista | Juliano Ballarini |
| 0.1.1 | 2026-11-24 | Padronização confidence 0–100; AC-7; patrocinador; risco R-11 legado; refs 04-03-as-built | Juliano Ballarini |
| 0.1.2 | 2026-11-24 | Alinhamento 1:1 resumo de riscos (plano) ↔ R-01–R-11 (registro) | Juliano Ballarini |
| 0.1.3 | 2026-11-24 | 02-09 ENV; TicketStatus UI; reabertura/SLA; fluxo SSE; fronteira agent sem Prisma | Juliano Ballarini |
| 0.1.4 | 2026-11-24 | Tools Mastra 1:1 com ticket-service (`list_recent_resolved`, `reopen_ticket`, `cancel_draft`) | Juliano Ballarini |
| 0.1.5 | 2026-11-24 | 02-07: rotas F4 draft confirm/cancel + `operation` create/update/reopen; sem reopen HTTP direto | Juliano Ballarini |
| 0.1.6 | 2026-11-24 | 03: EVAL-06–15 sequencial; IDs teste 03-01↔03-02; FE-01/02 Client+KB; legenda Vitest | Juliano Ballarini |
| 0.1.7 | 2026-11-24 | 03-01 US-F01: E2E-KB (dúvida KB sem chamado) vs E2E-OPEN (abertura) | Juliano Ballarini |
| 0.1.8 | 2026-11-24 | 04-03 baseline docs 0.1.7; R-01 mitigação custo LLM sem prompt cache | Juliano Ballarini |
| 0.1.9 | 2026-11-24 | personas-seed: INC-20150 → Diego Ramos (EVAL-12 / INT-TICKET-03) | Juliano Ballarini |
| 0.2.0 | 2026-11-24 | Minor: pasta `docs/execucao/` — guias F1–F5, índice, mapa testes/WBS; `docs/README` seção 5 | Juliano Ballarini |
| 0.2.1 | 2026-11-24 | Patch: execução F3 SSE alinhada a 02-07 (`/conversations/:id/stream`); F5 ENV polling = 02-09 | Juliano Ballarini |
| 0.2.2 | 2026-11-24 | Patch: `docs/desenvolvimento/`; README hub raiz; CHANGELOG.md da aplicação | Juliano Ballarini |
| 0.2.3 | 2026-11-24 | Patch: M2 as-built parcial (04-03); arquitetura/status/ambiente M2; README app `0.2.0-m2` | Juliano Ballarini |
| 0.2.4 | 2026-11-24 | Patch: `migrate deploy` no boot local; aviso `search_vector` / não usar `migrate dev` sem mudança de schema | Juliano Ballarini |
| 0.2.5 | 2026-11-24 | Patch: M3 arquitetura/status; 04-03 M3; README app `0.3.0-m3` | Juliano Ballarini |
| 0.2.6 | 2026-11-24 | Patch: preparação F4 (orchestrator/trace); Playwright estabilidade E2E | Juliano Ballarini |
| 0.2.7 | 2026-11-24 | Patch: estabilidade E2E/auth/SSE; harness Playwright :3099; app 0.3.1; as-built M3 §5 | Juliano Ballarini |
| 0.2.8 | 2026-11-24 | Patch: M4 as-built §5–§6; arquitetura drafts/transfer; app 0.4.0-m4; EVAL-06–10 / E2E 04–07 | Juliano Ballarini |
| 0.2.9 | 2026-11-24 | Patch: 02-07 POST mensagem analista; M5 as-built/console; app `0.5.0-m5`; EVAL-11–15 / E2E 08–13 / GHA | Juliano Ballarini |
| 0.3.0 | 2026-11-24 | Minor: `docs/desafio/README` + `GAPS`; links PRD/pen; as-built §1/4/6/7; runbook [deploy-vps](../desenvolvimento/deploy-vps.md) | Juliano Ballarini |
| 0.3.1 | 2026-11-24 | Patch: 02-07 `GET /api/conversations/sessions`; `UiBlock` `ticket_selector`; UI employee trace/histórico (M6) | Juliano Ballarini |
| 0.3.2 | 2026-11-24 | Patch: 02-07 inbox `department`/`linkedTicketId`; tickets `summary`; traces `durationMs`; UI console analista (M7) | Juliano Ballarini |
| 0.3.3 | 2026-11-24 | CR **G-UI-E08**: 02-02 composer bloqueado em `awaiting_analyst`/`with_analyst` + HTTP 423; CI e2e/build/deploy; perfis ENV e gates (**Etapa 03**) | Juliano Ballarini |
| 0.3.4 | 2026-11-24 | CR **gaps-v2 Etapa 01** (G2-AG-01..04): agent em Mastra com tool calling; `TurnContext` (histórico, rascunho pendente); migração `AgentTrace.reasoning`/`usage`; SSE `trace` aditivo (`reasoning`, `usage`); novas ENV `AGENT_HISTORY_MAX_MESSAGES`, `AGENT_MAX_STEPS`, `AGENT_MAX_OUTPUT_TOKENS`, `AGENT_LLM_TIMEOUT_MS`; fixture só com `AGENT_EVAL_FIXTURES=true`; app `0.8.0-m8.1` | Juliano Ballarini |

| 0.3.5 | 2026-11-25 | CR **gaps-v2 Etapa 02** (G2-RG-01..07, G2-RS-01/02, G2-TS-01/02): migração `20261125000000_ticket_updates_transfer_handoff` (`TicketUpdate`, `Ticket.transferReason`, `Conversation.handoffSummary`); `TicketServiceClient.transfer`; `create_draft` com `impact`/`urgency`; novas ENV `TICKET_RETRY_ATTEMPTS`, `TICKET_RETRY_BACKOFF_MS`, `TICKET_RETRY_TURN_BUDGET_MS`; campo aditivo `handoffSummary` em `GET /api/analyst/conversations/:id/messages`; app `0.8.0-m8.2` | Juliano Ballarini |
| 0.3.6 | 2026-11-25 | CR **gaps-v2 Etapa 03** (G2-UI-01..03, G2-AN-01/02, G2-QA-01..04): `PATCH /api/tickets/drafts/:draftId` (edição de rascunho pendente); campos aditivos `ticketType`/`category`/`description` em `draft_card` e `DraftSummary`; `GET /api/analyst/inbox` com `needsReview` e `inboxKind` (inclui conversas `with_agent` de baixa confiança); `npm run test:evals:llm` e ENV `EVAL_USE_LLM`/`EVAL_LLM_MIN_ACCURACY`; README com seções do PRD; app `0.8.0-m8.3` | Juliano Ballarini |
| 0.3.7 | 2026-11-25 | Release app **0.9.0**: paridade UI Desafio, conversas encerradas/handback, dedup reforçada, `reset-employee-chat` (dev), cache E2E `.next-playwright`, README arquitetura; ver [CHANGELOG](../../CHANGELOG.md#090---2026-11-25) | Juliano Ballarini |

## Solicitações (template)

Copiar para novas entradas:

```markdown
### CR-XXX — Título

- **Data solicitação:**
- **Solicitante:**
- **Tipo:** Escopo técnico | Escopo funcional | Cronograma | Doc only
- **Descrição:**
- **Justificativa:**
- **Impacto:** Fases / testes / deploy
- **Decisão:** Aprovado | Rejeitado | Adiado
- **Versão docs após merge:**
```

*Nenhuma CR aberta na versão 0.2.2.*