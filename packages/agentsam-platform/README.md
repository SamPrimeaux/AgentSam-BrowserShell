# @inneranimalmedia/agentsam-platform

Portable capability interfaces for AgentSam. One contract; Web/PWA, Capacitor,
Expo, and Tauri Mobile adapters implement it.

```text
AgentSam UI → capability interfaces → { web | capacitor | expo | tauri } adapter
```

No UI component asks `if (isCapacitor)`. It asks for a capability.

```ts
import { AgentSamPlatform } from '@inneranimalmedia/agentsam-platform';
import { PlatformProvider, useCapability, useCapabilityPort } from '@inneranimalmedia/agentsam-platform/react';

const platform = await AgentSamPlatform.create(adapter);

// in a component
const { state, usable, offerable, request } = useCapability('camera');
const clipboard = useCapabilityPort('clipboard');   // port or null
```

**Capabilities:** `filesystem` `camera` `microphone` `notifications`
`secureStore` `share` `clipboard` `network` `browser` `terminal`
`localModels` `backgroundExecution`.

**States:** `available` `degraded` `requires-permission` `denied`
`unavailable` `unknown` — availability is about the host, permission is about
the user, and `degraded` is a first-class honest answer.

See `docs/architecture/CAPABILITY_CONTRACT.md`. Exports include
`createMemoryAdapter()`, the reference implementation used by tests and the
proof harness.

Apache-2.0 · Inner Animal Media
