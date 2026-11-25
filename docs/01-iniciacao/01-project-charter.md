# Termo de abertura do projeto (Project Charter)

**Projeto:** Nexo Assist  
**Versão:** 1.0  
**Data:** 2026-11-24  
**Gerente do projeto:** Juliano Ballarini  
**Patrocinador / stakeholders:** Beyond the Bytes (processo seletivo); Nexo (contexto do desafio); portfólio profissional (Juliano Ballarini)

## Propósito

Autorizar e delimitar o desenvolvimento do **Nexo Assist**, agent conversacional de service desk de TI, cumprindo o [PRD v5](../desafio/Desafio_Tecnico_Nexo_Assist_PRD_v5.pdf) e produzindo artefato de portfólio (código, testes, documentação, deploy opcional).

## Objetivos

Alinhados ao PRD:

1. Resolver dúvidas e consultas no chat sem fila desnecessária.
2. Abrir chamados completos, corretos e sem duplicidade.
3. Encaminhar ao analista com contexto e no momento certo.
4. Expor **transparência** das decisões do agent em cada resposta.

## Escopo alto nível

- Aplicação monólito Next.js + PostgreSQL + agent Mastra + ticket-service simulado.
- Interfaces funcionário (login, chat, perfil) e analista (console conversas).
- Documentação completa em `docs/`.
- Docker Compose; pipeline deploy VPS na fase final.

Detalhamento: [02-declaracao-escopo.md](02-declaracao-escopo.md).

## Premissas

- Uso de ferramentas de IA no desenvolvimento é esperado (PRD).
- Modelo LLM via OpenRouter (`OPENROUTER_MODEL` configurável).
- TailAdmin OSS como base de UI.
- Ambiente demo com usuários seed; senha qualquer para login (PRD).
- Entrevista ao vivo poderá exigir mudanças pontuais — registradas no [registro de mudanças](../04-registro-mudanca/04-02-registro-mudancas.md).

## Restrições

- Baseline funcional do PRD não alterada sem registro formal.
- Exclusões: SSO/LDAP, e-mail reset real, mobile, ITSM real, metering LLM avançado.
- Limite 30 mensagens por sessão de chat.
- Privacidade: tickets isolados por requester.
- VPS alvo enxuta (~2 vCPU / 4GB).

## Critérios de aceite do projeto

| # | Critério |
|---|----------|
| AC-1 | Fluxos PRD demonstráveis localmente via Compose |
| AC-2 | Transparência agent (chips + expand + log analista) |
| AC-3 | Fronteira ticket-service respeitada e testada |
| AC-4 | Persistência sobrevive restart |
| AC-5 | README: arquitetura, decisões agent, qualidade, trade-offs |
| AC-6 | Testes: unit regras + integração + E2E + evals (~15) |
| AC-7 | Alta aderência ao protótipo (layout, hierarquia, chips e cards) e cuidado com estados de carregamento e erro (PRD) |
| AC-8 | Pacote `docs/` coerente com implementação final (As Built) |

## Autoridade do GP

Juliano Ballarini aprova mudanças de escopo e versionamento SemVer da documentação.

## Aprovação

| Papel | Nome | Status |
|-------|------|--------|
| GP | Juliano Ballarini | Aprovado (autor) |
| Patrocinador | Beyond the Bytes (processo seletivo) | Baseline PRD |