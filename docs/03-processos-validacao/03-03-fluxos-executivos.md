# Fluxos executivos

## FE-01 — Abrir chamado (VPN)

```mermaid
sequenceDiagram
  participant F as Funcionario
  participant UI as ChatUI
  participant API as API
  participant Agent as Mastra
  participant TC as TicketClient
  participant KB as KnowledgeBase
  participant TS as TicketService

  F->>UI: Mensagem problema VPN
  UI->>API: POST message + SSE
  API->>Agent: turn
  Agent->>TC: listOpen
  TC->>TS: listOpen
  Agent->>KB: search
  Agent-->>UI: Pergunta afetados
  F->>UI: Só eu + reunião 14h
  Agent->>TC: createDraft
  TC->>TS: createDraft
  Agent-->>UI: Card rascunho
  F->>UI: Confirmar
  UI->>API: POST tickets/drafts/confirm
  API->>TS: confirmDraft
  TS-->>UI: INC criado
```

## FE-02 — Consultar vencido e transferir

```mermaid
sequenceDiagram
  participant F as Funcionario
  participant UI as ChatUI
  participant API as API
  participant Agent as Mastra
  participant TC as TicketClient
  participant TS as TicketService
  participant Conv as ConversationModule

  F->>UI: Status chamado?
  UI->>API: POST message
  API->>Agent: turn
  Agent->>TC: listOpen
  TC->>TS: listOpen
  Agent-->>UI: Seletor INC-20311
  F->>UI: INC-20311
  Agent->>TC: getById
  TC->>TS: get + SLA
  Agent-->>UI: Card vencido + quick replies
  F->>UI: Falar com analista
  API->>Conv: transfer
  Note over F: state awaiting_analyst
```

## FE-03 — Analista assumir e devolver

```mermaid
sequenceDiagram
  participant A as Analista
  participant UI as Console
  participant API as API
  participant F as Funcionario

  loop poll 3s
    UI->>API: GET inbox
  end
  A->>UI: Assumir
  UI->>API: POST assume
  API-->>UI: with_analyst
  UI->>API: GET inbox immediately
  A->>UI: Mensagem
  UI->>API: POST message analyst
  A->>UI: Devolver ao agent
  UI->>API: POST return
  API-->>F: nota sistema
  Note over F: state with_agent
```

## FE-04 — Falha legado 503

```mermaid
sequenceDiagram
  participant Agent as Mastra
  participant Client as TicketClient
  participant TS as TicketService

  Agent->>Client: listOpen
  Client->>TS: call
  TS-->>Client: 503
  Client->>Client: backoff retry
  TS-->>Client: 200 or fail
  Client-->>Agent: result or error
  Agent-->>Funcionario: mensagem indisponibilidade
```

## FE-05 — Nova sessão 30 mensagens

1. Contador atinge 30 na conversa ativa.  
2. Composer desabilitado; banner explicativo.  
3. Usuário clica **Nova sessão**.  
4. Sistema cria conversa nova `sessionSequence+1`; anterior somente leitura.  

## FE-06 — Deploy CI/CD (F5)

1. Push main → GitHub Actions.  
2. Unit + integration + evals.  
3. Build image Docker.  
4. SSH VPS → pull → compose up → healthcheck.  
5. Rollback: tag imagem anterior documentado no README.