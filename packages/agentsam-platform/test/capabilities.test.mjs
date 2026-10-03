import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AgentSamPlatform,
  CAPABILITY_IDS,
  CapabilityUnavailableError,
  capabilityFingerprint,
  createMemoryAdapter,
  isUsable,
  noCapabilities,
  unknownCapabilities,
} from '../dist/index.js';

test('the contract has exactly the twelve portable capabilities', () => {
  assert.deepEqual([...CAPABILITY_IDS], [
    'filesystem', 'camera', 'microphone', 'notifications', 'secureStore', 'share',
    'clipboard', 'network', 'browser', 'terminal', 'localModels', 'backgroundExecution',
  ]);
  const unknown = unknownCapabilities();
  for (const id of CAPABILITY_IDS) {
    assert.equal(unknown[id].id, id);
    assert.equal(unknown[id].status, 'unknown');
  }
});

test('an unprobed platform never reports a capability as denied', () => {
  const states = Object.values(unknownCapabilities());
  assert.ok(states.every((state) => state.status !== 'denied'));
});

test('memory adapter satisfies the adapter contract', async () => {
  const platform = await AgentSamPlatform.create(createMemoryAdapter());
  assert.equal(platform.identity.lane, 'headless');
  assert.equal(platform.report().length, CAPABILITY_IDS.length);
  assert.ok(isUsable(platform.get('filesystem')));
  assert.ok(!platform.has('terminal'));
});

test('use() throws a typed error instead of silently no-oping', async () => {
  const platform = await AgentSamPlatform.create(createMemoryAdapter());
  assert.throws(() => platform.use('terminal'), CapabilityUnavailableError);
  assert.equal(platform.tryUse('terminal'), null);
});

test('filesystem port round-trips through the capability layer', async () => {
  const platform = await AgentSamPlatform.create(createMemoryAdapter());
  const fs = platform.use('filesystem');
  await fs.writeText('notes/a.txt', 'hello');
  assert.equal(await fs.readText('notes/a.txt'), 'hello');
  assert.equal((await fs.list('notes')).length, 1);
  await fs.remove('notes/a.txt');
  assert.equal(await fs.exists('notes/a.txt'), false);
});

test('when() degrades instead of throwing', async () => {
  const platform = await AgentSamPlatform.create(createMemoryAdapter());
  const result = await platform.when('terminal', () => 'ran', () => 'fallback');
  assert.equal(result, 'fallback');
});

test('fingerprints are stable and diffable', () => {
  const a = capabilityFingerprint(noCapabilities('x'));
  const b = capabilityFingerprint(noCapabilities('y'));
  assert.equal(a, b);
  assert.match(a, /^filesystem:unavailable\|/);
});

test('subscribers receive a snapshot on subscribe and on refresh', async () => {
  const platform = await AgentSamPlatform.create(createMemoryAdapter());
  const seen = [];
  const unsubscribe = platform.subscribe((snapshot) => seen.push(snapshot.fingerprint));
  await platform.refresh();
  unsubscribe();
  assert.equal(seen.length, 2);
});
