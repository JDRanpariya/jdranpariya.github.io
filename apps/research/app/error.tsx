"use client";

import { ResearchHeader } from "@/components/research-header";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="min-h-screen bg-bg text-ink">
      <ResearchHeader />
      <main className="page-frame py-16 md:py-24">
        <p className="ui-label">Error</p>
        <h1 className="mt-2 text-4xl font-bold">This page could not be loaded.</h1>
        <p className="mt-5 max-w-xl text-ink-secondary">
          Try the request again. Your saved library data is unaffected.
        </p>
        <button type="button" onClick={reset} className="ui-button mt-7">
          Try again
        </button>
      </main>
    </div>
  );
}
