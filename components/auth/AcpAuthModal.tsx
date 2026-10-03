import React, { useState, useEffect } from 'react';
import { AcpService } from '../../services/acpService';
import { AuthStatusResponse } from '../../backend/agentsam/acp/types';

interface AcpAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthChange?: () => void;
}

export const AcpAuthModal: React.FC<AcpAuthModalProps> = ({ isOpen, onClose, onAuthChange }) => {
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
    if (isOpen) {
      refreshStatus();
      setError(null);
      setSuccessMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleGitHubLogin = async () => {
    setError(null);
    setSuccessMsg(null);
    setLoading(true);
    const res = await AcpService.loginWithGitHub();
    setLoading(false);
    if (res.success) {
      setSuccessMsg(`Signed in with GitHub as ${res.user?.name || 'Operator'}`);
      refreshStatus();
      if (onAuthChange) onAuthChange();
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
      if (onAuthChange) onAuthChange();
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
    const res = await AcpService.loginWithServiceAccount(saInput);
    setLoading(false);
    if (res.success) {
      setSuccessMsg(`Verified Service Account (${res.user?.email})`);
      setSaInput('');
      refreshStatus();
      if (onAuthChange) onAuthChange();
    } else {
      setError(res.error || 'Invalid Service Account JSON');
    }
  };

  const handleLogout = async () => {
    await AcpService.logout();
    setSuccessMsg('Logged out successfully');
    refreshStatus();
    if (onAuthChange) onAuthChange();
  };

  const handleTestRpc = async () => {
    setLoading(true);
    const res = await AcpService.callRpc('initialize');
    setRpcResult(res);
    setLoading(false);
  };

  const origin = window.location.origin;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="bg-[#12161f] border border-[#2a3447] rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a3447] bg-[#171d29]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-400">
              <span className="material-symbols-outlined text-lg">shield_person</span>
            </div>
            <div>
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                AgentSam ACP Serve & OAuth Manager
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-blue-900/60 text-blue-300 border border-blue-700/50">
                  Backend /serve
                </span>
              </h2>
              <p className="text-xs text-gray-400">
                Manage GitHub OAuth, GitHub App, Google OAuth, and Service Account authority
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-md hover:bg-gray-800 transition-colors"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-[#2a3447] bg-[#141924] px-6 gap-2">
          <button
            onClick={() => setActiveTab('providers')}
            className={`py-2.5 px-3 text-xs font-medium border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'providers'
                ? 'border-sky-400 text-sky-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <span className="material-symbols-outlined text-sm">login</span>
            <span>Authentication Providers</span>
          </button>

          <button
            onClick={() => setActiveTab('env')}
            className={`py-2.5 px-3 text-xs font-medium border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'env'
                ? 'border-sky-400 text-sky-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <span className="material-symbols-outlined text-sm">settings_ethernet</span>
            <span>Environment Checklist</span>
          </button>

          <button
            onClick={() => setActiveTab('rpc')}
            className={`py-2.5 px-3 text-xs font-medium border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'rpc'
                ? 'border-sky-400 text-sky-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <span className="material-symbols-outlined text-sm">terminal</span>
            <span>ACP RPC Protocol</span>
          </button>
        </div>

        {/* Notifications */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-950/50 border border-red-800/80 rounded-lg text-xs text-red-300 flex items-start gap-2">
            <span className="material-symbols-outlined text-sm text-red-400 mt-0.5">error</span>
            <div className="flex-1">{error}</div>
          </div>
        )}

        {successMsg && (
          <div className="mx-6 mt-4 p-3 bg-emerald-950/50 border border-emerald-800/80 rounded-lg text-xs text-emerald-300 flex items-start gap-2">
            <span className="material-symbols-outlined text-sm text-emerald-400 mt-0.5">check_circle</span>
            <div className="flex-1">{successMsg}</div>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: OAuth Providers */}
          {activeTab === 'providers' && (
            <div className="space-y-5">
              {/* Logged in state card */}
              {authStatus?.authenticated && authStatus.user && (
                <div className="bg-sky-950/30 border border-sky-800/50 rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-sky-600 flex items-center justify-center font-bold text-white uppercase text-sm">
                      {authStatus.user.name.charAt(0)}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white flex items-center gap-2">
                        {authStatus.user.name}
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-900/60 text-emerald-300 border border-emerald-700/50">
                          Active Session
                        </span>
                      </div>
                      <div className="text-xs text-gray-400">
                        {authStatus.user.email || `Provider: ${authStatus.user.provider}`}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="px-3 py-1.5 rounded text-xs bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 transition-colors"
                  >
                    Disconnect
                  </button>
                </div>
              )}

              {/* GitHub OAuth Box */}
              <div className="bg-[#171d29] border border-[#2a3447] rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded bg-gray-800 flex items-center justify-center text-white font-mono">
                      <span className="material-symbols-outlined text-lg">code</span>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white flex items-center gap-2">
                        GitHub OAuth & GitHub App
                        {authStatus?.providers.github.connected && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-900/60 text-emerald-300">
                            Connected
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400">
                        Uses <code>GITHUB_CLIENT_ID</code> or <code>GITHUB_APP_CLIENT_ID</code>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleGitHubLogin}
                    disabled={loading}
                    className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#24292e] hover:bg-[#2f363d] text-white border border-gray-600 flex items-center gap-2 transition-all shadow-sm"
                  >
                    <span className="material-symbols-outlined text-sm">login</span>
                    <span>Sign In with GitHub</span>
                  </button>
                </div>

                <div className="text-[11px] text-gray-400 bg-[#0f131a] p-2.5 rounded border border-[#222a3a]">
                  <div className="font-mono text-gray-300 mb-1">OAuth Callback URL:</div>
                  <code className="text-sky-300 select-all break-all">{origin}/auth/github/callback</code>
                </div>
              </div>

              {/* Google OAuth Box */}
              <div className="bg-[#171d29] border border-[#2a3447] rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded bg-blue-950/80 border border-blue-800 flex items-center justify-center text-blue-400">
                      <span className="material-symbols-outlined text-lg">account_circle</span>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white flex items-center gap-2">
                        Google OAuth 2.0
                        {authStatus?.providers.google.connected && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-900/60 text-emerald-300">
                            Connected
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400">
                        Uses <code>GOOGLE_CLIENT_ID</code> & <code>GOOGLE_CLIENT_SECRET</code>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-2 transition-all shadow-sm"
                  >
                    <span className="material-symbols-outlined text-sm">login</span>
                    <span>Sign In with Google</span>
                  </button>
                </div>

                <div className="text-[11px] text-gray-400 bg-[#0f131a] p-2.5 rounded border border-[#222a3a]">
                  <div className="font-mono text-gray-300 mb-1">OAuth Callback URL:</div>
                  <code className="text-sky-300 select-all break-all">{origin}/auth/google/callback</code>
                </div>
              </div>

              {/* Google Service Account JSON Verification */}
              <div className="bg-[#171d29] border border-[#2a3447] rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-400 text-base">key</span>
                  <span className="text-sm font-medium text-white">Google Service Account Authentication</span>
                </div>
                <p className="text-xs text-gray-400">
                  Verify or paste a <code>GOOGLE_SERVICE_ACCOUNT_JSON</code> key for sovereign GCP / Antigravity agent execution:
                </p>

                <textarea
                  value={saInput}
                  onChange={(e) => setSaInput(e.target.value)}
                  placeholder='{"type": "service_account", "project_id": "...", "private_key": "...", "client_email": "..."}'
                  className="w-full h-20 bg-[#0f131a] border border-[#2a3447] rounded-lg p-2.5 text-xs font-mono text-gray-200 focus:outline-none focus:border-sky-400 resize-none"
                />

                <div className="flex justify-end">
                  <button
                    onClick={handleServiceAccountLogin}
                    disabled={loading}
                    className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white flex items-center gap-1.5 transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">verified_user</span>
                    <span>Verify & Authenticate Key</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Environment Checklist */}
          {activeTab === 'env' && (
            <div className="space-y-4">
              <div className="text-xs text-gray-400">
                Status of all requested credentials in the AgentSam ACP serve runtime:
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {authStatus?.envStatus &&
                  Object.entries(authStatus.envStatus).map(([key, isSet]) => (
                    <div
                      key={key}
                      className={`p-3 rounded-lg border flex items-center justify-between text-xs ${
                        isSet
                          ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300'
                          : 'bg-[#171d29] border-[#2a3447] text-gray-400'
                      }`}
                    >
                      <span className="font-mono">{key}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          isSet ? 'bg-emerald-900/60 text-emerald-200' : 'bg-gray-800 text-gray-400'
                        }`}
                      >
                        {isSet ? 'CONFIGURED' : 'PENDING'}
                      </span>
                    </div>
                  ))}
              </div>

              <div className="p-4 bg-[#171d29] border border-[#2a3447] rounded-lg text-xs text-gray-300 space-y-2">
                <div className="font-semibold text-white flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sky-400 text-sm">info</span>
                  Setting Up In Google AI Studio:
                </div>
                <p>
                  To provide any missing keys, open the <strong>Settings</strong> menu in AI Studio and add the desired variable name (e.g. <code>GITHUB_CLIENT_ID</code>, <code>GOOGLE_CLIENT_ID</code>).
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: ACP RPC Protocol */}
          {activeTab === 'rpc' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-white">Agent Client Protocol (ACP) RPC</div>
                  <div className="text-xs text-gray-400">Endpoint: <code>/api/agentsam/acp/rpc</code></div>
                </div>
                <button
                  onClick={handleTestRpc}
                  disabled={loading}
                  className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded text-xs font-semibold flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm">play_arrow</span>
                  <span>Ping 'initialize' RPC</span>
                </button>
              </div>

              <pre className="bg-[#0f131a] border border-[#2a3447] rounded-lg p-3 text-xs font-mono text-emerald-400 max-h-60 overflow-y-auto">
                {rpcResult ? JSON.stringify(rpcResult, null, 2) : '// Click "Ping \'initialize\' RPC" to test live ACP server communication'}
              </pre>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-[#2a3447] bg-[#141924] flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>ACP Serve Engine v2.4 Online (Port 3000)</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-white font-medium transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
