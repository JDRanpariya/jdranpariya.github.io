import { getLibraryOwner, LIBRARY_OWNER_EMAIL } from "@/app/library-auth";
import { PublicResearchIndex, type PublishedRecord } from "@/components/public-research-index";
import { PublicAnalytics } from "@/components/public-analytics";
import { ResearchNavigation } from "@/components/research-navigation";
import { getPublishedAnnotations } from "@/lib/research-annotations";
import { getCatalogRecord, isCollectionId } from "@/lib/research-catalog";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Research index · Jay Ranpariya",
  description: "A selected index of researchers, labs, and research organizations.",
};

export default async function ResearchIndexPage() {
  const [annotations, owner] = await Promise.all([
    getPublishedAnnotations(LIBRARY_OWNER_EMAIL),
    getLibraryOwner(),
  ]);

  const records = annotations.flatMap((annotation) => {
    if (!isCollectionId(annotation.collection)) return [];
    const record = getCatalogRecord(annotation.collection, annotation.recordId);
    if (!record) return [];
    return [
      {
        ...record,
        publicNotes: annotation.publicNotes,
        tags: annotation.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        updatedAt: annotation.updatedAt,
      } satisfies PublishedRecord,
    ];
  });

  records.sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="min-h-screen bg-page text-ink">
      <PublicAnalytics />
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <main id="main" className="public-page">
        <ResearchNavigation current="index" />
        <header className="index-heading">
          <h1>Research index</h1>
          {owner ? (
            <a href="/library/great-minds" className="font-sans text-sm underline">
              Open library
            </a>
          ) : null}
        </header>
        <PublicResearchIndex records={records} />
      </main>
    </div>
  );
}
