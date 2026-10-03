/**
 * @inneranimalmedia/agentsam-platform — capability ports
 *
 * A *port* is the behaviour behind a capability. Adapters implement ports;
 * AgentSam surfaces consume ports. Ports are intentionally small and
 * synchronous-free (everything is a Promise or an AsyncIterable) so that
 * web, native bridge, and IPC implementations can all satisfy them.
 */

import type { CapabilityId } from './capabilities.js';

// ----------------------------------------------------------------------
// filesystem
// ----------------------------------------------------------------------

export interface FileEntry {
  path: string;
  name: string;
  kind: 'file' | 'directory';
  sizeBytes?: number;
  modifiedAt?: string;
  mimeType?: string;
}

export interface FilesystemPort {
  /** Logical roots the host exposes, e.g. ['app-data', 'documents']. */
  roots(): Promise<string[]>;
  list(path: string): Promise<FileEntry[]>;
  exists(path: string): Promise<boolean>;
  readText(path: string): Promise<string>;
  readBytes(path: string): Promise<Uint8Array>;
  writeText(path: string, contents: string): Promise<FileEntry>;
  writeBytes(path: string, contents: Uint8Array): Promise<FileEntry>;
  remove(path: string): Promise<void>;
  mkdir(path: string): Promise<void>;
  /** Interactive picker where the host has one; rejects where it does not. */
  pickFile?(options?: { accept?: string[]; multiple?: boolean }): Promise<FileEntry[]>;
  pickDirectory?(): Promise<FileEntry | null>;
}

// ----------------------------------------------------------------------
// camera
// ----------------------------------------------------------------------

export interface CapturedMedia {
  dataUrl?: string;
  path?: string;
  mimeType: string;
  width?: number;
  height?: number;
  sizeBytes?: number;
  capturedAt: string;
}

export interface CameraPort {
  capturePhoto(options?: {
    facing?: 'front' | 'back';
    quality?: number;
    allowEditing?: boolean;
  }): Promise<CapturedMedia>;
  pickFromLibrary?(options?: { multiple?: boolean }): Promise<CapturedMedia[]>;
  /** Live frames for scanning / vision loops where the host supports it. */
  frames?(options?: { fps?: number }): AsyncIterable<CapturedMedia>;
}

// ----------------------------------------------------------------------
// microphone
// ----------------------------------------------------------------------

export interface AudioRecording {
  dataUrl?: string;
  path?: string;
  mimeType: string;
  durationMs: number;
  sizeBytes?: number;
}

export interface RecordingHandle {
  id: string;
  stop(): Promise<AudioRecording>;
  cancel(): Promise<void>;
}

export interface MicrophonePort {
  startRecording(options?: { mimeType?: string; maxDurationMs?: number }): Promise<RecordingHandle>;
  /** PCM/opus chunks for streaming ASR where the host supports it. */
  stream?(options?: { chunkMs?: number }): AsyncIterable<Uint8Array>;
}

// ----------------------------------------------------------------------
// notifications
// ----------------------------------------------------------------------

export interface NotificationRequest {
  id?: string;
  title: string;
  body?: string;
  /** Deep link back into an AgentSam surface. */
  route?: string;
  scheduleAt?: string;
  tag?: string;
  data?: Record<string, unknown>;
}

export interface NotificationsPort {
  notify(request: NotificationRequest): Promise<{ id: string }>;
  cancel?(id: string): Promise<void>;
  /** Taps routed back into the app shell. */
  onOpened?(listener: (payload: { id: string; route?: string; data?: Record<string, unknown> }) => void): () => void;
}

// ----------------------------------------------------------------------
// secureStore
// ----------------------------------------------------------------------

export interface SecureStorePort {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
  keys(): Promise<string[]>;
  /** True when backed by OS keychain/keystore rather than app storage. */
  readonly hardwareBacked: boolean;
}

// ----------------------------------------------------------------------
// share
// ----------------------------------------------------------------------

export interface SharePayload {
  title?: string;
  text?: string;
  url?: string;
  files?: Array<{ path?: string; dataUrl?: string; name: string; mimeType: string }>;
}

export interface SharePort {
  share(payload: SharePayload): Promise<{ completed: boolean; target?: string }>;
  canShare?(payload: SharePayload): Promise<boolean>;
}

// ----------------------------------------------------------------------
// clipboard
// ----------------------------------------------------------------------

export interface ClipboardPort {
  readText(): Promise<string>;
  writeText(value: string): Promise<void>;
  readImage?(): Promise<{ dataUrl: string; mimeType: string } | null>;
  writeImage?(input: { dataUrl: string; mimeType: string }): Promise<void>;
}

// ----------------------------------------------------------------------
// network
// ----------------------------------------------------------------------

