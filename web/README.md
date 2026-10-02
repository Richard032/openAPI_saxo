# Saxo demo web service

This TypeScript/Node service is the server side of the demo on `saxodemo.dotpro.ch`. The first
milestone completes Saxo's simulation OAuth flow and checks the authenticated connection. It does
not place trades or expose the access token to a browser.

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
unique admin password. Start in development mode with `npm run dev`, then open
`http://localhost:3000/auth/saxo/start` and enter the admin credentials when prompted. The local
callback must also be registered in the Saxo app before this flow can complete.

## Routes

- `GET /healthz` reports process readiness.
- `GET /auth/saxo/start` begins OAuth and requires HTTP Basic authentication.
- `GET /oauth/callback` accepts Saxo's redirect and validates the one-time state cookie.
- `GET /api/saxo/status` reports whether an owner account is connected; it requires HTTP Basic auth.
- `GET /api/saxo/connection/check` verifies the session through Saxo's logged-in client endpoint.
  It returns only a connected flag and requires HTTP Basic auth.

All credentials and token responses stay on the server. The client secret, access token, refresh
token, and Saxo account data are never returned to browser JavaScript or written to logs. The current
prototype keeps tokens in process memory, so restart or redeployment requires reconnecting. Add an
encrypted persistent token store before relying on this service continuously.

## Hostinger deployment

Deploy this as a Node.js application on the `saxodemo.dotpro.ch` subdomain only if the Hostinger plan
provides a Node.js runtime. Configure these values through the host's server-side environment
settings, not a WordPress page or browser bundle:

- `NODE_ENV=production`
- `PORT` (use the port assigned by the host)
- `SAXO_CLIENT_ID` (Saxo App Key)
- `SAXO_CLIENT_SECRET` (Saxo App Secret)
- `SAXO_REDIRECT_URI=https://saxodemo.dotpro.ch/oauth/callback`
- `SAXO_ADMIN_USER`
- `SAXO_ADMIN_PASSWORD` (at least 20 characters)

Build with `npm ci && npm run build` and start with `npm start`. If this Hostinger plan cannot run
Node.js, keep WordPress on `dotpro.ch` and deploy the TypeScript service to a Node-capable host,
pointing `saxodemo.dotpro.ch` there with DNS.

This prototype's administration routes are protected by HTTP Basic authentication. Use them only over
HTTPS. Do not expose the owner-authorized connection or Saxo market data publicly until Saxo's
application terms and market-data permissions allow that use.
