import { getAdminUser } from "@/app/admin-auth";
import { isLibraryOwner } from "@/app/library-auth";
import { getCatalogRecord } from "@/lib/research-catalog";
import { getLibraryPage } from "@/lib/library-data";
import { upsertAnnotation } from "@/lib/research-annotations";
import { NextResponse } from "next/server";
import { z } from "zod";

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

export async function GET(request: Request) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (!isLibraryOwner(user)) return NextResponse.json({ error: "Access denied." }, { status: 403 });

  let query: z.infer<typeof pageQuerySchema>;
  try {
    const url = new URL(request.url);
    query = pageQuerySchema.parse(Object.fromEntries(url.searchParams));
  } catch (error) {
    const message = error instanceof z.ZodError ? error.issues[0]?.message : "Invalid request.";
    return NextResponse.json({ error: message ?? "Invalid request." }, { status: 400 });
  }

  try {
    const data = await getLibraryPage({
      ownerId: user.userId,
      collection: query.collection,
      query: query.q,
      decision: query.decision,
      page: query.page,
    });
    return NextResponse.json(data, { headers: { "cache-control": "private, no-store" } });
  } catch (error) {
    console.error("Unable to load research library", error);
    return NextResponse.json({ error: "Unable to load the library." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (!isLibraryOwner(user)) return NextResponse.json({ error: "Access denied." }, { status: 403 });

  let parsed: z.infer<typeof annotationSchema>;
  try {
    parsed = annotationSchema.parse(await request.json());
  } catch (error) {
    const message = error instanceof z.ZodError ? error.issues[0]?.message : "Invalid request.";
    return NextResponse.json({ error: message ?? "Invalid request." }, { status: 400 });
  }

  if (!getCatalogRecord(parsed.collection, parsed.recordId)) {
    return NextResponse.json({ error: "This catalog record does not exist." }, { status: 404 });
  }

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
    await upsertAnnotation(annotation);
    return NextResponse.json({ annotation });
  } catch (error) {
    console.error("Unable to save research annotation", error);
    return NextResponse.json({ error: "Unable to save. Try again." }, { status: 503 });
  }
}
