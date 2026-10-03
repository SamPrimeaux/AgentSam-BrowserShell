# Expo lane — native project metadata

This lane ships config, not generated native projects. `ios/` and `android/`
are produced by prebuild and are not committed while the lane is a scaffold.

```bash
npm run lane:install      # expo modules
npx expo prebuild         # generates ios/ and android/
npm run lane:ios          # or lane:android
```

| Item | Value |
| --- | --- |
| Bundle / package id | `com.inneranimals.agentsam.expo` |
| Scheme (auth redirect) | `agentsam://` |
| iOS background modes | `fetch`, `processing` |
| Android permissions | CAMERA, RECORD_AUDIO, POST_NOTIFICATIONS, ACCESS_NETWORK_STATE, INTERNET |
| Secure storage | Keychain (iOS) / Keystore (Android) via `expo-secure-store` |

`types/react-native.d.ts` is a CI-only shim so this lane typechecks before the
React Native toolchain is installed. Delete it the moment `react-native` is a
real dependency.

## Removal

Delete `apps/mobile-expo/` and `packages/agentsam-platform-expo/`. Nothing in
`packages/` imports either.
