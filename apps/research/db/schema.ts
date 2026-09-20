import { index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const researchAnnotations = sqliteTable(
  "research_annotations",
  {
    ownerId: text("owner_id").notNull(),
    ownerEmail: text("owner_email").notNull(),
    collection: text("collection").notNull(),
    recordId: text("record_id").notNull(),
    decision: text("decision").notNull().default("unreviewed"),
    privateNotes: text("private_notes").notNull().default(""),
    publicNotes: text("public_notes").notNull().default(""),
    tags: text("tags").notNull().default(""),
    isPublished: integer("is_published", { mode: "boolean" }).notNull().default(false),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.ownerId, table.collection, table.recordId] }),
    index("research_annotations_public_idx").on(table.ownerEmail, table.isPublished),
  ]
);

export type ResearchAnnotation = typeof researchAnnotations.$inferSelect;
export type NewResearchAnnotation = typeof researchAnnotations.$inferInsert;
