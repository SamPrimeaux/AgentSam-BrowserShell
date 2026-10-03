/**
 * @inneranimalmedia/agentsam-telemetry
 *
 * The analytics / event ingestion boundary.
 *
 *   HOSTED
 *   Go / Rust / Python producer
 *           │  AgentSam service identity
 *           ▼
 *   TypeScript ingestion Worker
 *           ├── validate
 *           ├── normalize
 *           ├── authorize
 *           ├── D1 hot projection
 *           └── Basin binding
 *
 *   LOCAL / DESKTOP / MOBILE
 *   Rust / Go / CLI / Node
 *           ▼
 *   agentsamd local event spool  (durable queue, batching, retry, dedupe)
 *           ▼
 *   authenticated Worker gateway
 *           ├── D1
 *           └── Basin
 *
 * HARD RULE: desktop and mobile never hold the Basin credential. The only
 * credential a device may hold is a short-lived AgentSam device token that
 * the Worker gateway accepts. See `DEVICE_CREDENTIAL_POLICY`.
 */

// ======================================================================
// 1. EVENT ENVELOPES
// ======================================================================

export type TelemetrySchema =
  | 'agentsam.runtime.v1'
  | 'agentsam.activity.v1'
  | 'agentsam.error.v1'
  | 'agentsam.capability.v1'
  | 'agentsam.proof.v1';

export type EventOrigin = 'hosted' | 'desktop' | 'mobile' | 'cli' | 'worker' | 'browser';

export type ProducerLanguage = 'typescript' | 'go' | 'rust' | 'python' | 'unknown';

/**
 * Every event on every path uses this envelope. The body is schema-specific.
 * `eventId` is the dedupe key: producers must make it stable across retries.
 */
export interface TelemetryEnvelope<TBody = unknown> {
  schema: TelemetrySchema;
  eventId: string;
  occurredAt: string;
  receivedAt?: string;
  origin: EventOrigin;
  producer: ProducerLanguage;
  /** Logical tenant / workspace. Never a raw user identifier. */
  workspaceId?: string;
  /** Pseudonymous installation id. Rotatable, never PII. */
  installationId?: string;
  sessionId?: string;
  runId?: string;
  /** Release train of the emitting surface, e.g. '2.6.11'. */
  appVersion?: string;
  /** Which lane emitted it: web | capacitor | expo | tauri | desktop | headless. */
  lane?: string;
  body: TBody;
}

export interface ActivityEventBody {
  activity: string;
  subject?: string;
  surface?: 'conversation' | 'browser' | 'coworker' | 'settings' | 'proof' | 'artifact';
  artifactId?: string;
  outcome?: 'started' | 'succeeded' | 'failed' | 'cancelled';
  durationMs?: number;
  attributes?: Record<string, string | number | boolean>;
}

export interface ErrorEventBody {
  code: string;
  message: string;
  /** Redacted by the producer. The Worker re-validates. */
  stack?: string;
  fatal?: boolean;
  attributes?: Record<string, string | number | boolean>;
}

export interface CapabilityEventBody {
  /** `capabilityFingerprint()` from @inneranimalmedia/agentsam-platform. */
  fingerprint: string;
  lane: string;
  os: string;
  formFactor: string;
  states: Record<string, string>;
}

export type AnyTelemetryEvent =
  | TelemetryEnvelope<ActivityEventBody>
  | TelemetryEnvelope<ErrorEventBody>
  | TelemetryEnvelope<CapabilityEventBody>
  | TelemetryEnvelope<Record<string, unknown>>;

// ======================================================================
// 2. CREDENTIAL POLICY (architectural rule, enforced in review + CI)
// ======================================================================

export const DEVICE_CREDENTIAL_POLICY = {
  allowedOnDevice: ['agentsam-device-token', 'agentsam-session-jwt'] as const,
  forbiddenOnDevice: [
    'basin-credential',
    'd1-binding',
    'cloudflare-api-token',
    'service-account-json',
    'analytics-write-key',
  ] as const,
  rationale:
    'Devices authenticate to the AgentSam Worker gateway. The gateway owns Basin and D1. ' +
    'A device that can write to Basin directly is an unbounded blast radius and cannot be revoked per-install.',
} as const;

