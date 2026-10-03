import { PresetMission, MissionStep, MissionReport, BackendType, BACKEND_CONFIGS } from '../types/agentSam';

export const PRESET_MISSIONS: PresetMission[] = [
  {
    id: 'identity-authority-audit',
    title: 'Audit Repository for Competing Identity Authorities',
    description: 'Inspect codebase for fragmented session, token, and auth authority implementations. Identify overlap and create consolidation map.',
    targetRepo: 'inneranimals/agentsam-core (v2.4)',
    prompt: `MISSION: Audit this repository for competing identity authorities.
- Do not modify anything.
- Inspect as much of the repository as necessary.
- Use shell/search/filesystem tools freely.
- Maintain a structured execution stream.
- Identify concrete ownership overlap with file evidence.
- Generate an SVG architecture map.
- Produce a proposed consolidation sequence.
- Stop after producing the report.`,
  },
  {
    id: 'cloudflare-worker-d1-migration',
    title: 'Cloudflare Worker to D1 SQL & Container Bridge Migration',
    description: 'Analyze KV/Durable Object storage patterns and generate D1 migration schema with container boundary validation.',
    targetRepo: 'agentsam/worker-runtime',
    prompt: `MISSION: Benchmark storage migration from legacy KV/Durable Objects to Cloudflare D1 with containerized Worker execution.
- Profile latency across cold starts.
- Inspect network boundaries and allowlist dependencies (npm, PyPI).
- Produce benchmark performance comparison and SQL migration script.`,
  },
  {
    id: 'security-network-sandbox-scan',
    title: 'Network Egress & Dependency Policy Verification',
    description: 'Verify package registries (files.pythonhosted.org, npm) and ensure sandbox firewall blocks unauthorized data exfiltration.',
    targetRepo: 'agentsam/secure-sandbox',
    prompt: `MISSION: Audit sandbox network egress policy and package resolution rules.
- Test connection against files.pythonhosted.org and npmjs.org.
- Verify block rules on external arbitrary IPs.
- Compile compliance audit report.`,
  },
];

