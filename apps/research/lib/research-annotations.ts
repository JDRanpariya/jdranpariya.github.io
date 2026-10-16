import { getDb } from "@/db";
import { researchAnnotations, type ResearchAnnotation } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import type { CollectionId } from "@/lib/research-catalog";
import { hasMembershipMoves, inheritMovedAnnotations } from "@/lib/catalog-membership";
import { inheritCensusAnnotations } from "@/lib/census-aliases";

export type Decision = "unreviewed" | "keep" | "maybe" | "remove";
export const researchFitValues = ["", "strong", "partial", "low"] as const;
export type ResearchFit = (typeof researchFitValues)[number];

export async function getAnnotations(
  binding: D1Database,
  ownerId: string,
  collection: CollectionId
) {
  if (collection !== "rl" || !hasMembershipMoves) {
    return inheritCensusAnnotations(await getStoredAnnotations(binding, ownerId, collection));
  }
  const [rows, source] = await Promise.all([
    getStoredAnnotations(binding, ownerId, collection),
    getStoredAnnotations(binding, ownerId, "neuroai"),
  ]);
  return inheritCensusAnnotations(inheritMovedAnnotations(rows, source));
}

function getStoredAnnotations(binding: D1Database, ownerId: string, collection: CollectionId) {
  return getDb(binding)
    .select()
    .from(researchAnnotations)
    .where(
      and(eq(researchAnnotations.ownerId, ownerId), eq(researchAnnotations.collection, collection))
    );
}

export async function getPublishedAnnotations(binding: D1Database, ownerEmail: string) {
  const rows = await getDb(binding)
    .select({
      collection: researchAnnotations.collection,
      recordId: researchAnnotations.recordId,
      publicNotes: researchAnnotations.publicNotes,
      tags: researchAnnotations.tags,
      updatedAt: researchAnnotations.updatedAt,
      decision: researchAnnotations.decision,
      isPublished: researchAnnotations.isPublished,
    })
    .from(researchAnnotations)
    .where(eq(researchAnnotations.ownerEmail, ownerEmail.toLowerCase()));
  // Resolve moves before publication filtering: an unpublished destination row
  // must suppress a previously published source, just as private edits do.
  const resolvedRl = inheritMovedAnnotations(
    rows.filter((row) => row.collection === "rl"),
    rows.filter((row) => row.collection === "neuroai")
  );
  return inheritCensusAnnotations([...rows.filter((row) => row.collection !== "rl"), ...resolvedRl])
    .filter((row) => row.isPublished && row.decision === "keep")
    .map(({ collection, recordId, publicNotes, tags, updatedAt }) => ({
      collection,
      recordId,
      publicNotes,
      tags,
      updatedAt,
    }));
}

export async function upsertAnnotation(binding: D1Database, annotation: ResearchAnnotation) {
  await getDb(binding)
    .insert(researchAnnotations)
    .values(annotation)
    .onConflictDoUpdate({
      target: [
        researchAnnotations.ownerId,
        researchAnnotations.collection,
        researchAnnotations.recordId,
      ],
      set: {
        ownerEmail: annotation.ownerEmail,
        decision: annotation.decision,
        researchFit: annotation.researchFit,
        privateNotes: annotation.privateNotes,
        publicNotes: annotation.publicNotes,
        tags: annotation.tags,
        isPublished: annotation.isPublished,
        updatedAt: annotation.updatedAt,
      },
    });

  return annotation;
}
