import type { PublicCatalogRecord } from "@/lib/research-catalog";

export function GreatMindResources({ record }: { record: PublicCatalogRecord }) {
  if (!record.perspective || !record.readingPaths?.length) return null;
  return (
    <section className="mt-4" aria-label="Approach and reading">
      <p className="text-[0.9375rem] leading-7 text-ink-secondary">{record.perspective}</p>
      {record.perspectiveSourceUrl ? (
        <a
          href={record.perspectiveSourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="lab-resource-link mt-1 inline-block font-sans text-xs"
        >
          Source
        </a>
      ) : null}
      <h3 className="ui-label mt-5">Start with</h3>
      <ul className="mt-2 space-y-4">
        {record.readingPaths.map((work) => (
          <li key={`${work.title}:${work.url}`}>
            <a
              href={work.url}
              target="_blank"
              rel="noopener noreferrer"
              className="lab-resource-link text-[0.9375rem] leading-6"
            >
              {work.title}
            </a>
            <p className="mt-1 font-sans text-xs leading-5 text-ink-muted">
              {[work.kind.replaceAll("_", " "), work.yearLabel].filter(Boolean).join(" · ")}
            </p>
            <p className="mt-1 text-[0.9375rem] leading-7 text-ink-secondary">{work.whyRead}</p>
            {work.accessNote ? (
              <p className="mt-1 font-sans text-xs leading-5 text-ink-muted">{work.accessNote}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
