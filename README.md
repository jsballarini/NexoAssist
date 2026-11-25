# Nexo Assist

Agent de service desk de TI para o desafio técnico **Beyond the Bytes**. Baseline de produto: [docs/desafio/Desafio_Tecnico_Nexo_Assist_PRD_v5.pdf](docs/desafio/Desafio_Tecnico_Nexo_Assist_PRD_v5.pdf). Lacunas documentadas: [docs/desafio/GAPS.md](docs/desafio/GAPS.md).

**Versão da aplicação:** `0.7.1-m7.1` (M7 UI + **M7.1** CI/e2e/governança) — ver [CHANGELOG.md](CHANGELOG.md).

## Documentação

| Onde | Conteúdo |
|------|----------|
| [docs/README.md](docs/README.md) | Especificação (pacote docs **0.3.3**) |
| [docs/desafio/](docs/desafio/README.md) | PRD, protótipo, GAPS |
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

Login: [http://localhost:3000/login](http://localhost:3000/login) — funcionário `ana.souza@nexo.com.br` → `/atendimento`; analista `rafael.lima@nexo.com.br` → `/atendente/conversas` (qualquer senha no seed).

## Stack

Next.js 15, Prisma, PostgreSQL, iron-session, agent em `lib/agent/` (OpenRouter-ready), SSE chat.

## Testes

Pré-requisito para E2E: banco migrado e seed (`npx prisma migrate deploy` e `npx prisma db seed`).

```bash
npm run prepare:e2e   # 1ª vez: baixa Chromium (senão E2E falha)
npm run test:e2e      # sobe `next dev` em 127.0.0.1:3099 (não reutiliza :3000)
npm run test          # Vitest + Playwright
npm run test:unit     # Vitest completo
npm run test:evals    # EVAL-01..15
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
# opcional — default https://openrouter.ai/api/v1
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
AGENT_EVAL_FIXTURES=false
LLM_MAX_CONCURRENCY=2
```

Sem chave, o agent usa **fixtures** (`AGENT_EVAL_FIXTURES=true` no `.env.example`) — adequado para CI.

### Perfis de ambiente (G-PRD-02)

| Perfil | Quando | `AGENT_EVAL_FIXTURES` | LLM |
|--------|--------|------------------------|-----|
| **Local dev** | `npm run dev` | `true` (default) ou `false` com OpenRouter | Opcional |
| **CI / E2E** | GHA jobs `test` + `e2e`, Playwright local | `true` (obrigatório) | Desligado |
| **Demo LLM** | Entrevista / staging | `false` + `OPENROUTER_API_KEY` | OpenRouter |

Detalhes: [`.env.example`](.env.example), [02-09](docs/02-especificacao/02-09-variaveis-ambiente.md).

### Gates de validação (G-OPS-02)

| Onde | Unit + evals | E2E | `next build` |
|------|--------------|-----|--------------|
| Local pré-push | `npm run test:unit` + `npm run test:evals` | `npm run test:e2e` | `npm run build` |
| GitHub Actions | job `test` | job `e2e` | job `test` (+ Docker em `build`) |

### Chat SSE

1. Abrir `EventSource` em `GET /api/conversations/:id/stream?turnId=<uuid>`.
2. Aguardar conexão (`open`).
3. `POST /api/conversations/active/messages` com o mesmo `turnId`.

## APIs principais

| Rota | Descrição |
|------|-----------|
| `GET /api/conversations/active` | Sessão ativa (`state`, contador /30) |
| `POST /api/conversations/active/messages` | Enviar mensagem (202; 429 limite; 423 analista) |
| `GET /api/conversations/:id/stream` | SSE do turno |
| `POST /api/conversations/active/new-session` | Nova sessão |
| `POST /api/tickets/drafts/:draftId/confirm` \| `cancel` | Rascunho → ticket |
| `GET /api/analyst/inbox` | Fila analista (ETag / 304) |
| `POST /api/analyst/conversations/:id/assume` \| `return-to-agent` \| `close` | Handoff |
| `POST /api/analyst/conversations/:id/messages` | Mensagem do analista |

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
| M1–M7.1 | Concluídos — [status](docs/desenvolvimento/status-implementacao.md) |

## Decisões e trade-offs

| Tema | Decisão | Motivo |
|------|---------|--------|
| Agent runtime | Orchestrator em `lib/agent/` + fixture CI | Evals/E2E determinísticos; Mastra opcional futuro |
| LLM default | `AGENT_EVAL_FIXTURES=true` sem API key | CI e onboarding sem custo |
| E2E | Porta **3099** dedicada | Evita colisão com `next dev` :3000 |
| Mutação tickets | Sempre via draft confirmado | Único writer `ticket-service`; dedup Anexo A |
| Handoff | Employee bloqueado em `awaiting_analyst` e `with_analyst` (423) | CR [04-02 §0.3.3](docs/04-registro-mudanca/04-02-registro-mudancas.md); gap **G-UI-E08** `aceito` |
| Rate limit | In-memory por IP em `/api/*` | Doc PRD; produção atrás de proxy real |
| UI | Tailwind + componentes próprios | Inspiração TailAdmin, não fork do kit |
| Deploy | Compose + runbook VPS; CI = test → e2e → docker → SSH deploy | [deploy-vps.md](docs/desenvolvimento/deploy-vps.md) |

## Estrutura

```
lib/agent/              # Agent (sem Prisma)
src/lib/analyst/        # Console analista
src/lib/conversation/
src/lib/ticket-service/
tests/evals/            # EVAL-01..15
e2e/                    # 13 specs Playwright
```