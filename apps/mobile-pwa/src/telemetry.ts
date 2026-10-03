/**
 * Lane telemetry wiring: spool + gateway transport only.
 * The envelope shapes and the pipeline contract live in the telemetry package.
 */
import {
  LocalEventSpool,
  createMemorySpoolStorage,
  createWorkerGatewayTransport,
  type AnyTelemetryEvent,
} from '@inneranimalmedia/agentsam-telemetry';

const endpoint = import.meta.env?.VITE_AGENTSAM_INGEST_URL ?? '/api/agentsam/events';

export const spool = new LocalEventSpool({
  // Swap createMemorySpoolStorage() for an OPFS/IndexedDB storage when the
  // PWA lane graduates from scaffold to product.
  storage: createMemorySpoolStorage(),
  transport: createWorkerGatewayTransport({
    endpoint,
    auth: {
      kind: 'agentsam-device-token',
      token: async () => localStorage.getItem('agentsam.device.token') ?? 'anonymous',
    },
  }),
});

export async function emit(event: AnyTelemetryEvent): Promise<void> {
  await spool.enqueue(event);
}
