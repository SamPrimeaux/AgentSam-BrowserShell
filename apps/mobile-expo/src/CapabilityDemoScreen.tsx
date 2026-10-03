/**
 * The Expo lane's capability demonstration screen.
 *
 * It renders the SAME report produced by @inneranimalmedia/agentsam-proof —
 * only the view primitives differ. No scenario logic is duplicated here.
 */
import * as React from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CAPABILITY_IDS, type AgentSamPlatform, type CapabilityState } from '@inneranimalmedia/agentsam-platform';
import { RuntimeEventAdapter, type RuntimeProjection } from '@inneranimalmedia/agentsam-runtime-state';
import { createLocalConversationHost, runCrossPlatformProof, type ProofReport } from '@inneranimalmedia/agentsam-proof';
import { APP_VERSION } from './platform.js';

const STATUS_COLOR: Record<CapabilityState['status'], string> = {
  available: '#34D399',
  degraded: '#FBBF24',
  'requires-permission': '#8B5CF6',
  denied: '#F87171',
  unavailable: '#52525B',
  unknown: '#71717A',
};

export function CapabilityDemoScreen({ platform }: { platform: AgentSamPlatform }): React.ReactElement {
  const [runtime] = React.useState(() => new RuntimeEventAdapter());
  const [projection, setProjection] = React.useState<RuntimeProjection | null>(null);
  const [report, setReport] = React.useState<ProofReport | null>(null);
  const [running, setRunning] = React.useState(false);
  const [tick, setTick] = React.useState(0);

  React.useEffect(() => runtime.subscribe(setProjection), [runtime]);
  React.useEffect(() => platform.subscribe(() => setTick((value) => value + 1)), [platform]);

  const run = React.useCallback(async () => {
    setRunning(true);
    try {
      setReport(
        await runCrossPlatformProof({
          platform,
          runtime,
          conversation: createLocalConversationHost(),
          appVersion: APP_VERSION,
        }),
      );
    } finally {
      setRunning(false);
    }
  }, [platform, runtime]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>AgentSam · Expo lane</Text>
        <Text style={styles.subtitle}>
          {platform.identity.displayName} · {platform.identity.os} · {platform.identity.formFactor}
        </Text>

        <View style={styles.panel}>
          <Text style={styles.sectionLabel}>CROSS-PLATFORM PROOF</Text>
          <Text style={styles.muted}>{projection ? `${projection.compact.state} — ${projection.compact.text}` : 'idle'}</Text>
          <Pressable style={styles.button} onPress={() => void run()} disabled={running}>
            {running ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Run proof</Text>}
          </Pressable>
          {report?.steps.map((step) => (
            <View key={step.step} style={styles.step}>
              <Text style={styles.stepTitle}>{step.label}</Text>
              <Text style={styles.muted}>
                {step.status} · {step.durationMs}ms · {step.error ?? step.evidence}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.panel} key={tick}>
          <Text style={styles.sectionLabel}>PLATFORM CAPABILITIES</Text>
          {CAPABILITY_IDS.map((id) => {
            const state = platform.get(id);
            return (
              <View key={id} style={styles.row}>
                <View style={[styles.dot, { backgroundColor: STATUS_COLOR[state.status] }]} />
                <View style={styles.rowBody}>
                  <Text style={styles.rowTitle}>{id}</Text>
                  <Text style={styles.muted} numberOfLines={2}>
                    {state.status} · {state.implementation}
                    {state.reason ? ` — ${state.reason}` : ''}
                  </Text>
                </View>
                {state.status === 'requires-permission' ? (
                  <Pressable style={styles.grant} onPress={() => void platform.request(id)}>
                    <Text style={styles.buttonText}>Grant</Text>
                  </Pressable>
                ) : null}
              </View>
            );
          })}
        </View>

        <Text style={styles.footer}>
          No component here asks which platform it is running on. It asks for capabilities.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#090A0E' },
  content: { padding: 16, gap: 16 },
  title: { color: '#E5E7EB', fontSize: 22, fontWeight: '700' },
  subtitle: { color: '#9CA3AF', fontSize: 13 },
  panel: { backgroundColor: '#121318', borderColor: '#232430', borderWidth: 1, borderRadius: 14, padding: 14, gap: 8 },
  sectionLabel: { color: '#9CA3AF', fontSize: 11, letterSpacing: 1 },
  muted: { color: '#9CA3AF', fontSize: 12 },
  button: { backgroundColor: '#8B5CF6', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  buttonText: { color: '#FFFFFF', fontWeight: '600', fontSize: 13 },
  step: { borderLeftColor: '#34D399', borderLeftWidth: 2, paddingLeft: 10, gap: 2 },
  stepTitle: { color: '#E5E7EB', fontSize: 13, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  rowBody: { flex: 1 },
  rowTitle: { color: '#E5E7EB', fontSize: 14, fontWeight: '600' },
  dot: { width: 10, height: 10, borderRadius: 5 },
  grant: { backgroundColor: '#8B5CF6', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  footer: { color: '#6B7280', fontSize: 11, textAlign: 'center' },
});
