import { describe, expect, it } from "vitest";
import { authenticate, loadSecurityConfig, requireOrigin, sha256 } from "./security.js";
import { IncomingMessage } from "node:http";
import { Socket } from "node:net";

function req(headers: Record<string, string>) {
  const request = new IncomingMessage(new Socket());
  request.headers = headers;
  return request;
}

describe("backend security", () => {
  it("requires a SHA-256 token hash", () => {
    expect(() => loadSecurityConfig({ VOICECHAT_AUTH_TOKEN_SHA256: "plain" })).toThrow();
  });

  it("authenticates bearer token using hash", () => {
    const token = "local-test-token-12345";
    const config = loadSecurityConfig({
      VOICECHAT_AUTH_TOKEN_SHA256: sha256(token),
      VOICECHAT_ALLOWED_ORIGINS: "https://voicechat.sproce.com.br",
    });
    expect(authenticate(req({ authorization: `Bearer ${token}` }), config)).not.toBeNull();
    expect(authenticate(req({ authorization: "Bearer wrong-token-12345" }), config)).toBeNull();
  });

  it("enforces origin allowlist", () => {
    const config = loadSecurityConfig({
      VOICECHAT_AUTH_TOKEN_SHA256: sha256("local-test-token-12345"),
      VOICECHAT_ALLOWED_ORIGINS: "https://voicechat.sproce.com.br",
    });
    expect(requireOrigin(req({ origin: "https://voicechat.sproce.com.br" }), config)).toBe(true);
    expect(requireOrigin(req({ origin: "https://evil.example" }), config)).toBe(false);
  });
});
