import * as React from 'react';
import { ActivityIndicator, View } from 'react-native';
import type { AgentSamPlatform } from '@inneranimalmedia/agentsam-platform';
import { CapabilityDemoScreen } from './src/CapabilityDemoScreen.js';
import { createPlatform } from './src/platform.js';

export default function App(): React.ReactElement {
  const [platform, setPlatform] = React.useState<AgentSamPlatform | null>(null);

  React.useEffect(() => {
    void createPlatform().then(setPlatform);
  }, []);

  if (!platform) {
    return (
      <View style={{ flex: 1, backgroundColor: '#090A0E', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#8B5CF6" size="large" />
      </View>
    );
  }

  return <CapabilityDemoScreen platform={platform} />;
}
