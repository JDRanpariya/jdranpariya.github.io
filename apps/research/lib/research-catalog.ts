import greatMinds from "@/data/catalogs/great-minds.json";
import neuroAi from "@/data/catalogs/neuroai.json";
import rl from "@/data/catalogs/rl.json";
import { collectionIds, type CollectionId } from "@/lib/research-collections";
import { z } from "zod";

export { collectionIds, collectionMeta, isCollectionId } from "@/lib/research-collections";
export type { CollectionId } from "@/lib/research-collections";

export const fitValues = ["strong", "partial", ""] as const;
export const tierValues = ["1", "2", "3", ""] as const;

export const catalogRecordSchema = z.object({
  id: z.string().min(1),
  collection: z.enum(collectionIds),
  name: z.string().min(1),
  entityType: z.string(),
  lead: z.string(),
  institution: z.string(),
  country: z.string(),
  city: z.string(),
  url: z.string(),
  primary: z.string(),
  topics: z.array(z.string()),
  summary: z.string(),
  question: z.string(),
  questionBasis: z.string(),
  evidenceUrls: z.array(z.string()),
  status: z.string(),
  activity: z.string(),
  // Private triage fields (NeuroAI and RL). Never sent to the library or public index.
  elite: z.boolean().optional(),
  fit: z.enum(fitValues).optional(),
  tier: z.enum(tierValues).optional(),
  recruiting: z.string().optional(),
  contactRule: z.string().optional(),
  position: z.string().optional(),
});

export type CatalogRecord = z.infer<typeof catalogRecordSchema>;
export type FitValue = (typeof fitValues)[number];
export type TierValue = (typeof tierValues)[number];

const privateFields = [
  "elite",
  "fit",
  "tier",
  "recruiting",
  "contactRule",
  "position",
  "evidenceUrls",
  "activity",
] as const;
type PrivateField = (typeof privateFields)[number];
export type PublicCatalogRecord = Omit<CatalogRecord, PrivateField>;

/** Strip source-only fields before a record leaves the Worker. */
export function toPublicRecord(record: CatalogRecord): PublicCatalogRecord {
  const copy: Partial<CatalogRecord> = { ...record };
  for (const field of privateFields) delete copy[field];
  return copy as PublicCatalogRecord;
}

const catalogs: Record<CollectionId, CatalogRecord[]> = {
  "great-minds": greatMinds as CatalogRecord[],
  neuroai: neuroAi as CatalogRecord[],
  rl: rl as CatalogRecord[],
};

export function getCatalog(collection: CollectionId): CatalogRecord[] {
  return catalogs[collection];
}

export function getCatalogRecord(collection: CollectionId, id: string): CatalogRecord | undefined {
  return catalogs[collection].find((record) => record.id === id);
}
