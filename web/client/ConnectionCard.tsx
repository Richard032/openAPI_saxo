import type { ConnectionState } from "./useSaxoConnection";

type Props = {
  state: ConnectionState;
  onCheck: () => void;
  onDisconnect: () => void;
};

const labels: Record<ConnectionState, string> = {
  checking: "Checking connection…",
  connected: "Connected to simulation",
  disconnected: "Not connected",
};

export function ConnectionCard({ state, onCheck, onDisconnect }: Props) {
  return (
    <div className="connect-card">
      <div className="connect-copy">
        <span className={`status-dot status-dot-${state}`} />
        <div>
          <strong>Owner connection</strong>
          <span>{labels[state]}</span>
        </div>
      </div>
      <button className="button button-secondary" onClick={onCheck} type="button">
        Check connection
      </button>
      {state === "connected" ? (
        <button className="button button-danger" onClick={onDisconnect} type="button">
          Disconnect Saxo
        </button>
      ) : state === "checking" ? (
        <button className="button button-primary" disabled type="button">
          Checking…
        </button>
      ) : (
        <a className="button button-primary" href="/auth/saxo/start">
          Connect Saxo <span aria-hidden="true">↗</span>
        </a>
      )}
    </div>
  );
}
