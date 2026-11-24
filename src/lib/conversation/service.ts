import { randomUUID } from "crypto";
import {
  addUserMessage,
  archiveAndCreateNew,
  findActiveConversation,
  createConversation,
} from "./repository";
import { executeTurn } from "./turn-runner";
import {
  ConversationAwaitingAnalystError,
  ConversationWithAnalystError,
  MESSAGE_LIMIT,
  SessionMessageLimitError,
} from "./types";

export async function getOrCreateActive(userId: string) {
  let conv = await findActiveConversation(userId);
  if (!conv) {
    conv = await createConversation(userId, 1);
  }
  return conv;
}

export async function getActiveMeta(userId: string) {
  const conv = await getOrCreateActive(userId);
  return {
    conversationId: conv.id,
    messageCount: conv.messageCount,
    messageLimit: MESSAGE_LIMIT,
    state: conv.state,
    sessionSequence: conv.sessionSequence,
  };
}

export async function startNewSession(userId: string) {
  const conv = await archiveAndCreateNew(userId);
  return {
    conversationId: conv.id,
    messageCount: 0,
    messageLimit: MESSAGE_LIMIT,
    state: conv.state,
    sessionSequence: conv.sessionSequence,
  };
}

export async function postUserMessage(
  userId: string,
  userName: string,
  department: string,
  content: string,
  turnId?: string,
) {
  const conv = await getOrCreateActive(userId);

  if (conv.state === "awaiting_analyst") {
    throw new ConversationAwaitingAnalystError();
  }

  if (conv.state === "with_analyst") {
    throw new ConversationWithAnalystError();
  }

  if (conv.messageCount >= MESSAGE_LIMIT) {
    throw new SessionMessageLimitError();
  }

  const userMsg = await addUserMessage(conv.id, content);
  const id = turnId ?? randomUUID();

  void executeTurn({
    turnId: id,
    conversationId: conv.id,
    userId,
    userName,
    department,
    content,
  });

  return {
    conversationId: conv.id,
    userMessageId: userMsg.id,
    turnId: id,
  };
}