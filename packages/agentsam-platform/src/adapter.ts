/**
 * @inneranimalmedia/agentsam-platform — adapter contract
 *
 * An adapter is the ONLY place in the system that is allowed to know whether
 * it is running inside a browser tab, a Capacitor webview, an Expo runtime,
 * or a Tauri mobile shell. Everything above it asks for capabilities.
 */

import type {
  AgentSamPlatformCapabilities,
  CapabilityId,
  CapabilityState,
} from './capabilities.js';
import type { CapabilityPortMap, CapabilityPorts } from './ports.js';

export type PlatformLane = 'web' | 'capacitor' | 'expo' | 'tauri' | 'headless' | 'desktop';

export type PlatformFormFactor = 'phone' | 'tablet' | 'desktop' | 'web' | 'unknown';

export type PlatformOs = 'ios' | 'android' | 'macos' | 'windows' | 'linux' | 'web' | 'unknown';

export interface PlatformIdentity {
  /** Which of the four mobile lanes (or desktop/headless) this build is. */
  lane: PlatformLane;
  os: PlatformOs;
  formFactor: PlatformFormFactor;
  /** Human label for diagnostics screens only. */
  displayName: string;
  /** Adapter package version, for telemetry. */
  adapterVersion: string;
  /** True when the surface was installed (PWA installed, app store, sideload). */
  installed?: boolean;
}

export interface AgentSamPlatformAdapter {
  readonly identity: PlatformIdentity;
  /**
   * Probe the host. Must be side-effect free and must NOT trigger permission
   * prompts: a capability the user has not been asked about is
   * `requires-permission`, not `denied`.
   */
  probe(): Promise<AgentSamPlatformCapabilities>;
  /**
   * Trigger the host permission flow for one capability. Called from a user
   * gesture by the UI. Returns the refreshed state for that capability.
   */
  request(id: CapabilityId): Promise<CapabilityState>;
  /** Behaviour for a capability, or null when the host cannot provide it. */
  port<K extends CapabilityId>(id: K): CapabilityPortMap[K] | null;
  /** Optional eager setup (bridge handshake, plugin registration). */
  initialize?(): Promise<void>;
  dispose?(): Promise<void>;
}

/**
 * Convenience base for adapters: supply identity, a probe, and a port bag.
 * Adapters may subclass or simply call `defineAdapter`.
 */
export interface AdapterDefinition {
  identity: PlatformIdentity;
  probe(): Promise<AgentSamPlatformCapabilities>;
  ports?: CapabilityPorts | (() => CapabilityPorts);
  request?(id: CapabilityId): Promise<CapabilityState>;
  initialize?(): Promise<void>;
  dispose?(): Promise<void>;
}

export function defineAdapter(definition: AdapterDefinition): AgentSamPlatformAdapter {
  let resolvedPorts: CapabilityPorts | null = null;

  const getPorts = (): CapabilityPorts => {
    if (resolvedPorts) return resolvedPorts;
    const source = definition.ports;
    resolvedPorts = typeof source === 'function' ? source() : (source ?? {});
    return resolvedPorts;
  };

  return {
    identity: definition.identity,
    probe: () => definition.probe(),
    async request(id) {
      if (definition.request) return definition.request(id);
      const capabilities = await definition.probe();
      return capabilities[id];
    },
    port<K extends CapabilityId>(id: K): CapabilityPortMap[K] | null {
      const found = getPorts()[id];
      return (found as CapabilityPortMap[K] | undefined) ?? null;
    },
    initialize: definition.initialize,
    dispose: definition.dispose,
  };
}
