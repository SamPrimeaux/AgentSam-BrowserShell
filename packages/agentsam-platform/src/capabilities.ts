/**
 * @inneranimalmedia/agentsam-platform — capability vocabulary
 *
 * This file is the single source of truth for *what AgentSam can ask a host for*.
 * It is deliberately framework-neutral: no React, no Capacitor, no Expo, no Tauri,
 * no DOM. Every adapter answers these questions; no UI component ever asks
 * "which platform am I on?".
 */

// ======================================================================
// 1. CAPABILITY IDENTITY
// ======================================================================

/** The twelve portable capabilities AgentSam surfaces may request. */
export const CAPABILITY_IDS = [
  'filesystem',
  'camera',
  'microphone',
  'notifications',
  'secureStore',
  'share',
  'clipboard',
  'network',
  'browser',
  'terminal',
  'localModels',
  'backgroundExecution',
] as const;

export type CapabilityId = (typeof CAPABILITY_IDS)[number];

// ======================================================================
// 2. CAPABILITY STATE
// ======================================================================

/**
 * Availability is about the *host*, permission is about the *user*.
 * They are intentionally separate: a camera can exist and still be denied,
 * and a camera can be permitted by policy while physically absent.
 */
export type CapabilityAvailability =
  /** Present, permitted, and usable right now. */
  | 'available'
  /** Present but the user/OS must grant access before first use. */
  | 'requires-permission'
  /** Present but explicitly refused by user or policy. */
  | 'denied'
  /** Usable but materially reduced (e.g. OPFS instead of real filesystem). */
  | 'degraded'
  /** Not implemented or not present on this host. */
  | 'unavailable'
  /** Not probed yet. Never render this as a failure. */
  | 'unknown';

export type CapabilityPermission =
  | 'granted'
  | 'denied'
  | 'prompt'
  | 'not-applicable'
  | 'unknown';

/**
 * The portable answer to "can I do X here, and how well?".
 *
 * `implementation` is free-form but conventionally `<adapter>.<mechanism>`
 * (e.g. `web.file-system-access`, `capacitor.filesystem`, `tauri.fs-plugin`).
 * It exists for telemetry and debugging only — UI must never branch on it.
 */
export interface CapabilityState {
  id: CapabilityId;
  status: CapabilityAvailability;
  permission: CapabilityPermission;
  /** Which concrete mechanism backs this capability on this host. */
  implementation: string;
  /** Granular sub-features, e.g. ['read','write','directory-picker']. */
  features: string[];
  /** Honest limits so UI can adapt instead of guessing. */
  constraints?: CapabilityConstraints;
  /** Human-readable reason when status is not `available`. */
  reason?: string;
  /** ISO-8601 timestamp of the last probe. */
  lastCheckedAt: string;
}

export interface CapabilityConstraints {
  /** Max single payload the host will accept, in bytes. */
  maxPayloadBytes?: number;
  /** True when the capability only works while the surface is foregrounded. */
  foregroundOnly?: boolean;
  /** True when the capability must be triggered by a user gesture. */
  requiresUserGesture?: boolean;
  /** True when data does not survive app restart. */
  ephemeral?: boolean;
  /** True when the capability is sandboxed to an app-private location. */
  sandboxed?: boolean;
  /** Adapter-specific extras. Never branch UI on these. */
  notes?: string[];
}

/**
 * THE CONTRACT. Every adapter returns exactly this shape.
 */
export interface AgentSamPlatformCapabilities {
  filesystem: CapabilityState;
  camera: CapabilityState;
  microphone: CapabilityState;
  notifications: CapabilityState;
  secureStore: CapabilityState;
  share: CapabilityState;
  clipboard: CapabilityState;
  network: CapabilityState;
  browser: CapabilityState;
  terminal: CapabilityState;
  localModels: CapabilityState;
  backgroundExecution: CapabilityState;
}

