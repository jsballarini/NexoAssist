export function getChaosRate(): number {
  const raw = process.env.TICKET_CHAOS_RATE ?? "0.03";
  const rate = Number.parseFloat(raw);
  if (Number.isNaN(rate)) return 0;
  return Math.min(1, Math.max(0, rate));
}

export function shouldSimulateOutage(random = Math.random()): boolean {
  return random < getChaosRate();
}