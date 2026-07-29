---
title: "Bardentreffen 2026"
published: 2026-07-29
lastUpdated: 2026-07-29
tags: ["music", "festival", "nuremberg"]
status: "published"
section: "notes"
layout: layouts/base.njk
templateEngineOverride: njk
description: "Bardentreffen 2026 programme — 95 acts across 8 stages, 30 July to 2 August in Nürnberg. Compiled by Blerta."
ogImage: "/assets/og/bardentreffen-2026.png"
---

{#
Bardentreffen 2026 programme.

Not one of Jay's own notes — this is Blerta's festival guide, hosted here so it
has a link that survives a group chat. The schedule lives in
src/_data/bardentreffen.json, transcribed from the .xlsx she circulated
(stage columns, time rows, one fill colour per genre, one hyperlink per act).

She sent this as a first draft, so expect a corrected one. To reimport:
python3 scripts/import-bardentreffen.py <the new .xlsx>
Nothing here is hardcoded to the current programme — stages, days, times and
genres all come from the data file.

Rendered server-side on purpose: the whole programme is in the HTML, so it
works with JS off and prints in one pass. JS only adds day tabs, the two view
modes, filtering, and the "on now" marker. Everything degrades to "all four
days, by time" without it.

templateEngineOverride: njk — this is a .md file so it lands in
collections.notes (globbed as src/notes/*.md), but the body is HTML, not
markdown, so Nunjucks runs alone.
#}

<style>
  /* Scoped to .bt — this page ships its own CSS rather than growing input.css,
     since nothing here is reused elsewhere on the site. Colours come from the
     site's own tokens so the page flips with the global theme toggle. */
  /* Genre hues, retuned from the pastel cell fills in the source spreadsheet.
     Those pastels are unreadable as text, so each is darkened (light) or
     lightened (dark) to clear 4.5:1 against --color-surface in both themes. */
  .bt {
    --g-folk: #8f4a10;
    --g-world: #2f5c92;
    --g-vocal: #71427c;
    --g-kids: #356030;
    --g-spoken: #7a5c05;
    /* Height of the sticky bar, so scroll-margin lands headings below it
       rather than under it. Two rows on a phone, one on a wide screen. */
    --bar-h: 7.75rem;
    --font-ui: system-ui, -apple-system, "Segoe UI", sans-serif;
    --font-head: Fraunces, ui-serif, Georgia, serif;
  }
  @media (min-width: 860px) { .bt { --bar-h: 4.75rem; } }
  .dark .bt {
    --g-folk: #e5a463;
    --g-world: #93b8e8;
    --g-vocal: #cba3d6;
    --g-kids: #93c78a;
    --g-spoken: #d9bb64;
  }
  .bt [data-genre="folk"] { --gc: var(--g-folk); }
  .bt [data-genre="world"] { --gc: var(--g-world); }
  .bt [data-genre="vocal"] { --gc: var(--g-vocal); }
  .bt [data-genre="kids"] { --gc: var(--g-kids); }
  .bt [data-genre="spoken"] { --gc: var(--g-spoken); }

  .bt {
    max-width: 84rem;
    margin: 0 auto;
    padding: 2.25rem 1rem 4rem;
    font-family: var(--font-ui);
    overflow-x: clip; /* nothing here should ever push the page sideways */
  }
  @media (min-width: 768px) { .bt { padding: 4rem 1.5rem 6rem; } }

  /* Long labels on wide screens, short ones on phones — same button. */
  .bt-lbl-short { display: inline; }
  .bt-lbl-full { display: none; }
  @media (min-width: 640px) {
    .bt-lbl-short { display: none; }
    .bt-lbl-full { display: inline; }
  }

  /* ── Hero ─────────────────────────────────────────────────────────── */
  .bt-hero {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 1.5rem;
  }
  @media (min-width: 700px) {
    .bt-hero { flex-direction: row; text-align: left; gap: 2.25rem; align-items: center; }
  }
  .bt-badge {
    width: 7rem;
    height: 7rem;
    flex: none;
    border-radius: 9999px;
    box-shadow: var(--shadow-md);
  }
  @media (min-width: 700px) { .bt-badge { width: 10.5rem; height: 10.5rem; } }
  .bt-eyebrow {
    font-size: 0.75rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--color-ink-muted);
    margin: 0 0 0.6rem;
  }
  .bt-title {
    font-family: var(--font-head);
    font-size: clamp(1.9rem, 7vw, 3.5rem);
    line-height: 1.05;
    letter-spacing: -0.02em;
    font-weight: 700;
    color: var(--color-ink);
    margin: 0;
  }
  .bt-lead {
    font-size: 1.0625rem;
    line-height: 1.6;
    color: var(--color-ink-secondary);
    margin: 0.85rem 0 0;
    max-width: 34rem;
  }
  .bt-byline {
    font-size: 0.9375rem;
    color: var(--color-ink-muted);
    margin: 0.85rem 0 0;
  }
  .bt-byline strong { color: var(--color-ink); font-weight: 600; }
  .bt-heart { color: var(--color-accent); }

  .bt-notice {
    display: flex;
    gap: 0.85rem;
    align-items: flex-start;
    margin: 2.5rem 0 0;
    padding: 0.9rem 1.1rem;
    border: 1px solid var(--color-border);
    border-left: 3px solid var(--color-accent);
    border-radius: 8px;
    background: var(--color-surface);
    font-size: 0.9375rem;
    line-height: 1.6;
    color: var(--color-ink-secondary);
  }
  .bt-notice img { width: 2.5rem; height: 2.5rem; flex: none; margin-top: -0.15rem; }
  @media (min-width: 640px) { .bt-notice img { width: 3rem; height: 3rem; } }
  .bt-notice__quote { font-style: italic; }
  .bt-notice__cite {
    display: block;
    margin-top: 0.3rem;
    font-style: normal;
    font-size: 0.8125rem;
    color: var(--color-ink-muted);
  }

  /* ── Sticky control bar ───────────────────────────────────────────────
     Phone: two stacked rows — a 4-up day selector, then search + view.
     ≥860px: one row, days left, tools right. Kept short either way, since
     it eats the top of the viewport for the whole scroll. */
  .bt-bar {
    position: sticky;
    top: 0;
    z-index: 20;
    margin: 2rem 0 0;
    padding: 0.6rem 0;
    background: var(--color-bg);
    border-bottom: 1px solid var(--color-border);
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  @media (min-width: 860px) {
    .bt-bar { flex-direction: row; align-items: center; justify-content: space-between; padding: 0.75rem 0; }
  }

  /* Segmented control: one rounded well, four equal segments, the active one
     filled. Full width on a phone so each segment is an easy target. */
  .bt-days {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 2px;
    padding: 3px;
    border: 1px solid var(--color-border);
    border-radius: 10px;
    background: var(--color-surface);
  }
  @media (min-width: 860px) { .bt-days { display: inline-grid; grid-auto-columns: minmax(4.75rem, auto); } }
  .bt-day-tab {
    font: inherit;
    font-size: 0.8125rem;
    font-weight: 600;
    min-height: 2.25rem;
    padding: 0.35rem 0.5rem;
    border: 0;
    border-radius: 7px;
    background: transparent;
    color: var(--color-ink-secondary);
    cursor: pointer;
    transition: background var(--duration-fast), color var(--duration-fast);
    white-space: nowrap;
  }
  @media (min-width: 860px) { .bt-day-tab { font-size: 0.875rem; padding: 0.35rem 1rem; } }
  .bt-day-tab:hover { color: var(--color-ink); }
  .bt-day-tab[aria-selected="true"] {
    background: var(--color-ink);
    color: var(--color-bg);
    box-shadow: var(--shadow-xs);
  }

  /* Wraps rather than squeezing the search box to nothing on a narrow phone. */
  .bt-tools { display: flex; gap: 0.4rem; align-items: center; flex-wrap: wrap; }
  .bt-search {
    font: inherit;
    font-size: 16px; /* anything smaller makes iOS Safari zoom on focus */
    flex: 1 1 7rem;
    min-width: 6rem;
    min-height: 2.5rem;
    padding: 0.4rem 0.85rem;
    border-radius: 9999px;
    border: 1px solid var(--color-border);
    background: var(--color-surface);
    color: var(--color-ink);
    -webkit-appearance: none;
    appearance: none;
  }
  @media (min-width: 860px) { .bt-search { font-size: 0.875rem; flex: 0 0 13rem; width: 13rem; } }
  .bt-search::placeholder { color: var(--color-ink-muted); }
  .bt-search:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 1px; }

  .bt-seg {
    display: inline-flex;
    flex: none;
    border: 1px solid var(--color-border);
    border-radius: 9999px;
    overflow: hidden;
  }
  .bt-seg button {
    font: inherit;
    font-size: 0.8125rem;
    min-height: 2.5rem;
    padding: 0.4rem 0.8rem;
    background: transparent;
    color: var(--color-ink-secondary);
    border: 0;
    cursor: pointer;
    white-space: nowrap;
  }
  .bt-seg button[aria-pressed="true"] { background: var(--color-ink); color: var(--color-bg); }

  .bt-now-btn {
    font: inherit;
    font-size: 0.8125rem;
    flex: none;
    min-height: 2.5rem;
    padding: 0.4rem 0.8rem;
    border-radius: 9999px;
    border: 1px solid var(--color-accent);
    background: transparent;
    color: var(--color-accent);
    cursor: pointer;
    white-space: nowrap;
  }
  .bt-now-btn:hover { background: var(--color-accent); color: var(--color-bg); }

  .bt-picks-btn {
    font: inherit;
    font-size: 0.8125rem;
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    flex: none;
    min-height: 2.5rem;
    padding: 0.4rem 0.7rem;
    border-radius: 9999px;
    border: 1px solid var(--color-border);
    background: transparent;
    color: var(--color-ink-secondary);
    cursor: pointer;
    white-space: nowrap;
  }
  .bt-picks-btn svg { width: 0.9rem; height: 0.9rem; fill: none; stroke: currentColor; stroke-width: 1.6; }
  .bt-picks-btn:hover { color: var(--color-ink); background: var(--color-surface); }
  .bt-picks-btn[aria-pressed="true"] {
    background: var(--color-ink);
    border-color: var(--color-ink);
    color: var(--color-bg);
  }
  .bt-picks-btn[aria-pressed="true"] svg { fill: currentColor; }
  .bt-picks-count {
    font-size: 0.6875rem;
    font-variant-numeric: tabular-nums;
    padding: 0 0.35rem;
    border-radius: 9999px;
    background: var(--color-surface);
    color: var(--color-ink-secondary);
  }
  .bt-picks-btn[aria-pressed="true"] .bt-picks-count { background: rgba(255, 255, 255, 0.2); color: inherit; }

  /* ── Legend / filters ─────────────────────────────────────────────── */
  .bt-filters { margin: 1rem 0 0; }
  .bt-filters__label {
    font-size: 0.6875rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--color-ink-muted);
    margin: 0 0 0.45rem;
  }
  .bt-chips { display: flex; flex-wrap: wrap; gap: 0.3rem; margin: 0; padding: 0; list-style: none; }

  .bt-details { margin: 0.4rem 0 0; }
  .bt-details > summary {
    font-size: 0.8125rem;
    color: var(--color-ink-secondary);
    cursor: pointer;
    padding: 0.4rem 0;
    list-style: none;
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
  }
  .bt-details > summary::-webkit-details-marker { display: none; }
  .bt-details > summary::before {
    content: "▸";
    color: var(--color-ink-muted);
    transition: transform var(--duration-fast);
  }
  .bt-details[open] > summary::before { content: "▾"; }
  .bt-details > summary:hover { color: var(--color-ink); }
  .bt-details .bt-chips { margin-top: 0.5rem; }
  .bt-chip {
    font: inherit;
    font-size: 0.8125rem;
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    min-height: 2.1rem;
    padding: 0.3rem 0.7rem;
    border-radius: 9999px;
    border: 1px solid var(--color-border);
    background: transparent;
    color: var(--color-ink-secondary);
    cursor: pointer;
  }
  .bt-chip::before {
    content: "";
    width: 0.55rem;
    height: 0.55rem;
    border-radius: 9999px;
    background: var(--gc, var(--color-ink-muted));
    flex: none;
  }
  .bt-chip--stage::before { display: none; }
  .bt-chip:hover { background: var(--color-surface); color: var(--color-ink); }
  .bt-chip[aria-pressed="true"] {
    border-color: var(--gc, var(--color-ink));
    background: var(--color-surface);
    color: var(--color-ink);
    font-weight: 600;
  }
  .bt-reset {
    font: inherit;
    font-size: 0.8125rem;
    background: none;
    border: 0;
    padding: 0.35rem 0.4rem;
    color: var(--color-accent);
    cursor: pointer;
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  /* ── Day panels ───────────────────────────────────────────────────── */
  .bt-day-heading {
    font-family: var(--font-head);
    font-size: 1.3rem;
    font-weight: 700;
    color: var(--color-ink);
    margin: 1.5rem 0 0.15rem;
    scroll-margin-top: var(--bar-h);
  }
  @media (min-width: 640px) { .bt-day-heading { font-size: 1.5rem; margin-top: 2.25rem; } }
  .bt-day-sub { font-size: 0.8125rem; color: var(--color-ink-muted); margin: 0 0 1rem; }

  .bt-view[data-view="stage"] { display: none; }
  .bt[data-view="stage"] .bt-view[data-view="stage"] { display: block; }
  .bt[data-view="stage"] .bt-view[data-view="time"] { display: none; }

  /* ── By time ──────────────────────────────────────────────────────── */
  .bt-slots { list-style: none; margin: 0; padding: 0; }
  .bt-slot {
    display: grid;
    grid-template-columns: 2.9rem minmax(0, 1fr);
    gap: 0 0.6rem;
    padding-bottom: 0.9rem;
  }
  @media (min-width: 640px) { .bt-slot { grid-template-columns: 4.5rem minmax(0, 1fr); gap: 0 1.25rem; padding-bottom: 1.1rem; } }
  .bt-slot__time {
    font-variant-numeric: tabular-nums;
    font-size: 0.875rem;
    font-weight: 700;
    color: var(--color-ink);
    text-align: right;
    padding-top: 0.6rem;
    scroll-margin-top: var(--bar-h);
  }
  @media (min-width: 640px) { .bt-slot__time { font-size: 0.9375rem; font-weight: 600; padding-top: 0.65rem; } }
  /* One card per row on a phone; fills out to a real grid as width allows. */
  .bt-acts {
    list-style: none;
    margin: 0;
    padding: 0 0 0 0.8rem;
    border-left: 1px solid var(--color-border);
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 0.45rem;
    position: relative;
  }
  @media (min-width: 640px) {
    .bt-acts {
      padding-left: 1.1rem;
      grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr));
      gap: 0.5rem;
    }
  }
  .bt-acts::before {
    content: "";
    position: absolute;
    left: -0.3rem;
    top: 0.95rem;
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 9999px;
    background: var(--color-border);
  }

  .bt-act {
    border: 1px solid var(--color-border);
    border-left: 3px solid var(--gc, var(--color-border));
    border-radius: 8px;
    background: var(--color-surface);
    padding: 0.5rem 0.7rem;
    min-width: 0;
  }
  @media (min-width: 640px) { .bt-act { padding: 0.6rem 0.8rem; } }
  /* Card body takes the space, the star sits at the trailing edge. The stage
     view adds a leading time column, so it overrides the columns below. */
  .bt-view[data-view="time"] .bt-act { display: flex; align-items: flex-start; gap: 0.4rem; }
  .bt-act__body { min-width: 0; flex: 1 1 auto; }

  .bt-star {
    flex: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.9rem;
    height: 1.9rem;
    margin: -0.15rem -0.25rem 0 0;
    padding: 0;
    border: 0;
    border-radius: 9999px;
    background: transparent;
    color: var(--color-ink-muted);
    cursor: pointer;
    transition: color var(--duration-fast), transform var(--duration-fast);
  }
  .bt-star svg { width: 1.05rem; height: 1.05rem; fill: none; stroke: currentColor; stroke-width: 1.5; }
  .bt-star:hover { color: var(--color-accent); }
  .bt-star[aria-pressed="true"] { color: var(--color-accent); }
  .bt-star[aria-pressed="true"] svg { fill: currentColor; }
  .bt-star:active { transform: scale(0.88); }
  @media (prefers-reduced-motion: reduce) { .bt-star { transition: none; } }
  .bt-act__name {
    font-size: 0.9375rem;
    font-weight: 600;
    line-height: 1.3;
    color: var(--color-ink);
    text-decoration: none;
    overflow-wrap: anywhere;
  }
  a.bt-act__name { text-decoration: underline; text-decoration-color: var(--color-border); text-underline-offset: 3px; }
  a.bt-act__name:hover { color: var(--color-accent); text-decoration-color: currentColor; }
  .bt-act__country {
    font-size: 0.6875rem;
    letter-spacing: 0.04em;
    color: var(--color-ink-muted);
    white-space: nowrap;
  }
  .bt-act__meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.35rem;
    margin-top: 0.2rem;
    font-size: 0.75rem;
    color: var(--color-ink-muted);
  }
  .bt-act__meta svg { width: 0.75rem; height: 0.75rem; flex: none; }
  .bt-act__genre { color: var(--gc); font-weight: 500; }
  .bt-act__dot { color: var(--color-border); }

  .bt-act.is-now { box-shadow: 0 0 0 2px var(--color-accent); }
  .bt-nowpill {
    display: inline-block;
    font-size: 0.625rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    font-weight: 700;
    padding: 0.1rem 0.4rem;
    border-radius: 9999px;
    background: var(--color-accent);
    color: var(--color-bg);
    margin-left: 0.4rem;
    vertical-align: 0.1em;
  }

  /* ── By stage ─────────────────────────────────────────────────────── */
  .bt-stages-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr));
    gap: 1.25rem;
  }
  .bt-stagegroup { min-width: 0; }
  .bt-stagegroup__head {
    font-size: 0.9375rem;
    font-weight: 700;
    color: var(--color-ink);
    margin: 0 0 0.6rem;
    padding-bottom: 0.4rem;
    border-bottom: 2px solid var(--color-border);
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }
  .bt-stagegroup__head a { color: inherit; text-decoration: none; display: inline-flex; align-items: center; gap: 0.35rem; }
  .bt-stagegroup__head a:hover { color: var(--color-accent); }
  .bt-stagegroup ol { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.4rem; }
  .bt-stagegroup .bt-act {
    display: grid;
    grid-template-columns: 3.1rem minmax(0, 1fr) auto;
    gap: 0.5rem;
    align-items: start;
  }
  .bt-stagegroup .bt-act__time { padding-top: 0.1rem; }
  .bt-stagegroup .bt-act__time {
    font-variant-numeric: tabular-nums;
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--color-ink-muted);
  }

  /* ── Stage map list ───────────────────────────────────────────────── */
  .bt-section-title {
    font-family: var(--font-head);
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--color-ink);
    margin: 3.5rem 0 1rem;
  }
  .bt-maplist { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(13rem, 1fr)); gap: 0.5rem; }
  .bt-maplist a {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.6rem 0.8rem;
    border: 1px solid var(--color-border);
    border-radius: 8px;
    background: var(--color-surface);
    color: var(--color-ink);
    text-decoration: none;
    font-size: 0.875rem;
  }
  .bt-maplist a:hover { border-color: var(--color-accent); color: var(--color-accent); }
  .bt-maplist svg { width: 0.9rem; height: 0.9rem; flex: none; color: var(--color-ink-muted); }
  .bt-maplist a:hover svg { color: var(--color-accent); }

  .bt-empty { display: none; padding: 2rem 0; color: var(--color-ink-muted); font-size: 0.9375rem; }
  .bt-empty.is-visible { display: block; }

  .bt-colophon {
    margin: 3.5rem 0 0;
    padding-top: 1.5rem;
    border-top: 1px solid var(--color-border);
    font-size: 0.875rem;
    line-height: 1.7;
    color: var(--color-ink-muted);
  }
  /* Underlined, not just tinted — colour alone doesn't mark a link inside a
     block of text (WCAG 1.4.1). */
  .bt-colophon a {
    color: var(--color-accent);
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .bt-colophon__quote { font-style: italic; color: var(--color-ink-secondary); }
  .bt-colophon__meta { display: block; margin-top: 0.3rem; }

  /* Print: one continuous programme, no chrome. */
  @media print {
    .bt-bar, .bt-filters, .bt-now-btn, .bt-empty { display: none !important; }
    .bt-day[hidden] { display: block !important; }
    .bt-view[data-view="stage"] { display: none !important; }
    .bt-day-heading { break-after: avoid; }
    .bt-slot { break-inside: avoid; }
  }
</style>

<div class="bt" data-view="time">
  <header class="bt-hero">
    <img
      class="bt-badge"
      src="/assets/images/bardentreffen/blerta-badge.webp"
      width="440"
      height="440"
      alt="Blerta's Festival Guide 2026"
    />
    <div>
      <p class="bt-eyebrow">Nürnberg · 30 July – 2 August 2026</p>
      <h1 class="bt-title">Bardentreffen 2026</h1>
      <p class="bt-lead">
        {{ bardentreffen.totalActs }} acts · {{ bardentreffen.totalStages }} stages · four days
      </p>
      <p class="bt-byline">
        Made with <span class="bt-heart" aria-hidden="true">♥</span><span class="sr-only">love</span>
        by <strong>Blerta</strong>
      </p>
    </div>
  </header>

  <blockquote class="bt-notice">
    <img
      src="/assets/images/bardentreffen/blerta-cat.webp"
      width="201"
      height="220"
      alt=""
      aria-hidden="true"
      loading="lazy"
    />
    <span>
      <span class="bt-notice__quote"
        >This is the first draft and I haven’t proofread it yet, so please ignore the mistakes you
        might come across. U.U</span
      >
      <cite class="bt-notice__cite">— Blerta</cite>
    </span>
  </blockquote>

  <!-- Controls. Rendered without [hidden] so a JS-less visitor still gets the
       full four-day programme below; the script takes over from here. -->
  <div class="bt-bar">
    <div class="bt-days" role="tablist" aria-label="Festival day">
      {% for day in bardentreffen.days %}
        <button
          type="button"
          class="bt-day-tab"
          role="tab"
          id="bt-tab-{{ day.iso }}"
          aria-controls="bt-day-{{ day.iso }}"
          aria-selected="{{ 'true' if loop.first else 'false' }}"
          data-day="{{ day.iso }}"
        >
          {{ day.short }}
        </button>
      {% endfor %}
    </div>

    <div class="bt-tools">
      <label class="sr-only" for="bt-search">Search artists and stages</label>
      <input
        type="search"
        id="bt-search"
        class="bt-search"
        placeholder="Search…"
        autocomplete="off"
      />
      <div class="bt-seg" role="group" aria-label="View mode">
        <button type="button" data-viewbtn="time" aria-pressed="true">
          <span class="bt-lbl-short">Time</span><span class="bt-lbl-full">By time</span>
        </button>
        <button type="button" data-viewbtn="stage" aria-pressed="false">
          <span class="bt-lbl-short">Stage</span><span class="bt-lbl-full">By stage</span>
        </button>
      </div>
      <button type="button" class="bt-picks-btn" id="bt-picks" aria-pressed="false" hidden>
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 1.6l2.47 5.2 5.53.8-4 4.03.94 5.77L10 14.7l-4.94 2.7.94-5.77-4-4.03 5.53-.8z"/></svg>
        <span class="bt-lbl-short">Picks</span><span class="bt-lbl-full">My Picks</span>
        <span class="bt-picks-count" id="bt-picks-count">0</span>
      </button>
      <button type="button" class="bt-now-btn" id="bt-now" hidden>Now</button>
    </div>

  </div>

  <div class="bt-filters">
    <p class="bt-filters__label">Genres</p>
    <ul class="bt-chips">
      {% for g in bardentreffen.genres %}
        <li>
          <button type="button" class="bt-chip" data-genre="{{ g.id }}" data-filter-genre="{{ g.id }}" aria-pressed="false">
            <span class="bt-lbl-short">{{ g.short }}</span><span class="bt-lbl-full">{{ g.label }}</span>
          </button>
        </li>
      {% endfor %}
    </ul>

    <details class="bt-details">
      <summary>Filter by stage</summary>
      <ul class="bt-chips">
        {% for s in bardentreffen.stages %}
          <li>
            <button type="button" class="bt-chip bt-chip--stage" data-filter-stage="{{ s.name }}" aria-pressed="false">
              {{ s.name }}
            </button>
          </li>
        {% endfor %}
      </ul>
    </details>

    <p><button type="button" class="bt-reset" id="bt-reset" hidden>Clear filters</button></p>

  </div>

  <p class="bt-empty" id="bt-empty">Nothing matches. Clear the filters to see everything.</p>

{% for day in bardentreffen.days %}
<section class="bt-day" id="bt-day-{{ day.iso }}" role="tabpanel" aria-labelledby="bt-tab-{{ day.iso }}" data-day="{{ day.iso }}">
<h2 class="bt-day-heading">{{ day.label }}</h2>
<p class="bt-day-sub">{{ day.count }} acts · {{ day.stages | length }} stages</p>

      <!-- View: by time -->
      <div class="bt-view" data-view="time">
        <ol class="bt-slots">
          {% for slot in day.slots %}
            <li class="bt-slot" data-time="{{ slot.time }}">
              <div class="bt-slot__time"><time datetime="{{ day.iso }}T{{ slot.time }}">{{ slot.time }}</time></div>
              <ul class="bt-acts">
                {% for act in slot.acts %}
                  <li
                    class="bt-act"
                    data-genre="{{ act.genre }}"
                    data-stage="{{ act.stage }}"
                    data-q="{{ act.q }}"
                    data-key="{{ act.key }}"
                  >
                    <span class="bt-act__body">
                      {% if act.url %}
                        <a class="bt-act__name" href="{{ act.url }}" target="_blank" rel="noopener noreferrer">{{ act.name }}</a>
                      {% else %}
                        <span class="bt-act__name">{{ act.name }}</span>
                      {% endif %}
                      <span class="bt-act__meta">
                        <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 1a5 5 0 0 0-5 5c0 3.5 5 9 5 9s5-5.5 5-9a5 5 0 0 0-5-5Zm0 7a2 2 0 1 1 0-4 2 2 0 0 1 0 4Z"/></svg>
                        {{ act.stage }}
                        {% if act.country %}<span class="bt-act__dot">·</span><span class="bt-act__country">{{ act.country }}</span>{% endif %}
                        <span class="bt-act__dot">·</span><span class="bt-act__genre">{{ bardentreffen.genreShort[act.genre] }}</span>
                      </span>
                    </span>
                    <button type="button" class="bt-star" aria-pressed="false" hidden>
                      <span class="sr-only">Save {{ act.name }} to My Picks</span>
                      <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 1.6l2.47 5.2 5.53.8-4 4.03.94 5.77L10 14.7l-4.94 2.7.94-5.77-4-4.03 5.53-.8z"/></svg>
                    </button>
                  </li>
                {% endfor %}
              </ul>
            </li>
          {% endfor %}
        </ol>
      </div>

      <!-- View: by stage -->
      <div class="bt-view" data-view="stage">
        <div class="bt-stages-grid">
          {% for group in day.byStage %}
            <div class="bt-stagegroup" data-stagegroup="{{ group.stage }}">
              <h3 class="bt-stagegroup__head">
                {% if group.map %}
                  <a href="{{ group.map }}" target="_blank" rel="noopener noreferrer">
                    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" width="12" height="12"><path d="M8 1a5 5 0 0 0-5 5c0 3.5 5 9 5 9s5-5.5 5-9a5 5 0 0 0-5-5Zm0 7a2 2 0 1 1 0-4 2 2 0 0 1 0 4Z"/></svg>
                    {{ group.stage }}
                  </a>
                {% else %}
                  {{ group.stage }}
                {% endif %}
              </h3>
              <ol>
                {% for act in group.acts %}
                  <li
                    class="bt-act"
                    data-genre="{{ act.genre }}"
                    data-stage="{{ act.stage }}"
                    data-q="{{ act.q }}"
                    data-time="{{ act.time }}"
                    data-key="{{ act.key }}"
                  >
                    <span class="bt-act__time">{{ act.time }}</span>
                    <span class="bt-act__body">
                      {% if act.url %}
                        <a class="bt-act__name" href="{{ act.url }}" target="_blank" rel="noopener noreferrer">{{ act.name }}</a>
                      {% else %}
                        <span class="bt-act__name">{{ act.name }}</span>
                      {% endif %}
                      <span class="bt-act__meta">
                        {% if act.country %}<span class="bt-act__country">{{ act.country }}</span><span class="bt-act__dot">·</span>{% endif %}
                        <span class="bt-act__genre">{{ bardentreffen.genreShort[act.genre] }}</span>
                      </span>
                    </span>
                    <button type="button" class="bt-star" aria-pressed="false" hidden>
                      <span class="sr-only">Save {{ act.name }} to My Picks</span>
                      <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 1.6l2.47 5.2 5.53.8-4 4.03.94 5.77L10 14.7l-4.94 2.7.94-5.77-4-4.03 5.53-.8z"/></svg>
                    </button>
                  </li>
                {% endfor %}
              </ol>
            </div>
          {% endfor %}
        </div>
      </div>
    </section>

{% endfor %}

  <h2 class="bt-section-title">Stages on the map</h2>
  <ul class="bt-maplist">
    {% for s in bardentreffen.stages %}
      <li>
        <a href="{{ s.map }}" target="_blank" rel="noopener noreferrer">
          <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 1a5 5 0 0 0-5 5c0 3.5 5 9 5 9s5-5.5 5-9a5 5 0 0 0-5-5Zm0 7a2 2 0 1 1 0-4 2 2 0 0 1 0 4Z"/></svg>
          {{ s.name }}
        </a>
      </li>
    {% endfor %}
  </ul>

  <p class="bt-colophon">
    <span class="bt-colophon__quote">Feel free to share it with others and have fun 🎶</span>
    <span class="bt-colophon__meta"
      >— Blerta ·
      <a href="https://bardentreffen.nuernberg.de/" target="_blank" rel="noopener noreferrer"
        >bardentreffen.nuernberg.de</a
      ></span
    >
  </p>
</div>

{% raw %}
<script>
  (function () {
    const root = document.querySelector(".bt");
    if (!root) return;

    const DAYS = Array.from(root.querySelectorAll(".bt-day"));
    const TABS = Array.from(root.querySelectorAll(".bt-day-tab"));
    const ACTS = Array.from(root.querySelectorAll(".bt-act"));
    const search = root.querySelector("#bt-search");
    const empty = root.querySelector("#bt-empty");
    const reset = root.querySelector("#bt-reset");
    const nowBtn = root.querySelector("#bt-now");
    const picksBtn = root.querySelector("#bt-picks");
    const picksCount = root.querySelector("#bt-picks-count");

    const genreFilter = new Set();
    const stageFilter = new Set();
    let picksOnly = false;

    /* Match the fold() used when the data file was built, so a search for
       "suma covjek" still finds "Šuma Čovjek". */
    const fold = (s) => s.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

    /* ── Day tabs ─────────────────────────────────────────────────── */
    function selectDay(iso, scroll) {
      DAYS.forEach((d) => (d.hidden = d.dataset.day !== iso));
      TABS.forEach((t) => t.setAttribute("aria-selected", String(t.dataset.day === iso)));
      if (scroll) {
        const panel = DAYS.find((d) => d.dataset.day === iso);
        if (panel) panel.scrollIntoView({ block: "start", behavior: "smooth" });
      }
      applyFilters();
    }

    TABS.forEach((tab) => {
      tab.addEventListener("click", () => selectDay(tab.dataset.day, false));
    });

    /* ── View mode ────────────────────────────────────────────────── */
    root.querySelectorAll("[data-viewbtn]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const mode = btn.dataset.viewbtn;
        root.dataset.view = mode;
        root.querySelectorAll("[data-viewbtn]").forEach((b) =>
          b.setAttribute("aria-pressed", String(b.dataset.viewbtn === mode))
        );
        applyFilters();
      });
    });

    /* ── My Picks ─────────────────────────────────────────────────────
       Saved in localStorage, keyed by day|time|stage|name. Every act is on
       the page twice (once per view), so a star toggles both copies.
       localStorage throws in Safari private browsing, hence the guards —
       the stars still work for the session, they just don't persist. */
    const STORE = "bardentreffen-2026-picks";
    let picks = new Set();
    try {
      picks = new Set(JSON.parse(localStorage.getItem(STORE) || "[]"));
    } catch (e) {}

    function savePicks() {
      try {
        localStorage.setItem(STORE, JSON.stringify(Array.from(picks)));
      } catch (e) {}
    }

    function paintStars() {
      ACTS.forEach((act) => {
        const on = picks.has(act.dataset.key);
        const star = act.querySelector(".bt-star");
        if (star) {
          star.setAttribute("aria-pressed", String(on));
          star.hidden = false;
        }
      });
      picksCount.textContent = String(picks.size);
      picksBtn.hidden = false;
    }

    root.addEventListener("click", (e) => {
      const star = e.target.closest(".bt-star");
      if (!star) return;
      const key = star.closest(".bt-act").dataset.key;
      if (picks.has(key)) picks.delete(key);
      else picks.add(key);
      savePicks();
      paintStars();
      applyFilters();
    });

    picksBtn.addEventListener("click", () => {
      picksOnly = !picksOnly;
      picksBtn.setAttribute("aria-pressed", String(picksOnly));
      applyFilters();
    });

    /* ── Filtering ────────────────────────────────────────────────── */
    function applyFilters() {
      const q = fold(search.value.trim());

      ACTS.forEach((act) => {
        const okGenre = genreFilter.size === 0 || genreFilter.has(act.dataset.genre);
        const okStage = stageFilter.size === 0 || stageFilter.has(act.dataset.stage);
        const okText = q === "" || act.dataset.q.includes(q);
        const okPick = !picksOnly || picks.has(act.dataset.key);
        act.hidden = !(okGenre && okStage && okText && okPick);
      });

      /* Collapse any time slot or stage column left with nothing in it. */
      root.querySelectorAll(".bt-slot").forEach((slot) => {
        slot.hidden = !slot.querySelector(".bt-act:not([hidden])");
      });
      root.querySelectorAll(".bt-stagegroup").forEach((group) => {
        group.hidden = !group.querySelector(".bt-act:not([hidden])");
      });

      const filtering = q !== "" || genreFilter.size > 0 || stageFilter.size > 0 || picksOnly;
      reset.hidden = !filtering;

      const visibleDay = DAYS.find((d) => !d.hidden);
      const anyVisible = visibleDay && visibleDay.querySelector(".bt-act:not([hidden])");
      empty.classList.toggle("is-visible", !anyVisible);
      empty.textContent =
        picksOnly && picks.size === 0
          ? "No picks yet. Tap the star on any act to save it."
          : picksOnly
            ? "Nothing saved for this day. Try another day."
            : "Nothing matches. Clear the filters to see everything.";
    }

    function bindChip(btn, set, key) {
      btn.addEventListener("click", () => {
        const val = btn.dataset[key];
        if (set.has(val)) set.delete(val);
        else set.add(val);
        btn.setAttribute("aria-pressed", String(set.has(val)));
        applyFilters();
      });
    }

    root.querySelectorAll("[data-filter-genre]").forEach((b) => bindChip(b, genreFilter, "filterGenre"));
    root.querySelectorAll("[data-filter-stage]").forEach((b) => bindChip(b, stageFilter, "filterStage"));

    search.addEventListener("input", applyFilters);

    /* Clears the filters, including the picks toggle — but never the saved
       picks themselves. Losing a starred list to a stray tap would be worse
       than any filter state. */
    reset.addEventListener("click", () => {
      genreFilter.clear();
      stageFilter.clear();
      search.value = "";
      picksOnly = false;
      picksBtn.setAttribute("aria-pressed", "false");
      root.querySelectorAll("[aria-pressed]").forEach((b) => {
        if (b.dataset.filterGenre || b.dataset.filterStage) b.setAttribute("aria-pressed", "false");
      });
      applyFilters();
    });

    /* ── "On now" ─────────────────────────────────────────────────────
       The festival is in Nürnberg, so the clock that matters is Berlin's,
       not the visitor's. Nights run past midnight, so anything before 06:00
       still belongs to the previous festival day. */
    function berlinNow() {
      const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Europe/Berlin",
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", hour12: false,
      }).formatToParts(new Date());
      const get = (t) => parts.find((p) => p.type === t).value;
      let hour = parseInt(get("hour"), 10) % 24;
      let date = get("year") + "-" + get("month") + "-" + get("day");
      let minutes = hour * 60 + parseInt(get("minute"), 10);
      if (hour < 6) {
        const d = new Date(date + "T12:00:00Z");
        d.setUTCDate(d.getUTCDate() - 1);
        date = d.toISOString().slice(0, 10);
        minutes += 24 * 60;
      }
      return { date, minutes };
    }

    const toMinutes = (t) => {
      const [h, m] = t.split(":").map(Number);
      return (h < 6 ? h + 24 : h) * 60 + m;
    };

    function markNow() {
      const now = berlinNow();
      const panel = DAYS.find((d) => d.dataset.day === now.date);
      if (!panel) return null;

      /* Every slot that started in the last SET_LENGTH minutes, not just the
         most recent one — stages start at staggered times, so at 21:20 the
         21:00 and 21:15 sets are both still going. */
      const SET_LENGTH = 75;
      const current = Array.from(panel.querySelectorAll(".bt-slot")).filter((slot) => {
        const start = toMinutes(slot.dataset.time);
        return start <= now.minutes && now.minutes - start <= SET_LENGTH;
      });
      if (!current.length) return null;

      /* Mark the same acts in both views — they're separate elements. */
      const times = current.map((s) => s.dataset.time);
      const inStageView = times.map((t) => '.bt-stagegroup .bt-act[data-time="' + t + '"]').join(",");
      const live = current
        .flatMap((slot) => Array.from(slot.querySelectorAll(".bt-act")))
        .concat(Array.from(panel.querySelectorAll(inStageView)));

      live.forEach((act) => {
        act.classList.add("is-now");
        const name = act.querySelector(".bt-act__name");
        if (name && !act.querySelector(".bt-nowpill")) {
          const pill = document.createElement("span");
          pill.className = "bt-nowpill";
          pill.textContent = "now";
          name.insertAdjacentElement("afterend", pill);
        }
      });
      return { date: now.date, slot: current[0] };
    }

    /* Stars are hidden in the served HTML and revealed here — without JS they
       would be dead controls. */
    paintStars();

    /* Open on today if the festival is running, otherwise on day one. */
    const live = markNow();
    selectDay(live ? live.date : DAYS[0].dataset.day, false);

    if (live) {
      nowBtn.hidden = false;
      nowBtn.addEventListener("click", () => {
        selectDay(live.date, false);
        live.slot.scrollIntoView({ block: "center", behavior: "smooth" });
      });
    }
  })();
</script>

{% endraw %}
