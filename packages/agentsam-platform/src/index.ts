/**
 * @inneranimalmedia/agentsam-platform
 *
 * Portable capability interfaces for AgentSam.
 *
 *   AgentSam UI
 *        │
 *        ▼
 *   portable capability interfaces   <-- this package
 *        │
 *        ├── Web/PWA adapter       (@inneranimalmedia/agentsam-platform-web)
 *        ├── Capacitor adapter     (@inneranimalmedia/agentsam-platform-capacitor)
 *        ├── Expo adapter          (@inneranimalmedia/agentsam-platform-expo)
 *        └── Tauri Mobile adapter  (@inneranimalmedia/agentsam-platform-tauri)
 *
 * React bindings live at `@inneranimalmedia/agentsam-platform/react` so that
 * non-React hosts (CLI, daemon, worker) can depend on the contracts alone.
 */

export * from './capabilities.js';
export * from './ports.js';
export * from './adapter.js';
export * from './runtime.js';
export * from './memory-adapter.js';
