/**
 * @inneranimalmedia/agentsam-platform-expo
 *
 * Expo (React Native) adapter for the AgentSam portable capability contract.
 *
 * Expo modules are injected, not imported: the package compiles in CI without
 * the React Native toolchain, and `apps/mobile-expo` is the only place that
 * imports `expo-*`.
 */

import {
  available,
  defineAdapter,
  degraded,
  denied,
  requiresPermission,
  unavailable,
  type AgentSamPlatformAdapter,
  type AgentSamPlatformCapabilities,
  type BackgroundExecutionPort,
  type BrowserPort,
  type CameraPort,
  type CapabilityState,
  type ClipboardPort,
  type FilesystemPort,
  type LocalModelsPort,
  type MicrophonePort,
  type NetworkPort,
  type NotificationsPort,
  type PlatformIdentity,
  type SecureStorePort,
  type SharePort,
} from '@inneranimalmedia/agentsam-platform';

export const EXPO_ADAPTER_VERSION = '1.0.0';

// ----------------------------------------------------------------------
// Structural module surface (mirrors expo-* APIs we use)
// ----------------------------------------------------------------------

export interface ExpoPermissionResponse {
  status: 'granted' | 'denied' | 'undetermined';
  canAskAgain?: boolean;
}

export interface ExpoFileSystemModule {
  documentDirectory: string | null;
  cacheDirectory?: string | null;
  readAsStringAsync(uri: string, options?: { encoding?: string }): Promise<string>;
  writeAsStringAsync(uri: string, contents: string, options?: { encoding?: string }): Promise<void>;
  deleteAsync(uri: string, options?: { idempotent?: boolean }): Promise<void>;
  makeDirectoryAsync(uri: string, options?: { intermediates?: boolean }): Promise<void>;
  readDirectoryAsync(uri: string): Promise<string[]>;
  getInfoAsync(uri: string): Promise<{ exists: boolean; size?: number; modificationTime?: number; isDirectory?: boolean }>;
}

export interface ExpoImagePickerModule {
  launchCameraAsync(options?: { quality?: number; base64?: boolean; allowsEditing?: boolean; cameraType?: unknown }): Promise<{
    canceled: boolean;
    assets?: Array<{ uri: string; base64?: string; width?: number; height?: number; mimeType?: string; fileSize?: number }>;
  }>;
  launchImageLibraryAsync(options?: { allowsMultipleSelection?: boolean; base64?: boolean }): Promise<{
    canceled: boolean;
    assets?: Array<{ uri: string; base64?: string; width?: number; height?: number; mimeType?: string; fileSize?: number }>;
  }>;
  getCameraPermissionsAsync(): Promise<ExpoPermissionResponse>;
  requestCameraPermissionsAsync(): Promise<ExpoPermissionResponse>;
}

export interface ExpoAudioModule {
  requestPermissionsAsync(): Promise<ExpoPermissionResponse>;
  getPermissionsAsync(): Promise<ExpoPermissionResponse>;
  Recording: {
    createAsync(options?: unknown): Promise<{
      recording: {
        stopAndUnloadAsync(): Promise<void>;
        getURI(): string | null;
        getStatusAsync(): Promise<{ durationMillis?: number }>;
      };
    }>;
  };
}

export interface ExpoSecureStoreModule {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string, options?: { keychainAccessible?: unknown }): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
  isAvailableAsync?(): Promise<boolean>;
}

export interface ExpoNotificationsModule {
  getPermissionsAsync(): Promise<ExpoPermissionResponse>;
  requestPermissionsAsync(): Promise<ExpoPermissionResponse>;
  scheduleNotificationAsync(request: { content: { title: string; body?: string; data?: Record<string, unknown> }; trigger: unknown }): Promise<string>;
  cancelScheduledNotificationAsync(id: string): Promise<void>;
  addNotificationResponseReceivedListener(listener: (response: { notification: { request: { identifier: string; content: { data?: Record<string, unknown> } } } }) => void): { remove(): void };
}

