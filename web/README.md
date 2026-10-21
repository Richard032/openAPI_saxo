# Saxo demo app

This React and TypeScript app is the first version of the demo for `saxodemo.dotpro.ch`. The React
dashboard is served by an Express server, which handles Saxo's simulation OAuth flow and keeps
credentials and tokens off the browser. The market panel searches Saxo stock listings, loads quote
snapshots, and charts daily closing prices. It does not place trades or generate forecasts.

## Saxo app settings

The service uses the **Simulation Apps** application with the **Code** grant and trading disabled.
Register this exact redirect URL in the Saxo app:

```text
https://saxodemo.dotpro.ch/oauth/callback
```

Set the same value as `SAXO_REDIRECT_URI`. OAuth callback URLs must match exactly. If the app was
registered with only the subdomain root, edit its redirect URL in Saxo to add the callback path.

Saxo's official [Authorization Code Grant documentation](https://www.developer.saxo/openapi/learn/oauth-authorization-code-grant)
specifies the simulation authorization and token endpoints, server-side client authentication, and
refresh flow. The service uses those endpoints:

- `https://sim.logonvalidation.net/authorize`
- `https://sim.logonvalidation.net/token`
- `https://gateway.saxobank.com/sim/openapi`

## Local development

### Visual Studio 2026 Professional (Windows)

Open a PowerShell window in the repository root and run:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\setup-visual-studio.ps1
```

The script uses the Node.js and npm tools included with Visual Studio's **Node.js development**
workload. It installs the exact libraries in `web/package-lock.json` and creates `web/.env` if needed.
The local settings file starts with placeholder credentials and is ignored by Git.

Open `openAPI_saxo.sln` in Visual Studio. Set **SaxoDemo** as the startup project and choose
**Saxo demo: server + browser** in the Start dropdown, then press **F5**. This starts the Express API,
the Vite React server, and Microsoft Edge together. The page opens at `http://localhost:5173`.
Set breakpoints in `web/src` for the server and `web/client` for the browser. Stop debugging with
**Shift+F5**. **Build > Build Solution** runs the TypeScript checks and production bundle.

To test the Saxo login, edit `web/.env` with your own Saxo app key and secret and a private admin
password of at least 20 characters. Register the exact callback
`http://localhost:3000/oauth/callback` in your Saxo Simulation app. Keep your production callback
registered as well. Saxo credentials are entered on Saxo's sign-in page after you click Connect.

### Other editors or command line

Use Node.js 20 or later with npm installed.

```sh
npm ci
cp .env.example .env
```

Put the app key and secret in `.env` locally. Keep `.env` private; it is ignored by Git. Set a long,
unique admin password. Run the backend and React dev server in two terminals:

```sh
npm run dev:server
npm run dev:client
```

Open `http://localhost:5173`. The Vite server forwards API and OAuth routes to Express on port 3000.
For a local OAuth test, set `SAXO_REDIRECT_URI=http://localhost:3000/oauth/callback` and register
that exact callback in the Saxo app.

## Routes

- `GET /healthz` reports process readiness.
- `GET /auth/saxo/start` begins OAuth and requires HTTP Basic authentication.
- `GET /oauth/callback` accepts Saxo's redirect and validates the one-time state cookie.
- `GET /api/saxo/status` reports whether an owner account is connected; it requires HTTP Basic auth.
- `GET /api/saxo/connection/check` verifies the session through Saxo's logged-in client endpoint.
  It returns only a connected flag and requires HTTP Basic auth.
- `GET /api/market/stocks?q=AAPL` searches stock listings available to the connected Saxo user.
- `GET /api/market/quote?uic=...` returns a normalized quote snapshot for a Saxo stock ID.
- `GET /api/market/history?uic=...` returns up to 260 daily closes for that stock ID.
  All three market routes require HTTP Basic auth and an active Saxo connection.
- `POST /api/saxo/disconnect` clears the in-memory tokens; it requires HTTP Basic auth and a
  same-origin request. The dashboard calls it from the red **Disconnect Saxo** button and makes a
  best-effort request when a connected tab is closed or navigated away from.

All credentials and token responses stay on the server. The client secret, access token, and refresh
token are never returned to browser JavaScript or written to logs. Stock listings and prices are
returned to the authenticated browser to display the watchlist and chart. The current
prototype keeps one shared connection in process memory, so closing any demo tab attempts to clear it,
and restart or redeployment requires reconnecting. Browser shutdown requests can fail to reach the
server, so the tab-close disconnect is best-effort. It clears this demo's token copy; it does not
revoke Saxo's app authorization. Add an encrypted persistent token store before relying on this
service continuously.

## Market panel

After connecting Saxo, the starter AAPL, MSFT, and NVDA symbols are added only if Saxo confirms their
exact Nasdaq listings. To add another stock, search by ticker or name and select a result returned by
Saxo. An unknown symbol is not added; a ticker alone is not enough to identify its exchange listing. The
selected listing supplies Saxo's UIC to the quote and chart requests. Quotes refresh every minute or
when **Refresh prices** is clicked. The chart shows up to 260 daily close samples. Saxo may supply
delayed data or refuse a quote depending on the simulation account's market-data permissions. The
watchlist is currently browser memory only, so manually added listings disappear on reload.

## Hostinger deployment

Create a Node.js web app for `saxodemo.dotpro.ch` from the GitHub repository. Use the `web` root
directory and an Express/Node.js framework preset, since Express serves the built React interface as
well as the API. Use Node.js 20 or later. Configure these values through Hostinger's server-side
environment settings, not a WordPress page or browser bundle:

- `NODE_ENV=production`
- `PORT` (use the port assigned by the host)
- `SAXO_CLIENT_ID` (Saxo App Key)
- `SAXO_CLIENT_SECRET` (Saxo App Secret)
- `SAXO_REDIRECT_URI=https://saxodemo.dotpro.ch/oauth/callback`
- `SAXO_ADMIN_USER`
- `SAXO_ADMIN_PASSWORD` (at least 20 characters)

The package's `postinstall` hook runs `npm run build`, so Hostinger can generate the entry file even
when its deploy settings show no separate build command. The React interface is emitted under
`dist/public`; the Express server starts from `dist/server.js` and serves that directory. Set the
Hostinger entry file to `dist/server.js`.

This prototype's administration routes are protected by HTTP Basic authentication. Use them only over
HTTPS. Do not expose the owner-authorized connection or Saxo market data publicly until Saxo's
application terms and market-data permissions allow that use.
