import { ResearchNavigation } from "@/components/research-navigation";
import { ResearchNotes } from "@/components/research-notes";
import { researchThemes } from "@/data/research-themes";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ notes?: string | string[] }>;
}) {
  const params = await searchParams;
  const requestedPath = Array.isArray(params.notes)
    ? params.notes
    : params.notes
      ? [params.notes]
      : [];
  const validSlugs = new Set(researchThemes.map((theme) => theme.slug));
  const initialPath = requestedPath.filter((slug) => validSlugs.has(slug));

  return (
    <div className="min-h-screen bg-page text-ink">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <main id="main" className="research-notes-page">
        <div className="research-notes-navigation">
          <ResearchNavigation current="research" />
        </div>
        <ResearchNotes initialPath={initialPath} />
      </main>
    </div>
  );
}
