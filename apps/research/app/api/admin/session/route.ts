import {
  ADMIN_COOKIE,
  adminCookieMaxAge,
  createSessionToken,
  credentialsAreValid,
  safeReturnPath,
} from "@/app/admin-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

const loginSchema = z.object({
  passphrase: z.string().min(1).max(1_000),
  returnTo: z.string().max(2_000).optional(),
});

export async function POST(request: Request) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  let input: z.infer<typeof loginSchema>;
  try {
    input = loginSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Enter the admin passphrase." }, { status: 400 });
  }

  if (!(await credentialsAreValid(input.passphrase))) {
    return NextResponse.json({ error: "Incorrect passphrase." }, { status: 401 });
  }

  const response = NextResponse.json({ returnTo: safeReturnPath(input.returnTo) });
  response.cookies.set(ADMIN_COOKIE, await createSessionToken(), {
    httpOnly: true,
    secure: new URL(request.url).protocol === "https:",
    sameSite: "strict",
    path: "/",
    maxAge: adminCookieMaxAge,
  });
  return response;
}

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}
