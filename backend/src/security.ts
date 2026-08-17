import { createHash, timingSafeEqual } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";

const maxJsonBytes = 64 * 1024;
const tokenPrefix = "Bearer ";

export interface SecurityConfig {
  allowedOrigins: Set<string>;
  tokenHash: string;
  trustProxy: boolean;
  rateLimitPerMinute: number;
}

export interface ClientIdentity {
  ip: string;
  tokenHash: string;
}

export function loadSecurityConfig(env: NodeJS.ProcessEnv): SecurityConfig {
  const allowed = splitCsv(env.VOICECHAT_ALLOWED_ORIGINS ?? env.VOICECHAT_PUBLIC_ORIGIN ?? "");
  const tokenHash = (env.VOICECHAT_AUTH_TOKEN_SHA256 ?? "").trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(tokenHash)) {
    throw new Error("VOICECHAT_AUTH_TOKEN_SHA256 must be a SHA-256 hex digest");
  }
  return {
    allowedOrigins: new Set(allowed),
    tokenHash,
    trustProxy: env.VOICECHAT_TRUST_PROXY === "1",
    rateLimitPerMinute: parsePositiveInt(env.VOICECHAT_RATE_LIMIT_PER_MINUTE, 120),
  };
}

export function requireOrigin(req: IncomingMessage, config: SecurityConfig): boolean {
  const origin = req.headers.origin;
  if (!origin) {
    return false;
  }
  return config.allowedOrigins.has(origin);
}

export function authenticate(req: IncomingMessage, config: SecurityConfig): ClientIdentity | null {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith(tokenPrefix)) {
    return null;
  }
  const token = authorization.slice(tokenPrefix.length).trim();
  if (token.length < 16 || token.length > 4096 || /[\r\n\t]/.test(token)) {
    return null;
  }
  const digest = sha256(token);
  const expected = Buffer.from(config.tokenHash, "hex");
  const actual = Buffer.from(digest, "hex");
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return null;
  }
  return {
    ip: clientIp(req, config),
    tokenHash: digest,
  };
}

export async function readJsonBody<T>(req: IncomingMessage): Promise<T> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.byteLength;
    if (size > maxJsonBytes) {
      throw new Error("payload too large");
    }
    chunks.push(buffer);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  return JSON.parse(raw) as T;
}

export function sendJson(res: ServerResponse, status: number, body: unknown, origin?: string) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  if (origin) {
    res.setHeader("access-control-allow-origin", origin);
    res.setHeader("vary", "origin");
  }
  res.end(JSON.stringify(body));
}

export function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function sanitizeLog(value: unknown): string {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  if (/authorization|bearer|token|secret|api[_-]?key|sk-/i.test(text)) {
    return "[redacted]";
  }
  return text.replace(/[\r\n]/g, " ").slice(0, 300);
}

function splitCsv(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parsePositiveInt(value: string | undefined, fallback: number) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function clientIp(req: IncomingMessage, config: SecurityConfig): string {
  if (config.trustProxy) {
    const forwarded = req.headers["x-forwarded-for"];
    if (typeof forwarded === "string") {
      return forwarded.split(",")[0]?.trim() || "unknown";
    }
  }
  return req.socket.remoteAddress ?? "unknown";
}
