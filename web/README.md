# Saxo demo app

This React and TypeScript app is the first version of the demo for `saxodemo.dotpro.ch`. The React
dashboard is served by an Express server, which handles Saxo's simulation OAuth flow and keeps
credentials and tokens off the browser. The current dashboard is a UI shell: it does not yet load
quotes or historical prices, and it does not place trades.

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

Use Node.js 20 or later.

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
- `POST /api/saxo/disconnect` clears the in-memory tokens; it requires HTTP Basic auth and a
  same-origin request. The dashboard calls it from the red **Disconnect Saxo** button and makes a
  best-effort request when a connected tab is closed or navigated away from.

All credentials and token responses stay on the server. The client secret, access token, refresh
token, and Saxo account data are never returned to browser JavaScript or written to logs. The current
prototype keeps one shared connection in process memory, so closing any demo tab attempts to clear it,
and restart or redeployment requires reconnecting. Browser shutdown requests can fail to reach the
server, so the tab-close disconnect is best-effort. It clears this demo's token copy; it does not
revoke Saxo's app authorization. Add an encrypted persistent token store before relying on this
service continuously.

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
