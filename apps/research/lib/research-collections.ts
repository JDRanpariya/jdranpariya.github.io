// Collection identifiers and labels. Kept free of catalog imports so client
// islands can use them without bundling the source catalogs.
export const collectionIds = ["great-minds", "neuroai", "rl"] as const;
export type CollectionId = (typeof collectionIds)[number];

export const collectionMeta: Record<CollectionId, { label: string; noun: string }> = {
  "great-minds": { label: "Great minds", noun: "people" },
  neuroai: { label: "NeuroAI", noun: "groups" },
  rl: { label: "Reinforcement learning", noun: "labs" },
};

export function isCollectionId(value: string): value is CollectionId {
  return collectionIds.includes(value as CollectionId);
}
