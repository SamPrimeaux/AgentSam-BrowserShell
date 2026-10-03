export type BackendType = 'antigravity' | 'cloudflare' | 'local_pty' | 'gcp_vm';

export interface BackendSpecs {
  name: string;
  tagline: string;
  cpu: string;
  ram: string;
  disk: string;
  provisionTimeMs: number;
  computeCostPerHour: number;
  freeTierNote: string;
  networkPolicy: 'Strict Allowlist' | 'Custom Cloudflare Gateway' | 'Unrestricted Local' | 'VPC Firewall';
  allowlist: string[];
}

export const BACKEND_CONFIGS: Record<BackendType, BackendSpecs> = {
  antigravity: {
    name: 'Google Antigravity (Managed)',
    tagline: 'Managed remote sandbox execution environment',
    cpu: '1.0 vCPU (Burst up to 4.0)',
    ram: '4.0 GiB RAM',
    disk: '16 GB Ephemeral NVMe',
    provisionTimeMs: 1800,
    computeCostPerHour: 0.0,
    freeTierNote: '$0.00 compute during preview (billed for Gemini tokens)',
    networkPolicy: 'Strict Allowlist',
    allowlist: [
      'files.pythonhosted.org',
      'pypi.org',
      'registry.npmjs.org',
      'github.com',
      'generativelanguage.googleapis.com',
      'esm.sh',
      'cdn.tailwindcss.com'
    ],
  },
  cloudflare: {
    name: 'Cloudflare Containers (Basic)',
    tagline: 'Workers Paid sovereign micro-container lane',
    cpu: '¼ vCPU',
    ram: '1.0 GiB RAM',
    disk: '4 GB Disk',
    provisionTimeMs: 3200,
    computeCostPerHour: 0.028,
    freeTierNote: 'Includes 25 GiB-hrs memory, 375 vCPU-mins, 200 GB-hrs disk on $5/mo plan',
    networkPolicy: 'Custom Cloudflare Gateway',
    allowlist: [
      'api.cloudflare.com',
      'registry.npmjs.org',
      'github.com',
      'files.pythonhosted.org',
      'pypi.org'
    ],
  },
  local_pty: {
    name: 'Local Mac / localpty',
    tagline: 'Direct hardware loop with zero cloud compute costs',
    cpu: 'Apple Silicon (M-Series)',
    ram: '16–64 GiB Unified',
    disk: 'Local APFS SSD',
    provisionTimeMs: 120,
    computeCostPerHour: 0.0,
    freeTierNote: 'Free hardware execution; full local file permissions',
    networkPolicy: 'Unrestricted Local',
    allowlist: ['* (Unrestricted)'],
  },
  gcp_vm: {
    name: 'GCP Compute Engine (e2-standard-2)',
    tagline: 'Dedicated cloud virtual machine instance',
    cpu: '2 vCPU',
    ram: '8.0 GiB RAM',
    disk: '50 GB Persistent Disk',
    provisionTimeMs: 12500,
    computeCostPerHour: 0.067,
    freeTierNote: 'Standard Google Cloud compute billing',
    networkPolicy: 'VPC Firewall',
    allowlist: ['Custom VPC Ingress/Egress'],
  },
};

export type StepPhase =
  | 'env_init'
  | 'thought'
  | 'terminal'
  | 'tool_call'
  | 'network_egress'
  | 'verification'
  | 'artifact_generation';

export interface TerminalExecution {
  command: string;
  cwd: string;
  stdout: string;
  stderr?: string;
  exitCode: number;
  durationMs: number;
}

export interface NetworkEgressLog {
  host: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'CONNECT';
  status: number;
  bytes: number;
  reason: string;
  allowed: boolean;
}

export interface FileDiffItem {
  action: 'read' | 'create' | 'modify' | 'audit';
  filePath: string;
  linesAnalyzed: number;
  snippet?: string;
}

export interface MissionStep {
  id: string;
  stepNumber: number;
  timestamp: string;
  phase: StepPhase;
  title: string;
  thoughtContent?: string;
  terminal?: TerminalExecution;
  network?: NetworkEgressLog;
  fileDiff?: FileDiffItem;
  durationMs: number;
  tokens: {
    input: number;
    output: number;
    thinking: number;
  };
}

