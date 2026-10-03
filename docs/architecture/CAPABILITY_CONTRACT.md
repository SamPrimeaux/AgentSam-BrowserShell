# Portable capability contract

```text
AgentSam UI
     │
     ▼
portable capability interfaces        @inneranimalmedia/agentsam-platform
     │
     ├── Web/PWA adapter              @inneranimalmedia/agentsam-platform-web
     ├── Capacitor adapter            @inneranimalmedia/agentsam-platform-capacitor
     ├── Expo adapter                 @inneranimalmedia/agentsam-platform-expo
     └── Tauri Mobile adapter         @inneranimalmedia/agentsam-platform-tauri
```

## The rule

No UI component asks:

```ts
if (isCapacitor) …
if (isExpo) …
if (isTauri) …
```

It asks for a capability:

```ts
const { state, usable, offerable, request } = useCapability('camera');
const camera = useCapabilityPort('camera');       // port or null, never throws
const fs = platform.use('filesystem');            // throws a typed error if gated
await platform.when('terminal', run, fallback);   // progressive enhancement
```

`scripts/check-platform-boundaries.mjs` fails CI if a shared package or UI file
branches on the platform (rule 1).

## The twelve capabilities

```ts
interface AgentSamPlatformCapabilities {
  filesystem: CapabilityState;
  camera: CapabilityState;
  microphone: CapabilityState;
  notifications: CapabilityState;
  secureStore: CapabilityState;
  share: CapabilityState;
  clipboard: CapabilityState;
  network: CapabilityState;
  browser: CapabilityState;
  terminal: CapabilityState;
  localModels: CapabilityState;
  backgroundExecution: CapabilityState;
}
```

## CapabilityState

| Field | Meaning |
| --- | --- |
| `status` | `available` · `degraded` · `requires-permission` · `denied` · `unavailable` · `unknown` |
| `permission` | `granted` · `denied` · `prompt` · `not-applicable` · `unknown` |
| `implementation` | `<adapter>.<mechanism>` — telemetry and debugging only, never a UI branch |
| `features` | granular sub-features, e.g. `['read','write','picker']` |
| `constraints` | honest limits: `maxPayloadBytes`, `foregroundOnly`, `requiresUserGesture`, `ephemeral`, `sandboxed` |
| `reason` | why it is not `available` |
| `lastCheckedAt` | ISO-8601 probe time |

Two separations make this honest:

1. **Availability is about the host, permission is about the user.** A camera
   can exist and be denied; a camera can be permitted and absent.
2. **`degraded` is a first-class answer.** OPFS is not a filesystem;
   `localStorage` is not a keychain. Saying `available` for either would be a
   lie the UI then has to discover the hard way.

A capability the user has never been asked about is `requires-permission`,
**not** `denied`. `probe()` must never trigger a permission prompt.

## Ports

Behaviour lives in a port per capability (`FilesystemPort`, `CameraPort`,
`TerminalPort`, …). Adapters implement ports, surfaces consume them, and
everything is `Promise` or `AsyncIterable` so web, native bridge, and IPC
implementations can all satisfy the same shape.

## Writing a new adapter

```ts
export function createMyAdapter(): AgentSamPlatformAdapter {
  return defineAdapter({
    identity: { lane: 'web', os: 'ios', formFactor: 'phone', displayName: '…', adapterVersion: '1.0.0' },
    async probe() { /* return all twelve states */ },
    async request(id) { /* trigger host prompt, return refreshed state */ },
    ports: () => ({ filesystem, clipboard /* … only what you really have */ }),
  });
}
```

`createMemoryAdapter()` in the core package is the reference implementation.
If a lane adapter disagrees with it about shapes, the lane adapter is wrong.

## Why this shape

- Lanes stay **independently removable**: deleting an adapter package and its
  app removes a lane, and CI rule 5 proves no core package imported it.
- Capability answers are **comparable across lanes**, which is what makes the
  cross-platform proof meaningful instead of anecdotal.
- New hosts (desktop Tauri, CLI, a car head unit) implement one interface and
  inherit every AgentSam surface.
