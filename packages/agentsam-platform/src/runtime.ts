/**
 * @inneranimalmedia/agentsam-platform — the runtime AgentSam surfaces talk to.
 *
 * UI rule enforced by this module:
 *
 *   NOT ALLOWED            ALLOWED
 *   if (isCapacitor)  ->   platform.get('camera').status === 'available'
 *   if (isExpo)       ->   platform.use('secureStore')
 *   if (isTauri)      ->   platform.tryUse('terminal')
 */

import {
  CAPABILITY_IDS,
  capabilityFingerprint,
  isActionable,
  isUsable,
  unknownCapabilities,
  type AgentSamPlatformCapabilities,
  type CapabilityId,
  type CapabilityState,
} from './capabilities.js';
import type { AgentSamPlatformAdapter, PlatformIdentity } from './adapter.js';
import type { CapabilityPortMap } from './ports.js';

export class CapabilityUnavailableError extends Error {
  readonly capability: CapabilityId;
  readonly state: CapabilityState;

  constructor(capability: CapabilityId, state: CapabilityState) {
    super(
      `AgentSam capability "${capability}" is not usable on this host ` +
        `(status=${state.status}, impl=${state.implementation}${state.reason ? `, reason=${state.reason}` : ''}).`,
    );
    this.name = 'CapabilityUnavailableError';
    this.capability = capability;
    this.state = state;
  }
}

export type PlatformListener = (snapshot: PlatformSnapshot) => void;

export interface PlatformSnapshot {
  identity: PlatformIdentity;
  capabilities: AgentSamPlatformCapabilities;
  fingerprint: string;
  probedAt: string | null;
}

export class AgentSamPlatform {
  private readonly adapter: AgentSamPlatformAdapter;
  private caps: AgentSamPlatformCapabilities = unknownCapabilities();
  private probedAt: string | null = null;
  private listeners = new Set<PlatformListener>();

  private constructor(adapter: AgentSamPlatformAdapter) {
    this.adapter = adapter;
  }

  /** Create and probe. This is the one call a lane bootstrap has to make. */
  static async create(adapter: AgentSamPlatformAdapter): Promise<AgentSamPlatform> {
    const platform = new AgentSamPlatform(adapter);
    await adapter.initialize?.();
    await platform.refresh();
    return platform;
  }

  /** Create without probing — for tests and for render-before-probe shells. */
  static unprobed(adapter: AgentSamPlatformAdapter): AgentSamPlatform {
    return new AgentSamPlatform(adapter);
  }

  get identity(): PlatformIdentity {
    return this.adapter.identity;
  }

  get capabilities(): AgentSamPlatformCapabilities {
    return this.caps;
  }

  snapshot(): PlatformSnapshot {
    return {
      identity: this.identity,
      capabilities: this.caps,
      fingerprint: capabilityFingerprint(this.caps),
      probedAt: this.probedAt,
    };
  }

  async refresh(): Promise<AgentSamPlatformCapabilities> {
    this.caps = await this.adapter.probe();
    this.probedAt = new Date().toISOString();
    this.notify();
    return this.caps;
  }

  get(id: CapabilityId): CapabilityState {
    return this.caps[id];
  }

  has(id: CapabilityId): boolean {
    return isUsable(this.caps[id]);
  }

  canOffer(id: CapabilityId): boolean {
    return isActionable(this.caps[id]);
  }

  supports(id: CapabilityId, feature: string): boolean {
    const state = this.caps[id];
    return isUsable(state) && state.features.includes(feature);
  }

  /** Ask the host for permission. Call from a user gesture. */
  async request(id: CapabilityId): Promise<CapabilityState> {
    const next = await this.adapter.request(id);
    this.caps = { ...this.caps, [id]: next };
    this.notify();
    return next;
  }

  /** Get a port or throw. Use when the UI already gated on the capability. */
  use<K extends CapabilityId>(id: K): CapabilityPortMap[K] {
    const port = this.tryUse(id);
    if (!port) throw new CapabilityUnavailableError(id, this.caps[id]);
    return port;
  }

  /** Get a port or null. Use for progressive enhancement. */
  tryUse<K extends CapabilityId>(id: K): CapabilityPortMap[K] | null {
    if (!isUsable(this.caps[id])) return null;
    return this.adapter.port(id);
  }

  /**
   * Run `fn` only when the capability is usable; otherwise return `fallback`.
   * This is the preferred shape for feature-detecting code paths.
   */
  async when<K extends CapabilityId, T>(
    id: K,
    fn: (port: CapabilityPortMap[K]) => Promise<T> | T,
    fallback?: () => Promise<T> | T,
  ): Promise<T | undefined> {
    const port = this.tryUse(id);
    if (port) return fn(port);
    return fallback ? fallback() : undefined;
  }

  subscribe(listener: PlatformListener): () => void {
    this.listeners.add(listener);
    listener(this.snapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  async dispose(): Promise<void> {
    this.listeners.clear();
    await this.adapter.dispose?.();
  }

  /** Diagnostics payload for the capability demonstration screens. */
  report(): Array<{ id: CapabilityId; state: CapabilityState; hasPort: boolean }> {
    return CAPABILITY_IDS.map((id) => ({
      id,
      state: this.caps[id],
      hasPort: this.adapter.port(id) !== null,
    }));
  }

  private notify(): void {
    const snapshot = this.snapshot();
    for (const listener of this.listeners) listener(snapshot);
  }
}
