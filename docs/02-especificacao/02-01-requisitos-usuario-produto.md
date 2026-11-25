# Requisitos de usuário e produto

## Visão do produto

O **Nexo Assist** é um assistente conversacional de service desk de TI para funcionários da Nexo (~2.000 colaboradores), que consulta chamados e central de ajuda, orienta, abre ou atualiza chamados com confirmação e encaminha analistas quando necessário — com **transparência** sobre o que o agent fez e por quê.

## Objetivos mensuráveis (PRD)

1. **Resolução sem fila** — dúvidas e consultas resolvidas no chat quando a KB responde.
2. **Chamados bem abertos** — tipo, categoria, prioridade, descrição completa, sem duplicidade.
3. **Encaminhamento certo** — humano no momento adequado, com contexto.
4. **Transparência** — ações e raciocínio auditáveis em cada resposta.

## Usuários

| Persona | Necessidade principal |
|---------|------------------------|
| Funcionário | Resolver problema de TI sem formulário; continuar conversa outro dia |
| Analista N1/N2 | Receber chamados bem qualificados; assumir conversas transferidas |

## Requisitos de produto (priorizados)

### RP-01 Autenticação corporativa simulada

- Login e-mail + senha; usuários seed; senha arbitrária aceita (PRD).
- Papéis `employee` e `analyst` no mesmo pool.

### RP-02 Chat com agent

- Mensagens em tempo real (SSE) no atendimento.
- Chips de ação + detalhe expandível (trace).
- Cards de chamado, seletor, rascunho, quick replies.
- Limite 30 mensagens/sessão com nova sessão.

### RP-03 Agent inteligente

- Decisão por mensagem: KB, tickets, regras Anexo A.
- Mastra + OpenRouter; modelo configurável.

### RP-04 Serviço de chamados simulado

- Separado do agent por fronteira de serviço.
- Indisponibilidade intermitente simulável (503).

### RP-05 Transferência e console analista

- Estados de conversa e pausa do agent.
- Console: fila, assumir, responder, devolver, encerrar.
- Analista vê trace completo; funcionário vê resumo.

### RP-06 Persistência

- Conversas, chamados, drafts e estado sobrevivem restart (PostgreSQL).

### RP-07 Execução e entrega

- Docker Compose local; documentação; `.env.example`.
- Pipeline CI/CD opcional para VPS (F5).

### RP-08 Qualidade demonstrável

- Testes em regras, APIs, E2E e evals do agent (5→15 cenários).

## Requisitos não funcionais

| ID | Requisito |
|----|-----------|
| RNF-01 | TypeScript strict |
| RNF-02 | Privacidade: tickets isolados por requester |
| RNF-03 | Chaves LLM apenas em ambiente |
| RNF-04 | Respostas eficientes; custo consciente por conversa |
| RNF-05 | UI desktop 1440px; fiel ao protótipo |
| RNF-06 | VPS modesta (~2 vCPU / 4GB); polling + SSE leves |

## Fora de produto (exclusões)

Ver [02-declaracao-escopo.md](../01-iniciacao/02-declaracao-escopo.md): SSO/LDAP, e-mail reset real, mobile, ITSM real, metering avançado de LLM.