# @inneranimalmedia/agentsam-platform-expo

Expo / React Native adapter for `@inneranimalmedia/agentsam-platform`.

`expo-*` modules are **injected, not imported** — CI typechecks this package
without the React Native toolchain, and `apps/mobile-expo` is the only place
that imports them.

```ts
const platform = await AgentSamPlatform.create(
  createExpoPlatformAdapter({ modules: { FileSystem, ImagePicker, SecureStore /* … */ }, os: Platform.OS }),
);
```

`secureStore` is `available` and hardware-backed (Keychain / Keystore) — the
strongest secure storage of the four lanes. `backgroundExecution` is
`degraded` by design: iOS schedules background fetch opportunistically and
timing is never promised.

Apache-2.0.
