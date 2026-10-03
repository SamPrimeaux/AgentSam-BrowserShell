# AgentSam Local Studio & AntiGravity OS

> **Autonomous Generative Web Browser, Agent Client Protocol (ACP) Daemon, Deterministic GOAP Planner, and Multi-Cloud Workspace Monorepo.**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.4-purple.svg)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-19.0-61dafb.svg)](https://react.dev/)
[![License](https://img.shields.io/badge/License-Apache--2.0-green.svg)](LICENSE)
[![Theme](https://img.shields.io/badge/Theme-AgentSam_Violet-8B5CF6.svg)](#5-theme--visual-systems)

---

## 1. Architectural Overview & 5-Family Taxonomy

AgentSam is structured into **5 distinct architectural families**, isolating framework-neutral foundational contracts from runtime daemons, workbench UI components, end-user applications, and design tokens.

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        AGENT SAM 5-FAMILY MONOREPO                      │
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

---

## 5. Development & Build Commands

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

---

## 6. Directory Map Wireframe

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
│   └── agentsam-work/                      # Product project cards & timeline projections
│
├── crates/agentsam-abs/                    # Native Rust crate distribution
├── pkg/agentsamabs/                        # Go module distribution
├── python/agentsam_abs/                    # Python Pydantic v2 client distribution
├── services/                               # Cloud services (Drive, Gmail, Gemini, ACP, Themes)
└── dist/artifacts/index.json               # Compiled workspace artifact catalog
```

---

## 7. License

Licensed under the [Apache License, Version 2.0](LICENSE).  
Copyright © 2026 Inner Animal Media. All rights reserved.
