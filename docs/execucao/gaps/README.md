# Planos de execução — fechamento de gaps (pós-M5)

**Data:** 2026-11-24  
**App de referência:** `0.5.0-m5`  
**Pacote docs:** `0.3.0`  
**Catálogo de lacunas:** [GAPS.md](../../desafio/GAPS.md)

Guias para fechar **somente** gaps ainda `aberto` no `GAPS.md`, sem reabrir itens `resolvido` ou `aceito`. Complementam as fases F1–F5 em [execucao/README.md](../README.md); não substituem [02-02](../../02-especificacao/02-02-especificacao-funcional.md) nem [02-07](../../02-especificacao/02-07-contratos-api.md).

## Ordem de execução

| Ordem | Guia | Quando |
|-------|------|--------|
| 1 | [etapa-01-ui-funcionario.md](etapa-01-ui-funcionario.md) | UI `/atendimento`, `/perfil` vs PNG Tela 1/2/Meu Perfil |
| 2 | [etapa-02-ui-analista.md](etapa-02-ui-analista.md) | UI `/atendente/conversas` vs Tela Conversas |
| 3 | [etapa-03-ci-hardening-crs.md](etapa-03-ci-hardening-crs.md) | CI/CD, governança, CR `G-UI-E08` |

Etapa 1 e 2 podem correr em paralelo se duas sessões; **G-AC-07** só vira `resolvido` após **ambas**.

**Versão alvo após implementação de código (futuro):** app `0.6.0-m6`, docs `0.3.1`.

## Mapa canônico — 20 gaps `aberto`

Reconciliar com [GAPS.md](../../desafio/GAPS.md) a cada release (contagem esperada: **20**).

| ID | Sev | Etapa | Status alvo ao concluir etapa |
|----|-----|-------|-------------------------------|
| G-AC-07 | M | 01 + 02 | `resolvido` só após **ambas** etapas (fidelidade protótipo) |
| G-UI-E01 | M | 01 | `resolvido` |
| G-UI-E02 | M | 01 | `resolvido` |
| G-UI-E03 | B | 01 | `resolvido` |
| G-UI-E04 | M | 01 | `resolvido` |
| G-UI-E05 | B | 01 | `resolvido` |
| G-UI-E06 | M | 01 | `resolvido` |
| G-UI-E07 | M | 01 | `resolvido` |
| G-UI-E08 | M | 03 | `aceito` (CR: manter 423/composer off; patch **02-02**) |
| G-UI-E09 | B | 01 | `resolvido` |
| G-UI-E10 | B | 01 | `resolvido` |
| G-UI-A01 | M | 02 | `resolvido` |
| G-UI-A02 | M | 02 | `resolvido` |
| G-UI-A03 | M | 02 | `resolvido` |
| G-UI-A04 | M | 02 | `resolvido` |
| G-UI-A05 | M | 02 | `resolvido` |
| G-E09 | M | 03 | `resolvido` (Playwright no CI + deploy alinhado ao runbook) |
| G-OPS-02 | M | 03 | `resolvido` |
| G-PRD-02 | M | 03 | `resolvido` ou `aceito` (perfis ENV documentados) |
| G-PRD-03 | B | 03 | `resolvido` (03-02 sem “Mastra” como runtime de evals) |

### Fora destes 20 (não cobertos pelos guias)

Gaps já `resolvido` ou `aceito`: G-DOC-01…05, G-AC-01, G-AC-05, G-AC-08, G-E02, G-E11, G-PRD-01, G-UI-A06, G-OPS-01.

### Contagem por etapa (IDs únicos)

- **Etapa 01:** G-UI-E01…E07, E09, E10 (9) + G-AC-07 parcial  
- **Etapa 02:** G-UI-A01…A05 (5) + G-AC-07 parcial  
- **Etapa 03:** G-E09, G-OPS-02, G-PRD-02, G-PRD-03, G-UI-E08 (5)

## Gates globais (após implementação de código)

```bash
npm run test:unit
npm run test:evals
npm run test:e2e
npm run build
```

Fronteira obrigatória: **INT-BOUNDARY-01** (`lib/agent/**` sem `@/lib/db` / `@prisma/client`).

## Referências visuais e normativas

| Recurso | Caminho |
|---------|---------|
| PRD v5 | [docs/desafio/Desafio_Tecnico_Nexo_Assist_PRD_v5.pdf](../../desafio/Desafio_Tecnico_Nexo_Assist_PRD_v5.pdf) |
| Protótipo | [docs/desafio/nexo/nexo.pen](../../desafio/nexo/nexo.pen) |
| PNGs | `docs/desafio/Tela *.png` |
| Mapeamento UI | [protótipo-mapeamento.md](../../anexos/protótipo-mapeamento.md) |
| As built | [04-03-as-built.md](../../04-registro-mudanca/04-03-as-built.md) |
| Registro de mudanças | [04-02-registro-mudancas.md](../../04-registro-mudanca/04-02-registro-mudancas.md) |

## Decisões fixas (não renegociar nas etapas 1–2)

- **G-UI-E08:** composer funcionário desabilitado em `awaiting_analyst` e `with_analyst`; `POST` mensagens → **423** — formalizar na Etapa 3 (CR), não reverter na Etapa 1.
- **G-UI-A06:** rota única SPA em `/atendente/conversas` — já `aceito`.
- Playwright na suíte local: `workers: 1` (ver [playwright.config.ts](../../../playwright.config.ts)).