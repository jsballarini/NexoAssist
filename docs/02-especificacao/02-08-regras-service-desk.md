# Regras do service desk (Anexo A operacionalizado)

Normas que o agent e o `ticket-service` devem aplicar. Baseline: PRD Anexo A.

## Tipos e categorias

| Tipo | Código | Quando usar |
|------|--------|-------------|
| Incidente | `INC` | Algo parou ou não funciona |
| Requisição | `REQ` | Pedido de acesso, equipamento, software |

**Categorias:** `Acesso`, `Rede e VPN`, `Hardware`, `Software`, `E-mail`, `Outros`.

## Campos obrigatórios na abertura

Todo chamado criado (após confirmação do usuário) exige: `title`, `description`, `type`, `category`, `priority`, `affectedScope` (quem é afetado).

## Prioridade e SLA (primeira resposta)

Impacto × urgência; relógio conforme [02-03](02-03-especificacao-tecnica.md) (`BusinessHoursClock`).

| Prioridade | Critério típico | Prazo |
|------------|----------------|-------|
| Crítica | Equipe ou empresa parada | **1 hora** (24/7) |
| Alta | Impede uma pessoa ou compromisso no mesmo dia | **4 horas úteis** |
| Média | Atrapalha com alternativa | **3 dias úteis** |
| Baixa | Melhorias sem urgência | **5 dias úteis** |

**Expediente útil:** seg–sex 8h–18h `America/Sao_Paulo`, exceto prioridade Crítica.

**Vencido:** `now > dueAt` sem atualização que reinicie SLA de primeira resposta conforme política do ticket-service.

## Duplicidade e reabertura

1. Antes de `create`, o agent chama `list_open_tickets` e, quando relevante, lista recentes **resolvidos** (≤ 7 dias) via `list_recent_resolved` ou filtro no client.
2. Se existe **aberto** sobre o mesmo problema → **atualizar** (com confirmação), não criar ID novo.
3. Se só existe **resolvido há ≤ 7 dias** sobre o mesmo problema → **reabrir** mesmo ID (`reopen_ticket`), com confirmação; **não** gerar INC/REQ novo.
4. Resolvido há **> 7 dias** → tratar como novo chamado (fluxo draft + create).

### SLA na reabertura

| Ação | `dueAt` | `status` |
|------|---------|----------|
| Reabertura (`reopen`) | Recalculado **agora** + SLA da `priority` atual | `open` |
| Update em aberto (complemento) | Mantém `dueAt` (MVP), salvo mudança de prioridade confirmada | inalterado ou conforme patch |
| Nova abertura após confirm draft | Calculado na confirmação | `open` / conforme tipo |

## Confirmação obrigatória

- Criar ou atualizar chamado em produção só após `confirm_draft`.
- UI exibe card rascunho (ex.: `D-381`) com Confirmar / Editar / Cancelar.

## Transferência para analista

Transferir quando **qualquer** condição:

| Gatilho | Tipo |
|---------|------|
| Funcionário pede explicitamente | Regra + intent |
| Prioridade Crítica | Determinística |
| Chamado consultado está vencido e usuário aceita analista | Determinística + UI |
| Agent `confidence` abaixo de `AGENT_CONFIDENCE_TRANSFER_OFFER` (default 50) | Híbrida |
| Agent `confidence` abaixo de `AGENT_CONFIDENCE_TRANSFER_STRONG` (default 35) ao propor mutação | Híbrida — recomendar/obrigar transferência antes de criar |
| Fora do escopo de TI | Determinística — redirecionar, sem ticket |

Efeito: conversa `awaiting_analyst` ou `with_analyst`; **agent não gera respostas** até devolução ou encerramento.

## Privacidade

- Consulta/mutação de ticket só se `ticket.requesterId === session.userId`.
- Tools do agent recebem `userId` do contexto autenticado; ticket-service rejeita cross-user (403).

## Escopo

- Assuntos **somente TI**. RH, financeiro, facilities → mensagem de redirecionamento, sem chamado.

## Convenção de confidence

Em todo o sistema (persistência, APIs, UI, evals e limiares ENV), **`confidence` é um inteiro de 0 a 100** (percentual). Não usar escala `0.0–1.0` em contratos ou banco.

| Regra | Detalhe |
|-------|---------|
| Saída do LLM | O agent normaliza na camada de parse: se o modelo devolver fração (`0.72`), multiplicar por 100 e arredondar; se devolver `72`, validar intervalo |
| Persistência | Coluna/tipo inteiro (`0…100`) em `AgentTrace` |
| Limiares ENV | Mesma unidade: `50` e `35` significam 50% e 35% |
| UI | Exibir com sufixo `%` opcional (ex.: `41%` no protótipo analista) |

## Matriz de confiança (híbrida)

| Sinal | Origem | Uso |
|-------|--------|-----|
| `rules_fired[]` | Engine determinística | Chips + trace |
| `confidence` | JSON estruturado do LLM | Trace + transferência |
| `evidence[]` | IDs de artigos/tickets citados | Trace expand |

Limiares de confidence: ver catálogo [02-09-variaveis-ambiente.md](02-09-variaveis-ambiente.md) (`AGENT_CONFIDENCE_TRANSFER_OFFER`, `AGENT_CONFIDENCE_TRANSFER_STRONG`).

## Limite de sessão

- Máximo **30 mensagens** por sessão (contagem user + agent + system na thread ativa).
- Ao atingir: composer bloqueado; ação **Nova sessão** — arquiva thread, inicia `sessionSequence + 1`.