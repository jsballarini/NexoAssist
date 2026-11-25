import { getHistoryMaxMessages, runAgentTurn } from "../../../lib/agent";
import { loadTurnContext } from "./turn-context-loader";
import { publishTurnEvent, closeTurn } from "./turn-bus";
import { createAgentAdapters } from "./adapters-factory";
import { addAssistantMessage } from "./repository";
import type { AgentTracePayload } from "./types";

export async function executeTurn(params: {
  turnId: string;
  conversationId: string;
  userId: string;
  userName: string;
  department: string;
  content: string;
}) {
  const adapters = createAgentAdapters(params.userId);

  try {
    const turnContext = await loadTurnContext(params.conversationId, params.userId, {
      maxMessages: getHistoryMaxMessages(),
    });
    const result = await runAgentTurn(
      params.content,
      {
        userId: params.userId,
        userName: params.userName,
        department: params.department,
        conversationId: params.conversationId,
      },
      adapters,
      turnContext,
      {
        onTrace: (partial) => {
          publishTurnEvent(params.turnId, {
            event: "trace",
            data: partial as AgentTracePayload,
          });
        },
        onToken: (delta) => {
          publishTurnEvent(params.turnId, { event: "token", data: { delta } });
        },
      },
    );

    publishTurnEvent(params.turnId, {
      event: "message",
      data: {
        role: "assistant",
        content: result.content,
        uiBlocks: result.uiBlocks,
        trace: result.trace,
      },
    });

    const saved = await addAssistantMessage(
      params.conversationId,
      result.content,
      result.uiBlocks,
      result.trace,
    );

    publishTurnEvent(params.turnId, {
      event: "done",
      data: { messageId: saved.id },
    });
    closeTurn(params.turnId);
  } catch (err) {
    publishTurnEvent(params.turnId, {
      event: "agent_error",
      data: {
        code: "AGENT_ERROR",
        message: err instanceof Error ? err.message : "Erro no agent",
      },
    });
    closeTurn(params.turnId);
  }
}