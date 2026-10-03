"""
AgentSam Auto Browser Shell (agentsam-abs)
Autonomous AI-driven browser runtime with clickable history breadcrumbs,
ACP protocol integration, and multi-cloud sync.
"""

from .models import (
    Breadcrumb,
    TokenCount,
    PageSnapshot,
    CloudDestination,
    CloudSaveOptions,
    CloudSaveResult,
)
from .client import AgentSamAutoBrowserShell

__version__ = "1.0.0"
__all__ = [
    "AgentSamAutoBrowserShell",
    "Breadcrumb",
    "TokenCount",
    "PageSnapshot",
    "CloudDestination",
    "CloudSaveOptions",
    "CloudSaveResult",
]
