# Branch strategy

```text
release/2.6.11
    desktop-only release stabilization

feat/mobile-capability-contract
    shared capability interfaces

feat/mobile-pwa
feat/mobile-capacitor
feat/mobile-expo
feat/mobile-tauri
    proof implementations

feat/browser-shell-provider
    ABS integration behind BrowserStage

feat/runtime-visual-contract
    semantic loading/runtime state adapter
```

**The release branch is not where mobile/browser experimentation happens.**
`release/2.6.11` only receives desktop stabilization fixes.

## What landed where in this scaffold

| Intended branch | Contents of this change |
| --- | --- |
| `feat/mobile-capability-contract` | `packages/agentsam-platform`, boundary checker, build order script |
| `feat/mobile-pwa` | `packages/agentsam-platform-web`, `apps/mobile-pwa` |
| `feat/mobile-capacitor` | `packages/agentsam-platform-capacitor`, `apps/mobile-capacitor` |
| `feat/mobile-expo` | `packages/agentsam-platform-expo`, `apps/mobile-expo` |
| `feat/mobile-tauri` | `packages/agentsam-platform-tauri`, `apps/mobile-tauri` (incl. Rust boundary) |
| `feat/browser-shell-provider` | `packages/agentsam-browser-surface`, `components/browser/BrowserStage.tsx` |
| `feat/runtime-visual-contract` | `packages/agentsam-runtime-state` |
| (cross-cutting) | `packages/agentsam-telemetry`, `packages/agentsam-proof`, `docs/` |

This session is pinned to a single working branch, so the work is delivered
together. When splitting for review, the table above is the cut list — the
packages were written so each row is a self-contained diff.

## Merge order

1. `feat/mobile-capability-contract` (everything else depends on it)
2. `feat/runtime-visual-contract` and the telemetry boundary
3. the four lane branches, in any order — they do not touch each other
4. `feat/browser-shell-provider`
5. `release/2.6.11` merges **none** of the above until desktop DoD is signed off
