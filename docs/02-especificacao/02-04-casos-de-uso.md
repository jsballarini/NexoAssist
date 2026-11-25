# Casos de uso

Atores: **Funcionário**, **Analista**, **Nexo Assist (agent)**, **Ticket Service**, **Sistema de autenticação**.

## UC-01 Entrar no sistema

- **Ator:** Funcionário ou Analista  
- **Fluxo:** Acessa `/login` → informa e-mail → redireciona por papel (`/atendimento` ou `/atendente/conversas`).  
- **Exceção:** E-mail desconhecido → erro amigável.  
- **Fase:** F1  

## UC-02 Conversar com o Nexo Assist (consulta)

- **Pré:** Autenticado como funcionário; sessão &lt; 30 msgs.  
- **Fluxo:** Envia mensagem → SSE stream → agent consulta tickets via client → responde com seletor ou card.  
- **Pós:** Mensagem e `AgentTrace` persistidos.  
- **Fase:** F3  

## UC-03 Resolver dúvida via KB

- **Fluxo:** Agent `search_kb` → responde com trecho relevante; chips “buscou na central de ajuda”.  
- **Fase:** F3  

## UC-04 Abrir chamado com confirmação

- **Fluxo:** Coleta afetados/urgência → classifica prioridade → `create_draft` → card rascunho → usuário Confirma → `confirm_draft` → INC/REQ criado.  
- **Alt:** Cancelar descarta draft; Editar permite ajuste textual.  
- **Fase:** F4  

## UC-05 Detectar duplicidade, atualizar ou reabrir

- **Fluxo principal (aberto):** `list_open_tickets` → mesmo problema → rascunho de **atualização** → confirmação → `update_ticket`.  
- **Fluxo reabertura:** `list_recent_resolved` (≤ 7d) → match → rascunho de **reabertura** → confirmação → `reopen_ticket` (mesmo ID; `dueAt` recalculado).  
- **Fluxo novo:** sem match aberto/recente → `create_draft` → confirm → novo INC/REQ.  
- **Fase:** F4  

## UC-06 Consultar chamado vencido e ofertar analista

- **Fluxo:** Card mostra “prazo vencido” → quick replies incluem “Falar com analista”.  
- **Fase:** F3–F4  

## UC-07 Transferir para analista

- **Gatilhos:** Pedido usuário, crítico, vencido+aceite, baixa confidence, política determinística.  
- **Fluxo:** `transfer_conversation` → estado `awaiting_analyst` → agent não responde.  
- **Fase:** F4–F5  

## UC-08 Assumir atendimento (analista)

- **Fluxo:** POST assume → `with_analyst` → composer ativo → mensagens `role=analyst`.  
- **Exc:** 409 outro analista.  
- **Fase:** F5  

## UC-09 Devolver ao agent

- **Fluxo:** POST return-to-agent → nota sistema → `with_agent` → SSE do funcionário pode retomar.  
- **Fase:** F5  

## UC-10 Encerrar conversa

- **Ator:** Analista  
- **Fluxo:** POST close → `closed`.  
- **Fase:** F5  

## UC-11 Nova sessão após limite

- **Fluxo:** 30ª mensagem bloqueia composer → “Nova sessão” → nova thread, histórico anterior somente leitura.  
- **Fase:** F4  

## UC-12 Falha do legado (503)

- **Fluxo:** Ticket-service retorna 503 → client backoff → agent informa indisponibilidade temporária; UI loading/erro.  
- **Fase:** F2+  

## UC-13 Assunto fora de TI

- **Fluxo:** Regra determinística → redirecionamento RH/financeiro/facilities; sem ticket.  
- **Fase:** F4  