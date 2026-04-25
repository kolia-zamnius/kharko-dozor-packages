# @kharko/dozor

Lightweight session recording SDK for [Kharko Dozor](https://github.com/kolia-zamnius/kharko-dozor) — an open-source session replay platform. Free for everyone, forever.

Captures DOM mutations via [rrweb](https://github.com/rrweb-io/rrweb), batches them, compresses with gzip, and ships to the Dozor ingest endpoint. Framework-agnostic — works with any JavaScript app. For React, see [`@kharko/dozor-react`](https://www.npmjs.com/package/@kharko/dozor-react).

> **Interactive documentation** is coming soon on the [Kharko Dozor Dashboard](https://kharko-dozor-dashboard.vercel.app).

## Install

```bash
npm install @kharko/dozor
# or
pnpm add @kharko/dozor
# or
yarn add @kharko/dozor
```

## Quick start

```ts
import { Dozor } from "@kharko/dozor";

Dozor.init({
  apiKey: "dp_your_public_key",
  endpoint: "https://your-dozor.example.com/api/ingest",
});
```

That's it. Recording starts immediately and events are sent to your ingest endpoint automatically.

## API

### `Dozor.init(options)`

Creates and returns a singleton recorder instance. Calling `init()` multiple times returns the existing instance — it does **not** re-initialize.

```ts
const dozor = Dozor.init({
  apiKey: "dp_your_public_key",
  endpoint: "https://your-dozor.example.com/api/ingest",
  privacyBlockMedia: true,
});

// Identify the user (call anytime after init)
dozor.identify("user_123", { email: "user@example.com", name: "John" });
```

#### Options

- `apiKey` (`string`) — **Required.** Public project API key (`dp_...`).
- `endpoint` (`string`) — **Required.** Ingest endpoint URL — full URL (e.g. `"https://your-dozor.example.com/api/ingest"`) or a same-origin relative path (e.g. `"/api/monitor"`) to route through a server proxy for ad-blocker bypass — see [Tunnel](#tunnel-ad-blocker-bypass).
- `flushInterval` (`number`) — How often to flush buffered events (ms). Default: `60000`.
- `batchSize` (`number`) — Max events in the buffer before an automatic flush. Default: `2000`.
- `autoStart` (`boolean`) — Start recording immediately on init. Default: `true`.
- `hold` (`boolean`) — Start with transport held — events are buffered but not sent until `release()`. Default: `false`.
- `pauseOnHidden` (`boolean`) — Auto-pause when the tab is hidden, resume when visible. Default: `true`.
- `recordConsole` (`boolean`) — Record `console.log/warn/error/info/debug` calls. Default: `true`.
- `privacyMaskAttribute` (`string`) — HTML attribute for text masking. Elements and descendants have text replaced with `***`. Default: `"data-dozor-mask"`.
- `privacyBlockAttribute` (`string`) — HTML attribute for element blocking. Element is replaced with a same-size placeholder. Default: `"data-dozor-block"`.
- `privacyBlockMedia` (`boolean`) — Replace all media (`img`, `video`, `audio`, etc.) with placeholders. Default: `false`.
- `privacyMaskInputs` (`boolean`) — Mask all input/textarea/select values with `*`. Default: `true`.
- `fetchTimeout` (`number`) — Timeout for each network request in ms. Applies to event batch sends (not keepalive). Default: `10000` (10 seconds).
- `debug` (`boolean`) — Enable debug logging — prints detailed `[dozor]`-prefixed console output for every lifecycle event, state transition, flush, and transport operation. Default: `false`.

### Instance properties

- `sessionId` (`string`) — Current session ID (UUID v4, stored in `sessionStorage`).
- `state` (`DozorState`) — Current lifecycle state: `"idle"`, `"recording"`, `"paused"`, or `"stopped"`.
- `isRecording` (`boolean`) — `true` when actively recording.
- `isPaused` (`boolean`) — `true` when paused via `pause()`.
- `isHeld` (`boolean`) — `true` when transport is held — events are buffered but not sent.
- `userId` (`string | null`) — Current user ID, or `null` if not identified.
- `bufferSize` (`number`) — Number of events currently buffered in memory (not yet sent).

### Instance methods

#### `dozor.start()`

Starts recording manually. Only needed when `autoStart: false`. No-op if not in `"idle"` state.

```ts
const dozor = Dozor.init({ apiKey: "dp_...", autoStart: false });

// later, when ready
dozor.start();
```

#### `dozor.pause()`

Pauses recording without destroying the session. Stops the rrweb recorder and the flush timer, but keeps the session ID and buffered events alive.

```ts
dozor.pause();
```

Use `resume()` to continue recording the same session.

#### `dozor.resume()`

Resumes recording after a `pause()`. Continues the same session with the same session ID. No-op if not paused.

```ts
dozor.resume();
```

#### `dozor.stop()`

Stops recording permanently, flushes all remaining events (including held ones), and destroys the singleton. After `stop()`, call `Dozor.init()` to create a new instance with a new session.

```ts
dozor.stop();
```

> **Note:** `stop()` always flushes — even if transport is held. This ensures no data is lost when you explicitly end a session.

#### `dozor.cancel()`

Discards the current session entirely. Stops recording, drops all buffered events without flushing, and sends a delete request to remove the session from the server. Destroys the singleton.

```ts
dozor.cancel();
```

#### `dozor.hold()`

Holds the transport — recording continues but events are buffered in memory without being sent to the server. The rrweb recorder keeps capturing DOM mutations normally.

No-op if already held or stopped.

```ts
dozor.hold();
```

#### `dozor.release(options?)`

Releases the transport hold. By default, flushes all buffered events and resumes normal sending. Pass `{ discard: true }` to drop the held events without sending them.

No-op if not held.

```ts
// Flush buffered events and resume normal sending
dozor.release();

// Drop buffered events and resume normal sending
dozor.release({ discard: true });
```

- `discard` (`boolean`) — Drop held events instead of flushing them. Default: `false`.

#### `dozor.identify(userId, traits?)`

Identifies the current user with an ID and optional traits (email, name, plan, or any custom properties). The identity is stored on the server and linked to all sessions from this user.

If metadata has already been sent, calling `identify()` triggers a metadata re-send on the next flush so the server receives the updated identity.

```ts
// Just an ID
dozor.identify("user_123");

// ID with traits
dozor.identify("user_123", {
  email: "john@example.com",
  name: "John Doe",
  plan: "pro",
});
```

- `userId` (`string`) — **Required.** Stable user identifier.
- `traits` (`Record<string, unknown>`) — Optional. Free-form object with user properties.

#### `dozor.subscribe(listener)`

Subscribe to state changes. The listener is called whenever any observable property changes (`state`, `sessionId`, `isHeld`, `userId`, `bufferSize`). Returns an unsubscribe function. Used internally by `@kharko/dozor-react` for `useSyncExternalStore`.

```ts
const unsubscribe = dozor.subscribe(() => {
  console.log("State changed:", dozor.state, dozor.isHeld);
});

// later
unsubscribe();
```

### Lifecycle

```
init(autoStart: true)  ──>  RECORDING
init(autoStart: false) ──>  IDLE

IDLE ────── start() ───> RECORDING
RECORDING ─ pause() ───> PAUSED
PAUSED ──── resume() ──> RECORDING
RECORDING ─ stop() ────> STOPPED      (flush + destroy)
PAUSED ──── stop() ────> STOPPED      (flush + destroy)
IDLE ────── stop() ────> STOPPED      (destroy)
RECORDING ─ cancel() ──> STOPPED      (drop buffer + delete session)
PAUSED ──── cancel() ──> STOPPED      (drop buffer + delete session)
IDLE ────── cancel() ──> STOPPED      (delete session)

STOPPED ── init() ────> (new instance, new session)
```

Transport hold is orthogonal to lifecycle state — you can `hold()` and `release()` in any active state (`idle`, `recording`, or `paused`):

```
ANY ACTIVE ── hold() ─────> transport held     (recording continues)
HELD ──────── release() ──> transport resumed  (flush buffer)
HELD ──────── stop() ─────> STOPPED            (force flush + destroy)
HELD ──────── cancel() ───> STOPPED            (drop buffer + delete session)
```

## Use cases

> Examples below highlight the option being demonstrated. In real code, also pass `endpoint` alongside `apiKey` — both are required (see [Options](#options)).

### Basic recording

```ts
import { Dozor } from "@kharko/dozor";

// Starts recording immediately. Events are batched and sent automatically.
Dozor.init({
  apiKey: "dp_your_key",
  endpoint: "https://your-dozor.example.com/api/ingest",
});
```

### Deferred start

```ts
const dozor = Dozor.init({ apiKey: "dp_your_key", autoStart: false });

// Start only when the user enters a specific section
onEnterCheckout(() => {
  dozor.start();
});
```

### Conditional recording

Record a session but only save it if the user completes a valuable action (e.g., purchase, sign-up). If they don't, discard everything.

```ts
const dozor = Dozor.init({ apiKey: "dp_your_key", hold: true });

// Recording is active, but nothing is sent to the server.
// The user interacts with the page...

if (userCompletedPurchase) {
  dozor.release(); // flush all buffered events, resume normal sending
} else {
  dozor.cancel(); // discard the session entirely
}
```

### Network-aware buffering

Pause sending during heavy network activity so the tracker doesn't compete with business-critical requests.

```ts
const dozor = Dozor.init({ apiKey: "dp_your_key" });

// About to fire many parallel requests
dozor.hold();
await Promise.all([...heavyApiCalls]);
dozor.release(); // flush everything that accumulated during the hold
```

### Identify users

Link multiple sessions to the same user for cross-session analytics. User identity is stored on the server with optional traits.

```ts
const dozor = Dozor.init({ apiKey: "dp_your_key" });

// Identify when the user logs in
onLogin((user) => {
  dozor.identify(user.id, {
    email: user.email,
    name: user.name,
    plan: user.plan,
  });
});
```

### Mask sensitive text

Add the `data-dozor-mask` attribute to any element whose text content should be replaced with asterisks in the recording. All descendant text is masked too.

```html
<div data-dozor-mask>
  <p>John Doe</p>
  <!-- recorded as "********" -->
  <span>+1 555-0123</span>
  <!-- recorded as "************" -->
</div>
```

You can customize the attribute name:

```ts
Dozor.init({ apiKey: "dp_your_key", privacyMaskAttribute: "data-private" });
```

### Block elements entirely

Add the `data-dozor-block` attribute to elements that should be completely hidden from the recording. The element is replaced with an empty placeholder of the same size — no content is captured.

```html
<img data-dozor-block src="/user-avatar.jpg" />
<div data-dozor-block>
  <p>This content will not appear in the replay.</p>
</div>
```

### Block all media

Replace all images, videos, and other media with placeholders. Useful when the recorded site serves media behind auth cookies or CORS restrictions that break during replay.

```ts
Dozor.init({ apiKey: "dp_your_key", privacyBlockMedia: true });
```

### Allow input recording

Input values are masked by default. If you need to capture what users type (e.g., a search box in an internal tool), disable input masking:

```ts
Dozor.init({ apiKey: "dp_your_key", privacyMaskInputs: false });
```

### Pause during sensitive input

```ts
// User enters credit card details
dozor.pause();

// Done — resume recording
dozor.resume();
```

### Disable console recording

Console recording is enabled by default. Disable it if your app logs sensitive data or you want to reduce event volume.

```ts
Dozor.init({ apiKey: "dp_your_key", recordConsole: false });
```

### Disable auto-pause on hidden

By default, recording pauses when the tab is hidden and resumes when visible. Disable this if you want to keep recording in the background (e.g., long-running workflows where the user switches tabs).

```ts
Dozor.init({ apiKey: "dp_your_key", pauseOnHidden: false });
```

## Edge cases

- `init()` called multiple times — returns the existing singleton, does not re-initialize.
- `start()` when already recording — no-op.
- `pause()` when not recording — no-op.
- `resume()` when not paused — no-op.
- `stop()` when already stopped — no-op.
- `cancel()` when already stopped — no-op.
- `hold()` when already held or stopped — no-op.
- `release()` when not held — no-op.
- `stop()` while held — releases hold, flushes all events, destroys instance. No data is lost.
- `cancel()` while held — drops buffer, deletes session. Held events are discarded.
- Tab hidden with `pauseOnHidden: true` (default) — recording pauses automatically, resumes when the tab becomes visible.
- Tab hidden after manual `pause()` — auto-resume does **not** kick in. Only `resume()` can resume.
- Tab hidden with `pauseOnHidden: false` — no auto-pause, events keep being recorded and flushed normally.
- Page unload while held — events are **not** sent. The hold is respected.
- Page unload while recording — final events are sent via `fetch()` with `keepalive: true`.
- Tab goes to background — buffer is flushed immediately (unless held).
- `identify()` after metadata was already sent — triggers a metadata re-send on the next flush.
- `identify()` before any flush — user identity is included in the first metadata payload.
- `sessionStorage` unavailable — session ID is generated in memory but not persisted across reloads.
- `CompressionStream` unavailable — falls back to uncompressed JSON. No errors thrown.
- Server returns 4xx — request is not retried (invalid key, bad payload, etc.).
- Server returns 5xx or network error — retried up to 3 times with exponential backoff (1s, 2s, 4s).
- All retries exhausted — events are re-queued to the buffer and retried on the next flush cycle.
- Extended network outage — buffer grows until `MAX_BUFFER_SIZE` (10,000 events), then oldest events are dropped.
- Fetch timeout — each request times out after `fetchTimeout` ms (default: 10s). Timeout is treated as a network error and triggers retry.

## How it works

### Recording

Uses [rrweb](https://github.com/rrweb-io/rrweb) to capture a full DOM snapshot on init, then records incremental mutations (DOM changes, mouse moves, scroll, input, etc.) as events.

### Sessions

Each session gets a UUID stored in `sessionStorage`. The ID persists across SPA navigations and page reloads within the same tab, but a new tab starts a new session. `stop()` and `cancel()` clear the stored ID.

### Batching

Events accumulate in an in-memory buffer. The buffer is flushed when:

- `flushInterval` ms have passed (default: 60s)
- The buffer reaches `batchSize` events (default: 2000)
- The user navigates to another page (SPA navigation)
- The tab goes to the background (`visibilitychange`)
- The page is closing (`beforeunload`)

When transport is held, all flush triggers are suppressed — events stay in the buffer.

### Compression

Payloads larger than 1 KB are compressed with gzip via the browser-native [CompressionStream API](https://developer.mozilla.org/en-US/docs/Web/API/CompressionStream). Falls back to uncompressed JSON in environments without `CompressionStream`.

### Transport

- Regular flushes use `fetch()` with retry (3 attempts, exponential backoff: 1s → 2s → 4s). Client errors (4xx) are not retried.
- Each request has a timeout (default: 10s, configurable via `fetchTimeout`). Timeout triggers a retry like any network error.
- Failed batches (all retries exhausted) are re-queued to the buffer and retried on the next flush cycle. Buffer is capped at 10,000 events — oldest events are dropped during extended outages.
- Page-unload flushes use `fetch()` with `keepalive: true` for best-effort delivery (no timeout, no retry).
- All requests include an `X-Dozor-Public-Key` header for authentication and a `Content-Encoding: gzip` header when compressed.

### Metadata

The first batch of each session includes browser metadata:

- `url` — current page URL
- `referrer` — referrer URL
- `userAgent` — browser user agent string
- `screenWidth` / `screenHeight` — screen dimensions
- `language` — browser language
- `userIdentity` — user identity (if `identify()` was called): `{ userId, traits? }`

### Debug logging

Pass `debug: true` to see detailed console output for every internal operation:

```ts
Dozor.init({ apiKey: "dp_...", debug: true });
```

Output includes `[dozor]`-prefixed messages for state transitions, flush triggers, transport sends/retries, slice creation, visibility changes, session lifecycle, and more. Disabled by default — no performance overhead when off.

## Types

The package exports TypeScript types for use in your backend or tooling:

```ts
import type {
  DozorOptions,
  DozorState,
  IngestPayload,
  SessionMetadata,
  Logger,
  UserIdentity,
  UserTraits,
} from "@kharko/dozor";
```

## Browser support

Works in all modern browsers that support:

- [`MutationObserver`](https://caniuse.com/mutationobserver) (rrweb requirement)
- [`crypto.randomUUID()`](https://caniuse.com/mdn-api_crypto_randomuuid)
- [`fetch()`](https://caniuse.com/fetch) with `keepalive`
- [`CompressionStream`](https://caniuse.com/mdn-api_compressionstream) (optional — falls back to uncompressed)

## Tunnel (ad-blocker bypass)

Ad-blockers and browser privacy extensions can block requests to known analytics domains. A **tunnel** routes SDK traffic through your own server, making requests invisible to blockers and avoiding CORS issues.

```
Browser → /api/monitor (your server, same-origin) → Dozor ingest endpoint
          ↑ invisible to ad-blockers                 ↑ server-to-server
```

### 1. Add a proxy route to your server

The proxy receives the SDK request and forwards it to the Dozor ingest endpoint with all headers intact.

**Next.js (App Router) — API route:**

```ts
// app/api/monitor/route.ts
const INGEST_URL = "https://kharko-dozor.vercel.app/api/ingest";

export async function POST(req: Request) {
  const body = await req.arrayBuffer();

  const headers: Record<string, string> = {
    "Content-Type": req.headers.get("content-type") ?? "application/json",
  };

  const encoding = req.headers.get("content-encoding");
  if (encoding) headers["Content-Encoding"] = encoding;

  const apiKey = req.headers.get("x-dozor-public-key");
  if (apiKey) headers["X-Dozor-Public-Key"] = apiKey;

  const res = await fetch(INGEST_URL, { method: "POST", headers, body });
  return new Response(null, { status: res.status });
}
```

**Next.js — rewrites (zero code, but less control):**

```js
// next.config.js
export default {
  async rewrites() {
    return [
      {
        source: "/api/monitor",
        destination: "https://kharko-dozor.vercel.app/api/ingest",
      },
    ];
  },
};
```

**Express:**

```ts
import express from "express";

const INGEST_URL = "https://kharko-dozor.vercel.app/api/ingest";

app.post("/api/monitor", express.raw({ type: "*/*" }), async (req, res) => {
  const headers: Record<string, string> = {
    "Content-Type": req.headers["content-type"] ?? "application/json",
  };

  const encoding = req.headers["content-encoding"];
  if (encoding) headers["Content-Encoding"] = encoding;

  const apiKey = req.headers["x-dozor-public-key"];
  if (apiKey) headers["X-Dozor-Public-Key"] = apiKey;

  const response = await fetch(INGEST_URL, { method: "POST", headers, body: req.body });
  res.status(response.status).end();
});
```

### 2. Point the SDK to your proxy

```ts
Dozor.init({
  apiKey: "dp_your_key",
  endpoint: "/api/monitor",
});
```

All SDK traffic (event batches, keepalive flushes) now goes through your proxy as same-origin requests — invisible to ad-blockers, no CORS needed.

## Self-hosting

Point the SDK to your own ingest endpoint:

```ts
Dozor.init({
  apiKey: "dp_your_key",
  endpoint: "https://your-server.com/api/ingest",
});
```

See the [Kharko Dozor repository](https://github.com/kolia-zamnius/kharko-dozor) for the full self-hosted setup.

## License

MIT