export interface ExpoClipboardModule {
  getStringAsync(): Promise<string>;
  setStringAsync(value: string): Promise<boolean>;
}

export interface ExpoNetworkModule {
  getNetworkStateAsync(): Promise<{ isConnected?: boolean; type?: string; isInternetReachable?: boolean }>;
}

export interface ExpoWebBrowserModule {
  openBrowserAsync(url: string, options?: { toolbarColor?: string }): Promise<{ type: string }>;
  openAuthSessionAsync(url: string, redirectUrl: string): Promise<{ type: string; url?: string }>;
  dismissBrowser?(): void;
}

export interface ReactNativeShareModule {
  share(content: { title?: string; message?: string; url?: string }): Promise<{ action: string; activityType?: string }>;
}

export interface ReactNativeLinkingModule {
  openURL(url: string): Promise<void>;
}

export interface ExpoTaskManagerModule {
  defineTask(name: string, task: (body: unknown) => Promise<unknown>): void;
  isTaskRegisteredAsync(name: string): Promise<boolean>;
}

export interface ExpoBackgroundFetchModule {
  registerTaskAsync(name: string, options?: { minimumInterval?: number; stopOnTerminate?: boolean; startOnBoot?: boolean }): Promise<void>;
  unregisterTaskAsync(name: string): Promise<void>;
}

export interface ExpoModules {
  FileSystem?: ExpoFileSystemModule;
  ImagePicker?: ExpoImagePickerModule;
  Audio?: ExpoAudioModule;
  SecureStore?: ExpoSecureStoreModule;
  Notifications?: ExpoNotificationsModule;
  Clipboard?: ExpoClipboardModule;
  Network?: ExpoNetworkModule;
  WebBrowser?: ExpoWebBrowserModule;
  Share?: ReactNativeShareModule;
  Linking?: ReactNativeLinkingModule;
  TaskManager?: ExpoTaskManagerModule;
  BackgroundFetch?: ExpoBackgroundFetchModule;
  /** Optional native local-inference bridge (llama.rn, MLC, ExecuTorch, ...). */
  LocalModels?: LocalModelsPort;
}

export interface ExpoAdapterOptions {
  modules: ExpoModules;
  /** 'ios' | 'android' | 'web' from react-native Platform.OS. */
  os?: 'ios' | 'android' | 'web';
  /** True when react-native Platform.isPad or a tablet breakpoint applies. */
  tablet?: boolean;
  displayName?: string;
  appVersion?: string;
}

function toPermission(response: ExpoPermissionResponse | undefined): CapabilityState['permission'] {
  if (!response) return 'unknown';
  if (response.status === 'granted') return 'granted';
  if (response.status === 'denied') return response.canAskAgain ? 'prompt' : 'denied';
  return 'prompt';
}

