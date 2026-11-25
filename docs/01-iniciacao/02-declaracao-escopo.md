# Declaração de escopo do projeto

**Versão:** 1.0 — 2026-11-24

## Justificativa

O service desk da Nexo (fictícia) sofre com triagem manual, chamados incompletos e duplicados. O Nexo Assist reduz carga com agent conversacional audível e console para analistas.

## Objetivos do escopo

Entregar solução **completa** conforme PRD, com **mesma prioridade** para chat do funcionário e console do analista.

## Entregas (in scope)

| ID | Entrega |
|----|---------|
| E-01 | Aplicação web Next.js (employee + analyst) |
| E-02 | Agent Mastra com tools e trace |
| E-03 | Módulo ticket-service simulado (chaos 503) |
| E-04 | Central de ajuda com FTS |
| E-05 | PostgreSQL + migrations + seeds |
| E-06 | Docker Compose + `.env.example` |
| E-07 | Testes automatizados (unit, integração, E2E, evals) |
| E-08 | README de produto |
| E-09 | Pipeline GitHub Actions (build, test, deploy SSH) — F5 |
| E-10 | Pacote documentação `docs/` |
| E-11 | Deploy em VPS própria documentado |

## Funcionalidades principais

- Login corporativo simulado; RBAC `employee` | `analyst`.
- Chat SSE; chips; expand trace; cards; quick replies; 30 msgs/sessão.
- Abertura/atualização chamado com rascunho confirmado.
- Consulta status; SLA vencido; transferência.
- Console: fila, assumir, devolver, encerrar; polling documentado.
- Persistência de conversas, estados e chamados.

## Exclusões explícitas

| Exclusão | Nota |
|----------|------|
| SSO / LDAP / Active Directory | Auth seed apenas |
| E-mail transacional de reset senha | UI estática em perfil |
| Layout mobile / responsivo | Desktop 1440px |
| Integração ITSM real (ServiceNow, Hermes, etc.) | Simulador interno |
| Billing / metering avançado de tokens LLM | Rate limit básico no proxy |
| Console beyond escopo PRD | Sem telefonia, CMDB real |

## Critério de transparência (obrigatório)

Cada resposta do agent persistirá `AgentTrace` com:

- `understanding`
- `actions[]`
- `confidence` — inteiro **0–100** (ver [Convenção de confidence](../02-especificacao/02-08-regras-service-desk.md#convenção-de-confidence))
- `rulesFired[]`
- `evidence[]` (artigos, ticket ids)

UI funcionário: chips + expand. UI analista: log completo.

## Critérios de aceite de escopo

Escopo considerado entregue quando AC-1 a AC-8 do [charter](01-project-charter.md) forem atendidos e [04-03-as-built.md](../04-registro-mudanca/04-03-as-built.md) publicado.

## Referências

- [PRD v5](../desafio/Desafio_Tecnico_Nexo_Assist_PRD_v5.pdf)
- [Especificação funcional](../02-especificacao/02-02-especificacao-funcional.md)