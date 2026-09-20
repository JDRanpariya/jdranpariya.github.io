import { getAnnotations } from "@/lib/research-annotations";
import { getCatalog, type CatalogRecord, type CollectionId } from "@/lib/research-catalog";
import type { Decision } from "@/lib/research-annotations";

export const libraryPageSize = 40;

export type LibraryAnnotationView = {
  recordId: string;
  decision: string;
  privateNotes: string;
  publicNotes: string;
  tags: string;
  isPublished: boolean;
  updatedAt: string;
};

export type DecisionCounts = Record<Decision, number>;

export type LibraryPageData = {
  records: CatalogRecord[];
  annotations: LibraryAnnotationView[];
  counts: DecisionCounts;
  total: number;
  sourceTotal: number;
  page: number;
  pageCount: number;
};

export async function getLibraryPage({
  ownerId,
  collection,
  query = "",
  decision = "all",
  page = 1,
}: {
  ownerId: string;
  collection: CollectionId;
  query?: string;
  decision?: Decision | "all";
  page?: number;
}): Promise<LibraryPageData> {
  const [catalog, annotations] = await Promise.all([
    Promise.resolve(getCatalog(collection)),
    getAnnotations(ownerId, collection),
  ]);
  const annotationMap = new Map(annotations.map((annotation) => [annotation.recordId, annotation]));
  const counts: DecisionCounts = { unreviewed: 0, keep: 0, maybe: 0, remove: 0 };

  for (const record of catalog) {
    const saved = annotationMap.get(record.id);
    const recordDecision = normalizeDecision(saved?.decision);
    counts[recordDecision] += 1;
  }

  const needle = query.trim().toLocaleLowerCase();
  const filtered = catalog.filter((record) => {
    const saved = annotationMap.get(record.id);
    if (decision !== "all" && normalizeDecision(saved?.decision) !== decision) return false;
    if (!needle) return true;
    return [
      record.name,
      record.lead,
      record.institution,
      record.country,
      record.primary,
      record.summary,
      ...record.topics,
    ]
      .join(" ")
      .toLocaleLowerCase()
      .includes(needle);
  });

  const pageCount = Math.max(1, Math.ceil(filtered.length / libraryPageSize));
  const safePage = Math.min(Math.max(1, page), pageCount);
  const records = filtered.slice((safePage - 1) * libraryPageSize, safePage * libraryPageSize);
  const visibleIds = new Set(records.map((record) => record.id));

  return {
    records,
    annotations: annotations
      .filter((annotation) => visibleIds.has(annotation.recordId))
      .map((annotation) => ({
        recordId: annotation.recordId,
        decision: annotation.decision,
        privateNotes: annotation.privateNotes,
        publicNotes: annotation.publicNotes,
        tags: annotation.tags,
        isPublished: annotation.isPublished,
        updatedAt: annotation.updatedAt,
      })),
    counts,
    total: filtered.length,
    sourceTotal: catalog.length,
    page: safePage,
    pageCount,
  };
}

function normalizeDecision(value?: string): Decision {
  return value === "keep" || value === "maybe" || value === "remove" ? value : "unreviewed";
}
