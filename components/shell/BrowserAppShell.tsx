import React from 'react';
import { Nav } from '@inneranimalmedia/agentsam-nav';

import '../../styles/theme.css';

export interface BrowserAppShellProps {
  children: React.ReactNode;
}

export function BrowserAppShell({
  children,
}: BrowserAppShellProps): React.ReactElement {
  return (
    <Nav.Provider
      defaultOpen={false}
      mobileBreakpoint={768}
      peekable
      resizable
    >
      <div
        className="agentsam-browser-app"
        data-agentsam-app-shell="browser"
      >
        <div className="agentsam-browser-app__main">
          <main className="agentsam-browser-app__stage">
            {children}
          </main>
        </div>
      </div>
    </Nav.Provider>
  );
}
