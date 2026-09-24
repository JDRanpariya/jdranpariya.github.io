export type AdminUser = { userId: string; displayName: string; email: string };

export const ADMIN_COOKIE = "research_admin";
export const ADMIN_EMAIL = "jaydeepranpariya037@gmail.com";
export const ADMIN_USER_ID = "personal-admin";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const SESSION_VERSION = "v1";

export type AuthEnvironment = {
  RESEARCH_ADMIN_PASSPHRASE?: string;
  RESEARCH_SESSION_SECRET?: string;
};

export async function getAdminUser(
  request: Request,
  env: AuthEnvironment
): Promise<AdminUser | null> {
  const cookie = request.headers.get("cookie") ?? "";
  const token = cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${ADMIN_COOKIE}=`))
    ?.slice(ADMIN_COOKIE.length + 1);
  if (!token || !(await verifySessionToken(token, env))) return null;
  return { userId: ADMIN_USER_ID, displayName: "Jay Ranpariya", email: ADMIN_EMAIL };
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

export async function credentialsAreValid(
  passphrase: string,
  env: AuthEnvironment
): Promise<boolean> {
  return Boolean(
    env.RESEARCH_ADMIN_PASSPHRASE && constantTimeEqual(passphrase, env.RESEARCH_ADMIN_PASSPHRASE)
  );
}

export async function createSessionToken(env: AuthEnvironment): Promise<string> {
  const secret = env.RESEARCH_SESSION_SECRET;
  if (!secret) throw new Error("RESEARCH_SESSION_SECRET is not configured.");
  const payload = `${SESSION_VERSION}.${Date.now() + SESSION_MAX_AGE_SECONDS * 1_000}`;
  return `${payload}.${await sign(payload, secret)}`;
}

export async function verifySessionToken(token: string, env: AuthEnvironment): Promise<boolean> {
  const secret = env.RESEARCH_SESSION_SECRET;
  if (!secret) return false;
  const [version, expiresAtText, signature, extra] = token.split(".");
  if (extra || version !== SESSION_VERSION || !expiresAtText || !signature) return false;
  const expiresAt = Number(expiresAtText);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= Date.now()) return false;
  return constantTimeEqual(signature, await sign(`${version}.${expiresAtText}`, secret));
}

export function sessionCookie(token: string, request: Request): string {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${ADMIN_COOKIE}=${token}; HttpOnly${secure}; SameSite=Strict; Path=/; Max-Age=${SESSION_MAX_AGE_SECONDS}`;
}

export function expiredSessionCookie(request: Request): string {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${ADMIN_COOKIE}=; HttpOnly${secure}; SameSite=Strict; Path=/; Max-Age=0`;
}

async function sign(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  let binary = "";
  for (const byte of new Uint8Array(signature)) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

function constantTimeEqual(left: string, right: string): boolean {
  const leftBytes = new TextEncoder().encode(left);
  const rightBytes = new TextEncoder().encode(right);
  let mismatch = leftBytes.length ^ rightBytes.length;
  for (let index = 0; index < Math.max(leftBytes.length, rightBytes.length); index += 1) {
    mismatch |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
  }
  return mismatch === 0;
}
