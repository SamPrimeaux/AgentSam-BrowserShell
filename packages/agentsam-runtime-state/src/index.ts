/**
 * @inneranimalmedia/agentsam-runtime-state
 *
 * ONE semantic progress vocabulary for the whole ecosystem.
 *
 *   runtime event
 *        ↓
 *   runtime-event-adapter        <-- this package
 *        ↓
 *   semantic state
 *        ├── loading scene        (@inneranimalmedia/agentsam-loading-scene)
 *        ├── compact status       (status line / toolbar)
 *        ├── activity timeline    (co-worker panel, run explorer)
 *        └── analytics event      (agentsam.runtime.v1)
 *
 * The loader in the co-worker panel is a *renderer of runtime state*, not a
 * special animation. Go, Rust, Python, and TypeScript producers all emit
 * `RuntimeEvent`; this module is the only place that decides what it means.
 */

// ======================================================================
// 1. THE VOCABULARY (deliberately small — do not grow casually)
// ======================================================================

export const RUNTIME_STATES = [
  'idle',
  'planning',
  'retrieving_context',
  'tool_execution',
  'browser_navigation',
  'asset_generation',
  'waiting_external',
  'verification',
  'indexing',
  'vectorizing',
  'publishing',
  'complete',
  'failed',
] as const;

export type AgentSamRuntimeState = (typeof RUNTIME_STATES)[number];

export const TERMINAL_STATES: readonly AgentSamRuntimeState[] = ['complete', 'failed'];

export function isTerminal(state: AgentSamRuntimeState): boolean {
  return TERMINAL_STATES.includes(state);
}

export function isActive(state: AgentSamRuntimeState): boolean {
  return !isTerminal(state) && state !== 'idle';
}

// ======================================================================
// 2. RUNTIME EVENTS (what producers emit)
// ======================================================================

export type RuntimeEventPhase = 'started' | 'progress' | 'completed' | 'failed';

export type RuntimeProducer = 'typescript' | 'go' | 'rust' | 'python' | 'unknown';

export type RuntimeScope =
  | 'session'
  | 'run'
  | 'plan'
  | 'tool'
  | 'browser'
  | 'asset'
  | 'index'
  | 'publish';

/**
 * The normalized wire shape. `agentsam.runtime.v1`.
 * A GOAP run emitted from Go and one emitted from Rust must produce
 * byte-compatible instances of this.
 */
export interface RuntimeEvent {
  /** Stable id for the unit of work this event belongs to. */
  operationId: string;
  parentOperationId?: string;
  state: AgentSamRuntimeState;
  phase: RuntimeEventPhase;
  scope?: RuntimeScope;
  /** What the human cares about. Independent of visual state. */
  label?: string;
  detail?: string;
  /** Measured progress 0..1, or null when genuinely unknowable. Never faked. */
  progress?: number | null;
  severity?: 'normal' | 'warning' | 'error';
  producer?: RuntimeProducer;
  runId?: string;
  /** Epoch milliseconds. */
  timestamp: number;
  attributes?: Record<string, string | number | boolean>;
}

export function runtimeEvent(input: Partial<RuntimeEvent> & { state: AgentSamRuntimeState }): RuntimeEvent {
  return {
    operationId: input.operationId ?? `op_${Math.random().toString(36).slice(2, 10)}`,
    parentOperationId: input.parentOperationId,
    state: input.state,
    phase: input.phase ?? (isTerminal(input.state) ? (input.state === 'failed' ? 'failed' : 'completed') : 'progress'),
    scope: input.scope,
    label: input.label,
    detail: input.detail,
    progress: input.progress ?? null,
    severity: input.severity ?? (input.state === 'failed' ? 'error' : 'normal'),
    producer: input.producer ?? 'typescript',
    runId: input.runId,
    timestamp: input.timestamp ?? Date.now(),
    attributes: input.attributes,
  };
}

// ======================================================================
// 3. PROJECTIONS (what renderers consume)
// ======================================================================

