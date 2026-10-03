# PWA lane — install metadata

No native project. Installability is the "native metadata" for this lane.

| Item | Value |
| --- | --- |
| Manifest id | `com.inneranimals.agentsam.pwa` |
| Display | `standalone`, portrait |
| Theme / background | `#8B5CF6` / `#090A0E` |
| Service worker | `public/sw.js` (shell cache + `periodicsync`) |
| Icons | `public/icons/icon-192.png`, `icon-512.png` (add before shipping) |

```bash
npm run dev -w @inneranimalmedia/agentsam-mobile-pwa     # http://localhost:4173
npm run build -w @inneranimalmedia/agentsam-mobile-pwa
```

## Honest limits measured by this lane

- `filesystem` is OPFS: app-private and invisible to the OS file manager.
- `secureStore` is `localStorage`: not hardware backed. Session material only.
- `backgroundExecution` is Periodic Background Sync: Chromium-only, engagement
  gated, and never guaranteed to run.

## Removal

Delete `apps/mobile-pwa/` and `packages/agentsam-platform-web/`.
