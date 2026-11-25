# Etapa 03 — CI/CD, hardening e CRs de governança

**Data:** 2026-11-24  
**App entrada:** `0.5.0-m5`  
**App alvo (código):** `0.6.0-m6`  
**Docs alvo:** `0.3.1`

## 1. Cabeçalho e escopo da etapa

### IDs cobertos

| ID | Sev | Objetivo |
|----|-----|----------|
| G-E09 | M | CI: Playwright no pipeline + deploy SSH alinhado ao runbook (não só `echo`) |
| G-OPS-02 | M | CI executa `next build` + E2E; gate documentado vs local |
| G-PRD-02 | M | Documentar perfis ENV (fixtures CI vs demo LLM) |
| G-PRD-03 | B | Corrigir [03-02](../../03-processos-validacao/03-02-plano-testes.md) (evals ≠ runtime Mastra) |
| G-UI-E08 | M | CR formal: manter 423/composer off; atualizar **02-02** (status → `aceito` no GAPS) |

### Objetivo

Fechar gaps operacionais e de governança sem relaxar fronteiras testadas; formalizar divergência intencional employee handoff.

### Pré-requisitos

- Etapas 01–02 concluídas ou em RC (E2E estáveis).
- [deploy-vps.md](../../desenvolvimento/deploy-vps.md) existente como referência.

### Fora desta etapa

- Implementação de pixels UI (E01–A05).
- Integração Mastra SDK (**G-E02** já `aceito`).
- URL pública VPS real (preencher quando existir deploy).

---

## 2. Diagnóstico do estado atual

| Gap ID | Arquivo(s) | Falta hoje |
|--------|------------|------------|
| G-E09 | [`.github/workflows/ci.yml`](../../../.github/workflows/ci.yml) | Job `test` só Vitest+evals; `deploy` com `echo` placeholder |
| G-OPS-02 | idem | Sem `npm run build` no job test; sem job Playwright |
| G-PRD-02 | [README](../../../README.md), `.env.example` | Fixtures default; perfil “demo LLM” pouco destacado para entrevista |
| G-PRD-03 | [03-02-plano-testes.md](../../03-processos-validacao/03-02-plano-testes.md) L10 | Texto “Evals agent \| Script CI custom + Mastra” |
| G-UI-E08 | [`02-02`](../../02-especificacao/02-02-especificacao-funcional.md) vs [`chat-workspace.tsx`](../../../src/components/chat/chat-workspace.tsx) | Spec: composer **ativo** em `awaiting_analyst`/`with_analyst`; app: disabled + 423 |

---

## 3. Checklist de implementação (ordem topológica)

### 3.1 Governança — G-UI-E08 (antes ou em paralelo ao CI)

| Passo | Ação |
|-------|------|
| 1 | **Decisão (confirmada):** manter `composerDisabled` para `awaiting` e `withAnalyst`; `POST` employee → **423** `CONVERSATION_WITH_ANALYST` / `CONVERSATION_AWAITING_ANALYST`. **Não** alterar E2E-TRANSFER (espera composer off). |
| 2 | Atualizar [02-02 § estados](../../02-especificacao/02-02-especificacao-funcional.md): coluna composer = **Bloqueado** em `awaiting_analyst` e `with_analyst`; nota “mensagens do funcionário pausadas até devolução”. |
| 3 | [04-02](../../04-registro-mudanca/04-02-registro-mudancas.md) entrada **0.3.1**: CR alinhamento 02-02 ↔ as-built M5 handoff. |
| 4 | [GAPS.md](../../desafio/GAPS.md): **G-UI-E08** → `aceito` com link ao CR. |
| 5 | [04-03 §3](../../04-registro-mudanca/04-03-as-built.md): linha já parcial; reforçar motivo UX/testes. |

### 3.2 CI — G-OPS-02 + G-E09