export function createExpoPlatformAdapter(options: ExpoAdapterOptions): AgentSamPlatformAdapter {
  const { modules } = options;
  const os = options.os ?? 'ios';
  const base = modules.FileSystem?.documentDirectory ?? 'file:///agentsam/';
  const uri = (path: string): string => (path.startsWith('file:') ? path : `${base}${path.replace(/^\//, '')}`);

  const identity: PlatformIdentity = {
    lane: 'expo',
    os,
    formFactor: os === 'web' ? 'web' : options.tablet ? 'tablet' : 'phone',
    displayName: options.displayName ?? `AgentSam Expo (${os})`,
    adapterVersion: EXPO_ADAPTER_VERSION,
    installed: os !== 'web',
  };

  const filesystem: FilesystemPort | undefined = modules.FileSystem && {
    async roots() {
      return [base];
    },
    async list(path) {
      const names = await modules.FileSystem!.readDirectoryAsync(uri(path));
      const entries = [];
      for (const name of names) {
        const info = await modules.FileSystem!.getInfoAsync(`${uri(path).replace(/\/$/, '')}/${name}`);
        entries.push({
          path: `${path.replace(/\/$/, '')}/${name}`,
          name,
          kind: info.isDirectory ? ('directory' as const) : ('file' as const),
          sizeBytes: info.size,
          modifiedAt: info.modificationTime ? new Date(info.modificationTime * 1000).toISOString() : undefined,
        });
      }
      return entries;
    },
    async exists(path) {
      return (await modules.FileSystem!.getInfoAsync(uri(path))).exists;
    },
    async readText(path) {
      return modules.FileSystem!.readAsStringAsync(uri(path));
    },
    async readBytes(path) {
      const base64 = await modules.FileSystem!.readAsStringAsync(uri(path), { encoding: 'base64' });
      return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
    },
    async writeText(path, contents) {
      await modules.FileSystem!.writeAsStringAsync(uri(path), contents);
      return { path, name: path.split('/').pop() ?? path, kind: 'file', sizeBytes: contents.length };
    },
    async writeBytes(path, contents) {
      const base64 = btoa(String.fromCharCode(...contents));
      await modules.FileSystem!.writeAsStringAsync(uri(path), base64, { encoding: 'base64' });
      return { path, name: path.split('/').pop() ?? path, kind: 'file', sizeBytes: contents.byteLength };
    },
    async remove(path) {
      await modules.FileSystem!.deleteAsync(uri(path), { idempotent: true });
    },
    async mkdir(path) {
      await modules.FileSystem!.makeDirectoryAsync(uri(path), { intermediates: true });
    },
  };

  const camera: CameraPort | undefined = modules.ImagePicker && {
    async capturePhoto(photoOptions) {
      const result = await modules.ImagePicker!.launchCameraAsync({
        quality: photoOptions?.quality ?? 0.9,
        base64: true,
        allowsEditing: photoOptions?.allowEditing,
      });
      const asset = result.assets?.[0];
      if (result.canceled || !asset) throw new Error('Capture cancelled.');
      return {
        dataUrl: asset.base64 ? `data:${asset.mimeType ?? 'image/jpeg'};base64,${asset.base64}` : undefined,
        path: asset.uri,
        mimeType: asset.mimeType ?? 'image/jpeg',
        width: asset.width,
        height: asset.height,
        sizeBytes: asset.fileSize,
        capturedAt: new Date().toISOString(),
      };
    },
    async pickFromLibrary(pickOptions) {
      const result = await modules.ImagePicker!.launchImageLibraryAsync({
        allowsMultipleSelection: pickOptions?.multiple,
        base64: true,
      });
      return (result.assets ?? []).map((asset) => ({
        dataUrl: asset.base64 ? `data:${asset.mimeType ?? 'image/jpeg'};base64,${asset.base64}` : undefined,
        path: asset.uri,
        mimeType: asset.mimeType ?? 'image/jpeg',
        width: asset.width,
        height: asset.height,
        sizeBytes: asset.fileSize,
        capturedAt: new Date().toISOString(),
      }));
    },
  };

  const microphone: MicrophonePort | undefined = modules.Audio && {
    async startRecording() {
      const { recording } = await modules.Audio!.Recording.createAsync();
      const startedAt = Date.now();
      return {
        id: `rec_${startedAt}`,
        async stop() {
          const status = await recording.getStatusAsync();
          await recording.stopAndUnloadAsync();
          return {
            path: recording.getURI() ?? undefined,
            mimeType: os === 'ios' ? 'audio/m4a' : 'audio/mp4',
            durationMs: status.durationMillis ?? Date.now() - startedAt,
          };
        },
        async cancel() {
          await recording.stopAndUnloadAsync();
        },
      };
    },
  };

  const secureStore: SecureStorePort | undefined = modules.SecureStore && {
    hardwareBacked: true,
    async get(key) {
      return modules.SecureStore!.getItemAsync(key);
    },
    async set(key, value) {
      await modules.SecureStore!.setItemAsync(key, value);
    },
    async delete(key) {
      await modules.SecureStore!.deleteItemAsync(key);
    },
    async keys() {
      // expo-secure-store has no enumeration API; AgentSam keeps an index key.
      const index = await modules.SecureStore!.getItemAsync('agentsam.secure.index');
      return index ? (JSON.parse(index) as string[]) : [];
    },
  };

  const notifications: NotificationsPort | undefined = modules.Notifications && {
    async notify(request) {
      const id = await modules.Notifications!.scheduleNotificationAsync({
        content: { title: request.title, body: request.body, data: { route: request.route, ...request.data } },
        trigger: request.scheduleAt ? { date: new Date(request.scheduleAt) } : null,
      });
      return { id };
    },
    async cancel(id) {
      await modules.Notifications!.cancelScheduledNotificationAsync(id);
    },
    onOpened(listener) {
      const subscription = modules.Notifications!.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data ?? {};
        listener({ id: response.notification.request.identifier, route: data.route as string | undefined, data });
      });
      return () => subscription.remove();
    },
  };

  const clipboard: ClipboardPort | undefined = modules.Clipboard && {
    async readText() {
      return modules.Clipboard!.getStringAsync();
    },
    async writeText(value) {
      await modules.Clipboard!.setStringAsync(value);
    },
  };

  const share: SharePort | undefined = modules.Share && {
    async share(payload) {
      const result = await modules.Share!.share({ title: payload.title, message: payload.text, url: payload.url });
      return { completed: result.action !== 'dismissedAction', target: result.activityType };
    },
  };

  const network: NetworkPort | undefined = modules.Network && {
    async status() {
      const state = await modules.Network!.getNetworkStateAsync();
      const type = (state.type ?? '').toLowerCase();
      return {
        online: Boolean(state.isConnected && state.isInternetReachable !== false),
        connectionType: type.includes('wifi') ? 'wifi' : type.includes('cellular') ? 'cellular' : state.isConnected ? 'unknown' : 'none',
      };
    },
    subscribe(listener) {
      let active = true;
      const poll = async () => {
        while (active) {
          listener(await this.status());
          await new Promise((resolve) => setTimeout(resolve, 10_000));
        }
      };
      void poll();
      return () => {
        active = false;
      };
    },
    async fetch(input, init) {
      const response = await fetch(input, init);
      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });
      return { status: response.status, headers, body: await response.text() };
    },
  };

  const browser: BrowserPort | undefined = (modules.WebBrowser ?? modules.Linking) && {
    supportsEmbeddedSurface: true,
    async openExternal(url) {
      if (modules.Linking) await modules.Linking.openURL(url);
      else await modules.WebBrowser!.openBrowserAsync(url);
    },
    async openInApp(url, inAppOptions) {
      const promise = modules.WebBrowser!.openBrowserAsync(url, { toolbarColor: inAppOptions?.toolbarColor });
      return { closed: promise.then(() => undefined) };
    },
    async authFlow(url, redirectScheme) {
      const result = await modules.WebBrowser!.openAuthSessionAsync(url, redirectScheme);
      if (result.type !== 'success' || !result.url) throw new Error(`Auth session ended: ${result.type}`);
      return { redirectUrl: result.url };
    },
  };

  const backgroundExecution: BackgroundExecutionPort | undefined = modules.BackgroundFetch && {
    async schedule(request) {
      await modules.BackgroundFetch!.registerTaskAsync(request.id, {
        minimumInterval: 15 * 60,
        stopOnTerminate: false,
        startOnBoot: true,
      });
      return { id: request.id, scheduled: true };
    },
    async cancel(id) {
      await modules.BackgroundFetch!.unregisterTaskAsync(id);
    },
  };

  async function probe(): Promise<AgentSamPlatformCapabilities> {
    const cameraPermission = modules.ImagePicker ? toPermission(await modules.ImagePicker.getCameraPermissionsAsync()) : 'unknown';
    const micPermission = modules.Audio ? toPermission(await modules.Audio.getPermissionsAsync()) : 'unknown';
    const notificationPermission = modules.Notifications ? toPermission(await modules.Notifications.getPermissionsAsync()) : 'unknown';

    const gate = (
      id: Parameters<typeof available>[0],
      present: unknown,
      implementation: string,
      features: string[],
      permission: CapabilityState['permission'] = 'granted',
      constraints?: Parameters<typeof available>[3],
    ): CapabilityState => {
      if (!present) return unavailable(id, `Expo module for ${id} is not installed in this build.`, 'expo.none');
      if (permission === 'denied') return denied(id, implementation);
      if (permission === 'prompt' || permission === 'unknown') return requiresPermission(id, implementation, features, constraints);
      return available(id, implementation, features, constraints);
    };

    return {
      filesystem: gate('filesystem', modules.FileSystem, 'expo.filesystem', ['read', 'write', 'list', 'delete', 'mkdir'], 'granted', {
        sandboxed: true,
        notes: ['Scoped to the app document directory.'],
      }),
      camera: gate('camera', modules.ImagePicker, 'expo.image-picker', ['photo', 'library'], cameraPermission, { foregroundOnly: true }),
      microphone: gate('microphone', modules.Audio, 'expo.av-recording', ['record'], micPermission, { foregroundOnly: true }),
      notifications: gate('notifications', modules.Notifications, 'expo.notifications', ['immediate', 'scheduled', 'deep-link'], notificationPermission),
      secureStore: modules.SecureStore
        ? available('secureStore', 'expo.secure-store', ['get', 'set', 'delete'], { sandboxed: true, notes: ['Keychain / Keystore backed.'] })
        : unavailable('secureStore', 'expo-secure-store is not installed.', 'expo.none'),
      share: gate('share', modules.Share, 'react-native.share', ['text', 'url'], 'granted', { requiresUserGesture: true }),
      clipboard: gate('clipboard', modules.Clipboard, 'expo.clipboard', ['read-text', 'write-text']),
      network: gate('network', modules.Network, 'expo.network', ['status', 'subscribe', 'fetch']),
      browser: gate('browser', modules.WebBrowser ?? modules.Linking, 'expo.web-browser', ['external', 'in-app', 'auth-flow', 'embedded-surface']),
      terminal: unavailable('terminal', 'Mobile sandboxes forbid arbitrary process execution. Use the remote ACP daemon.', 'expo.none'),
      localModels: modules.LocalModels
        ? degraded('localModels', 'expo.native-bridge', 'On-device inference is thermally and memory constrained.', ['generate'])
        : unavailable('localModels', 'No on-device inference module supplied.', 'expo.none'),
      backgroundExecution: modules.BackgroundFetch
        ? degraded('backgroundExecution', 'expo.background-fetch', 'iOS schedules opportunistically; never promise timing.', ['scheduled-task'], {
            notes: ['Minimum interval is 15 minutes and the OS may ignore it.'],
          })
        : unavailable('backgroundExecution', 'expo-background-fetch is not installed.', 'expo.none'),
    };
  }

  return defineAdapter({
    identity,
    probe,
    async request(id) {
      if (id === 'camera') await modules.ImagePicker?.requestCameraPermissionsAsync();
      if (id === 'microphone') await modules.Audio?.requestPermissionsAsync();
      if (id === 'notifications') await modules.Notifications?.requestPermissionsAsync();
      return (await probe())[id];
    },
    ports: () => ({
      ...(filesystem ? { filesystem } : {}),
      ...(camera ? { camera } : {}),
      ...(microphone ? { microphone } : {}),
      ...(notifications ? { notifications } : {}),
      ...(secureStore ? { secureStore } : {}),
      ...(share ? { share } : {}),
      ...(clipboard ? { clipboard } : {}),
      ...(network ? { network } : {}),
      ...(browser ? { browser } : {}),
      ...(backgroundExecution ? { backgroundExecution } : {}),
      ...(modules.LocalModels ? { localModels: modules.LocalModels } : {}),
    }),
  });
}
