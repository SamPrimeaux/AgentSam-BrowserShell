# @inneranimalmedia/agentsam-platform-web

Web / PWA adapter for `@inneranimalmedia/agentsam-platform`.

```ts
const platform = await AgentSamPlatform.create(createWebPlatformAdapter());
```

| Capability | Mechanism | Honest status |
| --- | --- | --- |
| filesystem | OPFS | `degraded` — app-private, not the device filesystem |
| camera / microphone | getUserMedia / MediaRecorder | permission-gated, foreground only |
| notifications | Notification API | permission-gated |
| secureStore | localStorage | `degraded` — not hardware backed |
| share | Web Share API | gesture required |
| clipboard | Async Clipboard | gesture required |
| network | navigator.onLine + Network Information | available |
| browser | window.open + popup auth flow | available, embedded surface supported |
| terminal | — | `unavailable`: browsers have no process authority |
| localModels | WebGPU | `unavailable` unless a runtime is registered |
| backgroundExecution | Periodic Background Sync | `degraded` — Chromium only, never guaranteed |

Apache-2.0.
