import { ResearchNavigation } from "@/components/research-navigation";
import { ResearchNotes } from "@/components/research-notes";
import researchHomeMarkdown from "@/content/research-home.md?raw";
import { parseResearchHome } from "@/lib/research-home";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ notes?: string | string[]; noteFocus?: string }>;
}) {
  const params = await searchParams;
  const requestedPath = Array.isArray(params.notes)
    ? params.notes
    : params.notes
      ? [params.notes]
      : [];
  const researchHome = parseResearchHome(researchHomeMarkdown);
  const validSlugs = new Set(researchHome.themes.map((theme) => theme.slug));
  const initialPath = requestedPath.filter((slug) => validSlugs.has(slug));
  const requestedFocus = Number.parseInt(params.noteFocus ?? String(initialPath.length), 10);
  const initialFocus = Number.isFinite(requestedFocus)
    ? Math.max(0, Math.min(requestedFocus, initialPath.length))
    : initialPath.length;

  return (
    <div className="min-h-screen bg-page text-ink">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <main id="main" className="research-notes-page">
        <div className="research-notes-navigation">
          <ResearchNavigation current="research" />
        </div>
        <ResearchNotes
          initialDocument={researchHome}
          initialFocus={initialFocus}
          initialPath={initialPath}
        />
      </main>
    </div>
  );
}
