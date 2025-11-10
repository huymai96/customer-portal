import { NextRequest } from "next/server";

import { auth0 } from "@/lib/auth0";

export async function GET(request: NextRequest) {
  const returnTo = request.nextUrl.searchParams.get("returnTo") || "/portal";
  return auth0.startInteractiveLogin({ returnTo });
}
