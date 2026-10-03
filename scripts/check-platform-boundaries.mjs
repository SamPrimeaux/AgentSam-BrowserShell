#!/usr/bin/env node
/**
 * scripts/check-platform-boundaries.mjs
 *
 * Codifies the architectural rules as CI, not documentation.
 *
 *  RULE 1  No UI or shared package may branch on the platform.
 *          Banned: isCapacitor / isExpo / isTauri / isNative style checks.
 *          Ask for a capability instead.
 *
 *  RULE 2  Only a lane app may import that lane's native SDK.
 *          @capacitor/* only in apps/mobile-capacitor
 *          expo-* / react-native only in apps/mobile-expo
 *          @tauri-apps/* only in apps/mobile-tauri
 *
 *  RULE 3  Lane apps must stay thin. They may not contain AgentSam
 *          conversation logic, model routing, ACP logic, analytics schemas,
 *          work graphs, provider semantics, composer state, artifact
 *          contracts, or identity contracts. Those remain packages.
 *
 *  RULE 4  Devices never hold the Basin credential.
 *
 *  RULE 5  Every lane must be independently removable: no core package may
 *          import a lane adapter or a lane app.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.cache', 'gen', 'target', 'ios', 'android']);
const CODE = /\.(ts|tsx|js|jsx|mjs|cjs)$/;

const violations = [];

/**
 * Rules apply to CODE, not prose: documentation comments in this repo
 * deliberately quote the banned patterns to explain why they are banned.
 */
function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function walk(dir, visit) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, visit);
    else if (CODE.test(entry.name)) visit(full, stripComments(fs.readFileSync(full, 'utf8')));
  }
}

function report(file, rule, detail) {
  violations.push({ file: path.relative(ROOT, file), rule, detail });
}

