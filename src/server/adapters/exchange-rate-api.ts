import {
  FX_PROVIDER,
  type FxQuote,
  usdRateFromUsdBaseTable,
} from "@/domain/costs/fx";

const ENDPOINT = "https://v6.exchangerate-api.com/v6";

interface LatestUsdResponse {
  result?: string;
  time_last_update_utc?: string;
  time_last_update_unix?: number;
  conversion_rates?: Record<string, number>;
}

export function exchangeRateApiKey(): string | null {
  const key = process.env.EXCHANGE_RATE_API_KEY?.trim() ?? "";
  return key === "" ? null : key;
}

export async function fetchUsdQuotes(
  currencies: readonly string[],
  fetchImpl: typeof fetch = fetch,
): Promise<FxQuote[]> {
  const key = exchangeRateApiKey();
  if (!key) {
    return [];
  }
  const needed = [...new Set(currencies.map((code) => code.toUpperCase()))].filter(
    (code) => code !== "",
  );
  if (needed.length === 0) {
    return [];
  }

  const response = await fetchImpl(`${ENDPOINT}/${key}/latest/USD`, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    return [];
  }
  const payload = (await response.json()) as LatestUsdResponse;
  if (payload.result !== "success" || !payload.conversion_rates) {
    return [];
  }
  const capturedAt = payload.time_last_update_utc
    ? new Date(payload.time_last_update_utc).toISOString()
    : new Date().toISOString();
  const quotes: FxQuote[] = [];
  for (const currency of needed) {
    const unitsPerUsd =
      currency === "USD" ? 1 : payload.conversion_rates[currency] ?? null;
    const rate = usdRateFromUsdBaseTable(currency, unitsPerUsd);
    if (rate === null) {
      continue;
    }
    quotes.push({
      base: currency,
      quote: "USD",
      rate,
      capturedAt,
      provider: FX_PROVIDER,
    });
  }
  return quotes;
}
