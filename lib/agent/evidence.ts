import type { TurnTrace } from "./adapters";

type Evidence = TurnTrace["evidence"][number];

type EvidenceCandidate = {
  id?: unknown;
  slug?: unknown;
  excerpt?: unknown;
  draftId?: unknown;
};

function fromObject(o: EvidenceCandidate, out: Evidence[]) {
  if (typeof o.draftId === "string" && o.draftId) {
    out.push({ type: "draft", id: o.draftId });
  }
  if (typeof o.id === "string" && o.id) {
    out.push({ type: "ticket", id: o.id });
  }
  if (typeof o.slug === "string" && o.slug) {
    out.push({
      type: "article",
      id: o.slug,
      excerpt: typeof o.excerpt === "string" ? o.excerpt : undefined,
    });
  }
}

/** Extrai evidências (chamados, rascunhos, artigos) dos resultados das ferramentas. */
export function collectEvidence(toolResults: unknown[]): Evidence[] {
  const evidence: Evidence[] = [];
  for (const result of toolResults) {
    if (Array.isArray(result)) {
      for (const item of result) {
        if (item && typeof item === "object") fromObject(item as EvidenceCandidate, evidence);
      }
    } else if (result && typeof result === "object") {
      fromObject(result as EvidenceCandidate, evidence);
    }
  }
  return evidence;
}
