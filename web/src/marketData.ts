const openApiBase = "https://gateway.saxobank.com/sim/openapi";

type JsonObject = Record<string, unknown>;

export type StockInstrument = {
  uic: number;
  assetType: "Stock";
  symbol: string;
  description: string;
  exchangeId: string;
};

export class SaxoMarketError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

function object(value: unknown): JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as JsonObject
    : {};
}

function number(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function string(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

async function getSaxo(accessToken: string, path: string, parameters: Record<string, string>): Promise<JsonObject> {
  const url = new URL(`${openApiBase}${path}`);
  for (const [name, value] of Object.entries(parameters)) url.searchParams.set(name, value);

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    const failure = object(await response.json().catch(() => ({})));
    const errorCode = string(failure.ErrorCode) ?? string(object(failure.ErrorInfo).ErrorCode);
    const message = response.status === 401 ? "Saxo session expired. Connect again."
      : response.status === 403 || errorCode === "InstrumentNotAllowed"
        ? "Your Saxo account is not allowed to receive prices for this stock. Check its market-data permissions."
      : response.status === 429 ? "Saxo rate limit reached. Try again shortly."
      : response.status === 400 || response.status === 404 ? "Saxo rejected this request. Check the selected listing and try again."
      : "Saxo market data is temporarily unavailable.";
    throw new SaxoMarketError(response.status, message);
  }
  return object(await response.json());
}

export async function searchStocks(accessToken: string, keywords: string): Promise<StockInstrument[]> {
  const result = await getSaxo(accessToken, "/ref/v1/instruments", {
    Keywords: keywords,
    AssetTypes: "Stock",
    "$top": "20",
  });
  return (Array.isArray(result.Data) ? result.Data : []).flatMap((item: unknown) => {
    const row = object(item);
    const uic = number(row.Identifier);
    const symbol = string(row.Symbol);
    if (row.AssetType !== "Stock" || uic === null || !Number.isInteger(uic) || !symbol) return [];
    return [{
      uic,
      assetType: "Stock" as const,
      symbol,
      description: string(row.Description) ?? symbol,
      exchangeId: string(row.ExchangeId) ?? "",
    }];
  });
}

export async function getStockQuote(accessToken: string, uic: number) {
  const result = await getSaxo(accessToken, "/trade/v1/infoprices", {
    Uic: String(uic),
    AssetType: "Stock",
    FieldGroups: "DisplayAndFormat,Quote,PriceInfo,PriceInfoDetails",
  });
  const quote = object(result.Quote);
  const priceInfo = object(result.PriceInfo);
  const details = object(result.PriceInfoDetails);
  const display = object(result.DisplayAndFormat);
  const quoteError = string(quote.ErrorCode) ?? string(result.ErrorCode);
  if (quoteError && quoteError !== "None") {
    throw new SaxoMarketError(403, "Saxo did not provide a quote for this listing. Check market-data access.");
  }

  const lastTraded = number(details.LastTraded);
  const mid = number(quote.Mid);
  const bid = number(quote.Bid);
  const ask = number(quote.Ask);
  const price = lastTraded !== null && lastTraded > 0 ? lastTraded
    : mid !== null && mid > 0 ? mid
    : bid !== null && bid > 0 ? bid
    : ask !== null && ask > 0 ? ask : null;
  const priceKind = lastTraded !== null && lastTraded > 0 ? "Last traded"
    : mid !== null && mid > 0 ? "Mid quote"
    : bid !== null && bid > 0 ? "Bid quote"
    : ask !== null && ask > 0 ? "Ask quote" : null;

  return {
    price,
    priceKind,
    percentChange: number(priceInfo.PercentChange),
    currency: string(display.Currency),
    delayedByMinutes: number(quote.DelayedByMinutes),
    updatedAt: string(result.LastUpdated)?.startsWith("0001-") ? null : string(result.LastUpdated),
  };
}

export async function getStockHistory(accessToken: string, uic: number) {
  const result = await getSaxo(accessToken, "/chart/v3/charts", {
    Uic: String(uic),
    AssetType: "Stock",
    Horizon: "1440",
    Count: "260",
  });
  const chartInfo = object(result.ChartInfo);
  const display = object(result.DisplayAndFormat);
  const bars = (Array.isArray(result.Data) ? result.Data : []).flatMap((item: unknown) => {
    const row = object(item);
    const time = string(row.Time);
    const close = number(row.Close);
    if (!time || Number.isNaN(Date.parse(time)) || close === null) return [];
    return [{ time, close }];
  }).sort((a, b) => Date.parse(a.time) - Date.parse(b.time));
  return {
    bars,
    currency: string(display.Currency),
    delayedByMinutes: number(chartInfo.DelayedByMinutes),
  };
}
