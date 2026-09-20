import { requireLibraryOwner } from "@/app/library-auth";
import { LibraryWorkspace } from "@/components/library-workspace";
import { getLibraryPage } from "@/lib/library-data";
import { isCollectionId } from "@/lib/research-catalog";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Research library · Jay Ranpariya",
  robots: { index: false, follow: false },
};

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ collection: string }>;
}) {
  const { collection } = await params;
  if (!isCollectionId(collection)) notFound();

  const returnTo = `/library/${collection}`;
  const owner = await requireLibraryOwner(returnTo);
  const initialData = await getLibraryPage({ ownerId: owner.userId, collection });

  return (
    <LibraryWorkspace collection={collection} initialData={initialData} ownerEmail={owner.email} />
  );
}
