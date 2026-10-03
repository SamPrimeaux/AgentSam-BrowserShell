import React, { useState, useEffect } from 'react';
import { AcpService } from '../../services/acpService';
import { AuthStatusResponse } from '../../backend/agentsam/acp/types';

export const AcpServerWorkspace: React.FC = () => {
  const [authStatus, setAuthStatus] = useState<AuthStatusResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [saInput, setSaInput] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'providers' | 'env' | 'rpc'>('providers');
  const [rpcResult, setRpcResult] = useState<any>(null);

  const refreshStatus = async () => {
    setLoading(true);
    const status = await AcpService.getAuthStatus();
    setAuthStatus(status);
    setLoading(false);
  };

  useEffect(() => {
    refreshStatus();
  }, []);

  const handleGitHubLogin = async () => {
    setError(null);
    setSuccessMsg(null);
    setLoading(true);
    const res = await AcpService.loginWithGitHub();
    setLoading(false);
    if (res.success) {
      setSuccessMsg(`Signed in with GitHub as ${res.user?.name || 'Operator'}`);
      refreshStatus();
    } else {
      setError(res.error || 'GitHub login failed');
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setSuccessMsg(null);
    setLoading(true);
    const res = await AcpService.loginWithGoogle();
    setLoading(false);
    if (res.success) {
      setSuccessMsg(`Signed in with Google as ${res.user?.name || 'Operator'}`);
      refreshStatus();
    } else {
      setError(res.error || 'Google login failed');
    }
  };

  const handleServiceAccountLogin = async () => {
    if (!saInput.trim()) {
      setError('Please paste a valid Service Account JSON object.');
      return;
    }
    setError(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      const parsed = JSON.parse(saInput);
      const res = await AcpService.loginWithServiceAccount(parsed);
      setLoading(false);
      if (res.success) {
        setSuccessMsg(`Service Account authenticated: ${res.user?.email || 'Active'}`);
        setSaInput('');
        refreshStatus();
      } else {
        setError(res.error || 'Service Account auth failed');
      }
    } catch (e: any) {
      setLoading(false);
      setError(`Invalid JSON format: ${e.message}`);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    await AcpService.logout();
    setLoading(false);
    setSuccessMsg('Signed out of ACP Server.');
    refreshStatus();
  };

  const testRpcPing = async () => {
    setLoading(true);
    const res = await AcpService.rpcCall('agentsam/status', {});
    setRpcResult(res);
    setLoading(false);
  };

  const testRpcSessionCreate = async () => {
    setLoading(true);
    const res = await AcpService.rpcCall('agentsam/session/create', {
      task: 'Verify ACP JSON-RPC 2.0 runtime channel connection',
      targetUrl: 'https://github.com',
    });
    setRpcResult(res);
    setLoading(false);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0d1117] text-gray-200 overflow-hidden">
      {/* Top Header */}
      <header className="h-14 border-b border-[#21262d] bg-[#161b22] px-6 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <span className="material-symbols-outlined text-lg">terminal</span>
          </div>
          <div>
            <h1 className="text-sm font-semibold text-white flex items-center gap-2">
              Agent Client Protocol (ACP) Server
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                JSON-RPC 2.0
              </span>
            </h1>
            <p className="text-[11px] text-gray-400">
              Live HTTP & SSE server running on <code className="text-emerald-400">/api/agentsam/acp</code>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={refreshStatus}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-xs text-gray-300 hover:text-white flex items-center gap-1.5 transition-colors"
          >
            <span className="material-symbols-outlined text-sm">refresh</span>
            <span>Refresh Status</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Area */}
      <div className="flex-1 overflow-y-auto p-6 max-w-5xl w-full mx-auto space-y-6">
        {/* Active Auth Summary Banner */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${
              authStatus?.authenticated
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                : 'bg-amber-500/10 border-amber-500/40 text-amber-400'
            }`}>
              <span className="material-symbols-outlined text-2xl">
                {authStatus?.authenticated ? 'verified_user' : 'lock_open'}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-white">
                  {authStatus?.authenticated ? `Authenticated: ${authStatus.user?.name || authStatus.user?.email}` : 'ACP Unauthenticated'}
                </h3>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                  authStatus?.authenticated
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                    : 'bg-amber-950 text-amber-300 border-amber-800'
                }`}>
                  {authStatus?.provider ? `Provider: ${authStatus.provider.toUpperCase()}` : 'Anonymous Mode'}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                {authStatus?.authenticated
                  ? `Authenticated session running with scope: ${authStatus.user?.role || 'operator'}`
                  : 'Connect GitHub, Google, or Service Account to grant full execution capabilities.'}
              </p>
            </div>
          </div>

          {authStatus?.authenticated && (
            <button
              onClick={handleLogout}
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-red-950/60 border border-red-800 hover:bg-red-900 text-red-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">logout</span>
              <span>Disconnect</span>
            </button>
          )}
        </div>

        {/* Notifications */}
        {error && (
          <div className="p-3.5 bg-red-950/40 border border-red-800 rounded-xl text-xs text-red-300 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">error</span>
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="p-3.5 bg-emerald-950/40 border border-emerald-800 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">check_circle</span>
            <span>{successMsg}</span>
          </div>
        )}

        {/* Workspace Tab Strip */}
        <div className="flex gap-2 border-b border-[#21262d] pb-2">
          <button
            onClick={() => setActiveTab('providers')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors ${
              activeTab === 'providers'
                ? 'bg-emerald-600 text-white'
                : 'bg-[#161b22] text-gray-400 hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-sm">vpn_key</span>
            <span>OAuth & Providers</span>
          </button>

          <button
            onClick={() => setActiveTab('env')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors ${
              activeTab === 'env'
                ? 'bg-emerald-600 text-white'
                : 'bg-[#161b22] text-gray-400 hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-sm">tune</span>
            <span>Environment Checklist</span>
          </button>

          <button
            onClick={() => setActiveTab('rpc')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors ${
              activeTab === 'rpc'
                ? 'bg-emerald-600 text-white'
                : 'bg-[#161b22] text-gray-400 hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-sm">api</span>
            <span>JSON-RPC 2.0 Playground</span>
          </button>
        </div>

        {/* Tab 1: Providers */}
        {activeTab === 'providers' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* GitHub OAuth Card */}
            <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-md">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-white font-semibold text-sm">
                  <span className="material-symbols-outlined text-purple-400">code</span>
                  <span>GitHub OAuth / GitHub App</span>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Authenticate with GitHub client credentials or App ID to grant repo management and CI/CD access to AgentSam.
                </p>
              </div>
              <button
                onClick={handleGitHubLogin}
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow transition-colors"
              >
                <span className="material-symbols-outlined text-sm">login</span>
                <span>Sign in with GitHub</span>
              </button>
            </div>

            {/* Google OAuth Card */}
            <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-md">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-white font-semibold text-sm">
                  <span className="material-symbols-outlined text-red-400">account_circle</span>
                  <span>Google Cloud OAuth</span>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Authenticate with Google Client ID / Secret to manage GCP services, Vertex AI, and Workspace pipelines.
                </p>
              </div>
              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow transition-colors"
              >
                <span className="material-symbols-outlined text-sm">login</span>
                <span>Sign in with Google Cloud</span>
              </button>
            </div>

            {/* Service Account Full Width Card */}
            <div className="md:col-span-2 bg-[#161b22] border border-[#30363d] rounded-2xl p-5 space-y-3 shadow-md">
              <div className="flex items-center gap-2 text-white font-semibold text-sm">
                <span className="material-symbols-outlined text-emerald-400">key</span>
                <span>Google Service Account JSON</span>
              </div>
              <p className="text-xs text-gray-400">
                Paste your <code className="text-emerald-300">GOOGLE_SERVICE_ACCOUNT_JSON</code> payload below for direct machine-to-machine authentication.
              </p>
              <textarea
                placeholder='{"type": "service_account", "project_id": "...", "private_key_id": "...", ...}'
                value={saInput}
                onChange={(e) => setSaInput(e.target.value)}
                rows={4}
                className="w-full p-3 bg-[#0d1117] border border-[#30363d] rounded-xl text-xs font-mono text-emerald-300 placeholder-gray-600 focus:outline-none focus:border-emerald-400 resize-none"
              />
              <button
                onClick={handleServiceAccountLogin}
                disabled={loading || !saInput.trim()}
                className="py-2.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 transition-colors shadow"
              >
                <span className="material-symbols-outlined text-sm">lock_person</span>
                <span>Load Service Account Key</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Environment Checklist */}
        {activeTab === 'env' && (
          <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6 space-y-4 shadow-md">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-400">checklist</span>
              <span>Backend Environment Credentials Status</span>
            </h3>
            <p className="text-xs text-gray-400">
              The following variables are read by <code className="text-emerald-300">backend/agentsam/acp/auth.ts</code>.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {authStatus?.configuredEnvs &&
                Object.entries(authStatus.configuredEnvs).map(([envVar, isSet]) => (
                  <div
                    key={envVar}
                    className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                      isSet
                        ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300'
                        : 'bg-[#0d1117] border-[#30363d] text-gray-400'
                    }`}
                  >
                    <span className="font-mono font-semibold">{envVar}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      isSet ? 'bg-emerald-900/80 text-emerald-200' : 'bg-gray-800 text-gray-500'
                    }`}>
                      {isSet ? 'CONFIGURED' : 'NOT SET'}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Tab 3: JSON-RPC Playground */}
        {activeTab === 'rpc' && (
          <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6 space-y-4 shadow-md">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-400">terminal</span>
              <span>Direct JSON-RPC 2.0 Execution Probe</span>
            </h3>
            <div className="flex gap-2">
              <button
                onClick={testRpcPing}
                disabled={loading}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
              >
                Ping agentsam/status
              </button>
              <button
                onClick={testRpcSessionCreate}
                disabled={loading}
                className="px-4 py-2 rounded-xl bg-[#21262d] hover:bg-[#30363d] text-gray-200 text-xs font-semibold"
              >
                Invoke agentsam/session/create
              </button>
            </div>

            {rpcResult && (
              <pre className="p-4 bg-[#0d1117] border border-[#30363d] rounded-xl text-xs font-mono text-emerald-300 overflow-x-auto">
                {JSON.stringify(rpcResult, null, 2)}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
