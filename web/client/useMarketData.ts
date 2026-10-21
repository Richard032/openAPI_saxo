import { useEffect, useState, type FormEvent } from "react";
import type { ConnectionState } from "./useSaxoConnection";

export type StockInstrument = {
  uic: number;
  assetType: "Stock";
  symbol: string;
  description: string;
  exchangeId: string;
};

export type Quote = {
  price: number | null;
  priceKind: string | null;
  percentChange: number | null;
  currency: string | null;
  delayedByMinutes: number | null;
  updatedAt: string | null;
};

export type History = {
  uic: number;
  bars: { time: string; close: number }[];
  currency: string | null;
  delayedByMinutes: number | null;
};

export type WatchItem = { key: string; ticker: string; instrument: StockInstrument };

const starterTickers = ["AAPL", "MSFT", "NVDA"];

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(path, { credentials: "same-origin", cache: "no-store" });
  if (!response.ok) {
    const result = await response.json().catch(() => ({})) as { message?: string };
    throw new Error(result.message ?? (response.status === 401
      ? "Enter the demo admin username and password, then try again."
      : "Could not load market data."));
  }
  return await response.json() as T;
}

export function useMarketData(connection: ConnectionState) {
  const [watchlist, setWatchlist] = useState<WatchItem[]>([]);
  const [selectedKey, setSelectedKey] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<StockInstrument[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchMessage, setSearchMessage] = useState("");
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [quoteErrors, setQuoteErrors] = useState<Record<string, string>>({});
  const [quotesLoading, setQuotesLoading] = useState(false);
  const [history, setHistory] = useState<History | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [refreshNumber, setRefreshNumber] = useState(0);

  const selected = watchlist.find((item) => item.key === selectedKey) ?? null;
  const instrumentSignature = watchlist.map((item) => `${item.key}:${item.instrument.uic}`).join("|");

  // Starter symbols enter the watchlist only after Saxo confirms an exact Nasdaq listing.
  useEffect(() => {
    if (connection !== "connected") return;
    let active = true;
    void Promise.all(starterTickers.map(async (ticker) => {
      try {
        const results = await getJson<StockInstrument[]>(`/api/market/stocks?q=${encodeURIComponent(ticker)}`);
        const instrument = results.find((item) => item.symbol.toUpperCase() === `${ticker}:XNAS`);
        return instrument ? { key: ticker, ticker, instrument } : null;
      } catch {
        return null;
      }
    })).then((matches) => {
      if (!active) return;
      const verified = matches.filter((item): item is WatchItem => item !== null);
      setWatchlist((current) => [
        ...current,
        ...verified.filter((item) => !current.some((existing) =>
          existing.ticker === item.ticker || existing.instrument.uic === item.instrument.uic)),
      ]);
      setSelectedKey((current) => current || verified[0]?.key || "");
    });
    return () => { active = false; };
  }, [connection]);

  // Quote snapshots are refreshed once per minute while the Saxo session is connected.
  useEffect(() => {
    if (connection !== "connected" || !instrumentSignature) {
      setQuotes({});
      setQuoteErrors({});
      return;
    }
    let active = true;
    const instruments = watchlist;
    async function loadQuotes() {
      setQuotesLoading(true);
      const results = await Promise.all(instruments.map(async (item) => {
        const key = String(item.instrument.uic);
        try {
          const quote = await getJson<Quote>(`/api/market/quote?uic=${item.instrument.uic}`);
          return { key, quote };
        } catch (error) {
          return { key, error: error instanceof Error ? error.message : "Quote unavailable." };
        }
      }));
      if (!active) return;
      const nextQuotes: Record<string, Quote> = {};
      const nextErrors: Record<string, string> = {};
      for (const result of results) {
        if ("quote" in result && result.quote) nextQuotes[result.key] = result.quote;
        if ("error" in result && result.error) nextErrors[result.key] = result.error;
      }
      setQuotes(nextQuotes);
      setQuoteErrors(nextErrors);
      setQuotesLoading(false);
    }
    void loadQuotes();
    const timer = window.setInterval(() => void loadQuotes(), 60_000);
    return () => { active = false; window.clearInterval(timer); };
  }, [connection, instrumentSignature, refreshNumber]);

  // History follows the selected row; each bar is one day and the chart uses its close.
  useEffect(() => {
    const uic = selected?.instrument.uic;
    if (connection !== "connected" || uic === undefined) {
      setHistory(null);
      setHistoryError("");
      return;
    }
    let active = true;
    setHistory(null);
    setHistoryError("");
    setHistoryLoading(true);
    void getJson<Omit<History, "uic">>(`/api/market/history?uic=${uic}`)
      .then((result) => { if (active) setHistory({ ...result, uic }); })
      .catch((error: unknown) => {
        if (active) setHistoryError(error instanceof Error ? error.message : "History unavailable.");
      })
      .finally(() => { if (active) setHistoryLoading(false); });
    return () => { active = false; };
  }, [connection, selected?.instrument.uic, refreshNumber]);

  async function search(query: string) {
    if (connection !== "connected") {
      setSearchMessage("Connect Saxo before searching for stocks.");
      return;
    }
    const trimmed = query.trim();
    if (!/^[A-Za-z0-9 .-]{1,30}$/.test(trimmed)) {
      setSearchMessage("Enter a stock ticker or name (up to 30 characters).");
      return;
    }
    setSearchLoading(true);
    setSearchMessage("");
    setSearchResults([]);
    try {
      const results = await getJson<StockInstrument[]>(`/api/market/stocks?q=${encodeURIComponent(trimmed)}`);
      setSearchResults(results);
      if (results.length === 0) setSearchMessage("Saxo found no accessible stock listing for that symbol or name. Nothing was added.");
    } catch (error) {
      setSearchMessage(error instanceof Error ? error.message : "Stock search failed.");
    } finally {
      setSearchLoading(false);
    }
  }

  function onSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void search(searchTerm);
  }

  function chooseInstrument(instrument: StockInstrument) {
    const existing = watchlist.find((item) => item.instrument.uic === instrument.uic);
    if (existing) {
      setSelectedKey(existing.key);
      setSearchMessage(`${instrument.symbol} is already on your watchlist.`);
      return;
    }
    const ticker = instrument.symbol.split(":", 1)[0]?.toUpperCase() ?? instrument.symbol;
    const key = `stock-${instrument.uic}`;
    setWatchlist((current) => [...current, { key, ticker, instrument }]);
    setSelectedKey(key);
    setSearchTerm("");
    setSearchResults([]);
    setSearchMessage("");
  }

  return {
    watchlist, selected, selectedKey, setSelectedKey,
    searchTerm, setSearchTerm, searchResults, searchLoading, searchMessage,
    onSearch, chooseInstrument,
    quotes, quoteErrors, quotesLoading, history, historyLoading, historyError,
    refresh: () => setRefreshNumber((value) => value + 1),
  };
}

export type MarketData = ReturnType<typeof useMarketData>;