export type AllowedDeviceCredential = (typeof DEVICE_CREDENTIAL_POLICY.allowedOnDevice)[number];

export function assertDeviceCredentialAllowed(name: string): void {
  if ((DEVICE_CREDENTIAL_POLICY.forbiddenOnDevice as readonly string[]).includes(name)) {
    throw new Error(
      `Credential "${name}" must never exist on a device. ${DEVICE_CREDENTIAL_POLICY.rationale}`,
    );
  }
}

// ======================================================================
// 3. LOCAL SPOOL (agentsamd)
// ======================================================================

/**
 * Durable storage behind the spool. Implementations: SQLite (agentsamd),
 * OPFS/IndexedDB (PWA), Capacitor Preferences, Expo FileSystem, Tauri fs.
 * It is intentionally a 4-method interface so every lane can satisfy it.
 */
export interface SpoolStorage {
  append(records: SpoolRecord[]): Promise<void>;
  /** Oldest-first batch, excluding records whose `notBefore` is in the future. */
  peek(limit: number, nowMs: number): Promise<SpoolRecord[]>;
  /** Permanently remove delivered records. */
  remove(eventIds: string[]): Promise<void>;
  /** Persist updated attempt counters / backoff. */
  update(records: SpoolRecord[]): Promise<void>;
  count?(): Promise<number>;
}

export interface SpoolRecord {
  eventId: string;
  envelope: AnyTelemetryEvent;
  enqueuedAt: number;
  attempts: number;
  notBefore: number;
  lastError?: string;
}

export interface SpoolTransport {
  /** Resolve on durable acceptance. Reject to trigger retry/backoff. */
  send(batch: AnyTelemetryEvent[]): Promise<SpoolSendResult>;
}

export interface SpoolSendResult {
  accepted: string[];
  /** Permanently rejected (bad schema, unauthorized tenant) — drop, do not retry. */
  rejected?: Array<{ eventId: string; reason: string }>;
  /** Transient failures — keep and retry. */
  retry?: string[];
}

export interface SpoolOptions {
  storage: SpoolStorage;
  transport: SpoolTransport;
  /** Max events per flush. Default 50. */
  batchSize?: number;
  /** Base retry delay in ms. Default 1000. Exponential with jitter. */
  baseBackoffMs?: number;
  maxBackoffMs?: number;
  /** Drop after this many attempts. Default 12 (~hours with backoff). */
  maxAttempts?: number;
  now?: () => number;
  onDropped?: (record: SpoolRecord, reason: string) => void;
}

export interface FlushReport {
  sent: number;
  retried: number;
  dropped: number;
  remaining: number | null;
}

/**
 * Durable local queue with batching, exponential backoff + jitter, and
 * dedupe by eventId. Storage is pluggable so Rust (via IPC), Node, and
 * every mobile lane share one semantic.
 */
export class LocalEventSpool {
  private readonly options: Required<Omit<SpoolOptions, 'onDropped'>> & Pick<SpoolOptions, 'onDropped'>;
  private readonly seen = new Set<string>();
  private flushing = false;

  constructor(options: SpoolOptions) {
    this.options = {
      batchSize: 50,
      baseBackoffMs: 1000,
      maxBackoffMs: 5 * 60_000,
      maxAttempts: 12,
      now: () => Date.now(),
      ...options,
    };
  }

  /** Enqueue. Duplicate eventIds within this process are ignored. */
  async enqueue(events: AnyTelemetryEvent | AnyTelemetryEvent[]): Promise<number> {
    const list = Array.isArray(events) ? events : [events];
    const fresh = list.filter((event) => {
      if (this.seen.has(event.eventId)) return false;
      this.seen.add(event.eventId);
      return true;
    });
    if (fresh.length === 0) return 0;
    const nowMs = this.options.now();
    await this.options.storage.append(
      fresh.map((envelope) => ({
        eventId: envelope.eventId,
        envelope,
        enqueuedAt: nowMs,
        attempts: 0,
        notBefore: nowMs,
      })),
    );
    return fresh.length;
  }

