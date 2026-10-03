/**
 * BrowserStage — the stable host composition.
 *
 *   SideStage
 *      ↓
 *   BrowserStage                 <-- this component
 *      ↓
 *   BrowserProvider
 *      ├── current lightweight browser
 *      └── AgentSamBrowserShell provider
 *
 * This is the integration seam for the ABS work: the donor browser keeps
 * working while the richer implementation is mined incrementally. Nothing
 * here knows which platform it runs on — the browser capability is asked for
 * through @inneranimalmedia/agentsam-platform.
 *
 * It is intentionally additive: App.tsx can adopt it one surface at a time.
 */

import React from 'react';
import {
  AgentSamBrowserSurface,
  createAbsBrowserProvider,
  createLightweightBrowserProvider,
  type AbsGenerationHostLike,
  type BrowserProvider,
  type BrowserSurfaceMode,
  type BrowserSurfaceState,
  type LightweightBrowserHost,
} from '@inneranimalmedia/agentsam-browser-surface';
import type { RuntimeEventAdapter } from '@inneranimalmedia/agentsam-runtime-state';

export interface BrowserStageProps {
  /** The working Local Studio browser, adapted. */
  lightweightHost?: LightweightBrowserHost;
  /** The ABS generation host (e.g. the packaged AgentSam ABS client). */
  absHost?: AbsGenerationHostLike;
  /** Extra providers (remote headless browser, device webview, ...). */
  providers?: BrowserProvider[];
  initialMode?: BrowserSurfaceMode;
  /** Wire browser progress into the one runtime vocabulary. */
  runtime?: RuntimeEventAdapter;
  children: (surface: AgentSamBrowserSurface, state: BrowserSurfaceState) => React.ReactNode;
}

/** Fallback host so the stage never crashes when nothing is wired yet. */
const inertHost: LightweightBrowserHost = {
  async load(url) {
    return {
      location: { url, title: url },
      text: '',
      capturedAt: new Date().toISOString(),
    };
  },
};

export const BrowserStage: React.FC<BrowserStageProps> = ({
  lightweightHost,
  absHost,
  providers = [],
  initialMode = 'browse',
  runtime,
  children,
}) => {
  const surface = React.useMemo(() => {
    const registry: BrowserProvider[] = [
      createLightweightBrowserProvider(lightweightHost ?? inertHost),
      ...(absHost ? [createAbsBrowserProvider({ host: absHost })] : []),
      ...providers,
    ];

    return new AgentSamBrowserSurface({
      providers: registry,
      // Prefer the richer implementation when it is available, but the
      // lightweight browser stays registered and selectable.
      defaultProviderId: absHost ? 'agentsam-browser-shell' : 'lightweight',
      initialMode,
      onRuntimeEvent: runtime
        ? (event) => {
            if (event.phase === 'started') runtime.start(event.operationId, 'browser_navigation', event.label);
            else if (event.phase === 'completed') runtime.complete(event.operationId, event.label);
            else if (event.phase === 'failed') runtime.fail(event.operationId, event.label);
            else runtime.progress(event.operationId, 'browser_navigation', event.label);
          }
        : undefined,
    });
  }, [lightweightHost, absHost, providers, initialMode, runtime]);

  const [state, setState] = React.useState<BrowserSurfaceState>(surface.snapshot);
  React.useEffect(() => surface.subscribe(setState), [surface]);

  return <>{children(surface, state)}</>;
};

export default BrowserStage;
