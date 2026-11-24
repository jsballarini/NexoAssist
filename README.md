# Nexo Assist

Agent de service desk de TI para o desafio técnico **Beyond the Bytes**. Baseline de produto: [Desafio_Tecnico_Nexo_Assist_PRD_v5.pdf](Desafio_Tecnico_Nexo_Assist_PRD_v5.pdf).

**Versão da aplicação:** `0.3.1` (marco **M3** + estabilidade E2E) — ver [CHANGELOG.md](CHANGELOG.md).

## Documentação

| Onde | Conteúdo |
|------|----------|
| [docs/README.md](docs/README.md) | Especificação (pacote docs **0.2.7**) |
| [docs/desenvolvimento/](docs/desenvolvimento/README.md) | Status M1–M5, arquitetura |
| [docs/execucao/](docs/execucao/README.md) | Guias F1–F5 |

## Início rápido

```bash
cp .env.example .env
docker compose up -d db
npx prisma migrate deploy
npx prisma db seed
npm run dev
```

Login: [http://localhost:3000/login](http://localhost:3000/login) — `ana.souza@nexo.com.br` (qualquer senha) → `/atendimento`.

## Stack

Next.js 15, Prisma, PostgreSQL, iron-session, agent em `lib/agent/` (OpenRouter-ready), SSE chat.

## Testes

Pré-requisito para E2E: banco migrado e seed (`npx prisma migrate deploy` e `npx prisma db seed`).

```bash
npm run prepare:e2e   # 1ª vez: baixa Chromium (senão E2E falha)
npm run test:e2e      # sobe `next dev` em 127.0.0.1:3099 (não reutiliza :3000)
npm run test          # Vitest + Playwright
npm run test:unit     # Vitest completo
npm run test:evals    # EVAL-01..05
npm run build
```

Dev manual (`npm run dev`) usa **http://localhost:3000**. Os E2E sobem um servidor dedicado em **127.0.0.1:3099** por padrão.

| Variável (opcional) | Default | Uso |
|---------------------|---------|-----|
| `PLAYWRIGHT_PORT` | `3099` | Porta do `webServer` do Playwright |
| `PLAYWRIGHT_BASE_URL` | `http://127.0.0.1:3099` | `baseURL` dos testes |
| `PLAYWRIGHT_REUSE_SERVER` | ausente | Defina `1` para reutilizar servidor já no ar (exige `PLAYWRIGHT_BASE_URL` coerente) |

### OpenRouter (dev com LLM real)

Em `.env`:

```env
OPENROUTER_API_KEY=sk-...
OPENROUTER_MODEL=openai/gpt-4o-mini
AGENT_EVAL_FIXTURES=false
LLM_MAX_CONCURRENCY=2
```

Sem chave, o agent usa **fixtures** (`AGENT_EVAL_FIXTURES=true` no `.env.example`) — adequado para CI.

### Chat SSE

1. Abrir `EventSource` em `GET /api/conversations/:id/stream?turnId=<uuid>`.
2. Aguardar conexão (`open`).
3. `POST /api/conversations/active/messages` com o mesmo `turnId`.

## APIs (M3)

| Rota | Descrição |
|------|-----------|
| `GET /api/conversations/active` | Sessão ativa + contador |
| `POST /api/conversations/active/messages` | Enviar mensagem (202) |
| `GET /api/conversations/:id/stream` | SSE do turno |
| `GET /api/conversations/:id/messages` | Histórico + trace |
| `POST /api/conversations/active/new-session` | Nova sessão |

## Marco atual

| Marco | Estado |
|-------|--------|
| M1–M3 | Concluídos |
| M4–M5 | Pendente — [status](docs/desenvolvimento/status-implementacao.md) |

## Estrutura

```
lib/agent/           # Agent (sem Prisma)
src/lib/conversation/
src/lib/ticket-service/
tests/evals/         # EVAL-01..05
e2e/                 # E2E-LOGIN, E2E-STATUS, E2E-KB
```