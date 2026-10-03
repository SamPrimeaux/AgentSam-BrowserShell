# Language boundaries

An architectural rule, not a style preference. **The language is an
implementation choice behind a contract.**

| Language | Owns |
| --- | --- |
| **TypeScript** | UI · edge contracts · web SDK · validation · read models · adapters |
| **Go** | concurrent services · ACP workers · consumers · daemons · orchestration |
| **Rust** | device authority · filesystem · process · indexing · crypto · native performance · media · CAD · reusable native core |
| **Python** | analytical compute · PyIceberg · DuckDB · evals · datasets · offline scoring · ML training and experimentation |

## The key rule

A GOAP run emitted from Go and one emitted from Rust must eventually produce
the same:

- `agentsam.runtime.v1`
- `agentsam.activity.v1`
- `agentsam.error.*`
- analytics projections
- receipts

If two languages produce different events for the same work, the contract is
broken — not the language choice.

## Where this already shows up in this repo

| Surface | Language | Contract it honours |
| --- | --- | --- |
| `packages/agentsam-platform*` | TypeScript | capability contract |
| `packages/agentsam-telemetry` | TypeScript | envelopes + spool + gateway |
| `apps/mobile-tauri/src-tauri` | Rust | capability probe + confined filesystem authority |
| `crates/agentsam-abs` | Rust | reusable browser-shell native core |
| `pkg/agentsamabs` | Go | ABS client/consumer |
| `python/agentsam_abs` | Python | analytical / evaluation client |
| `backend/agentsam/goap` | TypeScript (today) | GOAP planner — a Go or Rust implementation must emit identical events |

## Consequence for mobile

Mobile lanes may not grow their own device authority. Tauri delegates to Rust;
Capacitor and Expo delegate to plugins; the PWA lane reports honestly that it
has none. The UI cannot tell the difference because it only reads
`CapabilityState`.
