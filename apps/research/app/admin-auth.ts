import { env } from "cloudflare:workers";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export type AdminUser = {
  userId: string;
  displayName: string;
  email: string;
};

export const ADMIN_COOKIE = "research_admin";
export const ADMIN_EMAIL = "jaydeepranpariya037@gmail.com";
const ADMIN_USER_ID = "personal-admin";
const SESSION_VERSION = "v1";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export async function getAdminUser(): Promise<AdminUser | null> {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token || !(await verifySessionToken(token))) return null;

  return {
    userId: ADMIN_USER_ID,
    displayName: "Jay Ranpariya",
    email: ADMIN_EMAIL,
  };
}

export async function requireAdminUser(returnTo: string): Promise<AdminUser> {
  const user = await getAdminUser();
  if (user) return user;
  redirect(`/login?returnTo=${encodeURIComponent(safeReturnPath(returnTo))}`);
}

export async function credentialsAreValid(passphrase: string): Promise<boolean> {
  const expected = env.RESEARCH_ADMIN_PASSPHRASE;
  if (!expected) return false;
  return constantTimeEqual(passphrase, expected);
}

export async function createSessionToken(): Promise<string> {
  const secret = env.RESEARCH_SESSION_SECRET;
  if (!secret) throw new Error("RESEARCH_SESSION_SECRET is not configured.");
  const expiresAt = Date.now() + SESSION_MAX_AGE_SECONDS * 1_000;
  const payload = `${SESSION_VERSION}.${expiresAt}`;
  return `${payload}.${await sign(payload, secret)}`;
}

export async function verifySessionToken(token: string): Promise<boolean> {
  const secret = env.RESEARCH_SESSION_SECRET;
  if (!secret) return false;

  const [version, expiresAtText, signature, extra] = token.split(".");
  if (extra || version !== SESSION_VERSION || !expiresAtText || !signature) return false;
  const expiresAt = Number(expiresAtText);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= Date.now()) return false;

  const payload = `${version}.${expiresAtText}`;
  return constantTimeEqual(signature, await sign(payload, secret));
}

export function safeReturnPath(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/library/great-minds";
  try {
    const url = new URL(value, "https://research.local");
    if (url.origin !== "https://research.local") return "/library/great-minds";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/library/great-minds";
  }
}

export const adminCookieMaxAge = SESSION_MAX_AGE_SECONDS;

async function sign(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return toBase64Url(new Uint8Array(signature));
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

function constantTimeEqual(left: string, right: string): boolean {
  const leftBytes = new TextEncoder().encode(left);
  const rightBytes = new TextEncoder().encode(right);
  let mismatch = leftBytes.length ^ rightBytes.length;
  const length = Math.max(leftBytes.length, rightBytes.length);
  for (let index = 0; index < length; index += 1) {
    mismatch |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
  }
  return mismatch === 0;
}