export interface AuditIssue {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  component: string;
  file: string;
  lines: string;
  description: string;
  recommendation: string;
}

export interface MissionReport {
  title: string;
  summary: string;
  totalDurationMs: number;
  filesInspected: string[];
  issuesFound: AuditIssue[];
  consolidationSequence: { step: number; title: string; detail: string; risk: 'low' | 'medium' | 'high' }[];
  architectureSvg: string;
  tokenSummary: {
    inputTokens: number;
    outputTokens: number;
    thinkingTokens: number;
    totalTokens: number;
    modelCostUsd: number;
    computeCostUsd: number;
    totalCostUsd: number;
  };
}

export interface PresetMission {
  id: string;
  title: string;
  description: string;
  targetRepo: string;
  prompt: string;
  defaultPermissions?: {
    allowWrite: boolean;
    networkEgress: boolean;
  };
}

// -------------------------------------------------------------
// AgentSam (Semantic Interpreter) & agentsam (GOAP Engine) Types
// -------------------------------------------------------------

export type LiteralSpanCategory =
  | 'constraint'
  | 'path'
  | 'repo'
  | 'env_var'
  | 'domain'
  | 'command'
  | 'flag'
  | 'directive';

export interface LiteralSpan {
  id: string;
  text: string;
  startIndex: number;
  endIndex: number;
  category: LiteralSpanCategory;
  importance: 'critical' | 'high' | 'normal';
  enforcementRule: string;
}

export interface TaskContractPermissions {
  allowFsRead: boolean;
  readPaths: string[];
  allowFsWrite: boolean;
  writePaths: string[];
  allowNetworkEgress: boolean;
  allowlistDomains: string[];
  allowTerminalExecution: boolean;
  allowedCommands: string[];
  requiredAuthScopes: string[];
}

export interface TaskContractBoundaries {
  maxSteps: number;
  maxDurationSec: number;
  maxTokens: number;
  preventCompetingAuthorities: boolean;
  enforceAllowlistOnly: boolean;
  astIntegrityCheck: boolean;
}

export interface TaskContract {
  id: string;
  version: '2026.1-contract';
  title: string;
  createdAt: string;
  rawPrompt: string;
  inputMode: 'voice' | 'text' | 'preset';
  semanticInterpreter: 'AgentSam (Cognitive / Semantic Layer)';
  targetExecutor: 'agentsam (Deterministic GOAP Engine)';
  backend: BackendType;
  targetRepo: string;
  literalSpans: LiteralSpan[];
  goal: string;
  preconditions: string[];
  permissions: TaskContractPermissions;
  boundaries: TaskContractBoundaries;
  requiredArtifacts: string[];
  verificationCriteria: string[];
  sha256Signature: string;
  status: 'draft' | 'compiled' | 'verified' | 'executing' | 'completed' | 'violation';
}

// GOAP (Goal-Oriented Action Planning) Machinery Types
export type GoapWorldState = Record<string, boolean | number | string>;

export interface GoapAction {
  id: string;
  name: string;
  description: string;
  phase: StepPhase;
  cost: number;
  preconditions: Record<string, boolean>;
  effects: Record<string, boolean>;
  command?: string;
  cwd?: string;
  tool?: string;
  requiredPermission?: 'read' | 'write' | 'terminal' | 'network' | 'none';
  checkPermission: (contract: TaskContract) => { allowed: boolean; reason?: string };
}

export interface GoapPlan {
  planId: string;
  contractId: string;
  actions: GoapAction[];
  initialState: GoapWorldState;
  goalState: Record<string, boolean>;
  totalCost: number;
  isFeasible: boolean;
  unmetPreconditions: string[];
  createdAt: string;
}

export interface GoapExecutionStepEvent {
  stepIndex: number;
  actionId: string;
  actionName: string;
  phase: StepPhase;
  command?: string;
  stdout?: string;
  stderr?: string;
  exitCode: number;
  tokens: {
    input: number;
    output: number;
    thinking: number;
  };
  durationMs: number;
  worldStateDelta: Record<string, boolean>;
  timestamp: string;
  verified: boolean;
}
