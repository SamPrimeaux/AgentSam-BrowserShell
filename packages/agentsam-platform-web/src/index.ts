/**
 * @inneranimalmedia/agentsam-platform-web
 *
 * Web / PWA adapter for the AgentSam portable capability contract.
 * Everything here is standard web platform. No AgentSam business logic.
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
  type CameraPort,
  type CapabilityId,
  type CapabilityState,
  type CapturedMedia,
  type ClipboardPort,
  type FileEntry,
  type FilesystemPort,
  type MicrophonePort,
  type NetworkPort,
  type NetworkStatus,
  type NotificationsPort,
  type PlatformIdentity,
  type RecordingHandle,
  type SecureStorePort,
  type SharePort,
  type BrowserPort,
} from '@inneranimalmedia/agentsam-platform';

export const WEB_ADAPTER_VERSION = '1.0.0';

// ----------------------------------------------------------------------
// Minimal shims for web APIs TypeScript's DOM lib does not fully type.
// ----------------------------------------------------------------------

interface OpfsHandleLike {
  kind: 'file' | 'directory';
  name: string;
  getFileHandle(name: string, options?: { create?: boolean }): Promise<OpfsFileHandleLike>;
  getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<OpfsHandleLike>;
  removeEntry(name: string, options?: { recursive?: boolean }): Promise<void>;
  values(): AsyncIterable<OpfsHandleLike & { getFile?: () => Promise<{ size: number; lastModified: number; text(): Promise<string> }> }>;
}

interface OpfsFileHandleLike {
  getFile(): Promise<{ size: number; lastModified: number; text(): Promise<string>; arrayBuffer(): Promise<ArrayBuffer> }>;
  createWritable(): Promise<{ write(data: string | BufferSource): Promise<void>; close(): Promise<void> }>;
}

interface StorageManagerWithOpfs {
  getDirectory?(): Promise<OpfsHandleLike>;
  persisted?(): Promise<boolean>;
}

interface PeriodicSyncLike {
  register(tag: string, options?: { minInterval?: number }): Promise<void>;
  unregister(tag: string): Promise<void>;
  getTags(): Promise<string[]>;
}

const hasWindow = (): boolean => typeof window !== 'undefined' && typeof document !== 'undefined';
const nav = (): Navigator | null => (typeof navigator !== 'undefined' ? navigator : null);

function opfsRoot(): Promise<OpfsHandleLike> | null {
  const storage = nav()?.storage as unknown as StorageManagerWithOpfs | undefined;
  if (!storage?.getDirectory) return null;
  return storage.getDirectory();
}

// ----------------------------------------------------------------------
// Ports
// ----------------------------------------------------------------------

function createFilesystemPort(): FilesystemPort {
  async function resolveFile(path: string, create: boolean): Promise<OpfsFileHandleLike> {
    const rootPromise = opfsRoot();
    if (!rootPromise) throw new Error('Origin Private File System is unavailable in this browser.');
    const segments = path.split('/').filter(Boolean);
    const fileName = segments.pop();
    if (!fileName) throw new Error(`Invalid path "${path}".`);
    let directory = await rootPromise;
    for (const segment of segments) {
      directory = await directory.getDirectoryHandle(segment, { create });
    }
    return directory.getFileHandle(fileName, { create });
  }

  return {
    async roots() {
      return ['opfs'];
    },
    async list(path) {
      const rootPromise = opfsRoot();
      if (!rootPromise) return [];
      let directory = await rootPromise;
      for (const segment of path.split('/').filter(Boolean)) {
        directory = await directory.getDirectoryHandle(segment, { create: false });
      }
      const entries: FileEntry[] = [];
      for await (const handle of directory.values()) {
        const file = handle.kind === 'file' && handle.getFile ? await handle.getFile() : null;
        entries.push({
          path: `${path.replace(/\/$/, '')}/${handle.name}`,
          name: handle.name,
          kind: handle.kind,
          sizeBytes: file?.size,
          modifiedAt: file ? new Date(file.lastModified).toISOString() : undefined,
        });
      }
      return entries;
    },
    async exists(path) {
      try {
        await resolveFile(path, false);
        return true;
      } catch {
        return false;
      }
    },
    async readText(path) {
      const handle = await resolveFile(path, false);
      return (await handle.getFile()).text();
    },
    async readBytes(path) {
      const handle = await resolveFile(path, false);
      return new Uint8Array(await (await handle.getFile()).arrayBuffer());
    },
    async writeText(path, contents) {
      const handle = await resolveFile(path, true);
      const writable = await handle.createWritable();
      await writable.write(contents);
      await writable.close();
      const file = await handle.getFile();
      return {
        path,
        name: path.split('/').pop() ?? path,
        kind: 'file',
        sizeBytes: file.size,
        modifiedAt: new Date(file.lastModified).toISOString(),
      };
    },
    async writeBytes(path, contents) {
      const handle = await resolveFile(path, true);
      const writable = await handle.createWritable();
      await writable.write(contents);
      await writable.close();
      return { path, name: path.split('/').pop() ?? path, kind: 'file', sizeBytes: contents.byteLength };
    },
    async remove(path) {
      const rootPromise = opfsRoot();
      if (!rootPromise) return;
      const segments = path.split('/').filter(Boolean);
      const name = segments.pop();
      if (!name) return;
      let directory = await rootPromise;
      for (const segment of segments) directory = await directory.getDirectoryHandle(segment, { create: false });
      await directory.removeEntry(name, { recursive: true });
    },
    async mkdir(path) {
      const rootPromise = opfsRoot();
      if (!rootPromise) throw new Error('OPFS unavailable.');
      let directory = await rootPromise;
      for (const segment of path.split('/').filter(Boolean)) {
        directory = await directory.getDirectoryHandle(segment, { create: true });
      }
    },
    async pickFile(options) {
      if (!hasWindow()) throw new Error('No window.');
      return new Promise<FileEntry[]>((resolve, reject) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = Boolean(options?.multiple);
        if (options?.accept?.length) input.accept = options.accept.join(',');
        input.onchange = () => {
          const files = Array.from(input.files ?? []);
          resolve(
            files.map((file) => ({
              path: file.name,
              name: file.name,
              kind: 'file' as const,
              sizeBytes: file.size,
              mimeType: file.type,
              modifiedAt: new Date(file.lastModified).toISOString(),
            })),
          );
        };
        input.oncancel = () => resolve([]);
        input.onerror = () => reject(new Error('File selection failed.'));
        input.click();
      });
    },
  };
}

function createCameraPort(): CameraPort {
  return {
    async capturePhoto(options) {
      if (!hasWindow()) throw new Error('No window.');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: options?.facing === 'front' ? 'user' : 'environment' },
      });
      try {
        const video = document.createElement('video');
        video.srcObject = stream;
        video.muted = true;
        await video.play();
        await new Promise((resolve) => requestAnimationFrame(resolve));
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;
        canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', options?.quality ?? 0.9);
        return {
          dataUrl,
          mimeType: 'image/jpeg',
          width: canvas.width,
          height: canvas.height,
          capturedAt: new Date().toISOString(),
        } satisfies CapturedMedia;
      } finally {
        stream.getTracks().forEach((track) => track.stop());
      }
    },
  };
}

function createMicrophonePort(): MicrophonePort {
  return {
    async startRecording(options): Promise<RecordingHandle> {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = options?.mimeType ?? 'audio/webm';
      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks: Blob[] = [];
      const startedAt = Date.now();
      recorder.ondataavailable = (event) => chunks.push(event.data);
      recorder.start();

      const finish = (): Promise<Blob> =>
        new Promise((resolve) => {
          recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
          recorder.stop();
        });

      return {
        id: `rec_${startedAt}`,
        async stop() {
          const blob = await finish();
          stream.getTracks().forEach((track) => track.stop());
          const dataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.readAsDataURL(blob);
          });
          return { dataUrl, mimeType, durationMs: Date.now() - startedAt, sizeBytes: blob.size };
        },
        async cancel() {
          recorder.stop();
          stream.getTracks().forEach((track) => track.stop());
        },
      };
    },
  };
}

function createNotificationsPort(): NotificationsPort {
  return {
    async notify(request) {
      const id = request.id ?? `ntf_${Date.now().toString(36)}`;
      const notification = new Notification(request.title, {
        body: request.body,
        tag: request.tag ?? id,
        data: { route: request.route, ...request.data },
      });
      notification.onclick = () => {
        if (request.route && hasWindow()) window.location.hash = request.route;
      };
      return { id };
    },
  };
}

function createSecureStorePort(): SecureStorePort {
  const prefix = 'agentsam.secure.';
  return {
    hardwareBacked: false,
    async get(key) {
      return localStorage.getItem(prefix + key);
    },
    async set(key, value) {
      localStorage.setItem(prefix + key, value);
    },
    async delete(key) {
      localStorage.removeItem(prefix + key);
    },
    async keys() {
      return Object.keys(localStorage)
        .filter((key) => key.startsWith(prefix))
        .map((key) => key.slice(prefix.length));
    },
  };
}

function createSharePort(): SharePort {
  return {
    async share(payload) {
      await navigator.share({ title: payload.title, text: payload.text, url: payload.url });
      return { completed: true, target: 'web-share' };
    },
    async canShare(payload) {
      return typeof navigator.canShare === 'function'
        ? navigator.canShare({ title: payload.title, text: payload.text, url: payload.url })
        : typeof navigator.share === 'function';
    },
  };
}

function createClipboardPort(): ClipboardPort {
  return {
    async readText() {
      return navigator.clipboard.readText();
    },
    async writeText(value) {
      await navigator.clipboard.writeText(value);
    },
  };
}

function createNetworkPort(): NetworkPort {
  const read = (): NetworkStatus => {
    const connection = (navigator as Navigator & { connection?: { type?: string; effectiveType?: string; saveData?: boolean } }).connection;
    const type = connection?.type;
    return {
      online: navigator.onLine,
      connectionType:
        type === 'wifi' || type === 'cellular' || type === 'ethernet' ? type : navigator.onLine ? 'unknown' : 'none',
      metered: connection?.saveData,
    };
  };

  return {
    async status() {
      return read();
    },
    subscribe(listener) {
      const emit = () => listener(read());
      window.addEventListener('online', emit);
      window.addEventListener('offline', emit);
      emit();
      return () => {
        window.removeEventListener('online', emit);
        window.removeEventListener('offline', emit);
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
}

function createBrowserPort(): BrowserPort {
  return {
    supportsEmbeddedSurface: true,
    async openExternal(url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    },
    async openInApp(url) {
      const popup = window.open(url, '_blank', 'noopener,noreferrer');
      return {
        closed: new Promise<void>((resolve) => {
          const timer = setInterval(() => {
            if (!popup || popup.closed) {
              clearInterval(timer);
              resolve();
            }
          }, 500);
        }),
      };
    },
    async authFlow(url, redirectScheme) {
      const popup = window.open(url, 'agentsam-auth', 'width=480,height=720');
      return new Promise((resolve, reject) => {
        const onMessage = (event: MessageEvent) => {
          const data = event.data as { type?: string; redirectUrl?: string } | null;
          if (data?.type === 'agentsam:auth' && typeof data.redirectUrl === 'string') {
            window.removeEventListener('message', onMessage);
            popup?.close();
            resolve({ redirectUrl: data.redirectUrl });
          }
        };
        window.addEventListener('message', onMessage);
        setTimeout(() => {
          window.removeEventListener('message', onMessage);
          reject(new Error(`Auth flow for ${redirectScheme} timed out.`));
        }, 5 * 60_000);
      });
    },
  };
}

function createBackgroundExecutionPort(): BackgroundExecutionPort {
  return {
    async schedule(request) {
      const registration = await navigator.serviceWorker?.ready;
      const periodicSync = (registration as ServiceWorkerRegistration & { periodicSync?: PeriodicSyncLike })?.periodicSync;
      if (!periodicSync) return { id: request.id, scheduled: false };
      await periodicSync.register(request.id, { minInterval: 15 * 60_000 });
      return { id: request.id, scheduled: true };
    },
    async cancel(id) {
      const registration = await navigator.serviceWorker?.ready;
      const periodicSync = (registration as ServiceWorkerRegistration & { periodicSync?: PeriodicSyncLike })?.periodicSync;
      await periodicSync?.unregister(id);
    },
  };
}

// ----------------------------------------------------------------------
// Probe
// ----------------------------------------------------------------------

async function permissionState(name: string): Promise<CapabilityState['permission']> {
  const permissions = nav()?.permissions;
  if (!permissions?.query) return 'unknown';
  try {
    const status = await permissions.query({ name: name as PermissionName });
    return status.state === 'granted' ? 'granted' : status.state === 'denied' ? 'denied' : 'prompt';
  } catch {
    return 'unknown';
  }
}

function isStandalone(): boolean {
  if (!hasWindow()) return false;
  const standaloneNav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia?.('(display-mode: standalone)').matches === true || standaloneNav.standalone === true;
}

function detectOs(): PlatformIdentity['os'] {
  const ua = nav()?.userAgent ?? '';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  if (/Mac OS X/i.test(ua)) return 'macos';
  if (/Windows/i.test(ua)) return 'windows';
  if (/Linux/i.test(ua)) return 'linux';
  return 'web';
}

function detectFormFactor(): PlatformIdentity['formFactor'] {
  if (!hasWindow()) return 'unknown';
  const width = window.innerWidth;
  if (width < 640) return 'phone';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

export interface WebAdapterOptions {
  /** Override the identity label shown on diagnostics screens. */
  displayName?: string;
  /** Set true when a WebGPU/WASM local model runtime is registered by the app. */
  localModelRuntime?: boolean;
}

