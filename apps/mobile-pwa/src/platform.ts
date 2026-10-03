/**
 * Lane bootstrapping: build the adapter, nothing else.
 * No AgentSam conversation logic, model routing, ACP, analytics schemas,
 * work graphs, provider semantics, composer state, artifact or identity
 * contracts may live in this app. Those are packages.
 */
import { AgentSamPlatform } from '@inneranimalmedia/agentsam-platform';
import { createWebPlatformAdapter } from '@inneranimalmedia/agentsam-platform-web';

export const APP_VERSION = '2.6.11-mobile-pwa.0';

export function createPlatform(): Promise<AgentSamPlatform> {
  return AgentSamPlatform.create(
    createWebPlatformAdapter({ displayName: 'AgentSam Mobile · PWA lane' }),
  );
}
