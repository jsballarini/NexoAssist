export function getAnalystPollConfig() {
  const parse = (key: string, fallback: number) => {
    const raw = process.env[key];
    const n = raw ? Number.parseInt(raw, 10) : fallback;
    return Number.isNaN(n) ? fallback : n;
  };

  return {
    inboxIntervalMs: parse("ANALYST_POLL_INTERVAL_MS", 3000),
    inboxBackgroundMs: parse("ANALYST_POLL_BACKGROUND_MS", 10000),
    threadIntervalMs: parse("ANALYST_THREAD_POLL_MS", 2000),
    /** Recarrega o histórico no chat do funcionário durante handoff (mensagens do analista). */
    employeeHandoffPollMs: parse("EMPLOYEE_HANDOFF_POLL_MS", 4000),
  };
}