| Passo | Ação |
|-------|------|
| 6 | No job `test` (ou job `build-next`): após evals, `npm run build` com `DATABASE_URL` dummy ou skip se build não exige DB (validar `next build` standalone). |
| 7 | Novo job **`e2e`**: `needs: test`; Ubuntu; service Postgres idêntico ao `test`; env: `AGENT_EVAL_FIXTURES=true`, `TICKET_CHAOS_RATE=0`, `CHAOS_ENDPOINT_ENABLED=true`, `SESSION_SECRET` (32+ chars); steps: `npm ci`, `prisma migrate deploy`, `prisma db seed`, `npx playwright install chromium`, `npx playwright test --workers=1` (timeout job ≥ 20 min). |
| 8 | Falha E2E bloqueia merge (sem `continue-on-error`). |
| 9 | Job `build` Docker: `needs: e2e` (ou `needs: [test, e2e]`). |
| 10 | Job `deploy`: substituir script por bloco documentado chamando passos de [deploy-vps.md](../../desenvolvimento/deploy-vps.md) (`cd $REMOTE_PATH`, `git pull`, `docker compose build`, `migrate deploy`, `up -d`) — secrets `DEPLOY_*` já definidos; **sem** colar secrets no YAML. |

### 3.3 Documentação — G-PRD-02, G-PRD-03

| Passo | Ação |
|-------|------|
| 11 | README § “Perfis de ambiente”: **Local dev** (fixtures opcional), **CI** (fixtures obrigatório), **Demo LLM** (`OPENROUTER_*`, `AGENT_EVAL_FIXTURES=false`). |
| 12 | `.env.example`: comentários inline por perfil. |
| 13 | 03-02 estratégia evals: “Vitest + `lib/agent/fixture-turn.ts` (determinístico); Mastra = premissa charter, runtime orchestrator próprio”. |
| 14 | [arquitetura-codigo.md](../../desenvolvimento/arquitetura-codigo.md): seção “Gates CI vs local”. |

### 3.4 Sem mudanças obrigatórias

| Item | Nota |
|------|------|
| OpenRouter no GHA | **Não** exigir chave em CI (custo/flakiness). |
| `npm run test` unificado no GHA | Pode permanecer script local; CI espelha comandos explícitos. |

---

## 4. Restrições arquiteturais e regressão

- **INT-BOUNDARY-01** inalterado.
- Rate limit middleware: CI/E2E com `CHAOS_ENDPOINT_ENABLED=true` (já isenta flood falso).
- Playwright **workers: 1** no GHA e local.
- Não force push deploy em `main` sem revisão de secrets.

---

## 5. Definition of Done

### Comandos locais (continuação obrigatória)

```bash
npm run test:unit
npm run test:evals
npm run test:e2e
npm run build
```

### Verificação CI (após merge)

| Check | Esperado |
|-------|----------|
| job `test` | unit + evals (+ build se aplicável) verde |
| job `e2e` | 13/13 specs |
| job `build` | `docker build` OK |
| job `deploy` | SSH executa script documentado (ou skipped se secrets ausentes em fork) |

### Verificação manual

| ID | Roteiro |
|----|---------|
| E08 | Transfer → composer off; após devolução employee vê nota system; spec 02-02 reflete bloqueio |
| PRD-02 | README deixa claro quando usar LLM real |
| PRD-03 | 03-02 sem claim Mastra runtime |
| E09/OPS-02 | PR verde com e2e job no GitHub Actions |

### Documentação final

- `GAPS.md`: E09, OPS-02, PRD-02, PRD-03, E08 (aceito) atualizados.
- `04-02` **0.3.1**; `04-03` §5 CI com job e2e.
- CHANGELOG: release `0.6.0-m6` quando código das 3 etapas estiver merged.

### Matriz gate (fixar em README)

| Onde | Unit+evals | E2E | build |
|------|------------|-----|-------|
| Local pré-push | obrigatório | obrigatório | obrigatório |
| GitHub Actions | job `test` | job `e2e` | job `build` / build step |