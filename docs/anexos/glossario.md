# Glossário

Termos em português com equivalentes ou notas em inglês usados na documentação do Nexo Assist.

| Termo (PT) | Termo (EN) | Definição |
|------------|------------|-----------|
| Agent | Agent | Componente de IA que decide ações a cada mensagem do usuário (Mastra). |
| Analista | Analyst | Usuário N1/N2 do service desk no console de conversas. |
| Central de ajuda | Knowledge base (KB) | Artigos curtos de autoatendimento pesquisáveis pelo agent. |
| Chamado | Ticket | Registro INC/REQ no sistema simulado de chamados. |
| Chip de ação | Action chip | Resumo visual acima da bolha do agent (“consultou seus chamados”). |
| Confiança | Confidence | Inteiro **0–100** (percentual único no sistema); auto-relatado pelo LLM; limiares ENV na mesma escala. |
| Console do analista | Analyst console | Interface de fila, conversa e painel de chamados (telas 4–5). |
| Dedup / duplicidade | Deduplication | Evitar abrir chamado duplicado para o mesmo problema. |
| Draft / rascunho | Draft | Chamado proposto aguardando confirmação do funcionário. |
| Funcionário | Employee | Usuário final corporativo no chat. |
| Handoff | Handoff | Transferência conversa ↔ analista; estados `awaiting_analyst`, `with_analyst`. |
| INC | Incident (INC) | Tipo incidente — algo parou ou não funciona. |
| Legacy outage | Simulated legacy outage | Falha intermitente 503 no ticket-service. |
| Mastra | Mastra | Framework preferido para orquestração do agent (plano B: LangGraph.js). |
| OpenRouter | OpenRouter | Agregador de modelos LLM; modelo via `OPENROUTER_MODEL`. |
| PRD | Product requirements document | Baseline do desafio Beyond the Bytes v5. |
| Prazo vencido | SLA breach | Chamado além do prazo de primeira resposta/atualização conforme prioridade. |
| Quick reply | Quick reply | Botões de opção rápida na bolha (ex.: “Só eu”, “Falar com analista”). |
| RBAC | Role-based access control | Controle por papel `employee` \| `analyst`. |
| REQ | Request (REQ) | Tipo requisição — pedido de acesso, equipamento, software. |
| Rastreabilidade (agent) | Agent trace | Registro estruturado: entendimento, ações, regras, evidências. |
| Service desk | Service desk | Central de TI da Nexo (contexto fictício). |
| Sessão de chat | Chat session | Thread com limite de 30 mensagens; nova sessão arquiva a anterior. |
| SLA | Service level agreement | Prazos por prioridade (Anexo A). |
| SSE | Server-Sent Events | Stream unidirecional servidor → browser (chat funcionário). |
| Ticket-service | Ticket service | Módulo simulado de ITSM; única fronteira de mutação/consulta de chamados para o agent. |
| Tool | Tool | Função invocável pelo agent (ex.: `list_open_tickets`, `search_kb`). |
| Trace | Trace | Ver rastreabilidade (agent). |
| Transferência | Transfer / escalate | Conversa marcada aguardando atendente; agent pausado. |