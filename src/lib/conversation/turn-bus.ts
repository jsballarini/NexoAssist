import type { SseEvent } from "./types";

type Subscriber = {
  send: (event: SseEvent) => void;
  close: () => void;
};

const subs = new Map<string, Set<Subscriber>>();

export function subscribeTurn(turnId: string, sub: Subscriber): () => void {
  let set = subs.get(turnId);
  if (!set) {
    set = new Set();
    subs.set(turnId, set);
  }
  set.add(sub);
  return () => {
    set?.delete(sub);
    if (set?.size === 0) subs.delete(turnId);
  };
}

export function publishTurnEvent(turnId: string, event: SseEvent) {
  const set = subs.get(turnId);
  if (!set) return;
  for (const s of set) {
    s.send(event);
  }
}

export function closeTurn(turnId: string) {
  const set = subs.get(turnId);
  if (!set) return;
  for (const s of set) {
    s.close();
  }
  subs.delete(turnId);
}