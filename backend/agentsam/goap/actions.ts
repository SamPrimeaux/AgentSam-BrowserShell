import { GoapAction, TaskContract, StepPhase } from '../../../types/agentSam';
import { validateActionPermissions } from '../taskContract';

/**
 * Creates the registry of available deterministic actions for the GOAP Planner
 */
export function getStandardGoapActions(contract: TaskContract): GoapAction[] {
  return [
    {
      id: 'act_provision_sandbox',
      name: 'Provision Execution Sandbox',
      description: 'Spawn isolated container runtime namespace with network firewall policy.',
      phase: 'env_init',
      cost: 10,
      preconditions: {
        env_ready: false,
      },
      effects: {
        env_ready: true,
      },
      command: contract.backend === 'cloudflare'
        ? 'wrangler containers spawn --plan=basic --cpu=0.25 --memory=1024MB --disk=4GB'
        : contract.backend === 'antigravity'
        ? 'antigravity env create --preset=managed-sandbox --firewall=strict-allowlist'
        : 'localpty spawn --pty-sandbox --cwd=/workspace',
      cwd: '/system/orchestrator',
      requiredPermission: 'terminal',
      checkPermission: (c) => validateActionPermissions(c, { id: 'act_provision_sandbox', requiredPermission: 'terminal' } as any),
    },
    {
      id: 'act_verify_firewall',
      name: 'Verify Network Firewall Allowlist',
      description: 'Probe allowlisted package registries and confirm external arbitrary egress is blocked.',
      phase: 'verification',
      cost: 5,
      preconditions: {
        env_ready: true,
        firewall_verified: false,
      },
      effects: {
        firewall_verified: true,
      },
      command: 'agentsam firewall probe --allowlist',
      tool: 'network_probe',
      requiredPermission: 'network',
      checkPermission: (c) => validateActionPermissions(c, { id: 'act_verify_firewall', requiredPermission: 'none' } as any),
    },
    {
      id: 'act_scan_identity_authority',
      name: 'Scan AST for Competing Identity Authorities',
      description: 'Execute ripgrep AST inventory to detect fragmented session tokens and conflicting auth providers.',
      phase: 'terminal',
      cost: 15,
      preconditions: {
        env_ready: true,
        auth_inventory_complete: false,
      },
      effects: {
        auth_inventory_complete: true,
      },
      command: 'rg -n --ignore-case "createSession|verifyToken|jwt\\.verify|getAuthUser|authMiddleware|supabase\\.auth|firebaseAdmin" src/',
      cwd: '/workspace',
      requiredPermission: 'terminal',
      checkPermission: (c) => validateActionPermissions(c, { id: 'act_scan_identity_authority', requiredPermission: 'terminal' } as any),
    },
    {
      id: 'act_ast_deep_audit',
      name: 'Audit Token & Session AST Call Graphs',
      description: 'Parse TypeScript abstract syntax tree to map call sites and caller dependencies.',
      phase: 'tool_call',
      cost: 20,
      preconditions: {
        auth_inventory_complete: true,
        ast_audited: false,
      },
      effects: {
        ast_audited: true,
      },
      tool: 'ast_audit',
      command: 'agentsam ast-audit --entrypoints=src/index.ts,src/auth.ts --export-graph',
      cwd: '/workspace',
      requiredPermission: 'none',
      checkPermission: (c) => validateActionPermissions(c, { id: 'act_ast_deep_audit', requiredPermission: 'none' } as any),
    },
    {
      id: 'act_generate_consolidation_sequence',
      name: 'Compute Invariant Consolidation Sequence',
      description: 'Synthesize optimal refactor plan to consolidate auth authorities into a single authoritative ACP provider.',
      phase: 'thought',
      cost: 25,
      preconditions: {
        ast_audited: true,
        consolidation_computed: false,
      },
      effects: {
        consolidation_computed: true,
      },
      requiredPermission: 'none',
      checkPermission: (c) => validateActionPermissions(c, { id: 'act_generate_consolidation_sequence', requiredPermission: 'none' } as any),
    },
    {
      id: 'act_generate_architecture_map',
      name: 'Render Architecture SVG Map',
      description: 'Compile vector topology showing provider boundaries, token lifecycles, and permission barriers.',
      phase: 'artifact_generation',
      cost: 15,
      preconditions: {
        consolidation_computed: true,
        svg_generated: false,
      },
      effects: {
        svg_generated: true,
      },
      tool: 'svg_generator',
      requiredPermission: 'none',
      checkPermission: (c) => validateActionPermissions(c, { id: 'act_generate_architecture_map', requiredPermission: 'none' } as any),
    },
    {
      id: 'act_compile_audit_report',
      name: 'Sign & Seal Mission Audit Report',
      description: 'Bundle audit findings, token telemetry, cryptographic hashes, and verification receipts.',
      phase: 'artifact_generation',
      cost: 10,
      preconditions: {
        svg_generated: true,
        report_sealed: false,
      },
      effects: {
        report_sealed: true,
        mission_complete: true,
      },
      requiredPermission: 'none',
      checkPermission: (c) => validateActionPermissions(c, { id: 'act_compile_audit_report', requiredPermission: 'none' } as any),
    },
    // Alternative lane for Storage/D1 Migration
    {
      id: 'act_d1_schema_analyze',
      name: 'Analyze KV/DO Storage Patterns',
      description: 'Profile reads/writes across Cloudflare Durable Objects and prepare relational D1 schemas.',
      phase: 'terminal',
      cost: 20,
      preconditions: {
        env_ready: true,
        d1_profiled: false,
      },
      effects: {
        d1_profiled: true,
      },
      command: 'wrangler d1 migrations list --preview',
      cwd: '/workspace',
      requiredPermission: 'terminal',
      checkPermission: (c) => validateActionPermissions(c, { id: 'act_d1_schema_analyze', requiredPermission: 'terminal' } as any),
    },
    {
      id: 'act_d1_benchmark_latency',
      name: 'Benchmark Cold Start & Latency Profile',
      description: 'Measure millisecond cold start timings between KV and D1 container bridges.',
      phase: 'verification',
      cost: 30,
      preconditions: {
        d1_profiled: true,
        d1_benchmarked: false,
      },
      effects: {
        d1_benchmarked: true,
        mission_complete: true,
      },
      command: 'agentsam benchmark --suite=d1-storage --iterations=50',
      requiredPermission: 'terminal',
      checkPermission: (c) => validateActionPermissions(c, { id: 'act_d1_benchmark_latency', requiredPermission: 'terminal' } as any),
    },
  ];
}
