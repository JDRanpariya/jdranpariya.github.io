import { getDb } from "@/db";
import { researchAnnotations, type ResearchAnnotation } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import type { CollectionId } from "@/lib/research-catalog";

export type Decision = "unreviewed" | "keep" | "maybe" | "remove";

export async function getAnnotations(ownerId: string, collection: CollectionId) {
  return getDb()
    .select()
    .from(researchAnnotations)
    .where(
      and(eq(researchAnnotations.ownerId, ownerId), eq(researchAnnotations.collection, collection))
    );
}

export async function getPublishedAnnotations(ownerEmail: string) {
  return getDb()
    .select()
    .from(researchAnnotations)
    .where(
      and(
        eq(researchAnnotations.ownerEmail, ownerEmail.toLowerCase()),
        eq(researchAnnotations.isPublished, true),
        eq(researchAnnotations.decision, "keep")
      )
    );
}

export async function upsertAnnotation(annotation: ResearchAnnotation) {
  await getDb()
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
        privateNotes: annotation.privateNotes,
        publicNotes: annotation.publicNotes,
        tags: annotation.tags,
        isPublished: annotation.isPublished,
        updatedAt: annotation.updatedAt,
      },
    });

  return annotation;
}
