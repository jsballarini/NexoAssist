# Deploy em VPS (runbook)

**Atualizado:** 2026-11-24  
**Versão app:** `0.7.1-m7.1`  
**URL pública:** _TBD_ (preencher após primeiro deploy)

Guia operacional para **E-11** / AC-1. O pipeline [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) inclui job `deploy` via SSH — o script remoto deve espelhar os passos abaixo.

## Pré-requisitos na VPS

- Linux (Ubuntu 22.04+ recomendado), ~2 vCPU / 4 GB RAM
- Docker Engine + Docker Compose v2
- Porta **3000** (app) e **5432** apenas em rede interna (não expor Postgres)
- Secrets **nunca** no repositório

## Variáveis obrigatórias (produção)

| Variável | Descrição |
|----------|-----------|
| `DATABASE_URL` | PostgreSQL (usuário dedicado, senha forte) |
| `SESSION_SECRET` | ≥ 32 caracteres aleatórios |
| `OPENROUTER_API_KEY` | Se `AGENT_EVAL_FIXTURES=false` |
| `OPENROUTER_MODEL` | ex. `openai/gpt-4o-mini` |
| `AGENT_EVAL_FIXTURES` | `false` em demo com LLM real |
| `PROXY_API_RATE_LIMIT_PER_MIN` | ex. `120` atrás de reverse proxy |
| `TICKET_CHAOS_RATE` | `0` em produção |

Catálogo completo: [02-09](../02-especificacao/02-09-variaveis-ambiente.md), espelho em [`.env.example`](../../.env.example).

## Procedimento (primeira instalação)

```bash
# Na VPS
git clone <url-do-repositorio> nexo-assist
cd nexo-assist
cp .env.example .env
# Editar .env com valores de produção

docker compose up -d db
# Aguardar healthcheck do Postgres
docker compose run --rm app npx prisma migrate deploy
docker compose run --rm app npx prisma db seed

docker compose up -d --build app
curl -f http://127.0.0.1:3000/login || exit 1
```

## Atualização (release)

```bash
cd nexo-assist
git fetch && git checkout <tag-ou-main>
docker compose build app
docker compose run --rm app npx prisma migrate deploy
docker compose up -d app
```

## Rollback

```bash
git checkout <tag-anterior>
docker compose build app
docker compose up -d app
# Se migration irreversível: restaurar backup PG antes do checkout
```

## CI/CD (GitHub Actions)

Secrets no repositório GitHub:

| Secret | Uso |
|--------|-----|
| `DEPLOY_HOST` | IP ou hostname da VPS |
| `DEPLOY_USER` | Usuário SSH |
| `DEPLOY_KEY` | Chave privada (sem passphrase no CI) |
| `DEPLOY_PATH` | Diretório do clone na VPS (ex. `/home/deploy/nexo-assist`) |

O job `deploy` em [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) executa a seção **Atualização** via SSH (`cd $DEPLOY_PATH`, `git pull`, `docker compose build`, `migrate deploy`, `up -d`). Só roda em `push` para `main` quando `DEPLOY_HOST` está configurado.

## Reverse proxy (recomendado)

Terminar TLS em Nginx/Caddy na frente de `app:3000`; repassar `X-Forwarded-For` para rate limit do [middleware](../../src/middleware.ts).

## Verificação pós-deploy

```bash
npx prisma migrate status   # no container ou host com DATABASE_URL
curl -I https://<dominio>/login
```

Demonstração manual: login `ana.souza@nexo.com.br` e `rafael.lima@nexo.com.br` (seed).

## Referências

- [04-03-as-built.md](../04-registro-mudanca/04-03-as-built.md) §4
- [GAPS.md](../desafio/GAPS.md) — G-E11, G-OPS-01