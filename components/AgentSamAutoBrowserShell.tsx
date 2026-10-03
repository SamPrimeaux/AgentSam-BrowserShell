import React, { useRef, useCallback, useState, useEffect } from 'react';
import { AddressBar } from './AddressBar';
import { TTSPlayerBar } from './TTSPlayerBar';
import { Breadcrumb, GroundingSource, Tab, Page } from '../types';
import { UseSpeechSynthesisReturn } from '../hooks/useSpeechSynthesis';
import { useSwipeNavigation } from '../hooks/useSwipeNavigation';
import { CloudSaveModal } from './workspace/CloudSaveModal';

export interface AgentSamAutoBrowserShellProps {
  children: React.ReactNode;
  breadcrumb: Breadcrumb;
  isLoading: boolean;
  loadingMessage: string;
  onNavigate: (type: 'create' | 'edit', prompt: string) => void;
  onBack: () => void;
  onForward: () => void;
  onRefresh: () => void;
  onStop: () => void;
  onHome: () => void;
  canGoBack: boolean;
  canGoForward: boolean;
  groundingSources: GroundingSource[];
  searchEntryPointHtml: string;
  tabs: Tab[];
  activeTabIndex: number;
  onNewTab: () => void;
  onCloseTab: (index: number) => void;
  onSwitchTab: (index: number) => void;
  isGrounded: boolean;
  onToggleGrounding: () => void;
  tts?: UseSpeechSynthesisReturn;
  hasPageContent?: boolean;
  onToggleTts?: () => void;
  onLaunchAntigravity?: () => void;
  onOpenSettings?: () => void;
  onOpenDrive?: () => void;
  onOpenAiHub?: (tab?: 'chat' | 'voice' | 'image' | 'video' | 'animate') => void;
  // History & Breadcrumb State
  history?: Page[];
  currentHistoryIndex?: number;
  onJumpToHistory?: (index: number) => void;
  currentHtml?: string;
  onOpenGmailWorkspace?: () => void;
  onOpenDriveWorkspace?: () => void;
}

