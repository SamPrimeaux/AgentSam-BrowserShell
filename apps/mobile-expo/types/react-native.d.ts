/**
 * Minimal React Native surface so this lane typechecks in CI without the
 * React Native toolchain installed. `npm run lane:install` replaces these
 * shims with the real `react-native` types (this file is then deleted).
 */
declare module 'react-native' {
  import type * as React from 'react';

  export interface ViewStyle { [key: string]: unknown }
  export interface TextStyle { [key: string]: unknown }
  type StyleProp<T> = T | T[] | false | null | undefined;

  export interface ViewProps { style?: StyleProp<ViewStyle>; children?: React.ReactNode }
  export interface TextProps { style?: StyleProp<TextStyle>; numberOfLines?: number; children?: React.ReactNode }
  export interface ScrollViewProps extends ViewProps { contentContainerStyle?: StyleProp<ViewStyle> }
  export interface PressableProps extends ViewProps { onPress?: () => void; disabled?: boolean }

  export const View: React.ComponentType<ViewProps>;
  export const Text: React.ComponentType<TextProps>;
  export const ScrollView: React.ComponentType<ScrollViewProps>;
  export const Pressable: React.ComponentType<PressableProps>;
  export const SafeAreaView: React.ComponentType<ViewProps>;
  export const ActivityIndicator: React.ComponentType<{ color?: string; size?: 'small' | 'large' }>;
  export const StatusBar: React.ComponentType<{ barStyle?: string; backgroundColor?: string }>;

  export const StyleSheet: {
    create<T extends Record<string, ViewStyle | TextStyle>>(styles: T): T;
    absoluteFillObject: ViewStyle;
  };

  export const Platform: { OS: 'ios' | 'android' | 'web'; isPad?: boolean; select<T>(spec: Record<string, T>): T };
  export const Share: { share(content: { title?: string; message?: string; url?: string }): Promise<{ action: string; activityType?: string }> };
  export const Linking: { openURL(url: string): Promise<void> };
}
