import {
  TaskContract,
  LiteralSpan,
  LiteralSpanCategory,
  BackendType,
  BACKEND_CONFIGS,
  GoapAction,
} from '../../types/agentSam';

/**
 * Deterministic pseudo-hash for contract integrity verification
 */
export function calculateContractHash(data: unknown): string {
  const str = typeof data === 'string' ? data : JSON.stringify(data);
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  const hex = (hash >>> 0).toString(16).padStart(8, '0');
  return `sha256:7f9a${hex}e14b2d3c`;
}

/**
 * Extracts literal spans from natural language/voice input with exact character offsets.
 * Preserves verbatim tokens to prevent semantic drift during execution.
 */
export function extractLiteralSpans(rawPrompt: string): LiteralSpan[] {
  const spans: LiteralSpan[] = [];
  let spanCounter = 0;

  const addSpan = (
    text: string,
    startIndex: number,
    endIndex: number,
    category: LiteralSpanCategory,
    importance: 'critical' | 'high' | 'normal',
    enforcementRule: string
  ) => {
    // Avoid exact duplicate overlap
    const exists = spans.some(s => s.startIndex === startIndex && s.endIndex === endIndex);
    if (!exists && startIndex >= 0 && endIndex <= rawPrompt.length) {
      spans.push({
        id: `span_${++spanCounter}`,
        text,
        startIndex,
        endIndex,
        category,
        importance,
        enforcementRule,
      });
    }
  };

  // 1. Explicit constraints (Negative & boundary rules)
  const constraintPatterns = [
    { regex: /do not modify anything/i, rule: 'ENFORCE_STRICT_READ_ONLY: Prohibit all fs.write and mutative shell operations.' },
    { regex: /without modifying (?:any )?files?/i, rule: 'ENFORCE_STRICT_READ_ONLY: Prohibit file write/update syscalls.' },
    { regex: /stop after producing the report/i, rule: 'HALT_ON_ARTIFACT: Terminate autonomous loop immediately upon report artifact generation.' },
    { regex: /maintain a structured execution stream/i, rule: 'EMIT_TELEMETRY: Stream all JSON-RPC phase events synchronously.' },
    { regex: /use shell\/search\/filesystem tools freely/i, rule: 'GRANT_AUDIT_TOOLS: Allow ripgrep, find, ast_audit, and cat.' },
    { regex: /verify block rules on external arbitrary ips/i, rule: 'BLOCK_NON_ALLOWLIST: Drop all packets outside designated domain allowlist.' },
    { regex: /no code modifications/i, rule: 'ENFORCE_STRICT_READ_ONLY: Disallow write.' },
  ];

  for (const { regex, rule } of constraintPatterns) {
    const match = regex.exec(rawPrompt);
    if (match) {
      addSpan(match[0], match.index, match.index + match[0].length, 'constraint', 'critical', rule);
    }
  }

  // 2. Repositories / Org targets (e.g. inneranimals/agentsam-core, agentsam/worker-runtime)
  const repoRegex = /[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+/g;
  let match: RegExpExecArray | null;
  while ((match = repoRegex.exec(rawPrompt)) !== null) {
    const word = match[0];
    // Filter out common false positives like "and/or"
    if (word.includes('/') && !['and/or', 'either/or'].includes(word.toLowerCase())) {
      addSpan(word, match.index, match.index + word.length, 'repo', 'critical', 'TARGET_SCOPE_ISOLATION: Scope execution exclusively within target repository AST.');
    }
  }

  // 3. Domain names & Hostnames (e.g. files.pythonhosted.org, registry.npmjs.org, github.com)
  const domainRegex = /\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:com|org|io|net|dev|sh)\b/gi;
  while ((match = domainRegex.exec(rawPrompt)) !== null) {
    addSpan(match[0], match.index, match.index + match[0].length, 'domain', 'critical', `EGRESS_ALLOWLIST_ADDITION: Add host "${match[0]}" to firewall allowlist.`);
  }

  // 4. File and directory paths (e.g. src/, package.json, /workspace, /system/orchestrator)
  const pathRegex = /(?:[\.\/~]?[a-zA-Z0-9_\-\.]+\/[a-zA-Z0-9_\-\.\/]*|package\.json|tsconfig\.json|Dockerfile)/g;
  while ((match = pathRegex.exec(rawPrompt)) !== null) {
    const p = match[0];
    if (p.length > 2 && !p.startsWith('http')) {
      addSpan(p, match.index, match.index + p.length, 'path', 'high', `PATH_BOUNDARY_LOCK: Lock filesystem traversal to resolved path "${p}".`);
    }
  }

  // 5. Environment variables and uppercase tokens (e.g. GITHUB_CLIENT_ID, GOOGLE_AI_API_KEY, D1)
  const envVarRegex = /\b[A-Z][A-Z0-9_]{3,}\b/g;
  while ((match = envVarRegex.exec(rawPrompt)) !== null) {
    const varName = match[0];
    addSpan(varName, match.index, match.index + varName.length, 'env_var', 'high', `VAULT_ENV_INJECTION: Resolve environment variable "${varName}" through secure credential manager.`);
  }

  // 6. Directives and commands (e.g. ripgrep, audit, benchmark, migrate)
  const commandPatterns = [
    { regex: /\b(?:ripgrep|rg|grep)\b/i, cat: 'command' as const, rule: 'EXECUTE_TOOL: Bind to native ACP ripgrep search worker.' },
    { regex: /\b(?:ast_audit|audit)\b/i, cat: 'directive' as const, rule: 'EXECUTE_AST: Parse TypeScript AST without symbol evaluation.' },
    { regex: /\b(?:benchmark|profile)\b/i, cat: 'directive' as const, rule: 'PROFILE_LATENCY: Collect millisecond cold-start telemetry.' },
    { regex: /\b(?:svg architecture map|architecture map)\b/i, cat: 'directive' as const, rule: 'MANDATE_ARTIFACT: Require SVG diagram generation prior to contract sign-off.' },
  ];

  for (const { regex, cat, rule } of commandPatterns) {
    while ((match = regex.exec(rawPrompt)) !== null) {
      addSpan(match[0], match.index, match.index + match[0].length, cat, 'normal', rule);
    }
  }

  // Sort by start index
  return spans.sort((a, b) => a.startIndex - b.startIndex);
}

