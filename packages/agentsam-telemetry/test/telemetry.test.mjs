import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEVICE_CREDENTIAL_POLICY,
  INGESTION_PIPELINE,
  LocalEventSpool,
  activityEvent,
  assertDeviceCredentialAllowed,
  createMemorySpoolStorage,
  createWorkerGatewayTransport,
} from '../dist/index.js';

const event = (id) => ({ ...activityEvent({ activity: 'test' }), eventId: id });

test('devices may never hold hosted ingestion credentials', () => {
  assert.throws(() => assertDeviceCredentialAllowed('basin-credential'), /never exist on a device/);
  assert.doesNotThrow(() => assertDeviceCredentialAllowed('agentsam-device-token'));
  assert.ok(DEVICE_CREDENTIAL_POLICY.forbiddenOnDevice.includes('d1-binding'));
});

test('the ingestion pipeline order is fixed', () => {
  assert.deepEqual([...INGESTION_PIPELINE], ['validate', 'normalize', 'authorize', 'project-d1', 'bind-basin']);
});

test('spool dedupes by event id', async () => {
  const storage = createMemorySpoolStorage();
  const spool = new LocalEventSpool({ storage, transport: { send: async () => ({ accepted: [] }) } });
  assert.equal(await spool.enqueue([event('a'), event('b')]), 2);
  assert.equal(await spool.enqueue(event('a')), 0);
  assert.equal(await storage.count(), 2);
});

test('accepted batches are removed, transient failures are retried with backoff', async () => {
  const storage = createMemorySpoolStorage();
  let attempt = 0;
  let clock = 0;
  const spool = new LocalEventSpool({
    storage,
    now: () => clock,
    baseBackoffMs: 100,
    transport: {
      send: async (batch) => {
        attempt += 1;
        if (attempt === 1) throw new Error('offline');
        return { accepted: batch.map((entry) => entry.eventId) };
      },
    },
  });

  await spool.enqueue([event('a')]);
  const first = await spool.flush();
  assert.equal(first.sent, 0);
  assert.equal(first.retried, 1);
  assert.equal(await storage.count(), 1);

  clock = 10_000;
  const second = await spool.flush();
  assert.equal(second.sent, 1);
  assert.equal(await storage.count(), 0);
});

test('permanently rejected events are dropped, not retried forever', async () => {
  const storage = createMemorySpoolStorage();
  const dropped = [];
  const spool = new LocalEventSpool({
    storage,
    onDropped: (record, reason) => dropped.push(reason),
    transport: { send: async (batch) => ({ accepted: [], rejected: batch.map((e) => ({ eventId: e.eventId, reason: 'schema' })) }) },
  });
  await spool.enqueue(event('bad'));
  const report = await spool.flush();
  assert.equal(report.dropped, 1);
  assert.equal(await storage.count(), 0);
  assert.deepEqual(dropped, ['schema']);
});

test('gateway transport refuses to be constructed with a hosted credential', () => {
  assert.throws(
    () => createWorkerGatewayTransport({ endpoint: 'https://x', auth: { kind: 'basin-credential', token: async () => 't' } }),
    /never exist on a device/,
  );
});

test('gateway transport maps HTTP semantics onto spool semantics', async () => {
  const transport = createWorkerGatewayTransport({
    endpoint: 'https://ingest.example/events',
    auth: { kind: 'agentsam-device-token', token: async () => 'tok' },
    fetchImpl: async (_input, init) => {
      assert.equal(init.headers.authorization, 'Bearer tok');
      return { status: 200, body: JSON.stringify({ accepted: ['a'] }) };
    },
  });
  assert.deepEqual(await transport.send([event('a')]), { accepted: ['a'], rejected: undefined, retry: undefined });

  const failing = createWorkerGatewayTransport({
    endpoint: 'https://ingest.example/events',
    auth: { kind: 'agentsam-device-token', token: async () => 'tok' },
    fetchImpl: async () => ({ status: 503, body: '' }),
  });
  await assert.rejects(() => failing.send([event('a')]), /transient/);
});
