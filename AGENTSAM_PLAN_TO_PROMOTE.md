# AgentSam — Plan to Promote

**What this document is:** an inventory of everything in this repository that
is worth turning into branded, reusable packaging, with the tier it belongs
in, the work required to promote it, and the offer it unlocks.

**Scope note:** nothing here has been published. This is the promotion path,
not a release.

---

## 1. Current state of the shelf

### Shipped in this change (new)

| Package | Tier | Status | What it is |
| --- | --- | --- | --- |
| `@inneranimalmedia/agentsam-platform` | Foundation | candidate | The twelve-capability portable contract, ports, adapter interface, React bindings, memory adapter |
| `@inneranimalmedia/agentsam-platform-web` | Runtime | candidate | Web/PWA adapter |
| `@inneranimalmedia/agentsam-platform-capacitor` | Runtime | candidate | Capacitor adapter (injected plugins) |
| `@inneranimalmedia/agentsam-platform-expo` | Runtime | candidate | Expo adapter (injected modules) |
| `@inneranimalmedia/agentsam-platform-tauri` | Runtime | candidate | Tauri v2 adapter + Rust command contract |
| `@inneranimalmedia/agentsam-runtime-state` | Foundation | candidate | Thirteen-state runtime vocabulary + the one event adapter |
| `@inneranimalmedia/agentsam-telemetry` | Foundation | candidate | Envelopes, local spool, Worker gateway, device credential policy |
| `@inneranimalmedia/agentsam-browser-surface` | Foundation | candidate | Browse/Build contract + provider registry |
| `@inneranimalmedia/agentsam-proof` | Runtime | candidate | The nine-step cross-platform proof + lane metrics + demo screen |

### Already packaged before this change

| Package | Tier | Status |
| --- | --- | --- |
| `@inneranimalmedia/agentsam-contracts` | Foundation | stable |
| `@inneranimalmedia/agentsam-work-graph` | Foundation | stable |
| `@inneranimalmedia/agentsam-work` | Product | stable |
| `@inneranimalmedia/agentsam-workbench` | UI | stable |
| `@inneranimalmedia/agentsam-settings` | UI | stable |
| `@inneranimalmedia/agentsam-abs` | UI | candidate |
| `@inneranimalmedia/agentsam-loading-scene` | UI | published (2.6.10) |

---

## 2. Promotion candidates still living in the app

Everything below is working code in this repo that is currently trapped inside
the donor application. Each row is a package we can grow the ecosystem with.

### Tier A — promote next (high reuse, low extraction cost)

| Source in repo | Proposed package | Why it is worth it | Extraction work |
| --- | --- | --- | --- |
| `components/OuterFrame.tsx` | `@inneranimalmedia/agentsam-os-frame` | The AgentSam OS chrome — titlebar, safe-area insets, telemetry strip. Every lane and the desktop shell need it. | Remove donor-specific props; accept a slot API; move inline styles to the packaged theme. |
| `components/Sandbox.tsx` | `@inneranimalmedia/agentsam-sandbox` | Isolated iframe renderer for untrusted generated HTML. Needed by ABS, Build mode, and artifact previews. | Parameterize CSP/sandbox flags; add a message-bridge contract; add escape tests. |
| `components/AddressBar.tsx` | `@inneranimalmedia/agentsam-addressbar` | Prompt-or-URL omnibox with history and grounding affordances. Reusable by every browser surface. | Depend on `agentsam-browser-surface` types instead of donor `types.ts`. |
| `hooks/useSpeechSynthesis.ts` + `components/TTSPlayerBar.tsx` | `@inneranimalmedia/agentsam-voice` | Read-aloud with a scrubber. An obvious accessibility and "co-worker" differentiator across lanes. | Move browser `speechSynthesis` behind a new `speech` capability port so Expo/Tauri can back it natively. |
| `hooks/useSwipeNavigation.ts` | fold into `@inneranimalmedia/agentsam-os-frame` | Mobile gesture nav; too small to stand alone. | Add pointer-event fallback for desktop. |
| `index.css` (103 KB of tokens) | `@inneranimalmedia/agentsam-theme` | The AgentSam Violet system (`#090A0E` / `#8B5CF6`), semantic tokens, safe-area insets. The single biggest brand asset in the repo. | Split tokens from donor layout rules; emit CSS vars + a JS token export + a Tailwind preset. **This is the highest-leverage extraction on the list.** |

### Tier B — promote after the contract settles

| Source in repo | Proposed package | Why | Extraction work |
| --- | --- | --- | --- |
| `backend/agentsam/goap/*` | `@inneranimalmedia/agentsam-goap` | Deterministic A* goal planner. Sellable on its own as an agent-planning core. | Remove Express coupling; emit `agentsam.runtime.v1` events; port-compatible Go/Rust implementations later. |
| `backend/agentsam/frontController.ts` | `@inneranimalmedia/agentsam-machine-intent` | The 0-LLM intent filter. Real cost savings, easy to demo. | Extract the rule table into data; add a benchmark harness for "avoided tokens". |
| `backend/agentsam/taskContract.ts` | fold into `@inneranimalmedia/agentsam-contracts` | SHA-256 execution guardrails belong with the contracts. | Move + re-export; keep the old path as a deprecated alias for one minor. |
| `backend/agentsam/acp/*` + `services/acpService.ts` | `@inneranimalmedia/agentsam-acp` | Agent Client Protocol daemon + client. The interop story. | Separate protocol types (publishable) from the Express server (app-level). |
| `components/RepoWireframeVisualizer.tsx` | `@inneranimalmedia/agentsam-repo-atlas` | Architecture visualizer fed by `dist/artifacts/index.json`. Excellent sales/demo surface. | Accept an artifact index as a prop; drop filesystem reads. |
| `data/missionPresets.ts` | `@inneranimalmedia/agentsam-missions` | Reusable mission/prompt presets — the content layer of the product. | Schema + validation; versioned preset packs. |

