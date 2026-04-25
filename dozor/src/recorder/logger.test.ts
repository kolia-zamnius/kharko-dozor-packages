import { afterEach, describe, expect, it, vi } from "vitest";
import { createLogger } from "./logger";

describe("createLogger", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns no-op functions when disabled", () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const logger = createLogger(false);
    logger.log("ignored");
    logger.warn("ignored");
    logger.error("ignored");

    expect(logSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("forwards to console with [dozor] prefix when enabled", () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const logger = createLogger(true);
    logger.log("hello", 1);
    logger.warn("careful", { code: 5 });
    logger.error("boom", new Error("x"));

    expect(logSpy).toHaveBeenCalledWith("[dozor]", "hello", 1);
    expect(warnSpy).toHaveBeenCalledWith("[dozor]", "careful", { code: 5 });
    expect(errorSpy.mock.calls[0]?.[0]).toBe("[dozor]");
    expect(errorSpy.mock.calls[0]?.[1]).toBe("boom");
  });
});
