import { ResearchHeader } from "@/components/research-header";
import { SiteFooter } from "@/components/site-footer";
import { researchThemes } from "@/data/research-themes";

export default function Home() {
  return (
    <div className="min-h-screen bg-page text-ink">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <ResearchHeader />
      <main id="main" className="page-frame page-main">
        <article className="research-index">
          <header className="research-intro">
            <h1>Jay Ranpariya</h1>
            <h2>information, compression and learning dynamics</h2>
            <p>
              Anything you can formalize can be simulated, and substrate only matters for cost:
              energy, time, parallelism, and noise tolerance.{" "}
              <em>
                A mechanism carries over if the constraint that made it worthwhile still holds on
                the new substrate.
              </em>
            </p>
            <p>
              I want to understand how intelligent systems learn to perceive, act, remember, and
              adapt in the physical world, and which principles from biological intelligence can
              help us build better ones.
            </p>
          </header>

          <ul className="theme-list">
            {researchThemes.map((theme) => (
              <li key={theme.title}>
                <strong>{theme.title}:</strong> {theme.questions}
              </li>
            ))}
          </ul>
        </article>
      </main>

      <SiteFooter />
    </div>
  );
}
