import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

const FORBIDDEN = ["@/lib/db", "@prisma/client", "lib/db", "prisma/client"];

function walk(dir: string, acc: string[] = []): string[] {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else if (/\.(ts|tsx|js|mjs)$/.test(entry.name)) acc.push(full);
  }
  return acc;
}

describe("INT-BOUNDARY-01", () => {
  it("lib/agent/** não importa Prisma nem @/lib/db", () => {
    const root = path.join(process.cwd(), "lib", "agent");
    const files = walk(root);
    const violations: string[] = [];

    for (const file of files) {
      const content = fs.readFileSync(file, "utf8");
      for (const token of FORBIDDEN) {
        if (content.includes(token)) {
          violations.push(`${file} → ${token}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });
});