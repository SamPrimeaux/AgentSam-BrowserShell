# @inneranimalmedia/agentsam-runtime-state

One semantic progress vocabulary for the whole AgentSam ecosystem.

```text
runtime event → runtime-event-adapter → { loading scene · compact status · activity timeline · analytics }
```

```
idle · planning · retrieving_context · tool_execution · browser_navigation
asset_generation · waiting_external · verification · indexing · vectorizing
publishing · complete · failed
```

```ts
const runtime = new RuntimeEventAdapter({ onAnalytics: (e) => spool.enqueue(e) });
bindLoadingScene(runtime, controller);
runtime.start('op1', 'planning', 'Planning the work');
runtime.complete('op1');
```

The loader is a renderer of runtime state, not a special animation. `progress`
is measured or `null` — never fabricated. Go, Rust, Python, and TypeScript
producers emit the same `RuntimeEvent`.

See `docs/architecture/RUNTIME_VISUAL_CONTRACT.md`. Apache-2.0.