### Tier C — productize, do not publish as libraries

| Source | Shape it should take |
| --- | --- |
| `services/geminiService.ts`, `geminiAiStudioService.ts` | A provider implementation behind a `ModelProvider` contract in `agentsam-contracts`; the key stays server-side. |
| `components/ai/*` (Live voice, Image studio, Veo) | Product surfaces of a **Multimodal Studio** offer; they should consume packaged capabilities, not own them. |
| `services/driveService.ts`, `gmailService.ts`, `googleAuth.ts`, `components/workspace/*` | A **Workspace Connectors** offer; each connector needs an isolated OAuth boundary before it leaves the app. |
| `crates/agentsam-abs`, `pkg/agentsamabs`, `python/agentsam_abs` | Already the polyglot SDK trio. Promote by giving all three the same conformance test vectors. |

---

## 3. The branded shelf we are building toward

```text
inneranimalmedia / AgentSam
│
├── FOUNDATION   contracts · platform · runtime-state · telemetry · browser-surface · work-graph
├── RUNTIME      platform-{web,capacitor,expo,tauri} · goap · machine-intent · acp · proof
├── UI           theme · os-frame · sandbox · addressbar · voice · loading-scene · abs · workbench · settings
├── PRODUCT      work · missions · repo-atlas · multimodal studio · workspace connectors
└── POLYGLOT     crates/* (Rust) · pkg/* (Go) · python/* (Python)
```

Naming rule: `@inneranimalmedia/agentsam-<noun>`. One noun, lowercase, no
platform in the name unless the package *is* the platform adapter.

Versioning rule: Foundation packages move on their own semver and are the only
packages other packages may depend on. UI and Runtime packages may depend on
Foundation; Product packages may depend on anything; nothing depends on
Product. A lane adapter is never a dependency of anything but its own app.

---

## 4. Offers these packages unlock

| Offer | Built from | Who buys it |
| --- | --- | --- |
| **AgentSam Local Studio** (desktop) | os-frame · theme · abs · workbench · settings · goap · acp | Teams that want an agent workstation they own |
| **AgentSam Mobile** | platform + one chosen lane · proof · theme | Existing Local Studio customers who want continuity on a phone |
| **AgentSam Embed** | browser-surface · sandbox · addressbar · loading-scene | Products that want a generative browser inside their own app |
| **AgentSam Runtime Telemetry** | runtime-state · telemetry + the Worker | Anyone running agents who needs receipts, cost, and provenance |
| **AgentSam Capability Audit** (service) | platform · proof · repo-atlas | A paid engagement: run the proof on a client's target devices and hand them the evidence table |
| **AgentSam Design System** | theme · os-frame · loading-scene | Licensing the visual identity to partner surfaces |
| **Polyglot SDKs** | crates · pkg · python | Integration partners in Rust, Go, and Python shops |

The capability contract is what makes this a shelf instead of a pile: each
offer is a composition of packages, not a fork of an app.

---

## 5. Promotion checklist (apply per package)

A package is promotable when:

- [ ] it has an `artifact.json` with `kind`, `family`, `status`, `capabilities`
- [ ] it has a `README.md` with a runnable snippet and its honest limits
- [ ] it builds with `npm run build:packages` (added to the fixed order list)
- [ ] it has tests that run with `node --test` and no bundler
- [ ] it has zero donor-app imports (`@/`, relative paths outside the package)
- [ ] it passes `npm run check:boundaries`
- [ ] its public types reference `agentsam-contracts` rather than redefining
- [ ] its peer dependencies are optional where the package can work headless
- [ ] it declares `publishConfig.access: public` and an Apache-2.0 or MIT license
- [ ] it is listed in the root README package table

---

## 6. Sequenced plan

**Now (this change):** capability contract, four adapters, four lanes, runtime
vocabulary, telemetry boundary, browser surface, cross-platform proof, CI
boundary enforcement. Desktop 2.6.11 untouched.

**Next (Tier A):** extract `agentsam-theme` first — every other UI package
currently carries a copy of the palette. Then `os-frame`, `sandbox`,
`addressbar`, `voice`.

**Then (Tier B):** `goap`, `machine-intent`, `acp` protocol types,
`repo-atlas`, `missions`. These turn the runtime story into a sellable one.

**Then:** run the proof on real devices, fill in `docs/CROSS_PLATFORM_PROOF.md`,
and only then choose a mobile lane.

**Then:** publish. The `prepack` scripts, `files` lists, and `artifact.json`
manifests are already in place for the day that decision is made.
