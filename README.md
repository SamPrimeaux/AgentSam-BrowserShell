# AgentSam Local Studio & AntiGravity OS

> **Autonomous Generative Web Browser, Agent Client Protocol (ACP) Daemon, Deterministic GOAP Planner, and Multi-Cloud Workspace Monorepo.**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.4-purple.svg)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-19.0-61dafb.svg)](https://react.dev/)
[![License](https://img.shields.io/badge/License-Apache--2.0-green.svg)](LICENSE)
[![Theme](https://img.shields.io/badge/Theme-AgentSam_Violet-8B5CF6.svg)](#5-theme--visual-systems)

---

## 1. Architectural Overview & 6-Family Taxonomy

AgentSam is structured into **6 distinct architectural families**, isolating framework-neutral foundational contracts from runtime daemons, workbench UI components, end-user applications, and design tokens.

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        AGENT SAM 6-FAMILY MONOREPO                      │
└────────────────────────────────────────────────────────────────────────┘
                                    │
    ┌───────────────────────────────┴───────────────────────────────┐
    ▼                                                               ▼
[1. FOUNDATION & CONTRACTS]                       [2. RUNTIME & INFRASTRUCTURE]
• @inneranimalmedia/agentsam-contracts            • Machine Intent Front Controller (0-LLM)
• @inneranimalmedia/agentsam-work-graph           • Agent Client Protocol (ACP) Daemon
• TaskContract SHA-256 Execution Guardrails       • GOAP A* Heuristic Goal Planner
• Ambient Types (types/agentSam.ts)               • Polyglot Distributions (Rust, Go, Python)
    │                                                               │
    └───────────────────────────────┬───────────────────────────────┘
                                    ▼
                      [3. WORKBENCH & UI SYSTEMS]
                      • @inneranimalmedia/agentsam-workbench
                      • @inneranimalmedia/agentsam-abs (Auto Browser Shell)
                      • OuterFrame OS Frame & Live Telemetry
                      • Sandbox Isolated Renderer (Iframe Sandbox)
                      • AddressBar & Audio Scrubber
                                    │
                                    ▼
                      [4. PRODUCT & APPLICATIONS]
                      • @inneranimalmedia/agentsam-settings (5-Family Ops)
                      • @inneranimalmedia/agentsam-work (Projects DAG)
                      • Gmail & Google Drive Cloud Workspaces
                      • Gemini Multimodal Hub (Live, Imagen 3, Veo 2)
                      • Repo Architecture & Wireframe Visualizer
                                    │
                                    ▼
                      [5. THEME & VISUAL SYSTEMS]
                      • @inneranimalmedia/agentsam-abs Packaged Theme
                      • AgentSam Violet Flagship Palette (#090A0E / #8B5CF6)
                      • Semantic Token Engine & Safe-Area CSS Insets
                                    │
                                    ▼
                      [6. PLATFORM & MOBILE LANES]
                      • @inneranimalmedia/agentsam-platform (capability contract)
                      • Web/PWA · Capacitor · Expo · Tauri Mobile adapters
                      • @inneranimalmedia/agentsam-runtime-state (progress vocabulary)
                      • @inneranimalmedia/agentsam-telemetry (ingestion boundary)
                      • @inneranimalmedia/agentsam-browser-surface (Browse/Build)
                      • @inneranimalmedia/agentsam-proof (one cross-platform proof)
```

---

## 2. Family Breakdown

### 1. Foundation & Contracts
Framework-neutral shared vocabulary, headless DAGs, and invariant gates. Zero native or framework bindings.
- **`packages/agentsam-contracts` (`@inneranimalmedia/agentsam-contracts`)**: The canonical type schema for the ecosystem. Defines `Message`, `Artifact`, `ToolReceipt`, `ModelOption`, `ObservabilityEvent`, and `HostCapability` contracts.
- **`packages/agentsam-work-graph` (`@inneranimalmedia/agentsam-work-graph`)**: Headless deterministic Directed Acyclic Graph (DAG) for mission planning, task dependency edge resolution, topological execution order, and critical-path timeline projections.
- **`backend/agentsam/taskContract.ts`**: Cryptographically sealed runtime guardrail. Enforces permissions, allowed tool boundaries, and immutable input/output spans via SHA-256 hashes.
- **`types/agentSam.ts` & `types.ts`**: Ambient interface definitions for tabs, breadcrumbs, history, token usage telemetry, and GOAP actions.

### 2. Runtime & Infrastructure
Execution engines, machine-first intent routers, daemons, and multi-language SDK distributions.
- **`backend/agentsam/frontController.ts`**: Machine Intent Router. Acts as an ultra-fast **0-LLM deterministic interceptor** for operational queries (`system.status`, `doctor.health`, `models.list`, `branch.current`, `brand.plan`), cutting up to 62% of unnecessary LLM inference.
- **`backend/agentsam/acp/`**: Full Agent Client Protocol (JSON-RPC 2.0 & REST) daemon (`serve.ts`, `auth.ts`, `types.ts`). Exposes endpoints `/tools`, `/rpc`, `/intent/resolve`, and `/models`.
- **`backend/agentsam/goap/`**: Goal-Oriented Action Planning engine implementing backward A* heuristic search (`planner.ts`), invariant gate verification, and atomic action sequencing (`executor.ts`, `actions.ts`).
- **`crates/agentsam-abs/`**: Native Rust crate (`v1.0.0`) implementing `AgentSamAutoBrowserShell` and `NavigationTrail`.
- **`pkg/agentsamabs/`**: Production Go module (`v1.0.0`) for programmatic browser automation and multi-destination cloud sync.
- **`python/agentsam_abs/`**: Python package (`v1.0.0`) built with Pydantic v2 supporting synchronous and asynchronous clients.

### 3. Workbench & UI Systems
Desktop shells, browser frames, jumpable breadcrumb trails, and canvas primitives.
- **`packages/agentsam-abs` (`@inneranimalmedia/agentsam-abs`)**: Reusable auto-browser shell package containing client bindings, multi-cloud export bridges, and the official packaged theme engine (`styles/theme.css`).
- **`packages/agentsam-workbench` (`@inneranimalmedia/agentsam-workbench`)**: Interactive workspace components: `AgentThread`, `Composer`, `ModelSelect`, and `ToolReceipt`.
- **`components/AgentSamAutoBrowserShell.tsx`**: Browser runtime canvas featuring clickable history breadcrumb nodes (`.abs-crumb-node`), fast forward/backward traversal, and real-time state restoration.
- **`components/OuterFrame.tsx`**: Host desktop window shell providing system telemetry (token count, generation latency), audio playback status, quick workspace navigation, and theme cycling.
- **`components/Sandbox.tsx`**: Hardened, sandboxed iframe renderer for previewing synthesized web applications safely.

### 4. Product & Applications
Composed end-user workspaces, settings consoles, productivity tools, and generative studios.
- **`packages/agentsam-settings` (`@inneranimalmedia/agentsam-settings`)**: 5-family Settings & Observability Console featuring unit-scoped host retrieval (`AgentSamDefaultSettingsHost`), 14 operational domains, and live telemetry graphs.
- **`packages/agentsam-work` (`@inneranimalmedia/agentsam-work`)**: Work planning workspace presenting DAG project boards, task cards, and timeline projections.
- **`components/workspace/GmailWorkspace.tsx`**: Full-screen Gmail workspace with generative email synthesis and draft synchronization.
- **`components/workspace/GoogleDriveWorkspace.tsx`**: Cloud storage explorer with direct file previews, markdown rendering, and local disk synchronization.
- **`components/workspace/CloudSaveModal.tsx`**: Multi-destination export modal (Google Drive, Gmail, ACP Artifact, Local HTML/Markdown).
- **`components/ai/GeminiAiHubModal.tsx`**: Multimodal generative AI hub integrating Gemini 2.5 Live Voice, Imagen 3, Veo 2 video synthesis, and streaming chat.
- **`components/RepoWireframeVisualizer.tsx`**: Live repository wireframe mapper and optimization collaboration studio.

### 5. Theme & Visual Systems
Semantic palettes, scene tokens, typography hierarchy, and brand asset contracts.
- **`packages/agentsam-abs/styles/theme.css`**: Canonical packaged theme stylesheet defining CSS custom properties, display safe-area insets (`--sat`, `--sab`, `--sal`, `--sar`), outer frame geometry, and backdrop patterns (`pattern-dots`, `pattern-grid`, `pattern-vignette`).
- **`packages/agentsam-abs/src/theme.ts`**: TypeScript design token dictionary (`AGENTSAM_ABS_THEME_TOKENS`) and programmatic injection helper (`applyAbsTheme`).
- **`services/themeService.ts`**: Palette store with live persistence, density scalers, and custom accent swatch managers.

### 6. Platform & Mobile Lanes
Portable host capabilities, four thin lane applications, and the contracts that keep them comparable. **No UI component asks which platform it is on — it asks for a capability.**
- **`packages/agentsam-platform` (`@inneranimalmedia/agentsam-platform`)**: The twelve-capability contract (`filesystem`, `camera`, `microphone`, `notifications`, `secureStore`, `share`, `clipboard`, `network`, `browser`, `terminal`, `localModels`, `backgroundExecution`), capability ports, the adapter interface, React bindings, and a reference in-memory adapter.
- **`packages/agentsam-platform-{web,capacitor,expo,tauri}`**: The four lane adapters. Native SDKs are injected, never imported, so each adapter compiles without its toolchain and each lane is independently removable.
- **`packages/agentsam-runtime-state` (`@inneranimalmedia/agentsam-runtime-state`)**: Thirteen-state runtime vocabulary and the single adapter that projects producer events into the loading scene, compact status, activity timeline, and `agentsam.runtime.v1`.
- **`packages/agentsam-telemetry` (`@inneranimalmedia/agentsam-telemetry`)**: Event envelopes, the durable local spool (batching, backoff, dedupe), the authenticated Worker gateway transport, and the rule that devices never hold the Basin credential.
- **`packages/agentsam-browser-surface` (`@inneranimalmedia/agentsam-browser-surface`)**: `AgentSamBrowserSurface` with Browse and Build modes and a provider registry so the lightweight Local Studio browser and the AgentSam Browser Shell can be swapped behind one stable host composition.
- **`packages/agentsam-proof` (`@inneranimalmedia/agentsam-proof`)**: The nine-step scenario every lane must pass, the lane metric schema, and the shared capability demonstration screen.
- **`apps/mobile-{pwa,capacitor,expo,tauri}`**: Deliberately thin lane applications — bootstrapping, platform adapter, manifest/config, native project metadata, capability demonstration screen. Nothing else.

---

## 3. Flagship Palette & Semantic Tokens

The active default theme is **AgentSam Violet (Flagship)**:

| Token Name | Hex Code | Semantic Role |
| :--- | :--- | :--- |
| `--app-bg` / `--app-canvas-bg` | `#090A0E` | Deep canvas background, window frame backdrop |
| `--app-surface-1` | `#101117` | Panels, toolbars, inactive tabs, omnibar background |
| `--app-surface-2` | `#171822` | Raised cards, active tabs, focused omnibar |
| `--app-surface-3` | `#1F202D` | Dialog overlays, dropdown menus, hover highlights |
| `--app-border` | `#252636` | Subtle structural division lines |
| `--app-border-hover` | `#383A52` | Interactive element hover outlines |
| `--app-border-focus` | `#8B5CF6` | Keyboard/cursor active focus rings |
| `--app-text-primary` | `#F7F5FB` | High-contrast headings and primary content |
| `--app-text-secondary` | `#B5B1C0` | Secondary labels, breadcrumbs, and muted metadata |
| `--app-accent` | `#8B5CF6` | Electric violet accent & primary actions |
| `--app-accent-soft` / hover | `#B69AF8` | Accent hover states, glow borders, and pill fills |
| `--app-success` | `#4ADE9B` | Healthy statuses, verified invariants, positive feedback |

---

## 4. Key Architectural Invariants

### Invariant A: IAM vs AgentSam Authority Decoupling
To prevent split-brain releases and credential entanglement, the monorepo strictly separates identity from product release authority:
- **IAM Authority (Identity Only)**: Governs OAuth client tokens, Google Workspace scopes (`drive.file`, `gmail.modify`), and user authentication claims. IAM has **zero** desktop release or model inventory ownership.
- **AgentSam Authority (Product SSOT)**: Governs desktop release manifests, model discovery endpoints, runtime daemon ports, and TaskContract execution boundaries.

### Invariant B: Machine-First Intent Routing (0-LLM Filter)
Incoming prompts and queries pass through `backend/agentsam/frontController.ts` before triggering expensive model inference:
1. **Deterministic Filter**: Inspects query signatures for system commands (`doctor`, `health`, `models`, `branch`, `status`).
2. **Instant Response**: Resolves operational requests directly from local telemetry and host states in sub-millisecond time.
3. **Selective Delegation**: Only open-ended tasks and generative synthesis requests proceed to Gemini API endpoints.

### Invariant C: Clean-Room Artifact Compilation
All monorepo packages define an `artifact.json` compliant with the `inneranimal.artifact.v1` schema. Running `npm run build` triggers `scripts/build-artifact-index.mjs`, which aggregates all package manifests into `dist/artifacts/index.json` before building application assets.

### Invariant D: Capability-Only Platform Access
No UI component may branch on the host. `if (isCapacitor)`, `if (isExpo)`, and `if (isTauri)` are banned in every shared package and every UI file; code asks `@inneranimalmedia/agentsam-platform` for a capability instead. Adapters are the only platform-aware code in the system, and `npm run check:boundaries` fails CI on a violation.

### Invariant E: Lanes Are Independently Removable
Deleting `apps/mobile-<lane>/` and `packages/agentsam-platform-<lane>/` removes a lane completely. No core package may import lane code, no lane app may contain AgentSam conversation logic, model routing, ACP logic, analytics schemas, work graphs, provider semantics, composer state, artifact contracts, or identity contracts. Enforced by boundary rules 2, 3, and 5.

### Invariant F: Devices Never Hold Hosted Credentials
Desktop and mobile hold only an `agentsam-device-token` or `agentsam-session-jwt`. The Basin credential, D1 bindings, and Cloudflare API tokens exist exclusively inside the TypeScript ingestion Worker. Typed in `DEVICE_CREDENTIAL_POLICY`, asserted at transport construction, and checked by boundary rule 4.

---

## 5. Portable Platform Capabilities

```text
AgentSam UI
     │
     ▼
portable capability interfaces
     │
     ├── Web/PWA adapter
     ├── Capacitor adapter
     ├── Expo adapter
     └── Tauri Mobile adapter
```

```ts
interface AgentSamPlatformCapabilities {
  filesystem: CapabilityState;      camera: CapabilityState;
  microphone: CapabilityState;      notifications: CapabilityState;
  secureStore: CapabilityState;     share: CapabilityState;
  clipboard: CapabilityState;       network: CapabilityState;
  browser: CapabilityState;         terminal: CapabilityState;
  localModels: CapabilityState;     backgroundExecution: CapabilityState;
}
```

A `CapabilityState` carries `status` (`available` · `degraded` · `requires-permission` · `denied` · `unavailable` · `unknown`), `permission`, `implementation`, `features`, honest `constraints`, and a `reason`. Availability is about the host; permission is about the user; `degraded` is a first-class answer so OPFS is never reported as a filesystem and `localStorage` is never reported as a keychain.

```ts
const { usable, offerable, request } = useCapability('camera');   // React
const fs = platform.use('filesystem');                            // throws if gated
const terminal = platform.tryUse('terminal');                     // null if absent
await platform.when('localModels', runLocally, runRemotely);      // progressive
```

Full contract: [`docs/architecture/CAPABILITY_CONTRACT.md`](docs/architecture/CAPABILITY_CONTRACT.md).

---

## 6. The Four Mobile Lanes

Preserved deliberately, and deliberately thin.

| Lane | App | Adapter | Contains | Notable honest limits |
| --- | --- | --- | --- | --- |
| **PWA** | `apps/mobile-pwa` | `agentsam-platform-web` | bootstrap · web manifest · service worker · demo screen | OPFS is app-private; `localStorage` is not hardware backed; background sync is Chromium-only |
| **Capacitor** | `apps/mobile-capacitor` | `agentsam-platform-capacitor` | bootstrap · `capacitor.config.json` · native metadata · demo screen | no terminal; microphone needs a community plugin |
| **Expo** | `apps/mobile-expo` | `agentsam-platform-expo` | bootstrap · `app.json`/`eas.json` · RN demo screen | strongest `secureStore` (Keychain/Keystore); background fetch timing never promised |
| **Tauri** | `apps/mobile-tauri` | `agentsam-platform-tauri` | bootstrap · `tauri.conf.json` · Rust capability commands · demo screen | Rust owns device authority; filesystem confined to an app-scoped root |

Each lane app contains **only** bootstrapping, the platform adapter, manifest/config, native project metadata, and a capability demonstration screen. Each has a `NATIVE.md` with the exact commands to generate its native project and the exact steps to delete the lane.

---

## 7. One Cross-Platform Proof

```text
Launch AgentSam → identify platform capabilities → authenticate or use local mode →
open lead conversation → send prompt → stream response → open one artifact →
store local state → emit AgentSam activity event
```

All four lanes run that identical nine-step scenario from `@inneranimalmedia/agentsam-proof`, so framework comparison is evidence rather than theory. Metrics captured per lane: startup time, bundle/install size, UI fidelity, native capability access, offline support, background behavior, developer iteration speed, Rust reuse, web component reuse, plugin maturity, build complexity, signing complexity.

**No winner is chosen yet** — `renderComparisonMarkdown()` refuses to declare one. Scoreboard: [`docs/CROSS_PLATFORM_PROOF.md`](docs/CROSS_PLATFORM_PROOF.md).

---

## 8. Runtime / Loading State Contract

```text
runtime event → runtime-event-adapter → semantic state
                                          ├── loading scene
                                          ├── compact status
                                          ├── activity timeline
                                          └── analytics event
```

```
idle · planning · retrieving_context · tool_execution · browser_navigation
asset_generation · waiting_external · verification · indexing · vectorizing
publishing · complete · failed
```

The visual loader in the co-worker panel is a renderer of runtime state, not a bespoke animation. `progress` is measured or `null`; it is never fabricated. Details: [`docs/architecture/RUNTIME_VISUAL_CONTRACT.md`](docs/architecture/RUNTIME_VISUAL_CONTRACT.md).

---

## 9. Analytics / Event Ingestion Boundary

```text
HOSTED                              LOCAL / DESKTOP / MOBILE
Go / Rust / Python producer         Rust / Go / CLI / Node
        │ service identity                  ▼
        ▼                           agentsamd local event spool
TypeScript ingestion Worker           ├── durable local queue
  ├── validate                        ├── batching
  ├── normalize                       ├── retry/backoff
  ├── authorize                       └── dedupe/event IDs
  ├── D1 hot projection                       ▼
  └── Basin binding               authenticated Worker gateway → D1 + Basin
```

Desktop and mobile never get the Basin credential. Details: [`docs/architecture/ANALYTICS_BOUNDARY.md`](docs/architecture/ANALYTICS_BOUNDARY.md).

---

## 10. Language Boundaries

| Language | Owns |
| --- | --- |
| **TypeScript** | UI · edge contracts · web SDK · validation · read models · adapters |
| **Go** | concurrent services · ACP workers · consumers · daemons · orchestration |
| **Rust** | device authority · filesystem · process · indexing · crypto · native performance · media · CAD · reusable native core |
| **Python** | analytical compute · PyIceberg · DuckDB · evals · datasets · offline scoring · ML training |

The language is an implementation choice behind a contract: a GOAP run emitted from Go and one emitted from Rust must produce identical `agentsam.runtime.v1`, `agentsam.activity.v1`, `agentsam.error.*`, projections, and receipts. Details: [`docs/architecture/LANGUAGE_BOUNDARIES.md`](docs/architecture/LANGUAGE_BOUNDARIES.md).

---

## 11. Browser as a Portable Capability

```text
AgentSamBrowserSurface
   ├── Browse mode : navigate · inspect · summarize · interact
   └── Build  mode : generate · hot-preview · inspect · annotate · edit · publish

SideStage → BrowserStage → BrowserProvider
                             ├── current lightweight browser   (stable host)
                             └── AgentSamBrowserShell provider  (richer impl)
```

`components/browser/BrowserStage.tsx` is the integration seam: the working Local Studio browser keeps running while ABS is mined incrementally. The surface is lane-portable — it renders nothing and imports no platform SDK.

---

## 12. Development & Build Commands

### Prerequisites
- **Node.js**: `>= 20.0.0`
- **Bun** or **NPM**: Standard package manager
- **(Optional) Rust / Cargo**: For compiling native crates in `crates/`
- **(Optional) Go**: `>= 1.22` for `pkg/agentsamabs`
- **(Optional) Python**: `>= 3.10` for `python/agentsam_abs`

### Common Workflows

```bash
# Install dependencies
npm install

# Start development server (Port 3000)
npm run dev

# Re-scan artifacts & build production bundle
npm run build

# Run artifact manifest indexer standalone
node scripts/build-artifact-index.mjs

# Typecheck and lint codebase
npx tsc --noEmit
```

### Platform & mobile workflows

```bash
# Everything: boundary rules -> typecheck -> package tests -> artifact index
npm run verify

# Individually
npm run check:boundaries        # the five architectural rules, enforced
npm run typecheck               # all packages + all four lane apps
npm run test:packages           # node --test, no bundler required
npm run build:packages          # tsc per package, fixed dependency order

# Lane development
npm run dev   -w @inneranimalmedia/agentsam-mobile-pwa        # http://localhost:4173
npm run build -w @inneranimalmedia/agentsam-mobile-pwa

npm run lane:install -w @inneranimalmedia/agentsam-mobile-capacitor
npm run lane:sync    -w @inneranimalmedia/agentsam-mobile-capacitor

npm run lane:install -w @inneranimalmedia/agentsam-mobile-expo
npm run lane:ios     -w @inneranimalmedia/agentsam-mobile-expo

npm run lane:install -w @inneranimalmedia/agentsam-mobile-tauri
npm run lane:ios     -w @inneranimalmedia/agentsam-mobile-tauri
```

---

## 13. Directory Map Wireframe

```text
├── App.tsx                                 # Main React entry & Workspace host router
├── server.ts                               # Full-stack Node/Express server & ACP daemon
├── index.html                              # Root HTML entrypoint
├── index.css                               # Global Tailwind layers & design token imports
├── vite.config.ts                          # Bundler & dev server config (port 3000)
├── tsconfig.json                           # Root TypeScript compiler settings
├── metadata.json                           # Applet identity & permissions
│
├── backend/agentsam/                       # RUNTIME ENGINES & DAEMONS
│   ├── frontController.ts                  # Deterministic 0-LLM Machine Intent Router
│   ├── taskContract.ts                     # SHA-256 sealed execution invariants
│   ├── acp/                                # Agent Client Protocol (JSON-RPC 2.0)
│   └── goap/                               # A* backward heuristic goal planner
│
├── components/                             # WORKBENCH & SHELL SURFACES
│   ├── AgentSamAutoBrowserShell.tsx        # Generative browser canvas with breadcrumb trail
│   ├── OuterFrame.tsx                      # Window frame, workspace selector & system metrics
│   ├── RepoWireframeVisualizer.tsx         # 5-family architecture & wireframe explorer
│   ├── Sandbox.tsx                         # Sandboxed iframe preview runner
│   ├── ai/                                 # Multimodal Gemini Studio Hub (Voice, Video, Images)
│   └── workspace/                          # Connected Workspaces (Drive, Gmail, ACP)
│
├── packages/                               # REUSABLE MONOREPO PACKAGES
│   ├── agentsam-contracts/                 # Shared vocabulary, messages & tool receipts
│   ├── agentsam-work-graph/                # Headless deterministic DAG & topological sort
│   ├── agentsam-workbench/                 # Reusable UI primitives (Thread, Composer, Receipt)
│   ├── agentsam-abs/                       # Auto Browser Shell client & packaged theme
│   ├── agentsam-settings/                  # 5-family Settings & Observability console
│   ├── agentsam-work/                      # Product project cards & timeline projections
│   ├── agentsam-platform/                  # Portable 12-capability contract + React bindings
│   ├── agentsam-platform-web/              # Web/PWA adapter
│   ├── agentsam-platform-capacitor/        # Capacitor adapter (injected plugins)
│   ├── agentsam-platform-expo/             # Expo adapter (injected modules)
│   ├── agentsam-platform-tauri/            # Tauri v2 adapter + Rust command contract
│   ├── agentsam-runtime-state/             # 13-state runtime vocabulary & event adapter
│   ├── agentsam-telemetry/                 # Envelopes, local spool, Worker gateway
│   ├── agentsam-browser-surface/           # Browse/Build contract & provider registry
│   └── agentsam-proof/                     # The one cross-platform proof + lane metrics
│
├── apps/                                   # THIN MOBILE LANES (no business logic)
│   ├── mobile-pwa/                         # Web/PWA lane: manifest, service worker, demo
│   ├── mobile-capacitor/                   # Capacitor lane: capacitor.config.json, demo
│   ├── mobile-expo/                        # Expo lane: app.json, eas.json, RN demo
│   └── mobile-tauri/                       # Tauri lane: tauri.conf.json, src-tauri (Rust)
│
├── docs/                                   # ARCHITECTURE DECISIONS & SCOREBOARDS
│   ├── architecture/CAPABILITY_CONTRACT.md
│   ├── architecture/RUNTIME_VISUAL_CONTRACT.md
│   ├── architecture/ANALYTICS_BOUNDARY.md
│   ├── architecture/LANGUAGE_BOUNDARIES.md
│   ├── CROSS_PLATFORM_PROOF.md             # Lane evidence table (no winner yet)
│   ├── BRANCH_STRATEGY.md
│   └── DEFINITION_OF_DONE.md
│
├── crates/agentsam-abs/                    # Native Rust crate distribution
├── pkg/agentsamabs/                        # Go module distribution
├── python/agentsam_abs/                    # Python Pydantic v2 client distribution
├── services/                               # Cloud services (Drive, Gmail, Gemini, ACP, Themes)
├── scripts/
│   ├── build-artifact-index.mjs            # Artifact catalog compiler (packages + apps)
│   ├── build-packages.mjs                  # Ordered package builds
│   └── check-platform-boundaries.mjs       # The five architectural rules, enforced in CI
└── dist/artifacts/index.json               # Compiled workspace artifact catalog
```

---

## 14. Status — 2026-10-03

| Area | State |
| --- | --- |
| Capability contract | ✅ 12 capabilities, ports, adapter interface, React bindings, memory adapter |
| Lane adapters | ✅ web · capacitor · expo · tauri all compile (`npm run build:packages`) |
| Lane apps | ✅ four thin apps; PWA lane builds at **81.6 KB gzip** |
| Cross-platform proof | ✅ nine steps shared by all lanes; runs against a zero-backend local host |
| Runtime vocabulary | ✅ 13 states, one adapter, four projections, loading-scene binding |
| Telemetry boundary | ✅ envelopes, spool (batch/backoff/dedupe), gateway, device credential policy |
| Browser surface | ✅ Browse/Build contract, lightweight + ABS providers, `BrowserStage` seam |
| Boundary enforcement | ✅ 5 rules green (`npm run check:boundaries`) |
| Typecheck | ✅ clean across packages and all four lanes |
| Tests | ✅ 31 passing (`npm run test:packages`) |
| Artifact catalog | ✅ 19 artifacts indexed |
| Desktop 2.6.11 | ⬜ untouched by this work — see [`docs/DEFINITION_OF_DONE.md`](docs/DEFINITION_OF_DONE.md) |
| Publishing | ⬜ intentionally not done; see [`AGENTSAM_PLAN_TO_PROMOTE.md`](AGENTSAM_PLAN_TO_PROMOTE.md) |
| Mobile lane winner | ⬜ not chosen — decide on measurements, not theory |

Promotion roadmap for everything still trapped in the donor app: [`AGENTSAM_PLAN_TO_PROMOTE.md`](AGENTSAM_PLAN_TO_PROMOTE.md).

---

---

## 15. License

Licensed under the [Apache License, Version 2.0](LICENSE).  
Copyright © 2026 Inner Animal Media. All rights reserved.
