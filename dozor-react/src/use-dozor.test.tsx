import { Dozor, type DozorOptions } from "@kharko/dozor";
import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DozorProvider } from "./provider";
import type { DozorActions } from "./types";
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

describe("useDozor", () => {
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

  it("throws a clear error when called outside <DozorProvider>", () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    function Probe() {
      useDozor();
      return null;
    }

    expect(() => render(<Probe />)).toThrow(/useDozor must be used within a <DozorProvider>/);

    consoleErrorSpy.mockRestore();
  });

  it("returns the NOT_INITIALIZED snapshot when the provider has no options", () => {
    function Probe() {
      const dozor = useDozor();
      return <div data-testid="state">{dozor.state}</div>;
    }

    render(
      <DozorProvider>
        <Probe />
      </DozorProvider>,
    );

    expect(screen.getByTestId("state")).toHaveTextContent("not_initialized");
  });

  it("exposes the live state once auto-init kicks in", () => {
    function Probe() {
      const dozor = useDozor();
      return (
        <>
          <div data-testid="state">{dozor.state}</div>
          <div data-testid="recording">{String(dozor.isRecording)}</div>
          <div data-testid="paused">{String(dozor.isPaused)}</div>
          <div data-testid="held">{String(dozor.isHeld)}</div>
        </>
      );
    }

    render(
      <DozorProvider options={OPTIONS}>
        <Probe />
      </DozorProvider>,
    );

    expect(screen.getByTestId("state")).toHaveTextContent("recording");
    expect(screen.getByTestId("recording")).toHaveTextContent("true");
    expect(screen.getByTestId("paused")).toHaveTextContent("false");
    expect(screen.getByTestId("held")).toHaveTextContent("false");
  });

  it("action methods keep stable identity across re-renders", () => {
    let captured: DozorActions | null = null;

    function Probe() {
      const { init, start, pause, resume, stop, cancel, hold, release, identify } = useDozor();
      captured = { init, start, pause, resume, stop, cancel, hold, release, identify };
      return null;
    }

    const { rerender } = render(
      <DozorProvider>
        <Probe />
      </DozorProvider>,
    );
    const first = captured!;

    rerender(
      <DozorProvider>
        <Probe />
      </DozorProvider>,
    );
    const second = captured!;

    expect(second.init).toBe(first.init);
    expect(second.start).toBe(first.start);
    expect(second.pause).toBe(first.pause);
    expect(second.resume).toBe(first.resume);
    expect(second.stop).toBe(first.stop);
    expect(second.cancel).toBe(first.cancel);
    expect(second.hold).toBe(first.hold);
    expect(second.release).toBe(first.release);
    expect(second.identify).toBe(first.identify);
  });

  it("snapshot updates when the underlying SDK changes state", async () => {
    function Probe() {
      const { state, pause } = useDozor();
      return (
        <>
          <div data-testid="state">{state}</div>
          <button data-testid="pause-btn" onClick={() => pause()}>
            pause
          </button>
        </>
      );
    }

    render(
      <DozorProvider options={OPTIONS}>
        <Probe />
      </DozorProvider>,
    );

    expect(screen.getByTestId("state")).toHaveTextContent("recording");

    await act(async () => {
      screen.getByTestId("pause-btn").click();
    });

    expect(screen.getByTestId("state")).toHaveTextContent("paused");
  });
});
