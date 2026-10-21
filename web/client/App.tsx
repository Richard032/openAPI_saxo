import { ConnectionCard } from "./ConnectionCard";
import { ContentTabs } from "./ContentTabs";
import { useMarketData } from "./useMarketData";
import { useSaxoConnection } from "./useSaxoConnection";

function App() {
  const saxo = useSaxoConnection();
  const market = useMarketData(saxo.state);

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="DotPro Saxo demo home">
          <span className="brand-mark">D</span>
          <span>DOTPRO <span className="brand-divider">/</span> MARKET DESK</span>
        </a>
        <div className="environment-pill"><span /> Saxo simulation</div>
      </header>

      <main className="page-content" id="overview">
        {saxo.justConnected && (
          <div className="notice success" role="status">
            Saxo simulation connected. Your tokens remain on the server.
          </div>
        )}
        {saxo.justDisconnected && (
          <div className="notice success" role="status">
            Saxo was disconnected from this demo. Its in-memory tokens were cleared.
          </div>
        )}
        {saxo.message && <div className="notice" role="status">{saxo.message}</div>}

        <section className="welcome-row">
          <div>
            <p className="eyebrow">OPENAPI · READ-ONLY WORKSPACE</p>
            <h1>Market overview</h1>
            <p className="intro">
              Explore prices and market history through your Saxo simulation connection.
            </p>
          </div>
          <ConnectionCard
            state={saxo.state}
            onCheck={saxo.checkConnection}
            onDisconnect={saxo.disconnect}
          />
        </section>

        <ContentTabs market={market} connection={saxo.state} />
      </main>

      <footer className="footer">
        <span>DOTPRO · SAXO OPENAPI DEMO</span>
        <span>Simulation environment · Trading disabled</span>
      </footer>
    </div>
  );
}

export default App;
