# Etapa 01 — Fidelidade UI do funcionário

**Data:** 2026-11-24  
**App entrada:** `0.5.0-m5`  
**App alvo (código):** `0.6.0-m6` (sugerido)

## 1. Cabeçalho e escopo da etapa

### IDs cobertos ([GAPS.md](../../desafio/GAPS.md))

| ID | Sev | Objetivo |
|----|-----|----------|
| G-UI-E01 | M | Status line (chips de `actions[]` acima da bolha assistant) |
| G-UI-E02 | M | Trace expandível completo (confidence, evidence, JSON técnico) |
| G-UI-E03 | B | Placeholder do composer conforme 02-02 |
| G-UI-E04 | M | Histórico de sessões (dropdown ou lista) |
| G-UI-E05 | B | Indicador explícito “digitando…” durante SSE |
| G-UI-E06 | M | Card rascunho com ação **Editar** |
| G-UI-E07 | M | Seletor multi-ticket clicável |
| G-UI-E09 | B | Perfil: “Alterada há N dias” (UI estática) |
| G-UI-E10 | B | Skeleton/spinner em carregamentos |
| G-AC-07 | M | **Parcial** — checklist fidelidade employee vs `Tela 1.png` / `Tela 2.png` |

### Objetivo da etapa

Elevar aderência do chat (`/atendimento`) e perfil (`/perfil`) ao [protótipo-mapeamento.md](../../anexos/protótipo-mapeamento.md) e [02-02](../../02-especificacao/02-02-especificacao-funcional.md), com extensões **aditivas** em API/uiBlocks.

### Pré-requisitos

- M1–M5 concluídos; suíte E2E 01–13 verde localmente.
- `npx prisma migrate deploy` + `seed` antes de validar manualmente.

### Fora desta etapa

- **G-UI-E08** (composer em `awaiting_analyst`) → [etapa-03-ci-hardening-crs.md](etapa-03-ci-hardening-crs.md) (CR doc only).
- Console analista → Etapa 02.
- CI Playwright / deploy → Etapa 03.

---

## 2. Diagnóstico do estado atual no repositório

| Gap ID | Arquivo(s) existente(s) | Falta hoje |
|--------|-------------------------|------------|
| G-UI-E01 | [`src/components/chat/message-bubble.tsx`](../../../src/components/chat/message-bubble.tsx) | Sem faixa de chips acima da bolha; `trace.actions` só dentro de `<details>` |
| G-UI-E02 | idem; [`GET /api/conversations/:id/messages`](../../../src/app/api/conversations/[id]/messages/route.ts) | Expand mostra understanding/tools/rules; sem confidence, evidence nem JSON colapsável |
| G-UI-E03 | [`chat-workspace.tsx`](../../../src/components/chat/chat-workspace.tsx) | Placeholder `Digite sua mensagem…` (spec: “Escreva para o Nexo…”) |
| G-UI-E04 | [`new-session`](../../../src/app/api/conversations/active/new-session/route.ts) apenas | Sem API/UI para listar sessões `closed` anteriores |
| G-UI-E05 | [`use-chat-stream.ts`](../../../src/components/chat/use-chat-stream.ts) | `draftAssistant` parcial; sem rótulo “digitando…” |
| G-UI-E06 | `DraftCard` em message-bubble | Só Confirmar/Cancelar |
| G-UI-E07 | [`src/lib/conversation/types.ts`](../../../src/lib/conversation/types.ts) `UiBlock` | Apenas `ticket_card` unitário; sem `ticket_selector` |
| G-UI-E09 | [`src/app/(employee)/perfil/page.tsx`](../../../src/app/(employee)/perfil/page.tsx) | Sem texto de idade da senha |
| G-UI-E10 | chat-workspace | Loading inicial sem skeleton; envio sem spinner dedicado |
| G-AC-07 | layout 232px OK em [`employee-sidebar.tsx`](../../../src/components/employee/employee-sidebar.tsx) | Chips, seletor, histórico ausentes vs PNG |

---

## 3. Checklist de implementação (ordem topológica)

### 3.1 Backend / contratos API (aditivo — patch `02-07` docs `0.3.1`)

| Passo | Ação |
|-------|------|
| 1 | **`UiBlock`** em [`types.ts`](../../../src/lib/conversation/types.ts): adicionar `{ type: "ticket_selector"; tickets: { ticketId, title, statusLabel, openedAt }[] }` e opcional `{ type: "action_chips"; labels: string[] }` (ou derivar só de `trace.actions` na UI). |
| 2 | **`GET /api/conversations/sessions`** (employee, RBAC owner): retorna conversas do usuário em `closed`, ordenadas por `updatedAt` desc — `{ items: [{ conversationId, sessionSequence, state, updatedAt, preview }] }`. Documentar em `02-07`. |
| 3 | Garantir que resposta de mensagens inclui `trace.confidence`, `trace.evidence`, `trace.actions`, `trace.rulesFired` (já persistidos em `AgentTrace`; validar serialização na rota). |
| 4 | Sem alterar códigos HTTP de transfer/handoff (423 permanece — Etapa 3 documenta). |

