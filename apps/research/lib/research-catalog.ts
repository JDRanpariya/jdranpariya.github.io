import greatMinds from "@/data/catalogs/great-minds.json";
import neuroAi from "@/data/catalogs/neuroai.json";

export const collectionIds = ["great-minds", "neuroai"] as const;
export type CollectionId = (typeof collectionIds)[number];

export type CatalogRecord = {
  id: string;
  collection: CollectionId;
  name: string;
  entityType: string;
  lead: string;
  institution: string;
  country: string;
  city: string;
  url: string;
  primary: string;
  topics: string[];
  summary: string;
  question: string;
  questionBasis: string;
  evidenceUrls: string[];
  status: string;
  activity: string;
};

export const collectionMeta: Record<CollectionId, { label: string; noun: string }> = {
  "great-minds": { label: "Great minds", noun: "people" },
  neuroai: { label: "NeuroAI", noun: "groups" },
};

const catalogs: Record<CollectionId, CatalogRecord[]> = {
  "great-minds": greatMinds as CatalogRecord[],
  neuroai: neuroAi as CatalogRecord[],
};

export function isCollectionId(value: string): value is CollectionId {
  return collectionIds.includes(value as CollectionId);
}

export function getCatalog(collection: CollectionId): CatalogRecord[] {
  return catalogs[collection];
}

export function getCatalogRecord(collection: CollectionId, id: string): CatalogRecord | undefined {
  return catalogs[collection].find((record) => record.id === id);
}
