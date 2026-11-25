# Modelo de dados

Persistência **PostgreSQL** com **Prisma**. Diagrama lógico:

```mermaid
erDiagram
  User ||--o{ Conversation : owns
  User ||--o{ Ticket : requests
  Conversation ||--o{ Message : contains
  Conversation ||--o{ AgentTrace : has
  Conversation }o--o| Ticket : highlights
  TicketDraft ||--|| User : requester
  KnowledgeArticle }o--|| : standalone

  User {
    uuid id PK
    string email UK
    string name
    enum role
    string department
  }

  Conversation {
    uuid id PK
    uuid userId FK
    enum state
    int sessionSequence
    int messageCount
    uuid assignedAnalystId FK nullable
    datetime updatedAt
  }

  Message {
    uuid id PK
    uuid conversationId FK
    enum role
    text content
    json uiBlocks nullable
    datetime createdAt
  }

  AgentTrace {
    uuid id PK
    uuid messageId FK
    text understanding
    json actions
    int confidence
    json rulesFired
    json evidence
    json rawToolCalls nullable
  }

  Ticket {
    string id PK
    uuid requesterId FK
    string title
    text description
    enum type
    enum category
    enum priority
    enum status
    enum affectedScope
    datetime openedAt
    datetime dueAt
    datetime lastUpdatedAt
  }

  TicketDraft {
    string id PK
    uuid requesterId FK
    json payload
    enum status
    datetime expiresAt
  }

  KnowledgeArticle {
    uuid id PK
    string slug UK
    string title
    text body
  }
```

`TicketDraft.payload.operation`: `create` | `update` | `reopen` (+ patch ou `ticketId` alvo). Confirmado via [02-07](02-07-contratos-api.md).

## Enums principais

| Enum | Valores |
|------|---------|
| `UserRole` | `employee`, `analyst` |
| `ConversationState` | `with_agent`, `awaiting_analyst`, `with_analyst`, `closed` |
| `MessageRole` | `user`, `assistant`, `analyst`, `system` |
| `TicketType` | `INC`, `REQ` |
| `TicketPriority` | `critical`, `high`, `medium`, `low` |
| `TicketStatus` | Ver tabela de mapeamento abaixo |

### `TicketStatus` — valor interno × rótulo UI (PT-BR)

Persistência e API usam **snake_case**; a UI exibe rótulos alinhados ao protótipo / Anexo B.

| Valor (`TicketStatus`) | Rótulo UI | Exemplo seed |
|------------------------|-----------|--------------|
| `open` | Aberto | — |
| `in_progress` | Em andamento | INC-20298 |
| `waiting_analyst` | Aguardando analista | INC-20311 |
| `approved` | Aprovado | REQ-10442 |
| `resolved` | Resolvido | INC-20150, INC-19877 |
| `in_service` | Em atendimento | INC-20311 (com analista — opcional pós-assume) |

Novos estados só entram com atualização desta tabela e dos seeds.

## Reabertura e SLA

- Operação `reopen` (ticket-service): apenas se `status === resolved` e `resolvedAt` ≤ 7 dias.
- Efeito: `status` → `open`; `lastUpdatedAt` = agora; **`dueAt` recalculado** a partir de agora com a **mesma `priority`** (nova janela de primeira resposta).
- Atualização em ticket aberto (sem reabrir): `lastUpdatedAt` atualiza; política de “reinício de SLA” em atualização significativa fica no ticket-service (MVP: **não** recalcula `dueAt` salvo reabertura ou mudança de prioridade confirmada).

## Regras de integridade

- `Ticket.id` formato `INC-#####` / `REQ-#####` gerado no confirm.
- `Conversation.messageCount` conta apenas mensagens **`role = user`** na sessão ativa; respostas do assistente, system e analista **não** incrementam. Reset ao iniciar nova sessão (nova row `Conversation` com `messageCount = 0`).
- Índice FTS em `KnowledgeArticle.title`, `body`.

## Seeds

- `prisma/seed.ts` carrega [personas-seed.md](../anexos/personas-seed.md).
- 1–2 conversas `awaiting_analyst` para demo F5.

## Acesso a dados

- **`lib/ticket-service`:** única escrita em `Ticket` / `TicketDraft` (+ `reopen`).
- **`lib/knowledge-base`:** leitura/seed `KnowledgeArticle`.
- **`lib/conversation`:** escrita em `Conversation`, `Message`, `AgentTrace`.
- **`lib/agent`:** sem Prisma; ver seção *Fronteira `lib/agent`* em [02-03-especificacao-tecnica.md](02-03-especificacao-tecnica.md).