# Especificação funcional

## Estados da conversa

| Estado | Descrição | Agent responde? | Composer funcionário |
|--------|-----------|-----------------|----------------------|
| `with_agent` | Atendimento pelo Nexo Assist | Sim | Ativo (se &lt; 30 msgs) |
| `awaiting_analyst` | Na fila humana | Não | **Bloqueado** |
| `with_analyst` | Analista assumiu | Não | **Bloqueado** |
| `closed` | Encerrada | Não | Bloqueado |

Transições: `with_agent` → `awaiting_analyst` (transferência); `awaiting_analyst` → `with_analyst` (assume); `with_analyst` → `with_agent` (devolver) ou `closed` (encerrar).

Enquanto a conversa estiver em `awaiting_analyst` ou `with_analyst`, o funcionário **não envia** mensagens: o composer fica desabilitado na UI e `POST /api/conversations/active/messages` retorna **423** com códigos `CONVERSATION_AWAITING_ANALYST` ou `CONVERSATION_WITH_ANALYST`. O envio pelo employee volta após **devolução** ao Nexo (`with_agent`). Decisão formal: [04-02 §0.3.3](../04-registro-mudanca/04-02-registro-mudancas.md).

## Tela: Login (`/login`)

- Layout split: painel escuro (story + preview chat) + formulário claro.
- Campos: e-mail corporativo, senha, “Manter conectado”.
- Link suporte ramal 4000 (estático).
- **Entrar:** autentica e redireciona por `role`.
- Loading e erro em falha de rede.

## Tela: Atendimento (`/atendimento`)

### Estrutura

- Sidebar nav; breadcrumb; indicador “Assistente online”.
- Lista de mensagens: usuário (direita), agent (esquerda), system (centro), analyst (identificado quando F5).

### Mensagem do agent

1. **Status line** — chips: ex. `consultou seus chamados`, `classificou a prioridade`.
2. **Bolha** — texto markdown leve; quick replies quando aplicável.
3. **Card embutido** — seletor tickets, detalhe, ou rascunho.

### Expandir trace (funcionário)

- Campos: `understanding`, `actions[]`, `confidence` (inteiro 0–100), `rulesFired[]`, `evidence[]` (artigos/ticket ids).
- Leitura em linguagem natural; JSON opcional em “detalhes técnicos” colapsado.

### Cards

| Card | Conteúdo | Ações |
|------|----------|-------|
| Seletor | Lista INC/REQ abertos com status e data | Clique envia mensagem com ID |
| Detalhe | Título, descrição, categoria, prioridade, abertura, última atualização, badge vencido | Quick replies analista/info/obrigado |
| Rascunho | D-###, campos Anexo A, SLA calculado | Confirmar, Editar, Cancelar |

### Composer

- Placeholder “Escreva para o Nexo…”.
- Contador `N/30 mensagens nesta sessão`.
- Ao **30**: bloqueio + CTA nova sessão; threads antigas acessíveis em lista lateral ou dropdown “Histórico”.

### Streaming

- Indicador “digitando…” durante SSE.
- Erro SSE: mensagem retentar.

## Tela: Meu perfil (`/perfil`)

- Nome, e-mail (badge “Gerenciado pela TI”).
- Bloco senha: “Alterada há N dias”; botão Redefinir — **somente UI** (exclusão: e-mail real não enviado).

## Console analista (`/atendente/conversas`)

### Lista

- Busca por texto.
- Filtros: Todas | Precisam de você | Com o agent | Minhas.
- Item: avatar, nome, preview, hora, badge não lida, tag de estado.

### Conversa

- Header: funcionário, área, ticket vinculado, badge modo.
- Mensagens: distingue Nexo Assist IA, funcionário, analista, system.
- **Aguardando:** takeover bar — Devolver desabilitado; **Assumir** primário; composer bloqueado até assumir.
- **Atendendo:** Devolver, Encerrar; composer ativo.

### Painel chamados (340px)

- Contagem abertos/fechados.
- Destaque “desta conversa”.
- Lista outros chamados do funcionário.

### Trace analista

- Aba ou painel: log completo por mensagem do agent (todas as tools, latências, confidence).

### Atualização

- Polling conforme [02-07-contratos-api.md](02-07-contratos-api.md); fetch imediato após assume/devolver/encerrar.

## Comportamentos transversais

### Classificação de prioridade

- Agent pergunta impacto (quick replies: só eu, equipe, empresa, não sei).
- Urgência inferida de linguagem (reunião hoje, parado, etc.).
- Engine valida combinação; exibe prazo na UI.

### Confirmação de mutação

- Nenhum `create`/`update` ticket sem confirmação explícita pós-rascunho.

### Carregamento e erro

- Skeleton em listas; spinner no envio; toast em 503 ticket-service.

### Privacidade

- Funcionário A não vê tickets de B em tools, APIs ou UI.

## Fase x funcionalidade

| Funcionalidade | F1 | F2 | F3 | F4 | F5 |
|----------------|----|----|----|----|-----|
| Login/perfil | ✓ | | | | |
| Ticket API + KB | | ✓ | | | |
| Chat leitura + trace | | | ✓ | | |
| Draft/mutação/transfer | | | | ✓ | |
| Console analista | | | | | ✓ |
