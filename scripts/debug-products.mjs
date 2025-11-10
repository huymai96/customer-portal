import crypto from "crypto";
import fs from "fs";
import path from "path";

const envPath = path.resolve("C:/customer-portal/.env.local");
const envContent = fs.readFileSync(envPath, "utf-8");

for (const line of envContent.split(/\r?\n/)) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (!match) continue;
  const [, key, rawValue] = match;
  if (process.env[key]) continue;
  const value = rawValue.replace(/^\"|\"$/g, "").trim();
  process.env[key] = value;
}

const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
const apiKey = process.env.PORTAL_API_KEY;
const apiSecret = process.env.PORTAL_API_SECRET;

if (!baseUrl || !apiKey || !apiSecret) {
  throw new Error("Missing NEXT_PUBLIC_API_BASE_URL, PORTAL_API_KEY, or PORTAL_API_SECRET");
}

const searchTerm = process.argv[2] || "pc43";
const supplier = process.argv[3] || "sanmar";

const searchParams = new URLSearchParams({
  search: searchTerm,
  supplier,
  limit: "5",
});

const requestPath = `/api/v1/products?${searchParams.toString()}`;
const url = `${baseUrl}${requestPath}`;
const method = "GET";
const body = "";
const timestamp = Date.now().toString();
const payload = `${timestamp}${method}${requestPath}${body}`;
const signature = crypto.createHmac("sha256", apiSecret).update(payload).digest("hex");

const response = await fetch(url, {
  method,
  headers: {
    "x-api-key": apiKey,
    "x-timestamp": timestamp,
    "x-signature": signature,
    Accept: "application/json",
  },
});

const json = await response.json();
console.log(JSON.stringify(json, null, 2));
