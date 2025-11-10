import { NextRequest, NextResponse } from "next/server";

import { dashboardFetch, DashboardRequestError } from "@/lib/api-client";
import { isPortalConfigured, PortalConfigError } from "@/lib/config";
import type { ProductsResponse } from "@/lib/types";

export async function GET(request: NextRequest) {
  if (!isPortalConfigured()) {
    return NextResponse.json({ suggestions: [] });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();

  if (!query) {
    return NextResponse.json({ suggestions: [] });
  }

  try {
    const response = await dashboardFetch<ProductsResponse>("/api/v1/products", {
      searchParams: {
        search: query,
        limit: "8",
      },
    });

    const suggestions = (response.products ?? []).slice(0, 8).map((product) => ({
      sku: product.sku,
      supplier: product.supplier,
      productName: product.product_name,
      color: product.color,
      size: product.size,
    }));

    return NextResponse.json({ suggestions });
  } catch (error) {
    if (error instanceof PortalConfigError) {
      return NextResponse.json({ suggestions: [], error: error.message }, { status: 400 });
    }

    if (error instanceof DashboardRequestError) {
      return NextResponse.json({ suggestions: [], error: error.message }, { status: error.status ?? 500 });
    }

    return NextResponse.json({ suggestions: [], error: (error as Error).message }, { status: 500 });
  }
}
