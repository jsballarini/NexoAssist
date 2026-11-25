# Plano de gerenciamento do projeto

**Versão:** 1.0 — 2026-11-24  
**GP:** Juliano Ballarini

## Abordagem

Desenvolvimento incremental em **5 fases verticais** compiláveis. Documentação em paralelo; baseline PRD imutável salvo registro de mudança.

## Marcos (sem datas calendário)

| Marco | Fase | Evidência |
|-------|------|-----------|
| M1 | F1 completa | Compose + login + perfil |
| M2 | F2 completa | APIs ticket/KB + chaos |
| M3 | F3 completa | Chat leitura + 5 evals |
| M4 | F4 completa | Abertura + transferência E2E |
| M5 | F5 completa | Console + 15 evals + CI/CD |
| M6 | Encerramento | As Built + README final |

## Cronograma

Sem datas fixas — sequência **M1 → M6** com dependências na [EAP](03-eap-wbs.md).

## Recursos

| Recurso | Alocação |
|---------|----------|
| Desenvolvimento | 1 full-stack (Juliano Ballarini) |
| Infra VPS | ~2 vCPU, 4GB RAM, Docker |
| LLM | OpenRouter (créditos do autor) |
| Design | Protótipo Pencil existente |

## Custos (qualitativo)

| Item | Observação |
|------|------------|
| OpenRouter | Variável por conversa; mini modelo default recomendado no README |
| VPS | Custo fixo mensal baixo |
| Domínio/HTTPS | Let's Encrypt via proxy |

## Qualidade

- TypeScript strict; revisões por testes.
- [Plano de testes](../03-processos-validacao/03-02-plano-testes.md).
- Evals agent desde F3.

## Comunicação

- Repositório GitHub; README como face externa.
- `docs/` versão SemVer; mudanças em [04-02](../04-registro-mudanca/04-02-registro-mudancas.md).

## Riscos

Resumo **1:1** com o [registro de riscos](../04-registro-mudanca/04-01-registro-riscos.md) (`R-01`–`R-11`):

| # | ID | Tema |
|---|-----|------|
| 1 | R-01 | Custo / latência LLM (OpenRouter) |
| 2 | R-02 | OOM na VPS |
| 3 | R-03 | Nondeterminismo do agent |
| 4 | R-04 | Vazamento de ticket cross-user |
| 5 | R-05 | Avaliador não consegue rodar deploy |
| 6 | R-06 | Breaking change Mastra |
| 7 | R-07 | Sobrecarga de polling no console analista |
| 8 | R-08 | Prazo vs. polish visual (TailAdmin / protótipo) |
| 9 | R-09 | Entrevista ao vivo exige feature fora de escopo |
| 10 | R-10 | Taxa de chaos 503 confunde demo |
| 11 | R-11 | Legado indisponível (PRD) sem UX / resiliência adequadas |

Probabilidade, impacto e mitigação completos apenas em `04-01-registro-riscos.md`.

## Aquisições / ferramentas

- Node.js LTS, Docker, GitHub Actions, OpenRouter API key.

## Stakeholders

| Stakeholder | Interesse |
|-------------|-----------|
| Beyond the Bytes (processo seletivo) | Avaliação desafio |
| Juliano Ballarini | Portfólio e aprendizado |
| Avaliador externo | Rodar local ou deploy |