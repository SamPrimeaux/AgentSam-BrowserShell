# Capacitor lane — native project metadata

The generated `ios/` and `android/` folders are intentionally **not committed**
while this lane is a scaffold. Recreate them deterministically:

```bash
npm run lane:install
npm run lane:add:ios      # Xcode project -> ios/App
npm run lane:add:android  # Gradle project -> android/
npm run lane:sync
```

| Item | Value |
| --- | --- |
| Bundle / application id | `com.inneranimals.agentsam.capacitor` |
| Display name | AgentSam (Capacitor lane) |
| Min iOS | 14.0 |
| Min Android SDK | 23 |
| Background color | `#090A0E` |
| Accent | `#8B5CF6` |

## Required usage descriptions (iOS `Info.plist`)

| Key | Reason string |
| --- | --- |
| `NSCameraUsageDescription` | AgentSam captures photos you attach to a conversation. |
| `NSMicrophoneUsageDescription` | AgentSam records voice prompts you choose to send. |
| `NSPhotoLibraryUsageDescription` | AgentSam attaches images you pick from your library. |

## Android permissions

`CAMERA`, `POST_NOTIFICATIONS`, `ACCESS_NETWORK_STATE`, `INTERNET`.

## Removal

Deleting `apps/mobile-capacitor/` and `packages/agentsam-platform-capacitor/`
removes this lane completely. No core package imports either one.
