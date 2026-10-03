# Runtime / loading state contract

The loader in the co-worker panel is **a renderer of runtime state**, not a
special co-worker animation. Progress language is defined once and reused.

```text
runtime event
     ↓
runtime-event-adapter        @inneranimalmedia/agentsam-runtime-state
     ↓
semantic state
     ├── loading scene       @inneranimalmedia/agentsam-loading-scene
     ├── compact status      status line / toolbar
     ├── activity timeline   co-worker panel, run explorer
     └── analytics event     agentsam.runtime.v1
```

## The vocabulary (thirteen states, grow deliberately)

```
idle · planning · retrieving_context · tool_execution · browser_navigation
asset_generation · waiting_external · verification · indexing · vectorizing
publishing · complete · failed
```

`RUNTIME_TO_SCENE` is the single mapping onto the loading-scene semantics.
Nothing else in the ecosystem may invent its own; a second mapping is a bug.

| AgentSam state | loading-scene semantic |
| --- | --- |
| planning | thinking |
| retrieving_context | context_loading |
| tool_execution | tool_execution |
| browser_navigation | reading |
| asset_generation | asset_generation |
| waiting_external | waiting_external |
| verification | verification |
| indexing / vectorizing | indexing |
| publishing | deployment |
| complete / failed | success / error |

## Producer side

Go, Rust, Python, and TypeScript all emit the same normalized event:

```ts
interface RuntimeEvent {
  operationId: string; parentOperationId?: string;
  state: AgentSamRuntimeState;
  phase: 'started' | 'progress' | 'completed' | 'failed';
  scope?: RuntimeScope; label?: string; detail?: string;
  progress?: number | null;        // measured only — never fabricated
  severity?: 'normal' | 'warning' | 'error';
  producer?: 'typescript' | 'go' | 'rust' | 'python';
  runId?: string; timestamp: number;
  attributes?: Record<string, string | number | boolean>;
}
```

A GOAP run emitted from Go and the same run emitted from Rust must produce
byte-compatible events. There is a test for this.

## Consumer side

```ts
const runtime = new RuntimeEventAdapter({ onAnalytics: (event) => spool.enqueue(event) });
bindLoadingScene(runtime, controller);          // the visual loader
runtime.subscribe(({ compact, timeline }) => …); // status line + co-worker panel
```

Parallel operations resolve through a fixed priority so the compact status is
deterministic: `failed > waiting_external > publishing > tool_execution >
browser_navigation > asset_generation > vectorizing > indexing > verification >
retrieving_context > planning > complete > idle`.

## Rules

1. `progress` is measured or `null`. Never animate a fake percentage.
2. The label is what the human cares about; the state is what the renderer
   cares about. They move independently.
3. New states require a renderer story for all four projections before merge.
