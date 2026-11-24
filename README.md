# Nexo Assist

Agent de service desk de TI para o desafio técnico **Beyond the Bytes**. Baseline de produto: [Desafio_Tecnico_Nexo_Assist_PRD_v5.pdf](Desafio_Tecnico_Nexo_Assist_PRD_v5.pdf).

**Versão da aplicação:** `0.4.0-m4` (marco **M4** — drafts, transfer, limite 30) — ver [CHANGELOG.md](CHANGELOG.md).

## Documentação

| Onde | Conteúdo |
|------|----------|
| [docs/README.md](docs/README.md) | Especificação (pacote docs **0.2.8**) |
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
npm run test:evals    # EVAL-01..10
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

## APIs (M3–M4)

| Rota | Descrição |
|------|-----------|
| `GET /api/conversations/active` | Sessão ativa (`state`, contador /30) |
| `POST /api/conversations/active/messages` | Enviar mensagem (202; 429 limite; 423 analista) |
| `GET /api/conversations/:id/stream` | SSE do turno (`ready`, `token`, `message`, `done`, `agent_error`) |
| `GET /api/conversations/:id/messages` | Histórico + trace |
| `POST /api/conversations/active/new-session` | Nova sessão |
| `POST /api/tickets/drafts/:draftId/confirm` | Confirma rascunho → ticket |
| `POST /api/tickets/drafts/:draftId/cancel` | Cancela rascunho |

### Fluxo draft (M4)

1. Agent propõe rascunho no chat (`draft_card` + SLA previsto).
2. **Confirmar** / **Cancelar** chamam as rotas acima.
3. `TICKET_CHAOS_RATE=1` força 503 no ticket-service (demo `E2E-CHAOS`).

### Transfer e limite

- `transfer_to_analyst` → `state=awaiting_analyst`, composer desabilitado.
- 30 mensagens **do funcionário** por sessão (respostas do assistente não contam) → modal + **Nova sessão**.

## Marco atual

| Marco | Estado |
|-------|--------|
| M1–M4 | Concluídos |
| M5 | Pendente — [status](docs/desenvolvimento/status-implementacao.md) |

## Estrutura

```
lib/agent/           # Agent (sem Prisma)
src/lib/conversation/
src/lib/ticket-service/
tests/evals/         # EVAL-01..10
e2e/                 # E2E-LOGIN..CHAOS (7 specs)
```