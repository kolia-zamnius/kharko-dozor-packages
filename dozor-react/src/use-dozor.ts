import { useContext } from "react";
import { DozorContext } from "./context";
import type { DozorContextValue } from "./types";

/**
 * Access the Dozor recorder state and controls.
 * Must be used within a `<DozorProvider>`.
 *
 * Returns a reactive snapshot (state, sessionId, isRecording, etc.)
 * combined with stable action methods (start, pause, stop, etc.).
 */
export function useDozor(): DozorContextValue {
  const ctx = useContext(DozorContext);
  if (!ctx) {
    throw new Error("useDozor must be used within a <DozorProvider>");
  }
  return ctx;
}
