import type { PublicCatalogRecord } from "./research-catalog";

export type PublishedRecord = PublicCatalogRecord & {
  publicNotes: string;
  tags: string[];
  updatedAt: string;
};
