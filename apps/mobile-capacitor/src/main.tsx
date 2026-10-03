import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { AgentSamPlatform } from '@inneranimalmedia/agentsam-platform';
import { PlatformProvider } from '@inneranimalmedia/agentsam-platform/react';
import { CapabilityDemoScreen } from '@inneranimalmedia/agentsam-proof/react';
import { APP_VERSION, createPlatform } from './platform.js';

function Root(): React.ReactElement {
  const [platform, setPlatform] = React.useState<AgentSamPlatform | null>(null);
  React.useEffect(() => {
    void createPlatform().then(setPlatform);
  }, []);
  if (!platform) return <div style={{ color: '#9CA3AF', padding: 24, fontFamily: 'system-ui' }}>Probing host…</div>;
  return (
    <PlatformProvider platform={platform}>
      <CapabilityDemoScreen title="AgentSam · Capacitor lane" subtitle="Capacitor adapter" appVersion={APP_VERSION} />
    </PlatformProvider>
  );
}

const container = document.getElementById('root');
if (container) createRoot(container).render(<Root />);
