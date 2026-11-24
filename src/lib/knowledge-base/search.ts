import { prisma } from "@/lib/db";

export type KbSearchResult = {
  slug: string;
  title: string;
  excerpt: string;
};

function excerpt(body: string, max = 160): string {
  const t = body.replace(/\s+/g, " ").trim();
  return t.length <= max ? t : `${t.slice(0, max)}…`;
}

function needsIlikeFallback(query: string): boolean {
  const q = query.trim();
  if (q.length <= 2) return true;
  if (/^\d+$/.test(q)) return true;
  return /^[A-Z]{2,}$/i.test(q) && q.length <= 5;
}

export async function searchArticles(
  query: string,
  limit = 5,
): Promise<KbSearchResult[]> {
  const q = query.trim();
  if (!q) return [];

  const bySlug = new Map<string, KbSearchResult>();

  if (!needsIlikeFallback(q)) {
    try {
      const ftsRows = await prisma.$queryRaw<
        Array<{ slug: string; title: string; body: string }>
      >`
        SELECT slug, title, body
        FROM "KnowledgeArticle"
        WHERE search_vector @@ plainto_tsquery('portuguese', ${q})
        ORDER BY ts_rank_cd(search_vector, plainto_tsquery('portuguese', ${q})) DESC
        LIMIT ${limit}
      `;
      for (const row of ftsRows) {
        bySlug.set(row.slug, {
          slug: row.slug,
          title: row.title,
          excerpt: excerpt(row.body),
        });
      }
    } catch {
      // column may be missing in dev — fall through to ILIKE
    }
  }

  const pattern = `%${q.replace(/%/g, "\\%")}%`;
  const ilikeRows = await prisma.$queryRaw<
    Array<{ slug: string; title: string; body: string }>
  >`
    SELECT slug, title, body
    FROM "KnowledgeArticle"
    WHERE slug ILIKE ${pattern}
       OR title ILIKE ${pattern}
       OR body ILIKE ${pattern}
    LIMIT ${limit}
  `;

  for (const row of ilikeRows) {
    if (!bySlug.has(row.slug)) {
      bySlug.set(row.slug, {
        slug: row.slug,
        title: row.title,
        excerpt: excerpt(row.body),
      });
    }
  }

  return Array.from(bySlug.values()).slice(0, limit);
}