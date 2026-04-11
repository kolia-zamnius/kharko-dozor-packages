import type { DozorOptions, DozorState, UserTraits } from "@kharko/dozor";

/** Lifecycle state visible to React consumers. Extends core `DozorState` with `"not_initialized"`. */
export type DozorContextState = DozorState | "not_initialized";

/** Immutable snapshot of the Dozor recorder state. */
export interface DozorSnapshot {
  /** Current lifecycle state. `"not_initialized"` when `init()` hasn't been called yet. */
  state: DozorContextState;
  /** Current session ID, or `null` before init. */
  sessionId: string | null;
  /** `true` when actively recording. */
  isRecording: boolean;
  /** `true` when paused via `pause()`. */
  isPaused: boolean;
  /** `true` when transport is held — events are buffered locally but not sent. */
  isHeld: boolean;
  /** Current user ID, or `null` if not set. */
  userId: string | null;
  /** Number of events currently buffered in memory (not yet sent). */
  bufferSize: number;
}

/** Control methods exposed to React consumers via `useDozor()`. */
export interface DozorActions {
  /** Initialize the Dozor recorder. No-op if already initialized. */
  init: (options: DozorOptions) => void;
  /** Start recording (only when `autoStart: false`). */
  start: () => void;
  /** Pause recording without destroying the session. */
  pause: () => void;
  /** Resume recording after a pause. */
  resume: () => void;
  /** Stop recording, flush remaining events, destroy instance. */
  stop: () => void;
  /** Discard session — drop buffer + delete from server. */
  cancel: () => void;
  /** Hold transport — recording continues but events are buffered without sending. */
  hold: () => void;
  /** Release transport hold — flush buffered events and resume sending. Pass `{ discard: true }` to drop held events. */
  release: (options?: { discard?: boolean }) => void;
  /** Identify the current user with an ID and optional traits. Call when the user logs in. */
  identify: (userId: string, traits?: UserTraits) => void;
}

/** Full context value returned by `useDozor()`. Combines reactive snapshot with stable action methods. */
export type DozorContextValue = DozorSnapshot & DozorActions;

export interface DozorProviderProps {
  /** Pass options to auto-initialize Dozor on mount. Omit for manual `init()`. */
  options?: DozorOptions;
  children: React.ReactNode;
}
