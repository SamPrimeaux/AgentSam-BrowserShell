import React, { useRef, useState, useEffect } from 'react';
import { TokenCount } from '../types';
import {
  AppSettings,
  THEME_PALETTES,
  DEFAULT_APP_SETTINGS,
  loadStoredSettings,
  saveStoredSettings,
  applyThemeToDocument,
} from '../services/themeService';
import { AppSettingsModal } from './AppSettingsModal';

// Smooth interpolated counter — counts up toward target value
const AnimatedNumber: React.FC<{ value: number; prefix?: string; prefixVisible?: boolean; animate?: boolean }> = ({ value, prefix, prefixVisible = true, animate = true }) => {
  const [displayed, setDisplayed] = useState(0);
  const rafRef = useRef<number>(0);
  const currentRef = useRef(0);

  useEffect(() => {
    if (!animate) {
      cancelAnimationFrame(rafRef.current);
      currentRef.current = value;
      setDisplayed(value);
      return;
    }
    const target = value;
    const step = () => {
      const current = currentRef.current;
      const diff = target - current;
      if (Math.abs(diff) < 1) {
        currentRef.current = target;
        setDisplayed(target);
        return;
      }
      currentRef.current = current + diff * 0.15;
      setDisplayed(Math.round(currentRef.current));
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, animate]);

  return (
    <span className="animated-number">
      {prefix && <span className="animated-prefix" style={{ opacity: prefixVisible ? 0.7 : 0 }}>{prefix}</span>}
      {displayed.toLocaleString()}
    </span>
  );
};

// Elapsed timer — starts when isActive becomes true, stops when it becomes false
const ElapsedTimer: React.FC<{ isActive: boolean }> = ({ isActive }) => {
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number>(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (isActive) {
      startRef.current = Date.now();
      const tick = () => {
        setElapsed((Date.now() - startRef.current) / 1000);
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(rafRef.current);
    } else if (startRef.current > 0) {
      setElapsed((Date.now() - startRef.current) / 1000);
    }
  }, [isActive]);

  return <span>{elapsed.toFixed(2)}s</span>;
};

export type ShellPage = 'browser' | 'gmail' | 'drive' | 'antigravity' | 'aihub' | 'acp' | 'settings' | 'wireframe';

interface OuterFrameProps {
  children: React.ReactNode;
  tokenCount: TokenCount | null;
  isLoading: boolean;
  activePage?: ShellPage;
  onPageChange?: (page: ShellPage) => void;
  appMode?: 'browser' | 'antigravity';
  onAppModeChange?: (mode: 'browser' | 'antigravity') => void;
  onOpenSettings?: () => void;
  onOpenDrive?: () => void;
  onOpenAiHub?: (tab?: 'chat' | 'voice' | 'image' | 'video' | 'animate') => void;
  onOpenAcpAuth?: () => void;
}

export const OuterFrame: React.FC<OuterFrameProps> = ({
  children,
  tokenCount,
  isLoading,
  activePage = 'browser',
  onPageChange,
  appMode = 'browser',
  onAppModeChange,
  onOpenDrive,
  onOpenAiHub,
  onOpenAcpAuth,
}) => {
  // Current active page resolver
  const currentPage: ShellPage = onPageChange ? activePage : (appMode === 'antigravity' ? 'antigravity' : 'browser');

  const handleSelectPage = (page: ShellPage) => {
    if (onPageChange) {
      onPageChange(page);
    } else if (onAppModeChange) {
      onAppModeChange(page === 'antigravity' ? 'antigravity' : 'browser');
    }
  };
  // Linear zoom: 1.0 at ≤1080px viewport height, 1.5 at 1440px, etc.
  const [zoom, setZoom] = useState(1);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(() => loadStoredSettings());
  const [isMaximized, setIsMaximized] = useState(false);

  // Initialize theme on mount and settings change
  useEffect(() => {
    applyThemeToDocument(settings);
  }, [settings]);

  // Keyboard shortcut: Ctrl+, or Cmd+, to open Settings
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault();
        setIsSettingsOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const update = () => {
      const vh = window.innerHeight;
      setZoom(Math.max(1, 1 + (vh - 1080) * 0.5 / 360));
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const handleUpdateSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    saveStoredSettings(newSettings);
    applyThemeToDocument(newSettings);
  };

  const handleResetSettings = () => {
    setSettings(DEFAULT_APP_SETTINGS);
    saveStoredSettings(DEFAULT_APP_SETTINGS);
    applyThemeToDocument(DEFAULT_APP_SETTINGS);
  };

  // Quick cycle to next theme
  const handleQuickCycleTheme = () => {
    const currentIndex = THEME_PALETTES.findIndex(t => t.id === settings.themeId);
    const nextIndex = (currentIndex + 1) % THEME_PALETTES.length;
    const nextTheme = THEME_PALETTES[nextIndex];
    handleUpdateSettings({
      ...settings,
      themeId: nextTheme.id,
      customAccent: null,
    });
  };

  const isOutputPhase = (tokenCount?.output ?? 0) > 0;
  const arrowIcon = isOutputPhase ? 'arrow_downward' : 'arrow_upward';
  const phaseClass = isOutputPhase ? 'token-out' : 'token-in';
  const totalTokens = (tokenCount?.input ?? 0) + (tokenCount?.output ?? 0);

  const currentThemeObj = THEME_PALETTES.find(t => t.id === settings.themeId) || THEME_PALETTES[0];

  const frameStyle: React.CSSProperties = zoom > 1 ? {
    zoom,
    width: `calc(100vw / ${zoom})`,
    height: `calc(100vh / ${zoom})`,
    ['--effective-vh' as string]: `calc(100vh / ${zoom})`,
  } : {};

  return (
    <div
      className={`outer-frame pattern-${settings.backgroundPattern} ${isMaximized ? 'maximized-view' : ''}`}
      style={frameStyle}
    >
      {/* Background Texture Overlay */}
      <div className={`canvas-texture-layer pattern-${settings.backgroundPattern}`} aria-hidden="true" />

      <div className="main-container">
        {/* Modern App Shell Header */}
        <div className="outer-header">
          {/* Top Title & Utility Bar */}
          <div className="app-shell-topbar">
            {/* Left: Window Controls + Brand */}
            <div className="app-shell-brand-group">
              {settings.showWindowControls && (
                <div className="app-window-controls" aria-label="Window controls">
                  <button
                    type="button"
                    className="win-btn win-close"
                    title="Close / Reset session"
                    onClick={() => {
                      if (window.confirm('Reset browser session to home?')) {
                        window.location.reload();
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="win-btn win-minimize"
                    title="Quick Theme Cycle"
                    onClick={handleQuickCycleTheme}
                  />
                  <button
                    type="button"
                    className="win-btn win-maximize"
                    title={isMaximized ? "Restore standard size" : "Expand shell"}
                    onClick={() => setIsMaximized(prev => !prev)}
                  />
                </div>
              )}

              <div className="app-title-cluster">
                <h1 className="outer-title">AgentSamRemix</h1>
                <div className="app-shell-status-badge">
                  <span className="app-pulse-dot" />
                  <span>Gemini 3.7 Flash Live</span>
                </div>
              </div>
            </div>

            {/* Center/Right: Multi-Page OS Shell Navigation Tabs */}
            <div className="app-shell-actions-cluster">
              <nav className="view-toggle-buttons" aria-label="Workspaces & Pages">
                <button
                  id="tab-page-browser"
                  type="button"
                  onClick={() => handleSelectPage('browser')}
                  className={`view-mode-btn ${currentPage === 'browser' ? 'active' : ''}`}
                  title="Flash-Lite AI Web Browser"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>language</span>
                  <span>Browser</span>
                </button>

                <button
                  id="tab-page-gmail"
                  type="button"
                  onClick={() => handleSelectPage('gmail')}
                  className={`view-mode-btn ${currentPage === 'gmail' ? 'active' : ''}`}
                  title="Gmail Workspace with Gemini AI Drafting"
                  style={currentPage === 'gmail' ? { borderColor: '#ea4335', color: '#ff8a80', background: 'rgba(234, 67, 53, 0.15)' } : {}}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '15px', color: '#ea4335' }}>mail</span>
                  <span>Gmail</span>
                  <span className="view-mode-badge" style={{ background: '#ea4335', color: '#fff' }}>GSUITE</span>
                </button>

                <button
                  id="tab-page-drive"
                  type="button"
                  onClick={() => handleSelectPage('drive')}
                  className={`view-mode-btn ${currentPage === 'drive' ? 'active' : ''}`}
                  title="Google Drive Cloud Workspace"
                  style={currentPage === 'drive' ? { borderColor: '#4285f4', color: '#8ab4f8', background: 'rgba(66, 133, 244, 0.15)' } : {}}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '15px', color: '#4285f4' }}>folder_shared</span>
                  <span>Drive</span>
                </button>

                <button
                  id="tab-page-antigravity"
                  type="button"
                  onClick={() => handleSelectPage('antigravity')}
                  className={`view-mode-btn ${currentPage === 'antigravity' ? 'active' : ''}`}
                  title="AntiGravity Autonomous Sandbox Lane"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>terminal</span>
                  <span>AntiGravity</span>
                  <span className="view-mode-badge">EXEC</span>
                </button>

                <button
                  id="tab-page-aihub"
                  type="button"
                  onClick={() => handleSelectPage('aihub')}
                  className={`view-mode-btn ${currentPage === 'aihub' ? 'active' : ''}`}
                  title="Gemini AI Studio (Chat, Voice, Images, Video)"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '15px', color: '#8ab4f8' }}>auto_awesome</span>
                  <span>AI Studio</span>
                </button>

                <button
                  id="tab-page-acp"
                  type="button"
                  onClick={() => handleSelectPage('acp')}
                  className={`view-mode-btn ${currentPage === 'acp' ? 'active' : ''}`}
                  title="Agent Client Protocol (ACP) Server Hub & Auth"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '15px', color: '#34d399' }}>shield_person</span>
                  <span>ACP Server</span>
                </button>

                <button
                  id="tab-page-settings"
                  type="button"
                  onClick={() => handleSelectPage('settings')}
                  className={`view-mode-btn ${currentPage === 'settings' ? 'active' : ''}`}
                  title="AgentSam Settings, Models & Observability Console"
                  style={currentPage === 'settings' ? { borderColor: '#a855f7', color: '#d8b4fe', background: 'rgba(168, 85, 247, 0.15)' } : {}}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '15px', color: '#c084fc' }}>tune</span>
                  <span>Settings</span>
                  <span className="view-mode-badge" style={{ background: '#7e22ce', color: '#fff' }}>OPS</span>
                </button>

                <button
                  id="tab-page-wireframe"
                  type="button"
                  onClick={() => handleSelectPage('wireframe')}
                  className={`view-mode-btn ${currentPage === 'wireframe' ? 'active' : ''}`}
                  title="Repo Architecture, 5-Family Taxonomy & Wireframe Map"
                  style={currentPage === 'wireframe' ? { borderColor: '#38bdf8', color: '#7dd3fc', background: 'rgba(56, 189, 248, 0.15)' } : {}}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '15px', color: '#38bdf8' }}>schema</span>
                  <span>Arch Map</span>
                  <span className="view-mode-badge" style={{ background: '#0284c7', color: '#fff' }}>5-FAMILY</span>
                </button>
              </nav>

              {/* Quick Theme Swatch Button */}
              <button
                type="button"
                className="theme-quick-btn"
                onClick={handleQuickCycleTheme}
                title={`Current Theme: ${currentThemeObj.name} (Click to cycle)`}
              >
                <span
                  className="theme-swatch-dot"
                  style={{ background: currentThemeObj.previewColors.accent }}
                />
                <span className="theme-quick-label">{currentThemeObj.name.split(' ')[0]}</span>
              </button>

              {/* Settings Gear Button */}
              <button
                type="button"
                className="app-settings-trigger-btn"
                onClick={() => setIsSettingsOpen(true)}
                title="Open App Settings & Theme Studio (Ctrl+,)"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                  settings
                </span>
                <span className="settings-btn-label">Settings</span>
              </button>
            </div>
          </div>

          {/* Subtitle & Telemetry Row */}
          <div className="outer-caption-row">
            <p className="outer-caption">
              {currentPage === 'browser'
                ? 'Imagine any website, generated in real-time by AgentSam & Gemini'
                : currentPage === 'gmail'
                ? 'Google Workspace Gmail Client with Gemini AI Copilot, Smart Replies, and Search'
                : currentPage === 'drive'
                ? 'Google Drive Workspace: Manage cloud files and import/export generated web applications'
                : currentPage === 'aihub'
                ? 'Gemini AI Studio Multi-Modal Suite: Chat, Live Voice API, Imagen 3, and Veo Video'
                : currentPage === 'acp'
                ? 'Agent Client Protocol (ACP) JSON-RPC 2.0 Server & OAuth Credentials Hub'
                : 'Autonomous multi-backend execution sandbox & telemetry benchmarker'}
            </p>
            {tokenCount && currentPage === 'browser' && settings.showLiveTokens && (
              <span className="token-display" aria-live="polite" aria-atomic="true">
                <span className={phaseClass}>
                  <span className="material-symbols-outlined token-icon" aria-hidden="true">
                    {isLoading ? arrowIcon : 'check'}
                  </span>
                  <AnimatedNumber value={totalTokens} prefix="~" prefixVisible={!!tokenCount.isEstimate} animate={isLoading} />
                </span>
                {' '}
                <span className="token-label">tokens in</span>
                {' '}
                <span className="token-label"><ElapsedTimer isActive={isLoading} /></span>
              </span>
            )}
          </div>
        </div>

        {/* Browser Container */}
        <div className="browser-container">
          {children}
        </div>
      </div>

      <div className="footer">
        <div className="footer-content">
          <span>AgentSamRemix v3.2</span>
          <span className="footer-sep">•</span>
          <span>Cloudflare Workers & Google Antigravity Platform</span>
          <span className="footer-sep">•</span>
          <button
            type="button"
            className="footer-theme-link"
            onClick={() => setIsSettingsOpen(true)}
          >
            🎨 Theme: {currentThemeObj.name}
          </button>
        </div>
      </div>

      {/* Real-time Settings & Theme Modal */}
      <AppSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        onResetSettings={handleResetSettings}
      />
    </div>
  );
};
