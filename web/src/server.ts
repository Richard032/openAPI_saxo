import { randomBytes, timingSafeEqual } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import express, { type NextFunction, type Request, type Response } from "express";
import { config } from "./config.js";
import { getStockHistory, getStockQuote, SaxoMarketError, searchStocks } from "./marketData.js";
import {
  checkSaxoConnection,
  createAuthorizationUrl,
  exchangeAuthorizationCode,
  refreshSaxoTokens,
  type SaxoTokens,
} from "./saxo.js";

const app = express();
const stateCookieName = "saxo_oauth_state";
let tokens: SaxoTokens | null = null;
let refreshInFlight: Promise<string> | null = null;

app.disable("x-powered-by");
app.set("trust proxy", 1);

function sameSecret(actual: string, expected: string): boolean {
  const actualBytes = Buffer.from(actual);
  const expectedBytes = Buffer.from(expected);
  return actualBytes.length === expectedBytes.length && timingSafeEqual(actualBytes, expectedBytes);
}

function requireAdmin(request: Request, response: Response, next: NextFunction): void {
  const authorization = request.header("authorization") ?? "";
  const [scheme, encoded] = authorization.split(" ", 2);
  if (scheme !== "Basic" || !encoded) {
    response.setHeader("WWW-Authenticate", 'Basic realm="Saxo demo administration"');
    response.sendStatus(401);
    return;
  }

  let credentials: string;
  try {
    credentials = Buffer.from(encoded, "base64").toString("utf8");
  } catch {
    response.sendStatus(401);
    return;
  }

  const separator = credentials.indexOf(":");
  const user = separator >= 0 ? credentials.slice(0, separator) : "";
  const password = separator >= 0 ? credentials.slice(separator + 1) : "";
  if (!sameSecret(user, config.adminUser) || !sameSecret(password, config.adminPassword)) {
    response.setHeader("WWW-Authenticate", 'Basic realm="Saxo demo administration"');
    response.sendStatus(401);
    return;
  }
  next();
}

function requireSameOrigin(request: Request, response: Response, next: NextFunction): void {
  const origin = request.header("origin");
  const appOrigin = new URL(config.redirectUri).origin;
  const localDevelopmentOrigins = new Set([
    "http://localhost:5173",
    "http://127.0.0.1:5173",
  ]);
  const allowed = origin === appOrigin || (!config.isProduction && localDevelopmentOrigins.has(origin ?? ""));
  if (!allowed) {
    response.sendStatus(403);
    return;
  }
  next();
}

function cookieValue(request: Request, name: string): string | undefined {
  const prefix = `${name}=`;
  return request.headers.cookie
    ?.split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(prefix))
    ?.slice(prefix.length);
}

function clearStateCookie(response: Response): void {
  response.setHeader(
    "Set-Cookie",
    `${stateCookieName}=; Path=/oauth/callback; HttpOnly; SameSite=Lax; Max-Age=0${config.isProduction ? "; Secure" : ""}`,
  );
}

function currentAccessToken(): Promise<string> {
  if (!tokens) {
    throw new Error("Saxo is not connected");
  }

  if (tokens.accessTokenExpiresAt > Date.now() + 60_000) {
    return Promise.resolve(tokens.accessToken);
  }

  if (tokens.refreshTokenExpiresAt !== null && tokens.refreshTokenExpiresAt <= Date.now()) {
    tokens = null;
    throw new Error("Saxo refresh token expired; connect again");
  }

  // A watchlist makes several requests at once. Refresh the shared token only once.
  if (!refreshInFlight) {
    const previous = tokens;
    refreshInFlight = refreshSaxoTokens(previous.refreshToken)
      .then((refreshed) => {
        if (tokens !== previous) throw new Error("Saxo connection changed during refresh");
        tokens = refreshed;
        return refreshed.accessToken;
      })
      .catch((error: unknown) => {
        if (tokens === previous) tokens = null;
        throw error;
      })
      .finally(() => { refreshInFlight = null; });
  }
  return refreshInFlight;
}

app.get("/healthz", (_request, response) => {
  response.json({ ok: true });
});

