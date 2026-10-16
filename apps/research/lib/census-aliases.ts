import aliases from "@/data/catalogs/census-aliases.json";

type SavedRecord = { collection: string; recordId: string };
type Alias = { collection: string; sourceId: string; destinationId: string };

/** Resolve duplicate catalog identities in memory. D1 source rows stay intact;
 * an explicit destination edit always wins, including a decision to unpublish.
 */
export function inheritCensusAnnotations<T extends SavedRecord>(
  rows: T[],
  mappings: Alias[] = aliases
): T[] {
  const key = (collection: string, id: string) => `${collection}:${id}`;
  const sourceKeys = new Set(mappings.map((a) => key(a.collection, a.sourceId)));
  const saved = new Map(rows.map((row) => [key(row.collection, row.recordId), row]));
  const output = rows.filter((row) => !sourceKeys.has(key(row.collection, row.recordId)));
  const present = new Set(output.map((row) => key(row.collection, row.recordId)));
  for (const alias of mappings) {
    const destination = key(alias.collection, alias.destinationId);
    const original = saved.get(key(alias.collection, alias.sourceId));
    if (original && !present.has(destination)) {
      output.push({ ...original, recordId: alias.destinationId });
      present.add(destination);
    }
  }
  return output;
}
