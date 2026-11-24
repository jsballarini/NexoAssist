import { getSession } from "@/lib/auth/session";
import {
  formatSse,
  getConversationForUser,
  sseHeaders,
  subscribeTurn,
} from "@/lib/conversation";
import type { SseEvent } from "@/lib/conversation/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const session = await getSession();
  if (!session.user || session.user.role !== "employee") {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id: conversationId } = await params;
  const conv = await getConversationForUser(conversationId, session.user.userId);
  if (!conv) {
    return new Response("Not found", { status: 404 });
  }

  const url = new URL(request.url);
  const turnId = url.searchParams.get("turnId");
  if (!turnId) {
    return new Response("turnId required", { status: 400 });
  }

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      const send = (event: SseEvent) => {
        controller.enqueue(encoder.encode(formatSse(event)));
      };

      const unsubscribe = subscribeTurn(turnId, {
        send,
        close: () => {
          try {
            controller.close();
          } catch {
            /* already closed */
          }
        },
      });

      request.signal.addEventListener("abort", () => {
        unsubscribe();
        try {
          controller.close();
        } catch {
          /* noop */
        }
      });
    },
  });

  return new Response(stream, { headers: sseHeaders() });
}