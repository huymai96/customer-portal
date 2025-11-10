import crypto from "crypto";
import fs from "fs";
import path from "path";

function loadEnv(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    for (const line of content.split(/\r?\n/)) {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!match) continue;
      const [, key, rawValue] = match;
      if (process.env[key]) continue;
      const trimmed = rawValue.replace(/^"|"$/g, "").trim();
      if (trimmed.length > 0) {
        process.env[key] = trimmed;
      }
    }
  } catch (error) {
    console.warn(`Unable to load env from ${filePath}:`, error.message);
  }
}

const portalEnvPath = path.resolve(".env.local");
loadEnv(portalEnvPath);

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
const apiKey = process.env.PORTAL_API_KEY;
const apiSecret = process.env.PORTAL_API_SECRET;

if (!apiBaseUrl || !apiKey || !apiSecret) {
  throw new Error("Missing NEXT_PUBLIC_API_BASE_URL, PORTAL_API_KEY, or PORTAL_API_SECRET env vars.");
}

const pathName = "/api/portal/quotes";

const body = {
  status: "submitted",
  title: "Automation test: SanMar + S&S",
  notes: "Generated via submit-test-quote script",
  customer_context: {
    contact_name: "Automation QA",
    contact_email: "qa+quotes@promosink.com",
    contact_phone: "555-555-1212",
  },
  logistics: {
    shipping_method: "standard",
    in_hand_date: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
    customer_po: "PO-AUTO-TEST",
    ship_to: {
      name: "QA Receiving",
      company: "Promos Ink QA",
      address1: "123 Test Lane",
      city: "Dallas",
      state: "TX",
      postal_code: "75201",
      country: "US",
      email: "receiving@promosink.com",
      phone: "555-111-2222",
    },
  },
  artwork: {
    files: [
      {
        url: "https://storage.googleapis.com/promos-ink-artwork/demo-placeholder.png",
        filename: "demo-placeholder.png",
        notes: "Automation test asset",
      },
    ],
    notes: "Use sample art for verification",
  },
  items: [
    {
      supplier: "sanmar",
      supplier_label: "SanMar",
      sku: "PC54-AQUATICBL-L",
      product_name: "Port & Company Core Cotton Tee",
      quantity: 48,
      size: "L",
      color: "Aquatic Blue",
      base_cost: 4.25,
      decoration_method: "embroidery",
      decoration_unit_price: 2.5,
      decoration_notes: "Left chest 3.5\"",
      warehouse_allocations: [
        { warehouse: "us-tx-dallas", quantity: 48 },
      ],
      artwork_assets: [
        {
          url: "https://storage.googleapis.com/promos-ink-artwork/demo-placeholder.png",
          filename: "demo-placeholder.png",
        },
      ],
      metadata: {
        placement: "left_chest",
        colors: 4,
      },
    },
    {
      supplier: "ss_activewear",
      supplier_label: "S&S Activewear",
      sku: "3001CVC-ATH-XL",
      product_name: "Bella+Canvas Unisex CVC Tee",
      quantity: 60,
      size: "XL",
      color: "Athletic Heather",
      base_cost: 5.1,
      decoration_method: "dtf",
      decoration_unit_price: 1.9,
      decoration_notes: "Full front 10\"",
      warehouse_allocations: [
        { warehouse: "us-il-bridgeview", quantity: 60 },
      ],
      artwork_assets: [
        {
          url: "https://storage.googleapis.com/promos-ink-artwork/demo-placeholder.png",
          filename: "demo-placeholder.png",
        },
      ],
      metadata: {
        placement: "center_front",
        colors: 1,
      },
    },
  ],
};

const bodyString = JSON.stringify(body);
const timestamp = Date.now().toString();
const message = `${timestamp}POST${pathName}${bodyString}`;
const signature = crypto.createHmac("sha256", apiSecret).update(message).digest("hex");

async function main() {
  const response = await fetch(`${apiBaseUrl}${pathName}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "x-timestamp": timestamp,
      "x-signature": signature,
    },
    body: bodyString,
  });

  const json = await response.json();
  console.log("Create quote status:", response.status);
  console.log(JSON.stringify(json, null, 2));

  console.log("Fetching recent quotes...");
  const listResponse = await fetch(`${apiBaseUrl}${pathName}?limit=5`, {
    method: "GET",
    headers: {
      "x-api-key": apiKey,
    },
  });

  const listJson = await listResponse.json();
  console.log(JSON.stringify(listJson, null, 2));
}

main().catch((error) => {
  console.error("submit-test-quote failed", error);
  process.exit(1);
});
