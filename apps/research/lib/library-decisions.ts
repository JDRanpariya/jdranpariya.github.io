import type { Decision } from "./research-annotations";

// Keep legacy values in storage. Removing the Maybe control must not overwrite
// a saved decision when the owner edits only their notes.
export const visibleDecisions = [
  { value: "unreviewed", label: "Unreviewed" },
  { value: "keep", label: "Keep" },
  { value: "remove", label: "Remove" },
] as const;

export function visibleDecision(value?: string): Exclude<Decision, "maybe"> {
  return value === "keep" || value === "remove" ? value : "unreviewed";
}

export function savedDecision(value?: string): Decision {
  return value === "maybe" ? "maybe" : visibleDecision(value);
}