// ======================================================================
// 3. STATE CONSTRUCTORS
// ======================================================================

const now = (): string => new Date().toISOString();

export function capability(
  id: CapabilityId,
  input: Partial<Omit<CapabilityState, 'id'>> = {},
): CapabilityState {
  return {
    id,
    status: input.status ?? 'unknown',
    permission: input.permission ?? 'unknown',
    implementation: input.implementation ?? 'unknown',
    features: input.features ?? [],
    constraints: input.constraints,
    reason: input.reason,
    lastCheckedAt: input.lastCheckedAt ?? now(),
  };
}

export function available(
  id: CapabilityId,
  implementation: string,
  features: string[] = [],
  constraints?: CapabilityConstraints,
): CapabilityState {
  return capability(id, {
    status: 'available',
    permission: 'granted',
    implementation,
    features,
    constraints,
  });
}

export function requiresPermission(
  id: CapabilityId,
  implementation: string,
  features: string[] = [],
  constraints?: CapabilityConstraints,
): CapabilityState {
  return capability(id, {
    status: 'requires-permission',
    permission: 'prompt',
    implementation,
    features,
    constraints,
  });
}

export function degraded(
  id: CapabilityId,
  implementation: string,
  reason: string,
  features: string[] = [],
  constraints?: CapabilityConstraints,
): CapabilityState {
  return capability(id, {
    status: 'degraded',
    permission: 'granted',
    implementation,
    features,
    constraints,
    reason,
  });
}

export function unavailable(
  id: CapabilityId,
  reason: string,
  implementation = 'none',
): CapabilityState {
  return capability(id, {
    status: 'unavailable',
    permission: 'not-applicable',
    implementation,
    reason,
  });
}

export function denied(
  id: CapabilityId,
  implementation: string,
  reason = 'Permission denied',
): CapabilityState {
  return capability(id, {
    status: 'denied',
    permission: 'denied',
    implementation,
    reason,
  });
}

/** Every capability unknown. The honest starting point before a probe. */
export function unknownCapabilities(): AgentSamPlatformCapabilities {
  const out = {} as AgentSamPlatformCapabilities;
  for (const id of CAPABILITY_IDS) {
    (out as Record<CapabilityId, CapabilityState>)[id] = capability(id);
  }
  return out;
}

/** Every capability unavailable with a shared reason (headless/null hosts). */
export function noCapabilities(reason: string): AgentSamPlatformCapabilities {
  const out = {} as AgentSamPlatformCapabilities;
  for (const id of CAPABILITY_IDS) {
    (out as Record<CapabilityId, CapabilityState>)[id] = unavailable(id, reason);
  }
  return out;
}

/** Merge partial adapter output over a complete baseline. */
export function mergeCapabilities(
  base: AgentSamPlatformCapabilities,
  patch: Partial<AgentSamPlatformCapabilities>,
): AgentSamPlatformCapabilities {
  return { ...base, ...patch };
}

// ======================================================================
// 4. PREDICATES (what UI is allowed to ask)
// ======================================================================

export function isUsable(state: CapabilityState | undefined): boolean {
  return state?.status === 'available' || state?.status === 'degraded';
}

export function isActionable(state: CapabilityState | undefined): boolean {
  return isUsable(state) || state?.status === 'requires-permission';
}

export function hasFeature(
  state: CapabilityState | undefined,
  feature: string,
): boolean {
  return Boolean(state && isUsable(state) && state.features.includes(feature));
}

export function usableCapabilityIds(
  capabilities: AgentSamPlatformCapabilities,
): CapabilityId[] {
  return CAPABILITY_IDS.filter((id) => isUsable(capabilities[id]));
}

/** Stable, diffable summary used by the proof harness and analytics. */
export function capabilityFingerprint(
  capabilities: AgentSamPlatformCapabilities,
): string {
  return CAPABILITY_IDS.map((id) => `${id}:${capabilities[id].status}`).join('|');
}
