import { createHmac } from "crypto";
import { assertPortalConfigured, getPortalConfig, PortalConfigError } from "@/lib/config";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface DashboardRequestOptions {
  method?: HttpMethod;
  body?: unknown;
  headers?: Record<string, string>;
  searchParams?: Record<string, string | number | null | undefined>;
  allowUnsigned?: boolean;
}

export class DashboardRequestError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = "DashboardRequestError";
  }
}

function buildBodyString(body: unknown): string {
  if (body === undefined || body === null) {
    return "";
  }

  if (typeof body === "string") {
    return body;
  }

  return JSON.stringify(body);
}

function buildUrl(path: string, searchParams?: DashboardRequestOptions["searchParams"]): URL {
  const config = getPortalConfig();
  const base = config.apiBaseUrl || "";
  const url = new URL(path, base.startsWith("http") ? base : `https://${base}`);

  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (value === undefined || value === null || value === "") continue;
      url.searchParams.set(key, String(value));
    }
  }

  return url;
}

async function dashboardRequest(
  path: string,
  options: DashboardRequestOptions = {}
): Promise<Response> {
  assertPortalConfigured();

  const config = getPortalConfig();
  const method = (options.method || "GET").toUpperCase() as HttpMethod;
  const url = buildUrl(path, options.searchParams);
  const bodyString = buildBodyString(options.body);

  const headers = new Headers(options.headers);
  headers.set("x-api-key", config.apiKey);
  headers.set("accept", "application/json, text/csv");

  if (bodyString && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  if (!options.allowUnsigned) {
    const timestamp = Date.now().toString();
    const signaturePayload = `${timestamp}${method}${url.pathname}${bodyString}`;
    const signature = createHmac("sha256", config.apiSecret)
      .update(signaturePayload)
      .digest("hex");

    headers.set("x-timestamp", timestamp);
    headers.set("x-signature", signature);
  }

  return fetch(url.toString(), {
    method,
    headers,
    body: bodyString ? bodyString : undefined,
    cache: "no-store",
    next: { revalidate: 0 },
  });
}

async function handleResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") || "";
  const payload = await response.text();

  if (!response.ok) {
    throw new DashboardRequestError(payload || response.statusText, response.status);
  }

  if (!payload) {
    return {} as T;
  }

  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(payload) as T;
    } catch {
      throw new DashboardRequestError("Invalid JSON response from dashboard API", response.status);
    }
  }

  return payload as unknown as T;
}

export async function dashboardFetch<T>(
  path: string,
  options: DashboardRequestOptions = {}
): Promise<T> {
  try {
    const response = await dashboardRequest(path, options);
    return await handleResponse<T>(response);
  } catch (error) {
    if (error instanceof PortalConfigError) {
      throw error;
    }
    if (error instanceof DashboardRequestError) {
      throw error;
    }
    throw new DashboardRequestError((error as Error).message);
  }
}

export async function dashboardFetchText(
  path: string,
  options: DashboardRequestOptions = {}
): Promise<string> {
  const response = await dashboardRequest(path, options);
  const payload = await response.text();

  if (!response.ok) {
    throw new DashboardRequestError(payload || response.statusText, response.status);
  }

  return payload;
}


