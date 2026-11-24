export type Clock = {
  now(): Date;
};

export const systemClock: Clock = {
  now: () => new Date(),
};

export function fixedClock(iso: string | Date): Clock {
  const fixed = typeof iso === "string" ? new Date(iso) : iso;
  return { now: () => new Date(fixed.getTime()) };
}

export function getClock(): Clock {
  if (process.env.TEST_USE_WALL_CLOCK === "true") {
    const fixed = process.env.TEST_CLOCK_ISO;
    if (fixed) {
      return fixedClock(fixed);
    }
  }
  return systemClock;
}