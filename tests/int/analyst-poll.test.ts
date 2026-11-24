import { listInboxItems, buildInboxETag } from "@/lib/analyst";
import { describe, expect, it } from "vitest";

describe("INT-POLL-01", () => {
  it("ETag estável → 304 lógico", async () => {
    const items = await listInboxItems();
    const etag1 = buildInboxETag(items);
    const etag2 = buildInboxETag(items);
    expect(etag1).toBe(etag2);
  });
});