type ResearchNavigationProps = {
  current?: "research" | "index";
};

export function ResearchNavigation({ current }: ResearchNavigationProps) {
  return (
    <nav aria-label="Research" className="research-navigation">
      <a href="/" className="research-navigation-name">
        Jay Ranpariya
      </a>
      <span className="research-navigation-links">
        <a href="/" aria-current={current === "research" ? "page" : undefined}>
          Research
        </a>
        <a href="/index" aria-current={current === "index" ? "page" : undefined}>
          Index
        </a>
      </span>
    </nav>
  );
}
