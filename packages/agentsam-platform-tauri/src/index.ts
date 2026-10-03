/**
 * @inneranimalmedia/agentsam-platform-tauri
 *
 * Tauri (v2, desktop + mobile) adapter for the AgentSam capability contract.
 *
 * Everything crosses a single structural `TauriBridge` so this package has no
 * dependency on `@tauri-apps/api`. The Rust side owns device authority
 * (filesystem, process, crypto, indexing) per the language boundary rule; the
 * TypeScript side only describes and invokes it.
 */

import {
  available,
  defineAdapter,
  degraded,
  requiresPermission,
  unavailable,
  type AgentSamPlatformAdapter,
  type AgentSamPlatformCapabilities,
  type BackgroundExecutionPort,
  type BrowserPort,
  type CameraPort,
  type CapabilityId,
  type CapabilityState,
  type ClipboardPort,
  type FileEntry,
  type FilesystemPort,
  type LocalModelDescriptor,
  type LocalModelsPort,
  type NetworkPort,
  type NotificationsPort,
  type PlatformIdentity,
  type ProcessResult,
  type SecureStorePort,
  type SharePort,
  type TerminalPort,
} from '@inneranimalmedia/agentsam-platform';

export const TAURI_ADAPTER_VERSION = '1.0.0';

/**
 * The Rust commands AgentSam expects. Implemented in
 * `apps/mobile-tauri/src-tauri/src/lib.rs` (and reusable by the desktop shell).
 */
export const TAURI_COMMANDS = {
  probe: 'agentsam_platform_probe',
  requestPermission: 'agentsam_platform_request_permission',
  fsList: 'agentsam_fs_list',
  fsRead: 'agentsam_fs_read_text',
  fsWrite: 'agentsam_fs_write_text',
  fsRemove: 'agentsam_fs_remove',
  fsMkdir: 'agentsam_fs_mkdir',
  fsExists: 'agentsam_fs_exists',
  fsRoots: 'agentsam_fs_roots',
  secretGet: 'agentsam_secret_get',
  secretSet: 'agentsam_secret_set',
  secretDelete: 'agentsam_secret_delete',
  secretKeys: 'agentsam_secret_keys',
  clipboardRead: 'agentsam_clipboard_read',
  clipboardWrite: 'agentsam_clipboard_write',
  share: 'agentsam_share',
  notify: 'agentsam_notify',
  openExternal: 'agentsam_open_external',
  networkStatus: 'agentsam_network_status',
  exec: 'agentsam_exec',
  cameraCapture: 'agentsam_camera_capture',
  modelsList: 'agentsam_models_list',
  modelsGenerate: 'agentsam_models_generate',
  backgroundSchedule: 'agentsam_background_schedule',
  backgroundCancel: 'agentsam_background_cancel',
} as const;

export type TauriCommand = (typeof TAURI_COMMANDS)[keyof typeof TAURI_COMMANDS];

/** Structural mirror of `@tauri-apps/api/core` + `event`. */
export interface TauriBridge {
  invoke<T = unknown>(command: string, args?: Record<string, unknown>): Promise<T>;
  listen?<T = unknown>(event: string, handler: (payload: T) => void): Promise<() => void>;
  /** 'ios' | 'android' | 'macos' | 'windows' | 'linux' */
  platform?: string;
}

/** Shape the Rust `agentsam_platform_probe` command must return. */
export interface TauriCapabilityReport {
  lane?: string;
  os?: string;
  formFactor?: string;
  appVersion?: string;
  capabilities: Partial<
    Record<
      CapabilityId,
      {
        status: CapabilityState['status'];
        permission?: CapabilityState['permission'];
        implementation?: string;
        features?: string[];
        reason?: string;
      }
    >
  >;
}

export interface TauriAdapterOptions {
  bridge: TauriBridge;
  displayName?: string;
  /** Mobile builds have no terminal; desktop builds do. Default: infer from platform. */
  allowTerminal?: boolean;
}

function detectOs(platform: string | undefined): PlatformIdentity['os'] {
  switch (platform) {
    case 'ios':
      return 'ios';
    case 'android':
      return 'android';
    case 'macos':
      return 'macos';
    case 'windows':
      return 'windows';
    case 'linux':
      return 'linux';
    default:
      return 'unknown';
  }
}

