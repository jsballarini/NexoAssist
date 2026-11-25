import { getOpenRouterConfig } from "./config";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

/** Streaming chat completion (OpenAI-compatible). */
export async function streamChatCompletion(
  messages: ChatMessage[],
  onDelta: (delta: string) => void,
): Promise<string> {
  const { apiKey, model, baseUrl } = getOpenRouterConfig();

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`OpenRouter HTTP ${res.status}: ${errBody.slice(0, 300)}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("OpenRouter: resposta sem body");

  const decoder = new TextDecoder();
  let buffer = "";
  let content = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (payload === "[DONE]") continue;

      let json: { choices?: { delta?: { content?: string } }[] };
      try {
        json = JSON.parse(payload) as typeof json;
      } catch {
        continue;
      }

      const delta = json.choices?.[0]?.delta?.content;
      if (typeof delta === "string" && delta.length > 0) {
        content += delta;
        onDelta(delta);
      }
    }
  }

  return content.trim();
}