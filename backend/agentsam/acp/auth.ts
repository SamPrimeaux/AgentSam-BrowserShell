import { Request, Response, Router } from 'express';
import { AuthStatusResponse } from './types';

// In-memory session store for active sessions
interface UserSession {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  provider: 'github' | 'google' | 'service_account';
  accessToken: string;
  refreshToken?: string;
  createdAt: number;
  scopes?: string[];
  roles?: string[];
}

const activeSessions = new Map<string, UserSession>();

/**
 * Determine the base application URL for OAuth redirects
 */
export function getAppUrl(req: Request): string {
  if (process.env.APP_URL && process.env.APP_URL.trim() !== '') {
    return process.env.APP_URL.replace(/\/+$/, '');
  }
  const host = req.get('host') || 'localhost:3000';
  const proto = req.get('x-forwarded-proto') || req.protocol || 'http';
  return `${proto}://${host}`;
}

/**
 * Helper to get the redirect URI for GitHub OAuth
 */
export function getGitHubRedirectUri(req: Request): string {
  const base = getAppUrl(req);
  return `${base}/auth/github/callback`;
}

/**
 * Helper to get the redirect URI for Google OAuth
 */
export function getGoogleRedirectUri(req: Request): string {
  const base = getAppUrl(req);
  return `${base}/auth/google/callback`;
}

/**
 * Get active user session from request cookie or Authorization header
 */
export function getUserSession(req: Request): UserSession | null {
  const sessionId = req.cookies?.agentsam_session || 
    (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null);

  if (sessionId && activeSessions.has(sessionId)) {
    return activeSessions.get(sessionId)!;
  }
  return null;
}

/**
 * Build the system auth status report
 */
export function buildAuthStatus(req: Request): AuthStatusResponse {
  const session = getUserSession(req);

  const hasGithubClientId = Boolean(process.env.GITHUB_CLIENT_ID || process.env.GITHUB_APP_CLIENT_ID);
  const hasGithubClientSecret = Boolean(process.env.GITHUB_CLIENT_SECRET || process.env.GITHUB_APP_CLIENT_SECRET);
  const hasGithubAppId = Boolean(process.env.GITHUB_APP_ID);

  const hasGoogleClientId = Boolean(process.env.GOOGLE_CLIENT_ID);
  const hasGoogleClientSecret = Boolean(process.env.GOOGLE_CLIENT_SECRET);
  const hasGoogleProjectId = Boolean(process.env.GOOGLE_PROJECT_ID);
  const hasGoogleAiApiKey = Boolean(process.env.GOOGLE_AI_API_KEY);
  const hasGoogleServiceAccount = Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  const hasGeminiApiKey = Boolean(process.env.GEMINI_API_KEY);

  let serviceAccountValid = false;
  if (hasGoogleServiceAccount) {
    try {
      const sa = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON || '{}');
      serviceAccountValid = Boolean(sa.client_email && sa.private_key);
    } catch {
      serviceAccountValid = false;
    }
  }

  return {
    authenticated: Boolean(session),
    user: session ? {
      id: session.id,
      name: session.name,
      email: session.email,
      avatarUrl: session.avatarUrl,
      provider: session.provider,
      roles: session.roles || ['agent_developer', 'acp_operator'],
    } : null,
    providers: {
      github: {
        configured: (hasGithubClientId && hasGithubClientSecret) || (hasGithubAppId && Boolean(process.env.GITHUB_APP_CLIENT_ID)),
        clientIdConfigured: Boolean(process.env.GITHUB_CLIENT_ID),
        clientSecretConfigured: Boolean(process.env.GITHUB_CLIENT_SECRET),
        appIdConfigured: hasGithubAppId,
        appClientIdConfigured: Boolean(process.env.GITHUB_APP_CLIENT_ID),
        appClientSecretConfigured: Boolean(process.env.GITHUB_APP_CLIENT_SECRET),
        connected: session?.provider === 'github',
        username: session?.provider === 'github' ? session.name : undefined,
        scopes: session?.provider === 'github' ? session.scopes : undefined,
      },
      google: {
        configured: (hasGoogleClientId && hasGoogleClientSecret) || serviceAccountValid || hasGoogleAiApiKey,
        clientIdConfigured: hasGoogleClientId,
        clientSecretConfigured: hasGoogleClientSecret,
        projectIdConfigured: hasGoogleProjectId,
        aiApiKeyConfigured: hasGoogleAiApiKey || hasGeminiApiKey,
        serviceAccountConfigured: serviceAccountValid,
        connected: session?.provider === 'google' || session?.provider === 'service_account',
        email: (session?.provider === 'google' || session?.provider === 'service_account') ? session.email : undefined,
        scopes: session?.provider === 'google' ? session.scopes : undefined,
      },
    },
    envStatus: {
      GITHUB_CLIENT_ID: Boolean(process.env.GITHUB_CLIENT_ID),
      GITHUB_CLIENT_SECRET: Boolean(process.env.GITHUB_CLIENT_SECRET),
      GITHUB_APP_ID: Boolean(process.env.GITHUB_APP_ID),
      GITHUB_APP_CLIENT_ID: Boolean(process.env.GITHUB_APP_CLIENT_ID),
      GITHUB_APP_CLIENT_SECRET: Boolean(process.env.GITHUB_APP_CLIENT_SECRET),
      GOOGLE_CLIENT_ID: Boolean(process.env.GOOGLE_CLIENT_ID),
      GOOGLE_CLIENT_SECRET: Boolean(process.env.GOOGLE_CLIENT_SECRET),
      GOOGLE_PROJECT_ID: Boolean(process.env.GOOGLE_PROJECT_ID),
      GOOGLE_AI_API_KEY: Boolean(process.env.GOOGLE_AI_API_KEY),
      GOOGLE_SERVICE_ACCOUNT_JSON: serviceAccountValid,
      GEMINI_API_KEY: Boolean(process.env.GEMINI_API_KEY),
    },
  };
}

