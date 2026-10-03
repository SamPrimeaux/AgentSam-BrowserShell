# One cross-platform proof

All four targets prove the same small scenario. Comparison is then evidence,
not theory.

```text
Launch AgentSam
        ↓
identify platform capabilities
        ↓
authenticate or use local mode
        ↓
open lead conversation
        ↓
send prompt
        ↓
stream response
        ↓
open one artifact
        ↓
store local state
        ↓
emit AgentSam activity event
```

The scenario lives in `@inneranimalmedia/agentsam-proof` so no lane can quietly
make its own version easier. Each lane supplies only a `ProofEnvironment`.

```ts
const report = await runCrossPlatformProof({
  platform,                                   // the lane's adapter, probed
  conversation: createLocalConversationHost(), // or the real AgentSam host
  emit: (event) => spool.enqueue(event),
  appVersion: APP_VERSION,
});
```

Every step returns **evidence** — a short human-checkable string — plus a
duration. `store_local_state` is a real write-then-read-back round trip and
fails loudly when a host has no durable storage. A pass with `authMode:
'local'` is a legitimate pass: offline is a supported mode, not a fallback.

## Running it

| Lane | Command | Then |
| --- | --- | --- |
| PWA | `npm run dev -w @inneranimalmedia/agentsam-mobile-pwa` | open `:4173`, press **Run proof** |
| Capacitor | `npm run lane:install && npm run lane:sync -w @inneranimalmedia/agentsam-mobile-capacitor` | run on device, press **Run proof** |
| Expo | `npm run lane:install && npm run lane:ios -w @inneranimalmedia/agentsam-mobile-expo` | run on device, press **Run proof** |
| Tauri | `npm run lane:install && npm run lane:ios -w @inneranimalmedia/agentsam-mobile-tauri` | run on device, press **Run proof** |

## Evidence table

Fill this in from measurements. Scores are 1–5 and must be justified in notes.
**Do not choose a winner yet.**

| Metric | web (PWA) | capacitor | expo | tauri |
| --- | --- | --- | --- | --- |
| startup (ms, median of 5 cold starts) | — | — | — | — |
| bundle (gzip) | **81.6 KB** | — | — | — |
| install size | n/a (installable PWA) | — | — | — |
| UI fidelity (1-5) | — | — | — | — |
| native capability access (1-5) | — | — | — | — |
| offline support (1-5) | — | — | — | — |
| background behavior (1-5) | — | — | — | — |
| dev iteration speed (1-5) | — | — | — | — |
| Rust reuse (1-5) | — | — | — | — |
| web component reuse (1-5) | — | — | — | — |
| plugin maturity (1-5) | — | — | — | — |
| build complexity (1-5, lower better) | — | — | — | — |
| signing complexity (1-5, lower better) | — | — | — | — |
| proof passed | — | — | — | — |
| usable capabilities (of 12) | — | — | — | — |

> The gzip figure above is the real output of
> `npx vite build --config apps/mobile-pwa/vite.config.ts` in this repo
> (2026-10-03). Every other cell must be measured the same way before it is
> written down.

`renderComparisonMarkdown()` in `@inneranimalmedia/agentsam-proof` generates
this table from `LaneMetrics` objects and appends the "no winner is declared"
note automatically.

## Honest expectations before measurement

These are hypotheses to be falsified, recorded so we can check our priors:

- PWA will win iteration speed and lose background behaviour.
- Capacitor will win plugin maturity and lose startup on cold Android.
- Expo will win developer ergonomics and lose web component reuse.
- Tauri will win Rust reuse and binary size, and lose plugin maturity.

If the measurements contradict these, the measurements are right.
