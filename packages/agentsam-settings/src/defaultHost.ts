import {
  SettingsHost,
  SettingsUnitId,
  SettingsUnitData,
  SettingsMutationAction,
  SettingsMutationReceipt,
  ObservabilityPlanUsageData,
} from './types';
import { HostCapabilities, ModelOption } from '@inneranimalmedia/agentsam-contracts';

export class AgentSamDefaultSettingsHost implements SettingsHost {
  private baseUrl: string;

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
  }

  async capabilities(): Promise<HostCapabilities> {
    return {
      platform: typeof window !== 'undefined' && (window as any).__TAURI__ ? 'desktop' : 'web',
      hasLocalPty: typeof window !== 'undefined' && !!(window as any).__TAURI__,
      hasNativeKeychain: typeof window !== 'undefined' && !!(window as any).__TAURI__,
      hasLocalSqlite: typeof window !== 'undefined' && !!(window as any).__TAURI__,
      hasDirectFilesystem: false,
      hasRemoteDaemon: true,
      hasOAuthBrowserFlow: true,
      supportedRuntimes: ['antigravity', 'cloudflare', 'local_pty', 'gcp_vm'],
    };
  }

  async getUnit(unitId: SettingsUnitId, _view?: string): Promise<SettingsUnitData> {
    const now = new Date().toISOString();

    if (unitId === 'agents.models') {
      const models: ModelOption[] = [
        {
          id: 'gemini-3.7-flash',
          name: 'Gemini 3.7 Flash',
          provider: 'google',
          contextWindow: 1048576,
          maxOutputTokens: 8192,
          supportsStreaming: true,
          supportsTools: true,
          supportsVision: true,
          supportsThinking: true,
          pricing: {
            inputPerMillion: 0.75,
            outputPerMillion: 3.75,
            thinkingPerMillion: 3.75,
            cachedInputPerMillion: 0.1875,
            currency: 'USD',
            lastUpdated: '2026-03-01',
          },
          status: 'runnable',
          health: {
            requestHealth: 'healthy',
            billingHealth: 'good_standing',
            p50LatencyMs: 380,
            p95LatencyMs: 820,
            errorRate: 0.001,
            lastSuccess: now,
          },
          credentialSource: 'Server Environment (GOOGLE_AI_API_KEY)',
          isDefault: true,
        },
        {
          id: 'gemini-3.1-flash',
          name: 'Gemini 3.1 Flash-Lite',
          provider: 'google',
          contextWindow: 1048576,
          maxOutputTokens: 8192,
          supportsStreaming: true,
          supportsTools: true,
          supportsVision: true,
          supportsThinking: false,
          pricing: {
            inputPerMillion: 0.25,
            outputPerMillion: 1.00,
            currency: 'USD',
            lastUpdated: '2026-01-15',
          },
          status: 'runnable',
          health: {
            requestHealth: 'healthy',
            billingHealth: 'good_standing',
            p50LatencyMs: 240,
            p95LatencyMs: 490,
            errorRate: 0.0,
            lastSuccess: now,
          },
          credentialSource: 'Server Environment (GOOGLE_AI_API_KEY)',
        },
        {
          id: 'gemini-2.5-pro',
          name: 'Gemini 2.5 Pro (Deep Reasoning)',
          provider: 'google',
          contextWindow: 2097152,
          maxOutputTokens: 8192,
          supportsStreaming: true,
          supportsTools: true,
          supportsVision: true,
          supportsThinking: true,
          pricing: {
            inputPerMillion: 1.25,
            outputPerMillion: 5.00,
            currency: 'USD',
            lastUpdated: '2026-02-10',
          },
          status: 'available',
          health: {
            requestHealth: 'healthy',
            billingHealth: 'good_standing',
            p50LatencyMs: 950,
            p95LatencyMs: 1800,
            errorRate: 0.005,
            lastSuccess: now,
          },
          credentialSource: 'Server Environment (GOOGLE_AI_API_KEY)',
        },
      ];

      return {
        unitId,
        status: 'ready',
        data: { models },
        lastUpdated: now,
      };
    }

    if (unitId === 'plan_usage') {
      const observability: ObservabilityPlanUsageData = {
        timeRange: '7d',
        summary: {
          totalSpendUsd: 1.4820,
          totalModelCalls: 142,
          totalToolCalls: 318,
          errorRatePercent: 0.4,
          totalTokens: {
            input: 482000,
            output: 124500,
            thinking: 89000,
            cached: 210000,
          },
          cachedTokenSavingsUsd: 0.3937,
          machineResolvedCount: 88,
          modelAssistedCount: 54,
          machineResolvedRatio: 0.62,
          avgLatencyMs: 340,
          p95LatencyMs: 780,
        },
        models: [],
        runs: [
          {
            id: 'run_8f1a9c',
            goal: 'Audit Repository for Competing Identity Authorities',
            sourceClient: 'local_studio',
            createdAt: new Date(Date.now() - 3600000).toISOString(),
            durationMs: 4200,
            status: 'completed',
            modelUsed: 'gemini-3.7-flash',
            modelCallsCount: 2,
            toolCallsCount: 5,
            machineResolvedCount: 3,
            totalTokens: {
              input: 14200,
              output: 3800,
              thinking: 6500,
              cached: 8200,
            },
            totalCostUsd: 0.048,
            avoidedContextBytes: 145000,
            cacheSavingsUsd: 0.015,
            timeline: [
              { step: 1, type: 'machine_intent', title: 'Machine Front Controller resolved audit command', durationMs: 12 },
              { step: 2, type: 'tool_call', title: 'ripgrep auth patterns in src/', durationMs: 180 },
              { step: 3, type: 'model_call', title: 'Synthesize consolidation sequence with Gemini 3.7', durationMs: 1450, tokens: 4200, cost: 0.018 },
              { step: 4, type: 'tool_call', title: 'Render SVG architecture topology', durationMs: 85 },
              { step: 5, type: 'completion', title: 'TaskContract sealed with SHA-256', durationMs: 10 },
            ],
          },
          {
            id: 'run_4b2e11',
            goal: 'Deterministic query: what runtime am I using',
            sourceClient: 'cli',
            createdAt: new Date(Date.now() - 7200000).toISOString(),
            durationMs: 45,
            status: 'completed',
            modelCallsCount: 0,
            toolCallsCount: 1,
            machineResolvedCount: 1,
            totalTokens: { input: 0, output: 0, thinking: 0, cached: 0 },
            totalCostUsd: 0.0,
            avoidedContextBytes: 25000,
            timeline: [
              { step: 1, type: 'machine_intent', title: 'Direct machine resolution: Antigravity Managed', durationMs: 45 },
              { step: 2, type: 'completion', title: 'Answer delivered with 0 LLM calls', durationMs: 0 },
            ],
          },
        ],
        logs: [
          {
            id: 'log_01',
            timestamp: new Date(Date.now() - 300000).toISOString(),
            category: 'machine_intent',
            status: 'info',
            durationMs: 15,
            message: 'Bypassed LLM: "what runtime am I using" answered via runtime doctor',
            redacted: true,
            metadata: { query: 'what runtime am I using', resolvedBy: 'frontController' },
          },
          {
            id: 'log_02',
            timestamp: new Date(Date.now() - 600000).toISOString(),
            category: 'model_call',
            status: 'success',
            durationMs: 410,
            model: 'gemini-3.7-flash',
            inputTokens: 1250,
            outputTokens: 420,
            thinkingTokens: 680,
            estimatedCostUsd: 0.005,
            message: 'Completed reasoning turn for TaskContract consolidation map',
            redacted: true,
            metadata: { model: 'gemini-3.7-flash', serviceTier: 'standard' },
          },
          {
            id: 'log_03',
            timestamp: new Date(Date.now() - 900000).toISOString(),
            category: 'tool_call',
            status: 'success',
            durationMs: 45,
            message: 'Executed ripgrep on /workspace/src/auth.ts',
            redacted: true,
            metadata: { tool: 'terminal', exitCode: 0 },
          },
        ],
        budget: {
          agentSamSubscriptionTier: 'AgentSam Pro Developer',
          byokSpendUsd: 1.482,
          localMachineSpendUsd: 0.0,
          monthlyBudgetCapUsd: 50.0,
          currentPeriodProgressPercent: 2.96,
          perCallCapUsd: 0.50,
          localFirstPreference: true,
        },
      };

      return {
        unitId,
        status: 'ready',
        data: { observability },
        lastUpdated: now,
      };
    }

    return {
      unitId,
      status: 'ready',
      data: {
        configured: true,
        receiptTimestamp: now,
      },
      lastUpdated: now,
    };
  }

  async mutate(action: SettingsMutationAction): Promise<SettingsMutationReceipt> {
    return {
      success: true,
      unitId: action.unitId,
      action: action.action,
      message: `Executed mutation ${action.action} on ${action.unitId}`,
      receiptId: 'rcpt_' + Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
    };
  }
}
