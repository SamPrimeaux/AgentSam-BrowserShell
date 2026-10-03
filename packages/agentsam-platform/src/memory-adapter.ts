/**
 * @inneranimalmedia/agentsam-platform — in-memory adapter
 *
 * Used by tests, Storybook-style fixtures, SSR, and the proof harness.
 * It is also the reference implementation of the adapter contract: if a lane
 * adapter disagrees with this one about shapes, the lane adapter is wrong.
 */

import {
  available,
  degraded,
  noCapabilities,
  unavailable,
  type AgentSamPlatformCapabilities,
  type CapabilityId,
  type CapabilityState,
} from './capabilities.js';
import { defineAdapter, type AgentSamPlatformAdapter, type PlatformIdentity } from './adapter.js';
import type {
  ClipboardPort,
  FileEntry,
  FilesystemPort,
  NetworkPort,
  NetworkStatus,
  SecureStorePort,
} from './ports.js';

export const MEMORY_ADAPTER_VERSION = '1.0.0';

function fileEntry(path: string, size: number): FileEntry {
  const name = path.split('/').filter(Boolean).pop() ?? path;
  return { path, name, kind: 'file', sizeBytes: size, modifiedAt: new Date().toISOString() };
}

export interface MemoryAdapterOptions {
  identity?: Partial<PlatformIdentity>;
  /** Capabilities to force; everything else follows the in-memory defaults. */
  overrides?: Partial<AgentSamPlatformCapabilities>;
  seedFiles?: Record<string, string>;
}

export function createMemoryAdapter(options: MemoryAdapterOptions = {}): AgentSamPlatformAdapter {
  const files = new Map<string, string>(Object.entries(options.seedFiles ?? {}));
  const secrets = new Map<string, string>();
  let clipboardText = '';
  let network: NetworkStatus = { online: true, connectionType: 'unknown' };
  const networkListeners = new Set<(status: NetworkStatus) => void>();

  const identity: PlatformIdentity = {
    lane: 'headless',
    os: 'unknown',
    formFactor: 'unknown',
    displayName: 'AgentSam In-Memory Host',
    adapterVersion: MEMORY_ADAPTER_VERSION,
    ...options.identity,
  };

  const filesystem: FilesystemPort = {
    async roots() {
      return ['memory'];
    },
    async list(path) {
      const prefix = path.endsWith('/') ? path : `${path}/`;
      return [...files.keys()]
        .filter((key) => key.startsWith(prefix))
        .map((key) => fileEntry(key, files.get(key)?.length ?? 0));
    },
    async exists(path) {
      return files.has(path);
    },
    async readText(path) {
      const value = files.get(path);
      if (value === undefined) throw new Error(`ENOENT: ${path}`);
      return value;
    },
    async readBytes(path) {
      return new TextEncoder().encode(await this.readText(path));
    },
    async writeText(path, contents) {
      files.set(path, contents);
      return fileEntry(path, contents.length);
    },
    async writeBytes(path, contents) {
      return this.writeText(path, new TextDecoder().decode(contents));
    },
    async remove(path) {
      files.delete(path);
    },
    async mkdir() {
      /* directories are implicit in memory */
    },
  };

  const secureStore: SecureStorePort = {
    hardwareBacked: false,
    async get(key) {
      return secrets.get(key) ?? null;
    },
    async set(key, value) {
      secrets.set(key, value);
    },
    async delete(key) {
      secrets.delete(key);
    },
    async keys() {
      return [...secrets.keys()];
    },
  };

  const clipboard: ClipboardPort = {
    async readText() {
      return clipboardText;
    },
    async writeText(value) {
      clipboardText = value;
    },
  };

  const networkPort: NetworkPort = {
    async status() {
      return network;
    },
    subscribe(listener) {
      networkListeners.add(listener);
      listener(network);
      return () => networkListeners.delete(listener);
    },
    async fetch() {
      throw new Error('Memory adapter does not perform real network I/O.');
    },
  };

  const baseCapabilities = (): AgentSamPlatformCapabilities => ({
    ...noCapabilities('Not implemented by the in-memory host.'),
    filesystem: degraded(
      'filesystem',
      'memory.map',
      'Volatile in-memory filesystem.',
      ['read', 'write', 'list', 'delete'],
      { ephemeral: true, sandboxed: true },
    ),
    secureStore: degraded(
      'secureStore',
      'memory.map',
      'Secrets are not encrypted and do not survive reload.',
      ['get', 'set', 'delete', 'keys'],
      { ephemeral: true },
    ),
    clipboard: available('clipboard', 'memory.buffer', ['read-text', 'write-text'], { ephemeral: true }),
    network: available('network', 'memory.static', ['status', 'subscribe']),
    browser: unavailable('browser', 'No browser host in memory mode.', 'memory.none'),
    ...options.overrides,
  });

  return defineAdapter({
    identity,
    async probe() {
      return baseCapabilities();
    },
    async request(id: CapabilityId): Promise<CapabilityState> {
      return baseCapabilities()[id];
    },
    ports: {
      filesystem,
      secureStore,
      clipboard,
      network: networkPort,
    },
  });
}
