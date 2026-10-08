# Admin review, 8 October 2026

Three independent review agents checked content coverage, publishing safety and
workspace recovery. This records verified fixes and remaining limits, not a
claim that every possible workflow is complete.

## Fixed

- About is now editable Markdown at `src/about.md`. Its existing prose and URL
  are unchanged; the public page and personal preview share its layout.
- Personal previews use compiled site templates and the built site stylesheet.
  Research preview extraction now retains responsive media queries.
- Galleries are reusable Markdown blocks with optional captions, native
  horizontal scrolling and compact, uncropped mobile photos. Single photos and
  captions are centered; decorative scrollbars are hidden.
- Repository loading no longer depends on optional photo storage succeeding.
  Truncated file trees fail visibly instead of pretending to be complete.
- File metadata comes from the build manifest, including public URLs. Opening
  or creating a file brings back a hidden editor.
- Failed local draft storage no longer reports a successful save.
- Conflict handling also covers a new local file that was created remotely.
  Successful publishing preserves edits made while its request was running.
  A local cleanup failure cannot masquerade as a failed remote publish.
- Before committing, the worker validates document structure against the
  canonical personal-site schema, along with supported layouts, dates and URLs.
- Login rejects malformed request types and bounds request bodies to 8 KB.
- Research builds copy only images referenced by public rendered content,
  rather than copying an entire media library to the research host.

## Still limited

- Research previews share rendering and styles, but do not yet render the full
  native research shell. Do not treat them as pixel-exact public-page previews.
- Personal previews do not run interactive site scripts. Code syntax
  highlighting and optional image-shortcode classes are not fully reproduced.
- Template-owned landing pages other than About are not exposed as editable
  Markdown. Renaming and moving existing files or folders is not implemented.
- Browser HEIC uploads still require conversion first. JPEG, PNG and WebP are
  supported; the ICRA HEIC originals were converted locally without altering them.
- Isolated document validation cannot detect repository-wide tag casing or
  permalink collisions. The complete production build remains necessary.
- Research publishing saves the Git source; its separate deployment is still
  required. This is not the same as making a page live.
- Application-level login throttling was not found in this review. Existing
  edge-provider protections were not verified, so their coverage is unknown.

## Verification

Use `bun run check` at the repository root and in `apps/research` for the complete
automated gates. Additional checks cover About rendering, gallery parsing,
workspace recovery, conflict handling, source validation and research media.
Local publishing is deliberately disabled in the read-only preview server.
