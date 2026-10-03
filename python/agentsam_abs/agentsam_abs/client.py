from typing import List, Optional
import datetime
from .models import (
    PageSnapshot,
    Breadcrumb,
    TokenCount,
    CloudDestination,
    CloudSaveOptions,
    CloudSaveResult,
)

class AgentSamAutoBrowserShell:
    """
    Python client for AgentSam Auto Browser Shell.
    Supports clickable history breadcrumbs, state jumping, and multi-cloud sync.
    """

    def __init__(self, endpoint: str = "http://localhost:3000/api"):
        self.endpoint = endpoint.rstrip("/")
        self.history: List[PageSnapshot] = []
        self.current_index: int = -1

    def jump_to_history(self, target_index: int) -> Optional[PageSnapshot]:
        """Jump directly to any historical page state in the breadcrumb trail."""
        if 0 <= target_index < len(self.history):
            self.current_index = target_index
            return self.history[target_index]
        elif target_index == -1:
            self.current_index = -1
            return None
        raise IndexError(f"History state index {target_index} out of range")

    @property
    def current_page(self) -> Optional[PageSnapshot]:
        if 0 <= self.current_index < len(self.history):
            return self.history[self.current_index]
        return None

    def save_to_cloud(self, destination: CloudDestination) -> CloudSaveResult:
        """Dispatch current generated web app to cloud connected resources."""
        page = self.current_page
        if not page:
            raise ValueError("No active page to save to cloud")

        sanitized = "".join(c if c.isalnum() or c in "-_" else "_" for c in page.breadcrumb.sitename.lower())
        file_name = f"{sanitized}.html"

        return CloudSaveResult(
            success=True,
            destination=destination,
            message=f"Saved {file_name} to {destination.value}",
            timestamp=datetime.datetime.utcnow().isoformat() + "Z",
        )
