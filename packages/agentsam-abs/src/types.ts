export interface Breadcrumb {
  sitename: string;
  page: string;
}

export interface TokenCount {
  input: number;
  output: number;
  isEstimate?: boolean;
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface PageSnapshot {
  html: string;
  breadcrumb: Breadcrumb;
  scrollPosition: number;
  timestamp: number;
  tokenCount: TokenCount;
  prompt: string;
  contextHtml: string | null;
  isGrounded: boolean;
  groundingSources: GroundingSource[];
  searchEntryPointHtml: string;
}

export interface BrowserTabState {
  id: string;
  history: PageSnapshot[];
  currentIndex: number;
  loading: boolean;
  loadingMessage: string;
  generatedContent: string;
  breadcrumb: Breadcrumb;
  tokenCount: TokenCount | null;
  groundingSources: GroundingSource[];
  searchEntryPointHtml: string;
  navigationId: number;
}

export type CloudDestination = 'drive' | 'gmail' | 'acp' | 'download';

export interface CloudSaveOptions {
  destination: CloudDestination;
  fileName: string;
  htmlContent: string;
  pageTitle: string;
  prompt?: string;
  emailSubject?: string;
  emailRecipient?: string;
}

export interface CloudSaveResult {
  success: boolean;
  destination: CloudDestination;
  message: string;
  linkUrl?: string;
  fileId?: string;
  timestamp: string;
}

export interface AgentSamBrowserConfig {
  endpoint?: string;
  model?: string;
  enableGrounding?: boolean;
  ttsEnabled?: boolean;
  acpServeUrl?: string;
}
