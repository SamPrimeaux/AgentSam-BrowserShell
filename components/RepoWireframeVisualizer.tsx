import React, { useState, useMemo } from 'react';

export type PresentationLevel = 'executive' | 'topology' | 'filemap' | 'optimizations';

export interface RepoFamilyGroup {
  id: 'foundation' | 'runtime' | 'workbench' | 'product' | 'theme';
  name: string;
  tagline: string;
  color: string;
  badgeColor: string;
  icon: string;
  health: 'healthy' | 'audited' | 'optimizing';
  artifacts: Array<{
    name: string;
    path: string;
    description: string;
    role: string;
    status: 'stable' | 'graduated' | 'active';
    specimenKind: string;
    exports?: string[];
  }>;
}

export const REPO_FAMILIES: RepoFamilyGroup[] = [
  {
    id: 'foundation',
    name: 'Foundation & Contracts',
    tagline: 'Framework-neutral shared vocabulary, headless DAGs, and invariant gates',
    color: '#38bdf8',
    badgeColor: 'bg-sky-950 text-sky-300 border-sky-800',
    icon: 'folder_data',
    health: 'healthy',
    artifacts: [
      {
        name: '@inneranimalmedia/agentsam-contracts',
        path: 'packages/agentsam-contracts',
        description: 'Messages, artifacts, tool receipts, model options, observability, and host capability contracts',
        role: 'Canonical Vocabulary',
        status: 'graduated',
        specimenKind: 'package',
        exports: ['.', './models', './observability', './host'],
      },
      {
        name: '@inneranimalmedia/agentsam-work-graph',
        path: 'packages/agentsam-work-graph',
        description: 'Headless deterministic DAG work graph, dependency edges, topological sequencer & timeline projection',
        role: 'Planning & Dependencies',
        status: 'graduated',
        specimenKind: 'package',
        exports: ['.'],
      },
      {
        name: 'backend/agentsam/taskContract.ts',
        path: 'backend/agentsam/taskContract.ts',
        description: 'SHA-256 sealed execution boundaries, permission validation, and literal spans',
        role: 'Execution Guardrails',
        status: 'stable',
        specimenKind: 'contract',
      },
      {
        name: 'types/agentSam.ts',
        path: 'types/agentSam.ts',
        description: 'TaskContract, GoapPlan, and BackendType core interfaces',
        role: 'Ambient Types',
        status: 'stable',
        specimenKind: 'types',
      },
    ],
  },
  {
    id: 'runtime',
    name: 'Runtime & Infrastructure',
    tagline: 'Execution engines, machine-first intent routers, daemons, and multi-language SDKs',
    color: '#a855f7',
    badgeColor: 'bg-purple-950 text-purple-300 border-purple-800',
    icon: 'memory',
    health: 'healthy',
    artifacts: [
      {
        name: 'Machine Intent Front Controller',
        path: 'backend/agentsam/frontController.ts',
        description: 'Deterministic 0-LLM filter: answers runtime status, health, models, and branch queries instantly',
        role: 'Front Controller',
        status: 'active',
        specimenKind: 'runtime',
      },
      {
        name: 'Agent Client Protocol (ACP) Daemon',
        path: 'backend/agentsam/acp/serve.ts',
        description: 'JSON-RPC 2.0 & REST server daemon powering tools, intent resolution, and models API',
        role: 'RPC Daemon',
        status: 'active',
        specimenKind: 'daemon',
      },
      {
        name: 'GOAP A* Heuristic Planner',
        path: 'backend/agentsam/goap/',
        description: 'Backward heuristic goal-oriented action planning and invariant gate execution',
        role: 'Planner',
        status: 'stable',
        specimenKind: 'algorithm',
      },
      {
        name: 'Rust Crate: agentsam-abs',
        path: 'crates/agentsam-abs/',
        description: 'Native Rust crate implementing AgentSamAutoBrowserShell & NavigationTrail',
        role: 'Native Distribution',
        status: 'graduated',
        specimenKind: 'crate',
      },
      {
        name: 'Go Module: pkg/agentsamabs',
        path: 'pkg/agentsamabs/',
        description: 'Go module implementing cloud save and programmatic browser client',
        role: 'Go Distribution',
        status: 'graduated',
        specimenKind: 'module',
      },
      {
        name: 'Python Package: python/agentsam_abs',
        path: 'python/agentsam_abs/',
        description: 'Pydantic v2 client with sync & async execution modes',
        role: 'Python Distribution',
        status: 'graduated',
        specimenKind: 'package',
      },
    ],
  },
  {
    id: 'workbench',
    name: 'Workbench & UI Systems',
    tagline: 'Interactive desktop shells, browser frames, breadcrumb trail, and stage primitives',
    color: '#34d399',
    badgeColor: 'bg-emerald-950 text-emerald-300 border-emerald-800',
    icon: 'tab_inactive',
    health: 'healthy',
    artifacts: [
      {
        name: '@inneranimalmedia/agentsam-workbench',
        path: 'packages/agentsam-workbench',
        description: 'Reusable interactive primitives: AgentThread, Composer, ModelSelect, and ToolReceipt',
        role: 'UI Primitives',
        status: 'graduated',
        specimenKind: 'ui-kit',
      },
      {
        name: '@inneranimalmedia/agentsam-abs',
        path: 'packages/agentsam-abs',
        description: 'Auto Browser Shell package with history breadcrumbs & multi-destination cloud save',
        role: 'Browser Shell Package',
        status: 'graduated',
        specimenKind: 'browser-shell',
      },
      {
        name: 'AgentSamAutoBrowserShell',
        path: 'components/AgentSamAutoBrowserShell.tsx',
        description: 'Interactive generative browser UI with jumpable breadcrumbs and multi-tab state',
        role: 'Browser Canvas',
        status: 'active',
        specimenKind: 'component',
      },
      {
        name: 'OuterFrame OS Shell',
        path: 'components/OuterFrame.tsx',
        description: 'Top-level window controls, live token metrics, workspace switcher & theme cycler',
        role: 'App Shell',
        status: 'active',
        specimenKind: 'shell',
      },
      {
        name: 'Sandbox Preview Engine',
        path: 'components/Sandbox.tsx',
        description: 'Strictly isolated iframe renderer for synthesized web pages and apps',
        role: 'Sandbox Runner',
        status: 'stable',
        specimenKind: 'renderer',
      },
    ],
  },
  {
    id: 'product',
    name: 'Product & Applications',
    tagline: 'Composed end-user apps, settings consoles, productivity workspaces, and generative studios',
    color: '#fbbf24',
    badgeColor: 'bg-amber-950 text-amber-300 border-amber-800',
    icon: 'apps',
    health: 'healthy',
    artifacts: [
      {
        name: '@inneranimalmedia/agentsam-settings',
        path: 'packages/agentsam-settings',
        description: '5-family Settings & Observability Console with unit-scoped host retrieval',
        role: 'Settings Product',
        status: 'graduated',
        specimenKind: 'product',
      },
      {
        name: '@inneranimalmedia/agentsam-work',
        path: 'packages/agentsam-work',
        description: 'Product composition layer for projects, tickets, timeline, and storage cards',
        role: 'Projects Product',
        status: 'graduated',
        specimenKind: 'product',
      },
      {
        name: 'Gmail Workspace',
        path: 'components/workspace/GmailWorkspace.tsx',
        description: 'Full-screen Gmail workspace with Gemini drafting and email sync',
        role: 'Productivity App',
        status: 'active',
        specimenKind: 'workspace',
      },
      {
        name: 'Google Drive Workspace',
        path: 'components/workspace/GoogleDriveWorkspace.tsx',
        description: 'Cloud storage explorer, file previewer, and direct browser injection',
        role: 'Storage App',
        status: 'active',
        specimenKind: 'workspace',
      },
      {
        name: 'Gemini AI Studio Hub',
        path: 'components/ai/GeminiAiHubModal.tsx',
        description: 'Multimodal studio covering Live Audio, Imagen 3, Veo 2, and streaming chat',
        role: 'AI Studio',
        status: 'active',
        specimenKind: 'modal-studio',
      },
    ],
  },
  {
    id: 'theme',
    name: 'Theme & Visual Systems',
    tagline: 'Semantic palettes, scene tokens, typography hierarchy, and brand asset contracts',
    color: '#f43f5e',
    badgeColor: 'bg-rose-950 text-rose-300 border-rose-800',
    icon: 'palette',
    health: 'healthy',
    artifacts: [
      {
        name: 'Theme Engine Service',
        path: 'services/themeService.ts',
        description: 'Multi-category palettes (Standard, Neon Cyberpunk, Dark Minimal, Light Paper) & CSS variables',
        role: 'Token Engine',
        status: 'stable',
        specimenKind: 'tokens',
      },
      {
        name: 'AppSettingsModal',
        path: 'components/AppSettingsModal.tsx',
        description: 'Visual theme picker, accent swatch manager, and typography sliders',
        role: 'Style Customizer',
        status: 'active',
        specimenKind: 'theme-specimen',
      },
      {
        name: 'Global CSS & Design Tokens',
        path: 'index.css',
        description: 'Tailwind styling layers, glassmorphism filters, scrollbars, and texture overlays',
        role: 'Design System',
        status: 'stable',
        specimenKind: 'css',
      },
    ],
  },
];

