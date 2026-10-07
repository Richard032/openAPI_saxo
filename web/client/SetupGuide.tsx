import { SaxoLoginFlow } from "./SaxoLoginFlow";

export function SetupGuide() {
  return (
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
              <li>Open this demo and enter the demo admin username and password configured in Hostinger when the browser asks for them.</li>
              <li>Click <strong>Connect Saxo</strong>.</li>
              <li>Sign in on Saxo's Simulation page with your Saxo account and authorize the app.</li>
              <li>Saxo returns to the callback URL. The button turns red and reads <strong>Disconnect Saxo</strong>; use <strong>Check connection</strong> to verify the session.</li>
            </ol>
            <p className="setup-note">Closing or leaving a demo tab sends a best-effort request to clear the shared in-memory tokens; browsers cannot guarantee delivery during an abrupt shutdown, and closing one tab disconnects the demo in other tabs too. This clears the demo's session but does not revoke Saxo app consent. A server restart or redeployment also clears the tokens. Live quotes and price history still need their Saxo API endpoints and market-data permissions to be added.</p>
          </div>
        </article>
      </div>
      <SaxoLoginFlow />
    </section>
  );
}
