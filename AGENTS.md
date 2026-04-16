# AGENTS.md — Personal Site (Eleventy Static Site)

mode: software-engineer
description: Eleventy static site development with Quadrant 2 aesthetic

## Project Context

- **Stack**: Eleventy (11ty), Tailwind CSS, Nunjucks templating
- **Location**: ~/Developer/personal-site
- **Aesthetic**: Quadrant 2 affective state — calm, content, peaceful, reflective
- **Values**: Intentionality, attention to detail, clean minimalism

## Output Format

### Files
- **Templates**: .njk (Nunjucks) with clear structure and comments
- **CSS**: Tailwind classes with custom configuration in tailwind.config.js
- **Data**: .js or .json in _data/ for dynamic content

### Code Style
- Follow existing patterns in src/ directory
- Use snake_case for JS filenames, kebab-case for Nunjucks templates
- Keep CSS utility-first; avoid custom CSS unless absolutely necessary
- Add comments for non-obvious behavior

## Behavior

### Development Workflow
1. Read existing templates and _data files first to understand patterns
2. Make small, incremental changes
3. Run `npm run build` or `npm run serve` after changes
4. Verify visually in browser ( Quadrant 2 calm aesthetic must be preserved)

### Design Principles
- **Less is more**: Avoid adding features unless they deepen the Quadrant 2 feeling
- **Intentionality**: Every element should serve the aesthetic/functional purpose
- **Performance**: Fast page loads and smooth interactions are part of the calm experience
- **Consistency**: Reuse components and patterns throughout the site

### Common Tasks

#### Adding a new page
1. Create .njk in src/ with proper frontmatter
2. Add to navigation in _data/navigation.js if needed
3. Test local build
4. Commit with clear message

#### Modifying styling
1. Check if Tailwind utilities suffice
2. If not, add to tailwind.config.js theme extensions
3. Avoid !important unless absolutely necessary

#### Fixing broken links
1. Search for literal [link text](url) patterns
2. Use search_files to find broken references
3. Update both source and any data references

## Constraints & Gotchas

- Tailwind must be configured in tailwind.config.js
- Eleventy data cascade: page-level data overrides global _data/
- Images go in assets/images/; use correct paths in templates

## Deliverables

- **Bug fixes**: Working local build with test case
- **Features**: Working page/template + update to sitemap.xml
- **Design changes**: Verified visual consistency across all pages
- **Performance**: Page load under 1s on slow connection

## Tools

- terminal: Run Eleventy commands, git, npm
- search_files: Find broken links, duplicated patterns
- read_file: Examine existing templates and data structures
- patch: Targeted edits to templates and configs
- write_file: Create new templates or data files

## Context Files

- Eleventy docs: https://11ty.dev/docs/
- Tailwind config: tailwind.config.js (custom theme)
- Data files: src/_data/*.js
- Navigation: src/_data/navigation.js

