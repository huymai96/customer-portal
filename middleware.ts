import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { auth0 } from "@/lib/auth0";

function buildLoginRedirectUrl(request: NextRequest) {
  const loginUrl = new URL("/portal/login", request.url);
  const pathname = request.nextUrl.pathname;
  const search = request.nextUrl.search;
  if (pathname && pathname !== "/portal/login") {
    loginUrl.searchParams.set("redirect", `${pathname}${search}`.replace(/^\/+/, "/"));
  }
  const org = request.nextUrl.searchParams.get("organization");
  if (org) {
    loginUrl.searchParams.set("organization", org);
  }
  return loginUrl;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/portal/login" || pathname === "/portal/request-access") {
    return NextResponse.next();
  }

  if (pathname.startsWith("/portal/api/request-access")) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/portal")) {
    const session = await auth0.getSession(request);
    if (!session) {
      return NextResponse.redirect(buildLoginRedirectUrl(request));
    }
    return auth0.middleware(request);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/portal/:path*"],
};


