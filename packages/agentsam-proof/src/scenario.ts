/**
 * @inneranimalmedia/agentsam-proof — the one cross-platform proof.
 *
 *   Launch AgentSam
 *          ↓  identify platform capabilities
 *          ↓  authenticate or use local mode
 *          ↓  open lead conversation
 *          ↓  send prompt
 *          ↓  stream response
 *          ↓  open one artifact
 *          ↓  store local state
 *          ↓  emit AgentSam activity event
 *
 * All four lanes run EXACTLY this scenario. Framework comparison is then
 * evidence, not theory. The scenario lives in a package so no lane can
 * quietly make its own version easier.
 */

import {
  CAPABILITY_IDS,
  capabilityFingerprint,
  type AgentSamPlatform,
  type CapabilityId,
} from '@inneranimalmedia/agentsam-platform';
import {
  RuntimeEventAdapter,
  type AgentSamRuntimeState,
} from '@inneranimalmedia/agentsam-runtime-state';
import {
  activityEvent,
  capabilityEvent,
  type AnyTelemetryEvent,
} from '@inneranimalmedia/agentsam-telemetry';

// ======================================================================
// 1. STEPS
// ======================================================================

export const PROOF_STEPS = [
  'launch',
  'identify_capabilities',
  'authenticate',
  'open_conversation',
  'send_prompt',
  'stream_response',
  'open_artifact',
  'store_local_state',
  'emit_activity_event',
] as const;

export type ProofStep = (typeof PROOF_STEPS)[number];

export const PROOF_STEP_LABELS: Record<ProofStep, string> = {
  launch: 'Launch AgentSam',
  identify_capabilities: 'Identify platform capabilities',
  authenticate: 'Authenticate or use local mode',
  open_conversation: 'Open lead conversation',
  send_prompt: 'Send prompt',
  stream_response: 'Stream response',
  open_artifact: 'Open one artifact',
  store_local_state: 'Store local state',
  emit_activity_event: 'Emit AgentSam activity event',
};

/** Runtime vocabulary each step reports while it runs. */
export const PROOF_STEP_RUNTIME: Record<ProofStep, AgentSamRuntimeState> = {
  launch: 'planning',
  identify_capabilities: 'verification',
  authenticate: 'waiting_external',
  open_conversation: 'retrieving_context',
  send_prompt: 'planning',
  stream_response: 'tool_execution',
  open_artifact: 'asset_generation',
  store_local_state: 'indexing',
  emit_activity_event: 'publishing',
};

export interface ProofStepResult {
  step: ProofStep;
  label: string;
  status: 'passed' | 'skipped' | 'failed';
  durationMs: number;
  /** Short human-checkable evidence string. This is what makes it a proof. */
  evidence: string;
  error?: string;
}

// ======================================================================
// 2. ENVIRONMENT
// ======================================================================

export interface ProofConversationHost {
  /**
   * Real auth where configured, local mode otherwise. Returning
   * `{ mode: 'local' }` is a pass, not a failure — offline is a supported lane.
   */
  authenticate(): Promise<{ mode: 'authenticated' | 'local'; subject?: string }>;
  openLeadConversation(): Promise<{ conversationId: string; title: string }>;
  sendPrompt(input: { conversationId: string; prompt: string }): AsyncIterable<{ delta: string; done?: boolean }>;
  /** Must produce something openable: an artifact id and a renderable body. */
  openArtifact(input: { conversationId: string }): Promise<{ artifactId: string; kind: string; body: string }>;
}

export interface ProofEnvironment {
  platform: AgentSamPlatform;
  runtime?: RuntimeEventAdapter;
  conversation: ProofConversationHost;
  /** Where activity/capability events go. Usually `spool.enqueue`. */
  emit?: (event: AnyTelemetryEvent) => Promise<void> | void;
  prompt?: string;
  /** Key used for the "store local state" step. */
  stateKey?: string;
  appVersion?: string;
  now?: () => number;
}

export interface ProofReport {
  lane: string;
  os: string;
  formFactor: string;
  adapterVersion: string;
  appVersion?: string;
  startedAt: string;
  totalDurationMs: number;
  passed: boolean;
  steps: ProofStepResult[];
  capabilityFingerprint: string;
  usableCapabilities: CapabilityId[];
  streamedCharacters: number;
  artifactId?: string;
  authMode?: 'authenticated' | 'local';
  storage: 'filesystem' | 'secureStore' | 'none';
}

