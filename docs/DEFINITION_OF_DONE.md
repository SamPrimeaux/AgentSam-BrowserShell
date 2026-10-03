# Definition of Done

## Desktop 2.6.11 — release stabilization

Owned by `release/2.6.11`. Not affected by anything in this scaffold.

- [ ] web `/agentsam` remains visually healthy
- [ ] desktop matches its composition
- [ ] CMS styles cannot contaminate lead AgentSam
- [ ] first message does not destroy composer/thread
- [ ] second message succeeds
- [ ] Browser + Co-worker surfaces work
- [ ] native auth works
- [ ] local credentials work
- [ ] desktop SPA tests pass
- [ ] `.app` passes
- [ ] DMG passes
- [ ] signed
- [ ] notarized
- [ ] updater package signed
- [ ] release published
- [ ] clean install tested
- [ ] updater from 2.6.10 → 2.6.11 tested

## Mobile scaffold

| Criterion | Status | Evidence |
| --- | --- | --- |
| shared capability contract exists | ✅ | `packages/agentsam-platform` — 12 capabilities, ports, adapter contract, React bindings |
| PWA adapter compiles | ✅ | `npm run build:packages` → `agentsam-platform-web` ok |
| Capacitor adapter compiles | ✅ | `npm run build:packages` → `agentsam-platform-capacitor` ok |
| Expo adapter compiles | ✅ | `npm run build:packages` → `agentsam-platform-expo` ok |
| Tauri-mobile boundary compiles | ✅ | adapter builds; `src-tauri/src/lib.rs` implements the declared commands |
| no AgentSam business logic copied into adapters | ✅ | `npm run check:boundaries` rules 2 and 3 |
| one common demo flow exists | ✅ | `@inneranimalmedia/agentsam-proof` — nine steps, four lanes |
| capability reporting works | ✅ | capability demonstration screen + `platform.report()`; 31 package tests pass |
| authenticated analytics/event path specified | ✅ | `packages/agentsam-telemetry` + `docs/architecture/ANALYTICS_BOUNDARY.md` |
| each platform can be independently removable without affecting core packages | ✅ | `npm run check:boundaries` rule 5; each lane's `NATIVE.md` documents removal |

### Verify in one command

```bash
npm run verify     # boundaries → typecheck → tests → artifact index
```

### Deliberately NOT done (and why)

| Not done | Reason |
| --- | --- |
| Publishing to npm | Out of scope by request. `prepack` scripts are in place; nothing has been published. |
| Generated `ios/`/`android/` projects | They are reproducible output, not source. Each lane's `NATIVE.md` has the exact commands. |
| Real conversation backend in the lanes | The proof runs against `createLocalConversationHost()` so every lane is comparable on day one. Swap in the real host per lane without touching the scenario. |
| A winner among the four lanes | The whole point of the proof is to decide on measurements. |
