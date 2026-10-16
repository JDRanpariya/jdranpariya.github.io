import { getAnnotations } from "@/lib/research-annotations";
import {
  getCatalog,
  toPublicRecord,
  type CatalogRecord,
  type CollectionId,
  type PublicCatalogRecord,
} from "@/lib/research-catalog";
import type { Decision } from "@/lib/research-annotations";
import { visibleDecision } from "./library-decisions";

export const libraryPageSize = 40;

export type LibraryAnnotationView = {
  recordId: string;
  decision: string;
  researchFit: string;
  privateNotes: string;
  publicNotes: string;
  tags: string;
  isPublished: boolean;
  updatedAt: string;
};

export type DecisionCounts = Record<Decision, number>;

export type LibraryFilters = {
  query?: string;
  decision?: Decision | "all";
};

export type LibraryPageData = {
  records: PublicCatalogRecord[];
  annotations: LibraryAnnotationView[];
  counts: DecisionCounts;
  total: number;
  sourceTotal: number;
  page: number;
  pageCount: number;
};

export async function getLibraryPage({
  binding,
  ownerId,
  collection,
  page = 1,
  ...filters
}: LibraryFilters & {
  binding: D1Database;
  ownerId: string;
  collection: CollectionId;
  page?: number;
}): Promise<LibraryPageData> {
  const [catalog, annotations] = await Promise.all([
    Promise.resolve(getCatalog(collection)),
    getAnnotations(binding, ownerId, collection),
  ]);
  const annotationMap = new Map(annotations.map((annotation) => [annotation.recordId, annotation]));
  const counts: DecisionCounts = { unreviewed: 0, keep: 0, maybe: 0, remove: 0 };

  for (const record of catalog) {
    const saved = annotationMap.get(record.id);
    const recordDecision = visibleDecision(saved?.decision);
    counts[recordDecision] += 1;
  }

  const filtered = filterLibraryRecords(catalog, annotationMap, filters);

  const pageCount = Math.max(1, Math.ceil(filtered.length / libraryPageSize));
  const safePage = Math.min(Math.max(1, page), pageCount);
  const records = filtered
    .slice((safePage - 1) * libraryPageSize, safePage * libraryPageSize)
    .map(toPublicRecord);
  const visibleIds = new Set(records.map((record) => record.id));

  return {
    records,
    annotations: annotations
      .filter((annotation) => visibleIds.has(annotation.recordId))
      .map((annotation) => ({
        recordId: annotation.recordId,
        decision: annotation.decision,
        researchFit: annotation.researchFit,
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

/** Server-side search and filters for one collection page. Pure, so it is unit-tested. */
export function filterLibraryRecords(
  catalog: CatalogRecord[],
  annotationMap: Map<string, { decision: string }>,
  { query = "", decision = "all" }: LibraryFilters = {}
): CatalogRecord[] {
  const searchable = (value: string) =>
    value.normalize("NFKD").replace(/\p{M}/gu, "").toLocaleLowerCase();
  const needle = searchable(query.trim());
  return catalog.filter((record) => {
    if (
      decision !== "all" &&
      visibleDecision(annotationMap.get(record.id)?.decision) !== visibleDecision(decision)
    )
      return false;
    if (!needle) return true;
    return searchable(
      [
        record.name,
        record.lead,
        record.institution,
        record.country,
        record.primary,
        record.summary,
        record.perspective ?? "",
        ...(record.aliases ?? []),
        ...(record.readingPaths ?? []).flatMap((work) => [work.title, work.whyRead]),
        ...record.topics,
        ...(record.teamMembers ?? []).flatMap((member) => [
          member.name,
          ...member.researchPlans.map((plan) => plan.title),
        ]),
        ...(record.researchPlans ?? []).map((plan) => plan.title),
      ].join(" ")
    ).includes(needle);
  });
}
