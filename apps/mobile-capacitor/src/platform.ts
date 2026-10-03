/**
 * Capacitor lane bootstrap.
 *
 * This file is the ONLY place in the monorepo allowed to import `@capacitor/*`.
 * Plugins are loaded optionally so the lane can be deleted wholesale without
 * touching any core package.
 */
import { AgentSamPlatform } from '@inneranimalmedia/agentsam-platform';
import {
  createCapacitorPlatformAdapter,
  type CapacitorCoreLike,
  type CapacitorPlugins,
} from '@inneranimalmedia/agentsam-platform-capacitor';

export const APP_VERSION = '2.6.11-mobile-capacitor.0';

/**
 * Resolve plugins at runtime. Run `npm run lane:install` in this app to add
 * @capacitor/core, /filesystem, /camera, /preferences, /share, /clipboard,
 * /network, /browser and /local-notifications; until then the adapter reports
 * every capability as honestly unavailable instead of pretending.
 */
async function loadPlugins(): Promise<{ plugins: CapacitorPlugins; core?: CapacitorCoreLike }> {
  const plugins: CapacitorPlugins = {};
  let core: CapacitorCoreLike | undefined;

  const optional = async <T>(specifier: string, pick: (module: Record<string, unknown>) => T): Promise<T | undefined> => {
    try {
      const module = (await import(/* @vite-ignore */ specifier)) as Record<string, unknown>;
      return pick(module);
    } catch {
      return undefined;
    }
  };

  core = await optional('@capacitor/core', (module) => module.Capacitor as CapacitorCoreLike);
  plugins.Filesystem = await optional('@capacitor/filesystem', (module) => module.Filesystem as CapacitorPlugins['Filesystem']);
  plugins.Camera = await optional('@capacitor/camera', (module) => module.Camera as CapacitorPlugins['Camera']);
  plugins.Preferences = await optional('@capacitor/preferences', (module) => module.Preferences as CapacitorPlugins['Preferences']);
  plugins.Share = await optional('@capacitor/share', (module) => module.Share as CapacitorPlugins['Share']);
  plugins.Clipboard = await optional('@capacitor/clipboard', (module) => module.Clipboard as CapacitorPlugins['Clipboard']);
  plugins.Network = await optional('@capacitor/network', (module) => module.Network as CapacitorPlugins['Network']);
  plugins.Browser = await optional('@capacitor/browser', (module) => module.Browser as CapacitorPlugins['Browser']);
  plugins.LocalNotifications = await optional(
    '@capacitor/local-notifications',
    (module) => module.LocalNotifications as CapacitorPlugins['LocalNotifications'],
  );

  return { plugins, core };
}

export async function createPlatform(): Promise<AgentSamPlatform> {
  const { plugins, core } = await loadPlugins();
  return AgentSamPlatform.create(
    createCapacitorPlatformAdapter({ plugins, core, displayName: 'AgentSam Mobile · Capacitor lane' }),
  );
}
