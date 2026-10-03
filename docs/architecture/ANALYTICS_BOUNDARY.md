# Analytics / event ingestion boundary

## Hosted path

```text
Go / Rust / Python producer
        │
        │ AgentSam service identity
        ▼
TypeScript ingestion Worker
        ├── validate
        ├── normalize
        ├── authorize
        ├── D1 hot projection
        └── Basin binding
```

## Local / desktop / mobile path

```text
Rust / Go / CLI / Node
        ▼
agentsamd local event spool
        ├── durable local queue
        ├── batching
        ├── retry/backoff
        └── dedupe/event IDs
        ▼
authenticated Worker gateway
        ├── D1
        └── Basin
```

**Desktop and mobile never get the Basin credential.** This is enforced three
ways: typed in `DEVICE_CREDENTIAL_POLICY`, asserted at construction time by
`createWorkerGatewayTransport`, and checked in CI by boundary rule 4.

| Allowed on device | Forbidden on device |
| --- | --- |
| `agentsam-device-token` | `basin-credential` |
| `agentsam-session-jwt` | `d1-binding`, `cloudflare-api-token`, `service-account-json`, `analytics-write-key` |

Rationale: a device that can write to Basin directly is an unbounded blast
radius and cannot be revoked per-install.

## Envelope

Every event on every path shares one envelope; only `body` is schema-specific.

```ts
interface TelemetryEnvelope<TBody> {
  schema: 'agentsam.runtime.v1' | 'agentsam.activity.v1' | 'agentsam.error.v1'
        | 'agentsam.capability.v1' | 'agentsam.proof.v1';
  eventId: string;          // stable across retries — this is the dedupe key
  occurredAt: string; receivedAt?: string;
  origin: 'hosted' | 'desktop' | 'mobile' | 'cli' | 'worker' | 'browser';
  producer: 'typescript' | 'go' | 'rust' | 'python';
  workspaceId?: string;     // tenant, never a raw user id
  installationId?: string;  // pseudonymous, rotatable, never PII
  sessionId?: string; runId?: string; appVersion?: string; lane?: string;
  body: TBody;
}
```

## Spool semantics

`LocalEventSpool` is storage-agnostic on purpose: SQLite for `agentsamd`,
OPFS/IndexedDB for the PWA lane, Preferences for Capacitor, FileSystem for
Expo, Rust fs for Tauri. One semantic, four storages.

- **batching** — `batchSize`, default 50
- **retry/backoff** — exponential with ±10% jitter, capped, `maxAttempts`
- **dedupe** — by `eventId`, in-process and in storage
- **drop discipline** — `400` is permanent (drop + report); `429`/`5xx`/network
  is transient (retry); `401`/`403` is a credential problem, never a silent drop

## Worker responsibilities

`INGESTION_PIPELINE = ['validate','normalize','authorize','project-d1','bind-basin']`

The order is fixed and typed so the device and the Worker cannot drift. The
Worker is the only component that holds D1 and Basin bindings.
