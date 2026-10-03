# @inneranimalmedia/agentsam-proof

One scenario, four lanes, comparable evidence.

```text
launch → identify capabilities → authenticate/local → open lead conversation →
send prompt → stream response → open artifact → store local state →
emit AgentSam activity event
```

```ts
const report = await runCrossPlatformProof({ platform, conversation: createLocalConversationHost(), emit });
console.log(renderProofMarkdown(report));
```

Every step returns human-checkable evidence and a duration. `store_local_state`
is a real write-then-read-back round trip. `@inneranimalmedia/agentsam-proof/react`
exports the shared `CapabilityDemoScreen` used by the DOM lanes.

`renderComparisonMarkdown()` builds the lane table and always appends: *no
winner is declared*.

See `docs/CROSS_PLATFORM_PROOF.md`. Apache-2.0.