export const AgentSamAutoBrowserShell: React.FC<AgentSamAutoBrowserShellProps> = ({
  children,
  breadcrumb,
  isLoading,
  loadingMessage,
  onNavigate,
  onBack,
  onForward,
  onRefresh,
  onStop,
  onHome,
  canGoBack,
  canGoForward,
  groundingSources,
  searchEntryPointHtml,
  tabs,
  activeTabIndex,
  onNewTab,
  onCloseTab,
  onSwitchTab,
  isGrounded,
  onToggleGrounding,
  tts,
  hasPageContent,
  onToggleTts,
  onLaunchAntigravity,
  onOpenSettings,
  onOpenDrive,
  onOpenAiHub,
  history = [],
  currentHistoryIndex = -1,
  onJumpToHistory,
  currentHtml = '',
  onOpenGmailWorkspace,
  onOpenDriveWorkspace,
}) => {
  const shellRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isCloudSaveOpen, setIsCloudSaveOpen] = useState(false);
  const [copiedUrlToast, setCopiedUrlToast] = useState(false);

  // Swipe navigation hook for smooth horizontal back/forward gestures
  const { swipeState, touchHandlers } = useSwipeNavigation({
    onBack,
    onForward,
    canGoBack,
    canGoForward,
    threshold: 65,
  });

  useEffect(() => {
    const handleChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleChange);
    return () => document.removeEventListener('fullscreenchange', handleChange);
  }, []);

  const handleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      shellRef.current?.requestFullscreen?.();
    }
  }, []);

  const getTabTitle = (tab: Tab, index: number) => {
    if (tab.loading) return 'Generating...';
    const bc = tab.breadcrumb;
    return bc.page || bc.sitename || 'New Tab';
  };

  const activePageTitle = breadcrumb.sitename || (history[currentHistoryIndex]?.breadcrumb?.sitename) || 'AgentSam Generated App';
  const activePrompt = history[currentHistoryIndex]?.prompt || '';

  return (
    <div
      className="browser-shell"
      ref={shellRef}
      id="browser-shell-container"
      {...touchHandlers}
    >
      {/* Edge Gesture Visual Highlights */}
      {swipeState.isSwiping && swipeState.direction === 'back' && (
        <div
          className="swipe-edge-indicator swipe-edge-left"
          style={{
            opacity: Math.max(0.2, swipeState.progress),
            width: `${Math.min(12, 4 + swipeState.progress * 8)}px`,
          }}
          aria-hidden="true"
        />
      )}
      {swipeState.isSwiping && swipeState.direction === 'forward' && (
        <div
          className="swipe-edge-indicator swipe-edge-right"
          style={{
            opacity: Math.max(0.2, swipeState.progress),
            width: `${Math.min(12, 4 + swipeState.progress * 8)}px`,
          }}
          aria-hidden="true"
        />
      )}

      {/* Swipe to Navigate HUD Capsule Indicator */}
      {swipeState.isSwiping && swipeState.direction && (
        <div
          className={`swipe-nav-overlay ${
            swipeState.direction === 'back' ? 'swipe-left' : 'swipe-right'
          }`}
          style={{
            opacity: Math.max(0.4, Math.min(1, swipeState.progress * 1.4)),
          }}
          aria-live="polite"
        >
          <div
            className={`swipe-nav-pill ${
              swipeState.isThresholdReached ? 'active-threshold' : ''
            }`}
            style={{
              transform: `translateX(${
                swipeState.direction === 'back'
                  ? Math.min(40, swipeState.deltaX * 0.4)
                  : Math.max(-40, swipeState.deltaX * 0.4)
              }px) scale(${0.9 + swipeState.progress * 0.15})`,
            }}
          >
            <div className="swipe-nav-icon-circle">
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                {swipeState.direction === 'back' ? 'arrow_back' : 'arrow_forward'}
              </span>
            </div>
            <span>
              {swipeState.direction === 'back'
                ? canGoBack
                  ? swipeState.isThresholdReached
                    ? 'Release to Go Back'
                    : 'Swipe to Go Back'
                  : 'Cannot go back'
                : canGoForward
                ? swipeState.isThresholdReached
                  ? 'Release to Go Forward'
                  : 'Swipe to Go Forward'
                : 'Cannot go forward'}
            </span>
          </div>
        </div>
      )}

      {/* Tab Bar */}
      <div className="tab-bar" id="browser-tab-bar">
        <div className="tab-list" role="tablist" id="browser-tab-list">
          {tabs.map((tab, index) => (
            <div
              key={tab.id}
              id={`tab-item-${index}`}
              className={`tab ${index === activeTabIndex ? 'active-tab' : ''}`}
              onClick={() => onSwitchTab(index)}
              role="tab"
              tabIndex={0}
              aria-selected={index === activeTabIndex}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSwitchTab(index);
                }
              }}
            >
              {tab.loading && <div className="tab-spinner" aria-hidden="true" />}
              <span className="tab-title">
                {getTabTitle(tab, index)}
              </span>
              <button
                id={`btn-tab-close-${index}`}
                type="button"
                className="tab-close"
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseTab(index);
                }}
                title="Close tab"
                aria-label="Close tab"
              >
                ×
              </button>
            </div>
          ))}
          <button
            id="btn-tab-new"
            type="button"
            className="tab-new"
            onClick={onNewTab}
            title="New Tab"
            aria-label="New Tab"
          >
            <span>+</span>
          </button>
        </div>

        {/* Quick Cloud Save Button in Tab Bar */}
        {hasPageContent && currentHtml && (
          <button
            id="btn-tabbar-cloud-save"
            type="button"
            className="tab-bar-btn text-blue-400 hover:text-blue-300"
            onClick={() => setIsCloudSaveOpen(true)}
            title="Save to Cloud Connected Resources (Google Drive / Gmail / ACP)"
            aria-label="Save to Cloud Connected Resources"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>cloud_upload</span>
          </button>
        )}

        {/* Settings button — tab bar utility */}
        {onOpenSettings && (
          <button
            id="btn-tabbar-settings"
            type="button"
            className="tab-bar-btn"
            onClick={onOpenSettings}
            title="Settings & Theme Engine (Ctrl+,)"
            aria-label="Settings"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>settings</span>
          </button>
        )}

        {/* Fullscreen button — right side of tab bar */}
        <button
          id="btn-tabbar-fullscreen"
          type="button"
          className="tab-bar-btn"
          onClick={handleFullscreen}
          title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        >
          <span className="material-symbols-outlined">{isFullscreen ? 'close_fullscreen' : 'fullscreen'}</span>
        </button>
      </div>

      {/* Address Bar */}
      <AddressBar
        breadcrumb={breadcrumb}
        isLoading={isLoading}
        loadingMessage={loadingMessage}
        onNavigate={onNavigate}
        onBack={onBack}
        onForward={onForward}
        onRefresh={onRefresh}
        onStop={onStop}
        onHome={onHome}
        canGoBack={canGoBack}
        canGoForward={canGoForward}
        isGrounded={isGrounded}
        onToggleGrounding={onToggleGrounding}
        isTtsSpeaking={tts?.isSpeaking}
        isTtsPaused={tts?.isPaused}
        hasPageContent={hasPageContent}
        onToggleTts={onToggleTts}
        onLaunchAntigravity={onLaunchAntigravity}
        onOpenSettings={onOpenSettings}
        onOpenDrive={onOpenDrive}
        onOpenAiHub={onOpenAiHub}
      />

      {/* CLICKABLE BREADCRUMB NAVIGATION BAR WITH CLOUD SAVE ACTIONS */}
      <nav
        aria-label="Page history breadcrumb trail"
        className="flex-shrink-0 bg-[#0d121f] border-b border-gray-800/80 px-3.5 py-1.5 flex items-center justify-between gap-3 text-xs select-none overflow-x-auto shadow-sm"
      >
        {/* Left: Trail of Previous Page States */}
        <div className="flex items-center gap-1.5 flex-nowrap min-w-0">
          {/* Home Crumb */}
          <button
            type="button"
            onClick={onHome}
            title="Jump to Home / New Tab"
            className={`px-2 py-1 rounded flex items-center gap-1 transition-all ${
              currentHistoryIndex === -1
                ? 'bg-blue-600/30 text-blue-300 font-semibold border border-blue-500/50'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60'
            }`}
          >
            <span className="material-symbols-outlined text-xs">home</span>
            <span className="text-[11px]">Home</span>
          </button>

          {/* Sequential History Crumbs */}
          {history.map((page, idx) => {
            const isActive = idx === currentHistoryIndex;
            const siteLabel = page.breadcrumb?.sitename || `State #${idx + 1}`;
            const subLabel = page.breadcrumb?.page;

            return (
              <React.Fragment key={`crumb-${idx}-${page.timestamp}`}>
                <span className="text-gray-600 text-xs font-mono">›</span>
                <button
                  type="button"
                  onClick={() => onJumpToHistory?.(idx)}
                  title={`Jump to history #${idx + 1}: ${page.prompt || siteLabel} (${new Date(page.timestamp).toLocaleTimeString()})`}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-mono flex items-center gap-1.5 transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-900/50 to-indigo-900/50 text-sky-200 font-bold border border-sky-500/60 shadow-sm'
                      : 'text-gray-400 hover:text-gray-100 hover:bg-gray-800/70 border border-transparent'
                  }`}
                >
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse"></span>
                  )}
                  <span>{siteLabel}</span>
                  {subLabel && (
                    <span className="text-gray-400 opacity-80 font-normal">/{subLabel}</span>
                  )}
                </button>
              </React.Fragment>
            );
          })}

          {/* When actively loading a new state */}
          {isLoading && (
            <>
              <span className="text-gray-600 text-xs font-mono">›</span>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-blue-950/40 border border-blue-800/40 text-blue-300 text-[11px] font-mono animate-pulse">
                <span className="w-2 h-2 rounded-full border border-blue-400 border-t-transparent animate-spin"></span>
                <span>Generating...</span>
              </div>
            </>
          )}
        </div>

        {/* Right: Cloud Connected Resources & Export Hub */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {hasPageContent && currentHtml && (
            <button
              type="button"
              onClick={() => setIsCloudSaveOpen(true)}
              className="px-2.5 py-1 rounded-md bg-gradient-to-r from-blue-600/30 to-indigo-600/30 hover:from-blue-600/40 hover:to-indigo-600/40 border border-blue-500/50 text-blue-200 text-[11px] font-semibold flex items-center gap-1.5 shadow-sm transition-all"
              title="Save generated website to Google Drive, Gmail, or ACP"
            >
              <span className="material-symbols-outlined text-xs text-sky-400">cloud_upload</span>
              <span>Save to Cloud</span>
            </button>
          )}

          {/* Package Architecture Tag */}
          <span
            title="Powered by @inneranimalmedia/agentsam-abs"
            className="hidden sm:inline-block px-2 py-0.5 rounded bg-gray-900 border border-gray-800 text-[10px] text-gray-500 font-mono"
          >
            @inneranimalmedia/agentsam-abs
          </span>
        </div>
      </nav>

      {/* Text-To-Speech Player Bar */}
      {tts && <TTSPlayerBar tts={tts} onClose={tts.stop} />}

      {/* Viewport */}
      <div className="browser-viewport" id="browser-content-viewport">
        {children}
      </div>

      {/* Grounding Attribution Row */}
      {(groundingSources.length > 0 || searchEntryPointHtml) && (
        <div className="grounding-row" id="grounding-attribution-row">
          {/* Source Chips */}
          {groundingSources.length > 0 && (
            <div className="sources-container" id="grounding-sources-container">
              <div className="sources-row" id="grounding-sources-row">
                {groundingSources.map((source, i) => (
                  <a
                    key={i}
                    id={`source-chip-${i}`}
                    className="source-chip"
                    href={source.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={source.title}
                  >
                    <img
                      className="source-favicon"
                      src={`https://www.google.com/s2/favicons?sz=16&domain=${source.title}`}
                      alt=""
                    />
                    {source.title}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Google Search Suggestions Widget */}
          {searchEntryPointHtml && (
            <iframe
              id="google-search-widget-iframe"
              srcDoc={`<script>document.addEventListener('click',function(e){var a=e.target.closest('a');if(a&&a.href){e.preventDefault();window.open(a.href,'_blank');}});</script>${searchEntryPointHtml}`}
              className="search-widget-iframe"
              sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
              title="Search Suggestions"
            />
          )}
        </div>
      )}

      {/* Cloud Connected Resources Save Modal */}
      {hasPageContent && (
        <CloudSaveModal
          isOpen={isCloudSaveOpen}
          onClose={() => setIsCloudSaveOpen(false)}
          htmlContent={currentHtml}
          pageTitle={activePageTitle}
          prompt={activePrompt}
          onOpenGmailWorkspace={onOpenGmailWorkspace}
          onOpenDriveWorkspace={onOpenDriveWorkspace}
        />
      )}
    </div>
  );
};

// Backwards-compatible export alias
export const BrowserShell = AgentSamAutoBrowserShell;
export type BrowserShellProps = AgentSamAutoBrowserShellProps;
export default AgentSamAutoBrowserShell;
