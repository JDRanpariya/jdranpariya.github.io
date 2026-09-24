import { PublicResearchIndex, type PublishedRecord } from "../components/public-research-index";
import { getLibraryPage } from "../lib/library-data";
import { getPublishedAnnotations, upsertAnnotation } from "../lib/research-annotations";
import { getCatalogRecord, isCollectionId } from "../lib/research-catalog";
import {
  ADMIN_EMAIL,
  createSessionToken,
  credentialsAreValid,
  expiredSessionCookie,
  getAdminUser,
  safeReturnPath,
  sessionCookie,
  type AuthEnvironment,
} from "./auth";
import { renderToString } from "react-dom/server";
import { z } from "zod";

type Environment = AuthEnvironment & { DB: D1Database; ASSETS: Fetcher };

const loginSchema = z.object({
  passphrase: z.string().min(1).max(1_000),
  returnTo: z.string().max(2_000).optional(),
});

const pageQuerySchema = z.object({
  collection: z.enum(["great-minds", "neuroai"]),
  q: z.string().max(300).default(""),
  decision: z.enum(["all", "unreviewed", "keep", "maybe", "remove"]).default("all"),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
});

const annotationSchema = z.object({
  collection: z.enum(["great-minds", "neuroai"]),
  recordId: z.string().min(1).max(100),
  decision: z.enum(["unreviewed", "keep", "maybe", "remove"]),
  privateNotes: z.string().max(20_000),
  publicNotes: z.string().max(5_000),
  tags: z.string().max(2_000),
  isPublished: z.boolean(),
});

function json(data: unknown, status = 200, headers?: Record<string, string>): Response {
  return Response.json(data, {
    status,
    headers: { "cache-control": "private, no-store", ...headers },
  });
}

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

function serialized(data: unknown): string {
  return JSON.stringify(data).replaceAll("<", "\\u003c");
}

async function asset(request: Request, env: Environment, path: string): Promise<Response> {
  const url = new URL(request.url);
  url.pathname = path;
  url.search = "";
  return env.ASSETS.fetch(new Request(url, request));
}

function htmlResponse(response: Response, selector: string, html: string): Response {
  const headers = new Headers(response.headers);
  headers.set("cache-control", "private, no-store");
  headers.delete("etag");
  const rewritten = new HTMLRewriter()
    .on(selector, {
      element(element) {
        element.setInnerContent(html, { html: true });
      },
    })
    .transform(response);
  return new Response(rewritten.body, { status: rewritten.status, headers });
}

async function publicIndex(request: Request, env: Environment): Promise<Response> {
  const annotations = await getPublishedAnnotations(env.DB, ADMIN_EMAIL);
  const records: PublishedRecord[] = annotations.flatMap((annotation) => {
    if (!isCollectionId(annotation.collection)) return [];
    const record = getCatalogRecord(annotation.collection, annotation.recordId);
    if (!record) return [];
    return [
      {
        ...record,
        publicNotes: annotation.publicNotes,
        tags: annotation.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        updatedAt: annotation.updatedAt,
      },
    ];
  });
  records.sort((left, right) => left.name.localeCompare(right.name));

  const response = await asset(request, env, "/index/index.html");
  if (!response.ok) return response;
  const rendered = renderToString(<PublicResearchIndex records={records} />);
  const owner = await getAdminUser(request, env);
  return new HTMLRewriter()
    .on("#index-root", {
      element(element) {
        element.setInnerContent(rendered, { html: true });
      },
    })
    .on("#index-data", {
      element(element) {
        element.setInnerContent(serialized(records), { html: true });
      },
    })
    .on("#library-link", {
      element(element) {
        if (owner)
          element.setInnerContent(
            '<a href="/library/great-minds" class="font-sans text-sm underline">Open library</a>',
            { html: true }
          );
      },
    })
    .transform(
      new Response(response.body, {
        status: response.status,
        headers: { ...Object.fromEntries(response.headers), "cache-control": "private, no-store" },
      })
    );
}

async function libraryPage(
  request: Request,
  env: Environment,
  collection: string
): Promise<Response> {
  if (!isCollectionId(collection)) {
    const page = await asset(request, env, "/404.html");
    return new Response(page.body, { status: 404, headers: page.headers });
  }
  const owner = await getAdminUser(request, env);
  if (!owner) {
    return Response.redirect(
      new URL(`/login?returnTo=${encodeURIComponent(`/library/${collection}`)}`, request.url),
      302
    );
  }
  const data = await getLibraryPage({ binding: env.DB, ownerId: owner.userId, collection });
  const response = await asset(request, env, `/library/${collection}/index.html`);
  if (!response.ok) return response;
  return htmlResponse(response, "#library-data", serialized({ data, email: owner.email }));
}

