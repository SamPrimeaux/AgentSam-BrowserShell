# agentsam-abs (Python SDK)

> Python client and headless SDK for **AgentSam Auto Browser Shell (`AgentSamAutoBrowserShell`)** with clickable history breadcrumbs, ACP protocol integration, and multi-cloud sync.

## Installation

```bash
pip install agentsam-abs
```

## Usage Example

```python
from agentsam_abs import AgentSamAutoBrowserShell, CloudDestination

shell = AgentSamAutoBrowserShell(endpoint="https://my-app.run.app/api")

# Jump to any previous breadcrumb state in history
shell.jump_to_history(0)

# Save to Google Drive
res = shell.save_to_cloud(CloudDestination.GOOGLE_DRIVE)
print(res.message)
```