/** Compact status line: one short string, one tone, one optional percentage. */
export interface CompactStatus {
  state: AgentSamRuntimeState;
  tone: 'neutral' | 'active' | 'waiting' | 'success' | 'error';
  text: string;
  progress: number | null;
  activeCount: number;
}

export interface TimelineEntry {
  id: string;
  operationId: string;
  parentOperationId?: string;
  state: AgentSamRuntimeState;
  label: string;
  detail?: string;
  startedAt: number;
  endedAt?: number;
  durationMs?: number;
  status: 'running' | 'succeeded' | 'failed';
  producer: RuntimeProducer;
}

/** The loading-scene semantic set (upstream vocabulary, 16 values). */
export type LoadingSceneSemanticName =
  | 'idle'
  | 'boot'
  | 'reading'
  | 'thinking'
  | 'tool_execution'
  | 'parallel_execution'
  | 'context_loading'
  | 'indexing'
  | 'verification'
  | 'compaction'
  | 'asset_generation'
  | 'build'
  | 'deployment'
  | 'waiting_external'
  | 'success'
  | 'error';

/**
 * The ONE mapping from AgentSam runtime vocabulary to loading-scene semantics.
 * Nothing else in the ecosystem is allowed to invent its own.
 */
export const RUNTIME_TO_SCENE: Record<AgentSamRuntimeState, LoadingSceneSemanticName> = {
  idle: 'idle',
  planning: 'thinking',
  retrieving_context: 'context_loading',
  tool_execution: 'tool_execution',
  browser_navigation: 'reading',
  asset_generation: 'asset_generation',
  waiting_external: 'waiting_external',
  verification: 'verification',
  indexing: 'indexing',
  vectorizing: 'indexing',
  publishing: 'deployment',
  complete: 'success',
  failed: 'error',
};

export const RUNTIME_LABELS: Record<AgentSamRuntimeState, string> = {
  idle: 'Ready',
  planning: 'Planning the work',
  retrieving_context: 'Retrieving context',
  tool_execution: 'Running tools',
  browser_navigation: 'Navigating the browser',
  asset_generation: 'Generating assets',
  waiting_external: 'Waiting on an external service',
  verification: 'Verifying results',
  indexing: 'Indexing',
  vectorizing: 'Vectorizing',
  publishing: 'Publishing',
  complete: 'Done',
  failed: 'Failed',
};

const TONES: Record<AgentSamRuntimeState, CompactStatus['tone']> = {
  idle: 'neutral',
  planning: 'active',
  retrieving_context: 'active',
  tool_execution: 'active',
  browser_navigation: 'active',
  asset_generation: 'active',
  waiting_external: 'waiting',
  verification: 'active',
  indexing: 'active',
  vectorizing: 'active',
  publishing: 'active',
  complete: 'success',
  failed: 'error',
};

/** Which state wins when several operations run in parallel. */
const PRIORITY: Record<AgentSamRuntimeState, number> = {
  failed: 100,
  waiting_external: 80,
  publishing: 70,
  tool_execution: 60,
  browser_navigation: 55,
  asset_generation: 50,
  vectorizing: 45,
  indexing: 44,
  verification: 40,
  retrieving_context: 30,
  planning: 20,
  complete: 10,
  idle: 0,
};

export function dominantState(states: AgentSamRuntimeState[]): AgentSamRuntimeState {
  if (states.length === 0) return 'idle';
  return states.reduce((best, next) => (PRIORITY[next] > PRIORITY[best] ? next : best), 'idle' as AgentSamRuntimeState);
}

// ======================================================================
// 4. ANALYTICS PROJECTION
// ======================================================================

/** `agentsam.runtime.v1` analytics projection of a runtime event. */
export interface RuntimeAnalyticsEvent {
  schema: 'agentsam.runtime.v1';
  eventId: string;
  occurredAt: string;
  runId?: string;
  operationId: string;
  parentOperationId?: string;
  state: AgentSamRuntimeState;
  phase: RuntimeEventPhase;
  scope?: RuntimeScope;
  producer: RuntimeProducer;
  durationMs?: number;
  severity: 'normal' | 'warning' | 'error';
  attributes?: Record<string, string | number | boolean>;
}

