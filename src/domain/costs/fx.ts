export const FX_STALE_MS = 72 * 60 * 60 * 1000;
export const FX_PROVIDER = "exchangerate-api";

export interface FxQuote {
  base: string;
  quote: string;
  rate: number;
  capturedAt: string;
  provider: string;
}

export function isFxStale(capturedAt: string, now = new Date()): boolean {
  const captured = Date.parse(capturedAt);
  if (!Number.isFinite(captured)) {
    return true;
  }
  return now.getTime() - captured > FX_STALE_MS;
}

export function convertWithQuote(
  amount: number,
  quote: FxQuote | null,
): { converted: number | null; available: boolean; stale: boolean } {
  if (!quote || quote.rate <= 0) {
    return { converted: null, available: false, stale: false };
  }
  return {
    converted: amount * quote.rate,
    available: true,
    stale: isFxStale(quote.capturedAt),
  };
}

export function usdRateFromUsdBaseTable(
  currency: string,
  unitsPerUsd: number | null,
): number | null {
  if (currency.toUpperCase() === "USD") {
    return 1;
  }
  if (unitsPerUsd === null || unitsPerUsd <= 0) {
    return null;
  }
  return 1 / unitsPerUsd;
}
