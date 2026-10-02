import { config } from "./config.js";

const authenticationBase = "https://sim.logonvalidation.net";
const openApiBase = "https://gateway.saxobank.com/sim/openapi";

export interface SaxoTokens {
  accessToken: string;
  accessTokenExpiresAt: number;
  refreshToken: string;
  refreshTokenExpiresAt: number | null;
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  refresh_token_expires_in?: number;
}

function basicAuthorization(): string {
  return `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64")}`;
}

async function requestTokens(body: URLSearchParams): Promise<TokenResponse> {
  const response = await fetch(`${authenticationBase}/token`, {
    method: "POST",
    headers: {
      Authorization: basicAuthorization(),
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body,
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error(`Saxo token endpoint returned HTTP ${response.status}`);
  }

  const result: unknown = await response.json();
  if (
    typeof result !== "object" ||
    result === null ||
    !("access_token" in result) ||
    typeof result.access_token !== "string" ||
    !("refresh_token" in result) ||
    typeof result.refresh_token !== "string" ||
    !("expires_in" in result) ||
    typeof result.expires_in !== "number"
  ) {
    throw new Error("Saxo returned an unexpected token response");
  }

  const tokenResponse = result as TokenResponse;
  return tokenResponse;
}

export function createAuthorizationUrl(state: string): string {
  const url = new URL(`${authenticationBase}/authorize`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("state", state);
  return url.toString();
}

export async function exchangeAuthorizationCode(code: string): Promise<SaxoTokens> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: config.redirectUri,
  });
  return toTokens(await requestTokens(body));
}

export async function refreshSaxoTokens(refreshToken: string): Promise<SaxoTokens> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    redirect_uri: config.redirectUri,
  });
  return toTokens(await requestTokens(body));
}

function toTokens(response: TokenResponse): SaxoTokens {
  const now = Date.now();
  return {
    accessToken: response.access_token,
    accessTokenExpiresAt: now + response.expires_in * 1000,
    refreshToken: response.refresh_token,
    refreshTokenExpiresAt:
      typeof response.refresh_token_expires_in === "number"
        ? now + response.refresh_token_expires_in * 1000
        : null,
  };
}

export async function checkSaxoConnection(accessToken: string): Promise<boolean> {
  const response = await fetch(`${openApiBase}/port/v1/clients/me`, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
    signal: AbortSignal.timeout(15_000),
  });
  return response.ok;
}
