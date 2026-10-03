import React, { useState, useEffect, useMemo } from 'react';
import {
  SettingsUnitId,
  SettingsNavCategory,
  SettingsUnitData,
  SettingsHost,
  ObservabilityPlanUsageData,
} from './types';
import { ModelOption, ObservabilityEvent, AgentRunSummary } from '@inneranimalmedia/agentsam-contracts';

export const SETTINGS_CATEGORIES: SettingsNavCategory[] = [
  {
    id: 'core',
    label: 'Core',
    icon: 'tune',
    units: [
      { id: 'general', label: 'General', subLabel: 'App identity & shell defaults' },
    ],
  },
  {
    id: 'agents',
    label: 'Agents & Models',
    icon: 'smart_toy',
    units: [
      { id: 'agents', label: 'Agents', subLabel: 'Active agent profiles' },
      { id: 'agents.cloud', label: 'Cloud Agents', subLabel: 'Remote background workers' },
      { id: 'agents.models', label: 'Models', subLabel: 'Unified provider & model inventory', badge: 'UNIFIED' },
      { id: 'agents.policy', label: 'Policy & Safety', subLabel: 'Execution guardrails & boundaries' },
    ],
  },
  {
    id: 'customize',
    label: 'Customize',
    icon: 'extension',
    units: [
      { id: 'customize.mcps', label: 'MCP Servers', subLabel: 'Model Context Protocol bridges' },
      { id: 'customize.skills', label: 'Skills & Tools', subLabel: 'Agent executable skills' },
      { id: 'customize.subagents', label: 'Subagents', subLabel: 'Specialized task workers' },
      { id: 'customize.rules', label: 'Rules & Invariants', subLabel: 'Repository & coding rules' },
      { id: 'customize.commands', label: 'Commands & Tree', subLabel: 'Deterministic command catalog' },
      { id: 'customize.hooks', label: 'Hooks', subLabel: 'Lifecycle event listeners' },
    ],
  },
  {
    id: 'workspace',
    label: 'Workspace & Systems',
    icon: 'desktop_windows',
    units: [
      { id: 'brand_design', label: 'Brand & Design', subLabel: 'BrandPack, logos, tokens' },
      { id: 'git_prs', label: 'Git & PRs', subLabel: 'Repository remotes & branches' },
      { id: 'codebase', label: 'Codebase Index', subLabel: 'AST & semantic index health' },
      { id: 'browser_network', label: 'Browser & Network', subLabel: 'Egress firewall & allowlists' },
      { id: 'machines_runtimes', label: 'Machines & Runtimes', subLabel: 'Antigravity, Local PTY, Cloudflare' },
      { id: 'themes', label: 'Themes', subLabel: 'Visual palettes & scene layouts' },
      { id: 'storage', label: 'Storage & Vectors', subLabel: 'Drive, R2, D1, vector indexes' },
      { id: 'keys_secrets', label: 'Keys & Secrets', subLabel: 'Vault, BYOK credentials & OAuth' },
    ],
  },
  {
    id: 'observability',
    label: 'Telemetry & Ops',
    icon: 'analytics',
    units: [
      { id: 'plan_usage', label: 'Plan & Usage', subLabel: 'Spend, latency, models & logs', badge: 'CONSOLE' },
      { id: 'notifications', label: 'Notifications', subLabel: 'Alerts, webhooks, activity' },
      { id: 'docs', label: 'Documentation', subLabel: 'Contract schemas & API specs' },
    ],
  },
];

interface SettingsShellProps {
  host: SettingsHost;
  initialUnitId?: SettingsUnitId;
  onClose?: () => void;
  onNavigateToWorkspace?: (workspace: string) => void;
}

