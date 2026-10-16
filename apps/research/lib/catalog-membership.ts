import aliases from "@/data/catalogs/membership-aliases.json";

type SavedRecord = { recordId: string; collection: string };

/** Keep a moved note available until its destination has its own saved row.
 * Existing destination edits always take precedence; source rows stay in D1.
 */
export function inheritMovedAnnotations<T extends SavedRecord>(
  destination: T[],
  source: T[],
  moves: { sourceId: string; destinationId: string }[] = aliases
): T[] {
  const output = [...destination];
  const present = new Set(destination.map((row) => row.recordId));
  const old = new Map(source.map((row) => [row.recordId, row]));
  for (const move of moves) {
    const saved = old.get(move.sourceId);
    if (saved && !present.has(move.destinationId)) {
      output.push({ ...saved, collection: "rl", recordId: move.destinationId });
      present.add(move.destinationId);
    }
  }
  return output;
}

export const hasMembershipMoves = aliases.length > 0;
