# Ambiente local e comandos

## Pré-requisitos

- Node.js 20+
- npm
- Docker Desktop (PostgreSQL 16)

## Variáveis de ambiente (M1 + M2)

Catálogo completo: [02-09](../02-especificacao/02-09-variaveis-ambiente.md). Valores de exemplo no [`.env.example`](../../.env.example):

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `DATABASE_URL` | Sim | `postgresql://nexo:nexo@localhost:5432/nexo` |
| `SESSION_SECRET` | Produção | ≥ 32 caracteres; `.env.example` traz valor de dev |
| `TICKET_CHAOS_RATE` | Não | 0–1; default dev `0`; Vitest força `0` globalmente |
| `CHAOS_ENDPOINT_ENABLED` | Não | `false` na F2 (endpoint dev opcional) |
| `TEST_USE_WALL_CLOCK` | Não | `true` para clock fixo em testes SLA |
| `TEST_CLOCK_ISO` | Não | ISO usado quando `TEST_USE_WALL_CLOCK=true` |

```bash
cp .env.example .env
```

### Troubleshooting: `iron-session: Missing password`

Ocorre se `SESSION_SECRET` estiver **vazio** no `.env` (`SESSION_SECRET=`). Soluções:

1. Copiar o valor de exemplo do `.env.example`, ou
2. Gerar: `openssl rand -base64 32`

No código atual, **development** usa fallback automático quando o segredo está ausente ou curto; **produção** exige segredo válido.

## Fluxo local (recomendado)

### Primeira vez ou banco zerado

```bash
cp .env.example .env
docker compose up -d db
npx prisma migrate deploy
npx prisma db seed
npm run dev
```

Use **`migrate deploy`** para aplicar as migrations já versionadas no repo, sem prompts interativos.

### Dia a dia (DB já migrado)

```bash
docker compose up -d db   # se o Postgres não estiver rodando
npm run dev
```

Opcional: `npx prisma db seed` se quiser repopular dados demo.

### Alterou `schema.prisma` (desenvolvimento)

```bash
npx prisma migrate dev --name descricao_da_mudanca
npx prisma db seed        # se o seed depender dos novos modelos
```

Só use **`migrate dev`** quando houve mudança no schema. Se `migrate status` já mostrar *Database schema is up to date*, **não** rode `migrate dev` de novo no fluxo de boot.

## Comandos (referência)

| Ação | Comando |
|------|---------|
| Subir apenas DB | `docker compose up -d db` |
| Status das migrations | `npx prisma migrate status` |
| Aplicar migrations (setup / CI) | `npx prisma migrate deploy` |
| Nova migration (schema alterado) | `npx prisma migrate dev --name ...` |
| Seed | `npx prisma db seed` |
| Dev server | `npm run dev` → http://localhost:3000 |
| Servidor E2E (Playwright) | `npm run test:e2e` sobe `next dev` em http://127.0.0.1:3099 |
| Build | `npm run build` |
| Testes completos | `npm run test` (Vitest + Playwright) |
| Só unit/int | `npm run test:unit` |
| Só E2E | `npm run test:e2e` |
| Chromium (1ª vez E2E) | `npm run prepare:e2e` |
| App + DB Docker | `docker compose up --build` (definir `SESSION_SECRET` no host) |

### Troubleshooting: Prisma quer dropar `search_vector`

Ao rodar `migrate dev` sem mudança no schema, o Prisma pode propor remover a coluna `search_vector` de `KnowledgeArticle` (FTS criada em SQL na migration `add_tickets_kb`, fora do `schema.prisma`).

**Resposta:** **N** (não confirme).

Isso preserva a busca KB (`GET /api/kb/search?q=809`). Confira com `npx prisma migrate status`; se estiver em dia, pule `migrate dev` e siga com `db seed` / `npm run dev`.

### Troubleshooting: `migrate dev` pede nome de migration / trava

Cancelar com **Ctrl+C** ou **N**. O comando é interativo; prefira `migrate deploy` quando o schema no disco já corresponde às migrations do repo.

## Credenciais e dados demo

- Qualquer senha para usuários seed (PRD).
- Elenco e chamados futuros: [personas-seed.md](../anexos/personas-seed.md).
- **M2:** elenco completo [personas-seed.md](../anexos/personas-seed.md), tickets INC/REQ e 8 artigos KB.

## Playwright (E2E)

### Primeira vez

```bash
npm run prepare:e2e    # equivalente a: playwright install chromium
```

### Fluxo recomendado

```bash
docker compose up -d db
npx prisma migrate deploy
npx prisma db seed
npm run test:e2e      # ou npm run test (Vitest + Playwright)
```

O `webServer` **não** aplica migrations nem seed automaticamente.

### Estabilidade E2E (M3 / 0.3.1)

| Config | Valor |
|--------|--------|
| Host / porta | `127.0.0.1:3099` (não compete com `npm run dev` na 3000) |
| `workers` | `1` |
| `webServer.timeout` | `180s` (compilação inicial do Next) |
| Env do servidor de teste | `.env` carregado + `AGENT_EVAL_FIXTURES=true`, `TICKET_CHAOS_RATE=0` |

Variáveis opcionais: `PLAYWRIGHT_PORT`, `PLAYWRIGHT_BASE_URL`, `PLAYWRIGHT_REUSE_SERVER=1` (só reutilizar servidor já atualizado; alinhar `PLAYWRIGHT_BASE_URL` à porta real).

### Troubleshooting E2E

**Login fica em `/login` ou API 401/500**

- Causa comum: Playwright reutilizar um `next dev` antigo na 3000. O padrão atual **não** reutiliza; deixe o E2E subir o servidor em 3099.
- Confirme seed: `npx prisma db seed` (usuário `ana.souza@nexo.com.br`).

**Assistente não responde no E2E-STATUS (mensagem enviada, sem INC-20311)**

- Corrida SSE mitigada no cliente (`open` antes do POST). Se falhar, veja trace em `test-results/` e logs do `webServer` na 3099.

**`Timed out waiting for webServer` com porta 3000 em uso**

- Não defina `CI=1` esperando 3000 se outro processo já ocupa a porta. Use o fluxo padrão (`test:e2e` → 3099) ou `PLAYWRIGHT_PORT` explícito.

Na **F4**, manter `workers: 1` e considerar gate isolado para **E2E-CHAOS**.