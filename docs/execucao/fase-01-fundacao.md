# Fase 1 — Fundação

| | |
|--|--|
| **EAP** | 1.1 (pacotes 1.1.1 – 1.1.6) |
| **Marco** | M1 |
| **Docs ref.** | 0.1.9 |

## 1. Cabeçalho e objetivo da fase

**Objetivo vertical:** Repositório Next.js (TypeScript strict) + PostgreSQL via Docker Compose; autenticação demo; telas `/login` (split) e `/perfil`; layout employee; schema de conversa **sem** agent, tickets ou KB.

**Dependências:** Nenhuma (primeira fase).

**Fora de escopo (adiado):**

- `lib/ticket-service`, `lib/knowledge-base`, `lib/agent`, Mastra, OpenRouter
- SSE, chat funcional com LLM
- Console analista (`/atendente/*`)
- Tabela `AgentTrace` (migração aditiva na F3)
- `Ticket`, `KnowledgeArticle` (F2)

---

## 2. Checklist de implementação (ordem topológica)

### 2.1 Banco de dados e migrations/seeds

| Passo | WBS | Ação |
|-------|-----|------|
| 1 | 1.1.2 | Inicializar Prisma; `User` (`id`, `email` UK, `name`, `role` enum `employee`\|`analyst`, `department`) |
| 2 | 1.1.2 | `Conversation`: `userId`, `state` enum (`with_agent` default), `sessionSequence` int default 1, `messageCount` int default 0, `assignedAnalystId` nullable, `updatedAt` |
| 3 | 1.1.2 | `Message`: `conversationId`, `role` enum (`user`\|`assistant`\|`analyst`\|`system`), `content` text, `uiBlocks` Json nullable, `createdAt` |
| 4 | 1.1.2 | **Não** criar `AgentTrace`, `Ticket`, `TicketDraft`, `KnowledgeArticle` nesta fase |
| 5 | 1.1.5 | `prisma/seed.ts`: elenco mínimo — **Ana Souza** (`ana.souza@nexo.com.br`, `employee`, Financeiro), **Rafael Lima** (`rafael.lima@nexo.com.br`, `analyst`); demais usuários opcional nesta fase |
| 6 | 1.1.2 | Migration inicial: `npx prisma migrate dev --name init_foundation` |

**Nota F1→F3:** Campos de `Conversation`/`Message` devem coincidir com [02-06-modelo-dados.md](../02-especificacao/02-06-modelo-dados.md) para evitar refactor na F3.

### 2.2 Domínio e serviços

| Passo | WBS | Ação |
|-------|-----|------|
| 7 | 1.1.3 | `lib/db.ts` — singleton Prisma (usado por rotas e, na F2+, `ticket-service`) |
| 8 | 1.1.3 | `lib/auth/` — sessão cookie httpOnly (`SESSION_SECRET`); helper `getSession()` / `requireRole()` |
| 9 | — | **Não** criar `lib/agent` com lógica; opcional pasta vazia com `.gitkeep` (preparação F2 boundary) |

### 2.3 Contratos de API e SSE/polling

| Passo | WBS | Ação |
|-------|-----|------|
| 10 | 1.1.3 | `POST /api/auth/login` — body `{ email, password }`; qualquer senha para seed; **200** + Set-Cookie; **401** e-mail desconhecido |
| 11 | 1.1.3 | `POST /api/auth/logout` — **204** |
| 12 | 1.1.3 | Middleware: `(employee)` → exige `employee`; `(analyst)` → exige `analyst`; redirect `/login` |
| 13 | — | Após login: `employee` → `/atendimento` (página stub “Em breve” ou layout vazio); `analyst` → `/atendente/conversas` (stub) |

Sem SSE nesta fase.

### 2.4 Interface e componentes UI

| Passo | WBS | Ação |
|-------|-----|------|
| 14 | 1.1.1 | Integrar **TailAdmin OSS** + Tailwind; tokens alinhados ao protótipo |
| 15 | 1.1.4 | Rota `/login` — layout split (painel escuro + formulário); viewport desktop 1440px; [protótipo-mapeamento](../anexos/protótipo-mapeamento.md) |
| 16 | 1.1.4 | `app/(employee)/` — layout sidebar **232px**, nav Atendimento / Meu perfil (Meu perfil ativo na F1) |
| 17 | 1.1.5 | `/perfil` — nome, e-mail “Gerenciado pela TI”; botão Redefinir senha (somente UI) |
| 18 | 1.1.4 | Estados: loading no submit login; erro 401 amigável |

### 2.5 Variáveis de ambiente e infra

| Passo | WBS | Ação |
|-------|-----|------|
| 19 | 1.1.1 | `docker-compose.yml`: serviços `app`, `db` (postgres:16), volume `pgdata`, rede interna |
| 20 | 1.1.1 | `Dockerfile` dev/prod; `package.json` scripts: `dev`, `build`, `test` |
| 21 | 1.1.6 | Criar **`.env.example` F1** (primeira fatia): `DATABASE_URL`, `SESSION_SECRET` — ver [02-09](../02-especificacao/02-09-variaveis-ambiente.md) |
| 22 | 1.1.1 | `tsconfig.json`: `"strict": true` |

---

## 3. Regras de arquitetura e restrições críticas

- PRD: senha qualquer para usuários seed — não implementar hash real nesta fase.
- Privacidade: rotas futuras devem assumir `userId` da sessão (preparar helpers).
- **Proibido** nesta fase: Mastra, chamadas OpenRouter, import de ticket-service.
- Cookie seguro: `httpOnly`, `sameSite=lax`; em produção `secure=true`.

---

## 4. Checklist de testes obrigatórios da fase

| ID | Fase de escrita | Assert esperado |
|----|-----------------|-----------------|
| **E2E-LOGIN** | F1 (Playwright) | `ana.souza@nexo.com.br` + qualquer senha → redireciona `/atendimento` ou layout autenticado; acessa `/perfil` |
| **INT-CONV-01** | Preparação F1 / conclusão F3 | F1: opcional teste manual de persistência — criar `Conversation`+`Message` via script; F3 valida restart |

---

## 5. Definition of Done

### Comandos

```bash
cp .env.example .env
# preencher SESSION_SECRET
docker compose up -d db
npx prisma migrate dev
npx prisma db seed
npm run build
npm run test          # E2E-LOGIN se configurado
docker compose up --build
```

### Verificação manual

1. Abrir `http://localhost:3000/login`
2. Entrar como `ana.souza@nexo.com.br`
3. Abrir `/perfil` — dados Ana corretos
4. Entrar como `rafael.lima@nexo.com.br` — redirect stub analista
5. Logout — volta ao login

### Documentação

- Atualizar **README raiz**: seção “Fase 1 (M1)” com comandos acima
- Desvio técnico → tabela em [04-03-as-built.md](../04-registro-mudanca/04-03-as-built.md) (se houver)