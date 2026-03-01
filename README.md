# Kharko Dozor

Open-source session recording and replay platform — and a learning project. See what your users actually do — clicks, scrolls, navigation — without video. Lightweight DOM mutation tracking powered by [rrweb](https://github.com/rrweb-io/rrweb). Free for everyone, forever.

Built under the **Kharko** brand, inspired by Kharkiv, Ukraine.

## Packages

| Package                               | Description                                    | README                                         |
| ------------------------------------- | ---------------------------------------------- | ---------------------------------------------- |
| [`@kharko/dozor`](dozor/)             | Framework-agnostic session recording SDK (npm) | [dozor/README.md](dozor/README.md)             |
| [`@kharko/dozor-react`](dozor-react/) | React Context + hook for `@kharko/dozor` (npm) | [dozor-react/README.md](dozor-react/README.md) |

## Dashboard

The web dashboard (Next.js app) lives in a separate repo: [kharko-dozor-dashboard](https://github.com/kolia-zamnius/kharko-dozor-dashboard).

## Architecture

The SDK follows a modular event-driven architecture with clear separation of concerns:

```
dozor/src/
├── index.ts                  # Public exports
├── types.ts                  # Public types
└── recorder/                 # All implementation
    ├── index.ts              # Dozor — thin Facade/Mediator
    ├── transport.ts          # Network (retry, gzip, keepalive)
    ├── core/                 # Infrastructure
    │   ├── emitter.ts        # Typed event bus (Observer)
    │   └── state-machine.ts  # FSM with transition table (State)
    ├── pipeline/             # Event flow
    │   ├── event-buffer.ts   # Storage + drain (Pipeline)
    │   ├── flush-scheduler.ts # Timer + batch flush (Strategy)
    │   └── idle-detector.ts  # Activity monitor
    ├── slicing/              # Recording segmentation
    │   ├── slice-manager.ts  # Slice creation + snapshots
    │   └── page-tracker.ts   # SPA navigation
    └── browser/              # Browser API integration
        ├── visibility-manager.ts
        ├── session.ts
        └── metadata.ts
```

Modules communicate via typed Emitter — no direct dependencies between them. The Dozor facade wires everything together.

## Stack

TypeScript · rrweb · tsup · pnpm workspaces

## Getting started

### Prerequisites

- Node.js 20+
- pnpm 10+

### Setup

```bash
git clone https://github.com/kolia-zamnius/kharko-dozor.git
cd kharko-dozor
pnpm install
```

### Scripts

| Command            | Description                          |
| ------------------ | ------------------------------------ |
| `pnpm build`       | Build all packages                   |
| `pnpm build:dozor` | Build `@kharko/dozor` SDK            |
| `pnpm build:react` | Build `@kharko/dozor-react`          |
| `pnpm dev:dozor`   | Watch mode for `@kharko/dozor`       |
| `pnpm dev:react`   | Watch mode for `@kharko/dozor-react` |

### Running a specific package

```bash
pnpm -F @kharko/dozor <script>
pnpm -F @kharko/dozor-react <script>
```

## License

[MIT](LICENSE)