async function login(request: Request, env: Environment): Promise<Response> {
  if (!sameOrigin(request)) return json({ error: "Invalid request origin." }, 403);
  let input: z.infer<typeof loginSchema>;
  try {
    input = loginSchema.parse(await request.json());
  } catch {
    return json({ error: "Enter the admin passphrase." }, 400);
  }
  if (!(await credentialsAreValid(input.passphrase, env)))
    return json({ error: "Incorrect passphrase." }, 401);
  const response = json({ returnTo: safeReturnPath(input.returnTo) });
  response.headers.set("set-cookie", sessionCookie(await createSessionToken(env), request));
  return response;
}

async function annotations(request: Request, env: Environment): Promise<Response> {
  const user = await getAdminUser(request, env);
  if (!user) return json({ error: "Sign in required." }, 401);
  if (request.method === "GET") {
    let query: z.infer<typeof pageQuerySchema>;
    try {
      query = pageQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    } catch (error) {
      return json(
        { error: error instanceof z.ZodError ? error.issues[0]?.message : "Invalid request." },
        400
      );
    }
    try {
      return json(
        await getLibraryPage({
          binding: env.DB,
          ownerId: user.userId,
          collection: query.collection,
          query: query.q,
          decision: query.decision,
          page: query.page,
        })
      );
    } catch (error) {
      console.error("Unable to load research library", error);
      return json({ error: "Unable to load the library." }, 503);
    }
  }
  if (request.method === "POST") {
    if (!sameOrigin(request)) return json({ error: "Invalid request origin." }, 403);
    let parsed: z.infer<typeof annotationSchema>;
    try {
      parsed = annotationSchema.parse(await request.json());
    } catch (error) {
      return json(
        { error: error instanceof z.ZodError ? error.issues[0]?.message : "Invalid request." },
        400
      );
    }
    if (!getCatalogRecord(parsed.collection, parsed.recordId))
      return json({ error: "This catalog record does not exist." }, 404);
    const annotation = {
      ownerId: user.userId,
      ownerEmail: user.email.toLowerCase(),
      collection: parsed.collection,
      recordId: parsed.recordId,
      decision: parsed.decision,
      privateNotes: parsed.privateNotes.trim(),
      publicNotes: parsed.publicNotes.trim(),
      tags: parsed.tags.trim(),
      isPublished: parsed.decision === "keep" && parsed.isPublished,
      updatedAt: new Date().toISOString(),
    };
    try {
      await upsertAnnotation(env.DB, annotation);
      return json({ annotation });
    } catch (error) {
      console.error("Unable to save research annotation", error);
      return json({ error: "Unable to save. Try again." }, 503);
    }
  }
  return json({ error: "Method not allowed." }, 405, { allow: "GET, POST" });
}

const researchWorker = {
  async fetch(request: Request, env: Environment): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/$/u, "") || "/";
    try {
      if (path === "/index" && request.method === "GET") return publicIndex(request, env);
      if (path === "/index/index.html" && request.method === "GET")
        return Response.redirect(new URL("/index", url), 301);
      if (path === "/" && request.method === "GET") return asset(request, env, "/index.html");
      if (path === "/login" && request.method === "GET")
        return asset(request, env, "/login/index.html");
      if (path === "/login/index.html" && request.method === "GET")
        return Response.redirect(new URL("/login", url), 301);
      if (path === "/people" && request.method === "GET")
        return Response.redirect(new URL("/index", url), 302);
      if (path === "/library" && request.method === "GET")
        return Response.redirect(new URL("/library/great-minds", url), 302);
      if (path === "/library/great-minds/index.html" && request.method === "GET")
        return Response.redirect(new URL("/library/great-minds", url), 301);
      if (path === "/library/neuroai/index.html" && request.method === "GET")
        return Response.redirect(new URL("/library/neuroai", url), 301);
      if (path.startsWith("/library/") && request.method === "GET")
        return libraryPage(request, env, path.slice("/library/".length));
      if (path === "/api/admin/session")
        return request.method === "POST"
          ? login(request, env)
          : json({ error: "Method not allowed." }, 405, { allow: "POST" });
      if (path === "/api/library/annotations") return annotations(request, env);
      if (path === "/logout" && request.method === "GET") {
        const response = Response.redirect(
          new URL(safeReturnPath(url.searchParams.get("returnTo") ?? "/"), url),
          302
        );
        response.headers.set("set-cookie", expiredSessionCookie(request));
        return response;
      }
      return asset(request, env, url.pathname);
    } catch (error) {
      console.error("Research Worker error", error);
      return path.startsWith("/api/")
        ? json({ error: "Service unavailable." }, 503)
        : new Response("Service unavailable.", { status: 503 });
    }
  },
};

export default researchWorker;
