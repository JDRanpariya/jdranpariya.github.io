# Research library state

## Current architecture

- Static source catalogs: 872 great minds and 422 countable NeuroAI research units.
- Canonical source: `apps/research` inside the personal site repository.
- Private owner editor: `/library/great-minds` and `/library/neuroai`.
- Public selected index: `/index`.
- D1 stores decisions and notes only; catalog source rows remain immutable.
- A record appears publicly only after `Keep` and `Publish` are both selected.
- Search, decision filters, and pagination run server side in 40-record pages.
- Desktop uses a persistent master/detail workspace; mobile uses a list-to-detail flow.

## Source regeneration

Run `bun run catalog:build` after a source census changes.

## Next

- Use the private library to review and annotate records.
- Publish selected entries one at a time from the editor.
