import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RUNTIME_STATES,
  RUNTIME_TO_SCENE,
  RuntimeEventAdapter,
  bindLoadingScene,
  dominantState,
  isTerminal,
  runtimeEvent,
} from '../dist/index.js';

test('the vocabulary is exactly the thirteen agreed states', () => {
  assert.deepEqual([...RUNTIME_STATES], [
    'idle', 'planning', 'retrieving_context', 'tool_execution', 'browser_navigation',
    'asset_generation', 'waiting_external', 'verification', 'indexing', 'vectorizing',
    'publishing', 'complete', 'failed',
  ]);
  for (const state of RUNTIME_STATES) assert.ok(RUNTIME_TO_SCENE[state], `${state} maps to a scene semantic`);
});

test('projection fans one event out to all four renderers', () => {
  const analytics = [];
  const adapter = new RuntimeEventAdapter({ onAnalytics: (event) => analytics.push(event) });
  const projection = adapter.start('op1', 'planning', 'Planning the work');

  assert.equal(projection.state, 'planning');
  assert.equal(projection.compact.tone, 'active');
  assert.equal(projection.compact.text, 'Planning the work');
  assert.equal(projection.sceneSemantic, 'thinking');
  assert.equal(projection.timeline.length, 1);
  assert.equal(analytics[0].schema, 'agentsam.runtime.v1');
});

test('parallel operations resolve to a deterministic dominant state', () => {
  assert.equal(dominantState(['planning', 'tool_execution']), 'tool_execution');
  assert.equal(dominantState(['tool_execution', 'failed']), 'failed');
  assert.equal(dominantState([]), 'idle');
});

test('completion closes the timeline entry with a duration', () => {
  let clock = 1_000;
  const adapter = new RuntimeEventAdapter({ now: () => clock });
  adapter.start('op1', 'indexing');
  clock = 1_250;
  const projection = adapter.complete('op1');
  assert.equal(projection.state, 'complete');
  assert.equal(projection.timeline[0].status, 'succeeded');
  assert.equal(projection.timeline[0].durationMs, 250);
});

test('failures are terminal and surface as error tone', () => {
  const adapter = new RuntimeEventAdapter();
  adapter.start('op1', 'publishing');
  const projection = adapter.fail('op1', 'registry rejected');
  assert.ok(isTerminal(projection.state));
  assert.equal(projection.compact.tone, 'error');
});

test('producers in different languages normalize to the same event', () => {
  const fromGo = runtimeEvent({ operationId: 'o', state: 'verification', producer: 'go', timestamp: 5 });
  const fromRust = runtimeEvent({ operationId: 'o', state: 'verification', producer: 'rust', timestamp: 5 });
  assert.deepEqual({ ...fromGo, producer: null }, { ...fromRust, producer: null });
});

test('loading scenes are driven without the renderer knowing AgentSam', () => {
  const calls = [];
  const controller = {
    start: (input) => calls.push(['start', input.semantic]),
    activity: (input) => calls.push(['activity', input.semantic]),
    complete: () => calls.push(['complete']),
    fail: () => calls.push(['fail']),
    reset: () => calls.push(['reset']),
  };
  const adapter = new RuntimeEventAdapter();
  bindLoadingScene(adapter, controller);
  adapter.start('op1', 'asset_generation');
  adapter.progress('op1', 'asset_generation');
  adapter.complete('op1');
  assert.deepEqual(calls.map((call) => call[0]), ['start', 'activity', 'complete']);
  assert.equal(calls[0][1], 'asset_generation');
});