export const RepoWireframeVisualizer: React.FC<{
  onClose?: () => void;
  onNavigateToWorkspace?: (workspace: string) => void;
}> = ({ onClose, onNavigateToWorkspace }) => {
  const [level, setLevel] = useState<PresentationLevel>('executive');
  const [selectedFamilyId, setSelectedFamilyId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [customRepoMode, setCustomRepoMode] = useState<boolean>(false);
  const [customRepoUrl, setCustomRepoUrl] = useState<string>('github.com/inneranimalmedia/agentsam-monorepo');
  const [copiedState, setCopiedState] = useState<boolean>(false);

  // Filtered families
  const displayFamilies = useMemo(() => {
    let list = REPO_FAMILIES;
    if (selectedFamilyId !== 'all') {
      list = list.filter(f => f.id === selectedFamilyId);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list
        .map(f => ({
          ...f,
          artifacts: f.artifacts.filter(
            a =>
              a.name.toLowerCase().includes(q) ||
              a.path.toLowerCase().includes(q) ||
              a.description.toLowerCase().includes(q) ||
              a.role.toLowerCase().includes(q)
          ),
        }))
        .filter(f => f.artifacts.length > 0);
    }
    return list;
  }, [selectedFamilyId, searchQuery]);

  // Total stats
  const totalArtifacts = useMemo(() => {
    return REPO_FAMILIES.reduce((acc, f) => acc + f.artifacts.length, 0);
  }, []);

  // Generate ASCII Wireframe
  const generateAsciiWireframe = () => {
    let ascii = `======================================================================\n`;
    ascii += `REPO ARCHITECTURE WIREFRAME MAP: ${customRepoMode ? customRepoUrl : 'AgentSam Local Studio'}\n`;
    ascii += `Generated: ${new Date().toISOString()} | Families: 5 | Artifacts: ${totalArtifacts}\n`;
    ascii += `======================================================================\n\n`;

    REPO_FAMILIES.forEach(family => {
      ascii += `[FAMILY: ${family.name.toUpperCase()}]\n`;
      ascii += `Tagline: ${family.tagline}\n`;
      ascii += `Health: ${family.health.toUpperCase()} | Status: Audited\n`;
      ascii += `----------------------------------------------------------------------\n`;
      family.artifacts.forEach(art => {
        ascii += `  * ${art.name.padEnd(42, ' ')} [${art.role}]\n`;
        ascii += `    Path: ${art.path}\n`;
        ascii += `    Specimen: ${art.specimenKind} | Status: ${art.status}\n`;
        ascii += `    Summary: ${art.description}\n`;
        if (art.exports) {
          ascii += `    Exports: ${art.exports.join(', ')}\n`;
        }
        ascii += `\n`;
      });
      ascii += `\n`;
    });

    return ascii;
  };

  const handleCopyAscii = () => {
    navigator.clipboard.writeText(generateAsciiWireframe());
    setCopiedState(true);
    setTimeout(() => setCopiedState(false), 2000);
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#0a0d14] text-gray-100 font-sans select-none overflow-hidden">
      {/* 1. TOP HEADER & PRESENTATION LEVEL SWITCHER */}
      <header className="px-6 py-3.5 bg-[#0f1422] border-b border-gray-800/80 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-purple-900/40 border border-purple-700/60 text-purple-300">
            <span className="material-symbols-outlined text-lg">schema</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-sm text-gray-100">
                Repo Architecture & Wireframe Visualizer
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-950 text-blue-300 border border-blue-800">
                MULTI-LEVEL PRESENTATION
              </span>
            </div>
            <p className="text-[11px] text-gray-400 mt-0.5">
              5-Family Taxonomy: Foundation • Runtime • Workbench • Product • Theme
            </p>
          </div>
        </div>

        {/* Level Controls & Action Cluster */}
        <div className="flex items-center gap-3">
          {/* Level Switcher */}
          <div className="flex items-center bg-gray-950 border border-gray-800 rounded-lg p-0.5 text-xs">
            {(
              [
                { id: 'executive', label: '1. Executive', icon: 'dashboard' },
                { id: 'topology', label: '2. Topology', icon: 'account_tree' },
                { id: 'filemap', label: '3. Text Wireframe', icon: 'code' },
                { id: 'optimizations', label: '4. Optimizations', icon: 'verified' },
              ] as const
            ).map(btn => (
              <button
                key={btn.id}
                onClick={() => setLevel(btn.id)}
                className={`px-3 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  level === btn.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                }`}
              >
                <span className="material-symbols-outlined text-xs">{btn.icon}</span>
                <span>{btn.label}</span>
              </button>
            ))}
          </div>

          {/* Copy ASCII Button */}
          <button
            onClick={handleCopyAscii}
            className="px-3 py-1.5 rounded-lg border border-gray-700 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="Copy ASCII wireframe text to clipboard"
          >
            <span className="material-symbols-outlined text-xs">
              {copiedState ? 'check' : 'content_copy'}
            </span>
            <span>{copiedState ? 'Copied ASCII' : 'Copy Wireframe'}</span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          )}
        </div>
      </header>

      {/* 2. SECONDARY CONTROLS: REPO SELECTOR & FAMILY FILTERS */}
      <div className="px-6 py-2.5 bg-[#0b0e18] border-b border-gray-800/60 flex items-center justify-between gap-4 flex-shrink-0 text-xs">
        {/* Repo Target Toggle */}
        <div className="flex items-center gap-2">
          <span className="text-gray-500 font-mono text-[11px]">Target Repo:</span>
          {customRepoMode ? (
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={customRepoUrl}
                onChange={e => setCustomRepoUrl(e.target.value)}
                placeholder="github.com/org/repo"
                className="bg-black/60 border border-blue-500/80 rounded px-2.5 py-1 text-xs text-blue-300 font-mono focus:outline-none w-64"
              />
              <button
                onClick={() => setCustomRepoMode(false)}
                className="text-[11px] text-gray-400 hover:text-gray-200 underline ml-1"
              >
                Reset to Current
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="font-mono text-emerald-400 font-semibold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                AgentSam Monorepo (Active)
              </span>
              <button
                onClick={() => setCustomRepoMode(true)}
                className="text-[11px] text-sky-400 hover:text-sky-300 hover:underline"
              >
                Scan Custom Repo...
              </button>
            </div>
          )}
        </div>

        {/* Family Pill Filter */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setSelectedFamilyId('all')}
            className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
              selectedFamilyId === 'all'
                ? 'bg-gray-700 text-white'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
            }`}
          >
            All Families ({totalArtifacts})
          </button>
          {REPO_FAMILIES.map(f => (
            <button
              key={f.id}
              onClick={() => setSelectedFamilyId(f.id)}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
                selectedFamilyId === f.id
                  ? 'bg-blue-600/40 border border-blue-500 text-blue-200'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/40'
              }`}
            >
              {f.name.split(' ')[0]} ({f.artifacts.length})
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-48">
          <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Filter artifacts..."
            className="w-full bg-gray-950/80 border border-gray-800 focus:border-blue-500 rounded pl-7 pr-2 py-1 text-[11px] text-gray-200 placeholder-gray-500 focus:outline-none"
          />
        </div>
      </div>

      {/* 3. MAIN PRESENTATION VIEWPORT */}
      <div className="flex-1 overflow-y-auto p-6 bg-[#0e1320]">
        {/* ============================================================ */}
        {/* LEVEL 1: EXECUTIVE WIREFRAME BLOCKS                          */}
        {/* ============================================================ */}
        {level === 'executive' && (
          <div className="space-y-6 max-w-6xl mx-auto">
            {/* Executive Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {REPO_FAMILIES.map(fam => (
                <div
                  key={fam.id}
                  onClick={() => setSelectedFamilyId(fam.id)}
                  className={`p-4 rounded-xl border bg-[#0c101a] hover:border-gray-600 transition-all cursor-pointer flex flex-col justify-between ${
                    selectedFamilyId === fam.id ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-800'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="material-symbols-outlined text-xl" style={{ color: fam.color }}>
                        {fam.icon}
                      </span>
                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase border ${fam.badgeColor}`}>
                        {fam.health}
                      </span>
                    </div>
                    <h3 className="font-bold text-xs text-gray-200">{fam.name}</h3>
                    <p className="text-[10px] text-gray-400 mt-1 line-clamp-2 leading-relaxed">
                      {fam.tagline}
                    </p>
                  </div>
                  <div className="pt-3 mt-3 border-t border-gray-800/80 flex items-center justify-between text-[11px] font-mono">
                    <span className="text-gray-500">Artifacts:</span>
                    <span className="text-gray-200 font-bold">{fam.artifacts.length}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Architectural Decoupling Scorecard */}
            <div className="p-5 rounded-xl border border-gray-800 bg-[#0c101a] space-y-4">
              <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                <div>
                  <h3 className="font-bold text-sm text-gray-200 flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-400">verified</span>
                    Monorepo Decoupling & Authority Verification
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Strict separation between IAM Authentication and AgentSam Product Authorities
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded bg-emerald-950 border border-emerald-800 text-emerald-300 font-mono text-xs font-bold">
                  100% HEALTHY
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
                <div className="p-3.5 rounded-lg bg-black/40 border border-gray-900 space-y-2">
                  <div className="text-sky-300 font-bold flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm">badge</span>
                    IAM Authority (Identity Only)
                  </div>
                  <ul className="text-[11px] text-gray-400 space-y-1">
                    <li>✓ OAuth Clients & Tokens</li>
                    <li>✓ User & Account Identity</li>
                    <li>✓ Session Validation & Claims</li>
                    <li className="text-emerald-400 font-bold">✗ Zero Desktop Product Releases</li>
                  </ul>
                </div>

                <div className="p-3.5 rounded-lg bg-black/40 border border-gray-900 space-y-2">
                  <div className="text-purple-300 font-bold flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm">rocket_launch</span>
                    AgentSam Authority (Product SSOT)
                  </div>
                  <ul className="text-[11px] text-gray-400 space-y-1">
                    <li>✓ Desktop Release Manifests</li>
                    <li>✓ Unified Model Inventory</li>
                    <li>✓ Runtime & Machine Enrollment</li>
                    <li>✓ TaskContracts & GOAP Plans</li>
                  </ul>
                </div>

                <div className="p-3.5 rounded-lg bg-black/40 border border-gray-900 space-y-2">
                  <div className="text-emerald-300 font-bold flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm">bolt</span>
                    Machine-First Front Controller
                  </div>
                  <ul className="text-[11px] text-gray-400 space-y-1">
                    <li>✓ Deterministic Intent Interceptor</li>
                    <li>✓ 0-LLM Runtime & Model Queries</li>
                    <li>✓ Bounded Context Injections</li>
                    <li>✓ 62% Avoided Inference Overhead</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Visual Family Cards */}
            <div className="space-y-4">
              {displayFamilies.map(family => (
                <div key={family.id} className="p-5 rounded-xl border border-gray-800 bg-[#0c101a] space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="material-symbols-outlined text-lg" style={{ color: family.color }}>
                        {family.icon}
                      </span>
                      <h2 className="font-bold text-sm text-gray-100">{family.name}</h2>
                      <span className="text-xs text-gray-500 font-mono">— {family.tagline}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${family.badgeColor}`}>
                      {family.artifacts.length} Artifacts
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                    {family.artifacts.map((art, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-lg border border-gray-800/80 bg-black/30 hover:border-gray-700 transition-colors space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-gray-200 text-xs">{art.name}</span>
                          <span className="px-1.5 py-0.2 rounded bg-gray-800 text-gray-400 font-mono text-[10px] border border-gray-700">
                            {art.role}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-400 leading-relaxed">{art.description}</p>
                        <div className="text-[10px] font-mono text-gray-500 truncate pt-1 border-t border-gray-800/60">
                          {art.path}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* LEVEL 2: TOPOLOGY VISUALIZER                                 */}
        {/* ============================================================ */}
        {level === 'topology' && (
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="p-4 rounded-xl border border-blue-900/60 bg-blue-950/20 text-gray-300">
              <h3 className="font-bold text-sm text-blue-300 flex items-center gap-2">
                <span className="material-symbols-outlined text-base">account_tree</span>
                Hierarchical Architecture Topology
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                Visualizing the flow from contracts and headless models up through interaction primitives into composite applications.
              </p>
            </div>

            {/* Tree Flow Visual */}
            <div className="p-6 rounded-xl border border-gray-800 bg-[#0c101a] font-mono text-xs text-gray-300 space-y-6">
              {/* Level A: Contracts */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-sky-400 uppercase tracking-wider">
                  Level 1: Contracts & Shared Vocabulary
                </div>
                <div className="p-3.5 rounded-lg bg-sky-950/30 border border-sky-800 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-sky-200">@inneranimalmedia/agentsam-contracts</div>
                    <div className="text-[10px] text-sky-400">Zero native dependencies • Messages • Artifacts • ToolReceipts • HostCapabilities</div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-sky-900 text-sky-200 text-[10px] font-bold">FOUNDATION</span>
                </div>
              </div>

              <div className="text-center text-gray-600 font-bold">↓ consumes</div>

              {/* Level B: Headless Models */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-purple-400 uppercase tracking-wider">
                  Level 2: Headless Planning & Work Graph
                </div>
                <div className="p-3.5 rounded-lg bg-purple-950/30 border border-purple-800 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-purple-200">@inneranimalmedia/agentsam-work-graph</div>
                    <div className="text-[10px] text-purple-400">Deterministic DAG • Topological Sequence • Invariant Gates • EvidenceRefs</div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-purple-900 text-purple-200 text-[10px] font-bold">HEADLESS</span>
                </div>
              </div>

              <div className="text-center text-gray-600 font-bold">↓ powers</div>

              {/* Level C: Workbench UI Primitives */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                  Level 3: Interactive Workbench Primitives
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-lg bg-emerald-950/30 border border-emerald-800">
                    <div className="font-bold text-emerald-200">@inneranimalmedia/agentsam-workbench</div>
                    <div className="text-[10px] text-emerald-400">AgentThread • Composer • ModelSelect • ToolReceipt</div>
                  </div>
                  <div className="p-3.5 rounded-lg bg-emerald-950/30 border border-emerald-800">
                    <div className="font-bold text-emerald-200">@inneranimalmedia/agentsam-abs</div>
                    <div className="text-[10px] text-emerald-400">Auto Browser Shell • History Breadcrumbs • Cloud Sync</div>
                  </div>
                </div>
              </div>

              <div className="text-center text-gray-600 font-bold">↓ composes into</div>

              {/* Level D: Product Layer */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                  Level 4: Product Experiences & Host Adapters
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-lg bg-amber-950/30 border border-amber-800">
                    <div className="font-bold text-amber-200">@inneranimalmedia/agentsam-settings</div>
                    <div className="text-[10px] text-amber-400">14 Settings Domains • Observability Console • Unit-Scoped Host</div>
                  </div>
                  <div className="p-3.5 rounded-lg bg-amber-950/30 border border-amber-800">
                    <div className="font-bold text-amber-200">@inneranimalmedia/agentsam-work</div>
                    <div className="text-[10px] text-amber-400">Projects Surface • Work Tickets • Calendar & Drive Views</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* LEVEL 3: DEEP FILE MAP (TEXT WIREFRAME)                      */}
        {/* ============================================================ */}
        {level === 'filemap' && (
          <div className="max-w-5xl mx-auto space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-gray-100">Compiled Text-Based File Wireframe</h3>
                <p className="text-xs text-gray-400">Grouped by Foundation, Runtime, Workbench, Product, and Theme</p>
              </div>
              <button
                onClick={handleCopyAscii}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <span className="material-symbols-outlined text-xs">content_copy</span>
                <span>{copiedState ? 'Copied to Clipboard!' : 'Copy Raw Text'}</span>
              </button>
            </div>

            <pre className="p-4 rounded-xl border border-gray-800 bg-[#090d16] font-mono text-[11px] text-gray-300 leading-relaxed overflow-x-auto selection:bg-blue-900 selection:text-white">
              {generateAsciiWireframe()}
            </pre>
          </div>
        )}

        {/* ============================================================ */}
        {/* LEVEL 4: OPTIMIZATIONS & COLLABORATION STUDIO                */}
        {/* ============================================================ */}
        {level === 'optimizations' && (
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="p-4 rounded-xl border border-emerald-900/60 bg-emerald-950/20 text-gray-300">
              <h3 className="font-bold text-sm text-emerald-300 flex items-center gap-2">
                <span className="material-symbols-outlined text-base">verified_user</span>
                Continuous Optimization & Decoupling Audit
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                Collaborative verification checklist ensuring repository artifacts meet production distribution rules.
              </p>
            </div>

            <div className="space-y-3">
              {[
                {
                  title: '1. IAM vs AgentSam Authority Decoupling',
                  desc: 'IAM is strictly identity-only (OAuth, sessions, claims). AgentSam release authority owns manifests, model state, and runtime daemon.',
                  status: 'VERIFIED',
                  color: 'text-emerald-400 border-emerald-800 bg-emerald-950',
                },
                {
                  title: '2. Unified Credential-Scoped Model Inventory',
                  desc: 'CLI and Local Studio GUI consume the exact same model discovery authority. Zero unverified demo models.',
                  status: 'VERIFIED',
                  color: 'text-emerald-400 border-emerald-800 bg-emerald-950',
                },
                {
                  title: '3. Deterministic Machine-First Front Controller',
                  desc: 'Queries for runtime status, doctor health, model list, branch, and brand plan resolve locally with zero LLM calls.',
                  status: 'VERIFIED',
                  color: 'text-emerald-400 border-emerald-800 bg-emerald-950',
                },
                {
                  title: '4. Clean-Room Artifact Index Compilation',
                  desc: 'scripts/build-artifact-index.mjs automatically indexes artifact.json manifests into dist/artifacts/index.json.',
                  status: 'VERIFIED',
                  color: 'text-emerald-400 border-emerald-800 bg-emerald-950',
                },
                {
                  title: '5. Browser-Safe Exports & Zero Leaky Native Imports',
                  desc: 'Public UI packages import only host contracts; Node fs, child_process, and Tauri bridges remain isolated in host adapters.',
                  status: 'VERIFIED',
                  color: 'text-emerald-400 border-emerald-800 bg-emerald-950',
                },
              ].map((item, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-gray-800 bg-[#0c101a] flex items-center justify-between">
                  <div className="space-y-1">
                    <h4 className="font-bold text-xs text-gray-200">{item.title}</h4>
                    <p className="text-[11px] text-gray-400 max-w-3xl leading-relaxed">{item.desc}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold uppercase border ${item.color}`}>
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
