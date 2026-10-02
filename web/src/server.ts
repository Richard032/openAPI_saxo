import { randomBytes, timingSafeEqual } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import express, { type NextFunction, type Request, type Response } from "express";
import { config } from "./config.js";
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

  const previous = tokens;
  return refreshSaxoTokens(previous.refreshToken)
    .then((refreshed) => {
      tokens = refreshed;
      return refreshed.accessToken;
    })
    .catch((error: unknown) => {
      tokens = null;
      throw error;
    });
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
    response.redirect(303, "/?connected=1");
  } catch {
    response.status(502).send("Saxo token exchange failed. Check the server configuration and try again.");
  }
});

app.get("/api/saxo/status", requireAdmin, (_request, response) => {
  response.json({
    connected: tokens !== null,
    accessTokenExpiresAt: tokens ? new Date(tokens.accessTokenExpiresAt).toISOString() : null,
  });
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

const clientBuildDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "public");
app.use(express.static(clientBuildDirectory));

app.listen(config.port, "0.0.0.0", () => {
  console.info(`Saxo demo listening on port ${config.port}`);
});
