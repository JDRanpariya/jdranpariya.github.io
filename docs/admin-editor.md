# Research Markdown in the admin editor

The authenticated editor lists Markdown from the current GitHub tree. Public
research articles follow `apps/research/site/<slug>/index.md` (nested slugs are
supported). The same path rule drives the live editor, read-only local preview,
Eleventy article rendering, and the research Worker's generated route table.
There is no per-page admin registry or additional API request per file.

`reading-pages.mjs` also holds the deliberately curated top navigation. That
list is not an access-control list. Adding a Markdown article does not add a
navigation item and does not require redeploying the admin Worker. Reload the
editor after the article reaches `main`. The research site still needs its
normal build and deploy to publish the page or its edits.

Public articles use `layout: public.njk`, `status: published`, and a canonical
URL and permalink derived from the source directory. New sections use their
top-level slug as `pageKind`; existing navigation sections retain their legacy
values. The shared validator rejects invalid route and layout changes. Existing
articles are updated with their Git blob SHA, so stale drafts cannot overwrite a
newer version. Drafts and notes can still be created under `apps/research/content/`.

Templates, symlinks in the file list, and protected route namespaces such as
`library`, `login`, and `api` are excluded from article discovery. Sign-in and
publish CSRF checks remain required. No new credentials or database migrations
are needed.
