import { ThemeToggle } from "@/components/theme-toggle";

export function ResearchHeader({ owner = false }: { owner?: boolean }) {
  return (
    <header className="border-b border-border font-sans">
      <div className="page-frame flex min-h-20 items-center justify-between gap-5 py-3">
        <a
          href="https://jdranpariya.com"
          className="inline-flex min-h-11 items-center font-heading text-2xl text-ink no-underline"
          aria-label="Jay Ranpariya, personal site"
        >
          <span aria-hidden="true">=^.^=</span>
        </a>
        <nav aria-label="Research site" className="flex items-center gap-1 sm:gap-4">
          <a
            href="/"
            className="hidden min-h-11 items-center px-2 text-sm underline sm:inline-flex"
          >
            Questions
          </a>
          <a href="/index" className="inline-flex min-h-11 items-center px-2 text-sm underline">
            Index
          </a>
          {owner ? (
            <a
              href="/library/great-minds"
              className="inline-flex min-h-11 items-center px-2 text-sm underline"
            >
              Library
            </a>
          ) : null}
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
