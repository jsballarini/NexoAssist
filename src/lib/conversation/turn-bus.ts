import type { SseEvent } from "./types";

type Subscriber = {
  send: (event: SseEvent) => void;
  close: () => void;
};

/** Singleton no global — Next dev pode duplicar o módulo entre rotas/API. */
const globalForTurnBus = globalThis as unknown as {
  __nexoTurnSubs?: Map<string, Set<Subscriber>>;
};

function getSubs() {
  if (!globalForTurnBus.__nexoTurnSubs) {
    globalForTurnBus.__nexoTurnSubs = new Map();
  }
  return globalForTurnBus.__nexoTurnSubs;
}

export function subscribeTurn(turnId: string, sub: Subscriber): () => void {
  const subs = getSubs();
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
  const set = getSubs().get(turnId);
  if (!set) return;
  for (const s of set) {
    s.send(event);
  }
}

export function closeTurn(turnId: string) {
  const subs = getSubs();
  const set = subs.get(turnId);
  if (!set) return;
  for (const s of set) {
    s.close();
  }
  subs.delete(turnId);
}