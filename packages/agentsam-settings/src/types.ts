import { HostCapabilities, ModelOption, ObservabilityEvent, AgentRunSummary } from '@inneranimalmedia/agentsam-contracts';

export type SettingsUnitId =
  | 'general'
  | 'agents'
  | 'agents.models'
  | 'agents.cloud'
  | 'agents.policy'
  | 'customize.mcps'
  | 'customize.skills'
  | 'customize.subagents'
  | 'customize.rules'
  | 'customize.commands'
  | 'customize.hooks'
  | 'brand_design'
  | 'git_prs'
  | 'codebase'
  | 'browser_network'
  | 'machines_runtimes'
  | 'themes'
  | 'storage'
  | 'keys_secrets'
  | 'plan_usage'
  | 'notifications'
  | 'docs';

export interface SettingsNavCategory {
  id: string;
  label: string;
  icon: string;
  units: Array<{
    id: SettingsUnitId;
    label: string;
    subLabel?: string;
    badge?: string;
  }>;
}

export interface SettingsUnitData {
  unitId: SettingsUnitId;
  view?: string;
  status: 'ready' | 'loading' | 'disconnected' | 'unsupported' | 'error';
  errorMessage?: string;
  capabilitiesSupported?: boolean;
  data: Record<string, unknown>;
  lastUpdated: string;
}

export interface SettingsMutationAction {
  unitId: SettingsUnitId;
  action: string;
  payload: Record<string, unknown>;
}

export interface SettingsMutationReceipt {
  success: boolean;
  unitId: SettingsUnitId;
  action: string;
  message: string;
  receiptId: string;
  timestamp: string;
  data?: unknown;
}

export interface SettingsHost {
  capabilities(): Promise<HostCapabilities>;
  getUnit(unitId: SettingsUnitId, view?: string): Promise<SettingsUnitData>;
  mutate(action: SettingsMutationAction): Promise<SettingsMutationReceipt>;
  subscribe?(unitId: SettingsUnitId, callback: (data: SettingsUnitData) => void): () => void;
}

export interface ObservabilityPlanUsageData {
  timeRange: '24h' | '7d' | '30d' | 'all';
  summary: {
    totalSpendUsd: number;
    totalModelCalls: number;
    totalToolCalls: number;
    errorRatePercent: number;
    totalTokens: {
      input: number;
      output: number;
      thinking: number;
      cached: number;
    };
    cachedTokenSavingsUsd: number;
    machineResolvedCount: number;
    modelAssistedCount: number;
    machineResolvedRatio: number;
    avgLatencyMs: number;
    p95LatencyMs: number;
  };
  models: ModelOption[];
  runs: AgentRunSummary[];
  logs: ObservabilityEvent[];
  budget: {
    agentSamSubscriptionTier: string;
    byokSpendUsd: number;
    localMachineSpendUsd: number;
    monthlyBudgetCapUsd?: number;
    currentPeriodProgressPercent: number;
    perCallCapUsd?: number;
    localFirstPreference: boolean;
  };
}
