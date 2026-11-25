# Artefatos originais do desafio (Beyond the Bytes)

**Atualizado:** 2026-11-25  
**Versão da aplicação de referência:** `0.8.0-m8.3` (paridade visual com PNG + `nexo.pen`)

Esta pasta guarda a **baseline imutável** do desafio técnico (PDF + protótipo visual). A especificação operacional derivada está em [`../02-especificacao/`](../02-especificacao/02-02-especificacao-funcional.md). Lacunas entre baseline e código: [`GAPS.md`](GAPS.md) (vs especificação interna) e [`GAPS2.md`](GAPS2.md) (comportamento real vs PRD).

## Conteúdo

| Artefato | Arquivo | Descrição |
|----------|---------|-----------|
| PRD v5 | [Desafio_Tecnico_Nexo_Assist_PRD_v5.pdf](Desafio_Tecnico_Nexo_Assist_PRD_v5.pdf) | Requisitos funcionais e critérios do desafio |
| Protótipo Pencil | [nexo/nexo.pen](nexo/nexo.pen) | Layout desktop 1440px (frames por tela) |
| Exportações PNG | `Tela *.png` | Pré-visualização estática alinhada ao `.pen` |

### Mapa PNG → rota

| PNG | Rota na app | Papel |
|-----|-------------|-------|
| Tela Login.png | `/login` | Público |
| Tela 1.png, Tela 2.png | `/atendimento` | `employee` |
| Tela Meu Perfil.png | `/perfil` | `employee` |
| Tela Conversas.png | `/atendente/conversas` | `analyst` (fila) |
| Tela Conversas 2.png | `/atendente/conversas` (thread assumida) | `analyst` |

Detalhe de componentes e larguras: [protótipo-mapeamento](../anexos/protótipo-mapeamento.md).

## Como usar o `.pen`

1. Instale o [Pencil](https://www.pencil.dev/) (ou editor compatível com `.pen`).
2. Abra `nexo/nexo.pen`.
3. Compare frames com a implementação em `src/app/` e com as capturas PNG.

## Leitura recomendada (ordem)

1. PRD v5 (PDF) — visão de produto  
2. [Declaração de escopo](../01-iniciacao/02-declaracao-escopo.md) — E-01…E-11  
3. [Charter](../01-iniciacao/01-project-charter.md) — AC-1…AC-8  
4. [02-02 especificação funcional](../02-especificacao/02-02-especificacao-funcional.md)  
5. [Matriz de rastreabilidade](../03-processos-validacao/03-01-matriz-rastreabilidade.md)  
6. [As built](../04-registro-mudanca/04-03-as-built.md) + [GAPS.md](GAPS.md) + [GAPS2.md](GAPS2.md)

## Links rápidos

- Hub documentação: [docs/README.md](../README.md)
- Status implementação: [status-implementacao.md](../desenvolvimento/status-implementacao.md)
- README da aplicação: [../../README.md](../../README.md)