/**
 * Generate postMessage callback HTML for AI Studio popup OAuth completion
 */
function renderOAuthSuccessHtml(provider: string, user: { name: string; email?: string }): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Authentication Successful</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #0d1117;
      color: #c9d1d9;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
      text-align: center;
    }
    .card {
      background: #161b22;
      border: 1px solid #30363d;
      border-radius: 12px;
      padding: 32px 40px;
      max-width: 420px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.4);
    }
    .check {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: #238636;
      color: white;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      margin-bottom: 16px;
    }
    h2 { margin: 0 0 8px 0; color: #58a6ff; font-size: 20px; }
    p { margin: 0 0 16px 0; color: #8b949e; font-size: 14px; line-height: 1.5; }
    .badge {
      display: inline-block;
      background: #21262d;
      border: 1px solid #30363d;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 13px;
      color: #7ee787;
      font-family: monospace;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="check">✓</div>
    <h2>Authenticated with ${provider}</h2>
    <p>Signed in as <strong>${user.name}</strong>${user.email ? ` (${user.email})` : ''}.</p>
    <div class="badge">AgentSam ACP Ready</div>
  </div>
  <script>
    if (window.opener) {
      window.opener.postMessage({
        type: 'OAUTH_AUTH_SUCCESS',
        provider: '${provider}',
        userName: '${user.name}'
      }, '*');
      setTimeout(() => {
        window.close();
      }, 750);
    } else {
      setTimeout(() => {
        window.location.href = '/';
      }, 1500);
    }
  </script>
</body>
</html>`;
}

function renderOAuthErrorHtml(provider: string, errorMessage: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Authentication Error</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #0d1117;
      color: #c9d1d9;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
      text-align: center;
    }
    .card {
      background: #161b22;
      border: 1px solid #f85149;
      border-radius: 12px;
      padding: 32px;
      max-width: 420px;
    }
    h2 { margin: 0 0 8px 0; color: #f85149; }
    p { margin: 0 0 16px 0; color: #8b949e; font-size: 14px; }
  </style>
</head>
<body>
  <div class="card">
    <h2>${provider} Authentication Failed</h2>
    <p>${errorMessage}</p>
  </div>
  <script>
    if (window.opener) {
      window.opener.postMessage({
        type: 'OAUTH_AUTH_ERROR',
        provider: '${provider}',
        error: '${errorMessage.replace(/'/g, "\\'")}'
      }, '*');
      setTimeout(() => { window.close(); }, 3000);
    }
  </script>
</body>
</html>`;
}

export function createAuthRouter(): Router {
  const router = Router();

  // 1. Auth Status endpoint
  router.get('/status', (req: Request, res: Response) => {
    res.json(buildAuthStatus(req));
  });

  // 2. GitHub OAuth URL construction endpoint
  router.get('/github/url', (req: Request, res: Response) => {
    const clientId = process.env.GITHUB_CLIENT_ID || process.env.GITHUB_APP_CLIENT_ID;
    if (!clientId) {
      return res.status(400).json({
        error: 'Missing GITHUB_CLIENT_ID or GITHUB_APP_CLIENT_ID in environment variables.',
        instructions: 'Please provide GITHUB_CLIENT_ID in the AI Studio Settings menu.',
      });
    }

    const redirectUri = getGitHubRedirectUri(req);
    const scope = 'read:user user:email repo read:org';
    const state = Math.random().toString(36).substring(2, 15);

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope,
      state,
      allow_signup: 'true',
    });

    const url = `https://github.com/login/oauth/authorize?${params.toString()}`;
    res.json({ url, redirectUri, provider: 'github' });
  });

  // 3. Google OAuth URL construction endpoint
  router.get('/google/url', (req: Request, res: Response) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      return res.status(400).json({
        error: 'Missing GOOGLE_CLIENT_ID in environment variables.',
        instructions: 'Please provide GOOGLE_CLIENT_ID in the AI Studio Settings menu.',
      });
    }

    const redirectUri = getGoogleRedirectUri(req);
    const scope = 'openid profile email https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/cloud-platform.read-only';
    const state = Math.random().toString(36).substring(2, 15);

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope,
      state,
      access_type: 'offline',
      prompt: 'consent',
    });

    const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    res.json({ url, redirectUri, provider: 'google' });
  });

  // 4. GitHub OAuth Callback (API code exchange)
  router.post('/github/token', async (req: Request, res: Response) => {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ error: 'Authorization code is required' });
    }

    const clientId = process.env.GITHUB_CLIENT_ID || process.env.GITHUB_APP_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET || process.env.GITHUB_APP_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return res.status(400).json({ error: 'GitHub credentials (CLIENT_ID / CLIENT_SECRET) not configured' });
    }

    try {
      // Exchange code for token
      const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code,
        }),
      });

      const tokenData = await tokenRes.json();
      if (tokenData.error) {
        return res.status(400).json({ error: tokenData.error_description || tokenData.error });
      }

      const accessToken = tokenData.access_token;
      const scopes = (tokenData.scope || '').split(',').map((s: string) => s.trim());

      // Fetch GitHub User profile
      const userRes = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'User-Agent': 'AgentSam-ACP-Serve/1.0',
        },
      });

      const userData = await userRes.json();

      // Create session
      const sessionId = 'gh_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
      const userSession: UserSession = {
        id: sessionId,
        name: userData.name || userData.login,
        email: userData.email,
        avatarUrl: userData.avatar_url,
        provider: 'github',
        accessToken,
        createdAt: Date.now(),
        scopes,
        roles: ['github_contributor', 'agent_developer'],
      };

      activeSessions.set(sessionId, userSession);

      // Set cookie
      res.cookie('agentsam_session', sessionId, {
        secure: true,
        sameSite: 'none',
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.json({
        success: true,
        sessionId,
        user: {
          name: userSession.name,
          email: userSession.email,
          avatarUrl: userSession.avatarUrl,
          provider: 'github',
        },
      });
    } catch (err: any) {
      console.error('GitHub token exchange error:', err);
      res.status(500).json({ error: err.message || 'Failed to exchange token with GitHub' });
    }
  });

  // 5. Google OAuth Callback (API code exchange)
  router.post('/google/token', async (req: Request, res: Response) => {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ error: 'Authorization code is required' });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return res.status(400).json({ error: 'Google OAuth credentials (CLIENT_ID / CLIENT_SECRET) not configured' });
    }

    try {
      const redirectUri = getGoogleRedirectUri(req);

      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });

      const tokenData = await tokenRes.json();
      if (tokenData.error) {
        return res.status(400).json({ error: tokenData.error_description || tokenData.error });
      }

      const accessToken = tokenData.access_token;
      const refreshToken = tokenData.refresh_token;

      // Fetch Google User profile
      const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const userData = await userRes.json();

      const sessionId = 'goog_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
      const userSession: UserSession = {
        id: sessionId,
        name: userData.name || userData.email,
        email: userData.email,
        avatarUrl: userData.picture,
        provider: 'google',
        accessToken,
        refreshToken,
        createdAt: Date.now(),
        scopes: (tokenData.scope || '').split(' '),
        roles: ['gcp_architect', 'agent_developer'],
      };

      activeSessions.set(sessionId, userSession);

      res.cookie('agentsam_session', sessionId, {
        secure: true,
        sameSite: 'none',
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.json({
        success: true,
        sessionId,
        user: {
          name: userSession.name,
          email: userSession.email,
          avatarUrl: userSession.avatarUrl,
          provider: 'google',
        },
      });
    } catch (err: any) {
      console.error('Google token exchange error:', err);
      res.status(500).json({ error: err.message || 'Failed to exchange token with Google' });
    }
  });

  // 6. Direct Service Account login / verification endpoint
  router.post('/google/service-account', (req: Request, res: Response) => {
    const { serviceAccountJson } = req.body;
    const rawJson = serviceAccountJson || process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

    if (!rawJson) {
      return res.status(400).json({ error: 'No service account JSON provided or found in GOOGLE_SERVICE_ACCOUNT_JSON' });
    }

    try {
      const sa = typeof rawJson === 'string' ? JSON.parse(rawJson) : rawJson;
      if (!sa.client_email || !sa.private_key) {
        return res.status(400).json({ error: 'Invalid service account JSON: missing client_email or private_key' });
      }

      const sessionId = 'sa_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
      const userSession: UserSession = {
        id: sessionId,
        name: sa.client_email.split('@')[0],
        email: sa.client_email,
        provider: 'service_account',
        accessToken: 'service_account_verified',
        createdAt: Date.now(),
        roles: ['gcp_service_agent', 'acp_superadmin'],
      };

      activeSessions.set(sessionId, userSession);

      res.cookie('agentsam_session', sessionId, {
        secure: true,
        sameSite: 'none',
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.json({
        success: true,
        sessionId,
        user: {
          name: userSession.name,
          email: userSession.email,
          provider: 'service_account',
          projectId: sa.project_id || process.env.GOOGLE_PROJECT_ID,
        },
      });
    } catch (err: any) {
      res.status(400).json({ error: `Failed to parse service account JSON: ${err.message}` });
    }
  });

  // 7. Logout endpoint
  router.post('/logout', (req: Request, res: Response) => {
    const sessionId = req.cookies?.agentsam_session;
    if (sessionId) {
      activeSessions.delete(sessionId);
    }
    res.clearCookie('agentsam_session', {
      secure: true,
      sameSite: 'none',
      httpOnly: true,
    });
    res.json({ success: true, message: 'Logged out successfully' });
  });

  return router;
}

/**
 * Handle browser popup callback routes for GitHub
 */
export async function handleGitHubCallbackRoute(req: Request, res: Response) {
  const { code, error, error_description } = req.query;

  if (error) {
    return res.send(renderOAuthErrorHtml('GitHub', String(error_description || error)));
  }

  if (!code) {
    return res.send(renderOAuthErrorHtml('GitHub', 'No authorization code received'));
  }

  const clientId = process.env.GITHUB_CLIENT_ID || process.env.GITHUB_APP_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET || process.env.GITHUB_APP_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return res.send(renderOAuthErrorHtml('GitHub', 'GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET not set in environment'));
  }

  try {
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code: String(code),
      }),
    });

    const tokenData = await tokenRes.json();
    if (tokenData.error) {
      return res.send(renderOAuthErrorHtml('GitHub', tokenData.error_description || tokenData.error));
    }

    const accessToken = tokenData.access_token;
    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'User-Agent': 'AgentSam-ACP-Serve/1.0',
      },
    });

    const userData = await userRes.json();
    const sessionId = 'gh_' + Math.random().toString(36).substring(2) + Date.now().toString(36);

    const userSession: UserSession = {
      id: sessionId,
      name: userData.name || userData.login,
      email: userData.email,
      avatarUrl: userData.avatar_url,
      provider: 'github',
      accessToken,
      createdAt: Date.now(),
      scopes: (tokenData.scope || '').split(','),
      roles: ['github_contributor', 'agent_developer'],
    };

    activeSessions.set(sessionId, userSession);

    res.cookie('agentsam_session', sessionId, {
      secure: true,
      sameSite: 'none',
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.send(renderOAuthSuccessHtml('GitHub', { name: userSession.name, email: userSession.email }));
  } catch (err: any) {
    res.send(renderOAuthErrorHtml('GitHub', err.message || 'Token exchange failed'));
  }
}

