import { AuthStatusResponse, AcpSession, AcpRpcResponse } from '../backend/agentsam/acp/types';

export class AcpService {
  /**
   * Fetch ACP server health and manifest
   */
  static async getServeManifest(): Promise<any> {
    try {
      const res = await fetch('/api/agentsam/acp/serve');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn('Could not reach ACP Serve:', err);
      return null;
    }
  }

  /**
   * Fetch current Auth status for GitHub, Google, Service Account, and Gemini
   */
  static async getAuthStatus(): Promise<AuthStatusResponse | null> {
    try {
      const res = await fetch('/api/auth/status');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn('Failed to fetch auth status:', err);
      return null;
    }
  }

  /**
   * Start popup-based GitHub OAuth login flow
   */
  static async loginWithGitHub(): Promise<{ success: boolean; user?: any; error?: string }> {
    try {
      // 1. Fetch authorization URL
      const urlRes = await fetch('/api/auth/github/url');
      if (!urlRes.ok) {
        const errorData = await urlRes.json().catch(() => ({}));
        throw new Error(errorData.error || 'GITHUB_CLIENT_ID not configured on server.');
      }

      const { url } = await urlRes.json();

      // 2. Open provider popup directly
      const authWindow = window.open(
        url,
        'github_oauth_popup',
        'width=600,height=750,menubar=no,toolbar=no,status=no'
      );

      if (!authWindow) {
        throw new Error('Popup blocked! Please allow popups for this site to sign in with GitHub.');
      }

      // 3. Await postMessage from callback
      return new Promise((resolve) => {
        const messageHandler = (event: MessageEvent) => {
          if (event.data?.type === 'OAUTH_AUTH_SUCCESS' && event.data.provider === 'GitHub') {
            window.removeEventListener('message', messageHandler);
            resolve({ success: true, user: { name: event.data.userName, provider: 'github' } });
          } else if (event.data?.type === 'OAUTH_AUTH_ERROR') {
            window.removeEventListener('message', messageHandler);
            resolve({ success: false, error: event.data.error || 'GitHub login failed' });
          }
        };

        window.addEventListener('message', messageHandler);

        // Fallback timeout after 3 minutes
        setTimeout(() => {
          window.removeEventListener('message', messageHandler);
          resolve({ success: false, error: 'GitHub login timed out' });
        }, 180000);
      });
    } catch (err: any) {
      return { success: false, error: err.message || 'GitHub OAuth failed' };
    }
  }

  /**
   * Start popup-based Google OAuth login flow
   */
  static async loginWithGoogle(): Promise<{ success: boolean; user?: any; error?: string }> {
    try {
      // 1. Fetch authorization URL
      const urlRes = await fetch('/api/auth/google/url');
      if (!urlRes.ok) {
        const errorData = await urlRes.json().catch(() => ({}));
        throw new Error(errorData.error || 'GOOGLE_CLIENT_ID not configured on server.');
      }

      const { url } = await urlRes.json();

      // 2. Open provider popup directly
      const authWindow = window.open(
        url,
        'google_oauth_popup',
        'width=600,height=750,menubar=no,toolbar=no,status=no'
      );

      if (!authWindow) {
        throw new Error('Popup blocked! Please allow popups for this site to sign in with Google.');
      }

      // 3. Await postMessage from callback
      return new Promise((resolve) => {
        const messageHandler = (event: MessageEvent) => {
          if (event.data?.type === 'OAUTH_AUTH_SUCCESS' && event.data.provider === 'Google') {
            window.removeEventListener('message', messageHandler);
            resolve({ success: true, user: { name: event.data.userName, provider: 'google' } });
          } else if (event.data?.type === 'OAUTH_AUTH_ERROR') {
            window.removeEventListener('message', messageHandler);
            resolve({ success: false, error: event.data.error || 'Google login failed' });
          }
        };

        window.addEventListener('message', messageHandler);

        // Fallback timeout
        setTimeout(() => {
          window.removeEventListener('message', messageHandler);
          resolve({ success: false, error: 'Google login timed out' });
        }, 180000);
      });
    } catch (err: any) {
      return { success: false, error: err.message || 'Google OAuth failed' };
    }
  }

  /**
   * Direct verify / login using Google Service Account JSON
   */
  static async loginWithServiceAccount(jsonString: string): Promise<{ success: boolean; user?: any; error?: string }> {
    try {
      const res = await fetch('/api/auth/google/service-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceAccountJson: jsonString }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to verify Service Account');
      }

      return { success: true, user: data.user };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Log out active session
   */
  static async logout(): Promise<void> {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.warn('Logout request failed:', err);
    }
  }

  /**
   * Send an ACP JSON-RPC 2.0 command
   */
  static async callRpc<T = any>(method: string, params: Record<string, any> = {}): Promise<AcpRpcResponse<T>> {
    const payload = {
      jsonrpc: '2.0',
      id: 'req_' + Math.random().toString(36).substring(2, 9),
      method,
      params,
    };

    const res = await fetch('/api/agentsam/acp/rpc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    return await res.json();
  }

  /**
   * Execute an ACP Tool (terminal, ast_audit, file_diff, network_probe)
   */
  static async executeTool(tool: string, parameters: Record<string, any>): Promise<any> {
    const res = await fetch('/api/agentsam/acp/tools/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool, parameters }),
    });
    return await res.json();
  }

  /**
   * Compile natural language / speech input into verified TaskContract with Literal Span Preservation
   */
  static async compileContract(params: {
    prompt: string;
    backend?: string;
    inputMode?: 'voice' | 'text' | 'preset';
    targetRepo?: string;
  }): Promise<any> {
    try {
      const res = await fetch('/api/agentsam/acp/contract/compile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err: any) {
      console.warn('Fallback: Compiling contract locally', err);
      // Local fallback handled by frontend
      throw err;
    }
  }

  /**
   * Run Goal-Oriented Action Planning (GOAP) on a TaskContract
   */
  static async planGoap(contract: any): Promise<any> {
    try {
      const res = await fetch('/api/agentsam/acp/goap/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contract }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err: any) {
      console.warn('Failed to plan GOAP:', err);
      throw err;
    }
  }

  /**
   * Execute GOAP plan deterministically
   */
  static async executeGoap(plan: any, contract: any, stepDelayMs = 250): Promise<any> {
    const res = await fetch('/api/agentsam/acp/goap/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan, contract, stepDelayMs }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  }
}
