import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Auto-unmount + clean up DOM between tests so getByTestId never sees stale nodes.
afterEach(() => {
  cleanup();
});
