import { afterEach, describe, expect, it, vi } from "vitest";
import { indexNowKey, indexNowPayload } from "./indexnow";

describe("indexNowKey", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns undefined when no key is configured", () => {
    vi.stubEnv("INDEXNOW_KEY", "");
    expect(indexNowKey()).toBeUndefined();
  });

  it("accepts a key made of 8 to 128 letters, digits and hyphens", () => {
    vi.stubEnv("INDEXNOW_KEY", "a1b2-c3d4e5f6");
    expect(indexNowKey()).toBe("a1b2-c3d4e5f6");
  });

  it("rejects keys that IndexNow would not accept", () => {
    vi.stubEnv("INDEXNOW_KEY", "short");
    expect(indexNowKey()).toBeUndefined();
    vi.stubEnv("INDEXNOW_KEY", "has spaces in it");
    expect(indexNowKey()).toBeUndefined();
  });
});

describe("indexNowPayload", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("names the site host, the key location and the submitted URLs", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://www.example.com");
    const payload = indexNowPayload(["https://www.example.com/artwork/a"], "a1b2-c3d4e5f6");
    expect(payload).toEqual({
      host: "www.example.com",
      key: "a1b2-c3d4e5f6",
      keyLocation: "https://www.example.com/indexnow-key.txt",
      urlList: ["https://www.example.com/artwork/a"],
    });
  });
});
