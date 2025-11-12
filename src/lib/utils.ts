export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function formatCurrency(amount?: number | string | null, currency = "USD") {
  if (amount == null) return "—";
  const numeric = typeof amount === "string" ? Number(amount) : amount;
  if (Number.isNaN(numeric)) return "—";
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(numeric);
  } catch {
    return numeric.toFixed(2);
  }
}

export function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value || value.length === 0) {
    throw new Error(`Environment variable ${key} is required`);
  }
  return value;
}