// ======================================================================
// 5. THE ADAPTER
// ======================================================================

export interface RuntimeProjection {
  state: AgentSamRuntimeState;
  compact: CompactStatus;
  timeline: TimelineEntry[];
  sceneSemantic: LoadingSceneSemanticName;
}

export interface RuntimeEventAdapterOptions {
  /** Called for every accepted event; wire this to the telemetry spool. */
  onAnalytics?: (event: RuntimeAnalyticsEvent) => void;
  /** Called on every projection change; wire this to the loading scene. */
  onProjection?: (projection: RuntimeProjection) => void;
  /** Keep at most N timeline entries. Default 200. */
  timelineLimit?: number;
  now?: () => number;
  idFactory?: () => string;
}

interface OpenOperation {
  entry: TimelineEntry;
}

/**
 * Consumes `RuntimeEvent`s from any producer and projects them into the four
 * renderers. This is the only progress state machine in AgentSam.
 */
export class RuntimeEventAdapter {
  private readonly options: RuntimeEventAdapterOptions;
  private readonly operations = new Map<string, OpenOperation>();
  private readonly entries: TimelineEntry[] = [];
  private listeners = new Set<(projection: RuntimeProjection) => void>();
  private lastTerminal: AgentSamRuntimeState | null = null;

  constructor(options: RuntimeEventAdapterOptions = {}) {
    this.options = options;
  }

  private get now(): number {
    return (this.options.now ?? Date.now)();
  }

  private id(): string {
    return (this.options.idFactory ?? (() => `evt_${Math.random().toString(36).slice(2, 12)}`))();
  }

  handle(event: RuntimeEvent): RuntimeProjection {
    const limit = this.options.timelineLimit ?? 200;
    const existing = this.operations.get(event.operationId);

    if (event.phase === 'started' || (!existing && !isTerminal(event.state))) {
      const entry: TimelineEntry = {
        id: this.id(),
        operationId: event.operationId,
        parentOperationId: event.parentOperationId,
        state: event.state,
        label: event.label ?? RUNTIME_LABELS[event.state],
        detail: event.detail,
        startedAt: event.timestamp,
        status: 'running',
        producer: event.producer ?? 'unknown',
      };
      this.operations.set(event.operationId, { entry });
      this.entries.push(entry);
      while (this.entries.length > limit) this.entries.shift();
    } else if (existing) {
      existing.entry.state = event.state;
      if (event.label) existing.entry.label = event.label;
      if (event.detail) existing.entry.detail = event.detail;
    }

    if (event.phase === 'completed' || event.phase === 'failed' || isTerminal(event.state)) {
      const open = this.operations.get(event.operationId);
      if (open) {
        open.entry.endedAt = event.timestamp;
        open.entry.durationMs = Math.max(0, event.timestamp - open.entry.startedAt);
        open.entry.status = event.phase === 'failed' || event.state === 'failed' ? 'failed' : 'succeeded';
        open.entry.state = event.state;
        this.operations.delete(event.operationId);
      }
      this.lastTerminal = event.state === 'failed' || event.phase === 'failed' ? 'failed' : 'complete';
    }

    const projection = this.project(event);
    this.options.onAnalytics?.(this.toAnalytics(event));
    this.options.onProjection?.(projection);
    for (const listener of this.listeners) listener(projection);
    return projection;
  }

  /** Convenience emitters mirroring the producer side. */
  start(operationId: string, state: AgentSamRuntimeState, label?: string): RuntimeProjection {
    return this.handle(runtimeEvent({ operationId, state, phase: 'started', label, timestamp: this.now }));
  }

  progress(operationId: string, state: AgentSamRuntimeState, label?: string, progress?: number | null): RuntimeProjection {
    return this.handle(runtimeEvent({ operationId, state, phase: 'progress', label, progress, timestamp: this.now }));
  }

