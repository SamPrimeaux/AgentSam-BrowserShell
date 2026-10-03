# @inneranimalmedia/agentsam-telemetry

The AgentSam analytics / event ingestion boundary.

```text
device → local spool (durable · batched · retried · deduped) → authenticated Worker gateway → D1 + Basin
```

```ts
const spool = new LocalEventSpool({ storage, transport: createWorkerGatewayTransport({
  endpoint, auth: { kind: 'agentsam-device-token', token: () => getToken() },
}) });

await spool.enqueue(activityEvent({ activity: 'agentsam.proof.completed', outcome: 'succeeded' }));
await spool.flush();
```

**Devices never hold the Basin credential.** `createWorkerGatewayTransport`
throws if constructed with one, and CI boundary rule 4 checks for it.

Schemas: `agentsam.runtime.v1` · `agentsam.activity.v1` · `agentsam.error.v1` ·
`agentsam.capability.v1` · `agentsam.proof.v1`.

See `docs/architecture/ANALYTICS_BOUNDARY.md`. Apache-2.0.
