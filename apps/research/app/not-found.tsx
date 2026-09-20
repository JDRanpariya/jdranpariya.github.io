import { ResearchHeader } from "@/components/research-header";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-bg text-ink">
      <ResearchHeader />
      <main className="page-frame py-16 md:py-24">
        <p className="ui-label">404</p>
        <h1 className="mt-2 text-4xl font-bold">Page not found.</h1>
        <p className="mt-5 max-w-xl text-ink-secondary">
          The page may have moved, or this part of the research library may be private.
        </p>
        <Link href="/" className="ui-button-secondary mt-7">
          Return to research questions
        </Link>
      </main>
    </div>
  );
}
