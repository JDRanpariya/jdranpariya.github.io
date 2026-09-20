import { ThemeToggle } from "@/components/theme-toggle";
import Link from "next/link";

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
          <Link
            href="/"
            className="hidden min-h-11 items-center px-2 text-sm underline sm:inline-flex"
          >
            Questions
          </Link>
          <Link href="/index" className="inline-flex min-h-11 items-center px-2 text-sm underline">
            Index
          </Link>
          {owner ? (
            <Link
              href="/library/great-minds"
              className="inline-flex min-h-11 items-center px-2 text-sm underline"
            >
              Library
            </Link>
          ) : null}
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
