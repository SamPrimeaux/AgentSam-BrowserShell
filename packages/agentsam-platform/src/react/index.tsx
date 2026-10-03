/**
 * @inneranimalmedia/agentsam-platform/react
 *
 * React bindings for the portable capability layer. These are the only hooks
 * an AgentSam surface should use to reason about the host. There is no
 * `usePlatformName()` on purpose.
 */

import * as React from 'react';
import {
  isActionable,
  isUsable,
  type CapabilityId,
  type CapabilityState,
} from '../capabilities.js';
import type { CapabilityPortMap } from '../ports.js';
import { AgentSamPlatform, type PlatformSnapshot } from '../runtime.js';

const PlatformContext = React.createContext<AgentSamPlatform | null>(null);

export interface PlatformProviderProps {
  platform: AgentSamPlatform;
  children?: React.ReactNode;
}

export function PlatformProvider({ platform, children }: PlatformProviderProps): React.ReactElement {
  return <PlatformContext.Provider value={platform}>{children}</PlatformContext.Provider>;
}

export function usePlatform(): AgentSamPlatform {
  const platform = React.useContext(PlatformContext);
  if (!platform) {
    throw new Error(
      'usePlatform() requires <PlatformProvider>. Each lane bootstrap must mount one.',
    );
  }
  return platform;
}

export function usePlatformSnapshot(): PlatformSnapshot {
  const platform = usePlatform();
  return React.useSyncExternalStore(
    React.useCallback((onChange) => platform.subscribe(() => onChange()), [platform]),
    React.useCallback(() => platform.snapshot(), [platform]),
    React.useCallback(() => platform.snapshot(), [platform]),
  );
}

export interface UseCapabilityResult {
  state: CapabilityState;
  /** Usable right now (available or degraded). */
  usable: boolean;
  /** Usable or promptable — render the entry point, gate the action. */
  offerable: boolean;
  requesting: boolean;
  request(): Promise<CapabilityState>;
}

export function useCapability(id: CapabilityId): UseCapabilityResult {
  const platform = usePlatform();
  const snapshot = usePlatformSnapshot();
  const [requesting, setRequesting] = React.useState(false);
  const state = snapshot.capabilities[id];

  const request = React.useCallback(async () => {
    setRequesting(true);
    try {
      return await platform.request(id);
    } finally {
      setRequesting(false);
    }
  }, [platform, id]);

  return {
    state,
    usable: isUsable(state),
    offerable: isActionable(state),
    requesting,
    request,
  };
}

/** The port, or null. Never throws — components stay renderable everywhere. */
export function useCapabilityPort<K extends CapabilityId>(id: K): CapabilityPortMap[K] | null {
  const platform = usePlatform();
  const snapshot = usePlatformSnapshot();
  return React.useMemo(
    () => platform.tryUse(id),
    // snapshot.fingerprint changes when permissions change
    [platform, id, snapshot.fingerprint],
  );
}

export interface CapabilityGateProps {
  capability: CapabilityId;
  /** Rendered when the capability is usable. */
  children: React.ReactNode;
  /** Rendered when it is not. Defaults to nothing. */
  fallback?: React.ReactNode;
  /** Rendered when permission can still be requested. */
  prompt?: (request: () => Promise<CapabilityState>, state: CapabilityState) => React.ReactNode;
}

export function CapabilityGate({
  capability,
  children,
  fallback = null,
  prompt,
}: CapabilityGateProps): React.ReactElement | null {
  const { state, usable, offerable, request } = useCapability(capability);
  if (usable) return <>{children}</>;
  if (prompt && offerable) return <>{prompt(request, state)}</>;
  return <>{fallback}</>;
}
