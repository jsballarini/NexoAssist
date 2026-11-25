# Mapeamento protótipo Pencil → aplicação

**Atualizado:** 2026-11-25

Frames do arquivo [nexo/nexo.pen](../desafio/nexo/nexo.pen) e PNGs em [docs/desafio/](../desafio/README.md) mapeados para rotas e componentes do Next.js (App Router). O `.pen` é a fonte primária (medidas, cores, nomes); os PNGs servem para conferência visual.

## Frames → rotas → componentes

| Frame Pencil | PNG | Rota | Papel | Componentes principais |
|--------------|-----|------|-------|------------------------|
| Identificação (desktop) | Tela Login.png | `/login` | Público | `app/(auth)/layout.tsx` (showcase), `components/auth/login-form.tsx` |
| Chat — Novo chamado (desktop) | Tela 1.png | `/atendimento` | `employee` | `employee-sidebar`, `chat-workspace`, `message-bubble`, `draft-card` |
| Chat — Consulta e transferência (desktop) | Tela 2.png | `/atendimento` | `employee` | `message-bubble` (`TicketSelector`, `TicketCard`), quick replies |
| Cliente — Meu perfil (desktop) | Tela Meu Perfil.png | `/perfil` | `employee` | `app/(employee)/perfil/page.tsx` |
| Atendente — Conversas (desktop) | Tela Conversas.png | `/atendente/conversas` | `analyst` | `analyst-workspace` + `analyst-rail`, `inbox-panel`, `inbox-row`, `thread-header`, `thread-messages`, `takeover-bar`, `tickets-panel` |
| Atendente — Atendimento assumido (desktop) | Tela Conversas 2.png | `/atendente/conversas` (SPA, conversa selecionada) | `analyst` | idem, estado `with_analyst` |

A rota `/atendente/conversas/[id]` do protótipo é atendida pela SPA única (decisão G-UI-A06).

## Tokens de design (variables do `.pen`)

Definidos em [`src/app/globals.css`](../../src/app/globals.css):

| Variable `.pen` | Valor | Token Tailwind |
|-----------------|-------|----------------|
| `primary` | `#0285F7` | `brand-500` (escala `brand-*` reancorada) |
| `primary-hover` | `#0071D6` | `brand-600` |
| `primary-text` | `#0069C7` | `brand-700` |
| `cta` | `#0062C4` | `brand-800`, `nexo-cta` |
| `ink` / `ink-2` / `ink-3` | `#1B2431` / `#3D4656` / `#5B6472` | `nexo-ink`, `nexo-ink-2`, `nexo-ink-3` |
| `desk` | `#F6F7F9` | `nexo-desk` |
| `rule` | `#E6E8EC` | `nexo-rule` |
| `success` (+ soft/text) | `#00BD6C` | `nexo-success*` |
| `warning` (+ soft/text) | `#F5A500` | `nexo-warning*` |
| `danger` (+ soft/text) | `#EE343B` | `nexo-danger*` |
| `radius-sm/md/lg` | 6 / 10 / 14 px | `rounded-nexo-sm/md/lg` |

**Fontes:** o protótipo usa Newsreader (títulos de destaque), Schibsted Grotesk e Geist (UI). **Login:** `font-login` (Schibsted Grotesk) + `font-newsreader` (Newsreader) nos títulos “Seu problema…” e “Entrar”. Demais telas: **Outfit**.

**Login — métricas do showcase:** calculadas do Postgres (`getLoginShowcaseStats`: latência média dos traces, % de conversas sem handoff, contagem de usuários `analyst`). Card `INC-20517` vem do seed quando existir.

## Layout

### Funcionário (Tela 1, Tela 2, Meu perfil)

- Sidebar fixa **232px**: logo, nav com ícones (Atendimento / Meu perfil), avatar com iniciais + e-mail + Sair.
- Top bar: breadcrumb `Service desk de TI > …` e pill “Assistente online” (só no atendimento).
- Chat centralizado (~600px): linha de status do agent com ✓ acima da bolha, quick replies em pills, card de rascunho e seletor de chamados.
- Composer: campo + Enviar com ícone; contador `N/30 mensagens nesta sessão` abaixo do campo.

### Analista (Conversas, Atendimento assumido)

- Rail **56px** + lista **~360px** + conversa flex + painel **~320px** (Chamados | Trace).
- Chips: Todas | Para você | Com o agent | Minhas, com contagem.
- Itens: avatar colorido, hora, preview, linha de contexto (`Transferida · INC-…`, `Agent pediu ajuda · confiança N%`, `Você está atendendo`).
- Thread: rótulo “Nexo Assist IA”, linhas de sistema centralizadas (transferência, assumiu), bolha verde do analista.
- Takeover bar no rodapé: aguardando → “{nome} espera um atendente” + Devolver ao agent + Assumir atendimento; atendendo → Devolver/Encerrar no header e composer ativo.
- Painel: “Chamados da {nome}”, card “Desta conversa”, “Outros chamados”, aba Trace, botão “Ver todos os chamados”.

## Mapeamento de rótulos do protótipo para a lógica atual

| Protótipo | Implementação |
|-----------|---------------|
| Chip “Para você” | Conversas `awaiting_analyst` |
| Chip “Com o agent” | Conversas em revisão sugerida (`needsReview`: baixa confiança do agent), **não** todas as conversas `with_agent` |
| Chip “Minhas” | Conversas assumidas pelo analista logado |
| Chip “Encerrados” | Conversas `closed` encerradas pelo analista (histórico somente leitura) |
| “Aguardando atendente” | Estado `awaiting_analyst` |
| “Agent pausado · até HH:MM” | Horário da transferência + janela de atendimento do analista (derivado, sem SLA de fila real) |

## Fora de escopo v1 (só visual ou omitido)

- Presença “online”, “digitando…” e toggle “Disponível” persistido: exibidos como rótulos estáticos/decorativos.
- “Redefinir senha” (Meu perfil) e “Esqueci minha senha” (login): sem envio de e-mail na demo; o botão explica isso e aponta para o ramal 4000.
- “Manter conectado neste computador”: só visual (a sessão segue a configuração do iron-session).
- “Contato em 25 min” (SLA de fila humana): não há engine; a linha mostra o ticket vinculado.
- Rota dedicada “Ver todos os chamados”: o botão expande a lista completa no próprio painel.
- Menu ⋮ do header com ações extras.
- Viewport mobile.
