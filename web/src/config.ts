import "dotenv/config";
import { extname } from "node:path";
import { fileURLToPath } from "node:url";

// Hostinger can load the compiled entry file without setting NODE_ENV.
const isProduction = process.env.NODE_ENV === "production" || extname(fileURLToPath(import.meta.url)) === ".js";

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function validHttpsUrl(name: string, value: string): string {
  const parsed = new URL(value);
  if (parsed.protocol !== "https:" && isProduction) {
    throw new Error(`${name} must use HTTPS in production`);
  }
  return value;
}

const redirectUri = required("SAXO_REDIRECT_URI");
validHttpsUrl("SAXO_REDIRECT_URI", redirectUri);

export const config = {
  port: Number(process.env.PORT ?? "3000"),
  isProduction,
  clientId: required("SAXO_CLIENT_ID"),
  clientSecret: required("SAXO_CLIENT_SECRET"),
  redirectUri,
  adminUser: required("SAXO_ADMIN_USER"),
  adminPassword: required("SAXO_ADMIN_PASSWORD"),
};

if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535) {
  throw new Error("PORT must be an integer between 1 and 65535");
}

if (config.adminPassword.length < 5) {
  throw new Error("SAXO_ADMIN_PASSWORD must contain at least 20 characters");
}
