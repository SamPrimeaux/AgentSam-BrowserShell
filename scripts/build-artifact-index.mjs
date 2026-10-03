#!/usr/bin/env node
/**
 * scripts/build-artifact-index.mjs
 * 
 * Scans the workspace repository for artifact.json and package.json files
 * and compiles them into a single dist/artifacts/index.json for the Workbench
 * and Artifact Browser to consume.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.join(ROOT_DIR, 'dist', 'artifacts');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'index.json');

console.log('⚡ [agentsam] Scanning repository for artifact & package manifests...');

/**
 * Searches directories for package.json and artifact.json
 */
function findPackageDirs(baseDir) {
  const dirs = [];
  if (!fs.existsSync(baseDir)) return dirs;

  const entries = fs.readdirSync(baseDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const fullPath = path.join(baseDir, entry.name);
      if (['node_modules', '.git', 'dist', 'build', '.cache'].includes(entry.name)) {
        continue;
      }
      if (fs.existsSync(path.join(fullPath, 'package.json')) || fs.existsSync(path.join(fullPath, 'artifact.json'))) {
        dirs.push(fullPath);
      }
    }
  }
  return dirs;
}

const candidateDirs = [
  ...findPackageDirs(path.join(ROOT_DIR, 'packages')),
  ...findPackageDirs(path.join(ROOT_DIR, 'apps')),
  ...findPackageDirs(ROOT_DIR),
];

// Deduplicate
const uniqueDirs = Array.from(new Set(candidateDirs));
const artifacts = [];

for (const dir of uniqueDirs) {
  const artifactPath = path.join(dir, 'artifact.json');
  const pkgPath = path.join(dir, 'package.json');

  let pkg = null;
  if (fs.existsSync(pkgPath)) {
    try {
      pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    } catch (e) {
      console.warn(`[WARN] Failed to parse ${pkgPath}:`, e.message);
    }
  }

  let artifact = null;
  if (fs.existsSync(artifactPath)) {
    try {
      artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    } catch (e) {
      console.warn(`[WARN] Failed to parse ${artifactPath}:`, e.message);
    }
  }

  // If artifact.json exists, merge package info
  if (artifact) {
    if (pkg && (!artifact.package || !artifact.package.name)) {
      artifact.package = {
        name: pkg.name,
        version: pkg.version,
      };
    }
    artifact.source = {
      path: path.relative(ROOT_DIR, dir),
    };
    artifacts.push(artifact);
    console.log(`  [✓] Artifact: ${artifact.name || artifact.id} (${artifact.kind}) - from ${path.relative(ROOT_DIR, dir)}`);
  } else if (pkg && pkg.name && pkg.name.startsWith('@inneranimalmedia/')) {
    // Synthesize fallback artifact from package.json
    const id = pkg.name.replace('@inneranimalmedia/', '');
    const synthArtifact = {
      schema: 'inneranimal.artifact.v1',
      id,
      name: pkg.name,
      package: {
        name: pkg.name,
        version: pkg.version || '1.0.0',
      },
      kind: 'foundation',
      family: 'packages',
      summary: pkg.description || 'Package artifact',
      status: 'stable',
      source: {
        path: path.relative(ROOT_DIR, dir),
      },
      preview: {
        kind: 'package',
      },
    };
    artifacts.push(synthArtifact);
    console.log(`  [+] Synthesized: ${pkg.name} - from ${path.relative(ROOT_DIR, dir)}`);
  }
}

// Sort by kind, family, name
artifacts.sort((a, b) => {
  if (a.kind !== b.kind) return a.kind.localeCompare(b.kind);
  if ((a.family || '') !== (b.family || '')) return (a.family || '').localeCompare(b.family || '');
  return (a.name || a.id).localeCompare(b.name || b.id);
});

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Build index payload
const indexPayload = {
  schema: 'inneranimal.artifact-index.v1',
  generatedAt: new Date().toISOString(),
  totalCount: artifacts.length,
  families: Array.from(new Set(artifacts.map(a => a.family).filter(Boolean))),
  kinds: Array.from(new Set(artifacts.map(a => a.kind))),
  artifacts,
};

fs.writeFileSync(OUTPUT_FILE, JSON.stringify(indexPayload, null, 2), 'utf8');

console.log(`\n🎉 [agentsam] Successfully compiled ${artifacts.length} artifacts to:`);
console.log(`   ${OUTPUT_FILE} (${fs.statSync(OUTPUT_FILE).size} bytes)`);
