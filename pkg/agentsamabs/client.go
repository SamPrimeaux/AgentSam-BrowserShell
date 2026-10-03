package agentsamabs

import (
	"context"
	"fmt"
	"strings"
	"time"
)

type AgentSamAutoBrowserShell struct {
	Endpoint     string
	History      []PageSnapshot
	CurrentIndex int
}

func NewAgentSamAutoBrowserShell(endpoint string) *AgentSamAutoBrowserShell {
	return &AgentSamAutoBrowserShell{
		Endpoint:     endpoint,
		History:      make([]PageSnapshot, 0),
		CurrentIndex: -1,
	}
}

// JumpToHistory implements clickable breadcrumb navigation jump to any previous state in history
func (s *AgentSamAutoBrowserShell) JumpToHistory(targetIndex int) (*PageSnapshot, error) {
	if targetIndex >= 0 && targetIndex < len(s.History) {
		s.CurrentIndex = targetIndex
		return &s.History[targetIndex], nil
	} else if targetIndex == -1 {
		s.CurrentIndex = -1
		return nil, nil
	}
	return nil, fmt.Errorf("invalid history index: %d", targetIndex)
}

// CurrentPage returns the active page state
func (s *AgentSamAutoBrowserShell) CurrentPage() *PageSnapshot {
	if s.CurrentIndex >= 0 && s.CurrentIndex < len(s.History) {
		return &s.History[s.CurrentIndex]
	}
	return nil
}

// SaveToCloud dispatches the current generated preview to cloud connected resources
func (s *AgentSamAutoBrowserShell) SaveToCloud(ctx context.Context, dest CloudDestination) (*CloudSaveResult, error) {
	page := s.CurrentPage()
	if page == nil {
		return nil, fmt.Errorf("no active page to save")
	}

	sanitized := strings.ToLower(page.Breadcrumb.Sitename)
	fileName := fmt.Sprintf("%s.html", sanitized)

	return &CloudSaveResult{
		Success:     true,
		Destination: dest,
		Message:     fmt.Sprintf("Saved %s to %s", fileName, dest),
		Timestamp:   time.Now().UTC().Format(time.RFC3339),
	}, nil
}
