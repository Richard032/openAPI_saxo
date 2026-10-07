import { useState, type FormEvent } from "react";
import { ConnectionCard } from "./ConnectionCard";
import { ContentTabs } from "./ContentTabs";
import { useSaxoConnection } from "./useSaxoConnection";

const initialSymbols = ["AAPL", "MSFT", "NVDA"];

function App() {
  const saxo = useSaxoConnection();
  const [symbols, setSymbols] = useState(initialSymbols);
  const [newSymbol, setNewSymbol] = useState("");

  function addSymbol(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const symbol = newSymbol.trim().toUpperCase();
    if (!/^[A-Z][A-Z0-9.-]{0,9}$/.test(symbol)) {
      saxo.setMessage("Enter a ticker symbol, for example AAPL.");
      return;
    }
    if (symbols.includes(symbol)) {
      saxo.setMessage(symbol + " is already on your list.");
      return;
    }
    setSymbols((current) => [...current, symbol]);
    setNewSymbol("");
    saxo.setMessage(symbol + " added to this browser's watchlist.");
  }

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

        <ContentTabs
          symbols={symbols}
          newSymbol={newSymbol}
          onNewSymbolChange={setNewSymbol}
          onAddSymbol={addSymbol}
        />
      </main>

      <footer className="footer">
        <span>DOTPRO · SAXO OPENAPI DEMO</span>
        <span>Simulation environment · Trading disabled</span>
      </footer>
    </div>
  );
}

export default App;
