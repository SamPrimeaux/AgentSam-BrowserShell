# agentsam-abs (Go Package)

> Go client and SDK for **AgentSam Auto Browser Shell (`AgentSamAutoBrowserShell`)** with clickable history breadcrumbs, ACP protocol integration, and multi-cloud sync.

## Installation

```bash
go get github.com/inneranimalmedia/agentsam-abs/go
```

## Usage Example

```go
package main

import (
	"context"
	"fmt"

	agentsamabs "github.com/inneranimalmedia/agentsam-abs/go"
)

func main() {
	shell := agentsamabs.NewAgentSamAutoBrowserShell("https://my-app.run.app/api")

	// Clickable Breadcrumb History Jump
	_, _ = shell.JumpToHistory(0)

	// Save to Google Drive
	res, err := shell.SaveToCloud(context.Background(), agentsamabs.CloudDestinationGoogleDrive)
	if err == nil {
		fmt.Printf("Save Result: %s\n", res.Message)
	}
}
```
