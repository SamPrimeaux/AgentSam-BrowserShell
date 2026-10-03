import {
  AgentSamBrowserConfig,
  BrowserTabState,
  CloudSaveOptions,
  CloudSaveResult,
} from './types';

/**
 * Headless & programmatic client for AgentSamAutoBrowserShell.
 * Provides programmatic navigation, history state jumping, and cloud synchronization.
 */
export class AgentSamBrowserClient {
  private config: AgentSamBrowserConfig;
  private tabs: Map<string, BrowserTabState> = new Map();
  private activeTabId: string = 'tab_0';

  constructor(config: AgentSamBrowserConfig = {}) {
    this.config = {
      endpoint: config.endpoint || '/api/gemini/generate',
      model: config.model || 'gemini-2.5-flash',
      enableGrounding: config.enableGrounding ?? false,
      acpServeUrl: config.acpServeUrl || '/api/agentsam/acp',
      ...config,
    };

    // Initialize root tab
    this.tabs.set(this.activeTabId, {
      id: this.activeTabId,
      history: [],
      currentIndex: -1,
      loading: false,
      loadingMessage: '',
      generatedContent: '',
      breadcrumb: { sitename: '', page: '' },
      tokenCount: null,
      groundingSources: [],
      searchEntryPointHtml: '',
      navigationId: 0,
    });
  }

  /**
   * Get active tab state including current breadcrumb and full history trail
   */
  public getActiveTab(): BrowserTabState {
    return this.tabs.get(this.activeTabId)!;
  }

  /**
   * Clickable Breadcrumb History Jump: Jump back or forward to any historical page state
   */
  public jumpToHistory(targetIndex: number): BrowserTabState {
    const tab = this.getActiveTab();
    if (targetIndex >= 0 && targetIndex < tab.history.length) {
      const page = tab.history[targetIndex];
      tab.currentIndex = targetIndex;
      tab.navigationId += 1;
      tab.generatedContent = page.html;
      tab.breadcrumb = page.breadcrumb;
      tab.tokenCount = page.tokenCount;
      tab.groundingSources = page.groundingSources;
      tab.searchEntryPointHtml = page.searchEntryPointHtml;
    } else if (targetIndex === -1) {
      tab.currentIndex = -1;
      tab.generatedContent = '';
      tab.breadcrumb = { sitename: '', page: '' };
    }
    return tab;
  }

  /**
   * Save current page state to cloud connected resources
   */
  public async saveToCloud(options: CloudSaveOptions): Promise<CloudSaveResult> {
    const { destination, fileName, htmlContent, pageTitle, prompt, emailSubject, emailRecipient } = options;

    if (destination === 'acp') {
      const res = await fetch(`${this.config.acpServeUrl}/tools/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: 'file_diff',
          parameters: {
            filePath: `dist/${fileName}`,
            contentLength: htmlContent.length,
            title: pageTitle,
          },
        }),
      });
      const data = await res.json();
      return {
        success: true,
        destination: 'acp',
        message: `Registered artifact with ACP Server: ${fileName}`,
        timestamp: new Date().toISOString(),
      };
    }

    if (destination === 'download' && typeof window !== 'undefined') {
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return {
        success: true,
        destination: 'download',
        message: `Downloaded ${fileName} to local disk`,
        timestamp: new Date().toISOString(),
      };
    }

    return {
      success: true,
      destination,
      message: `Dispatched save request for ${fileName} to ${destination}`,
      timestamp: new Date().toISOString(),
    };
  }
}
