# Project: Personal Site

## What this is
Personal website and digital garden for Jaydeep (Jay) Ranpariya. A place to write in public, share book/lecture notes, showcase projects, and log long-running explorations ("odysseys"). Audience is future collaborators, like-minded curious people, and Jay himself as a forcing function for clear thinking. Live at jdranpariya.github.io; structure is settled, several articles still WIP, construction banner still up.

## Stack
- **SSG:** Eleventy 3 (Nunjucks + Markdown)
- **Styling:** Tailwind 3 + PostCSS + PurgeCSS (prod only)
- **Runtime:** Bun
- **Hosting:** GitHub Pages via GitHub Actions
- **Analytics:** Umami (self-hosted on Vercel, loaded dynamically in base.njk)
- **Guestbook:** Google Forms → hidden iframe submit
- **Markdown:** markdown-it + anchor, footnote, KaTeX, obsidian-callouts, Prism syntax-highlight, container (`::: note`, `::: references`)
- **Fonts:** Merriweather (serif), Inter (sans) via Google Fonts

## Current milestone
Finish WIP articles (knowledge-hoarding essay, differentiable sim, education reforms, recipe-for-life), remove the "under construction" banner, and consider the site stable v1.
Only I do the writing not llms/agents

## Key constraints
- Zero budget — GitHub Pages free tier, free Umami/Vercel tier
- Purely static (no SSR, no server)
- All content is in-repo Markdown (no CMS)
- CI builds via `bun run build:prod`

## File structure
```
src/                        → Eleventy input root
  _includes/
    layouts/
      base.njk              → Master HTML shell, dark-mode, nav, analytics
      post.njk              → Article layout (TOC, footnotes, content)
    components/             → Reusable partials (nav, footer, project_card, etc.)
  _data/guestbook.json      → Manual guestbook entries
  css/input.css             → Tailwind entry → build/css/style.css
  writings/                 → Blog essays (.md)
  library/
    books/                  → Book notes
    lectures/               → Lecture notes
    papers/                 → Paper notes
  odysseys/                 → Long-form explorations (sub-folders per odyssey)
  projects/                 → Project write-ups
  now/updates/              → /now page entries (date-stamped .md)
  *.njk                     → Top-level pages (index, about, library, etc.)
assets/                     → Images, logos (passed through to build/)
.eleventy.js                → Collections, filters, markdown-it config, HTML minification
```
