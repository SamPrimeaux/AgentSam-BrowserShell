# @inneranimalmedia/agentsam-abs

> **AgentSam Auto Browser Shell (`AgentSamAutoBrowserShell`)**: Autonomous AI-driven browser runtime with clickable history breadcrumbs, Agent Client Protocol (ACP) server integration, and multi-cloud sync (Google Drive, Gmail, ACP).

[![npm version](https://img.shields.io/npm/v/@inneranimalmedia/agentsam-abs.svg)](https://www.npmjs.com/package/@inneranimalmedia/agentsam-abs)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)

## Features

- 🧭 **Clickable History Breadcrumb Navigation Bar**: Jump backward or forward to any previous page state in time with zero state corruption.
- ☁️ **Cloud Connected Resources**: Direct one-click export and synchronization to **Google Drive**, **Gmail drafts**, **ACP daemon artifacts**, or local `.html`.
- ⚡ **Multi-Language Architecture**: Native TypeScript/React components with official bindings & scaffolds for **Rust**, **Go**, and **Python**.
- 🎙️ **Multi-Modal AI Integration**: Real-time voice dictation with waveform feedback, TTS page reading, and Gemini 2.5/3.1 model streaming.
- 🛡️ **ACP & Invariant Security**: Strict boundary isolation and single-source-of-truth identity authority.

## Installation

```bash
# npm
npm install @inneranimalmedia/agentsam-abs

# pnpm
pnpm add @inneranimalmedia/agentsam-abs

# bun
bun add @inneranimalmedia/agentsam-abs
```

## Quick Start (React / TypeScript)

```tsx
import React, { useState } from 'react';
import { AgentSamAutoBrowserShell } from '@inneranimalmedia/agentsam-abs';

export function MyApp() {
  const [history, setHistory] = useState([]);
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(-1);

  return (
    <AgentSamAutoBrowserShell
      breadcrumb={{ sitename: 'My Generated App', page: 'dashboard' }}
      isLoading={false}
      loadingMessage=""
      onNavigate={(type, prompt) => console.log('Navigate:', prompt)}
      onBack={() => console.log('Back')}
      onForward={() => console.log('Forward')}
      onRefresh={() => console.log('Refresh')}
      onStop={() => {}}
      onHome={() => setCurrentHistoryIndex(-1)}
      canGoBack={currentHistoryIndex > 0}
      canGoForward={currentHistoryIndex < history.length - 1}
      groundingSources={[]}
      searchEntryPointHtml=""
      tabs={[]}
      activeTabIndex={0}
      onNewTab={() => {}}
      onCloseTab={() => {}}
      onSwitchTab={() => {}}
      isGrounded={false}
      onToggleGrounding={() => {}}
      history={history}
      currentHistoryIndex={currentHistoryIndex}
      onJumpToHistory={(targetIndex) => setCurrentHistoryIndex(targetIndex)}
      currentHtml="<div>Hello AgentSam!</div>"
    >
      <iframe srcDoc="<div>Hello AgentSam!</div>" className="w-full h-full border-none" />
    </AgentSamAutoBrowserShell>
  );
}
```

## Multi-Language Packages

- **TypeScript / React**: `@inneranimalmedia/agentsam-abs` (this package)
- **Rust**: `crates/agentsam-abs` (`cargo add agentsam-abs`)
- **Go**: `pkg/agentsamabs` (`go get github.com/inneranimalmedia/agentsam-abs/go`)
- **Python**: `python/agentsam_abs` (`pip install agentsam-abs`)

## License

Apache-2.0 © Inner Animal Media
