# Etapa 03 — UI rascunho, console analista e entrega PRD

**Data:** 2026-11-24  
**App entrada:** pós-Etapas 01–02  
**App alvo (código):** `0.8.0-m8` (release candidata ao desafio)

## 1. Cabeçalho e escopo da etapa

### IDs cobertos ([GAPS2.md](../../desafio/GAPS2.md))

| ID | Sev | Objetivo |
|----|-----|----------|
| G2-UI-01 | M | Cartão `draft_card` com 6 campos + labels PT-BR |
| G2-UI-02 | M | **Editar** rascunho (não só copiar título) |
| G2-UI-03 | B | Quick reply “Chamar um analista” quando `slaBreached` |
| G2-AN-01 | M | Fila / destaque casos baixa confiança ou “agent sem segurança” |
| G2-AN-02 | B | Filtro “Com o agent” com semântica útil (não vazio) |
| G2-QA-01 | M | Evals com variações de frase; `test:evals:llm` opcional |
| G2-QA-02 | M | README com seções obrigatórias do PRD |
| G2-QA-03 | M | Commits **Conventional Commits** da Etapa 01 em diante |
| G2-QA-04 | B | Tokens/latência no trace + estimativa custo/README |
| G2-QA-05 | B | Deploy público — **`adiado`** (diferencial; não bloqueia DoD) |

### Objetivo da etapa

Fechar fidelidade **Telas 2 e 3** e console (história analista 2), reescrever garantia de qualidade (evals/README) e registrar eficiência do LLM — critérios de avaliação PRD (*Interface*, *Comunicação*, *Transparência*).

### Pré-requisitos

- [Etapa 01](etapa-01-agent-mastra-contexto-transparencia.md) e [Etapa 02](etapa-02-regras-anexo-a-resiliencia-ticket-service.md) concluídas.
- `handoffSummary`, draft payload completo, política de transferência ativos.

### Fora desta etapa (adiado)

- **G2-QA-05:** publicar URL no [deploy-vps.md](../../desenvolvimento/deploy-vps.md); só se houver tempo pós-suíte verde.

---

## 2. Diagnóstico do estado atual no repositório

| Gap ID | Arquivo(s) | Lacuna |
|--------|------------|--------|
| G2-UI-01 | [`types.ts`](../../../src/lib/conversation/types.ts) `draft_card` | Só `draftId`, `operation`, `title`, `priority`, `dueAtPreview`, `affectedScope?`. |
| G2-UI-01 | [`message-bubble.tsx`](../../../src/components/chat/message-bubble.tsx) `DraftCard` | Prioridade/escopo em inglês (`high`, `only_me`). |
| G2-UI-02 | [`chat-workspace.tsx`](../../../src/components/chat/chat-workspace.tsx) `handleEditDraft` | `setInput(block.title)` apenas. |
| G2-UI-03 | [`fixture-turn.ts`](../../../lib/agent/fixture-turn.ts) status plan | `quick_replies`: `"Detalhes do INC-20311"` fixo; sem “Chamar analista” dinâmico. |
| G2-AN-01 | [`inbox.ts`](../../../src/lib/analyst/inbox.ts) L5–6 | `INBOX_STATES`: só `awaiting_analyst`, `with_analyst`. |
| G2-AN-02 | [`analyst-workspace.tsx`](../../../src/components/analyst/analyst-workspace.tsx) filtro `with_agent` | Filtra `state === 'with_agent'` na lista que **não** inclui essas conversas. |
| G2-QA-01 | [`tests/evals/*.test.ts`](../../../tests/evals) | Frases idênticas ao regex de `matchPlan`. |
| G2-QA-02 | [`README.md`](../../../README.md) | Falta: como o agent decide, qualidade das decisões, modelo, com mais tempo. |
| G2-QA-03 | histórico git | Commits monolíticos; OpenRouter não commitado. |
| G2-QA-04 | trace / Mastra | Sem `usage` exposto na UI; README sem custo. |

---

## 3. Checklist de implementação (ordem topológica)

### 3.1 Contratos UI — `draft_card` (G2-UI-01)

