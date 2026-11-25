# Gaps — baseline `docs/desafio` vs entrega

**Data:** 2026-11-24  
**Versão app:** `0.7.0-m7`  
**Pacote docs:** `0.3.2`  
**Baseline:** [PRD v5](Desafio_Tecnico_Nexo_Assist_PRD_v5.pdf) + protótipo [nexo/nexo.pen](nexo/nexo.pen)

Legenda de severidade: **C** crítico · **M** médio · **B** baixo.

Status: `aberto` | `aceito` (decisão formal) | `resolvido` | `adiado`

Índice da pasta desafio: [README.md](README.md).

---

## Resumo

| Grupo | Abertos | Aceitos | Resolvidos (doc) |
|-------|---------|---------|------------------|
| A Documental | 0 | 0 | 5 |
| B AC charter | 0 | 0 | 4 |
| C Escopo E-xx | 2 | 1 (E-02 Mastra) | 0 |
| D UI employee | 1 | 0 | 9 |
| E UI analista | 0 | 1 | 5 |
| F PRD implícito | 3 | 1 (TailAdmin) | 0 |
| G Operação | 1 | 0 | 1 |

---

## A. Pacote `docs/desafio` e documentação

| ID | Sev | Gap | Status | Notas |
|----|-----|-----|--------|-------|
| G-DOC-01 | M | Sem README na pasta desafio | **resolvido** | [README.md](README.md) |
| G-DOC-02 | M | Links quebrados ao PDF/`.pen` | **resolvido** | Correção em `docs/README`, charter, escopo, protótipo |
| G-DOC-03 | B | `docs/README` desatualizado (0.2.8, PNG na raiz) | **resolvido** | 0.2.9 + pasta `desafio/` |
| G-DOC-04 | M | README raiz (M5 pendente, 7 E2E) | **resolvido** | README sincronizado |
| G-DOC-05 | M | `arquitetura-codigo.md` só M4 | **resolvido** | Atualizado para M5 |

---

## B. Critérios de aceite (charter AC-1–AC-8)

| ID | Sev | Gap | Status | Notas |
|----|-----|-----|--------|-------|
| G-AC-01 | B | Runbook VPS | **resolvido** | [deploy-vps.md](../desenvolvimento/deploy-vps.md) |
| G-AC-05 | M | README sem seção trade-offs do agent | **resolvido** | README § Decisões e trade-offs |
| G-AC-07 | M | Fidelidade protótipo parcial | **resolvido** | Etapas 01–02 (employee + console analista vs PNG) |
| G-AC-08 | C | As Built incompleto | **resolvido** | [04-03](../04-registro-mudanca/04-03-as-built.md) §1–2, §4, §6–7 |

---

## C. Escopo formal (E-01–E-11)

| ID | Sev | Gap | Status | Notas |
|----|-----|-----|--------|-------|
| G-E02 | M | Mastra vs orchestrator próprio | **aceito** | [04-03 §3](../04-registro-mudanca/04-03-as-built.md) |
| G-E09 | M | CI: deploy SSH stub; sem Playwright no job test | **aberto** | `.github/workflows/ci.yml` |
| G-E11 | C | Deploy VPS documentado | **resolvido** | Runbook + §4 as-built |

---

## D. UI funcionário (02-02 + PNG Tela 1/2)

| ID | Sev | Gap | Status |
|----|-----|-----|--------|
| G-UI-E01 | M | Status line (chips de `actions[]` acima da bolha) | **resolvido** |
| G-UI-E02 | M | Trace expand: confidence, evidence, JSON técnico | **resolvido** |
| G-UI-E03 | B | Placeholder “Escreva para o Nexo…” | **resolvido** |
| G-UI-E04 | M | Histórico de sessões / dropdown | **resolvido** |
| G-UI-E05 | B | Indicador “digitando…” explícito | **resolvido** |
| G-UI-E06 | M | Rascunho: ação Editar | **resolvido** |
| G-UI-E07 | M | Seletor multi-ticket clicável | **resolvido** |
| G-UI-E08 | M | Composer ativo em `awaiting_analyst` (spec) vs bloqueado (app) | aberto |
| G-UI-E09 | B | Perfil: “Alterada há N dias” | **resolvido** |
| G-UI-E10 | B | Skeletons/spinners consistentes | **resolvido** |

---

## E. UI analista (02-02 + PNG Conversas)

| ID | Sev | Gap | Status |
|----|-----|-----|--------|
| G-UI-A01 | M | Busca textual na fila | **resolvido** |
| G-UI-A02 | M | Avatar, badge não lida, hora no item | **resolvido** |
| G-UI-A03 | M | Header: área, ticket vinculado, badge modo | **resolvido** |
| G-UI-A04 | M | Painel: contagem abertos/fechados, destaque conversa | **resolvido** |
| G-UI-A05 | M | Trace completo (latência, rawToolCalls, evidence) | **resolvido** |
| G-UI-A06 | B | Rota `/conversas/[id]` vs SPA única | **aceito** |

---

## F. Produto / qualidade

| ID | Sev | Gap | Status | Notas |
|----|-----|-----|--------|-------|
| G-PRD-01 | B | TailAdmin OSS integral | **aceito** | Tailwind + componentes próprios |
| G-PRD-02 | M | Demo default em fixtures | aberto | `AGENT_EVAL_FIXTURES=true` |
| G-PRD-03 | B | Plano testes cita Mastra nos evals | aberto | Vitest + fixture-turn |

---

## G. Operação

| ID | Sev | Gap | Status | Notas |
|----|-----|-----|--------|-------|
| G-OPS-01 | C | VPS sem URL/procedimento real no repositório | **resolvido** | Runbook template; URL = `TBD` até deploy |
| G-OPS-02 | M | CI sem E2E Playwright / `next build` no job test | aberto | Build via Docker no job `build` |

---

## Priorização

1. **Feito (M6 doc):** README desafio, GAPS, links, as-built §1/2/4, runbook VPS.
2. **Médio:** AC-7 (trace/chips employee, painel analista), AC-5 trade-offs no README.
3. **Opcional / CR:** alinhar 02-02 ao handoff (G-UI-E08); integrar Mastra (G-E02); E2E no GHA (G-OPS-02).

---

## Alinhado (referência)

Fluxos PRD com testes: login, KB, status, draft, transfer, limite 30, console analista, evals **01–15**, E2E **01–13**, `INT-BOUNDARY-01`, polling ETag, Docker Compose local.

Atualizar este arquivo quando um gap mudar de status ou surgir novo CR em [04-02](../04-registro-mudanca/04-02-registro-mudancas.md).