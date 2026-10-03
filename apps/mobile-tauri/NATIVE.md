# Tauri lane — native project metadata

```bash
npm run lane:install
npm run lane:init:ios       # generates src-tauri/gen/apple
npm run lane:init:android   # generates src-tauri/gen/android
npm run lane:ios            # or lane:android
```

`src-tauri/gen/` is generated and not committed while this lane is a scaffold.

| Item | Value |
| --- | --- |
| Identifier | `com.inneranimals.agentsam.tauri` |
| Min iOS | 14.0 |
| Min Android SDK | 24 |
| Rust crate | `agentsam-mobile-tauri` (`staticlib`, `cdylib`, `rlib`) |
| Data root | `$AGENTSAM_DATA_DIR`, else a temp-dir app folder |

## Why Rust holds the authority

Filesystem, process, crypto, indexing, and media are Rust responsibilities per
the language boundary rule. `src-tauri/src/lib.rs` confines every filesystem
command to an app-scoped root, so the webview can never address an arbitrary
path even if the UI is compromised.

The commands implemented here are exactly the ones declared by
`TAURI_COMMANDS` in `@inneranimalmedia/agentsam-platform-tauri`. Commands that
are not implemented yet are reported as `unavailable` rather than faked.

## Shared Rust core

`crates/agentsam-abs` is the existing reusable native core. As ABS matures,
this lane should depend on it rather than growing its own copy.

## Removal

Delete `apps/mobile-tauri/` and `packages/agentsam-platform-tauri/`.
