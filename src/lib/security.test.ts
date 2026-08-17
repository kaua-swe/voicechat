import { describe, expect, it } from "vitest";
import { defaultSettings } from "./defaults";
import { validateBackendConfig, validateSettings } from "./security";

describe("security validation", () => {
  it("rejects plain remote http", () => {
    expect(
      validateBackendConfig({
        mode: "secureRemote",
        endpoint: "http://api.example.com",
        authMode: "storedBearerToken",
        allowInsecureLocalhost: false,
      }).ok,
    ).toBe(false);
  });

  it("rejects credentials in URL", () => {
    expect(
      validateBackendConfig({
        mode: "secureRemote",
        endpoint: "https://token@example.com",
        authMode: "storedBearerToken",
        allowInsecureLocalhost: false,
      }).ok,
    ).toBe(false);
  });

  it("accepts defaults", () => {
    expect(validateSettings(defaultSettings).ok).toBe(true);
  });
});