export function createTauriPlatformAdapter(options: TauriAdapterOptions): AgentSamPlatformAdapter {
  const { bridge } = options;
  const os = detectOs(bridge.platform);
  const mobile = os === 'ios' || os === 'android';
  const allowTerminal = options.allowTerminal ?? !mobile;

  const identity: PlatformIdentity = {
    lane: 'tauri',
    os,
    formFactor: mobile ? 'phone' : 'desktop',
    displayName: options.displayName ?? `AgentSam Tauri (${bridge.platform ?? 'unknown'})`,
    adapterVersion: TAURI_ADAPTER_VERSION,
    installed: true,
  };

  const filesystem: FilesystemPort = {
    roots: () => bridge.invoke<string[]>(TAURI_COMMANDS.fsRoots),
    list: (path) => bridge.invoke<FileEntry[]>(TAURI_COMMANDS.fsList, { path }),
    exists: (path) => bridge.invoke<boolean>(TAURI_COMMANDS.fsExists, { path }),
    readText: (path) => bridge.invoke<string>(TAURI_COMMANDS.fsRead, { path }),
    async readBytes(path) {
      const base64 = await bridge.invoke<string>(TAURI_COMMANDS.fsRead, { path, encoding: 'base64' });
      return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
    },
    writeText: (path, contents) => bridge.invoke<FileEntry>(TAURI_COMMANDS.fsWrite, { path, contents }),
    writeBytes: (path, contents) =>
      bridge.invoke<FileEntry>(TAURI_COMMANDS.fsWrite, {
        path,
        contents: btoa(String.fromCharCode(...contents)),
        encoding: 'base64',
      }),
    remove: (path) => bridge.invoke<void>(TAURI_COMMANDS.fsRemove, { path }),
    mkdir: (path) => bridge.invoke<void>(TAURI_COMMANDS.fsMkdir, { path }),
  };

  const secureStore: SecureStorePort = {
    hardwareBacked: true,
    get: (key) => bridge.invoke<string | null>(TAURI_COMMANDS.secretGet, { key }),
    set: (key, value) => bridge.invoke<void>(TAURI_COMMANDS.secretSet, { key, value }),
    delete: (key) => bridge.invoke<void>(TAURI_COMMANDS.secretDelete, { key }),
    keys: () => bridge.invoke<string[]>(TAURI_COMMANDS.secretKeys),
  };

  const clipboard: ClipboardPort = {
    readText: () => bridge.invoke<string>(TAURI_COMMANDS.clipboardRead),
    writeText: (value) => bridge.invoke<void>(TAURI_COMMANDS.clipboardWrite, { value }),
  };

  const share: SharePort = {
    share: (payload) => bridge.invoke<{ completed: boolean; target?: string }>(TAURI_COMMANDS.share, { payload }),
  };

  const notifications: NotificationsPort = {
    notify: (request) => bridge.invoke<{ id: string }>(TAURI_COMMANDS.notify, { request }),
  };

  const camera: CameraPort = {
    capturePhoto: (captureOptions) =>
      bridge.invoke<{ dataUrl?: string; path?: string; mimeType: string; capturedAt: string }>(
        TAURI_COMMANDS.cameraCapture,
        { options: captureOptions ?? {} },
      ),
  };

  const browser: BrowserPort = {
    supportsEmbeddedSurface: true,
    openExternal: (url) => bridge.invoke<void>(TAURI_COMMANDS.openExternal, { url }),
  };

  const network: NetworkPort = {
    status: () => bridge.invoke(TAURI_COMMANDS.networkStatus),
    subscribe(listener) {
      let dispose: (() => void) | null = null;
      if (bridge.listen) {
        void bridge
          .listen<{ online: boolean; connectionType: 'wifi' | 'cellular' | 'ethernet' | 'none' | 'unknown' }>(
            'agentsam://network-status',
            listener,
          )
          .then((unlisten) => {
            dispose = unlisten;
          });
      }
      return () => dispose?.();
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

  const terminal: TerminalPort = {
    exec: (command, args, execOptions) =>
      bridge.invoke<ProcessResult>(TAURI_COMMANDS.exec, { command, args: args ?? [], options: execOptions ?? {} }),
  };

  const localModels: LocalModelsPort = {
    list: () => bridge.invoke<LocalModelDescriptor[]>(TAURI_COMMANDS.modelsList),
    async *generate(input) {
      // Rust streams deltas over an event channel; the final invoke resolves.
      const chunks: string[] = [];
      let unlisten: (() => void) | null = null;
      if (bridge.listen) {
        unlisten = await bridge.listen<{ delta: string }>('agentsam://model-delta', (payload) => {
          chunks.push(payload.delta);
        });
      }
      try {
        const final = await bridge.invoke<{ text: string }>(TAURI_COMMANDS.modelsGenerate, { input });
        for (const delta of chunks) yield { delta };
        yield { delta: chunks.length === 0 ? final.text : '', done: true };
      } finally {
        unlisten?.();
      }
    },
  };

  const backgroundExecution: BackgroundExecutionPort = {
    schedule: (request) => bridge.invoke<{ id: string; scheduled: boolean }>(TAURI_COMMANDS.backgroundSchedule, { request }),
    cancel: (id) => bridge.invoke<void>(TAURI_COMMANDS.backgroundCancel, { id }),
  };

  /** Fallback report when the Rust command is not implemented yet. */
  function defaultReport(): AgentSamPlatformCapabilities {
    return {
      filesystem: available('filesystem', 'tauri.rust-fs', ['read', 'write', 'list', 'delete', 'mkdir'], {
        sandboxed: mobile,
        notes: mobile ? ['App-scoped storage on iOS/Android.'] : ['Scoped by the Tauri capability allowlist.'],
      }),
      camera: requiresPermission('camera', 'tauri.plugin-camera', ['photo'], { foregroundOnly: true }),
      microphone: requiresPermission('microphone', 'tauri.plugin-audio', ['record'], { foregroundOnly: true }),
      notifications: requiresPermission('notifications', 'tauri.plugin-notification', ['immediate', 'scheduled']),
      secureStore: available('secureStore', 'tauri.rust-keychain', ['get', 'set', 'delete', 'keys'], { sandboxed: true }),
      share: mobile
        ? available('share', 'tauri.plugin-share', ['text', 'url'], { requiresUserGesture: true })
        : degraded('share', 'tauri.rust-share', 'Desktop share falls back to clipboard or mail client.', ['text', 'url']),
      clipboard: available('clipboard', 'tauri.plugin-clipboard', ['read-text', 'write-text']),
      network: available('network', 'tauri.rust-network', ['status', 'subscribe', 'fetch']),
      browser: available('browser', 'tauri.plugin-opener', ['external', 'embedded-surface']),
      terminal: allowTerminal
        ? available('terminal', 'tauri.rust-process', ['exec'], { notes: ['Commands are allowlisted in Rust, never free-form from the UI.'] })
        : unavailable('terminal', 'iOS and Android forbid spawning processes.', 'tauri.none'),
      localModels: degraded(
        'localModels',
        'tauri.rust-inference',
        'Available only when the Rust build embeds an inference runtime.',
        ['list', 'generate'],
      ),
      backgroundExecution: mobile
        ? degraded('backgroundExecution', 'tauri.mobile-background', 'OS-scheduled; timing is never guaranteed.', ['scheduled-task'])
        : available('backgroundExecution', 'tauri.rust-scheduler', ['scheduled-task', 'keep-alive']),
    };
  }

  async function probe(): Promise<AgentSamPlatformCapabilities> {
    try {
      const report = await bridge.invoke<TauriCapabilityReport>(TAURI_COMMANDS.probe);
      const base = defaultReport();
      for (const [id, patch] of Object.entries(report.capabilities ?? {})) {
        const key = id as CapabilityId;
        if (!patch) continue;
        base[key] = {
          ...base[key],
          status: patch.status,
          permission: patch.permission ?? base[key].permission,
          implementation: patch.implementation ?? base[key].implementation,
          features: patch.features ?? base[key].features,
          reason: patch.reason ?? base[key].reason,
          lastCheckedAt: new Date().toISOString(),
        };
      }
      return base;
    } catch {
      // Rust command not wired yet — report the declared boundary honestly.
      return defaultReport();
    }
  }

  return defineAdapter({
    identity,
    probe,
    async request(id) {
      try {
        await bridge.invoke(TAURI_COMMANDS.requestPermission, { capability: id });
      } catch {
        /* probe reports the result either way */
      }
      return (await probe())[id];
    },
    ports: () => ({
      filesystem,
      camera,
      notifications,
      secureStore,
      share,
      clipboard,
      network,
      browser,
      localModels,
      backgroundExecution,
      ...(allowTerminal ? { terminal } : {}),
    }),
  });
}