export interface NetworkStatus {
  online: boolean;
  connectionType: 'wifi' | 'cellular' | 'ethernet' | 'none' | 'unknown';
  /** True when the OS/user asked us to conserve data. */
  metered?: boolean;
}

export interface NetworkPort {
  status(): Promise<NetworkStatus>;
  subscribe(listener: (status: NetworkStatus) => void): () => void;
  /** Host-governed fetch: may add native TLS, proxying, or offline queueing. */
  fetch(input: string, init?: { method?: string; headers?: Record<string, string>; body?: string }): Promise<{
    status: number;
    headers: Record<string, string>;
    body: string;
  }>;
}

// ----------------------------------------------------------------------
// browser
// ----------------------------------------------------------------------

export interface BrowserPort {
  /** Hand the URL to the system browser / external app. */
  openExternal(url: string): Promise<void>;
  /** In-app browser (SFSafariViewController, Custom Tabs, webview, iframe). */
  openInApp?(url: string, options?: { toolbarColor?: string; dismissible?: boolean }): Promise<{ closed: Promise<void> }>;
  /** OAuth-style flow that returns control to the app at a redirect URI. */
  authFlow?(url: string, redirectScheme: string): Promise<{ redirectUrl: string }>;
  /**
   * True when the host can host the AgentSamBrowserSurface in-process
   * (i.e. @inneranimalmedia/agentsam-browser-surface can render a provider).
   */
  readonly supportsEmbeddedSurface: boolean;
}

// ----------------------------------------------------------------------
// terminal
// ----------------------------------------------------------------------

export interface ProcessResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
}

export interface ProcessHandle {
  id: string;
  output: AsyncIterable<{ stream: 'stdout' | 'stderr'; chunk: string }>;
  write(input: string): Promise<void>;
  kill(signal?: string): Promise<void>;
  result: Promise<ProcessResult>;
}

export interface TerminalPort {
  exec(command: string, args?: string[], options?: { cwd?: string; env?: Record<string, string> }): Promise<ProcessResult>;
  spawn?(command: string, args?: string[], options?: { cwd?: string; env?: Record<string, string> }): Promise<ProcessHandle>;
}

// ----------------------------------------------------------------------
// localModels
// ----------------------------------------------------------------------

export interface LocalModelDescriptor {
  id: string;
  name: string;
  /** 'llm' | 'embedding' | 'asr' | 'vision' | 'tts' */
  kind: 'llm' | 'embedding' | 'asr' | 'vision' | 'tts';
  sizeBytes?: number;
  quantization?: string;
  /** Where inference actually runs. */
  execution: 'cpu' | 'gpu' | 'npu' | 'unknown';
  downloaded: boolean;
}

export interface LocalModelsPort {
  list(): Promise<LocalModelDescriptor[]>;
  generate(input: {
    modelId: string;
    prompt: string;
    system?: string;
    maxTokens?: number;
  }): AsyncIterable<{ delta: string; done?: boolean }>;
  embed?(input: { modelId: string; texts: string[] }): Promise<number[][]>;
  ensureDownloaded?(modelId: string): AsyncIterable<{ receivedBytes: number; totalBytes?: number }>;
}

// ----------------------------------------------------------------------
// backgroundExecution
// ----------------------------------------------------------------------

export interface BackgroundTaskRequest {
  id: string;
  /** What the task is for, in AgentSam vocabulary (see agentsam-runtime-state). */
  reason: 'sync' | 'indexing' | 'upload' | 'generation' | 'telemetry-flush';
  /** Earliest execution. Hosts may run later; never guarantee exact timing. */
  notBefore?: string;
  requiresNetwork?: boolean;
  requiresCharging?: boolean;
}

export interface BackgroundExecutionPort {
  schedule(request: BackgroundTaskRequest): Promise<{ id: string; scheduled: boolean }>;
  cancel(id: string): Promise<void>;
  /** Short foreground extension (iOS beginBackgroundTask / Android foreground service). */
  keepAlive?(reason: string): Promise<{ release(): Promise<void>; budgetMs?: number }>;
  onTask?(listener: (task: BackgroundTaskRequest) => Promise<void>): () => void;
}

// ----------------------------------------------------------------------
// port map
// ----------------------------------------------------------------------

export interface CapabilityPortMap {
  filesystem: FilesystemPort;
  camera: CameraPort;
  microphone: MicrophonePort;
  notifications: NotificationsPort;
  secureStore: SecureStorePort;
  share: SharePort;
  clipboard: ClipboardPort;
  network: NetworkPort;
  browser: BrowserPort;
  terminal: TerminalPort;
  localModels: LocalModelsPort;
  backgroundExecution: BackgroundExecutionPort;
}

export type AnyCapabilityPort = CapabilityPortMap[CapabilityId];

export type CapabilityPorts = Partial<{
  [K in CapabilityId]: CapabilityPortMap[K];
}>;
