# @kharko/dozor-react

React bindings for [`@kharko/dozor`](https://www.npmjs.com/package/@kharko/dozor) — the session recording SDK for [Kharko Dozor](https://github.com/kolia-zamnius/kharko-dozor). Free for everyone, forever.

Provides a `<DozorProvider>` and a `useDozor()` hook to control the recorder from any React component with reactive state updates. Compatible with React 18+ and React Server Components (RSC).

> **Interactive documentation** is coming soon on the [Kharko Dozor Dashboard](https://kharko-dozor.vercel.app).

## Install

```bash
npm install @kharko/dozor @kharko/dozor-react
# or
pnpm add @kharko/dozor @kharko/dozor-react
# or
yarn add @kharko/dozor @kharko/dozor-react
```

Both packages are required — `@kharko/dozor` is the core SDK, `@kharko/dozor-react` provides the React integration.

## Quick start

Wrap your app (or a subtree) with `<DozorProvider>` and pass your API key via the `options` prop:

```tsx
import { DozorProvider } from "@kharko/dozor-react";

function App() {
  return (
    <DozorProvider options={{ apiKey: "dp_your_public_key" }}>
      <YourApp />
    </DozorProvider>
  );
}
```

Recording starts automatically on mount. That's it — no extra code needed for basic usage.

## API

### `<DozorProvider>`

React Context provider that manages the `Dozor` singleton. Must wrap any component that calls `useDozor()`.

```tsx
<DozorProvider options={dozorOptions}>{children}</DozorProvider>
```

#### Props

- `options` (`DozorOptions`) — Pass to auto-initialize Dozor on mount. Omit for manual `init()` via the hook.
- `children` (`ReactNode`) — **Required.** Child components that can access `useDozor()`.

#### `DozorOptions`

All options from `@kharko/dozor` are supported:

- `apiKey` (`string`) — **Required.** Public project API key (`dp_...`).
- `endpoint` (`string`) — Ingest endpoint URL. Default: production endpoint.
- `flushInterval` (`number`) — Flush interval in ms. Default: `60000`.
- `batchSize` (`number`) — Max events before auto-flush. Default: `2000`.
- `autoStart` (`boolean`) — Start recording on init. Default: `true`.
- `hold` (`boolean`) — Start with transport held (buffer events without sending). Default: `false`.
- `pauseOnHidden` (`boolean`) — Auto-pause when the tab is hidden, resume when visible. Default: `true`.
- `recordConsole` (`boolean`) — Record console.log/warn/error/info/debug calls. Default: `true`.
- `privacyMaskAttribute` (`string`) — HTML attribute for text masking. Text replaced with `***`. Default: `"data-dozor-mask"`.
- `privacyBlockAttribute` (`string`) — HTML attribute for element blocking. Replaced with same-size placeholder. Default: `"data-dozor-block"`.
- `privacyBlockMedia` (`boolean`) — Replace all media (`img`, `video`, etc.) with placeholders. Default: `false`.
- `privacyMaskInputs` (`boolean`) — Mask all input/textarea/select values with `*`. Default: `true`.
- `fetchTimeout` (`number`) — Timeout for each network request in ms. Applies to event batch sends (not keepalive). Default: `10000` (10 seconds).
- `debug` (`boolean`) — Enable debug logging — prints `[dozor]`-prefixed console output for every lifecycle event, state transition, flush, and transport operation. Default: `false`.

#### Auto-init vs manual init

**Auto-init** — pass `options` to start recording on mount:

```tsx
<DozorProvider options={{ apiKey: "dp_your_key" }}>
```

**Manual init** — omit `options` and call `init()` from a component:

```tsx
<DozorProvider>
  <ManualInitComponent />
</DozorProvider>;

function ManualInitComponent() {
  const dozor = useDozor();

  function handleStart() {
    dozor.init({ apiKey: "dp_your_key" });
  }

  return <button onClick={handleStart}>Start recording</button>;
}
```

### `useDozor()`

Hook that returns the current recorder state and control methods. Must be used within a `<DozorProvider>`.

```ts
import { useDozor } from "@kharko/dozor-react";

function MyComponent() {
  const dozor = useDozor();
  // dozor.state, dozor.isRecording, dozor.hold(), etc.
}
```

Throws an error if called outside of `<DozorProvider>`.

#### Returned properties

All properties are reactive — they update automatically when the recorder state changes.

- `state` (`DozorContextState`) — Current state: `"not_initialized"`, `"idle"`, `"recording"`, `"paused"`, or `"stopped"`.
- `sessionId` (`string | null`) — Current session ID (UUID v4), or `null` before init.
- `isRecording` (`boolean`) — `true` when actively recording.
- `isPaused` (`boolean`) — `true` when paused via `pause()`.
- `isHeld` (`boolean`) — `true` when transport is held — events are buffered but not sent.
- `userId` (`string | null`) — Current user ID, or `null` if not identified.
- `bufferSize` (`number`) — Number of events currently buffered in memory (not yet sent).

> **Note:** `state` includes `"not_initialized"` which doesn't exist in the core SDK — it indicates that `init()` hasn't been called yet.
>
> **Note:** `bufferSize` reflects the value at the last state change notification. It does not update in real-time as rrweb emits events.

#### Returned methods

- `init(options: DozorOptions)` — Initialize the recorder. No-op if already initialized.
- `start()` — Start recording (only when `autoStart: false`).
- `pause()` — Pause recording. Keeps session and buffer alive.
- `resume()` — Resume recording after a pause.
- `stop()` — Stop recording, flush all events (even if held), destroy instance.
- `cancel()` — Discard session — drop buffer, delete from server, destroy instance.
- `hold()` — Hold transport — recording continues but events are buffered without sending.
- `release(options?: { discard?: boolean })` — Release transport hold. Flushes buffer by default, or pass `{ discard: true }` to drop held events.
- `identify(userId: string, traits?: UserTraits)` — Identify the current user with an ID and optional traits. Triggers metadata re-send if needed.

## Use cases

### Basic recording

```tsx
import { DozorProvider } from "@kharko/dozor-react";

export default function RootLayout({ children }) {
  return <DozorProvider options={{ apiKey: "dp_your_key" }}>{children}</DozorProvider>;
}
```

### Conditional recording

Record a session but only send it if the user completes a valuable action.

```tsx
function CheckoutFlow() {
  const dozor = useDozor();

  async function handlePurchase() {
    await submitOrder();
    dozor.release(); // session was valuable — send it
  }

  function handleAbandon() {
    dozor.cancel(); // session was not valuable — discard it
  }

  return (
    <>
      <button onClick={handlePurchase}>Complete purchase</button>
      <button onClick={handleAbandon}>Leave</button>
    </>
  );
}

// In layout: start with hold so nothing is sent until release()
<DozorProvider options={{ apiKey: "dp_your_key", hold: true }}>
  <CheckoutFlow />
</DozorProvider>;
```

### Network-aware buffering

Pause sending during heavy network activity.

```tsx
function DataLoader() {
  const dozor = useDozor();

  async function loadEverything() {
    dozor.hold();
    await Promise.all([fetchUsers(), fetchProducts(), fetchOrders()]);
    dozor.release(); // resume sending, flush what accumulated
  }

  return <button onClick={loadEverything}>Load data</button>;
}
```

### Identify users after login

```tsx
function LoginForm() {
  const dozor = useDozor();

  async function handleLogin(credentials) {
    const user = await login(credentials);
    dozor.identify(user.id, {
      email: user.email,
      name: user.name,
      plan: user.plan,
    });
  }

  return <form onSubmit={handleLogin}>...</form>;
}
```

### Deferred start

Start recording only when the user enters a specific section.

```tsx
function RecordingGate({ children }) {
  const dozor = useDozor();

  useEffect(() => {
    dozor.init({ apiKey: "dp_your_key", autoStart: false });
  }, []);

  return (
    <>
      <button onClick={() => dozor.start()}>Start recording</button>
      <button onClick={() => dozor.stop()}>Stop recording</button>
      {children}
    </>
  );
}
```

### Pause during sensitive input

```tsx
function CreditCardForm() {
  const dozor = useDozor();

  return (
    <div onFocus={() => dozor.pause()} onBlur={() => dozor.resume()}>
      <input type="text" placeholder="Card number" />
    </div>
  );
}
```

### Status indicator

```tsx
function RecordingStatus() {
  const { state, isHeld, sessionId } = useDozor();

  return (
    <div>
      <span>State: {state}</span>
      {isHeld && <span> (transport held)</span>}
      {sessionId && <span> | Session: {sessionId}</span>}
    </div>
  );
}
```

## Edge cases

- `useDozor()` outside `<DozorProvider>` — throws: `"useDozor must be used within a <DozorProvider>"`.
- `init()` called multiple times — returns existing singleton, does not re-initialize.
- `start()` when already recording — no-op.
- `pause()` when not recording — no-op.
- `resume()` when not paused — no-op.
- `stop()` when already stopped — no-op.
- `cancel()` when already stopped — no-op.
- `hold()` when already held or stopped — no-op.
- `release()` when not held — no-op.
- `stop()` while held — releases hold, flushes all events, destroys instance.
- `cancel()` while held — drops buffer, deletes session.
- Methods called before `init()` — no-op (safely ignored via optional chaining).
- `<DozorProvider>` unmounts — singleton persists until `stop()` or `cancel()` is called.
- Multiple `<DozorProvider>` instances — both reference the same singleton. Avoid this — use one provider at the app root.
- React Server Components — safe. The `"use client"` directive is bundled into the package output.
- Next.js App Router — place `<DozorProvider>` in a client component (e.g., `providers.tsx`) that wraps your layout.
- Tab hidden with `pauseOnHidden: true` (default) — recording pauses automatically, resumes when visible.
- Tab hidden after manual `pause()` — auto-resume does **not** override manual pause. Only `resume()` can resume.
- React Strict Mode (dev) — `useEffect` runs twice in development. The provider handles this — `init()` is idempotent.

## TypeScript

The package exports all types needed for typed usage:

```ts
import type { DozorContextValue, DozorContextState, DozorSnapshot, DozorActions } from "@kharko/dozor-react";
import type { DozorOptions, DozorState } from "@kharko/dozor";
```

### `DozorContextState`

```ts
type DozorContextState = DozorState | "not_initialized";
// = "not_initialized" | "idle" | "recording" | "paused" | "stopped"
```

### `DozorSnapshot`

Immutable snapshot of the recorder state. Contains all reactive properties (`state`, `sessionId`, `isRecording`, `isPaused`, `isHeld`, `userId`, `bufferSize`).

### `DozorActions`

Stable action methods (`init`, `start`, `pause`, `resume`, `stop`, `cancel`, `hold`, `release`, `identify`). Reference identity never changes.

### `DozorContextValue`

Full type of the object returned by `useDozor()`. Combines `DozorSnapshot & DozorActions`.

## Peer dependencies

- `@kharko/dozor` — any version
- `react` — `>=18`

## License

MIT
