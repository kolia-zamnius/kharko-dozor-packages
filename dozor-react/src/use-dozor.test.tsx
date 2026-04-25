import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DozorProvider } from "./provider";
import { useDozor } from "./use-dozor";

describe("useDozor", () => {
  it("throws a clear error when called outside <DozorProvider>", () => {
    // Suppress React's error boundary log noise for the expected throw.
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
});