/**
 * Handle browser popup callback routes for Google
 */
export async function handleGoogleCallbackRoute(req: Request, res: Response) {
  const { code, error } = req.query;

  if (error) {
    return res.send(renderOAuthErrorHtml('Google', String(error)));
  }

  if (!code) {
    return res.send(renderOAuthErrorHtml('Google', 'No authorization code received'));
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return res.send(renderOAuthErrorHtml('Google', 'GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not set in environment'));
  }

  try {
    const redirectUri = getGoogleRedirectUri(req);

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: String(code),
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenRes.json();
    if (tokenData.error) {
      return res.send(renderOAuthErrorHtml('Google', tokenData.error_description || tokenData.error));
    }

    const accessToken = tokenData.access_token;
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const userData = await userRes.json();

    const sessionId = 'goog_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
    const userSession: UserSession = {
      id: sessionId,
      name: userData.name || userData.email,
      email: userData.email,
      avatarUrl: userData.picture,
      provider: 'google',
      accessToken,
      refreshToken: tokenData.refresh_token,
      createdAt: Date.now(),
      scopes: (tokenData.scope || '').split(' '),
      roles: ['gcp_architect', 'agent_developer'],
    };

    activeSessions.set(sessionId, userSession);

    res.cookie('agentsam_session', sessionId, {
      secure: true,
      sameSite: 'none',
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.send(renderOAuthSuccessHtml('Google', { name: userSession.name, email: userSession.email }));
  } catch (err: any) {
    res.send(renderOAuthErrorHtml('Google', err.message || 'Token exchange failed'));
  }
}
