#!/usr/bin/env node
/**
 * scripts/build-packages.mjs
 *
 * Builds the publishable @inneranimalmedia packages in dependency order.
 * Lane adapters and the proof package depend on the platform contract, so the
 * order is fixed here rather than discovered — a cycle should be a build
 * failure, not a surprise at publish time.
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const ORDER = [
  'agentsam-contracts',
  'agentsam-platform',
  'agentsam-runtime-state',
  'agentsam-telemetry',
  'agentsam-browser-surface',
  'agentsam-platform-web',
  'agentsam-platform-capacitor',
  'agentsam-platform-expo',
  'agentsam-platform-tauri',
  'agentsam-proof',
  'agentsam-abs',
];

const only = process.argv.slice(2).filter((argument) => !argument.startsWith('-'));
const targets = only.length > 0 ? ORDER.filter((name) => only.includes(name)) : ORDER;

let built = 0;
let skipped = 0;

for (const name of targets) {
  const dir = path.join(ROOT, 'packages', name);
  const manifestPath = path.join(dir, 'package.json');
  if (!fs.existsSync(manifestPath)) {
    console.log(`  [-] ${name} — not present, skipping`);
    skipped += 1;
    continue;
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (!manifest.scripts?.build) {
    console.log(`  [-] ${name} — no build script, skipping`);
    skipped += 1;
    continue;
  }
  process.stdout.write(`  [>] ${manifest.name}@${manifest.version} … `);
  try {
    execFileSync('npx', ['tsc', '-p', 'tsconfig.json'], { cwd: dir, stdio: 'pipe' });
    console.log('ok');
    built += 1;
  } catch (error) {
    console.log('FAILED');
    console.error(String(error.stdout ?? error.message));
    process.exitCode = 1;
  }
}

console.log(`\n⚡ [agentsam] built ${built} package(s), skipped ${skipped}.`);
