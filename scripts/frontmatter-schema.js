// Build-time frontmatter schema validation.
// Imported by .eleventy.js and invoked as a collection (runs once per build).
// Fails the build if any content file has missing/invalid frontmatter.

const COMMON_REQUIRED = ["title", "description"];

const SCHEMAS = {
  writings: {
    glob: "src/writings/*.md",
    required: [...COMMON_REQUIRED, "published", "tags", "section", "layout"],
    enums: {
      status: ["draft", "published", undefined],
      section: ["writings"],
    },
    types: {
      tags: "array",
      published: "date",
      lastUpdated: "date|undefined",
    },
  },
  books: {
    glob: "src/library/books/*.md",
    required: [...COMMON_REQUIRED, "author", "published", "section", "layout"],
    enums: { section: ["books"] },
    types: {
      tags: "array|undefined",
      published: "date",
      lastUpdated: "date|undefined",
    },
  },
  lectures: {
    glob: "src/library/lectures/*.md",
    required: [...COMMON_REQUIRED, "published", "section", "layout"],
    enums: { section: ["lectures"] },
    types: {
      tags: "array|undefined",
      published: "date",
      lastUpdated: "date|undefined",
    },
  },
  papers: {
    glob: "src/library/papers/*.md",
    required: ["title", "section", "layout"], // description optional — papers often have rich body prose
    enums: { section: ["papers"] },
    types: {
      tags: "array|undefined",
      published: "date|undefined",
      lastUpdated: "date|undefined",
    },
  },
  projects: {
    glob: "src/projects/*.md",
    // projects/<sub>/*.md exists too; this catches the top-level project entries
    required: [...COMMON_REQUIRED, "published", "tags", "layout"],
    enums: {
      status: ["active", "finished", "archived", "idea", undefined],
    },
    types: {
      tags: "array",
      tech: "array|undefined",
      published: "date",
      lastUpdated: "date|undefined",
    },
  },
  odysseys: {
    glob: "src/odysseys/*.md",
    required: [...COMMON_REQUIRED, "layout"],
    types: {
      tags: "array|undefined",
      published: "date|undefined",
      lastUpdated: "date|undefined",
    },
  },
};

function typeOf(v) {
  if (v === undefined) return "undefined";
  if (Array.isArray(v)) return "array";
  if (v instanceof Date) return "date";
  if (typeof v === "string") {
    // date-like strings (YAML may parse dates as Date or string depending on format)
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return "date";
    return "string";
  }
  return typeof v;
}

function validateItem(item, schema, errors) {
  const file = item.inputPath;
  const d = item.data;

  for (const field of schema.required) {
    if (d[field] === undefined || d[field] === null || d[field] === "") {
      errors.push(`${file}: missing required field '${field}'`);
    }
  }

  if (schema.enums) {
    for (const [field, allowed] of Object.entries(schema.enums)) {
      if (!allowed.includes(d[field])) {
        errors.push(
          `${file}: field '${field}' = ${JSON.stringify(d[field])} not in allowed values ${JSON.stringify(allowed)}`
        );
      }
    }
  }

  if (schema.types) {
    for (const [field, spec] of Object.entries(schema.types)) {
      const allowed = spec.split("|");
      const actual = typeOf(d[field]);
      if (!allowed.includes(actual)) {
        errors.push(`${file}: field '${field}' expected ${spec}, got ${actual}`);
      }
    }
  }
}

// Detect tags that slug to the same URL but differ in casing or whitespace
// (e.g. "AI" and "ai" both slug to "ai"). Two posts using different strings
// would yield phantom duplicates in /tags/ and could collide at pagination.
function validateTagCasing(collectionApi, errors) {
  // slug -> Map<original, Set<filepath>>
  const bySlug = new Map();

  for (const item of collectionApi.getAll()) {
    const tags = item.data.tags;
    if (!Array.isArray(tags)) continue;
    for (const tag of tags) {
      if (typeof tag !== "string") continue;
      // Mirror Eleventy's default slug transform (lowercase, hyphenate).
      const slug = tag.toLowerCase().replace(/\s+/g, "-");
      if (!bySlug.has(slug)) bySlug.set(slug, new Map());
      const variants = bySlug.get(slug);
      if (!variants.has(tag)) variants.set(tag, new Set());
      variants.get(tag).add(item.inputPath);
    }
  }

  for (const [slug, variants] of bySlug) {
    if (variants.size > 1) {
      const parts = Array.from(variants.entries())
        .map(([v, files]) => `"${v}" in ${Array.from(files).join(", ")}`)
        .join("; ");
      errors.push(
        `tag slug collision: ${parts} — all resolve to /tags/${slug}/. Pick one canonical casing and update the outliers.`
      );
    }
  }
}

export function registerFrontmatterValidation(eleventyConfig) {
  // Run after all collections are built. Throws if invalid.
  eleventyConfig.addCollection("__validateFrontmatter", (collectionApi) => {
    const errors = [];

    for (const [name, schema] of Object.entries(SCHEMAS)) {
      const items = collectionApi.getFilteredByGlob(schema.glob);
      for (const item of items) {
        validateItem(item, schema, errors);
      }
    }

    validateTagCasing(collectionApi, errors);

    if (errors.length > 0) {
      console.error("\n\x1b[31m✗ Frontmatter validation failed:\x1b[0m");
      for (const e of errors) console.error("  " + e);
      console.error("");
      throw new Error(`${errors.length} frontmatter error(s). Fix above and retry.`);
    }

    return [];
  });
}