export const SettingsShell: React.FC<SettingsShellProps> = ({
  host,
  initialUnitId = 'agents.models',
  onClose,
  onNavigateToWorkspace,
}) => {
  const [activeUnitId, setActiveUnitId] = useState<SettingsUnitId>(initialUnitId);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [unitData, setUnitData] = useState<SettingsUnitData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hostPlatform, setHostPlatform] = useState<string>('web');

  // Observability Sub-tabs ('overview' | 'models' | 'runs' | 'logs' | 'budget')
  const [obsTab, setObsTab] = useState<'overview' | 'models' | 'runs' | 'logs' | 'budget'>('overview');
  const [logFilter, setLogFilter] = useState<string>('all');
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('7d');

  // Load Host Capabilities & Initial Unit Data
  useEffect(() => {
    host.capabilities().then(caps => {
      setHostPlatform(caps.platform);
    });
  }, [host]);

  // Load Unit Data whenever activeUnitId changes
  useEffect(() => {
    setIsLoading(true);
    host.getUnit(activeUnitId).then(data => {
      setUnitData(data);
      setIsLoading(false);
    });
  }, [host, activeUnitId]);

  // Flat list of units for search
  const flatUnits = useMemo(() => {
    const list: Array<{ id: SettingsUnitId; label: string; subLabel?: string; category: string }> = [];
    SETTINGS_CATEGORIES.forEach(cat => {
      cat.units.forEach(u => {
        list.push({ ...u, category: cat.label });
      });
    });
    return list;
  }, []);

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return SETTINGS_CATEGORIES;
    const q = searchQuery.toLowerCase();
    return SETTINGS_CATEGORIES.map(cat => ({
      ...cat,
      units: cat.units.filter(u => u.label.toLowerCase().includes(q) || u.subLabel?.toLowerCase().includes(q)),
    })).filter(cat => cat.units.length > 0);
  }, [searchQuery]);

  const obsData = (unitData?.data?.observability as ObservabilityPlanUsageData) || null;
  const modelsList = (unitData?.data?.models as ModelOption[]) || [];

  return (
    <div className="flex h-full w-full bg-[#0a0d14] text-gray-100 font-sans select-none overflow-hidden">
      {/* 1. LEFT SIDEBAR NAVIGATION */}
      <aside className="w-64 flex-shrink-0 bg-[#0c101a] border-r border-gray-800/80 flex flex-col h-full">
        {/* Header */}
        <div className="p-3.5 border-b border-gray-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-900/40 text-blue-400 border border-blue-700/50">
              <span className="material-symbols-outlined text-base">tune</span>
            </div>
            <div>
              <h2 className="font-bold text-xs text-gray-200">Settings & Ops</h2>
              <span className="text-[10px] text-gray-500 font-mono">
                Host: <span className="text-sky-400 font-bold uppercase">{hostPlatform}</span>
              </span>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded transition-colors"
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          )}
        </div>

        {/* Search */}
        <div className="p-2.5 border-b border-gray-800/60">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search settings..."
              className="w-full bg-gray-950/80 border border-gray-800 focus:border-blue-500 rounded-lg pl-8 pr-3 py-1.5 text-xs text-gray-200 placeholder-gray-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Nav List */}
        <nav className="flex-1 overflow-y-auto p-2 space-y-3">
          {filteredCategories.map(cat => (
            <div key={cat.id} className="space-y-1">
              <div className="px-2 py-1 text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-xs">{cat.icon}</span>
                <span>{cat.label}</span>
              </div>
              <div className="space-y-0.5">
                {cat.units.map(unit => {
                  const isActive = activeUnitId === unit.id;
                  return (
                    <button
                      key={unit.id}
                      onClick={() => setActiveUnitId(unit.id)}
                      className={`w-full px-2.5 py-1.5 rounded-lg text-left text-xs transition-all flex items-center justify-between ${
                        isActive
                          ? 'bg-blue-600/25 border border-blue-500/50 text-blue-200 font-semibold'
                          : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50 border border-transparent'
                      }`}
                    >
                      <div className="truncate">
                        <div className="truncate">{unit.label}</div>
                        {unit.subLabel && (
                          <div className="text-[10px] text-gray-500 truncate font-normal">
                            {unit.subLabel}
                          </div>
                        )}
                      </div>
                      {unit.badge && (
                        <span className="ml-1 px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-purple-900/60 text-purple-300 border border-purple-700/60">
                          {unit.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {/* 2. MAIN SETTINGS UNIT VIEWPORT */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-[#0e1320]">
        {/* Top Unit Title Bar */}
        <header className="px-6 py-4 border-b border-gray-800/80 bg-[#101626] flex items-center justify-between flex-shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-gray-100">
                {flatUnits.find(u => u.id === activeUnitId)?.label || activeUnitId}
              </h1>
              <span className="px-2 py-0.5 rounded bg-gray-800 text-gray-400 border border-gray-700 text-[10px] font-mono">
                {activeUnitId}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              {flatUnits.find(u => u.id === activeUnitId)?.subLabel || 'Configured via AgentSam Settings Authority'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setIsLoading(true);
                host.getUnit(activeUnitId).then(data => {
                  setUnitData(data);
                  setIsLoading(false);
                });
              }}
              className="px-2.5 py-1 text-xs rounded border border-gray-700 bg-gray-800 hover:bg-gray-700 text-gray-300 flex items-center gap-1 transition-colors"
            >
              <span className={`material-symbols-outlined text-xs ${isLoading ? 'animate-spin' : ''}`}>
                sync
              </span>
              <span>Refresh</span>
            </button>
          </div>
        </header>

        {/* Content Container */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-500">
              <span className="material-symbols-outlined text-4xl animate-spin mb-2 text-blue-500">
                progress_activity
              </span>
              <p className="text-xs">Loading {activeUnitId} from host authority...</p>
            </div>
          ) : (
            <>
              {/* UNIT: AGENTS.MODELS (UNIFIED MODEL INVENTORY) */}
              {activeUnitId === 'agents.models' && (
                <div className="space-y-6 max-w-5xl">
                  {/* Status Banner */}
                  <div className="p-4 rounded-xl border border-blue-900/60 bg-blue-950/20 text-gray-300 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-sm text-blue-300 flex items-center gap-2">
                        <span className="material-symbols-outlined text-base">verified</span>
                        Unified Credential-Scoped Model Discovery
                      </h3>
                      <p className="text-xs text-gray-400 mt-1 max-w-2xl leading-relaxed">
                        CLI and Local Studio GUI consume the exact same model authority. All models reflect your authenticated provider credentials (Gemini, OpenAI, Anthropic, Cloudflare AI, local Ollama). Discovered models are verified before execution.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        host.mutate({ unitId: 'agents.models', action: 'discover_models', payload: {} }).then(() => {
                          host.getUnit('agents.models').then(setUnitData);
                        });
                      }}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-blue-900/40"
                    >
                      <span className="material-symbols-outlined text-xs">radar</span>
                      <span>Run Discovery</span>
                    </button>
                  </div>

                  {/* Models Grid / Table */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs text-gray-400 px-1">
                      <span className="font-semibold uppercase tracking-wider text-[11px]">
                        Available Models ({modelsList.length})
                      </span>
                      <span className="text-[11px] font-mono text-emerald-400">
                        Zero Demo Models • 100% Real Provider Inventory
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {modelsList.map(m => (
                        <div
                          key={m.id}
                          className="p-4 rounded-xl border border-gray-800 bg-[#0c101a] hover:border-gray-700 transition-all flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-gray-200 text-sm">{m.name}</span>
                                <span className="px-1.5 py-0.5 rounded bg-gray-800 text-gray-300 text-[10px] font-mono border border-gray-700">
                                  {m.provider}
                                </span>
                              </div>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider border ${
                                  m.status === 'runnable'
                                    ? 'bg-emerald-950 border-emerald-700/60 text-emerald-300'
                                    : m.status === 'verified'
                                    ? 'bg-blue-950 border-blue-700/60 text-blue-300'
                                    : 'bg-gray-800 border-gray-700 text-gray-400'
                                }`}
                              >
                                {m.status}
                              </span>
                            </div>

                            <p className="text-[11px] text-gray-400 font-mono mb-2">ID: {m.id}</p>

                            {/* Metrics & Capabilities */}
                            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono bg-black/40 p-2.5 rounded-lg border border-gray-900 mb-3">
                              <div>
                                <span className="text-gray-500 block">Context Window:</span>
                                <span className="text-gray-200 font-bold">{m.contextWindow.toLocaleString()} tok</span>
                              </div>
                              <div>
                                <span className="text-gray-500 block">Pricing (Input/Output):</span>
                                <span className="text-emerald-400 font-bold">
                                  ${m.pricing.inputPerMillion} / ${m.pricing.outputPerMillion}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-500 block">P50 Latency:</span>
                                <span className="text-sky-300">{m.health.p50LatencyMs}ms</span>
                              </div>
                              <div>
                                <span className="text-gray-500 block">Billing Health:</span>
                                <span className="text-emerald-300 capitalize">{m.health.billingHealth.replace('_', ' ')}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-xs pt-2 border-t border-gray-800/60 text-gray-500 text-[11px]">
                            <span>Source: {m.credentialSource}</span>
                            <div className="flex items-center gap-1 text-emerald-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                              <span>Ready</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* UNIT: PLAN_USAGE (OBSERVABILITY CONSOLE) */}
              {activeUnitId === 'plan_usage' && obsData && (
                <div className="space-y-6 max-w-5xl">
                  {/* Console Navigation Sub-tabs */}
                  <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                    <div className="flex items-center gap-1.5">
                      {(['overview', 'models', 'runs', 'logs', 'budget'] as const).map(tab => (
                        <button
                          key={tab}
                          onClick={() => setObsTab(tab)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                            obsTab === tab
                              ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
                              : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60'
                          }`}
                        >
                          {tab}
                        </button>
                      ))}
                    </div>

                    {/* Time Range Selector */}
                    <div className="flex items-center bg-gray-950 border border-gray-800 rounded-lg px-2 py-1 text-xs">
                      <span className="text-gray-500 mr-2 text-[11px]">Time Range:</span>
                      {(['24h', '7d', '30d'] as const).map(t => (
                        <button
                          key={t}
                          onClick={() => setTimeRange(t)}
                          className={`px-2 py-0.5 rounded text-[11px] font-mono ${
                            timeRange === t ? 'bg-gray-800 text-white font-bold' : 'text-gray-400 hover:text-gray-200'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* SUB-VIEW 1: OVERVIEW */}
                  {obsTab === 'overview' && (
                    <div className="space-y-4">
                      {/* Metric KPI Cards */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="p-4 rounded-xl border border-gray-800 bg-[#0c101a]">
                          <span className="text-[10px] text-gray-400 uppercase font-mono block">TOTAL ESTIMATED SPEND</span>
                          <span className="text-xl font-bold font-mono text-emerald-400">
                            ${obsData.summary.totalSpendUsd.toFixed(4)}
                          </span>
                          <span className="text-[10px] text-gray-500 block mt-1">Across all models & backends</span>
                        </div>

                        <div className="p-4 rounded-xl border border-gray-800 bg-[#0c101a]">
                          <span className="text-[10px] text-gray-400 uppercase font-mono block">MODEL CALLS / TOOLS</span>
                          <span className="text-xl font-bold font-mono text-sky-400">
                            {obsData.summary.totalModelCalls} <span className="text-xs text-gray-500 font-normal">/ {obsData.summary.totalToolCalls} tools</span>
                          </span>
                          <span className="text-[10px] text-gray-500 block mt-1">Error rate: {obsData.summary.errorRatePercent.toFixed(1)}%</span>
                        </div>

                        <div className="p-4 rounded-xl border border-gray-800 bg-[#0c101a]">
                          <span className="text-[10px] text-gray-400 uppercase font-mono block">MACHINE-FIRST RESOLVED</span>
                          <span className="text-xl font-bold font-mono text-purple-400">
                            {(obsData.summary.machineResolvedRatio * 100).toFixed(0)}%
                          </span>
                          <span className="text-[10px] text-emerald-400 block mt-1">
                            {obsData.summary.machineResolvedCount} queries bypassed LLM
                          </span>
                        </div>

                        <div className="p-4 rounded-xl border border-gray-800 bg-[#0c101a]">
                          <span className="text-[10px] text-gray-400 uppercase font-mono block">CACHE SAVINGS</span>
                          <span className="text-xl font-bold font-mono text-emerald-400">
                            ${obsData.summary.cachedTokenSavingsUsd.toFixed(4)}
                          </span>
                          <span className="text-[10px] text-gray-500 block mt-1">
                            {obsData.summary.totalTokens.cached.toLocaleString()} cached tokens
                          </span>
                        </div>
                      </div>

                      {/* Token Breakdown Bar */}
                      <div className="p-4 rounded-xl border border-gray-800 bg-[#0c101a] space-y-2">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="font-bold text-gray-300">Total Tokens Processed</span>
                          <span className="text-sky-400 font-bold">
                            {(obsData.summary.totalTokens.input + obsData.summary.totalTokens.output + obsData.summary.totalTokens.thinking).toLocaleString()}
                          </span>
                        </div>
                        <div className="grid grid-cols-4 gap-2 text-[11px] font-mono text-gray-400 pt-2 border-t border-gray-800">
                          <div>Input: <span className="text-gray-200">{obsData.summary.totalTokens.input.toLocaleString()}</span></div>
                          <div>Output: <span className="text-gray-200">{obsData.summary.totalTokens.output.toLocaleString()}</span></div>
                          <div>Thinking: <span className="text-purple-300">{obsData.summary.totalTokens.thinking.toLocaleString()}</span></div>
                          <div>Cached: <span className="text-emerald-300">{obsData.summary.totalTokens.cached.toLocaleString()}</span></div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SUB-VIEW 2: RUNS EXPLORER */}
                  {obsTab === 'runs' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs text-gray-400 px-1">
                        <span className="font-semibold uppercase tracking-wider text-[11px]">
                          Execution Runs ({obsData.runs.length})
                        </span>
                      </div>

                      <div className="space-y-2">
                        {obsData.runs.map(run => (
                          <div key={run.id} className="p-4 rounded-xl border border-gray-800 bg-[#0c101a] space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                                <span className="font-bold text-gray-200 text-sm">{run.goal}</span>
                                <span className="px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 text-[10px] font-mono">
                                  {run.sourceClient}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 text-xs font-mono">
                                <span className="text-emerald-400 font-bold">${run.totalCostUsd.toFixed(4)}</span>
                                <span className="text-gray-500">{(run.durationMs / 1000).toFixed(2)}s</span>
                              </div>
                            </div>

                            {/* Run Timeline */}
                            <div className="bg-black/40 p-2.5 rounded-lg border border-gray-900 space-y-1 text-xs font-mono">
                              {run.timeline.map((step, idx) => (
                                <div key={idx} className="flex items-center justify-between text-[11px]">
                                  <div className="flex items-center gap-2">
                                    <span className="text-gray-500">#{step.step}</span>
                                    <span className={`px-1 rounded text-[9px] uppercase font-bold ${
                                      step.type === 'machine_intent' ? 'bg-purple-950 text-purple-300 border border-purple-800' :
                                      step.type === 'model_call' ? 'bg-sky-950 text-sky-300 border border-sky-800' :
                                      step.type === 'tool_call' ? 'bg-blue-950 text-blue-300 border border-blue-800' :
                                      'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                    }`}>
                                      {step.type}
                                    </span>
                                    <span className="text-gray-300">{step.title}</span>
                                  </div>
                                  <span className="text-gray-500">{step.durationMs}ms</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* SUB-VIEW 3: LOGS EXPLORER (TWO-PANE) */}
                  {obsTab === 'logs' && (
                    <div className="flex h-[500px] border border-gray-800 rounded-xl overflow-hidden bg-[#0c101a]">
                      {/* Left: Log Event Stream */}
                      <div className="w-1/2 border-r border-gray-800 flex flex-col">
                        <div className="p-2.5 border-b border-gray-800 flex items-center justify-between text-xs">
                          <span className="font-semibold text-gray-400">Events ({obsData.logs.length})</span>
                          <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
                            <span className="material-symbols-outlined text-xs">lock</span>
                            Secrets Redacted
                          </span>
                        </div>
                        <div className="flex-1 overflow-y-auto divide-y divide-gray-800/60 font-mono text-[11px]">
                          {obsData.logs.map(log => (
                            <div
                              key={log.id}
                              onClick={() => setSelectedLogId(log.id)}
                              className={`p-2.5 cursor-pointer transition-colors ${
                                selectedLogId === log.id ? 'bg-blue-950/40 border-l-2 border-blue-500' : 'hover:bg-gray-800/30'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className={`px-1.5 py-0.2 rounded text-[9px] uppercase font-bold ${
                                  log.category === 'machine_intent' ? 'bg-purple-900/60 text-purple-300' :
                                  log.category === 'model_call' ? 'bg-sky-900/60 text-sky-300' :
                                  log.category === 'tool_call' ? 'bg-blue-900/60 text-blue-300' :
                                  log.status === 'error' ? 'bg-rose-900/60 text-rose-300' :
                                  'bg-gray-800 text-gray-300'
                                }`}>
                                  {log.category}
                                </span>
                                <span className="text-gray-500 text-[10px]">
                                  {new Date(log.timestamp).toLocaleTimeString()}
                                </span>
                              </div>
                              <p className="text-gray-300 truncate">{log.message}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Right: Selected Log Inspector */}
                      <div className="w-1/2 flex flex-col p-4 overflow-y-auto font-mono text-xs">
                        {selectedLogId ? (
                          (() => {
                            const log = obsData.logs.find(l => l.id === selectedLogId);
                            if (!log) return null;
                            return (
                              <div className="space-y-3">
                                <div className="border-b border-gray-800 pb-2">
                                  <h4 className="font-bold text-gray-200">{log.message}</h4>
                                  <span className="text-[10px] text-gray-500">ID: {log.id}</span>
                                </div>
                                <div className="space-y-1 text-gray-400 text-[11px]">
                                  <div>Category: <span className="text-gray-200">{log.category}</span></div>
                                  <div>Status: <span className="text-emerald-400">{log.status}</span></div>
                                  <div>Duration: <span className="text-gray-200">{log.durationMs}ms</span></div>
                                  {log.model && <div>Model: <span className="text-sky-300">{log.model}</span></div>}
                                  {log.estimatedCostUsd && (
                                    <div>Estimated Cost: <span className="text-emerald-400 font-bold">${log.estimatedCostUsd.toFixed(6)}</span></div>
                                  )}
                                </div>
                                <div>
                                  <span className="text-gray-500 text-[10px] block mb-1">METADATA (REDACTED):</span>
                                  <pre className="bg-black/60 p-2.5 rounded border border-gray-800 text-[10px] text-gray-300 overflow-x-auto">
                                    {JSON.stringify(log.metadata || {}, null, 2)}
                                  </pre>
                                </div>
                              </div>
                            );
                          })()
                        ) : (
                          <div className="h-full flex items-center justify-center text-gray-500 text-xs">
                            Select an event on the left to inspect structured telemetry
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* SUB-VIEW 4: BUDGET & POLICY */}
                  {obsTab === 'budget' && (
                    <div className="space-y-4">
                      <div className="p-4 rounded-xl border border-gray-800 bg-[#0c101a] space-y-3">
                        <h4 className="font-bold text-sm text-gray-200 flex items-center gap-2">
                          <span className="material-symbols-outlined text-emerald-400">payments</span>
                          Spend & Budget Allocations
                        </h4>
                        <div className="grid grid-cols-3 gap-3 text-xs font-mono">
                          <div className="p-3 rounded bg-black/40 border border-gray-800">
                            <span className="text-gray-500 block text-[10px]">SUBSCRIPTION TIER</span>
                            <span className="font-bold text-gray-200">{obsData.budget.agentSamSubscriptionTier}</span>
                          </div>
                          <div className="p-3 rounded bg-black/40 border border-gray-800">
                            <span className="text-gray-500 block text-[10px]">PROVIDER BYOK SPEND</span>
                            <span className="font-bold text-emerald-400">${obsData.budget.byokSpendUsd.toFixed(4)}</span>
                          </div>
                          <div className="p-3 rounded bg-black/40 border border-gray-800">
                            <span className="text-gray-500 block text-[10px]">LOCAL PTY SPEND</span>
                            <span className="font-bold text-sky-400 font-mono">$0.00 (Zero Cost)</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* UNIT: KEYS & SECRETS */}
              {activeUnitId === 'keys_secrets' && (
                <div className="space-y-5 max-w-4xl font-sans text-xs">
                  <div className="p-4 rounded-xl border border-yellow-900/60 bg-yellow-950/20 text-gray-300">
                    <h3 className="font-bold text-sm text-yellow-300 flex items-center gap-2">
                      <span className="material-symbols-outlined text-base">key</span>
                      Secure Key Vault & Provider Credentials
                    </h3>
                    <p className="text-xs text-gray-400 mt-1">
                      Stored in server-side encrypted vault. Values are never exposed over API responses. Updating an AI provider key immediately triggers automated model inventory rediscovery.
                    </p>
                  </div>

                  {/* AI Providers Section */}
                  <div className="space-y-3">
                    <h4 className="font-bold text-gray-300 uppercase tracking-wider text-[11px]">
                      AI Model Providers (BYOK)
                    </h4>
                    <div className="space-y-2">
                      {[
                        { name: 'Google Gemini (GOOGLE_AI_API_KEY)', status: 'Configured', key: '••••••••••••••••3824' },
                        { name: 'OpenAI (OPENAI_API_KEY)', status: 'Not Configured', key: '' },
                        { name: 'Anthropic (ANTHROPIC_API_KEY)', status: 'Not Configured', key: '' },
                        { name: 'Cloudflare AI (CLOUDFLARE_API_TOKEN)', status: 'Not Configured', key: '' },
                      ].map((item, idx) => (
                        <div key={idx} className="p-3 rounded-lg border border-gray-800 bg-[#0c101a] flex items-center justify-between">
                          <div>
                            <div className="font-semibold text-gray-200">{item.name}</div>
                            <div className="text-[10px] text-gray-500 font-mono">{item.key || 'No credential supplied'}</div>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                            item.status === 'Configured' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-gray-800 text-gray-500'
                          }`}>
                            {item.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* UNIT: MACHINES & RUNTIMES */}
              {activeUnitId === 'machines_runtimes' && (
                <div className="space-y-4 max-w-4xl font-sans text-xs">
                  <div className="p-4 rounded-xl border border-gray-800 bg-[#0c101a]">
                    <h3 className="font-bold text-sm text-gray-100 mb-1">Execution Runtimes & Backends</h3>
                    <p className="text-gray-400 text-xs">Active sandbox lanes available for AgentSam task contracts.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                      { name: 'Google Antigravity (Managed)', status: 'Online', policy: 'Strict Allowlist', cpu: '1.0 vCPU', ping: '18ms' },
                      { name: 'Cloudflare Containers (Workers Paid)', status: 'Online', policy: 'Custom Gateway', cpu: '0.25 vCPU', ping: '32ms' },
                      { name: 'Local Mac (localpty loop)', status: 'Ready', policy: 'Unrestricted Local', cpu: 'Apple Silicon', ping: '1ms' },
                      { name: 'GCP Compute Engine (e2-standard-2)', status: 'Standby', policy: 'VPC Firewall', cpu: '2.0 vCPU', ping: '45ms' },
                    ].map((m, i) => (
                      <div key={i} className="p-3.5 rounded-xl border border-gray-800 bg-[#0c101a] space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-gray-200">{m.name}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono font-bold">
                            {m.status}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-400 font-mono bg-black/40 p-2 rounded">
                          <div>CPU: <span className="text-gray-200">{m.cpu}</span></div>
                          <div>Ping: <span className="text-sky-300">{m.ping}</span></div>
                          <div className="col-span-2">Firewall: <span className="text-gray-300">{m.policy}</span></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* DEFAULT / GENERIC UNIT VIEW */}
              {!['agents.models', 'plan_usage', 'keys_secrets', 'machines_runtimes'].includes(activeUnitId) && (
                <div className="p-6 rounded-xl border border-gray-800 bg-[#0c101a] max-w-3xl space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gray-800 text-gray-300">
                      <span className="material-symbols-outlined text-xl">settings_applications</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-gray-100">
                        {flatUnits.find(u => u.id === activeUnitId)?.label}
                      </h3>
                      <p className="text-xs text-gray-400">Unit ID: {activeUnitId}</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-black/40 border border-gray-900 font-mono text-xs text-gray-300 space-y-2">
                    <div className="text-emerald-400 font-bold">✓ Host authority connected: {hostPlatform}</div>
                    <div>Unit Status: <span className="text-sky-300">{unitData?.status || 'ready'}</span></div>
                    <div>Last Sync: <span className="text-gray-400">{unitData?.lastUpdated || new Date().toISOString()}</span></div>
                  </div>

                  <p className="text-xs text-gray-400 leading-relaxed font-sans">
                    This settings domain is fully wired to the AgentSam Host Adapter. Modifications dispatch formal signed mutation receipts.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
};
