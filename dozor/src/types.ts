import type { eventWithTime } from "rrweb";

/** Lifecycle state of the Dozor recorder. */
export type DozorState = "idle" | "recording" | "paused";

/** Free-form user traits object. Keys and values are defined by the developer. */
export type UserTraits = Record<string, unknown>;

export interface DozorOptions {
  /** Public API key (dp_...) */
  apiKey: string;
  /** Ingest endpoint URL — full URL (e.g. `https://your-dozor.example.com/api/ingest`)
   *  or a same-origin relative path (e.g. `/api/monitor`) for ad-blocker and CORS bypass
   *  via a server proxy. See README for tunnel setup examples. */
  endpoint: string;
  /** Flush interval in ms. Default: 60000 */
  flushInterval?: number;
  /** Max events per batch before auto-flush. Default: 2000 */
  batchSize?: number;
  /** Start recording immediately on init. Default: true */
  autoStart?: boolean;
  /** Start with transport held — events are buffered locally but not sent until `release()` is called. Default: false */
  hold?: boolean;
  /** Automatically pause recording when the tab is hidden and resume when visible. Default: true */
  pauseOnHidden?: boolean;
  /** Record console.log/warn/error/info/debug calls. Default: true */
  recordConsole?: boolean;
  /** HTML attribute name for text masking. Elements (and their descendants) with this attribute will have text content replaced with asterisks in the recording. Default: `"data-dozor-mask"` */
  privacyMaskAttribute?: string;
  /** HTML attribute name for element blocking. Elements with this attribute are completely removed from the recording and replaced with a same-size placeholder. Default: `"data-dozor-block"` */
  privacyBlockAttribute?: string;
  /** Replace all media elements (`img`, `video`, `audio`, `picture`, `canvas`, `embed`, `object`) with same-size placeholders. Useful when the recorded site blocks cross-origin media access during replay. Default: `false` */
  privacyBlockMedia?: boolean;
  /** Mask all input, textarea, and select values with asterisks. Default: `true` */
  privacyMaskInputs?: boolean;
  /** Timeout for each network request in ms. Applies to event batch sends (not keepalive).
   *  Keepalive sends during page unload are fire-and-forget and not subject to this timeout.
   *  Default: `10000` (10 seconds). */
  fetchTimeout?: number;
  /** Enable debug logging — prints detailed console output for every lifecycle event, state transition, flush, and transport operation. Useful for development and troubleshooting. Default: `false` */
  debug?: boolean;
}

/** User identity attached to a session via `dozor.identify()`. */
export interface UserIdentity {
  /** Unique user identifier (e.g. database ID, email). */
  userId: string;
  /** Optional key-value traits (plan, role, company, etc.). */
  traits?: UserTraits;
}

/** Browser metadata collected once at session start and sent with the first batch. */
export interface SessionMetadata {
  /** Full URL at the moment recording started. */
  url: string;
  /** `document.referrer` value. */
  referrer: string;
  /** `navigator.userAgent` string. */
  userAgent: string;
  /** `screen.width` in CSS pixels. */
  screenWidth: number;
  /** `screen.height` in CSS pixels. */
  screenHeight: number;
  /** `navigator.language` (e.g. `"en-US"`). */
  language: string;
  /** User identity, present after `dozor.identify()` is called. */
  userIdentity?: UserIdentity;
}

/** Why a new slice was created. */
export type SliceReason = "init" | "idle" | "navigation";

/** Metadata for a recording slice — an independently replayable segment of a session. */
export interface SliceMarker {
  /** Zero-based slice index within the session. */
  index: number;
  /** What triggered this slice. */
  reason: SliceReason;
  /** Timestamp (ms since epoch) when the slice started. */
  startedAt: number;
  /** Full page URL at slice start. */
  url: string;
  /** `location.pathname` at slice start. */
  pathname: string;
  /** Viewport width in CSS pixels at slice start. */
  viewportWidth: number;
  /** Viewport height in CSS pixels at slice start. */
  viewportHeight: number;
}

/** Payload sent to the ingest endpoint on each flush. */
export interface IngestPayload {
  /** Session UUID (persisted in `sessionStorage` for the tab lifetime). */
  sessionId: string;
  /** rrweb events collected since the last flush. */
  events: eventWithTime[];
  /** Browser metadata — included only in the first batch of a session. */
  metadata?: SessionMetadata;
  /** Slice markers created since the last flush. */
  sliceMarkers?: SliceMarker[];
}
