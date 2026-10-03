# @inneranimalmedia/agentsam-platform-capacitor

Capacitor adapter for `@inneranimalmedia/agentsam-platform`.

Plugins are **injected, not imported**, so this package compiles without the
native toolchain, pins no Capacitor major version, and can be deleted with its
lane app without touching a core package.

```ts
import { Camera } from '@capacitor/camera';        // only in apps/mobile-capacitor
import { Filesystem } from '@capacitor/filesystem';

const platform = await AgentSamPlatform.create(
  createCapacitorPlatformAdapter({ plugins: { Camera, Filesystem /* … */ }, core: Capacitor }),
);
```

A plugin that is not supplied is reported `unavailable` with a reason — never
faked. `terminal` is permanently `unavailable`: mobile sandboxes forbid
spawning processes; use the remote ACP daemon.

Apache-2.0.