  /** Attempt one batch. Safe to call on a timer, on foreground, or on network-up. */
  async flush(): Promise<FlushReport> {
    if (this.flushing) return { sent: 0, retried: 0, dropped: 0, remaining: null };
    this.flushing = true;
    try {
      const nowMs = this.options.now();
      const batch = await this.options.storage.peek(this.options.batchSize, nowMs);
      if (batch.length === 0) {
        return { sent: 0, retried: 0, dropped: 0, remaining: (await this.options.storage.count?.()) ?? null };
      }

      let result: SpoolSendResult;
      try {
        result = await this.options.transport.send(batch.map((record) => record.envelope));
      } catch (error) {
        result = { accepted: [], retry: batch.map((record) => record.eventId) };
        for (const record of batch) {
          record.lastError = error instanceof Error ? error.message : String(error);
        }
      }

      const accepted = new Set(result.accepted);
      const rejected = new Map((result.rejected ?? []).map((entry) => [entry.eventId, entry.reason]));
      const deliverable = [...accepted];
      const dropped: SpoolRecord[] = [];
      const retried: SpoolRecord[] = [];

      for (const record of batch) {
        if (accepted.has(record.eventId)) continue;
        if (rejected.has(record.eventId)) {
          dropped.push(record);
          this.options.onDropped?.(record, rejected.get(record.eventId) ?? 'rejected');
          continue;
        }
        record.attempts += 1;
        if (record.attempts >= this.options.maxAttempts) {
          dropped.push(record);
          this.options.onDropped?.(record, 'max-attempts');
          continue;
        }
        record.notBefore = nowMs + this.backoff(record.attempts);
        retried.push(record);
      }

      const removable = [...deliverable, ...dropped.map((record) => record.eventId)];
      if (removable.length > 0) await this.options.storage.remove(removable);
      if (retried.length > 0) await this.options.storage.update(retried);

      return {
        sent: deliverable.length,
        retried: retried.length,
        dropped: dropped.length,
        remaining: (await this.options.storage.count?.()) ?? null,
      };
    } finally {
      this.flushing = false;
    }
  }

  /** Flush until the queue is empty or no progress is made. */
  async drain(maxRounds = 20): Promise<FlushReport> {
    const total: FlushReport = { sent: 0, retried: 0, dropped: 0, remaining: null };
    for (let round = 0; round < maxRounds; round += 1) {
      const report = await this.flush();
      total.sent += report.sent;
      total.retried += report.retried;
      total.dropped += report.dropped;
      total.remaining = report.remaining;
      if (report.sent === 0 && report.dropped === 0) break;
    }
    return total;
  }

  private backoff(attempt: number): number {
    const exponential = this.options.baseBackoffMs * 2 ** (attempt - 1);
    const capped = Math.min(this.options.maxBackoffMs, exponential);
    const jitter = capped * 0.2 * Math.random();
    return Math.round(capped - capped * 0.1 + jitter);
  }
}

/** Reference in-memory storage. Real lanes swap in SQLite / OPFS / native fs. */
export function createMemorySpoolStorage(): SpoolStorage & { all(): SpoolRecord[] } {
  let records: SpoolRecord[] = [];
  return {
    all: () => [...records],
    async append(incoming) {
      const existing = new Set(records.map((record) => record.eventId));
      records.push(...incoming.filter((record) => !existing.has(record.eventId)));
    },
    async peek(limit, nowMs) {
      return records.filter((record) => record.notBefore <= nowMs).slice(0, limit);
    },
    async remove(eventIds) {
      const drop = new Set(eventIds);
      records = records.filter((record) => !drop.has(record.eventId));
    },
    async update(updated) {
      const byId = new Map(updated.map((record) => [record.eventId, record]));
      records = records.map((record) => byId.get(record.eventId) ?? record);
    },
    async count() {
      return records.length;
    },
  };
}

// ======================================================================
// 4. AUTHENTICATED WORKER GATEWAY CLIENT
// ======================================================================

export interface GatewayAuth {
  /** Short-lived device/session token. Never a Basin or D1 credential. */
  token(): Promise<string>;
  /** Credential kind, validated against DEVICE_CREDENTIAL_POLICY. */
  kind: AllowedDeviceCredential;
}

export interface GatewayClientOptions {
  endpoint: string;
  auth: GatewayAuth;
  fetchImpl?: (input: string, init: { method: string; headers: Record<string, string>; body: string }) => Promise<{
    status: number;
    body: string;
  }>;
  /** Added to every request for server-side routing and quota. */
  headers?: Record<string, string>;
}

