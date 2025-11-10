import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const baseUrl = new URL(request.url);
  const logoutUrl = new URL("/auth/logout", baseUrl.origin);
  const returnTo = request.nextUrl.searchParams.get("returnTo") || "/portal/login";
  logoutUrl.searchParams.set("returnTo", returnTo);

  return NextResponse.redirect(logoutUrl);
}

export async function POST(request: NextRequest) {
  return GET(request);
}