  complete(operationId: string, label?: string): RuntimeProjection {
    return this.handle(runtimeEvent({ operationId, state: 'complete', phase: 'completed', label, timestamp: this.now }));
  }

  fail(operationId: string, detail?: string): RuntimeProjection {
    return this.handle(
      runtimeEvent({ operationId, state: 'failed', phase: 'failed', detail, severity: 'error', timestamp: this.now }),
    );
  }

  subscribe(listener: (projection: RuntimeProjection) => void): () => void {
    this.listeners.add(listener);
    listener(this.current());
    return () => {
      this.listeners.delete(listener);
    };
  }

  current(): RuntimeProjection {
    return this.project();
  }

  timeline(): TimelineEntry[] {
    return [...this.entries];
  }

  reset(): void {
    this.operations.clear();
    this.entries.length = 0;
    this.lastTerminal = null;
  }

  private project(event?: RuntimeEvent): RuntimeProjection {
    const openStates = [...this.operations.values()].map((op) => op.entry.state);
    const state: AgentSamRuntimeState =
      openStates.length > 0 ? dominantState(openStates) : (this.lastTerminal ?? 'idle');

    const progress =
      event && typeof event.progress === 'number' && Number.isFinite(event.progress)
        ? Math.min(1, Math.max(0, event.progress))
        : null;

    const activeLabel =
      [...this.operations.values()].find((op) => op.entry.state === state)?.entry.label ??
      event?.label ??
      RUNTIME_LABELS[state];

    return {
      state,
      sceneSemantic: RUNTIME_TO_SCENE[state],
      compact: {
        state,
        tone: TONES[state],
        text: activeLabel,
        progress,
        activeCount: this.operations.size,
      },
      timeline: this.timeline(),
    };
  }

  private toAnalytics(event: RuntimeEvent): RuntimeAnalyticsEvent {
    const entry = this.entries.find((candidate) => candidate.operationId === event.operationId);
    return {
      schema: 'agentsam.runtime.v1',
      eventId: this.id(),
      occurredAt: new Date(event.timestamp).toISOString(),
      runId: event.runId,
      operationId: event.operationId,
      parentOperationId: event.parentOperationId,
      state: event.state,
      phase: event.phase,
      scope: event.scope,
      producer: event.producer ?? 'unknown',
      durationMs: entry?.durationMs,
      severity: event.severity ?? 'normal',
      attributes: event.attributes,
    };
  }
}

// ======================================================================
// 6. LOADING-SCENE BRIDGE (structural, no hard dependency)
// ======================================================================

/** Minimal structural type of the loading-scene controller we rely on. */
export interface LoadingSceneControllerLike {
  start(input: { operationId: string; label?: string; semantic?: LoadingSceneSemanticName }): void;
  activity(input: { operationId?: string; semantic: LoadingSceneSemanticName; label?: string; progress?: number | null }): void;
  complete(operationId: string): void;
  fail(operationId: string, detail?: string): void;
  reset(): void;
}

/**
 * Drive any loading-scene controller from runtime events without the
 * runtime-state package taking a dependency on the renderer.
 */
export function bindLoadingScene(
  adapter: RuntimeEventAdapter,
  controller: LoadingSceneControllerLike,
): () => void {
  const seen = new Set<string>();
  return adapter.subscribe((projection) => {
    const operationId = projection.timeline[projection.timeline.length - 1]?.operationId ?? 'runtime';
    if (projection.state === 'complete') {
      controller.complete(operationId);
      seen.delete(operationId);
      return;
    }
    if (projection.state === 'failed') {
      controller.fail(operationId, projection.compact.text);
      seen.delete(operationId);
      return;
    }
    if (projection.state === 'idle') return;
    if (!seen.has(operationId)) {
      seen.add(operationId);
      controller.start({ operationId, label: projection.compact.text, semantic: projection.sceneSemantic });
      return;
    }
    controller.activity({
      operationId,
      semantic: projection.sceneSemantic,
      label: projection.compact.text,
      progress: projection.compact.progress,
    });
  });
}