export function generateStepsForMission(missionId: string, backend: BackendType): { steps: MissionStep[]; report: MissionReport } {
  const isCloudflare = backend === 'cloudflare';
  const isAntigravity = backend === 'antigravity';
  const isLocal = backend === 'local_pty';

  const envInitTime = BACKEND_CONFIGS[backend].provisionTimeMs;
  const envName = BACKEND_CONFIGS[backend].name;

  const steps: MissionStep[] = [
    {
      id: 'step-0',
      stepNumber: 1,
      timestamp: '00:01.20',
      phase: 'env_init',
      title: 'Spinning up new environment',
      thoughtContent: `Provisioning target execution sandbox (${envName}). Checking filesystem mounts, process isolation namespace, and network firewall policies. Setting up environment variables and ephemeral rootfs.`,
      terminal: {
        command: isCloudflare
          ? 'wrangler containers spawn --plan=basic --cpu=0.25 --memory=1024MB --disk=4GB --name=agentsam-sandbox-lane'
          : isAntigravity
          ? 'antigravity env create --preset=managed-sandbox --arch=x86_64 --firewall=strict-allowlist'
          : isLocal
          ? 'localpty spawn --pty-sandbox --cwd=/workspace'
          : 'gcloud compute instances create agentsam-runner --zone=us-central1-a --machine-type=e2-standard-2',
        cwd: '/system/orchestrator',
        stdout: `[INFO] Container runtime initialized in ${envInitTime}ms.
[INFO] CPU Allocation: ${BACKEND_CONFIGS[backend].cpu} | RAM: ${BACKEND_CONFIGS[backend].ram}
[INFO] Network Policy: ${BACKEND_CONFIGS[backend].networkPolicy}
[INFO] Persistent workspace mounted at /workspace
[OK] Sandbox ready for autonomous execution loop.`,
        exitCode: 0,
        durationMs: envInitTime,
      },
      durationMs: envInitTime,
      tokens: { input: 1240, output: 140, thinking: 310 },
    },
    {
      id: 'step-1',
      stepNumber: 2,
      timestamp: '00:03.45',
      phase: 'thought',
      title: 'Formulating Repository Exploration Strategy',
      thoughtContent: `The objective is to audit for competing identity authorities without modifying files.
I will first execute a broad structural inventory:
1. Scan for authentication middlewares, JWT validators, and OAuth token handlers.
2. Locate stateful session stores (Redis, Cloudflare KV, SQLite, Firebase Auth).
3. Search for conflicting user context resolution in API route interceptors.
4. Record every conflicting implementation with exact file paths and line ranges.`,
      durationMs: 450,
      tokens: { input: 2450, output: 380, thinking: 1120 },
    },
    {
      id: 'step-2',
      stepNumber: 3,
      timestamp: '00:04.90',
      phase: 'terminal',
      title: 'Inventorying Project Tree & Auth Keywords',
      thoughtContent: `Running ripgrep across the repository to identify files handling auth tokens, session headers, and user credential validation.`,
      terminal: {
        command: 'rg -n --ignore-case "createSession|verifyToken|jwt\\.verify|getAuthUser|authMiddleware|supabase\\.auth|firebaseAdmin" src/',
        cwd: '/workspace',
        stdout: `src/auth/sessionManager.ts:14:export async function createSession(userId: string): Promise<SessionToken>
src/auth/jwtHandler.ts:28:export function verifyToken(rawBearer: string): DecodedJwt
src/middleware/authInterceptor.ts:19:const user = await getAuthUser(req.headers['authorization']);
src/services/firebaseAuth.ts:42:const decoded = await firebaseAdmin.auth().verifyIdToken(token);
src/server/routes/api/user.ts:8:import { verifySessionCookie } from '../../auth/cookieAuth';
src/lib/oauthGateway.ts:55:export const oauthClient = new GoogleOAuthProvider({...});`,
        exitCode: 0,
        durationMs: 320,
      },
      fileDiff: {
        action: 'audit',
        filePath: 'src/auth/sessionManager.ts',
        linesAnalyzed: 142,
      },
      durationMs: 680,
      tokens: { input: 3820, output: 410, thinking: 940 },
    },
    {
      id: 'step-3',
      stepNumber: 4,
      timestamp: '00:07.10',
      phase: 'network_egress',
      title: 'Resolving Python AST & Static Analysis Tooling',
      thoughtContent: `Need to install specialized tree-sitter AST parser dependencies to trace control-flow graph for auth decorators. Requesting package from official PyPI CDN. Testing sandbox firewall allowlist.`,
      network: {
        host: 'files.pythonhosted.org',
        endpoint: '/packages/source/t/tree-sitter/tree_sitter-0.21.0-cp310-cp310-manylinux.whl',
        method: 'GET',
        status: 200,
        bytes: 142850,
        reason: 'PyPI wheel artifact download for AST analysis engine',
        allowed: true,
      },
      terminal: {
        command: 'pip install --no-cache-dir tree-sitter pyjwt cryptography --index-url https://pypi.org/simple',
        cwd: '/workspace',
        stdout: `Looking in indexes: https://pypi.org/simple
Collecting tree-sitter
  Downloading from https://files.pythonhosted.org/.../tree_sitter-0.21.0-cp310-cp310-manylinux.whl (142 kB)
Collecting pyjwt
  Downloading from https://files.pythonhosted.org/.../pyjwt-2.8.0-py3-none-any.whl (22 kB)
Successfully installed tree-sitter-0.21.0 pyjwt-2.8.0 cryptography-42.0.5`,
        exitCode: 0,
        durationMs: 1420,
      },
      durationMs: 1650,
      tokens: { input: 5120, output: 540, thinking: 1280 },
    },
    {
      id: 'step-4',
      stepNumber: 5,
      timestamp: '00:10.20',
      phase: 'tool_call',
      title: 'Deep File Inspection: Comparing src/auth/sessionManager vs src/services/firebaseAuth',
      thoughtContent: `Discovered a major architectural dichotomy:
- File 1 (src/auth/sessionManager.ts) implements custom in-memory / KV token generation with custom HMAC signing.
- File 2 (src/services/firebaseAuth.ts) calls Firebase Admin SDK directly on the same routes.
- File 3 (src/auth/jwtHandler.ts) has an independent public key cache with distinct expiry logic (15m vs 7d).
These two systems are racing in the auth interceptor, creating inconsistent authentication states for websocket and HTTP clients.`,
      fileDiff: {
        action: 'read',
        filePath: 'src/auth/sessionManager.ts & src/services/firebaseAuth.ts',
        linesAnalyzed: 380,
        snippet: `// Conflict in authInterceptor.ts lines 22-38:
if (req.headers['x-session-token']) {
  return sessionManager.validate(req.headers['x-session-token']); // Authority A (Local KV)
} else if (req.headers['authorization']) {
  return firebaseAuth.verify(req.headers['authorization']);     // Authority B (Firebase Admin)
} // RACE CONDITION: No unified principal mapper!`,
      },
      durationMs: 1100,
      tokens: { input: 7890, output: 690, thinking: 2150 },
    },
    {
      id: 'step-5',
      stepNumber: 6,
      timestamp: '00:13.80',
      phase: 'tool_call',
      title: 'Inspecting OAuth Gateway & Refresh Token Lifecycle',
      thoughtContent: `Tracing Google OAuth flow in src/lib/oauthGateway.ts.
Notice that refresh tokens are written to local cookies in one route, but stored in PostgreSQL user_credentials table in another route. There is no cryptographic link between the session cookie and the database token.`,
      terminal: {
        command: 'cat src/lib/oauthGateway.ts | grep -A 20 "handleOAuthCallback"',
        cwd: '/workspace',
        stdout: `export async function handleOAuthCallback(code: string, res: Response) {
  const tokens = await exchangeCode(code);
  // Competing Authority: Setting ad-hoc cookie rather than routing via sessionManager
  res.cookie('oauth_refresh', tokens.refresh_token, { httpOnly: true, secure: true });
  return { success: true, user: tokens.userInfo };
}`,
        exitCode: 0,
        durationMs: 280,
      },
      fileDiff: {
        action: 'modify',
        filePath: 'src/lib/oauthGateway.ts',
        linesAnalyzed: 94,
      },
      durationMs: 890,
      tokens: { input: 11240, output: 780, thinking: 2840 },
    },
    {
      id: 'step-6',
      stepNumber: 7,
      timestamp: '00:17.40',
      phase: 'verification',
      title: 'Constructing Graph of Identity Authorities & Boundary Crossings',
      thoughtContent: `All evidence collected:
- Authority 1: Local KV Session Token (SessionManager)
- Authority 2: Firebase Admin ID Token (FirebaseAuth)
- Authority 3: Ad-hoc OAuth Cookie (OAuthGateway)
- Authority 4: Edge Worker JWT Validator (Cloudflare KV Edge)

Synthesizing unified architectural mapping into SVG format and preparing step-by-step consolidation proposal.`,
      durationMs: 950,
      tokens: { input: 15400, output: 920, thinking: 3400 },
    },
    {
      id: 'step-7',
      stepNumber: 8,
      timestamp: '00:21.10',
      phase: 'artifact_generation',
      title: 'Rendering SVG Architecture Map & Final Consolidation Report',
      thoughtContent: `Generated comprehensive SVG visual model and 4-phase zero-downtime consolidation roadmap. Audit complete.`,
      durationMs: 1400,
      tokens: { input: 21850, output: 1850, thinking: 4600 },
    },
  ];

  const totalInputTokens = steps.reduce((sum, s) => sum + s.tokens.input, 0);
  const totalOutputTokens = steps.reduce((sum, s) => sum + s.tokens.output, 0);
  const totalThinkingTokens = steps.reduce((sum, s) => sum + s.tokens.thinking, 0);
  const totalTokens = totalInputTokens + totalOutputTokens + totalThinkingTokens;

  // Gemini 3.7 Flash Pricing: $0.75/M in, $3.75/M out (including thinking)
  const modelCostUsd = ((totalInputTokens / 1_000_000) * 0.75) + (((totalOutputTokens + totalThinkingTokens) / 1_000_000) * 3.75);
  const totalDurationMs = steps.reduce((sum, s) => sum + s.durationMs, 0);
  const computeHours = totalDurationMs / (1000 * 60 * 60);
  const computeCostUsd = isAntigravity ? 0.0 : computeHours * BACKEND_CONFIGS[backend].computeCostPerHour;

  const architectureSvg = `
<svg viewBox="0 0 840 420" xmlns="http://www.w3.org/2000/svg" style="background:#131416; font-family: 'Google Sans Flex', sans-serif; border-radius: 12px; width: 100%; height: auto;">
  <defs>
    <linearGradient id="gradRed" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f28b82" stop-opacity="0.2"/>
      <stop offset="100%" stop-color="#ea4335" stop-opacity="0.05"/>
    </linearGradient>
    <linearGradient id="gradGreen" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#81c995" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="#34a853" stop-opacity="0.05"/>
    </linearGradient>
    <linearGradient id="gradBlue" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#8ab4f8" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="#4285f4" stop-opacity="0.05"/>
    </linearGradient>
  </defs>

  <!-- Title -->
  <text x="30" y="38" fill="#e8eaed" font-size="16" font-weight="600">Identity Authority Overlap Map (Audit Evidence)</text>
  <text x="30" y="58" fill="#9aa0a6" font-size="12">Red boxes indicate competing uncoordinated authorities | Green represents Target Unified Gateway</text>

  <!-- Client Layer -->
  <g transform="translate(30, 85)">
    <rect width="160" height="290" rx="8" fill="#202124" stroke="#3c4043" stroke-width="1.5"/>
    <text x="80" y="30" fill="#c4c7cc" font-size="13" font-weight="500" text-anchor="middle">Clients / Consumers</text>
    
    <rect x="15" y="55" width="130" height="42" rx="6" fill="#303134" stroke="#5f6368" stroke-width="1"/>
    <text x="80" y="80" fill="#e8eaed" font-size="11" text-anchor="middle">Web App (SPA)</text>
    
    <rect x="15" y="115" width="130" height="42" rx="6" fill="#303134" stroke="#5f6368" stroke-width="1"/>
    <text x="80" y="140" fill="#e8eaed" font-size="11" text-anchor="middle">API CLI / SDK</text>

    <rect x="15" y="175" width="130" height="42" rx="6" fill="#303134" stroke="#5f6368" stroke-width="1"/>
    <text x="80" y="200" fill="#e8eaed" font-size="11" text-anchor="middle">WebSocket Feeds</text>
    
    <rect x="15" y="235" width="130" height="42" rx="6" fill="#303134" stroke="#5f6368" stroke-width="1"/>
    <text x="80" y="260" fill="#e8eaed" font-size="11" text-anchor="middle">Cloudflare Worker</text>
  </g>

  <!-- Competing Authorities (Fragmented) -->
  <g transform="translate(230, 85)">
    <rect width="280" height="290" rx="8" fill="url(#gradRed)" stroke="#ea4335" stroke-dasharray="4,3" stroke-width="1.5"/>
    <text x="140" y="30" fill="#f28b82" font-size="13" font-weight="600" text-anchor="middle">⚠️ 4 Competing Authorities (Current)</text>

    <!-- Authority 1 -->
    <rect x="15" y="50" width="250" height="48" rx="6" fill="#202124" stroke="#f28b82" stroke-width="1"/>
    <text x="25" y="70" fill="#f28b82" font-size="11" font-weight="600">Auth 1: SessionManager (Local KV)</text>
    <text x="25" y="86" fill="#9aa0a6" font-size="10">src/auth/sessionManager.ts:14 (TTL: 7d)</text>

    <!-- Authority 2 -->
    <rect x="15" y="108" width="250" height="48" rx="6" fill="#202124" stroke="#f28b82" stroke-width="1"/>
    <text x="25" y="128" fill="#f28b82" font-size="11" font-weight="600">Auth 2: Firebase Admin SDK</text>
    <text x="25" y="144" fill="#9aa0a6" font-size="10">src/services/firebaseAuth.ts:42 (TTL: 1h)</text>

    <!-- Authority 3 -->
    <rect x="15" y="166" width="250" height="48" rx="6" fill="#202124" stroke="#f28b82" stroke-width="1"/>
    <text x="25" y="186" fill="#f28b82" font-size="11" font-weight="600">Auth 3: Ad-hoc OAuth Cookie</text>
    <text x="25" y="202" fill="#9aa0a6" font-size="10">src/lib/oauthGateway.ts:55 (Uncoordinated)</text>

    <!-- Authority 4 -->
    <rect x="15" y="224" width="250" height="48" rx="6" fill="#202124" stroke="#f28b82" stroke-width="1"/>
    <text x="25" y="244" fill="#f28b82" font-size="11" font-weight="600">Auth 4: Custom Edge JWT Validator</text>
    <text x="25" y="260" fill="#9aa0a6" font-size="10">src/auth/jwtHandler.ts:28 (Separate secret)</text>
  </g>

  <!-- Target Unified Architecture -->
  <g transform="translate(550, 85)">
    <rect width="260" height="290" rx="8" fill="url(#gradGreen)" stroke="#81c995" stroke-width="1.5"/>
    <text x="130" y="30" fill="#81c995" font-size="13" font-weight="600" text-anchor="middle">✓ Proposed Unified Authority</text>

    <rect x="15" y="55" width="230" height="65" rx="6" fill="#202124" stroke="#81c995" stroke-width="1"/>
    <text x="25" y="78" fill="#81c995" font-size="12" font-weight="600">Unified Auth Gateway</text>
    <text x="25" y="95" fill="#c4c7cc" font-size="10">Single Principal Model (Claims Mapper)</text>
    <text x="25" y="108" fill="#9aa0a6" font-size="9">Handles OIDC, Passkeys, API Keys & JWT</text>

    <rect x="15" y="135" width="230" height="60" rx="6" fill="#202124" stroke="#8ab4f8" stroke-width="1"/>
    <text x="25" y="158" fill="#8ab4f8" font-size="12" font-weight="600">Standardized Session Store</text>
    <text x="25" y="175" fill="#c4c7cc" font-size="10">Cloudflare D1 / Durable Storage</text>
    <text x="25" y="188" fill="#9aa0a6" font-size="9">Revocation list + rotation heartbeat</text>

    <rect x="15" y="210" width="230" height="65" rx="6" fill="#202124" stroke="#81c995" stroke-width="1"/>
    <text x="25" y="233" fill="#81c995" font-size="12" font-weight="600">Zero-Trust Interceptor</text>
    <text x="25" y="250" fill="#c4c7cc" font-size="10">Single pipeline for HTTP, WS & Edge</text>
  </g>

  <!-- Connectors -->
  <path d="M 190 145 L 230 145" stroke="#ea4335" stroke-width="1.5" marker-end="url(#arrow)"/>
  <path d="M 510 230 L 550 230" stroke="#81c995" stroke-width="1.5" stroke-dasharray="4,2"/>
</svg>
`;

  const report: MissionReport = {
    title: 'Audit Report: Competing Identity Authorities & Consolidation Roadmap',
    summary: `Autonomous static and dynamic AST analysis completed across 46 source modules. Found 4 competing identity authorities operating without a synchronized session bus or token revocation mechanism.`,
    totalDurationMs,
    filesInspected: [
      'src/auth/sessionManager.ts',
      'src/services/firebaseAuth.ts',
      'src/lib/oauthGateway.ts',
      'src/auth/jwtHandler.ts',
      'src/middleware/authInterceptor.ts',
      'src/server/routes/api/user.ts',
    ],
    issuesFound: [
      {
        id: 'ISS-01',
        severity: 'critical',
        component: 'Session Interceptor',
        file: 'src/middleware/authInterceptor.ts',
        lines: '22-38',
        description: 'Race condition between local KV session tokens and Firebase Admin ID tokens. Inconsistent user principal structure returned to downstream handlers.',
        recommendation: 'Implement an abstract AuthPrincipal adapter that maps all token payloads into a strictly typed Principal context.',
      },
      {
        id: 'ISS-02',
        severity: 'high',
        component: 'OAuth Gateway',
        file: 'src/lib/oauthGateway.ts',
        lines: '55-72',
        description: 'Refresh token stored in uncoordinated HTTP-only cookie without matching record in central revocation table.',
        recommendation: 'Route OAuth completion through Unified SessionManager to register session ID and device fingerprint.',
      },
      {
        id: 'ISS-03',
        severity: 'medium',
        component: 'JWT Handler',
        file: 'src/auth/jwtHandler.ts',
        lines: '28-45',
        description: 'Separate HMAC secret configured in environment variables, out of sync with edge worker validation keys.',
        recommendation: 'Adopt asymmetric Ed25519 or RS256 JWKS endpoint served by the central identity authority.',
      },
    ],
    consolidationSequence: [
      {
        step: 1,
        title: 'Define Canonical AuthPrincipal Type & Middleware Bridge',
        detail: 'Create a shared Principal interface in src/types/auth.ts and wrap existing handlers with an adapter layer to prevent breaking API changes.',
        risk: 'low',
      },
      {
        step: 2,
        title: 'Centralize Session State in Cloudflare D1 / Managed DB',
        detail: 'Deprecate in-memory KV maps in sessionManager.ts in favor of persistent, queryable session table with instant revocation capabilities.',
        risk: 'medium',
      },
      {
        step: 3,
        title: 'Unify OAuth & Firebase Handlers into Gateway Pipeline',
        detail: 'Ensure OAuth callbacks and Firebase token verifications emit standard session cookies signed by the primary authority key.',
        risk: 'medium',
      },
      {
        step: 4,
        title: 'Deprecate & Remove Legacy JWT Endpoints',
        detail: 'Decommission ad-hoc JWT verify functions after all client SDKs upgrade to the new session validation protocol.',
        risk: 'low',
      },
    ],
    architectureSvg,
    tokenSummary: {
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      thinkingTokens: totalThinkingTokens,
      totalTokens,
      modelCostUsd,
      computeCostUsd,
      totalCostUsd: modelCostUsd + computeCostUsd,
    },
  };

  return { steps, report };
}
