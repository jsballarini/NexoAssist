# Documentação do projeto Nexo Assist

**Versão do pacote de documentação:** 0.3.6  
**Última atualização:** 2026-11-24

## Propósito

Este diretório consolida a especificação de iniciação, escopo, arquitetura, requisitos, testes e governança do **Nexo Assist** — agent de service desk de TI para o desafio técnico Beyond the Bytes, com entrega orientada a portfólio.

**Baseline funcional imutável:** [Desafio_Tecnico_Nexo_Assist_PRD_v5.pdf](desafio/Desafio_Tecnico_Nexo_Assist_PRD_v5.pdf)  
**Referência visual:** [desafio/README.md](desafio/README.md) — `nexo/nexo.pen` e PNGs `Tela *.png` em `docs/desafio/`.  
**Lacunas baseline vs código:** [desafio/GAPS.md](desafio/GAPS.md).

## Convenções

- Idioma principal: **português (BR)**; termos técnicos recorrentes em inglês no [glossário](anexos/glossario.md).
- Versionamento deste pacote: [Semantic Versioning](https://semver.org/) — ver [Registro de Mudanças](04-registro-mudanca/04-02-registro-mudancas.md).
- Fases de desenvolvimento: **F1–F5**, cada uma compilável como slice vertical (ver [EAP/WBS](01-iniciacao/03-eap-wbs.md)).

## Índice

### 1. Iniciação e planejamento

| Documento | Descrição |
|-----------|-----------|
| [01-project-charter.md](01-iniciacao/01-project-charter.md) | Termo de abertura: objetivos, premissas, restrições, GP |
| [02-declaracao-escopo.md](01-iniciacao/02-declaracao-escopo.md) | Entregas, justificativa, inclusões e exclusões |
| [03-eap-wbs.md](01-iniciacao/03-eap-wbs.md) | Estrutura analítica do projeto e fases F1–F5 |
| [04-plano-gerenciamento.md](01-iniciacao/04-plano-gerenciamento.md) | Marcos, recursos, custos qualitativos, riscos resumo |

### 2. Especificação

| Documento | Descrição |
|-----------|-----------|
| [02-01-requisitos-usuario-produto.md](02-especificacao/02-01-requisitos-usuario-produto.md) | Expectativas de produto e usuários |
| [02-02-especificacao-funcional.md](02-especificacao/02-02-especificacao-funcional.md) | Comportamento do sistema por tela e fluxo |
| [02-03-especificacao-tecnica.md](02-especificacao/02-03-especificacao-tecnica.md) | Arquitetura, módulos, fronteira ticket-service |
| [02-04-casos-de-uso.md](02-especificacao/02-04-casos-de-uso.md) | Casos de uso detalhados |
| [02-05-historias-usuario.md](02-especificacao/02-05-historias-usuario.md) | User stories (funcionário e analista) |
| [02-06-modelo-dados.md](02-especificacao/02-06-modelo-dados.md) | Entidades, PostgreSQL, Prisma |
| [02-07-contratos-api.md](02-especificacao/02-07-contratos-api.md) | REST, SSE, polling analista, payloads |
| [02-08-regras-service-desk.md](02-especificacao/02-08-regras-service-desk.md) | Anexo A operacionalizado + confiança |
| [02-09-variaveis-ambiente.md](02-especificacao/02-09-variaveis-ambiente.md) | Catálogo canônico ENV / `.env.example` |

### 3. Processos e validação

| Documento | Descrição |
|-----------|-----------|
| [03-01-matriz-rastreabilidade.md](03-processos-validacao/03-01-matriz-rastreabilidade.md) | PRD → requisito → fase → teste |
| [03-02-plano-testes.md](03-processos-validacao/03-02-plano-testes.md) | Unit, integração, E2E, evals do agent |
| [03-03-fluxos-executivos.md](03-processos-validacao/03-03-fluxos-executivos.md) | Sequências operacionais (Mermaid) |

### 4. Registro e mudança

| Documento | Descrição |
|-----------|-----------|
| [04-01-registro-riscos.md](04-registro-mudanca/04-01-registro-riscos.md) | Riscos e mitigação |
| [04-02-registro-mudancas.md](04-registro-mudanca/04-02-registro-mudancas.md) | Controle de mudanças (SemVer docs) |
| [04-03-as-built.md](04-registro-mudanca/04-03-as-built.md) | As built (preenchido ao concluir implementação) |

### Desafio (baseline original)

| Documento | Descrição |
|-----------|-----------|
| [desafio/README.md](desafio/README.md) | PDF PRD v5, protótipo Pencil, PNGs |
| [desafio/GAPS.md](desafio/GAPS.md) | Lacunas baseline vs entrega atual (`0.8.0-m8.3`) |

### Anexos

| Documento | Descrição |
|-----------|-----------|
| [glossario.md](anexos/glossario.md) | Termos PT/EN |
| [personas-seed.md](anexos/personas-seed.md) | Elenco demo, chamados, artigos KB |
| [protótipo-mapeamento.md](anexos/protótipo-mapeamento.md) | Frames Pencil → rotas Next.js |

### 5. Planos de execução (implementação F1–F5)

Guias de slice vertical compilável — ordem obrigatória M1→M5. Especificação de referência permanece **0.1.9** até nova entrada no registro de mudanças.

| Documento | Descrição |
|-----------|-----------|
| [execucao/README.md](execucao/README.md) | Índice, mapa WBS/testes, `.env.example` incremental |
| [fase-01-fundacao.md](execucao/fase-01-fundacao.md) | EAP 1.1 — login, schema conversa, TailAdmin |
| [fase-02-tickets-kb.md](execucao/fase-02-tickets-kb.md) | EAP 1.2 — ticket-service, KB, SLA, chaos |
| [fase-03-agent-leitura.md](execucao/fase-03-agent-leitura.md) | EAP 1.3 — Mastra leitura, SSE, AgentTrace |
| [fase-04-mutacoes-regras.md](execucao/fase-04-mutacoes-regras.md) | EAP 1.4 — drafts, transfer, E2E-CHAOS (gate M4) |
| [fase-05-console-analista-hardening.md](execucao/fase-05-console-analista-hardening.md) | EAP 1.5 — console analista, evals 11–15, CI/CD |

### 6. Desenvolvimento (código)

Estado do monólito no repositório, operação local e marcos M1–M5 (complementa `execucao/`, não substitui `02-*`).

| Documento | Descrição |
|-----------|-----------|
| [desenvolvimento/README.md](desenvolvimento/README.md) | Índice da pasta |
| [arquitetura-codigo.md](desenvolvimento/arquitetura-codigo.md) | Pastas, auth, diagrama M1 |
| [status-implementacao.md](desenvolvimento/status-implementacao.md) | Marcos M1–M5 (M5 concluído) |
| [ambiente-e-comandos.md](desenvolvimento/ambiente-e-comandos.md) | ENV, Docker, testes, troubleshooting |

Hub na raiz: [../README.md](../README.md) · histórico da app: [../CHANGELOG.md](../CHANGELOG.md).

## Ordem de leitura recomendada

1. Charter e declaração de escopo  
2. Requisitos e histórias  
3. Especificação funcional + regras service desk  
4. Especificação técnica + contratos API + modelo de dados  
5. EAP/WBS e plano de testes  
6. Matriz de rastreabilidade  
7. Planos de execução (`execucao/`) ao iniciar código  
8. Após M1: status e arquitetura em `desenvolvimento/`  

## Gerente do projeto

**Juliano Ballarini** — aprovação de mudanças de escopo documentadas em `04-02-registro-mudancas.md`.