import type { SseEvent } from "./types";

let eventSeq = 0;

export function formatSse(event: SseEvent): string {
  eventSeq += 1;
  const id = String(eventSeq);
  return `id: ${id}\nevent: ${event.event}\ndata: ${JSON.stringify(event.data)}\n\n`;
}

export function sseHeaders(): HeadersInit {
  return {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  };
}