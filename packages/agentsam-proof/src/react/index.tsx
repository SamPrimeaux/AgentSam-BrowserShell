/**
 * Shared capability demonstration + proof screen (DOM lanes).
 *
 * Used by apps/mobile-pwa, apps/mobile-capacitor, and apps/mobile-tauri so the
 * three webview lanes demonstrate the SAME screen rather than three lookalikes.
 * apps/mobile-expo renders the same report with React Native primitives.
 */

import * as React from 'react';
import {
  CAPABILITY_IDS,
  type CapabilityId,
  type CapabilityState,
} from '@inneranimalmedia/agentsam-platform';
import { useCapability, usePlatform, usePlatformSnapshot } from '@inneranimalmedia/agentsam-platform/react';
import { RuntimeEventAdapter, type RuntimeProjection } from '@inneranimalmedia/agentsam-runtime-state';
import type { AnyTelemetryEvent } from '@inneranimalmedia/agentsam-telemetry';
import { createLocalConversationHost, runCrossPlatformProof, type ProofConversationHost, type ProofReport } from '../scenario.js';

const STATUS_COLOR: Record<CapabilityState['status'], string> = {
  available: '#34D399',
  degraded: '#FBBF24',
  'requires-permission': '#8B5CF6',
  denied: '#F87171',
  unavailable: '#52525B',
  unknown: '#71717A',
};

const palette = {
  canvas: '#090A0E',
  panel: '#121318',
  border: '#232430',
  text: '#E5E7EB',
  muted: '#9CA3AF',
  accent: '#8B5CF6',
};

function CapabilityRow({ id }: { id: CapabilityId }): React.ReactElement {
  const { state, offerable, usable, requesting, request } = useCapability(id);
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 12px',
        borderBottom: `1px solid ${palette.border}`,
      }}
    >
      <span
        aria-hidden
        style={{
          width: 10,
          height: 10,
          borderRadius: 999,
          background: STATUS_COLOR[state.status],
          flex: '0 0 auto',
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: palette.text }}>{id}</div>
        <div style={{ fontSize: 12, color: palette.muted, overflowWrap: 'anywhere' }}>
          {state.status} · {state.implementation}
          {state.features.length > 0 ? ` · ${state.features.join(', ')}` : ''}
          {state.reason ? ` — ${state.reason}` : ''}
        </div>
      </div>
      {!usable && offerable ? (
        <button
          type="button"
          onClick={() => void request()}
          disabled={requesting}
          style={{
            background: palette.accent,
            border: 'none',
            borderRadius: 8,
            color: 'white',
            padding: '6px 10px',
            fontSize: 12,
            cursor: 'pointer',
          }}
        >
          {requesting ? '…' : 'Grant'}
        </button>
      ) : null}
    </div>
  );
}

export function CapabilityMatrix(): React.ReactElement {
  const snapshot = usePlatformSnapshot();
  return (
    <section
      style={{
        background: palette.panel,
        border: `1px solid ${palette.border}`,
        borderRadius: 14,
        overflow: 'hidden',
      }}
    >
      <header style={{ padding: '12px 14px', borderBottom: `1px solid ${palette.border}` }}>
        <div style={{ fontSize: 13, letterSpacing: 0.6, textTransform: 'uppercase', color: palette.muted }}>
          Platform capabilities
        </div>
        <div style={{ fontSize: 15, color: palette.text, fontWeight: 600 }}>{snapshot.identity.displayName}</div>
        <div style={{ fontSize: 12, color: palette.muted }}>
          lane={snapshot.identity.lane} · os={snapshot.identity.os} · {snapshot.identity.formFactor}
        </div>
      </header>
      {CAPABILITY_IDS.map((id) => (
        <CapabilityRow key={id} id={id} />
      ))}
    </section>
  );
}

export interface ProofPanelProps {
  conversation?: ProofConversationHost;
  emit?: (event: AnyTelemetryEvent) => Promise<void> | void;
  appVersion?: string;
}