// ======================================================================
// 3. RUNNER
// ======================================================================

export async function runCrossPlatformProof(environment: ProofEnvironment): Promise<ProofReport> {
  const clock = environment.now ?? (() => Date.now());
  const runtime = environment.runtime ?? new RuntimeEventAdapter();
  const startedAtMs = clock();
  const steps: ProofStepResult[] = [];
  const platform = environment.platform;
  const prompt = environment.prompt ?? 'Summarize what this device can do for AgentSam in one sentence.';
  const stateKey = environment.stateKey ?? 'agentsam.proof.lastRun';

  let streamed = '';
  let artifactId: string | undefined;
  let authMode: ProofReport['authMode'];
  let storage: ProofReport['storage'] = 'none';
  let conversationId = '';

  async function step(name: ProofStep, body: () => Promise<string>): Promise<void> {
    const operationId = `proof_${name}`;
    const begin = clock();
    runtime.start(operationId, PROOF_STEP_RUNTIME[name], PROOF_STEP_LABELS[name]);
    try {
      const evidence = await body();
      runtime.complete(operationId, PROOF_STEP_LABELS[name]);
      steps.push({
        step: name,
        label: PROOF_STEP_LABELS[name],
        status: 'passed',
        durationMs: clock() - begin,
        evidence,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      runtime.fail(operationId, message);
      steps.push({
        step: name,
        label: PROOF_STEP_LABELS[name],
        status: 'failed',
        durationMs: clock() - begin,
        evidence: 'step threw',
        error: message,
      });
    }
  }

  // 1. Launch ------------------------------------------------------------
  await step('launch', async () => {
    const identity = platform.identity;
    return `${identity.displayName} (lane=${identity.lane}, os=${identity.os}, adapter=${identity.adapterVersion})`;
  });

  // 2. Identify capabilities --------------------------------------------
  await step('identify_capabilities', async () => {
    const capabilities = await platform.refresh();
    const usable = CAPABILITY_IDS.filter((id) => capabilities[id].status === 'available' || capabilities[id].status === 'degraded');
    await environment.emit?.(
      capabilityEvent(
        {
          fingerprint: capabilityFingerprint(capabilities),
          lane: platform.identity.lane,
          os: platform.identity.os,
          formFactor: platform.identity.formFactor,
          states: Object.fromEntries(CAPABILITY_IDS.map((id) => [id, capabilities[id].status])),
        },
        { lane: platform.identity.lane, appVersion: environment.appVersion, origin: 'mobile' },
      ),
    );
    return `${usable.length}/${CAPABILITY_IDS.length} capabilities usable: ${usable.join(', ') || 'none'}`;
  });

  // 3. Authenticate or local mode ---------------------------------------
  await step('authenticate', async () => {
    const result = await environment.conversation.authenticate();
    authMode = result.mode;
    return result.mode === 'authenticated' ? `authenticated as ${result.subject ?? 'subject'}` : 'local mode (no network identity required)';
  });

  // 4. Open lead conversation -------------------------------------------
  await step('open_conversation', async () => {
    const conversation = await environment.conversation.openLeadConversation();
    conversationId = conversation.conversationId;
    return `conversation ${conversation.conversationId} — "${conversation.title}"`;
  });

  // 5 + 6. Send prompt, stream response ---------------------------------
  await step('send_prompt', async () => `prompt accepted (${prompt.length} chars) for ${conversationId}`);

  await step('stream_response', async () => {
    let chunks = 0;
    for await (const event of environment.conversation.sendPrompt({ conversationId, prompt })) {
      streamed += event.delta;
      chunks += 1;
      if (chunks % 4 === 0) {
        runtime.progress('proof_stream_response', 'tool_execution', 'Streaming response');
      }
      if (event.done) break;
    }
    if (streamed.length === 0) throw new Error('No tokens streamed.');
    return `${chunks} chunks, ${streamed.length} characters streamed`;
  });

  // 7. Open one artifact -------------------------------------------------
  await step('open_artifact', async () => {
    const artifact = await environment.conversation.openArtifact({ conversationId });
    artifactId = artifact.artifactId;
    return `artifact ${artifact.artifactId} (${artifact.kind}, ${artifact.body.length} bytes) opened`;
  });

  // 8. Store local state -------------------------------------------------
  await step('store_local_state', async () => {
    const payload = JSON.stringify({
      conversationId,
      artifactId,
      at: new Date(clock()).toISOString(),
      lane: platform.identity.lane,
    });

    const filesystem = platform.tryUse('filesystem');
    if (filesystem) {
      await filesystem.writeText(`${stateKey}.json`, payload);
      const readBack = await filesystem.readText(`${stateKey}.json`);
      if (readBack !== payload) throw new Error('Filesystem read-back mismatch.');
      storage = 'filesystem';
      return `filesystem round-trip verified (${payload.length} bytes)`;
    }

    const secure = platform.tryUse('secureStore');
    if (secure) {
      await secure.set(stateKey, payload);
      const readBack = await secure.get(stateKey);
      if (readBack !== payload) throw new Error('Secure store read-back mismatch.');
      storage = 'secureStore';
      return `secure store round-trip verified (${payload.length} bytes)`;
    }

    throw new Error('No durable storage capability on this host.');
  });

  // 9. Emit activity event ----------------------------------------------
  await step('emit_activity_event', async () => {
    const event = activityEvent(
      {
        activity: 'agentsam.proof.completed',
        surface: 'proof',
        artifactId,
        outcome: 'succeeded',
        durationMs: clock() - startedAtMs,
        attributes: {
          lane: platform.identity.lane,
          os: platform.identity.os,
          storage,
          streamedCharacters: streamed.length,
          authMode: authMode ?? 'unknown',
        },
      },
      { lane: platform.identity.lane, appVersion: environment.appVersion, origin: 'mobile' },
    );
    await environment.emit?.(event);
    return `agentsam.activity.v1 emitted (${event.eventId})`;
  });

  const capabilities = platform.capabilities;

  return {
    lane: platform.identity.lane,
    os: platform.identity.os,
    formFactor: platform.identity.formFactor,
    adapterVersion: platform.identity.adapterVersion,
    appVersion: environment.appVersion,
    startedAt: new Date(startedAtMs).toISOString(),
    totalDurationMs: clock() - startedAtMs,
    passed: steps.every((entry) => entry.status !== 'failed'),
    steps,
    capabilityFingerprint: capabilityFingerprint(capabilities),
    usableCapabilities: CAPABILITY_IDS.filter(
      (id) => capabilities[id].status === 'available' || capabilities[id].status === 'degraded',
    ),
    streamedCharacters: streamed.length,
    artifactId,
    authMode,
    storage,
  };
}

// ======================================================================
// 4. ZERO-BACKEND HOST (so every lane can run the proof on day one)
// ======================================================================

export interface LocalConversationHostOptions {
  /** Simulated streaming delay per chunk. Default 24ms. */
  chunkDelayMs?: number;
  answer?: string;
}

export function createLocalConversationHost(options: LocalConversationHostOptions = {}): ProofConversationHost {
  const delay = options.chunkDelayMs ?? 24;
  const answer =
    options.answer ??
    'Local mode is live. This device reported its capabilities, opened the lead conversation, and streamed this ' +
      'response without a network round trip. The same scenario runs on every AgentSam lane.';

  return {
    async authenticate() {
      return { mode: 'local' };
    },
    async openLeadConversation() {
      return { conversationId: `conv_local_${Date.now().toString(36)}`, title: 'AgentSam lead conversation' };
    },
    async *sendPrompt() {
      const words = answer.split(' ');
      for (let index = 0; index < words.length; index += 4) {
        if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
        yield { delta: `${words.slice(index, index + 4).join(' ')} ` };
      }
      yield { delta: '', done: true };
    },
    async openArtifact() {
      return {
        artifactId: `artifact_local_${Date.now().toString(36)}`,
        kind: 'report',
        body: '# AgentSam proof artifact\n\nGenerated locally by the cross-platform proof scenario.\n',
      };
    },
  };
}