app.get("/auth/saxo/start", requireAdmin, (_request, response) => {
  const state = randomBytes(32).toString("hex");
  response.setHeader(
    "Set-Cookie",
    `${stateCookieName}=${state}; Path=/oauth/callback; HttpOnly; SameSite=Lax; Max-Age=600${config.isProduction ? "; Secure" : ""}`,
  );
  response.redirect(302, createAuthorizationUrl(state));
});

app.get("/oauth/callback", async (request, response) => {
  const returnedState = typeof request.query.state === "string" ? request.query.state : "";
  const savedState = cookieValue(request, stateCookieName) ?? "";
  const code = typeof request.query.code === "string" ? request.query.code : "";
  clearStateCookie(response);

  if (!returnedState || !savedState || !sameSecret(returnedState, savedState)) {
    response.status(400).send("Saxo sign-in could not be verified. Please start again.");
    return;
  }
  if (!code) {
    response.status(400).send("Saxo did not return an authorization code. Please start again.");
    return;
  }

  try {
    tokens = await exchangeAuthorizationCode(code);
    response.redirect(303, config.isProduction ? "/?connected=1" : "http://localhost:5173/?connected=1");
  } catch {
    response.status(502).send("Saxo token exchange failed. Check the server configuration and try again.");
  }
});

app.get("/api/saxo/status", requireAdmin, (_request, response) => {
  response.json({ connected: tokens !== null });
});

app.post("/api/saxo/disconnect", requireSameOrigin, requireAdmin, (_request, response) => {
  tokens = null;
  response.json({ connected: false });
});

app.get("/api/saxo/connection/check", requireAdmin, async (_request, response) => {
  if (!tokens) {
    response.json({ connected: false });
    return;
  }

  try {
    const accessToken = await currentAccessToken();
    const connected = await checkSaxoConnection(accessToken);
    if (!connected) {
      tokens = null;
      response.status(401).json({ connected: false });
      return;
    }
    response.json({ connected: true });
  } catch {
    response.status(502).json({ connected: false, message: "Saxo connection check failed." });
  }
});

function stockUic(request: Request): number | null {
  const value = request.query.uic;
  if (typeof value !== "string" || !/^[1-9][0-9]{0,11}$/.test(value)) return null;
  const uic = Number(value);
  return Number.isSafeInteger(uic) ? uic : null;
}

async function serveMarketData(response: Response, load: (accessToken: string) => Promise<unknown>): Promise<void> {
  if (!tokens) {
    response.status(409).json({ message: "Connect Saxo before loading market data." });
    return;
  }
  try {
    const result = await load(await currentAccessToken());
    response.setHeader("Cache-Control", "no-store");
    response.json(result);
  } catch (error) {
    if (error instanceof SaxoMarketError) {
      if (error.status === 401) tokens = null;
      const status = error.status === 401 ? 409
        : error.status === 400 || error.status === 404 ? 422
        : error.status === 403 || error.status === 429 ? error.status : 502;
      response.status(status).json({ message: error.message });
      return;
    }
    response.status(tokens ? 502 : 409).json({
      message: tokens ? "Could not load Saxo market data. Try again shortly." : "Saxo session expired. Connect again.",
    });
  }
}

app.get("/api/market/stocks", requireAdmin, async (request, response) => {
  const keywords = typeof request.query.q === "string" ? request.query.q.trim() : "";
  if (!/^[A-Za-z0-9 .-]{1,30}$/.test(keywords)) {
    response.status(400).json({ message: "Enter a stock ticker or name (up to 30 characters)." });
    return;
  }
  await serveMarketData(response, (accessToken) => searchStocks(accessToken, keywords));
});

app.get("/api/market/quote", requireAdmin, async (request, response) => {
  const uic = stockUic(request);
  if (uic === null) {
    response.status(400).json({ message: "Choose a valid Saxo stock listing." });
    return;
  }
  await serveMarketData(response, (accessToken) => getStockQuote(accessToken, uic));
});

app.get("/api/market/history", requireAdmin, async (request, response) => {
  const uic = stockUic(request);
  if (uic === null) {
    response.status(400).json({ message: "Choose a valid Saxo stock listing." });
    return;
  }
  await serveMarketData(response, (accessToken) => getStockHistory(accessToken, uic));
});

const clientBuildDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "public");
app.use(express.static(clientBuildDirectory));

app.listen(config.port, "0.0.0.0", () => {
  console.info(`Saxo demo listening on port ${config.port}`);
});