| Passo | Ação |
|-------|------|
| 1 | Estender `UiBlock` `draft_card` em [`types.ts`](../../../src/lib/conversation/types.ts): `type`, `category`, `description` (string), `ticketType` se necessário. |
| 2 | Emissor (Mastra pós-tool `create_draft`): preencher a partir do payload validado (Etapa 02). |
| 3 | [`DraftCard`](../../../src/components/chat/message-bubble.tsx): grid com labels via [`ticket-labels.ts`](../../../src/lib/domain/ticket-labels.ts) + `ticketCategoryLabel`, `ticketStatusLabel` onde couber; SLA previsto mantido. |
| 4 | Comparar com [Tela 2.png](../../desafio/Tela%202.png) e [protótipo-mapeamento](../../anexos/protótipo-mapeamento.md). |

### 3.2 Edição de rascunho (G2-UI-02)

| Passo | Ação |
|-------|------|
| 5 | **Opção A (recomendada):** `PATCH /api/tickets/drafts/:draftId` (employee RBAC): body parcial Zod; só `status=pending`; retorna `DraftSummary` atualizado. |
| 6 | Modal ou painel inline no `DraftCard` com campos editáveis; **Salvar** chama PATCH; **Confirmar** usa payload atualizado. |
| 7 | **Opção B (mínima):** cancelar draft + mensagem estruturada “ajuste: …” com `pendingDraft` no `TurnContext` — documentar se A não couber no tempo. |
| 8 | Desabilitar edição em histórico read-only (`viewingHistoryId`) — padrão já em chat-workspace. |

### 3.3 Quick replies e Tela 3 (G2-UI-03)

| Passo | Ação |
|-------|------|
| 9 | Remover quick replies hardcoded a `INC-20311` do caminho produção/fixture de demo. |
| 10 | Gerar opções a partir de dados: se qualquer ticket `slaBreached`, incluir **“Chamar um analista”** (dispara transfer ou mensagem conforme G2-RG-05). |
| 11 | Seletor de tickets: opções derivadas de `ticket_selector.tickets` (ids reais). |
| 12 | E2E: ajustar [`02-e2e-status.spec.ts`](../../../e2e/02-e2e-status.spec.ts) se assertiva de quick reply fixa. |

### 3.4 Console analista — fila e filtros (G2-AN-01, G2-AN-02)

| Passo | Ação |
|-------|------|
| 13 | **Decisão UX (documentar no as-built):** renomear filtro `with_agent` para **“Revisão sugerida”** ou incluir na inbox conversas `with_agent` com `needsReview=true` (derivado de `confidenceLast < AGENT_CONFIDENCE_TRANSFER_OFFER` ou regra `TRANSFER_LOW_CONFIDENCE` no último trace). |
| 14 | Estender [`listInboxItems`](../../../src/lib/analyst/inbox.ts): query unificada — handoff ativo **ou** revisão sugerida; campo `inboxKind: 'handoff' \| 'review'`. |
| 15 | Badge no item: “Agent sem segurança” quando aplicável; cor distinta de `awaiting_analyst`. |
| 16 | Exibir [`handoffSummary`](etapa-02-regras-anexo-a-resiliencia-ticket-service.md) no header da thread em [`analyst-workspace.tsx`](../../../src/components/analyst/analyst-workspace.tsx). |
| 17 | Trace analista ([`G-UI-A05`](../../execucao/gaps/etapa-02-ui-analista.md) já entregue): garantir `reasoning` e `usage` visíveis após Etapa 01. |

### 3.5 Transparência na UI employee (reforço G2-AG-04)

| Passo | Ação |
|-------|------|
| 18 | `message-bubble` trace: seção **Por quê** = `trace.reasoning`; regras com label PT. |
| 19 | Manter chips `actions[]` (G-UI-E01) acima da bolha. |

### 3.6 Qualidade — evals (G2-QA-01)

| Passo | Ação |
|-------|------|
| 20 | Matriz `tests/evals/variations.ts` (ou por arquivo): por intenção (KB, status, open, update, transfer, scope, privacy) ≥3 frases diferentes. |
| 21 | Asserções: `trace.actions`, `rulesFired`, operação do draft, **não** substring exata da resposta. |
| 22 | Script `npm run test:evals:llm` — `vitest run tests/evals --grep @llm` ou env `EVAL_USE_LLM=true`; skip no CI. |
| 23 | Atualizar [03-02](../../03-processos-validacao/03-02-plano-testes.md): deixar explícito runtime Mastra + fixtures. |

### 3.7 README e comunicação (G2-QA-02, G2-QA-04)

