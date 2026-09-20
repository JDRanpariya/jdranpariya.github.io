import { getLibraryOwner, LIBRARY_OWNER_EMAIL } from "@/app/library-auth";
import { PublicResearchIndex, type PublishedRecord } from "@/components/public-research-index";
import { ResearchHeader } from "@/components/research-header";
import { SiteFooter } from "@/components/site-footer";
import { getPublishedAnnotations } from "@/lib/research-annotations";
import { getCatalogRecord, isCollectionId } from "@/lib/research-catalog";
import type { Metadata } from "next";
import Link from "next/link";

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
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <ResearchHeader owner={Boolean(owner)} />
      <main id="main" className="page-frame page-main">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="ui-label">Selected work</p>
            <h1 className="mt-2 text-[32px] font-bold leading-tight tracking-[-0.025em]">
              Research index
            </h1>
          </div>
          {owner ? (
            <Link href="/library/great-minds" className="text-sm underline">
              Edit library
            </Link>
          ) : null}
        </header>
        <PublicResearchIndex records={records} />
      </main>
      <SiteFooter />
    </div>
  );
}
