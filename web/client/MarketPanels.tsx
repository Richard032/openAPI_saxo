import type { MarketData, History, Quote } from "./useMarketData";
import type { ConnectionState } from "./useSaxoConnection";

type Props = { market: MarketData; connection: ConnectionState };

function priceText(value: number | null, currency: string | null): string {
  if (value === null) return "—";
  const formatted = new Intl.NumberFormat(undefined, { maximumFractionDigits: 4 }).format(value);
  return currency ? `${formatted} ${currency}` : formatted;
}

function delayText(minutes: number | null): string {
  return minutes === null ? "Delay not reported"
    : minutes === 0 ? "No reported delay" : `Delayed ${minutes} min`;
}

function HistoryChart({ history }: { history: History }) {
  const bars = history.bars;
  const closes = bars.map((bar) => bar.close);
  const low = Math.min(...closes);
  const high = Math.max(...closes);
  const spread = high - low || Math.max(Math.abs(high) * 0.02, 1);
  const points = bars.map((bar, index) => {
    const x = 16 + (index / Math.max(bars.length - 1, 1)) * 568;
    const y = 200 - ((bar.close - low) / spread) * 176;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const first = bars[0]!;
  const last = bars[bars.length - 1]!;
  const date = (value: string) => new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

  return (
    <div className="history-chart">
      <div className="chart-range">
        <span>High {priceText(high, history.currency)}</span>
        <span>Low {priceText(low, history.currency)}</span>
      </div>
      <svg viewBox="0 0 600 224" role="img" aria-label={`Daily closing prices from ${date(first.time)} to ${date(last.time)}`}>
        <title>Daily closing prices</title>
        <line x1="16" x2="584" y1="24" y2="24" />
        <line x1="16" x2="584" y1="112" y2="112" />
        <line x1="16" x2="584" y1="200" y2="200" />
        <polyline points={points} />
      </svg>
      <div className="chart-dates"><span>{date(first.time)}</span><span>{date(last.time)}</span></div>
    </div>
  );
}

function QuoteCell({ quote, error, loading }: { quote?: Quote; error?: string; loading: boolean }) {
  if (error) return <span className="quote-cell market-error"><strong>Unavailable</strong><small>{error}</small></span>;
  if (!quote) return <span className="muted">{loading ? "Loading…" : "—"}</span>;
  return (
    <span className="quote-cell">
      <strong>{priceText(quote.price, quote.currency)}</strong>
      <small>{quote.priceKind ?? "No price"} · {delayText(quote.delayedByMinutes)}</small>
    </span>
  );
}

export function MarketPanels({ market, connection }: Props) {
  const selectedInstrument = market.selected?.instrument;
  return (
    <>
      <section className="summary-grid" aria-label="Market summary">
        <article className="summary-card">
          <div className="card-label">Tracked symbols</div>
          <div className="summary-value">{market.watchlist.length.toString().padStart(2, "0")}</div>
          <div className="summary-foot">In this browser's watchlist</div>
        </article>
        <article className="summary-card">
          <div className="card-label">Market data</div>
          <div className="summary-value summary-value-small">{connection === "connected" ? `${market.watchlist.length} verified listings` : "Awaiting connection"}</div>
          <div className="summary-foot">{connection === "connected" ? "Quote snapshots refresh each minute" : "Connect Saxo to load quotes and history"}</div>
        </article>
        <article className="summary-card outlook-summary">
          <div className="card-label">Research horizon</div>
          <div className="summary-value">6 months</div>
          <div className="summary-foot">Forecast concept · no prediction yet</div>
        </article>
      </section>

      <div className="workspace-grid">
        <section className="panel watchlist-panel" id="watchlist">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">YOUR SELECTION</p>
              <h2>Watchlist</h2>
            </div>
            <button className="button button-secondary" type="button" disabled={connection !== "connected" || market.quotesLoading} onClick={market.refresh}>Refresh prices</button>
          </div>
          <form className="add-symbol-form" onSubmit={market.onSearch}>
            <label className="visually-hidden" htmlFor="new-symbol">Search for a stock ticker or name</label>
            <input
              id="new-symbol"
              maxLength={30}
              onChange={(event) => market.setSearchTerm(event.target.value)}
              placeholder="Search Saxo, e.g. TSLA"
              value={market.searchTerm}
            />
            <button className="button button-dark" type="submit" disabled={market.searchLoading}>Search</button>
          </form>
          {market.searchMessage && <p className="market-message" role="status">{market.searchMessage}</p>}
          {market.searchResults.length > 0 && (
            <div className="search-results" aria-label="Saxo stock listings">
              <strong>Choose the correct listing</strong>
              {market.searchResults.map((instrument) => (
                <button key={instrument.uic} type="button" disabled={connection !== "connected"} onClick={() => market.chooseInstrument(instrument)}>
                  <span><b>{instrument.symbol}</b> · {instrument.description}</span>
                  <small>{instrument.exchangeId || "Exchange unknown"}</small>
                </button>
              ))}
            </div>
          )}
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Symbol / listing</th><th>Price</th><th>Today</th><th>History</th></tr>
              </thead>
              <tbody>
                {market.watchlist.length === 0 && (
                  <tr><td colSpan={4} className="empty-watchlist">{connection === "connected" ? "No verified stocks yet. Search for a symbol and choose a Saxo listing." : "Connect Saxo to verify and load stock symbols."}</td></tr>
                )}
                {market.watchlist.map((item) => {
                  const quote = market.quotes[item.instrument.uic];
                  const change = quote?.percentChange;
                  return (
                    <tr key={item.key} className={market.selectedKey === item.key ? "selected-stock" : ""}>
                      <td>
                        <span className="ticker-icon">{item.ticker.slice(0, 1)}</span>
                        <span className="stock-label"><strong>{item.ticker}</strong><small>{item.instrument.symbol}</small></span>
                      </td>
                      <td><QuoteCell quote={quote} error={market.quoteErrors[item.instrument.uic]} loading={market.quotesLoading} /></td>
                      <td className={change === null || change === undefined ? "muted" : change >= 0 ? "positive-change" : "negative-change"}>
                        {change === null || change === undefined ? "—" : `${change > 0 ? "+" : ""}${change.toFixed(2)}%`}
                      </td>
                      <td><button className="text-button" type="button" onClick={() => market.setSelectedKey(item.key)}>View chart</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="panel-footnote">Prices come from Saxo simulation. Data availability and delay depend on your market-data permissions.</p>
        </section>

        <section className="panel history-panel" id="history">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">PRICE EXPLORER</p>
              <h2>Price history</h2>
            </div>
            <span className="period-select">260 daily bars</span>
          </div>
          {selectedInstrument && <p className="chart-caption"><strong>{selectedInstrument.symbol}</strong> · {selectedInstrument.description}</p>}
          {market.history && market.history.uic === selectedInstrument?.uic && market.history.bars.length > 0 ? (
            <>
              <HistoryChart history={market.history} />
              <p className="panel-footnote">Daily closing prices · {delayText(market.history.delayedByMinutes)}</p>
            </>
          ) : (
            <div className="chart-empty">
              <div className="chart-grid-lines" aria-hidden="true"><i /><i /><i /><i /></div>
              <div className="chart-empty-content">
                <span className="chart-icon" aria-hidden="true">⌁</span>
                <strong>{market.historyLoading ? "Loading Saxo history…" : market.historyError ? "History unavailable" : "History will appear here"}</strong>
                <span>{market.historyError || (connection !== "connected" ? "Connect Saxo to load historical prices." : !selectedInstrument ? "Choose a Saxo listing to load its history." : "No daily history was returned for this listing.")}</span>
              </div>
            </div>
          )}
        </section>

        <section className="panel forecast-panel" id="outlook">
          <div className="forecast-intro">
            <div>
              <p className="eyebrow">EXPERIMENTAL RESEARCH</p>
              <h2>Six-month outlook</h2>
            </div>
            <span className="idea-badge">IDEA STAGE</span>
          </div>
          <div className="forecast-body">
            <div className="forecast-orbit" aria-hidden="true"><span>6<br /><small>MO</small></span></div>
            <div>
              <strong>No forecast has been generated</strong>
              <p>First we’ll connect verified price history. Then we can design and compare transparent scenarios together.</p>
            </div>
          </div>
          <div className="disclaimer">Any future forecast is experimental information, not investment advice.</div>
        </section>
      </div>
    </>
  );
}