### 3.2 Agent / fixtures (`lib/agent/**`)

| Passo | Ação |
|-------|------|
| 5 | Em [`lib/agent/fixture-turn.ts`](../../../lib/agent/fixture-turn.ts) (e fluxo OpenRouter quando aplicável): emitir `ticket_selector` em cenários com múltiplos tickets abertos (ex. EVAL-02); manter **sem** imports Prisma (`INT-BOUNDARY-01`). |
| 6 | Mapear `actions[]` estáveis para labels PT usados nos chips (ex. `list_open_tickets` → “Consultou seus chamados”). |

### 3.3 Frontend / componentes UI

| Passo | Gap | Ação |
|-------|-----|------|
| 7 | E01 | Componente `StatusLineChips` (ou bloco inline) **acima** do texto assistant, usando `message.trace?.actions` ou `uiBlocks` |
| 8 | E02 | Refatorar `<details>` trace: confidence %, lista evidence (`type` + `id`), `<details>` aninhado “Detalhes técnicos” com `JSON.stringify(trace, null, 2)` |
| 9 | E03 | Alterar placeholder do `Input` em chat-workspace |
| 10 | E04 | Dropdown “Histórico” na barra N/30; fetch `/api/conversations/sessions`; ao selecionar, `loadHistory(id)` read-only ou CTA “Nova sessão” se precisar reabrir fluxo |
| 11 | E05 | Banner ou linha `role="status"` “Nexo está digitando…” quando `streaming === true` |
| 12 | E06 | Botão **Editar** no `DraftCard`: preencher composer com texto sugerido + instrução “ajuste e reenvie”; alternativa mínima: `cancel_draft` + nova mensagem user |
| 13 | E07 | Render `ticket_selector`: lista clicável; clique chama `onQuickReply` com `INC-…` ou `get_ticket` phrase |
| 14 | E09 | Em perfil: parágrafo “Senha alterada há **N** dias” (seed fixo 90 ou constante `PROFILE_PASSWORD_AGE_DAYS`) |
| 15 | E10 | Skeleton na área de mensagens até `data-chat-ready`; spinner no botão Enviar durante `streaming` |
| 16 | AC-07 | Checklist visual lado a lado com [`docs/desafio/Tela 1.png`](../../desafio/Tela%201.png) / Tela 2.png |

### 3.4 Testes (opcional mas recomendado)

| Passo | Ação |
|-------|------|
| 17 | Vitest unitário leve para mapeamento action→label (se extraído). |
| 18 | E2E: estender `02-e2e-status` ou novo spec para clicar item do seletor (se fixture emitir lista). |
| 19 | Regressão: `npm run test:e2e` 01–13. |

---

## 4. Restrições arquiteturais e regressão

- **`lib/agent/**`:** proibido `@/lib/db` e `@prisma/client` — gate **INT-BOUNDARY-01**.
- **Contratos:** apenas campos/rotas **aditivas**; não remover shape de `uiBlocks` usado por E2E-OPEN/CONFIRM.
- **Estados handoff:** não reabilitar composer em `awaiting_analyst` nesta etapa (**G-UI-E08** é CR na Etapa 3).
- **Playwright:** `workers: 1`; não mudar porta 3099 sem atualizar CI (Etapa 3).

---

## 5. Definition of Done

### Comandos

```bash
npm run test:unit
npm run test:evals
npm run test:e2e
npm run build
```

### Verificação manual por gap

| ID | Roteiro |
|----|---------|
| E01 | Após “status meus chamados”, chips visíveis **acima** da bolha assistant |
| E02 | Expandir trace: ver confidence, evidence, JSON técnico |
| E03 | Placeholder “Escreva para o Nexo…” |
| E04 | Dropdown histórico lista sessão fechada anterior |
| E05 | Enviar msg → ver “digitando…” até `done` |
| E06 | Rascunho exibe Editar; fluxo não quebra Confirmar |
| E07 | Múltiplos INC listados; clique consulta ticket |
| E09 | Perfil mostra idade da senha |
| E10 | Primeira carga chat com skeleton; envio com feedback |
| AC-07 | Compare Tela 1/2: chips, cards, hierarquia |

### Documentação

- Atualizar [`GAPS.md`](../../desafio/GAPS.md): E01…E07, E09, E10 → `resolvido`; AC-07 permanece `aberto` até Etapa 02.
- [04-03-as-built.md](../../04-registro-mudanca/04-03-as-built.md): divergências UI employee (se novas rotas).
- [04-02-registro-mudancas.md](../../04-registro-mudanca/04-02-registro-mudancas.md): patch **0.3.1** (02-07 sessions + uiBlocks).
- [CHANGELOG.md](../../../CHANGELOG.md): nota `0.6.0-m6` ou patch conforme escopo entregue.