export function createWebPlatformAdapter(options: WebAdapterOptions = {}): AgentSamPlatformAdapter {
  const identity: PlatformIdentity = {
    lane: 'web',
    os: detectOs(),
    formFactor: detectFormFactor(),
    displayName: options.displayName ?? 'AgentSam Web / PWA',
    adapterVersion: WEB_ADAPTER_VERSION,
    installed: isStandalone(),
  };

  async function probe(): Promise<AgentSamPlatformCapabilities> {
    const navigatorRef = nav();
    const hasOpfs = Boolean((navigatorRef?.storage as unknown as StorageManagerWithOpfs | undefined)?.getDirectory);
    const hasMedia = Boolean(navigatorRef?.mediaDevices?.getUserMedia);
    const cameraPermission = await permissionState('camera');
    const micPermission = await permissionState('microphone');
    const notificationPermission =
      typeof Notification === 'undefined'
        ? 'not-applicable'
        : Notification.permission === 'granted'
          ? 'granted'
          : Notification.permission === 'denied'
            ? 'denied'
            : 'prompt';
    const registration = typeof navigator !== 'undefined' ? navigator.serviceWorker?.controller : null;
    const hasWebGpu = typeof navigator !== 'undefined' && 'gpu' in navigator;

    return {
      filesystem: hasOpfs
        ? degraded(
            'filesystem',
            'web.opfs',
            'Origin Private File System is app-private; the real device filesystem is not reachable.',
            ['read', 'write', 'list', 'delete', 'picker'],
            { sandboxed: true, requiresUserGesture: true },
          )
        : unavailable('filesystem', 'No Origin Private File System in this browser.', 'web.none'),

      camera: hasMedia
        ? cameraPermission === 'granted'
          ? available('camera', 'web.getusermedia', ['photo'], { requiresUserGesture: true, foregroundOnly: true })
          : cameraPermission === 'denied'
            ? denied('camera', 'web.getusermedia')
            : requiresPermission('camera', 'web.getusermedia', ['photo'], { requiresUserGesture: true, foregroundOnly: true })
        : unavailable('camera', 'getUserMedia unavailable (insecure context or unsupported browser).', 'web.none'),

      microphone: hasMedia
        ? micPermission === 'granted'
          ? available('microphone', 'web.mediarecorder', ['record'], { foregroundOnly: true })
          : micPermission === 'denied'
            ? denied('microphone', 'web.mediarecorder')
            : requiresPermission('microphone', 'web.mediarecorder', ['record'], { foregroundOnly: true })
        : unavailable('microphone', 'MediaRecorder unavailable.', 'web.none'),

      notifications:
        typeof Notification === 'undefined'
          ? unavailable('notifications', 'Notification API unavailable.', 'web.none')
          : notificationPermission === 'granted'
            ? available('notifications', 'web.notification', ['immediate'], { foregroundOnly: !registration })
            : notificationPermission === 'denied'
              ? denied('notifications', 'web.notification')
              : requiresPermission('notifications', 'web.notification', ['immediate']),

      secureStore: degraded(
        'secureStore',
        'web.localstorage',
        'Browser storage is not hardware backed. Store only short-lived session material.',
        ['get', 'set', 'delete', 'keys'],
        { notes: ['Never place refresh tokens or Basin credentials here.'] },
      ),

      share:
        typeof navigator !== 'undefined' && typeof navigator.share === 'function'
          ? available('share', 'web.webshare', ['text', 'url'], { requiresUserGesture: true })
          : unavailable('share', 'Web Share API unavailable.', 'web.none'),

      clipboard:
        typeof navigator !== 'undefined' && Boolean(navigator.clipboard)
          ? available('clipboard', 'web.async-clipboard', ['read-text', 'write-text'], { requiresUserGesture: true })
          : unavailable('clipboard', 'Async Clipboard API unavailable.', 'web.none'),

      network: available('network', 'web.navigator-online', ['status', 'subscribe', 'fetch']),

      browser: available('browser', 'web.window-open', ['external', 'in-app', 'auth-flow', 'embedded-surface']),

      terminal: unavailable('terminal', 'Browsers have no process authority. Use the ACP daemon over the network.', 'web.none'),

      localModels: options.localModelRuntime
        ? degraded('localModels', 'web.webgpu', 'Local inference is memory constrained in a browser tab.', ['generate'])
        : unavailable(
            'localModels',
            hasWebGpu
              ? 'WebGPU is present but no local model runtime is registered in this build.'
              : 'No WebGPU and no local model runtime.',
            'web.none',
          ),

      backgroundExecution: registration
        ? degraded(
            'backgroundExecution',
            'web.periodic-sync',
            'Browsers decide if and when periodic sync runs. Never promise timing.',
            ['periodic-sync'],
            { foregroundOnly: false, notes: ['Requires installed PWA and user engagement in Chromium.'] },
          )
        : unavailable('backgroundExecution', 'No active service worker.', 'web.none'),
    };
  }

  return defineAdapter({
    identity,
    probe,
    async request(id: CapabilityId): Promise<CapabilityState> {
      if (id === 'notifications' && typeof Notification !== 'undefined') {
        await Notification.requestPermission();
      }
      if (id === 'camera' || id === 'microphone') {
        try {
          const stream = await navigator.mediaDevices.getUserMedia(
            id === 'camera' ? { video: true } : { audio: true },
          );
          stream.getTracks().forEach((track) => track.stop());
        } catch {
          /* probe below reports the denial */
        }
      }
      return (await probe())[id];
    },
    ports: () => ({
      filesystem: createFilesystemPort(),
      camera: createCameraPort(),
      microphone: createMicrophonePort(),
      notifications: createNotificationsPort(),
      secureStore: createSecureStorePort(),
      share: createSharePort(),
      clipboard: createClipboardPort(),
      network: createNetworkPort(),
      browser: createBrowserPort(),
      backgroundExecution: createBackgroundExecutionPort(),
    }),
  });
}
