import type { AgentAdapters, AgentUserContext, TurnResult, TurnStreamCallbacks } from "./adapters";
import { runFixtureTurn } from "./fixture-turn";
import { streamChatCompletion } from "./openrouter";

function emitFixtureTokens(text: string, onToken?: (d: string) => void) {
  if (!onToken) return;
  for (const part of text.split(/(\s+)/)) {
    if (part) onToken(part);
  }
}

/**
 * Executa tools/uiBlocks via planner determinístico e redige a resposta com OpenRouter.
 */
export async function runLlmTurn(
  userMessage: string,
  ctx: AgentUserContext,
  adapters: AgentAdapters,
  callbacks?: TurnStreamCallbacks,
): Promise<TurnResult> {
  const scaffold = await runFixtureTurn(userMessage, ctx, adapters, undefined, {
    emitTokens: false,
  });

  const toolSummary =
    scaffold.trace.actions.length > 0
      ? `Ferramentas usadas: ${scaffold.trace.actions.join(", ")}.`
      : "Nenhuma ferramenta foi necessária.";

  const system = [
    "Você é o Nexo Assist, agente de service desk de TI da empresa.",
    "Responda em português do Brasil, tom profissional e objetivo.",
    "Use os cards da UI (rascunhos, chamados, KB) — não invente IDs de chamado.",
    scaffold.trace.understanding,
    toolSummary,
    `Referência (pode adaptar o texto): ${scaffold.content}`,
  ].join("\n");

  try {
    let streamed = "";
    const content = await streamChatCompletion(
      [
        { role: "system", content: system },
        { role: "user", content: userMessage },
      ],
      (delta) => {
        streamed += delta;
        callbacks?.onToken?.(delta);
      },
    );

    const finalText = content || streamed || scaffold.content;
    return { ...scaffold, content: finalText };
  } catch {
    emitFixtureTokens(scaffold.content, callbacks?.onToken);
    return scaffold;
  }
}