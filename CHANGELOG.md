# Changelog

Todas as mudanças relevantes da **aplicação** neste repositório são documentadas neste arquivo.

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e a aplicação usa [Semantic Versioning](https://semver.org/) (`package.json`).

## [Unreleased]

### Planejado

- **M4 (F4):** drafts, transferência, limite 30 mensagens.

## [0.3.0-m3] - 2026-11-24

### Adicionado

- Modelo `AgentTrace` (migration `add_agent_trace`) 1:1 com mensagens assistant.
- `lib/agent`: orchestrator de turno, tools de leitura, modo fixture (`AGENT_EVAL_FIXTURES`) e OpenRouter-ready.
- `src/lib/conversation`: persistência, SSE (`turn-bus`), APIs canônicas 02-07.
- UI chat em `/atendimento` (SSE antes do POST, uiBlocks, quick replies, nova sessão).
- Evals **EVAL-01**–**EVAL-05**, **INT-CONV-01**, E2E **E2E-STATUS**, **E2E-KB**.
- ENV OpenRouter, concorrência LLM, limiares de confidence.

### Corrigido

- Seed: único SLA vencido da Ana = **INC-20311**; **INC-20517** → Fábio Nunes.

## [0.2.0-m2] - 2026-11-24

### Adicionado

- Prisma: `Ticket`, `TicketDraft`, `KnowledgeArticle` + FTS.
- ticket-service, knowledge-base, SLA, chaos 503, Vitest M2.

## [0.1.0-m1] - 2026-11-24

### Adicionado

- Bootstrap Next.js 15, auth, Prisma base, E2E-LOGIN.