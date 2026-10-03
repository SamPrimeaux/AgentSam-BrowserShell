from typing import Optional, List
from pydantic import BaseModel, Field
from enum import Enum

class CloudDestination(str, Enum):
    GOOGLE_DRIVE = "drive"
    GMAIL_DRAFT = "gmail"
    ACP_ARTIFACT = "acp"
    LOCAL_DOWNLOAD = "download"

class Breadcrumb(BaseModel):
    sitename: str
    page: str

class TokenCount(BaseModel):
    input: int
    output: int
    thinking: Optional[int] = None

class PageSnapshot(BaseModel):
    html: str
    breadcrumb: Breadcrumb
    prompt: str
    timestamp_ms: int
    token_count: TokenCount

class CloudSaveOptions(BaseModel):
    destination: CloudDestination
    file_name: str
    html_content: str
    page_title: str
    prompt: Optional[str] = None
    email_recipient: Optional[str] = None

class CloudSaveResult(BaseModel):
    success: bool
    destination: CloudDestination
    message: str
    link_url: Optional[str] = None
    timestamp: str
