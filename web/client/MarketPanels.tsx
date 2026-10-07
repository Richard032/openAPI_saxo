import type { FormEvent } from "react";

type Props = {
  symbols: string[];
  newSymbol: string;
  onNewSymbolChange: (value: string) => void;
  onAddSymbol: (event: FormEvent<HTMLFormElement>) => void;
};

export function MarketPanels({ symbols, newSymbol, onNewSymbolChange, onAddSymbol }: Props) {
  return (
    <>
      <section className="summary-grid" aria-label="Market summary">
        <article className="summary-card">
          <div className="card-label">Tracked symbols</div>
          <div className="summary-value">{symbols.length.toString().padStart(2, "0")}</div>
          <div className="summary-foot">In your local watchlist</div>
        </article>
        <article className="summary-card">
          <div className="card-label">Market data</div>
          <div className="summary-value summary-value-small">Awaiting connection</div>
          <div className="summary-foot">Quotes will appear after permissions are configured</div>
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
            <span className="data-tag">Symbols only</span>
          </div>
          <form className="add-symbol-form" onSubmit={onAddSymbol}>
            <label className="visually-hidden" htmlFor="new-symbol">Add a ticker symbol</label>
            <input
              id="new-symbol"
              maxLength={10}
              onChange={(event) => onNewSymbolChange(event.target.value)}
              placeholder="Add a ticker, e.g. TSLA"
              value={newSymbol}
            />
            <button className="button button-dark" type="submit">Add symbol</button>
          </form>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Symbol</th><th>Last price</th><th>Today</th><th>History</th></tr>
              </thead>
              <tbody>
                {symbols.map((symbol) => (
                  <tr key={symbol}>
                    <td><span className="ticker-icon">{symbol.slice(0, 1)}</span><strong>{symbol}</strong></td>
                    <td className="muted">—</td>
                    <td className="muted">—</td>
                    <td><span className="pending-tag">Connect Saxo</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="panel-footnote">No live or historical prices are shown until a market-data connection is configured.</p>
        </section>

        <section className="panel history-panel" id="history">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">PRICE EXPLORER</p>
              <h2>Price history</h2>
            </div>
            <button className="period-select" type="button" disabled>1 year⌄</button>
          </div>
          <div className="chart-empty">
            <div className="chart-grid-lines" aria-hidden="true"><i /><i /><i /><i /></div>
            <div className="chart-empty-content">
              <span className="chart-icon" aria-hidden="true">⌁</span>
              <strong>History will appear here</strong>
              <span>Connect Saxo and select a symbol to load historical prices.</span>
            </div>
            <div className="chart-axis" aria-hidden="true"><span>1Y ago</span><span>6M ago</span><span>Today</span></div>
          </div>
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
