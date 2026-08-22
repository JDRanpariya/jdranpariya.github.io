# Personal Site

A static site built with Eleventy, Tailwind CSS, and Bun.

## Setup

1. Install dependencies: `bun install`
2. Install the Python build tools (Pillow and fontTools): `bun run setup:python`
3. Run dev server: `bun run start`
4. Build for production: `bun run build:prod`
5. Clean output: `bun run clean`

The Python environment lives in `.venv/` (ignored by Git). CI installs the same
packages from `requirements.txt` on every build.

## Directories

- Input: `src/`
- Output: `build/`
- CSS: `src/css/input.css` → `build/css/style.css`
