# Catálogo canônico de variáveis de ambiente

Fonte única para o `.env.example` e para referências em `02-03`, `02-07` e `02-08`. Valores **default** são os usados na implementação se a variável estiver ausente.

| ENV | Default | Módulo | Descrição |
|-----|---------|--------|-----------|
| `DATABASE_URL` | — | Prisma | Connection string PostgreSQL |
| `OPENROUTER_API_KEY` | — | Agent | Chave API (obrigatória em runtime) |
| `OPENROUTER_MODEL` | — | Agent | Modelo no OpenRouter (sem default fixo no código); precisa suportar **tool calling** — recomendado `openai/gpt-4o-mini` |
| `OPENROUTER_BASE_URL` | `https://openrouter.ai/api/v1` | Agent | Base da API (sem barra final); endpoint `POST …/chat/completions` |
| `AGENT_HISTORY_MAX_MESSAGES` | `20` | Agent | Últimas N mensagens da conversa enviadas ao modelo |
| `AGENT_MAX_STEPS` | `5` | Agent | Máx. de passos de tool calling por turno |
| `AGENT_MAX_OUTPUT_TOKENS` | `1024` | Agent | Tokens máximos de saída por passo |
| `AGENT_LLM_TIMEOUT_MS` | `45000` | Agent | Timeout da chamada ao LLM; ao estourar, responde "assistente indisponível" |
| `LLM_MAX_CONCURRENCY` | `2` | Agent / API | Máx. inferências LLM simultâneas (VPS) |
| `AGENT_CONFIDENCE_TRANSFER_OFFER` | `50` | Regras / Agent | Inteiro 0–100; oferecer analista |
| `AGENT_CONFIDENCE_TRANSFER_STRONG` | `35` | Regras / Agent | Inteiro 0–100; evitar mutação sem humano |
| `EVAL_USE_LLM` | ausente | Testes | Definido por `npm run test:evals:llm`; roda a matriz de frases com o modelo real (exige `OPENROUTER_API_KEY`) |
| `EVAL_LLM_MIN_ACCURACY` | `0.7` | Testes | Piso de acurácia global (0–1) do eval com LLM |
| `TICKET_CHAOS_RATE` | `0.03` | ticket-service | Probabilidade 0–1 de 503 simulado por chamada |
| `TICKET_RETRY_ATTEMPTS` | `3` | Agent / ticket-service | Tentativas por chamada ao legado nos adapters do agent (inclui a primeira) |
| `TICKET_RETRY_BACKOFF_MS` | `1000,2000,4000` | Agent / ticket-service | Esperas entre tentativas (lista em ms; o último valor se repete) |
| `TICKET_RETRY_TURN_BUDGET_MS` | `6000` | Agent / ticket-service | Teto de espera acumulada de retries por turno; ao estourar, devolve `TICKET_LEGACY_UNAVAILABLE` |
| `CHAOS_ENDPOINT_ENABLED` | `false` | API dev | Habilita `POST /api/dev/chaos/ticket-outage` |
| `TEST_USE_WALL_CLOCK` | `false` | domain/clock | Relógio fixo injetável nos testes |
| `ANALYST_POLL_INTERVAL_MS` | `3000` | UI analista | Inbox com aba visível |
| `ANALYST_POLL_BACKGROUND_MS` | `10000` | UI analista | Inbox com aba em background |
| `ANALYST_THREAD_POLL_MS` | `2000` | UI analista | Mensagens da thread selecionada |
| `PROXY_API_RATE_LIMIT_PER_MIN` | `60` | Proxy / edge | Req/min/IP em rotas `/api/*` (produção) |
| `SESSION_SECRET` | — | Auth | Segredo de cookie de sessão |
| `AGENT_EVAL_FIXTURES` | `false` (prod) | Agent / testes | `true` ativa o agent determinístico de fixtures (Vitest, Playwright E2E). Único gatilho: sem ele o agent sempre usa Mastra + OpenRouter |

## Somente testes E2E (opcional)

Não entram no `.env` diário; usadas pelo `playwright.config.ts`.

| ENV | Default | Descrição |
|-----|---------|-----------|
| `PLAYWRIGHT_PORT` | `3099` | Porta do `next dev` levantado pelo `webServer` |
| `PLAYWRIGHT_BASE_URL` | `http://127.0.0.1:3099` | `baseURL` do Playwright |
| `PLAYWRIGHT_REUSE_SERVER` | ausente | `1` reutiliza servidor já em execução (alinhar URL/porta) |

## Bloco `.env.example` (copiar)

```env
DATABASE_URL=postgresql://nexo:nexo@localhost:5432/nexo
OPENROUTER_API_KEY=
OPENROUTER_MODEL=openai/gpt-4o-mini
OPENROUTER_BASE_URL=
AGENT_HISTORY_MAX_MESSAGES=20
AGENT_MAX_STEPS=5
AGENT_MAX_OUTPUT_TOKENS=1024
AGENT_LLM_TIMEOUT_MS=45000
SESSION_SECRET=
LLM_MAX_CONCURRENCY=2
AGENT_CONFIDENCE_TRANSFER_OFFER=50
AGENT_CONFIDENCE_TRANSFER_STRONG=35
TICKET_CHAOS_RATE=0.03
TICKET_RETRY_ATTEMPTS=3
TICKET_RETRY_BACKOFF_MS=1000,2000,4000
TICKET_RETRY_TURN_BUDGET_MS=6000
CHAOS_ENDPOINT_ENABLED=false
TEST_USE_WALL_CLOCK=false
ANALYST_POLL_INTERVAL_MS=3000
ANALYST_POLL_BACKGROUND_MS=10000
ANALYST_THREAD_POLL_MS=2000
PROXY_API_RATE_LIMIT_PER_MIN=60
```

## Referências cruzadas

| Documento | Uso |
|-----------|-----|
| [02-03-especificacao-tecnica.md](02-03-especificacao-tecnica.md) | Arquitetura, chaos, concorrência |
| [02-07-contratos-api.md](02-07-contratos-api.md) | Polling analista, chaos endpoint |
| [02-08-regras-service-desk.md](02-08-regras-service-desk.md) | Limiares de confidence |