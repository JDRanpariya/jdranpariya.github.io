import { getChatGPTUser, requireChatGPTUser, type ChatGPTUser } from "@/app/chatgpt-auth";
import { notFound } from "next/navigation";

export const LIBRARY_OWNER_EMAIL = "jaydeepranpariya037@gmail.com";

export function isLibraryOwner(user: ChatGPTUser | null): user is ChatGPTUser {
  return Boolean(user && user.email.toLowerCase() === LIBRARY_OWNER_EMAIL);
}

export async function requireLibraryOwner(returnTo: string): Promise<ChatGPTUser> {
  const user = await requireChatGPTUser(returnTo);
  if (!isLibraryOwner(user)) notFound();
  return user;
}

export async function getLibraryOwner(): Promise<ChatGPTUser | null> {
  const user = await getChatGPTUser();
  return isLibraryOwner(user) ? user : null;
}
