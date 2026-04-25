import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createLogger } from "../logger";
import { clearSessionId, getSessionId } from "./session";

const SESSION_KEY = "dozor_session_id";

describe("session", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getSessionId", () => {
    it("creates a new UUID and persists it on first call", () => {
      const id = getSessionId(createLogger(false));
      expect(id).toMatch(/^[0-9a-f-]{36}$/i);
      expect(sessionStorage.getItem(SESSION_KEY)).toBe(id);
    });

    it("returns the existing ID on subsequent calls within the same tab", () => {
      const first = getSessionId(createLogger(false));
      const second = getSessionId(createLogger(false));
      expect(second).toBe(first);
    });

    it("returns an in-memory UUID when sessionStorage.getItem throws", () => {
      vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
        throw new Error("blocked");
      });
      vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new Error("blocked");
      });

      const id = getSessionId(createLogger(false));
      expect(id).toMatch(/^[0-9a-f-]{36}$/i);
    });
  });

  describe("clearSessionId", () => {
    it("removes the persisted ID so the next call gets a fresh one", () => {
      const first = getSessionId(createLogger(false));
      clearSessionId(createLogger(false));
      const second = getSessionId(createLogger(false));

      expect(second).not.toBe(first);
      expect(sessionStorage.getItem(SESSION_KEY)).toBe(second);
    });

    it("swallows errors when sessionStorage.removeItem throws", () => {
      vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
        throw new Error("blocked");
      });

      expect(() => clearSessionId(createLogger(false))).not.toThrow();
    });
  });
});
