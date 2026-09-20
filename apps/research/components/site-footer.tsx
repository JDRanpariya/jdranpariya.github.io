import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="page-frame footer-inner">
        <p>Jay Ranpariya · Erlangen, Germany</p>
        <nav aria-label="Elsewhere">
          <Link href="/index">Research index</Link>
          <a href="https://jdranpariya.com">jdranpariya.com</a>
          <a href="https://github.com/jdranpariya" target="_blank" rel="noreferrer">
            GitHub
          </a>
          <a href="https://linkedin.com/in/jdranpariya" target="_blank" rel="noreferrer">
            LinkedIn
          </a>
        </nav>
      </div>
    </footer>
  );
}