// ---------------------------------------------------------------- RULE 1
const PLATFORM_BRANCHES = [
  /\bis(?:Capacitor|Expo|Tauri|ReactNative|NativePlatform|Cordova)\b/,
  /\bplatform\s*===\s*['"](?:capacitor|expo|tauri)['"]/i,
  /\bidentity\.lane\s*===\s*['"](?:capacitor|expo|tauri|web)['"]/,
];

const RULE1_SCOPES = [
  'packages/agentsam-platform/src',
  'packages/agentsam-proof/src',
  'packages/agentsam-browser-surface/src',
  'packages/agentsam-runtime-state/src',
  'packages/agentsam-telemetry/src',
  'packages/agentsam-contracts/src',
  'packages/agentsam-abs/src',
  'packages/agentsam-workbench/src',
  'packages/agentsam-work/src',
  'components',
  'hooks',
  'services',
];

for (const scope of RULE1_SCOPES) {
  walk(path.join(ROOT, scope), (file, source) => {
    for (const pattern of PLATFORM_BRANCHES) {
      const match = source.match(pattern);
      if (match) report(file, 1, `platform branch "${match[0]}" — ask for a capability instead`);
    }
  });
}

// ---------------------------------------------------------------- RULE 2
const SDK_OWNERS = [
  { pattern: /from\s+['"]@capacitor\//, owner: 'apps/mobile-capacitor', label: '@capacitor/*' },
  { pattern: /from\s+['"]expo[-/]/, owner: 'apps/mobile-expo', label: 'expo-*' },
  { pattern: /from\s+['"]react-native['"]/, owner: 'apps/mobile-expo', label: 'react-native' },
  { pattern: /from\s+['"]@tauri-apps\//, owner: 'apps/mobile-tauri', label: '@tauri-apps/*' },
];

walk(path.join(ROOT, 'packages'), (file, source) => {
  for (const { pattern, label } of SDK_OWNERS) {
    if (pattern.test(source)) {
      report(file, 2, `package imports ${label}; adapters must take the SDK by injection`);
    }
  }
});

for (const app of ['mobile-pwa', 'mobile-capacitor', 'mobile-expo', 'mobile-tauri']) {
  walk(path.join(ROOT, 'apps', app), (file, source) => {
    for (const { pattern, owner, label } of SDK_OWNERS) {
      if (pattern.test(source) && !file.includes(path.join('apps', path.basename(owner)))) {
        report(file, 2, `imports ${label} outside ${owner}`);
      }
    }
  });
}

// ---------------------------------------------------------------- RULE 3
const FORBIDDEN_IN_APPS = [
  { pattern: /\bGOAP\b|goap\//, label: 'GOAP planning / orchestration' },
  { pattern: /\bacpService\b|agent-client-protocol|\bACP\s+session\b/i, label: 'ACP logic' },
  { pattern: /\bmodelRouting\b|\brouteModel\b|\bselectModel\(/, label: 'model routing' },
  { pattern: /\bworkGraph\b|\bWorkGraph\b/, label: 'work graphs' },
  { pattern: /\bcomposerState\b|\buseComposer\b/, label: 'composer state' },
  { pattern: /interface\s+\w*Artifact(?:Manifest|Contract)\b/, label: 'artifact contracts' },
  { pattern: /interface\s+\w*Identity(?:Contract|Claims)\b/, label: 'identity contracts' },
  { pattern: /schema:\s*['"]agentsam\.[a-z.]+v\d/, label: 'analytics schema definition' },
];

for (const app of ['mobile-pwa', 'mobile-capacitor', 'mobile-expo', 'mobile-tauri']) {
  walk(path.join(ROOT, 'apps', app), (file, source) => {
    for (const { pattern, label } of FORBIDDEN_IN_APPS) {
      if (pattern.test(source)) report(file, 3, `lane app contains ${label} — that belongs in a package`);
    }
  });
}

// ---------------------------------------------------------------- RULE 4
const BASIN_ON_DEVICE = /(BASIN_(?:TOKEN|SECRET|KEY|CREDENTIAL)|basinCredential|D1_BINDING|CLOUDFLARE_API_TOKEN)/;
for (const scope of ['apps', 'packages/agentsam-platform-web/src', 'packages/agentsam-platform-capacitor/src', 'packages/agentsam-platform-expo/src', 'packages/agentsam-platform-tauri/src']) {
  walk(path.join(ROOT, scope), (file, source) => {
    if (BASIN_ON_DEVICE.test(source) && !/forbiddenOnDevice|DEVICE_CREDENTIAL_POLICY/.test(source)) {
      report(file, 4, 'device-side code references a hosted ingestion credential');
    }
  });
}

// ---------------------------------------------------------------- RULE 5
const CORE_PACKAGES = [
  'agentsam-platform',
  'agentsam-contracts',
  'agentsam-runtime-state',
  'agentsam-telemetry',
  'agentsam-browser-surface',
  'agentsam-proof',
  'agentsam-abs',
  'agentsam-work',
  'agentsam-work-graph',
  'agentsam-workbench',
  'agentsam-settings',
];

const LANE_PACKAGES = /@inneranimalmedia\/agentsam-(?:platform-(?:web|capacitor|expo|tauri)|mobile-)/;

for (const pkg of CORE_PACKAGES) {
  walk(path.join(ROOT, 'packages', pkg, 'src'), (file, source) => {
    const match = source.match(LANE_PACKAGES);
    if (match) report(file, 5, `core package imports lane code "${match[0]}" — lanes must be removable`);
  });
}

// ---------------------------------------------------------------- output
const RULE_TITLES = {
  1: 'No platform branching in UI or shared packages',
  2: 'Native SDKs only inside their own lane app',
  3: 'Lane apps stay thin (no AgentSam business logic)',
  4: 'Devices never hold hosted ingestion credentials',
  5: 'Every lane is independently removable',
};

if (violations.length === 0) {
  console.log('✅ [agentsam] platform boundaries clean');
  for (const [rule, title] of Object.entries(RULE_TITLES)) console.log(`   rule ${rule}: ${title}`);
  process.exit(0);
}

console.error(`❌ [agentsam] ${violations.length} boundary violation(s)\n`);
for (const violation of violations) {
  console.error(`  rule ${violation.rule} · ${RULE_TITLES[violation.rule]}`);
  console.error(`    ${violation.file}: ${violation.detail}\n`);
}
process.exit(1);
