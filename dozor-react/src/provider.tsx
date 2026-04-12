import type { DozorOptions, UserTraits } from "@kharko/dozor";
import { Dozor } from "@kharko/dozor";
import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { DozorContext, NOT_INITIALIZED_SNAPSHOT } from "./context";
import type { DozorContextValue, DozorProviderProps, DozorSnapshot } from "./types";

// ── Snapshot helpers ──────────────────────────────────

/** Read current observable values from the Dozor instance into an immutable snapshot. */
function readSnapshot(instance: Dozor): DozorSnapshot {
  const state = instance.state;
  return {
    state,
    sessionId: instance.sessionId,
    isRecording: state === "recording",
    isPaused: state === "paused",
    isHeld: instance.isHeld,
    userId: instance.userId,
    bufferSize: instance.bufferSize,
  };
}

/** Shallow-compare two snapshots. Returns `true` if they are equal. */
function snapshotEqual(a: DozorSnapshot, b: DozorSnapshot): boolean {
  return (
    a.state === b.state &&
    a.sessionId === b.sessionId &&
    a.isHeld === b.isHeld &&
    a.userId === b.userId &&
    a.bufferSize === b.bufferSize
  );
}

// ── SSR snapshot ──────────────────────────────────────

function getServerSnapshot(): DozorSnapshot {
  return NOT_INITIALIZED_SNAPSHOT;
}

// ── Provider ─────────────────────────────────────────

export function DozorProvider({ options, children }: DozorProviderProps) {
  const instanceRef = useRef<Dozor | null>(null);

  // Cache the last snapshot to preserve referential equality when nothing changed.
  // useSyncExternalStore compares via Object.is — returning the same reference avoids
  // unnecessary re-renders in consumers.
  const cachedSnapshotRef = useRef<DozorSnapshot>(NOT_INITIALIZED_SNAPSHOT);

  const subscribe = useCallback((onStoreChange: () => void): (() => void) => {
    const instance = instanceRef.current;
    if (!instance) return () => {};
    return instance.subscribe(onStoreChange);
  }, []);

  const getSnapshot = useCallback((): DozorSnapshot => {
    const instance = instanceRef.current;
    if (!instance) return NOT_INITIALIZED_SNAPSHOT;

    const next = readSnapshot(instance);
    // Preserve referential equality when the snapshot hasn't changed
    if (snapshotEqual(cachedSnapshotRef.current, next)) {
      return cachedSnapshotRef.current;
    }
    cachedSnapshotRef.current = next;
    return next;
  }, []);

  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // ── Init helper ────────────────────────────────────

  const initInstance = useCallback((opts: DozorOptions): void => {
    if (instanceRef.current) return;
    instanceRef.current = Dozor.init(opts);
  }, []);

  // Auto-init on mount when options are provided
  useEffect(() => {
    if (options && !instanceRef.current) {
      initInstance(options);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps — intentionally run once on mount

  // ── Stable actions (ref-based, never change identity) ──

  const actions = useMemo(
    () => ({
      init: (opts: DozorOptions) => initInstance(opts),
      start: () => instanceRef.current?.start(),
      pause: () => instanceRef.current?.pause(),
      resume: () => instanceRef.current?.resume(),
      stop: () => instanceRef.current?.stop(),
      cancel: () => instanceRef.current?.cancel(),
      hold: () => instanceRef.current?.hold(),
      release: (opts?: { discard?: boolean }) => instanceRef.current?.release(opts),
      identify: (userId: string, traits?: UserTraits) => instanceRef.current?.identify(userId, traits),
    }),
    [initInstance],
  );

  // ── Context value ──────────────────────────────────

  const value: DozorContextValue = useMemo(() => ({ ...snapshot, ...actions }), [snapshot, actions]);

  return <DozorContext.Provider value={value}>{children}</DozorContext.Provider>;
}
