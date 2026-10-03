/**
 * @inneranimalmedia/agentsam-platform-capacitor
 *
 * Capacitor adapter for the AgentSam portable capability contract.
 *
 * Capacitor plugins are injected rather than imported so this package:
 *   - compiles and tests without the native toolchain installed,
 *   - never pins a Capacitor major version for the rest of the monorepo,
 *   - can be removed from the repo without breaking any core package.
 *
 * `apps/mobile-capacitor` is the only place that imports `@capacitor/*` and
 * hands the plugins to `createCapacitorPlatformAdapter({ plugins })`.
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
  type CameraPort,
  type CapabilityId,
  type CapabilityState,
  type ClipboardPort,
  type FilesystemPort,
  type NetworkPort,
  type NotificationsPort,
  type PlatformIdentity,
  type SecureStorePort,
  type SharePort,
  type BrowserPort,
} from '@inneranimalmedia/agentsam-platform';

export const CAPACITOR_ADAPTER_VERSION = '1.0.0';

// ----------------------------------------------------------------------
// Structural plugin surface (mirrors @capacitor/* APIs we use)
// ----------------------------------------------------------------------

export type CapacitorPermissionState = 'prompt' | 'prompt-with-rationale' | 'granted' | 'denied';

export interface CapacitorFilesystemPlugin {
  readFile(options: { path: string; directory?: string; encoding?: string }): Promise<{ data: string }>;
  writeFile(options: { path: string; data: string; directory?: string; encoding?: string; recursive?: boolean }): Promise<{ uri: string }>;
  deleteFile(options: { path: string; directory?: string }): Promise<void>;
  mkdir(options: { path: string; directory?: string; recursive?: boolean }): Promise<void>;
  readdir(options: { path: string; directory?: string }): Promise<{ files: Array<{ name: string; type: string; size: number; mtime: number; uri: string }> }>;
  stat(options: { path: string; directory?: string }): Promise<{ type: string; size: number; mtime: number; uri: string }>;
}

export interface CapacitorCameraPlugin {
  getPhoto(options: { quality?: number; resultType?: string; source?: string; direction?: string; allowEditing?: boolean }): Promise<{ dataUrl?: string; path?: string; format: string }>;
  checkPermissions(): Promise<{ camera: CapacitorPermissionState; photos?: CapacitorPermissionState }>;
  requestPermissions(): Promise<{ camera: CapacitorPermissionState; photos?: CapacitorPermissionState }>;
}

export interface CapacitorPreferencesPlugin {
  get(options: { key: string }): Promise<{ value: string | null }>;
  set(options: { key: string; value: string }): Promise<void>;
  remove(options: { key: string }): Promise<void>;
  keys(): Promise<{ keys: string[] }>;
}

export interface CapacitorSecureStoragePlugin {
  get(options: { key: string }): Promise<{ value: string | null }>;
  set(options: { key: string; value: string }): Promise<void>;
  remove(options: { key: string }): Promise<void>;
  keys?(): Promise<{ keys: string[] }>;
}

export interface CapacitorSharePlugin {
  share(options: { title?: string; text?: string; url?: string; dialogTitle?: string }): Promise<{ activityType?: string }>;
  canShare?(): Promise<{ value: boolean }>;
}

export interface CapacitorClipboardPlugin {
  read(): Promise<{ value: string; type: string }>;
  write(options: { string?: string; image?: string; url?: string }): Promise<void>;
}

export interface CapacitorNetworkPlugin {
  getStatus(): Promise<{ connected: boolean; connectionType: string }>;
  addListener(event: 'networkStatusChange', listener: (status: { connected: boolean; connectionType: string }) => void): Promise<{ remove(): Promise<void> }>;
}

export interface CapacitorBrowserPlugin {
  open(options: { url: string; toolbarColor?: string; presentationStyle?: string }): Promise<void>;
  close(): Promise<void>;
  addListener(event: 'browserFinished', listener: () => void): Promise<{ remove(): Promise<void> }>;
}

export interface CapacitorLocalNotificationsPlugin {
  schedule(options: { notifications: Array<{ id: number; title: string; body?: string; schedule?: { at: Date }; extra?: Record<string, unknown> }> }): Promise<void>;
  cancel(options: { notifications: Array<{ id: string }> }): Promise<void>;
  checkPermissions(): Promise<{ display: CapacitorPermissionState }>;
  requestPermissions(): Promise<{ display: CapacitorPermissionState }>;
}

export interface CapacitorBackgroundRunnerPlugin {
  dispatchEvent(options: { label: string; event: string; details: Record<string, unknown> }): Promise<unknown>;
}

export interface CapacitorPlugins {
  Filesystem?: CapacitorFilesystemPlugin;
  Camera?: CapacitorCameraPlugin;
  Preferences?: CapacitorPreferencesPlugin;
  SecureStorage?: CapacitorSecureStoragePlugin;
  Share?: CapacitorSharePlugin;
  Clipboard?: CapacitorClipboardPlugin;
  Network?: CapacitorNetworkPlugin;
  Browser?: CapacitorBrowserPlugin;
  LocalNotifications?: CapacitorLocalNotificationsPlugin;
  BackgroundRunner?: CapacitorBackgroundRunnerPlugin;
}

export interface CapacitorCoreLike {
  getPlatform(): string;
  isNativePlatform(): boolean;
}

export interface CapacitorAdapterOptions {
  plugins: CapacitorPlugins;
  core?: CapacitorCoreLike;
  /** Default Filesystem directory, e.g. 'DATA' or 'DOCUMENTS'. */
  directory?: string;
  displayName?: string;
}

