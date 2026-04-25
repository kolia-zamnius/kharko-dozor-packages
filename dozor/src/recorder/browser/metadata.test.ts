import { describe, expect, it } from "vitest";
import { createLogger } from "../logger";
import { collectMetadata } from "./metadata";

describe("collectMetadata", () => {
  it("returns the current browser environment snapshot", () => {
    const metadata = collectMetadata(createLogger(false));

    expect(metadata.url).toBe(location.href);
    expect(metadata.referrer).toBe(document.referrer);
    expect(metadata.userAgent).toBe(navigator.userAgent);
    expect(metadata.screenWidth).toBe(screen.width);
    expect(metadata.screenHeight).toBe(screen.height);
    expect(metadata.language).toBe(navigator.language);
  });

  it("does not include userIdentity (added later by EventBuffer.updateIdentity)", () => {
    const metadata = collectMetadata(createLogger(false));
    expect(metadata.userIdentity).toBeUndefined();
  });
});
