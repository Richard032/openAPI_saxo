import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";

const initialSymbols = ["AAPL", "MSFT", "NVDA"];
type ConnectionState = "checking" | "connected" | "disconnected";

function App() {
  const [symbols, setSymbols] = useState(initialSymbols);
  const [newSymbol, setNewSymbol] = useState("");
  const [message, setMessage] = useState("");
  const justConnected = useMemo(
    () => new URLSearchParams(window.location.search).get("connected") === "1",
    [],
  );
  const justDisconnected = useMemo(
    () => new URLSearchParams(window.location.search).get("disconnected") === "1",
    [],
  );
  const [connectionState, setConnectionState] = useState<ConnectionState>(() =>
    justConnected ? "connected" : justDisconnected ? "disconnected" : "checking",
  );
  const disconnectRequestInFlight = useRef(false);

  useEffect(() => {
    let active = true;

    async function loadConnectionStatus() {
      try {
        const response = await fetch("/api/saxo/status", {
          credentials: "same-origin",
          cache: "no-store",
        });
        if (!active) return;
        if (!response.ok) {
          setConnectionState(justConnected ? "connected" : "disconnected");
          return;
        }
        const result: { connected?: boolean } = await response.json();
        setConnectionState(result.connected ? "connected" : "disconnected");
      } catch {
        if (active) setConnectionState(justConnected ? "connected" : "disconnected");
      }
    }

    void loadConnectionStatus();
    return () => {
      active = false;
    };
  }, [justConnected]);

  useEffect(() => {
    if (connectionState !== "connected") return;

    function disconnectWhenLeaving() {
      if (disconnectRequestInFlight.current) return;
      void fetch("/api/saxo/disconnect", {
        method: "POST",
        credentials: "same-origin",
        keepalive: true,
        headers: { "Content-Type": "text/plain;charset=UTF-8" },
        body: "tab-closed",
      }).catch(() => {
        // Closing a tab is best-effort; the server also drops tokens on restart or expiry.
      });
    }

    window.addEventListener("pagehide", disconnectWhenLeaving);
    return () => window.removeEventListener("pagehide", disconnectWhenLeaving);
  }, [connectionState]);

  function addSymbol(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const symbol = newSymbol.trim().toUpperCase();
    if (!/^[A-Z][A-Z0-9.-]{0,9}$/.test(symbol)) {
      setMessage("Enter a ticker symbol, for example AAPL.");
      return;
    }
    if (symbols.includes(symbol)) {
      setMessage(`${symbol} is already on your list.`);
      return;
    }
    setSymbols((current) => [...current, symbol]);
    setNewSymbol("");
    setMessage(`${symbol} added to this browser's watchlist.`);
  }

  async function checkConnection() {
    setMessage("Checking the Saxo simulation connection…");
    try {
      const response = await fetch("/api/saxo/connection/check", {
        credentials: "same-origin",
      });
      if (response.ok) {
        const result: { connected?: boolean } = await response.json();
        setConnectionState(result.connected ? "connected" : "disconnected");
        setMessage(
          result.connected
            ? "Saxo simulation is connected."
            : "Saxo is not connected yet. Use Connect Saxo to authorize the simulation account.",
        );
      } else if (response.status === 401) {
        setConnectionState("disconnected");
        setMessage("Connect your Saxo simulation account to continue.");
      } else {
        setMessage("The Saxo connection check failed. Try again shortly.");
      }
    } catch {
      setMessage("Could not reach the demo server. Try again shortly.");
    }
  }

  async function disconnectSaxo() {
    disconnectRequestInFlight.current = true;
    setMessage("Disconnecting Saxo from this demo…");
    try {
      const response = await fetch("/api/saxo/disconnect", {
        method: "POST",
        credentials: "same-origin",
        keepalive: true,
        headers: { "Content-Type": "text/plain;charset=UTF-8" },
        body: "button",
      });
      if (response.ok) {
        setConnectionState("disconnected");
        setMessage("Saxo disconnected. The demo cleared its in-memory tokens.");
      } else if (response.status === 401) {
        setMessage("The demo admin sign-in expired. Connect again to sign in, then retry disconnecting.");
      } else {
        setMessage("Could not disconnect Saxo. Try again shortly.");
      }
    } catch {
      setMessage("Could not reach the demo server to disconnect Saxo.");
    } finally {
      disconnectRequestInFlight.current = false;
    }
  }

  const connectionLabel = {
    checking: "Checking connection…",
    connected: "Connected to simulation",
    disconnected: "Not connected",
  }[connectionState];

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="DotPro Saxo demo home">
          <span className="brand-mark">D</span>
          <span>DOTPRO <span className="brand-divider">/</span> MARKET DESK</span>
        </a>
        <nav className="top-nav" aria-label="Main navigation">
          <a href="#setup-guide">Getting started</a>
          <a className="active" href="#overview">Overview</a>
          <a href="#watchlist">Watchlist</a>
          <a href="#history">History</a>
          <a href="#outlook">6-month outlook</a>
        </nav>
        <div className="environment-pill"><span /> Saxo simulation</div>
      </header>

      <main className="page-content" id="overview">
        {justConnected && (
          <div className="notice success" role="status">
            Saxo simulation connected. Your tokens remain on the server.
          </div>
        )}
        {justDisconnected && (
          <div className="notice success" role="status">
            Saxo was disconnected from this demo. Its in-memory tokens were cleared.
          </div>
        )}
        {message && <div className="notice" role="status">{message}</div>}

        <section className="welcome-row">
          <div>
            <p className="eyebrow">OPENAPI · READ-ONLY WORKSPACE</p>
            <h1>Market overview</h1>
            <p className="intro">
              Explore prices and market history through your Saxo simulation connection.
            </p>
          </div>
          <div className="connect-card">
            <div className="connect-copy">
              <span className={`status-dot status-dot-${connectionState}`} />
              <div>
                <strong>Owner connection</strong>
                <span>{connectionLabel}</span>
              </div>
            </div>
            <button className="button button-secondary" onClick={checkConnection} type="button">
              Check connection
            </button>
            {connectionState === "connected" ? (
              <button className="button button-danger" onClick={disconnectSaxo} type="button">
                Disconnect Saxo
              </button>
            ) : connectionState === "checking" ? (
              <button className="button button-primary" disabled type="button">
                Checking…
              </button>
            ) : (
              <a className="button button-primary" href="/auth/saxo/start">
                Connect Saxo
                <span aria-hidden="true">↗</span>
              </a>
            )}
          </div>
        </section>

        <section className="panel setup-guide" id="setup-guide" aria-labelledby="setup-title">
          <div className="setup-heading">
            <div>
              <p className="eyebrow">CHAPTER 01 · SAXO OPENAPI</p>
              <h2 id="setup-title">Configure, publish, and connect</h2>
              <p className="setup-intro">
                Set up the Saxo simulation app and its secure server connection. These are the exact
                settings used by this demo.
              </p>
            </div>
            <span className="data-tag">Read-only · Simulation</span>
          </div>

          <div className="setup-steps">
            <article className="setup-step">
              <span className="step-number">01</span>
              <div>
                <h3>Create a Saxo simulation app</h3>
                <ol>
                  <li>Open the <a href="https://www.developer.saxo/" target="_blank" rel="noreferrer">Saxo Developer Portal</a>, sign in, then choose <strong>Apps → Simulation Apps → Create application</strong>.</li>
                  <li>Choose the <strong>Code</strong> grant and leave trading access disabled.</li>
                  <li>Set this exact redirect URI (including <code>/oauth/callback</code>):<br /><code>https://saxodemo.dotpro.ch/oauth/callback</code></li>
                  <li>Save the App Key and App Secret securely. You will enter them in Hostinger; never put them in WordPress content, Git, or browser code.</li>
                </ol>
              </div>
            </article>

            <article className="setup-step">
              <span className="step-number">02</span>
              <div>
                <h3>Configure the Hostinger web app</h3>
                <ol>
                  <li>In hPanel, open <strong>Websites → Web Apps</strong> and select the app for <code>saxodemo.dotpro.ch</code>.</li>
                  <li>Connect GitHub repository <code>Richard032/openAPI_saxo</code>, branch <code>main</code>, root directory <code>web</code>.</li>
                  <li>Use the Express/Node.js preset, Node 24, npm, and entry file <code>dist/server.js</code>. The <code>postinstall</code> script builds the React page into <code>dist/public</code>.</li>
                  <li>Add these server-side environment variables in the app settings:</li>
                </ol>
                <dl className="env-list">
                  <div><dt><code>NODE_ENV</code></dt><dd><code>production</code></dd></div>
                  <div><dt><code>PORT</code></dt><dd><code>3000</code> (or the port assigned by Hostinger)</dd></div>
                  <div><dt><code>SAXO_CLIENT_ID</code></dt><dd>Your Saxo App Key</dd></div>
                  <div><dt><code>SAXO_CLIENT_SECRET</code></dt><dd>Your Saxo App Secret</dd></div>
                  <div><dt><code>SAXO_REDIRECT_URI</code></dt><dd><code>https://saxodemo.dotpro.ch/oauth/callback</code></dd></div>
                  <div><dt><code>SAXO_ADMIN_USER</code></dt><dd>A demo admin username</dd></div>
                  <div><dt><code>SAXO_ADMIN_PASSWORD</code></dt><dd>A unique password of at least 20 characters</dd></div>
                </dl>
                <p className="setup-note">Keep the demo admin password separate from your Saxo account password. Do not send either password or the App Secret in chat.</p>
              </div>
            </article>

            <article className="setup-step">
              <span className="step-number">03</span>
              <div>
                <h3>Publish changes manually</h3>
                <ol>
                  <li>Make the change and test it. From the repository's <code>web</code> folder, run <code>npm ci</code>; its <code>postinstall</code> hook also builds the app. With dependencies already installed, run <code>npm run build</code> to build again.</li>
                  <li>From the repository root, commit the intended files and push them to GitHub's <code>main</code> branch. Keep <code>web/.env</code> out of Git.</li>
                  <li>In hPanel, open the <code>saxodemo.dotpro.ch</code> web app and start <strong>Deploy</strong> or <strong>Redeploy</strong> from its GitHub source. If automatic deployment is enabled, turn it off when you want the manual deploy action to control publishing.</li>
                  <li>Wait for the log to show the current commit, successful build, <strong>Published</strong>, and the server restart. Then check <code>https://saxodemo.dotpro.ch/healthz</code> for <code>{'{"ok":true}'}</code>.</li>
                </ol>
                <p className="setup-note">Hostinger's “Syncing public_html” line is part of its publish process. The app serves React from <code>dist/public</code>; you do not need to upload <code>index.html</code> separately in File Manager.</p>
              </div>
            </article>

            <article className="setup-step">
              <span className="step-number">04</span>
              <div>
                <h3>Connect your Saxo simulation account</h3>
                <ol>
                  <li>Open this demo and click <strong>Connect Saxo</strong>.</li>
                  <li>At the browser's Basic Authentication prompt, enter the demo admin username and password configured in Hostinger.</li>
                  <li>Sign in on Saxo's Simulation page with your Saxo account and authorize the app.</li>
                  <li>Saxo returns to the callback URL. The button turns red and reads <strong>Disconnect Saxo</strong>; use <strong>Check connection</strong> to verify the session.</li>
                </ol>
                <p className="setup-note">Closing or leaving a demo tab sends a best-effort request to clear the shared in-memory tokens; browsers cannot guarantee delivery during an abrupt shutdown, and closing one tab disconnects the demo in other tabs too. This clears the demo's session but does not revoke Saxo app consent. A server restart or redeployment also clears the tokens. Live quotes and price history still need their Saxo API endpoints and market-data permissions to be added.</p>
              </div>
            </article>
          </div>
        </section>

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
            <form className="add-symbol-form" onSubmit={addSymbol}>
              <label className="visually-hidden" htmlFor="new-symbol">Add a ticker symbol</label>
              <input
                id="new-symbol"
                maxLength={10}
                onChange={(event) => setNewSymbol(event.target.value)}
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
      </main>

      <footer className="footer">
        <span>DOTPRO · SAXO OPENAPI DEMO</span>
        <span>Simulation environment · Trading disabled</span>
      </footer>
    </div>
  );
}

export default App;
