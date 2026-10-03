import test from 'node:test';
import assert from 'node:assert/strict';
import { AgentSamPlatform, createMemoryAdapter } from '@inneranimalmedia/agentsam-platform';
import { PROOF_STEPS, createLocalConversationHost, renderComparisonMarkdown, renderProofMarkdown, runCrossPlatformProof } from '../dist/index.js';

test('the proof is the same nine steps everywhere', () => {
  assert.deepEqual([...PROOF_STEPS], [
    'launch', 'identify_capabilities', 'authenticate', 'open_conversation',
    'send_prompt', 'stream_response', 'open_artifact', 'store_local_state', 'emit_activity_event',
  ]);
});

test('a host with durable storage passes every step', async () => {
  const emitted = [];
  const report = await runCrossPlatformProof({
    platform: await AgentSamPlatform.create(createMemoryAdapter()),
    conversation: createLocalConversationHost({ chunkDelayMs: 0 }),
    emit: (event) => emitted.push(event),
  });

  assert.equal(report.passed, true);
  assert.equal(report.steps.length, 9);
  assert.equal(report.storage, 'filesystem');
  assert.ok(report.streamedCharacters > 0);
  assert.ok(report.artifactId);
  assert.deepEqual(emitted.map((event) => event.schema), ['agentsam.capability.v1', 'agentsam.activity.v1']);
});

test('a host with no storage fails honestly rather than reporting success', async () => {
  const adapter = createMemoryAdapter();
  const platform = await AgentSamPlatform.create({
    ...adapter,
    probe: async () => {
      const capabilities = await adapter.probe();
      return {
        ...capabilities,
        filesystem: { ...capabilities.filesystem, status: 'unavailable' },
        secureStore: { ...capabilities.secureStore, status: 'unavailable' },
      };
    },
  });

  const report = await runCrossPlatformProof({ platform, conversation: createLocalConversationHost({ chunkDelayMs: 0 }) });
  assert.equal(report.passed, false);
  assert.equal(report.steps.find((step) => step.step === 'store_local_state').status, 'failed');
});

test('comparison output refuses to pick a winner', () => {
  const markdown = renderComparisonMarkdown([
    { metrics: { lane: 'web', startupMs: 420 } },
    { metrics: { lane: 'tauri', startupMs: 310 } },
  ]);
  assert.match(markdown, /No winner is declared/);
  assert.match(markdown, /\| web \| tauri \|/);
});

test('a proof report renders a reviewable receipt', async () => {
  const report = await runCrossPlatformProof({
    platform: await AgentSamPlatform.create(createMemoryAdapter()),
    conversation: createLocalConversationHost({ chunkDelayMs: 0 }),
  });
  const markdown = renderProofMarkdown(report);
  assert.match(markdown, /PASSED/);
  assert.match(markdown, /Emit AgentSam activity event/);
});
