# Registro de riscos

Escala: Probabilidade (B/M/A), Impacto (B/M/A).

**Correspondência com o Plano de Gerenciamento:** os itens `1`–`11` da seção *Riscos* em [04-plano-gerenciamento.md](../01-iniciacao/04-plano-gerenciamento.md) mapeiam **1:1** para `R-01`–`R-11` nesta tabela (mesma ordem).

| ID | Risco | P | I | Mitigação | Dono |
|----|-------|---|---|-----------|------|
| R-01 | Custo OpenRouter acima do esperado | M | M | `OPENROUTER_MODEL` configurável (modelo econômico no README); `LLM_MAX_CONCURRENCY`; *prompts* enxutos e histórico de conversa limitado (30 msgs/sessão); sem *prompt caching* no MVP | GP |
| R-02 | VPS OOM com LLM + Postgres | M | A | `LLM_MAX_CONCURRENCY=2`; swap limitado; monitor memória | GP |
| R-03 | Respostas agent inconsistentes | A | A | Regras determinísticas; evals 5→15; temperatura baixa | GP |
| R-04 | Vazamento ticket cross-user | B | A | ticket-service enforce requesterId; testes 403; code review boundary | GP |
| R-05 | Avaliador não consegue deploy | M | M | README Compose prioritário; deploy opcional documentado | GP |
| R-06 | Breaking change Mastra | M | M | Plano B LangGraph no README; pin versões | GP |
| R-07 | Polling analista sobrecarrega VPS | M | B | Intervals ENV; 304 ETag; pause background tab | GP |
| R-08 | Atraso vs polish visual TailAdmin | M | B | Priorizar telas PRD; tokens mínimos primeiro | GP |
| R-09 | Entrevista ao vivo exige feature fora escopo | M | M | Registro mudança; PRD baseline | GP |
| R-10 | Chaos 503 confunde demo | B | B | Rate baixo default 3%; chaos manual em dev | GP |
| R-11 | Legado indisponível (PRD) quebra fluxo sem mensagem/retry | M | A | `ticket-service` 503 + backoff no client; estados loading/erro na UI; testes INT-503 e E2E-CHAOS; endpoint chaos só em dev | GP |

## Revisão

Revisar após cada marco M1–M5; atualizar probabilidade mitigada.