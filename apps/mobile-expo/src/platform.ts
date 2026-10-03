/**
 * Expo lane bootstrap.
 *
 * This file is the ONLY place in the monorepo allowed to import `expo-*`.
 * Modules are resolved optionally so CI can typecheck and so the lane can be
 * deleted without touching a core package.
 */
import { Platform, Share, Linking } from 'react-native';
import { AgentSamPlatform } from '@inneranimalmedia/agentsam-platform';
import { createExpoPlatformAdapter, type ExpoModules } from '@inneranimalmedia/agentsam-platform-expo';

export const APP_VERSION = '2.6.11-mobile-expo.0';

async function optional<T>(specifier: string, pick: (module: Record<string, unknown>) => T): Promise<T | undefined> {
  try {
    const module = (await import(/* @vite-ignore */ specifier)) as Record<string, unknown>;
    return pick(module);
  } catch {
    return undefined;
  }
}

async function loadModules(): Promise<ExpoModules> {
  const modules: ExpoModules = {
    Share: Share as unknown as ExpoModules['Share'],
    Linking: Linking as unknown as ExpoModules['Linking'],
  };

  modules.FileSystem = await optional('expo-file-system', (m) => m as unknown as ExpoModules['FileSystem']);
  modules.ImagePicker = await optional('expo-image-picker', (m) => m as unknown as ExpoModules['ImagePicker']);
  modules.Audio = await optional('expo-av', (m) => m.Audio as ExpoModules['Audio']);
  modules.SecureStore = await optional('expo-secure-store', (m) => m as unknown as ExpoModules['SecureStore']);
  modules.Notifications = await optional('expo-notifications', (m) => m as unknown as ExpoModules['Notifications']);
  modules.Clipboard = await optional('expo-clipboard', (m) => m as unknown as ExpoModules['Clipboard']);
  modules.Network = await optional('expo-network', (m) => m as unknown as ExpoModules['Network']);
  modules.WebBrowser = await optional('expo-web-browser', (m) => m as unknown as ExpoModules['WebBrowser']);
  modules.TaskManager = await optional('expo-task-manager', (m) => m as unknown as ExpoModules['TaskManager']);
  modules.BackgroundFetch = await optional('expo-background-fetch', (m) => m as unknown as ExpoModules['BackgroundFetch']);

  return modules;
}

export async function createPlatform(): Promise<AgentSamPlatform> {
  const modules = await loadModules();
  return AgentSamPlatform.create(
    createExpoPlatformAdapter({
      modules,
      os: Platform.OS,
      tablet: Platform.isPad,
      displayName: 'AgentSam Mobile · Expo lane',
    }),
  );
}
