/**
 * Lane comparison metrics. Evidence, not theory — and deliberately no winner.
 *
 * Numeric fields are measured by the lane's own build/run tooling and pasted
 * into `docs/CROSS_PLATFORM_PROOF.md`. Qualitative fields use a 1..5 scale so
 * reviewers must justify a score rather than argue in adjectives.
 */

import type { ProofReport } from './scenario.js';

export type Score = 1 | 2 | 3 | 4 | 5;

export interface LaneMetrics {
  lane: 'web' | 'capacitor' | 'expo' | 'tauri';
  /** Cold start to first interactive frame, median of 5 runs, ms. */
  startupMs?: number;
  /** Shipped JS/WASM bytes (gzip) for the proof app. */
  bundleBytes?: number;
  /** Installed app size on device, bytes. */
  installBytes?: number;
  /** How close the lane gets to the AgentSam desktop composition. */
  uiFidelity?: Score;
  /** Breadth and honesty of native capability access. */
  nativeCapabilityAccess?: Score;
  offlineSupport?: Score;
  backgroundBehavior?: Score;
  /** Save-to-reload loop quality. */
  developerIterationSpeed?: Score;
  /** How much of the existing Rust core can be reused as-is. */
  rustReuse?: Score;
  /** How much of the existing React/web surface can be reused as-is. */
  webComponentReuse?: Score;
  pluginMaturity?: Score;
  buildComplexity?: Score;
  signingComplexity?: Score;
  notes?: string[];
}

export const METRIC_KEYS: Array<keyof LaneMetrics> = [
  'startupMs',
  'bundleBytes',
  'installBytes',
  'uiFidelity',
  'nativeCapabilityAccess',
  'offlineSupport',
  'backgroundBehavior',
  'developerIterationSpeed',
  'rustReuse',
  'webComponentReuse',
  'pluginMaturity',
  'buildComplexity',
  'signingComplexity',
];

export interface LaneEvidence {
  metrics: LaneMetrics;
  report?: ProofReport;
}

function formatBytes(bytes?: number): string {
  if (bytes === undefined) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

function cell(value: number | undefined, suffix = ''): string {
  return value === undefined ? '—' : `${value}${suffix}`;
}

/** Render the comparison table. Explicitly refuses to declare a winner. */
export function renderComparisonMarkdown(evidence: LaneEvidence[]): string {
  const header = ['Metric', ...evidence.map((entry) => entry.metrics.lane)];
  const rows: string[][] = [
    ['startup (ms)', ...evidence.map((entry) => cell(entry.metrics.startupMs))],
    ['bundle (gzip)', ...evidence.map((entry) => formatBytes(entry.metrics.bundleBytes))],
    ['install size', ...evidence.map((entry) => formatBytes(entry.metrics.installBytes))],
    ['UI fidelity (1-5)', ...evidence.map((entry) => cell(entry.metrics.uiFidelity))],
    ['native capability access (1-5)', ...evidence.map((entry) => cell(entry.metrics.nativeCapabilityAccess))],
    ['offline support (1-5)', ...evidence.map((entry) => cell(entry.metrics.offlineSupport))],
    ['background behavior (1-5)', ...evidence.map((entry) => cell(entry.metrics.backgroundBehavior))],
    ['dev iteration speed (1-5)', ...evidence.map((entry) => cell(entry.metrics.developerIterationSpeed))],
    ['Rust reuse (1-5)', ...evidence.map((entry) => cell(entry.metrics.rustReuse))],
    ['web component reuse (1-5)', ...evidence.map((entry) => cell(entry.metrics.webComponentReuse))],
    ['plugin maturity (1-5)', ...evidence.map((entry) => cell(entry.metrics.pluginMaturity))],
    ['build complexity (1-5, lower is better)', ...evidence.map((entry) => cell(entry.metrics.buildComplexity))],
    ['signing complexity (1-5, lower is better)', ...evidence.map((entry) => cell(entry.metrics.signingComplexity))],
    ['proof passed', ...evidence.map((entry) => (entry.report ? (entry.report.passed ? 'yes' : 'no') : '—'))],
    ['usable capabilities', ...evidence.map((entry) => (entry.report ? String(entry.report.usableCapabilities.length) : '—'))],
    ['proof duration (ms)', ...evidence.map((entry) => (entry.report ? String(entry.report.totalDurationMs) : '—'))],
  ];

  const lines = [
    `| ${header.join(' | ')} |`,
    `| ${header.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.join(' | ')} |`),
  ];

  return [
    ...lines,
    '',
    '> No winner is declared. This table exists so the decision is made against measurements',
    '> taken from the identical proof scenario on every lane.',
  ].join('\n');
}

/** Human-readable receipt for a single lane run. */
export function renderProofMarkdown(report: ProofReport): string {
  const lines = [
    `### AgentSam cross-platform proof — ${report.lane} (${report.os})`,
    '',
    `- adapter: \`${report.adapterVersion}\`${report.appVersion ? ` · app: \`${report.appVersion}\`` : ''}`,
    `- started: ${report.startedAt}`,
    `- duration: ${report.totalDurationMs} ms`,
    `- result: **${report.passed ? 'PASSED' : 'FAILED'}**`,
    `- storage used: ${report.storage}`,
    `- auth: ${report.authMode ?? 'unknown'}`,
    `- capability fingerprint: \`${report.capabilityFingerprint}\``,
    '',
    '| # | Step | Status | ms | Evidence |',
    '| --- | --- | --- | --- | --- |',
    ...report.steps.map(
      (step, index) =>
        `| ${index + 1} | ${step.label} | ${step.status} | ${step.durationMs} | ${step.error ?? step.evidence} |`,
    ),
  ];
  return lines.join('\n');
}
