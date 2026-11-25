# Etapa 02 — Fidelidade UI do console analista

**Data:** 2026-11-24  
**App entrada:** `0.5.0-m5`  
**App alvo (código):** `0.6.0-m6` (sugerido)

## 1. Cabeçalho e escopo da etapa

### IDs cobertos

| ID | Sev | Objetivo |
|----|-----|----------|
| G-UI-A01 | M | Busca textual na fila |
| G-UI-A02 | M | Avatar/iniciais, badge não lida, hora no item |
| G-UI-A03 | M | Header: área (department), ticket vinculado, badge modo |
| G-UI-A04 | M | Painel: contagem abertos/fechados, destaque “desta conversa” |
| G-UI-A05 | M | Trace completo (actions, evidence, rawToolCalls, duração) |
| G-AC-07 | M | **Parcial** — fechamento AC-7 com Etapa 01 (PNG Conversas) |

### Objetivo

Alinhar [`/atendente/conversas`](../../../src/app/(analyst)/atendente/conversas/page.tsx) e [`analyst-workspace.tsx`](../../../src/components/analyst/analyst-workspace.tsx) a [02-02 § console](../../02-especificacao/02-02-especificacao-funcional.md) e `Tela Conversas.png` / `Tela Conversas 2.png`.

### Pré-requisitos

- Etapa 01 recomendada antes (AC-7), mas tecnicamente independente para APIs analista.
- Seeds transfer: Ana/Carla em fila (`reset-analyst-seeds` para E2E).

### Fora desta etapa

- **G-UI-A06** (rota `[id]`) — já `aceito`; manter SPA.
- Employee UI, CI, **G-UI-E08**.

---

## 2. Diagnóstico do estado atual

| Gap ID | Arquivo(s) | Falta hoje |
|--------|------------|------------|
| G-UI-A01 | `analyst-workspace.tsx` | Sem `<input>` de busca; filtro só por pills Todas/… |
| G-UI-A02 | inbox [`inbox.ts`](../../../src/lib/analyst/inbox.ts) + workspace | `unreadCount` no JSON não renderizado; sem avatar; `updatedAt` sem formatação amigável |
| G-UI-A03 | workspace takeover bar | Mostra nome + state textual; sem `User.department`; sem INC vinculado |
| G-UI-A04 | [`GET .../employees/:id/tickets`](../../../src/app/api/analyst/employees/[id]/tickets/route.ts) | Só `listOpen`; painel sem totals nem highlight |
| G-UI-A05 | [`listConversationTraces`](../../../src/lib/analyst/handoff.ts) + painel trace UI | API já tem evidence/rawToolCalls; UI só `understanding` expandido |
| G-AC-07 | layout 64+380+flex+340 OK | Busca, header rico, painel summary ausentes |

---

## 3. Checklist de implementação (ordem topológica)

### 3.1 Backend / contratos API (aditivo)

| Passo | Ação |
|-------|------|
| 1 | **Inbox item:** incluir opcionais `employeeDepartment` (join `User.department`), `linkedTicketId?` (último `evidence` tipo `ticket` em mensagem assistant ou heurística INC no thread). Manter campos atuais. |
| 2 | **`GET /api/analyst/employees/:id/tickets`:** resposta `{ items, summary: { open: number, closed: number } }` — `items` **inalterado** em forma; `closed` via `ticket-service` count ou lista resolved. Documentar 02-07. |
| 3 | **Traces:** em `listConversationTraces`, adicionar `durationMs?` = delta entre `createdAt` da mensagem user anterior e assistant (sem migration). |
| 4 | Busca server-side **opcional** fase 2: `GET /api/analyst/inbox?q=` — fase 1 pode ser só client-side no workspace. |

### 3.2 Frontend — lista 380px

| Passo | Gap | Ação |
|-------|-----|------|
| 5 | A01 | Campo busca filtra `items` por `employeeName` + `preview` (case-insensitive) |
| 6 | A02 | Avatar círculo com iniciais; badge numérico se `unreadCount > 0`; hora relativa (`pt-BR`) de `updatedAt` |
| 7 | A02 | Preservar `data-analyst-ready` e seletores usados por E2E-08..13 |

### 3.3 Frontend — thread flex

| Passo | Gap | Ação |
|-------|-----|------|
| 8 | A03 | Header / takeover: `department`, badge estado colorido (`awaiting_analyst` / `with_analyst`), `linkedTicketId` como link visual |
| 9 | — | Manter Assumir/Devolver/Encerrar e fetch imediato pós-handoff |

### 3.4 Frontend — painel 340px + trace

| Passo | Gap | Ação |
|-------|-----|------|
| 10 | A04 | Linha summary “Abertos: N · Fechados: M” acima da lista |
| 11 | A04 | Classe/ring no ticket cujo `id === linkedTicketId` (“Desta conversa”) |
| 12 | A05 | Expand trace: confidence, actions[], rulesFired[], evidence[], rawToolCalls, durationMs |
| 13 | A05 | Manter `data-ticket-panel`, `data-trace-toggle`, `data-trace-understanding` para **E2E-TRACE** / **E2E-PANEL** |

### 3.5 Testes

| Passo | Ação |
|-------|------|
| 14 | Ajustar E2E-INBOX se busca alterar contagem visível (ex. filtrar Carla). |
| 15 | E2E-PANEL: assert summary ou highlight INC-20311 (Ana seed). |
| 16 | `npm run test:e2e` 01–13 completo. |

---

## 4. Restrições arquiteturais e regressão

- Analista APIs permanecem sob RBAC `role === analyst`.
- **INT-POLL-01** / **INT-409-01** inalterados em semântica ETag/409.
- **INT-BOUNDARY-01** inalterado (sem agent nesta etapa, salvo labels em fixtures se compartilhar Etapa 1).
- Playwright `workers: 1`.

---

## 5. Definition of Done

### Comandos

```bash
npm run test:unit
npm run test:evals
npm run test:e2e
npm run build
```

### Verificação manual

| ID | Roteiro |
|----|---------|
| A01 | Digitar “Ana” na busca → só itens Ana |
| A02 | Ver iniciais, badge unread se >0, hora “há X min” |
| A03 | Thread Ana: department, INC-20311 ou vinculado, badge modo |
| A04 | Painel counts; INC-20311 destacado na transfer seed |
| A05 | Expandir trace: tools, evidence, confidence, duração |
| AC-07 | Comparar `Tela Conversas.png` com console ao vivo |

### Documentação

- `GAPS.md`: A01…A05 → `resolvido`; **G-AC-07** → `resolvido` se Etapa 01 também concluída.
- `04-03` + `04-02` 0.3.1: payloads inbox/tickets/traces.
- CHANGELOG / bump app com Etapa 01 se release conjunto.