export function ProofPanel({ conversation, emit, appVersion }: ProofPanelProps): React.ReactElement {
  const platform = usePlatform();
  const [runtime] = React.useState(() => new RuntimeEventAdapter());
  const [projection, setProjection] = React.useState<RuntimeProjection | null>(null);
  const [report, setReport] = React.useState<ProofReport | null>(null);
  const [running, setRunning] = React.useState(false);

  React.useEffect(() => runtime.subscribe(setProjection), [runtime]);

  const run = React.useCallback(async () => {
    setRunning(true);
    setReport(null);
    try {
      const result = await runCrossPlatformProof({
        platform,
        runtime,
        conversation: conversation ?? createLocalConversationHost(),
        emit,
        appVersion,
      });
      setReport(result);
    } finally {
      setRunning(false);
    }
  }, [platform, runtime, conversation, emit, appVersion]);

  return (
    <section
      style={{
        background: palette.panel,
        border: `1px solid ${palette.border}`,
        borderRadius: 14,
        padding: 14,
        display: 'grid',
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div style={{ fontSize: 13, letterSpacing: 0.6, textTransform: 'uppercase', color: palette.muted }}>
            Cross-platform proof
          </div>
          <div style={{ fontSize: 12, color: palette.muted }}>
            {projection ? `${projection.compact.state} — ${projection.compact.text}` : 'idle'}
          </div>
        </div>
        <button
          type="button"
          onClick={() => void run()}
          disabled={running}
          style={{
            background: running ? palette.border : palette.accent,
            border: 'none',
            borderRadius: 10,
            color: 'white',
            padding: '10px 14px',
            fontSize: 14,
            fontWeight: 600,
            cursor: running ? 'default' : 'pointer',
          }}
        >
          {running ? 'Running…' : 'Run proof'}
        </button>
      </div>

      {report ? (
        <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 6 }}>
          {report.steps.map((step) => (
            <li
              key={step.step}
              style={{
                display: 'flex',
                gap: 10,
                alignItems: 'flex-start',
                fontSize: 13,
                color: palette.text,
                borderLeft: `2px solid ${step.status === 'passed' ? STATUS_COLOR.available : STATUS_COLOR.denied}`,
                paddingLeft: 10,
              }}
            >
              <span style={{ flex: 1 }}>
                <strong>{step.label}</strong>
                <br />
                <span style={{ color: palette.muted, fontSize: 12 }}>{step.error ?? step.evidence}</span>
              </span>
              <span style={{ color: palette.muted, fontSize: 12 }}>{step.durationMs}ms</span>
            </li>
          ))}
        </ol>
      ) : (
        <p style={{ margin: 0, fontSize: 13, color: palette.muted }}>
          Runs the identical nine-step scenario every AgentSam lane must pass.
        </p>
      )}

      {report ? (
        <div style={{ fontSize: 12, color: report.passed ? STATUS_COLOR.available : STATUS_COLOR.denied }}>
          {report.passed ? 'PASSED' : 'FAILED'} · {report.totalDurationMs}ms · storage={report.storage} ·{' '}
          {report.usableCapabilities.length}/{CAPABILITY_IDS.length} capabilities
        </div>
      ) : null}
    </section>
  );
}

export interface CapabilityDemoScreenProps extends ProofPanelProps {
  title?: string;
  subtitle?: string;
}

/** The whole lane demonstration screen. Apps render this and nothing else. */
export function CapabilityDemoScreen({ title, subtitle, ...proofProps }: CapabilityDemoScreenProps): React.ReactElement {
  const snapshot = usePlatformSnapshot();
  return (
    <main
      style={{
        minHeight: '100vh',
        background: palette.canvas,
        color: palette.text,
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        padding: 'max(16px, env(safe-area-inset-top)) 16px max(16px, env(safe-area-inset-bottom))',
        display: 'grid',
        gap: 16,
        alignContent: 'start',
      }}
    >
      <header>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>{title ?? 'AgentSam'}</h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: palette.muted }}>
          {subtitle ?? 'Portable capability demonstration'} · fingerprint{' '}
          <code style={{ fontSize: 11 }}>{snapshot.fingerprint.slice(0, 48)}…</code>
        </p>
      </header>
      <ProofPanel {...proofProps} />
      <CapabilityMatrix />
      <footer style={{ fontSize: 11, color: palette.muted, paddingBottom: 8 }}>
        No component on this screen asks which platform it is running on. It asks for capabilities.
      </footer>
    </main>
  );
}
