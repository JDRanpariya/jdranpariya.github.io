import { ADMIN_COOKIE, safeReturnPath } from "@/app/admin-auth";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const response = NextResponse.redirect(
    new URL(safeReturnPath(url.searchParams.get("returnTo") ?? "/"), url)
  );
  response.cookies.set(ADMIN_COOKIE, "", {
    httpOnly: true,
    secure: url.protocol === "https:",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
  return response;
}
