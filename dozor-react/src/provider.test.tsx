import { Dozor, type DozorOptions } from "@kharko/dozor";
import { act, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DozorProvider } from "./provider";
import { useDozor } from "./use-dozor";

vi.mock("rrweb", () => ({
  record: Object.assign(
    vi.fn(() => vi.fn() /* stop fn */),
    { takeFullSnapshot: vi.fn() },
  ),
}));

vi.mock("@rrweb/rrweb-plugin-console-record", () => ({
  getRecordConsolePlugin: vi.fn(() => ({ name: "console" })),
}));

const OPTIONS: DozorOptions = {
  apiKey: "dp_test",
  endpoint: "https://api.example.com/api/ingest",
};

function resetSingleton(): void {
  (Dozor as unknown as { instance: Dozor | null }).instance = null;
}

function StateProbe() {
  const { state, sessionId } = useDozor();
  return (
    <>
      <div data-testid="state">{state}</div>
      <div data-testid="session">{sessionId ?? "none"}</div>
    </>
  );
}

describe("DozorProvider", () => {
  beforeEach(() => {
    sessionStorage.clear();
    resetSingleton();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 200 })));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    resetSingleton();
  });

  describe("auto-init via options prop", () => {
    it("creates the singleton on mount and surfaces recording state to children", () => {
      render(
        <DozorProvider options={OPTIONS}>
          <StateProbe />
        </DozorProvider>,
      );

      expect(screen.getByTestId("state")).toHaveTextContent("recording");
      expect(screen.getByTestId("session").textContent).toMatch(/^[0-9a-f-]{36}$/i);
    });
  });

  describe("deferred init via hook (regression for 8dc6835)", () => {
    it("re-subscribes after init() so children see the live snapshot, not a frozen not_initialized", async () => {
      function ProbeWithInit() {
        const dozor = useDozor();
        return (
          <>
            <div data-testid="state">{dozor.state}</div>
            <button data-testid="init-btn" onClick={() => dozor.init(OPTIONS)}>
              init
            </button>
          </>
        );
      }

      render(
        <DozorProvider>
          <ProbeWithInit />
        </DozorProvider>,
      );

      expect(screen.getByTestId("state")).toHaveTextContent("not_initialized");

      // The first subscribe ran while instanceRef.current was null and would have
      // returned a permanent no-op. The fix bumps `initTick` so React unsubscribes
      // and re-subscribes with the now-live instance — verified by the state moving
      // from not_initialized to recording without a manual unmount/remount.
      await act(async () => {
        screen.getByTestId("init-btn").click();
      });

      expect(screen.getByTestId("state")).toHaveTextContent("recording");
    });
  });

  describe("server-side rendering", () => {
    it("renderToString surfaces the NOT_INITIALIZED snapshot via getServerSnapshot", () => {
      const html = renderToString(
        <DozorProvider>
          <StateProbe />
        </DozorProvider>,
      );

      expect(html).toContain("not_initialized");
      expect(html).toContain("none");
    });

    it("auto-init options are ignored during SSR (no Dozor.init on the server)", () => {
      const html = renderToString(
        <DozorProvider options={OPTIONS}>
          <StateProbe />
        </DozorProvider>,
      );

      expect(html).toContain("not_initialized");
    });
  });

  describe("multiple init() calls", () => {
    it("are idempotent — singleton reused, no second instance created", async () => {
      function DoubleInit() {
        const dozor = useDozor();
        return (
          <>
            <div data-testid="state">{dozor.state}</div>
            <button
              data-testid="init-btn"
              onClick={() => {
                dozor.init(OPTIONS);
                dozor.init(OPTIONS);
              }}
            >
              init twice
            </button>
          </>
        );
      }

      render(
        <DozorProvider>
          <DoubleInit />
        </DozorProvider>,
      );

      await act(async () => {
        screen.getByTestId("init-btn").click();
      });

      expect(screen.getByTestId("state")).toHaveTextContent("recording");
    });
  });
});