| Passo | Ação |
|-------|------|
| 24 | README § **Como o agent decide**: diagrama Mermaid interface → Mastra → tools → serviços. |
| 25 | README § **Garantia da qualidade**: unit (domínio), evals (variações), e2e (fluxos PRD), boundary test. |
| 26 | README § **Escolha do modelo**: OpenRouter + modelo default; por que custo/latência. |
| 27 | README § **Trade-offs** (expandir tabela atual) e **Com mais tempo**: deploy G2-QA-05, fine-tuning, Mastra evaluators. |
| 28 | README § **Custo por conversa**: fórmula com `usage` médio por turno × 30 msgs máx. |

### 3.8 Governança de commits (G2-QA-03)

| Passo | Ação |
|-------|------|
| 29 | Da Etapa 01 em diante: um commit por unidade lógica (`feat(agent):`, `feat(ticket-service):`, `docs:`). |
| 30 | Incluir arquivos OpenRouter na primeira commit da Etapa 01 (`feat(agent): add openrouter stream client`). |
| 31 | Não reescrever histórico dos 7 commits antigos; apenas adiante. |

### 3.9 Deploy opcional (G2-QA-05 — adiado)

| Passo | Ação |
|-------|------|
| 32 | Se executar: preencher URL em [deploy-vps.md](../../desenvolvimento/deploy-vps.md); rate limit + teto OpenRouter; link no README. Caso contrário: manter `TBD` e status `adiado` no GAPS2. |

---

## 4. Restrições arquiteturais e regressão

- **G-UI-E08:** composer employee off + 423 em handoff — não reverter.
- **Playwright:** `workers: 1`; suite 01–13 verde antes de considerar gap-v2 fechado.
- **CI:** `AGENT_EVAL_FIXTURES=true`; job `e2e` inalterado salvo novos specs.
- **Contratos aditivos:** `PATCH` draft documentado em 02-07; não remover campos de `uiBlocks` usados por E2E-OPEN.
- **Histórico de sessões (G-UI-E04):** não quebrar dropdown existente em chat-workspace.

---

## 5. Definition of Done

### Comandos

```bash
npx tsc --noEmit
npm run test:unit
npm run test:evals
npm run test:e2e
npm run build
```

Opcional local com API key: `npm run test:evals:llm` (não obrigatório no CI).

### Verificação manual por gap

| ID | Roteiro |
|----|---------|
| G2-UI-01 | Abrir chamado conversando: card mostra tipo, categoria, descrição, prioridade PT, afetados, SLA. |
| G2-UI-02 | Editar descrição no card → PATCH → confirmar com texto novo. |
| G2-UI-03 | Lista chamados com vencido → quick reply “Chamar um analista”. |
| G2-AN-01 | Forçar confiança &lt; limiar (fixture ou mensagem ambígua) → item na fila com badge. |
| G2-AN-02 | Filtro “Revisão sugerida” / renomeado lista conversas; não vazio no seed de demo. |
| G2-QA-01 | Rodar evals; variações passam sem frase única do regex. |
| G2-QA-02 | README contém seções exigidas no entregável PRD item 2. |
| G2-QA-03 | Últimos commits seguem Conventional Commits. |
| G2-QA-04 | Trace técnico mostra tokens/latência; README estima custo. |
| G2-QA-05 | Se adiado: GAPS2 permanece `adiado`; sem penalidade PRD. |

### Roteiro PRD integrado (smoke)

1. Login funcionário → VPN / status / rascunho / confirmar.
2. Consulta chamado vencido → oferta analista → transfer → 423.
3. Login analista → resumo handoff + assumir → devolver.
4. Expandir trace: understanding, actions, confidence, **reasoning**.

### Documentação

- [GAPS2.md](../../desafio/GAPS2.md): todos `resolvido` exceto **G2-QA-05** `adiado`.
- [GAPS.md](../../desafio/GAPS.md): sem reabrir itens `aceitos`; nota cruzada “comportamento fechado em GAPS2”.
- [04-03-as-built.md](../../04-registro-mudanca/04-03-as-built.md) + [04-02](../../04-registro-mudanca/04-02-registro-mudancas.md): versão docs `0.3.4`.
- [CHANGELOG.md](../../../CHANGELOG.md): `0.8.0-m8`.
- [docs/README.md](../../README.md): pacote docs `0.3.4`.