import { NextRequest, NextResponse } from "next/server";
import { dashboardFetch } from "@/lib/api-client";
import { PortalConfigError } from "@/lib/config";
import { DashboardRequestError } from "@/lib/api-client";
import type { PortalQuoteRecord, QuoteResponseBody } from "@/lib/types";

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON payload" }, { status: 400 });
  }

  try {
    const data = (await dashboardFetch("/api/v1/quote", {
      method: "POST",
      body,
    })) as QuoteResponseBody;

    let savedQuote: PortalQuoteRecord | null = null;

    if (data.success) {
      try {
        const basePayload = (typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {});
        const status = typeof basePayload.status === "string" ? basePayload.status : "submitted";

        const persistencePayload: Record<string, unknown> = {
          ...basePayload,
          status,
          pricing: data.pricing,
          routing: data.routing,
          total: data.pricing?.summary?.total,
          currency: data.pricing?.summary?.currency,
        };

        const saveResponse = await dashboardFetch<{ success: boolean; quote: PortalQuoteRecord }>(
          "/api/portal/quotes",
          {
            method: "POST",
            body: persistencePayload,
          }
        );

        savedQuote = saveResponse.success ? saveResponse.quote : null;
      } catch (saveError) {
        console.warn("Failed to persist quote history", saveError);
      }
    }

    return NextResponse.json({ ...data, savedQuote });
  } catch (error) {
    if (error instanceof PortalConfigError) {
      return NextResponse.json(
        {
          success: false,
          error: "Portal configuration missing",
          details: error.message,
        },
        { status: 500 }
      );
    }

    if (error instanceof DashboardRequestError) {
      return NextResponse.json(
        {
          success: false,
          error: "Dashboard API error",
          details: error.message,
        },
        { status: error.status || 500 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Unexpected error forwarding quote request",
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}


