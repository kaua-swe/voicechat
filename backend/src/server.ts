import { createServer } from "node:http";
import { RateLimiter } from "./rateLimit.js";
import {
  authenticate,
  loadSecurityConfig,
  requireOrigin,
  sanitizeLog,
  sendJson,
} from "./security.js";
import { handleWebSocket } from "./websocket.js";

const host = process.env.VOICECHAT_BACKEND_HOST ?? "127.0.0.1";
const port = Number.parseInt(process.env.VOICECHAT_BACKEND_PORT ?? "4378", 10);
const config = loadSecurityConfig(process.env);
const limiter = new RateLimiter(config.rateLimitPerMinute);

const server = createServer((req, res) => {
  const origin = typeof req.headers.origin === "string" ? req.headers.origin : undefined;
  try {
    if (req.method === "OPTIONS") {
      if (origin && config.allowedOrigins.has(origin)) {
        res.setHeader("access-control-allow-origin", origin);
        res.setHeader("access-control-allow-methods", "GET,POST,OPTIONS");
        res.setHeader("access-control-allow-headers", "authorization,content-type");
        res.setHeader("vary", "origin");
      }
      res.statusCode = 204;
      res.end();
      return;
    }

    if (req.url === "/healthz" && req.method === "GET") {
      sendJson(res, 200, { ok: true, service: "voice-chat-backend" });
      return;
    }

    if (!requireOrigin(req, config)) {
      sendJson(res, 403, { error: "origin rejected" });
      return;
    }
    const identity = authenticate(req, config);
    if (!identity) {
      sendJson(res, 401, { error: "unauthorized" }, origin);
      return;
    }
    if (!limiter.allow(`${identity.ip}:${identity.tokenHash}`)) {
      sendJson(res, 429, { error: "rate limit exceeded" }, origin);
      return;
    }

    if (req.url === "/v1/session" && req.method === "POST") {
      sendJson(res, 200, { ok: true, protocolVersion: 1 }, origin);
      return;
    }

    sendJson(res, 404, { error: "not found" }, origin);
  } catch (error) {
    console.error("voicechat request failed", sanitizeLog(error));
    sendJson(res, 500, { error: "internal error" }, origin);
  }
});

server.on("upgrade", (req, socket) => {
  try {
    if (req.url !== "/v1/live" || !requireOrigin(req, config)) {
      socket.destroy();
      return;
    }
    const identity = authenticate(req, config);
    if (!identity || !limiter.allow(`${identity.ip}:${identity.tokenHash}:ws`)) {
      socket.destroy();
      return;
    }
    handleWebSocket(req, socket);
  } catch (error) {
    console.warn("voicechat upgrade rejected", sanitizeLog(error));
    socket.destroy();
  }
});

server.listen(port, host, () => {
  console.log(JSON.stringify({ level: "info", service: "voice-chat-backend", status: "listening" }));
});