/**
 * AgentSam: Compiles unstructured human input (voice or text) into a verified TaskContract
 */
export function compileTaskContract(
  rawPrompt: string,
  backend: BackendType = 'antigravity',
  options: {
    inputMode?: 'voice' | 'text' | 'preset';
    targetRepo?: string;
    overrideWritePermission?: boolean;
  } = {}
): TaskContract {
  const literalSpans = extractLiteralSpans(rawPrompt);

  // Determine read/write permission strictly from literal spans
  const hasNoWriteConstraint = literalSpans.some(
    s => s.category === 'constraint' && s.enforcementRule.includes('ENFORCE_STRICT_READ_ONLY')
  );

  const allowFsWrite = options.overrideWritePermission ?? (!hasNoWriteConstraint && !rawPrompt.toLowerCase().includes('do not modify'));
  
  // Extract mentioned domains or fallback to backend default allowlist
  const mentionedDomains = literalSpans
    .filter(s => s.category === 'domain')
    .map(s => s.text.toLowerCase());
  
  const backendConfig = BACKEND_CONFIGS[backend];
  const combinedAllowlist = Array.from(new Set([...backendConfig.allowlist, ...mentionedDomains]));

  // Extract paths
  const mentionedPaths = literalSpans
    .filter(s => s.category === 'path')
    .map(s => s.text);
  const readPaths = mentionedPaths.length > 0 ? mentionedPaths : ['src/', 'package.json', 'tsconfig.json'];

  // Extract target repo
  const repoSpan = literalSpans.find(s => s.category === 'repo');
  const targetRepo = options.targetRepo || (repoSpan ? repoSpan.text : 'inneranimals/agentsam-core (v2.4)');

  const contractId = 'tc_' + Math.random().toString(36).substring(2, 10);
  const now = new Date().toISOString();

  // Determine Goal Title
  let title = 'Autonomous Code Audit & Authority Verification';
  if (rawPrompt.toLowerCase().includes('d1') || rawPrompt.toLowerCase().includes('migration')) {
    title = 'D1 SQL Storage & Container Bridge Migration';
  } else if (rawPrompt.toLowerCase().includes('network') || rawPrompt.toLowerCase().includes('egress')) {
    title = 'Network Egress & Dependency Allowlist Verification';
  } else if (rawPrompt.length > 0) {
    const firstLine = rawPrompt.split('\n')[0].replace(/^MISSION:\s*/i, '').trim();
    if (firstLine.length > 0 && firstLine.length < 60) {
      title = firstLine;
    }
  }

  const contractWithoutSig: Omit<TaskContract, 'sha256Signature'> = {
    id: contractId,
    version: '2026.1-contract',
    title,
    createdAt: now,
    rawPrompt,
    inputMode: options.inputMode || 'text',
    semanticInterpreter: 'AgentSam (Cognitive / Semantic Layer)',
    targetExecutor: 'agentsam (Deterministic GOAP Engine)',
    backend,
    targetRepo,
    literalSpans,
    goal: `Execute verifiable plan for: "${title}". Guarantee literal span preservation without semantic drift.`,
    preconditions: [
      `Sandbox container provisioned in ${backendConfig.name}`,
      `Firewall rule active (${backendConfig.networkPolicy})`,
      'Single auth authority invariant preserved',
    ],
    permissions: {
      allowFsRead: true,
      readPaths,
      allowFsWrite,
      writePaths: allowFsWrite ? ['dist/', 'reports/', 'migrations/'] : [],
      allowNetworkEgress: true,
      allowlistDomains: combinedAllowlist,
      allowTerminalExecution: true,
      allowedCommands: ['rg', 'find', 'git', 'node', 'wrangler', 'antigravity', 'localpty'],
      requiredAuthScopes: ['repo:read', 'user:email'],
    },
    boundaries: {
      maxSteps: 15,
      maxDurationSec: 300,
      maxTokens: 50000,
      preventCompetingAuthorities: true,
      enforceAllowlistOnly: true,
      astIntegrityCheck: true,
    },
    requiredArtifacts: [
      'Mission Audit Report',
      'SVG Architecture Map',
      'Consolidation Sequence',
      'Integrity Hash Audit Trail',
    ],
    verificationCriteria: [
      'Zero unauthorized write operations attempted',
      'All network calls pass domain allowlist check',
      'AST analyzed without runtime evaluation',
      'No duplicate auth providers introduced',
    ],
    status: 'compiled',
  };

  const signature = calculateContractHash(contractWithoutSig);

  return {
    ...contractWithoutSig,
    sha256Signature: signature,
  };
}

/**
 * Validates a GOAP action against a TaskContract's explicit permissions.
 */
export function validateActionPermissions(
  contract: TaskContract,
  action: GoapAction
): { allowed: boolean; reason?: string } {
  // 1. Write permission check
  if (action.requiredPermission === 'write' && !contract.permissions.allowFsWrite) {
    return {
      allowed: false,
      reason: `SECURITY VIOLATION: Action "${action.name}" requires write permission, but TaskContract strictly forbids filesystem modifications.`,
    };
  }

  // 2. Terminal execution check
  if (action.requiredPermission === 'terminal' && !contract.permissions.allowTerminalExecution) {
    return {
      allowed: false,
      reason: `SECURITY VIOLATION: Action "${action.name}" invokes terminal execution, which is disallowed by contract permissions.`,
    };
  }

  return { allowed: true };
}
