//! # AgentSam Auto Browser Shell (`agentsam-abs`)
//!
//! Autonomous AI-driven browser runtime with clickable history breadcrumbs,
//! ACP protocol integration, and multi-cloud synchronization (Google Drive, Gmail, ACP).

use serde::{Deserialize, Serialize};

/// Represents an individual breadcrumb navigation element
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Breadcrumb {
    pub sitename: String,
    pub page: String,
}

/// Token metrics for autonomous generation
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct TokenCount {
    pub input: u64,
    pub output: u64,
    pub thinking: Option<u64>,
}

/// Snapshot of an individual page state in navigation history
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PageSnapshot {
    pub html: String,
    pub breadcrumb: Breadcrumb,
    pub prompt: String,
    pub timestamp_ms: u64,
    pub token_count: TokenCount,
}

/// Navigation history with clickable state jumping
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct NavigationTrail {
    pub pages: Vec<PageSnapshot>,
    pub current_index: isize,
}

impl NavigationTrail {
    pub fn new() -> Self {
        Self {
            pages: Vec::new(),
            current_index: -1,
        }
    }

    /// Push a newly generated page state
    pub fn push(&mut self, page: PageSnapshot) {
        if self.current_index >= 0 && (self.current_index as usize) < self.pages.len() - 1 {
            self.pages.truncate((self.current_index + 1) as usize);
        }
        self.pages.push(page);
        self.current_index = (self.pages.len() - 1) as isize;
    }

    /// Jump directly to any previous page state in history (Breadcrumb Jump)
    pub fn jump_to(&mut self, target_index: isize) -> Option<&PageSnapshot> {
        if target_index >= 0 && (target_index as usize) < self.pages.len() {
            self.current_index = target_index;
            Some(&self.pages[target_index as usize])
        } else if target_index == -1 {
            self.current_index = -1;
            None
        } else {
            None
        }
    }

    /// Return the active page state
    pub fn current(&self) -> Option<&PageSnapshot> {
        if self.current_index >= 0 && (self.current_index as usize) < self.pages.len() {
            Some(&self.pages[self.current_index as usize])
        } else {
            None
        }
    }
}

/// Target destination for Cloud Connected Resources
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub enum CloudDestination {
    GoogleDrive,
    GmailDraft,
    AcpArtifact,
    LocalDownload,
}

/// Options for saving generated assets to cloud connected resources
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CloudSaveOptions {
    pub destination: CloudDestination,
    pub filename: String,
    pub html_content: String,
    pub title: String,
    pub prompt: Option<String>,
    pub email_recipient: Option<String>,
}

/// Result of cloud save dispatch
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CloudSaveResult {
    pub success: bool,
    pub destination: CloudDestination,
    pub message: String,
    pub link_url: Option<String>,
}

/// Core AgentSamAutoBrowserShell Engine
#[derive(Debug, Clone)]
pub struct AgentSamAutoBrowserShell {
    pub endpoint: String,
    pub trail: NavigationTrail,
}

impl AgentSamAutoBrowserShell {
    pub fn new(endpoint: impl Into<String>) -> Self {
        Self {
            endpoint: endpoint.into(),
            trail: NavigationTrail::new(),
        }
    }

    /// Clickable Breadcrumb navigation jump
    pub fn jump_to_history(&mut self, target_index: isize) -> Option<&PageSnapshot> {
        self.trail.jump_to(target_index)
    }

    /// Prepare cloud synchronization payload
    pub fn prepare_cloud_save(&self, destination: CloudDestination) -> Option<CloudSaveOptions> {
        let page = self.trail.current()?;
        let sanitized = page.breadcrumb.sitename
            .to_lowercase()
            .replace(|c: char| !c.is_alphanumeric() && c != '-' && c != '_', "_");

        Some(CloudSaveOptions {
            destination,
            filename: format!("{}.html", sanitized),
            html_content: page.html.clone(),
            title: page.breadcrumb.sitename.clone(),
            prompt: Some(page.prompt.clone()),
            email_recipient: None,
        })
    }
}
