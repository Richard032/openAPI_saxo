type Actor = 1 | 2 | 3 | 4;

const actors = ["You", "Browser", "Demo server", "Saxo Simulation"];

const messages: { from: Actor; to: Actor; label: string }[] = [
  { from: 1, to: 2, label: "Open saxodemo.dotpro.ch" },
  { from: 2, to: 3, label: "Load the page and check /api/saxo/status" },
  { from: 3, to: 2, label: "Ask for demo admin credentials" },
  { from: 1, to: 2, label: "Enter demo admin username and password" },
  { from: 2, to: 3, label: "Retry status check with credentials" },
  { from: 3, to: 2, label: "Show connection status" },
  { from: 1, to: 2, label: "Click Connect Saxo" },
  { from: 2, to: 3, label: "GET /auth/saxo/start" },
  { from: 3, to: 2, label: "Redirect to Saxo Simulation" },
  { from: 2, to: 4, label: "Open Saxo sign-in page" },
  { from: 1, to: 4, label: "Sign in and authorize the app" },
  { from: 4, to: 2, label: "Return with a temporary authorization code" },
  { from: 2, to: 3, label: "GET /oauth/callback with code" },
  { from: 3, to: 4, label: "Exchange code for tokens" },
  { from: 4, to: 3, label: "Access token and refresh token" },
  { from: 3, to: 2, label: "Return to page showing Connected" },
];

export function SaxoLoginFlow() {
  return (
    <section className="login-flow" aria-labelledby="login-flow-title">
      <p className="eyebrow">CONNECTION FLOW</p>
      <h3 id="login-flow-title">How the two logins work</h3>
      <div className="sequence-scroll">
        <div className="sequence-diagram">
          <div className="sequence-actors">
            {actors.map((actor) => <strong key={actor}>{actor}</strong>)}
          </div>
          <div className="sequence-body">
            {actors.map((actor, index) => (
              <span
                key={actor}
                className="sequence-lifeline"
                style={{ left: `${12.5 + index * 25}%` }}
                aria-hidden="true"
              />
            ))}
            <ol className="sequence-messages">
              {messages.map(({ from, to, label }, index) => {
                const first = Math.min(from, to);
                const span = Math.abs(to - from) + 1;
                return (
                  <li key={index}>
                    <div
                      className={from > to ? "sequence-message reverse" : "sequence-message"}
                      style={{ gridColumn: `${first} / span ${span}`, marginInline: `${50 / span}%` }}
                      aria-label={`${actors[from - 1]} to ${actors[to - 1]}: ${label}`}
                    >
                      <span>{label}</span>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </div>
      <p className="login-flow-note">The admin prompt appears when the demo opens. Your Saxo password is entered at Saxo; only tokens return to the demo server.</p>
    </section>
  );
}
