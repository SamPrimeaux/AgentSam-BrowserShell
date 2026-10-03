/**
 * Tauri mobile lane bootstrap.
 *
 * The ONLY place allowed to import `@tauri-apps/api`. Everything else talks
 * to the capability contract. Device authority lives in Rust (src-tauri).
 */
import { AgentSamPlatform } from '@inneranimalmedia/agentsam-platform';
import { createTauriPlatformAdapter, type TauriBridge } from '@inneranimalmedia/agentsam-platform-tauri';

export const APP_VERSION = '2.6.11-mobile-tauri.0';

/**
 * Optional runtime import. The specifier is a variable so this lane compiles
 * in CI before `@tauri-apps/*` is installed, and so the lane stays deletable.
 */
async function optional<T>(specifier: string, pick: (module: Record<string, unknown>) => T): Promise<T | undefined> {
  try {
    const module = (await import(/* @vite-ignore */ specifier)) as Record<string, unknown>;
    return pick(module);
  } catch {
    return undefined;
  }
}

type TauriListen = <T>(name: string, handler: (event: { payload: T }) => void) => Promise<() => void>;

async function loadBridge(): Promise<TauriBridge> {
  const invoke = await optional('@tauri-apps/api/core', (module) => module.invoke as TauriBridge['invoke']);
  const listen = await optional('@tauri-apps/api/event', (module) => module.listen as TauriListen);
  const platform = await optional('@tauri-apps/plugin-os', (module) => (module.platform as () => string)?.());

  if (!invoke) {
    // Running in a plain browser (vite dev without `tauri dev`): report the
    // boundary honestly instead of pretending the native side exists.
    return {
      invoke: async () => {
        throw new Error('Tauri bridge unavailable: start this lane with `npm run lane:dev`.');
      },
    };
  }

  return {
    invoke,
    listen: listen
      ? async <T,>(name: string, handler: (payload: T) => void) =>
          listen<T>(name, (wrapped) => handler(wrapped.payload))
      : undefined,
    platform,
  };
}

export async function createPlatform(): Promise<AgentSamPlatform> {
  const bridge = await loadBridge();
  return AgentSamPlatform.create(
    createTauriPlatformAdapter({ bridge, displayName: 'AgentSam Mobile · Tauri lane' }),
  );
}
