# Desenvolvimento — código no repositório

**Última atualização:** 2026-11-24 — app `0.5.0-m5`

Esta pasta descreve **o que está implementado** no monólito Next.js e como operá-lo localmente. Não substitui a especificação canônica ([02-07](../02-especificacao/02-07-contratos-api.md), [02-09](../02-especificacao/02-09-variaveis-ambiente.md), modelo [02-06](../02-especificacao/02-06-modelo-dados.md)).

## Índice

| Documento | Descrição |
|-----------|-----------|
| [arquitetura-codigo.md](arquitetura-codigo.md) | Pastas, fluxo de auth M1, diagrama implementado |
| [status-implementacao.md](status-implementacao.md) | Marcos M1–M5, gates de teste, checklist |
| [ambiente-e-comandos.md](ambiente-e-comandos.md) | ENV, Docker, comandos, troubleshooting |
| [deploy-vps.md](deploy-vps.md) | Runbook deploy VPS / CI |

## Relação com outros pacotes

| Pacote | Uso |
|--------|-----|
| [docs/execucao/](../execucao/README.md) | O que implementar em cada fase (WBS/DoD) |
| [docs/03-02](../03-processos-validacao/03-02-plano-testes.md) | IDs de teste obrigatórios |
| [04-03-as-built](../04-registro-mudanca/04-03-as-built.md) | Registro final “como entregue” (pós-M6) |

## Ponto de entrada

Hub na raiz: [../../README.md](../../README.md).