/**
 * Transport that talks to the TypeScript ingestion Worker. The Worker — not
 * the device — performs validate / normalize / authorize / D1 / Basin.
 */
export function createWorkerGatewayTransport(options: GatewayClientOptions): SpoolTransport {
  assertDeviceCredentialAllowed(options.auth.kind);
  const doFetch =
    options.fetchImpl ??
    (async (input, init) => {
      const response = await fetch(input, init);
      return { status: response.status, body: await response.text() };
    });

  return {
    async send(batch) {
      const token = await options.auth.token();
      const response = await doFetch(options.endpoint, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${token}`,
          'x-agentsam-batch-size': String(batch.length),
          ...options.headers,
        },
        body: JSON.stringify({ events: batch }),
      });

      if (response.status === 401 || response.status === 403) {
        throw new Error(`Gateway rejected credentials (${response.status}).`);
      }
      if (response.status >= 500 || response.status === 429) {
        throw new Error(`Gateway transient failure (${response.status}).`);
      }
      if (response.status === 400) {
        return { accepted: [], rejected: batch.map((event) => ({ eventId: event.eventId, reason: 'schema' })) };
      }

      try {
        const parsed = JSON.parse(response.body) as Partial<SpoolSendResult>;
        return {
          accepted: parsed.accepted ?? batch.map((event) => event.eventId),
          rejected: parsed.rejected,
          retry: parsed.retry,
        };
      } catch {
        return { accepted: batch.map((event) => event.eventId) };
      }
    },
  };
}

// ======================================================================
// 5. INGESTION WORKER CONTRACT (hosted side, typed here so both agree)
// ======================================================================

export interface IngestionRequest {
  events: AnyTelemetryEvent[];
}

export interface IngestionResponse {
  accepted: string[];
  rejected: Array<{ eventId: string; reason: string }>;
  retry: string[];
}

export interface IngestionStage<TIn, TOut> {
  name: 'validate' | 'normalize' | 'authorize' | 'project-d1' | 'bind-basin';
  run(input: TIn): Promise<TOut>;
}

/** The fixed pipeline order the Worker must implement. */
export const INGESTION_PIPELINE = ['validate', 'normalize', 'authorize', 'project-d1', 'bind-basin'] as const;

export type IngestionStageName = (typeof INGESTION_PIPELINE)[number];

// ======================================================================
// 6. HELPERS
// ======================================================================

let counter = 0;

export function telemetryEventId(prefix = 'evt'): string {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}_${counter.toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function envelope<TBody>(
  schema: TelemetrySchema,
  body: TBody,
  context: Partial<Omit<TelemetryEnvelope<TBody>, 'schema' | 'body'>> = {},
): TelemetryEnvelope<TBody> {
  return {
    schema,
    eventId: context.eventId ?? telemetryEventId(),
    occurredAt: context.occurredAt ?? new Date().toISOString(),
    origin: context.origin ?? 'mobile',
    producer: context.producer ?? 'typescript',
    workspaceId: context.workspaceId,
    installationId: context.installationId,
    sessionId: context.sessionId,
    runId: context.runId,
    appVersion: context.appVersion,
    lane: context.lane,
    body,
  };
}

export function activityEvent(
  body: ActivityEventBody,
  context?: Partial<Omit<TelemetryEnvelope<ActivityEventBody>, 'schema' | 'body'>>,
): TelemetryEnvelope<ActivityEventBody> {
  return envelope('agentsam.activity.v1', body, context);
}

export function errorEvent(
  body: ErrorEventBody,
  context?: Partial<Omit<TelemetryEnvelope<ErrorEventBody>, 'schema' | 'body'>>,
): TelemetryEnvelope<ErrorEventBody> {
  return envelope('agentsam.error.v1', body, context);
}

export function capabilityEvent(
  body: CapabilityEventBody,
  context?: Partial<Omit<TelemetryEnvelope<CapabilityEventBody>, 'schema' | 'body'>>,
): TelemetryEnvelope<CapabilityEventBody> {
  return envelope('agentsam.capability.v1', body, context);
}
