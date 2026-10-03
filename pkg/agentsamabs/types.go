package agentsamabs

type Breadcrumb struct {
	Sitename string `json:"sitename"`
	Page     string `json:"page"`
}

type TokenCount struct {
	Input    int64 `json:"input"`
	Output   int64 `json:"output"`
	Thinking int64 `json:"thinking,omitempty"`
}

type PageSnapshot struct {
	HTML        string     `json:"html"`
	Breadcrumb  Breadcrumb `json:"breadcrumb"`
	Prompt      string     `json:"prompt"`
	TimestampMS int64      `json:"timestampMs"`
	TokenCount  TokenCount `json:"tokenCount"`
}

type CloudDestination string

const (
	CloudDestinationGoogleDrive   CloudDestination = "drive"
	CloudDestinationGmailDraft    CloudDestination = "gmail"
	CloudDestinationACPArtifact   CloudDestination = "acp"
	CloudDestinationLocalDownload CloudDestination = "download"
)

type CloudSaveOptions struct {
	Destination    CloudDestination `json:"destination"`
	FileName       string           `json:"fileName"`
	HTMLContent    string           `json:"htmlContent"`
	Title          string           `json:"title"`
	Prompt         string           `json:"prompt,omitempty"`
	EmailRecipient string           `json:"emailRecipient,omitempty"`
}

type CloudSaveResult struct {
	Success     bool             `json:"success"`
	Destination CloudDestination `json:"destination"`
	Message     string           `json:"message"`
	LinkURL     string           `json:"linkUrl,omitempty"`
	Timestamp   string           `json:"timestamp"`
}
