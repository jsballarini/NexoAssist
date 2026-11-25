# Matriz de rastreabilidade

Liga requisitos PRD → história → caso de uso → fase → teste.

IDs de teste: catálogo canônico em [03-02-plano-testes.md](03-02-plano-testes.md).

| ID PRD / Req | História | UC | Fase | Teste |
|--------------|----------|-----|------|-------|
| Resolução sem fila | US-F01 | UC-03 | F3 | EVAL-03; E2E-KB |
| Consulta chamados | US-F02 | UC-02 | F3 | EVAL-02; EVAL-04; E2E-STATUS |
| Complementar chamado | US-F03 | UC-05 | F4 | EVAL-08; INT-TICKET-02 |
| Abrir conversando | US-F04 | UC-04 | F4 | EVAL-06; E2E-OPEN |
| Analista preferir | US-F05 | UC-07 | F4–F5 | EVAL-09; E2E-TRANSFER |
| Continuar outro dia | US-F06 | — | F1–F3 | INT-CONV-01 |
| Transparência | US-F07 | UC-02 | F3 | EVAL-01–05 (trace assert) |
| Login | — | UC-01 | F1 | E2E-LOGIN |
| Chamados qualificados | US-A01 | UC-04 | F4 | UNIT-SLA-01; INT-TICKET-01 |
| Fila analista | US-A02 | UC-08 | F5 | E2E-INBOX |
| Assumir | US-A03 | UC-08 | F5 | E2E-ASSUME; INT-409-01 |
| Devolver | US-A04 | UC-09 | F5 | E2E-RETURN |
| Encerrar | US-A05 | UC-10 | F5 | E2E-CLOSE |
| Painel chamados | US-A06 | — | F5 | E2E-PANEL |
| Trace analista | US-A07 | — | F5 | E2E-TRACE |
| Serviço separado | RP-04 | UC-12 | F2 | INT-BOUNDARY-01 |
| Legado indisponível | PRD p.2 | UC-12 | F2+ | INT-503-01; E2E-CHAOS |
| 30 mensagens | RP-02 | UC-11 | F4 | UNIT-SESSION-01; E2E-LIMIT |
| Privacidade | RNF-02 | — | F2 | UNIT-RBAC-01 |
| Dedup / reabertura | Anexo A | UC-05 | F4–F5 | EVAL-07; EVAL-12; UNIT-DEDUP-01; INT-TICKET-03 |
| Fora escopo TI | Anexo A | UC-13 | F4 | EVAL-10 |
| Polling analista | spec 02-07 | UC-08 | F5 | INT-POLL-01; E2E-ASSUME |

## Legenda tipos de teste

- **UNIT-*** — Vitest em `lib/domain`, `ticket-service`
- **INT-*** — Vitest + route handlers / DB de teste
- **E2E-*** — Playwright
- **EVAL-*** — Cenários agent PT-BR ([03-02](03-02-plano-testes.md#evals-do-agent-corpus-5--15))