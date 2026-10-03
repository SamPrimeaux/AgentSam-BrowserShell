/**
 * @inneranimalmedia/agentsam-contracts
 * Framework-neutral shared AgentSam vocabulary and contracts
 */

// ======================================================================
// 1. AGENT MESSAGES & THREADS
// ======================================================================

export type MessageRole = 'system' | 'user' | 'assistant' | 'tool';

export interface MessageContentPart {
  type: 'text' | 'image' | 'audio' | 'tool_call' | 'tool_result' | 'artifact_ref';
  text?: string;
  dataUrl?: string;
  mimeType?: string;
  toolCallId?: string;
  toolName?: string;
  toolArgs?: Record<string, unknown>;
  toolResult?: unknown;
  artifactId?: string;
}

export interface AgentMessage {
  id: string;
  role: MessageRole;
  content: string | MessageContentPart[];
  timestamp: string;
  name?: string;
  model?: string;
  runId?: string;
  tokens?: {
    input?: number;
    output?: number;
    thinking?: number;
  };
  metadata?: Record<string, unknown>;
}

// ======================================================================
// 2. ARTIFACTS & MANIFESTS
// ======================================================================

export type ArtifactKind =
  | 'foundation'
  | 'runtime'
  | 'ui'
  | 'app'
  | 'theme'
  | 'brand'
  | 'prebuild'
  | 'code'
  | 'report'
  | 'diagram';

export type ArtifactStatus =
  | 'stable'
  | 'working'
  | 'candidate'
  | 'experimental'
  | 'deprecated';

export interface InnerAnimalArtifactManifest {
  schema: 'inneranimal.artifact.v1';
  id: string;
  name: string;
  package?: {
    name: string;
    version: string;
  };
  kind: ArtifactKind;
  family?: string;
  summary: string;
  status: ArtifactStatus;
  visual?: {
    brandPack?: string;
    theme?: string;
    specimen?: string;
    modes?: Array<'dark' | 'light' | 'system'>;
  };
  capabilities?: string[];
  source?: {
    repository?: string;
    path?: string;
  };
  consumers?: string[];
  related?: string[];
  preview?: {
    kind: 'theme' | 'application' | 'package' | 'component' | 'none';
    fixture?: string;
    route?: string;
  };
}

// ======================================================================
// 3. TOOL CALLS & TOOL RECEIPTS
// ======================================================================

export interface ToolCall {
  id: string;
  tool: string;
  parameters: Record<string, unknown>;
  timestamp: string;
  requiredPermission?: 'read' | 'write' | 'terminal' | 'network' | 'none';
}

export interface ToolReceipt {
  callId: string;
  tool: string;
  success: boolean;
  exitCode?: number;
  stdout?: string;
  stderr?: string;
  data?: unknown;
  durationMs: number;
  timestamp: string;
  verified: boolean;
  artifactsCreated?: string[];
}

export interface ToolPermissionRequest {
  id: string;
  tool: string;
  parameters: Record<string, unknown>;
  reason: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  requestedAt: string;
  status: 'pending' | 'approved' | 'rejected';
}

// ======================================================================
// 4. UNIFIED MODEL INVENTORY & HEALTH
// ======================================================================

export type ModelProvider =
  | 'google'
  | 'openai'
  | 'anthropic'
  | 'cursor'
  | 'xai'
  | 'cloudflare'
  | 'local_ollama'
  | 'custom_byok';

export type ModelStatusState =
  | 'configured'
  | 'discovered'
  | 'verified'
  | 'available'
  | 'runnable'
  | 'selected';

export interface ModelPricing {
  inputPerMillion: number;
  outputPerMillion: number;
  thinkingPerMillion?: number;
  cachedInputPerMillion?: number;
  currency: string;
  lastUpdated: string;
}

export interface ModelOption {
  id: string;
  name: string;
  provider: ModelProvider;
  contextWindow: number;
  maxOutputTokens: number;
  supportsStreaming: boolean;
  supportsTools: boolean;
  supportsVision: boolean;
  supportsThinking: boolean;
  pricing: ModelPricing;
  status: ModelStatusState;
  health: {
    requestHealth: 'healthy' | 'degraded' | 'failing' | 'unknown';
    billingHealth: 'good_standing' | 'quota_warning' | 'exhausted' | 'unconfigured';
    p50LatencyMs: number;
    p95LatencyMs: number;
    errorRate: number;
    lastSuccess?: string;
    lastFailure?: string;
  };
  credentialSource: string;
  isDefault?: boolean;
}

// ======================================================================
// 5. OBSERVABILITY & RUN EXPLORER
// ======================================================================

export type ObservabilityCategory =
  | 'run'
  | 'model_call'
  | 'tool_call'
  | 'error'
  | 'provider'
  | 'runtime'
  | 'machine_intent';

export interface ObservabilityEvent {
  id: string;
  timestamp: string;
  category: ObservabilityCategory;
  runId?: string;
  provider?: ModelProvider;
  model?: string;
  status: 'success' | 'error' | 'warning' | 'info';
  durationMs?: number;
  inputTokens?: number;
  outputTokens?: number;
  thinkingTokens?: number;
  cachedTokens?: number;
  estimatedCostUsd?: number;
  message: string;
  metadata?: Record<string, unknown>;
  redacted: boolean;
}

export interface AgentRunSummary {
  id: string;
  goal: string;
  sourceClient: 'local_studio' | 'cli' | 'web_browser' | 'acp_daemon';
  createdAt: string;
  durationMs: number;
  status: 'running' | 'completed' | 'failed' | 'aborted';
  modelUsed?: string;
  modelCallsCount: number;
  toolCallsCount: number;
  machineResolvedCount: number;
  totalTokens: {
    input: number;
    output: number;
    thinking: number;
    cached: number;
  };
  totalCostUsd: number;
  avoidedContextBytes?: number;
  cacheSavingsUsd?: number;
  timeline: Array<{
    step: number;
    type: 'machine_intent' | 'model_call' | 'tool_call' | 'receipt' | 'completion';
    title: string;
    durationMs: number;
    tokens?: number;
    cost?: number;
  }>;
}

// ======================================================================
// 6. EVALUATION, GOALS, & INVARIANT GATES
// ======================================================================

export interface Observation {
  key: string;
  value: boolean | number | string;
  source: string;
  observedAt: string;
  confidence: number;
  evidence?: string[];
}

export interface Criterion {
  fact: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte';
  target: unknown;
  kind: 'gate' | 'metric';
  weight?: number;
}

export interface Goal {
  id: string;
  label: string;
  weight: number;
  value: number;
  threshold: number;
  requirements: Criterion[];
}

export interface GoalEvaluation {
  goalId: string;
  satisfied: boolean;
  blocked: boolean;
  score: number; // 0..1
  points: number; // score * value
  maxPoints: number;
  gates: Record<string, boolean>;
  metrics: Record<string, number | string | boolean>;
  rewardDelta: number;
  observations: Observation[];
}

// ======================================================================
// 7. HOST CAPABILITIES (DESKTOP VS WEB)
// ======================================================================

export interface HostCapabilities {
  platform: 'desktop' | 'web' | 'headless';
  hasLocalPty: boolean;
  hasNativeKeychain: boolean;
  hasLocalSqlite: boolean;
  hasDirectFilesystem: boolean;
  hasRemoteDaemon: boolean;
  hasOAuthBrowserFlow: boolean;
  supportedRuntimes: string[];
}
