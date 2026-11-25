# Personas e dados de seed

Dados ilustrativos alinhados ao protótipo Pencil, PNGs e Anexo B do PRD. O seed do projeto deve reproduzir estes identificadores para validação visual imediata.

## Funcionários (amostra)

| Nome | E-mail | Área | Papel | Uso em demo |
|------|--------|------|-------|-------------|
| Ana Souza | ana.souza@nexo.com.br | Financeiro | `employee` | Persona principal chat; INC-20311 |
| Carla Mendes | carla.mendes@nexo.com.br | Comercial | `employee` | Lista conversas — transferida |
| Bruno Tavares | bruno.tavares@nexo.com.br | Operações | `employee` | Agent baixa confiança (~41%) |
| Diego Ramos | diego.ramos@nexo.com.br | RH | `employee` | `INC-20150` resolvido há 4d (reabertura); agent atendendo em outras conversas |
| Elisa Prado | elisa.prado@nexo.com.br | Jurídico | `employee` | Chamado criado pelo agent |
| Fábio Nunes | fabio.nunes@nexo.com.br | TI campo | `employee` | Resolvida pelo agent |
| Gabriela Rocha | gabriela.rocha@nexo.com.br | Marketing | `employee` | Resolvida pelo agent |

**Autenticação demo:** qualquer senha aceita para usuários seed (PRD).

## Analistas

| Nome | E-mail | Nível | Papel |
|------|--------|-------|-------|
| Rafael Lima | rafael.lima@nexo.com.br | Suporte N2 | `analyst` |
| Mariana Costa | mariana.costa@nexo.com.br | Suporte N1 | `analyst` |

## Chamados de referência (Anexo B + protótipo)

| ID | Título | Categoria | Prioridade | Status | Requester | Notas |
|----|--------|-----------|------------|--------|-----------|-------|
| INC-20311 | Notebook lento após atualização do Windows | Hardware | Média | Aguardando analista | Ana Souza | Sem atualização há 5+ dias — **prazo vencido** em demo |
| INC-20298 | Acesso à pasta Financeiro no SharePoint | Acesso | Média | Em andamento | Ana Souza | Aberto 14 out |
| REQ-10442 | Segundo monitor para home office | Hardware | Baixa | Aprovado | Ana Souza | Aberto 09 out |
| INC-20150 | Senha do SAP bloqueada | Acesso | Média | Resolvido | **Diego Ramos** (`diego.ramos@nexo.com.br`) | `resolvedAt` ~4 dias atrás no seed — **reabertura ≤7d** (`EVAL-12`, `INT-TICKET-03`); só Diego vê/reabre (privacidade) |
| INC-20517 | VPN não conecta — erro 809 | Rede e VPN | Alta | (ex. login preview) | — | Referência tela login |
| INC-19877 | Outlook não sincroniza no celular | Software | Baixa | Resolvido | Ana Souza | Histórico painel analista |
| INC-19410 | Troca de senha da rede | Acesso | Baixa | Resolvido | Ana Souza | Histórico painel analista |

## Artigos da central de ajuda (mínimo sugerido)

| Slug | Título | Conteúdo resumido |
|------|--------|-------------------|
| `vpn-erro-809` | VPN com erro 809 | Reinstalar cliente pelo portal; válido Windows 10; Win11 → abrir chamado |
| `horario-service-desk` | Horário do service desk | Seg–sex 8h–18h; críticos 24h plantão |
| `reset-senha-rede` | Esqueci minha senha da rede | Portal de autoatendimento; bloqueio após 3 tentativas |
| `sharepoint-acesso-pasta` | Solicitar acesso a pasta SharePoint | Abrir REQ Acesso com gestor aprovador |
| `notebook-lento-pos-update` | Lentidão após atualização Windows | Limpeza de disco, drivers; persistindo → INC Hardware |
| `segundo-monitor-req` | Solicitar segundo monitor | REQ Hardware; aprovação gestor |
| `sap-senha-bloqueada` | Senha SAP bloqueada | Auto-desbloqueio portal; INC se falhar |
| `outlook-mobile-sync` | Outlook não sincroniza no celular | Reconfigurar conta; INC se corporativo |

## Conversas pré-seed (console analista — F5 / demo rápida)

| Conversa | Funcionário | Estado inicial | Contexto |
|----------|-------------|----------------|----------|
| CONV-ana-transfer | Ana Souza | `awaiting_analyst` | Transferida após INC-20311 vencido; agent pausado |
| CONV-carla-transfer | Carla Mendes | `awaiting_analyst` | Acesso SAP urgente; badge não lida |

## Cenários de teste atrelados ao seed

| Teste | Login seed | Dados |
|-------|------------|--------|
| `EVAL-12` / `INT-TICKET-03` | Diego Ramos | Reabrir `INC-20150` (SAP), não criar novo ID |
| `EVAL-03` / `E2E-KB` | Ana Souza | KB `vpn-erro-809`, Win10 |
| `EVAL-06` / `E2E-OPEN` | Ana Souza | Novo INC VPN Win11 |
| `E2E-STATUS` | Ana Souza | `INC-20311` vencido |

## IDs e convenções

- **INC-** prefixo incidente; **REQ-** requisição; **D-** prefixo rascunho (ex.: D-381).
- Fuso padrão: `America/Sao_Paulo`.
- Expediente SLA Alta/Média/Baixa: seg–sex 8h–18h; **Crítica** 24/7.