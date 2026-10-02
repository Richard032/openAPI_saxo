# Saxo OpenAPI Market Data Demo

*Draft for a page on dotpro.ch. The page describes the planned demo; market data is not connected yet.*

Explore a watchlist of stocks, review their price history, and track a six-month outlook. The demo will
start in Saxo's simulation environment. Until the connection is configured, any charts or figures
shown on the page must be clearly marked as illustrative sample data.

## What the demo is designed to show

- A small, searchable stock watchlist with the latest available price and the time of the last update.
- A price-history chart with selectable date ranges.
- A six-month outlook attached to a selected stock, with its author, date, reasoning, and eventual
  result visible.
- A clear distinction between Saxo-provided market data, sample data, and any forecast.

The first version will be read-only. It will not place trades or ask visitors for Saxo login details.

## How Saxo OpenAPI access works

Saxo OpenAPI lets an application request authorized data from Saxo. The site needs a Saxo application
registration and an OAuth sign-in flow before it can request data. Start in Saxo's simulation
environment; live access can require additional approval, account permissions, and market-data
entitlements.

The broad setup is:

1. Register an application with Saxo and select the API access and environment it needs.
2. Register the site's HTTPS OAuth callback URL in that application.
3. Let the site send the visitor through Saxo's OAuth authorization flow.
4. Keep the application secret and access tokens on the server. The browser should receive only the
   data it needs to draw the demo.
5. Connect the demo to Saxo's instrument and chart data endpoints, then show the quote timestamp and
   data source.

Exact app settings and permissions depend on the Saxo application and account. This demo does not
need trading access.

## How this fits with Hostinger and WordPress

WordPress can serve the explanation page and the interactive demo, while a server-side integration
handles Saxo authorization and requests:

1. Keep the page in WordPress and use a small custom plugin for the Saxo connection. A plugin can
   provide a shortcode or block for the demo and a WordPress REST endpoint for its data.
2. Install the plugin through **WordPress Admin → Plugins → Add New → Upload Plugin**, if plugin
   uploads are enabled for the Hostinger plan.
3. Configure the Saxo application credentials and OAuth callback on the server, using Hostinger's
   supported secure configuration method. Never paste a client secret or access token into a page,
   a Custom HTML block, or browser JavaScript.
4. Serve the site over HTTPS, test with Saxo simulation, and ensure cached pages never contain
   personalized tokens or OAuth responses.
5. Add the plugin's shortcode or block to a WordPress page and test the full sign-in and data flow
   before enabling live access.

If the Hostinger plan does not support the server-side pieces the plugin needs, the same WordPress
page can call a separate backend hosted on a subdomain. In either case, Saxo credentials stay on the
server and WordPress only displays the approved response data.

## About the six-month outlook

A forecast is uncertain and should be shown as a forecast, not as a guaranteed return or a personal
recommendation. The first version should explain its method, show when it was created, and later
compare it with the actual price history. Live-data use and public display also need to follow Saxo's
terms and the relevant market-data permissions.

**Prototype status:** Saxo access, the forecast method, and live market-data entitlements have not
been configured. The demo should say so until they are in place.

---

## Site-owner notes (do not publish this section)

- Assumption: the intended site is `dotpro.ch`.
- There is no Hostinger or WordPress connection available in the development workspace, so this draft
  has not been installed or published.
- Recommended first deployment: a WordPress plugin that serves the demo UI and calls Saxo only from
  the server. Do not call Saxo directly from public JavaScript with a client secret or stored token.
- Start with a read-only simulation integration. Add the real Saxo callback URL and any credentials
  only after the WordPress plugin's server-side flow is ready.
- Open product question: should the six-month entry initially be a prediction the site owner writes
  and tracks, or an estimate computed by a documented model?
