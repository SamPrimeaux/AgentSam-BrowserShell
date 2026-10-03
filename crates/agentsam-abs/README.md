# agentsam-abs (Rust Crate)

> Rust bindings and headless engine for **AgentSam Auto Browser Shell (`AgentSamAutoBrowserShell`)** with clickable history breadcrumbs, ACP protocol integration, and multi-cloud sync.

## Installation

Add to your `Cargo.toml`:

```toml
[dependencies]
agentsam-abs = "1.0.0"
```

## Usage Example

```rust
use agentsam_abs::{AgentSamAutoBrowserShell, CloudDestination};

#[tokio::main]
async fn main() {
    let mut shell = AgentSamAutoBrowserShell::new("https://my-app.run.app/api");

    // Clickable Breadcrumb History Jump
    shell.jump_to_history(0);

    // Save to Google Drive / Gmail / ACP
    if let Some(save_opts) = shell.prepare_cloud_save(CloudDestination::GoogleDrive) {
        println!("Prepared cloud sync: {}", save_opts.filename);
    }
}
```