function toPermission(state: CapacitorPermissionState | undefined): CapabilityState['permission'] {
  switch (state) {
    case 'granted':
      return 'granted';
    case 'denied':
      return 'denied';
    case 'prompt':
    case 'prompt-with-rationale':
      return 'prompt';
    default:
      return 'unknown';
  }
}

export function createCapacitorPlatformAdapter(options: CapacitorAdapterOptions): AgentSamPlatformAdapter {
  const { plugins } = options;
  const directory = options.directory ?? 'DATA';
  const platformName = options.core?.getPlatform?.() ?? 'web';
  const isNative = options.core?.isNativePlatform?.() ?? platformName !== 'web';

  const identity: PlatformIdentity = {
    lane: 'capacitor',
    os: platformName === 'ios' ? 'ios' : platformName === 'android' ? 'android' : 'web',
    formFactor: platformName === 'web' ? 'web' : 'phone',
    displayName: options.displayName ?? `AgentSam Capacitor (${platformName})`,
    adapterVersion: CAPACITOR_ADAPTER_VERSION,
    installed: isNative,
  };

  const filesystem: FilesystemPort | undefined = plugins.Filesystem && {
    async roots() {
      return [directory];
    },
    async list(path) {
      const result = await plugins.Filesystem!.readdir({ path, directory });
      return result.files.map((file) => ({
        path: `${path.replace(/\/$/, '')}/${file.name}`,
        name: file.name,
        kind: file.type === 'directory' ? ('directory' as const) : ('file' as const),
        sizeBytes: file.size,
        modifiedAt: new Date(file.mtime).toISOString(),
      }));
    },
    async exists(path) {
      try {
        await plugins.Filesystem!.stat({ path, directory });
        return true;
      } catch {
        return false;
      }
    },
    async readText(path) {
      const result = await plugins.Filesystem!.readFile({ path, directory, encoding: 'utf8' });
      return result.data;
    },
    async readBytes(path) {
      const result = await plugins.Filesystem!.readFile({ path, directory });
      return Uint8Array.from(atob(result.data), (char) => char.charCodeAt(0));
    },
    async writeText(path, contents) {
      await plugins.Filesystem!.writeFile({ path, data: contents, directory, encoding: 'utf8', recursive: true });
      return { path, name: path.split('/').pop() ?? path, kind: 'file', sizeBytes: contents.length };
    },
    async writeBytes(path, contents) {
      const base64 = btoa(String.fromCharCode(...contents));
      await plugins.Filesystem!.writeFile({ path, data: base64, directory, recursive: true });
      return { path, name: path.split('/').pop() ?? path, kind: 'file', sizeBytes: contents.byteLength };
    },
    async remove(path) {
      await plugins.Filesystem!.deleteFile({ path, directory });
    },
    async mkdir(path) {
      await plugins.Filesystem!.mkdir({ path, directory, recursive: true });
    },
  };

  const camera: CameraPort | undefined = plugins.Camera && {
    async capturePhoto(photoOptions) {
      const photo = await plugins.Camera!.getPhoto({
        quality: Math.round((photoOptions?.quality ?? 0.9) * 100),
        resultType: 'dataUrl',
        source: 'CAMERA',
        direction: photoOptions?.facing === 'front' ? 'FRONT' : 'REAR',
        allowEditing: photoOptions?.allowEditing,
      });
      return {
        dataUrl: photo.dataUrl,
        path: photo.path,
        mimeType: `image/${photo.format || 'jpeg'}`,
        capturedAt: new Date().toISOString(),
      };
    },
    async pickFromLibrary() {
      const photo = await plugins.Camera!.getPhoto({ resultType: 'dataUrl', source: 'PHOTOS' });
      return [
        {
          dataUrl: photo.dataUrl,
          path: photo.path,
          mimeType: `image/${photo.format || 'jpeg'}`,
          capturedAt: new Date().toISOString(),
        },
      ];
    },
  };

  const secureStore: SecureStorePort | undefined = (plugins.SecureStorage ?? plugins.Preferences) && {
    hardwareBacked: Boolean(plugins.SecureStorage),
    async get(key) {
      const store = plugins.SecureStorage ?? plugins.Preferences!;
      return (await store.get({ key })).value;
    },
    async set(key, value) {
      const store = plugins.SecureStorage ?? plugins.Preferences!;
      await store.set({ key, value });
    },
    async delete(key) {
      const store = plugins.SecureStorage ?? plugins.Preferences!;
      await store.remove({ key });
    },
    async keys() {
      const store = plugins.SecureStorage ?? plugins.Preferences!;
      return store.keys ? (await store.keys()).keys : [];
    },
  };

  const share: SharePort | undefined = plugins.Share && {
    async share(payload) {
      const result = await plugins.Share!.share({ title: payload.title, text: payload.text, url: payload.url });
      return { completed: true, target: result.activityType };
    },
    async canShare() {
      return plugins.Share!.canShare ? (await plugins.Share!.canShare()).value : true;
    },
  };

  const clipboard: ClipboardPort | undefined = plugins.Clipboard && {
    async readText() {
      return (await plugins.Clipboard!.read()).value;
    },
    async writeText(value) {
      await plugins.Clipboard!.write({ string: value });
    },
  };

  const network: NetworkPort | undefined = plugins.Network && {
    async status() {
      const status = await plugins.Network!.getStatus();
      return {
        online: status.connected,
        connectionType:
          status.connectionType === 'wifi' || status.connectionType === 'cellular' || status.connectionType === 'none'
            ? status.connectionType
            : 'unknown',
      };
    },
    subscribe(listener) {
      let remove: (() => Promise<void>) | null = null;
      void plugins
        .Network!.addListener('networkStatusChange', (status) =>
          listener({
            online: status.connected,
            connectionType:
              status.connectionType === 'wifi' || status.connectionType === 'cellular' || status.connectionType === 'none'
                ? status.connectionType
                : 'unknown',
          }),
        )
        .then((handle) => {
          remove = () => handle.remove();
        });
      return () => {
        void remove?.();
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

  const browser: BrowserPort | undefined = plugins.Browser && {
    supportsEmbeddedSurface: true,
    async openExternal(url) {
      await plugins.Browser!.open({ url });
    },
    async openInApp(url, inAppOptions) {
      await plugins.Browser!.open({ url, toolbarColor: inAppOptions?.toolbarColor });
      const closed = new Promise<void>((resolve) => {
        void plugins.Browser!.addListener('browserFinished', () => resolve());
      });
      return { closed };
    },
  };

  const notifications: NotificationsPort | undefined = plugins.LocalNotifications && {
    async notify(request) {
      const numericId = Math.abs(Math.floor(Math.random() * 2 ** 31));
      await plugins.LocalNotifications!.schedule({
        notifications: [
          {
            id: numericId,
            title: request.title,
            body: request.body,
            schedule: request.scheduleAt ? { at: new Date(request.scheduleAt) } : undefined,
            extra: { route: request.route, ...request.data },
          },
        ],
      });
      return { id: String(numericId) };
    },
    async cancel(id) {
      await plugins.LocalNotifications!.cancel({ notifications: [{ id }] });
    },
  };

  async function probe(): Promise<AgentSamPlatformCapabilities> {
    const cameraPermission = plugins.Camera ? toPermission((await plugins.Camera.checkPermissions()).camera) : 'unknown';
    const notificationPermission = plugins.LocalNotifications
      ? toPermission((await plugins.LocalNotifications.checkPermissions()).display)
      : 'unknown';

    const gate = (
      id: CapabilityId,
      plugin: unknown,
      implementation: string,
      features: string[],
      permission: CapabilityState['permission'] = 'granted',
      constraints?: Parameters<typeof available>[3],
    ): CapabilityState => {
      if (!plugin) return unavailable(id, `Capacitor plugin for ${id} is not installed in this build.`, 'capacitor.none');
      if (permission === 'denied') return denied(id, implementation);
      if (permission === 'prompt' || permission === 'unknown') {
        return requiresPermission(id, implementation, features, constraints);
      }
      return available(id, implementation, features, constraints);
    };

    return {
      filesystem: gate('filesystem', plugins.Filesystem, 'capacitor.filesystem', ['read', 'write', 'list', 'delete', 'mkdir'], 'granted', {
        sandboxed: true,
        notes: [`Scoped to the ${directory} directory.`],
      }),
      camera: gate('camera', plugins.Camera, 'capacitor.camera', ['photo', 'library'], cameraPermission, { foregroundOnly: true }),
      microphone: unavailable(
        'microphone',
        'Install @capacitor-community/voice-recorder and pass it to the adapter to enable microphone capture.',
        'capacitor.none',
      ),
      notifications: gate('notifications', plugins.LocalNotifications, 'capacitor.local-notifications', ['immediate', 'scheduled'], notificationPermission),
      secureStore: plugins.SecureStorage
        ? available('secureStore', 'capacitor.secure-storage', ['get', 'set', 'delete'], { sandboxed: true })
        : plugins.Preferences
          ? degraded('secureStore', 'capacitor.preferences', 'Preferences is not hardware-backed storage.', ['get', 'set', 'delete', 'keys'])
          : unavailable('secureStore', 'No storage plugin supplied.', 'capacitor.none'),
      share: gate('share', plugins.Share, 'capacitor.share', ['text', 'url'], 'granted', { requiresUserGesture: true }),
      clipboard: gate('clipboard', plugins.Clipboard, 'capacitor.clipboard', ['read-text', 'write-text']),
      network: gate('network', plugins.Network, 'capacitor.network', ['status', 'subscribe', 'fetch']),
      browser: gate('browser', plugins.Browser, 'capacitor.browser', ['external', 'in-app', 'embedded-surface']),
      terminal: unavailable('terminal', 'Mobile sandboxes forbid arbitrary process execution. Use the remote ACP daemon.', 'capacitor.none'),
      localModels: unavailable(
        'localModels',
        'No local inference plugin supplied. Bridge a native runtime and pass it to the adapter to enable this.',
        'capacitor.none',
      ),
      backgroundExecution: plugins.BackgroundRunner
        ? degraded(
            'backgroundExecution',
            'capacitor.background-runner',
            'The OS schedules background runs; timing is never guaranteed.',
            ['scheduled-task'],
          )
        : unavailable('backgroundExecution', '@capacitor/background-runner is not installed in this build.', 'capacitor.none'),
    };
  }

  return defineAdapter({
    identity,
    probe,
    async request(id) {
      if (id === 'camera' && plugins.Camera) await plugins.Camera.requestPermissions();
      if (id === 'notifications' && plugins.LocalNotifications) await plugins.LocalNotifications.requestPermissions();
      return (await probe())[id];
    },
    ports: () => ({
      ...(filesystem ? { filesystem } : {}),
      ...(camera ? { camera } : {}),
      ...(notifications ? { notifications } : {}),
      ...(secureStore ? { secureStore } : {}),
      ...(share ? { share } : {}),
      ...(clipboard ? { clipboard } : {}),
      ...(network ? { network } : {}),
      ...(browser ? { browser } : {}),
    }),
  });
}
