# @inneranimalmedia/agentsam-platform-tauri

Tauri v2 (desktop + mobile) adapter for `@inneranimalmedia/agentsam-platform`.

Everything crosses one structural `TauriBridge`, so this package has no
dependency on `@tauri-apps/api`.

```ts
const platform = await AgentSamPlatform.create(createTauriPlatformAdapter({ bridge }));
```

`TAURI_COMMANDS` is the contract the Rust side must implement; see
`apps/mobile-tauri/src-tauri/src/lib.rs` for the reference implementation,
where every filesystem command is confined to an app-scoped root. Commands
that are not implemented yet are reported `unavailable` rather than faked.

Per the language boundary rule, Rust owns device authority — filesystem,
process, crypto, indexing, media. TypeScript only describes and invokes.

Apache-2.0.
