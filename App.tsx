import React, { useState, useCallback, useRef } from 'react';
import { OuterFrame, ShellPage } from './components/OuterFrame';
import { AgentSamAutoBrowserShell } from './components/AgentSamAutoBrowserShell';
import { Sandbox } from './components/Sandbox';
import { NewTab } from './components/NewTab';
import { streamPageGeneration } from './services/geminiService';
import { useSpeechSynthesis } from './hooks/useSpeechSynthesis';
import { AgentSamEnvironment } from './components/AgentSamEnvironment';
import { GmailWorkspace } from './components/workspace/GmailWorkspace';
import { GoogleDriveWorkspace } from './components/workspace/GoogleDriveWorkspace';
import { GoogleDriveModal } from './components/workspace/GoogleDriveModal';
import { AcpServerWorkspace } from './components/workspace/AcpServerWorkspace';
import { GeminiAiHubModal, AiStudioTab } from './components/ai/GeminiAiHubModal';
import { AcpAuthModal } from './components/auth/AcpAuthModal';
import { SettingsShell, AgentSamDefaultSettingsHost } from './packages/agentsam-settings/src';
import { RepoWireframeVisualizer } from './components/RepoWireframeVisualizer';
import { Page, Breadcrumb, TokenCount, FormFieldState, GroundingSource, Tab, createTab } from './types';
import { siteNameFromPrompt, parsePageFromHref, extractTitleFromHtml } from './utils/urlHelpers';

const App: React.FC = () => {
  // Settings Host Adapter Instance
  const settingsHost = useRef(new AgentSamDefaultSettingsHost()).current;

  // Shell Workspace Page: 'browser' | 'gmail' | 'drive' | 'antigravity' | 'aihub' | 'acp' | 'settings'
  const [activePage, setActivePage] = useState<ShellPage>('browser');

  // Tab state
  const [tabs, setTabs] = useState<Tab[]>([createTab()]);
  const [activeTabIndex, setActiveTabIndex] = useState(0);

  // Global controls (shared across tabs)
  const [isGrounded, setIsGrounded] = useState(false);
  const [isDriveOpen, setIsDriveOpen] = useState(false);
  const [isAiHubOpen, setIsAiHubOpen] = useState(false);
  const [aiHubInitialTab, setAiHubInitialTab] = useState<AiStudioTab>('chat');
  const [isAcpAuthOpen, setIsAcpAuthOpen] = useState(false);

  // Text-To-Speech hook
  const tts = useSpeechSynthesis();

  // Abort controllers keyed by tab id
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());

  const activeTab = tabs[activeTabIndex];
  const currentPage = activeTab.currentIndex >= 0 ? activeTab.history[activeTab.currentIndex] : null;

  // -- Helper to update the active tab immutably --
  const updateTab = useCallback((tabIndex: number, updater: (tab: Tab) => Tab) => {
    setTabs(prev => prev.map((t, i) => i === tabIndex ? updater(t) : t));
  }, []);

  // -- Core Generation Logic --
  const generate = useCallback(async (
    prompt: string,
    currentHtml: string | null,
    fallbackBreadcrumb: Breadcrumb,
    pushHistory: boolean = true,
    formState?: FormFieldState[]
  ) => {
    const tabIndex = activeTabIndex;
    const tabId = tabs[tabIndex].id;

    // Abort any in-flight request for this tab
    const existingController = abortControllersRef.current.get(tabId);
    if (existingController) {
      existingController.abort();
    }
    const controller = new AbortController();
    abortControllersRef.current.set(tabId, controller);

    // Stop any active text-to-speech reading on new generation
    tts.stop();

    updateTab(tabIndex, tab => ({
      ...tab,
      loading: true,
      loadingMessage: 'Streaming website from Gemini 3.1 Flash',
      generatedContent: '',
      tokenCount: null,
      groundingSources: [],
      searchEntryPointHtml: '',
      breadcrumb: { sitename: fallbackBreadcrumb.sitename, page: '' },
      ...(pushHistory ? { navigationId: tab.navigationId + 1 } : {}),
    }));

    let fullHtml = '';
    let pageTokenCount: TokenCount = { input: 0, output: 0 };
    let pageGroundingSources: GroundingSource[] = [];
    let pageSearchEntryPointHtml = '';
    let titleExtracted = false;

    try {
      const stream = streamPageGeneration(prompt, currentHtml, isGrounded, controller.signal, formState, window.innerWidth <= 768);

      for await (const chunk of stream) {
        if (controller.signal.aborted) break;

        // Live token count updates (estimated during streaming)
        if (chunk.startsWith('__TOKEN__')) {
          try {
            const tokenData = JSON.parse(chunk.replace('__TOKEN__', ''));
            updateTab(tabIndex, tab => ({ ...tab, tokenCount: tokenData }));
          } catch { }
          continue;
        }

        if (chunk.startsWith('__META__')) {
          try {
            const meta = JSON.parse(chunk.replace('__META__', ''));
            pageTokenCount = meta.tokenCount;
            // Update with confirmed (non-estimate) values
            updateTab(tabIndex, tab => ({ ...tab, tokenCount: pageTokenCount }));
            if (meta.groundingSources?.length) {
              pageGroundingSources = meta.groundingSources;
              updateTab(tabIndex, tab => ({ ...tab, groundingSources: meta.groundingSources }));
            }
            if (meta.searchEntryPointHtml) {
              pageSearchEntryPointHtml = meta.searchEntryPointHtml;
              updateTab(tabIndex, tab => ({ ...tab, searchEntryPointHtml: meta.searchEntryPointHtml }));
            }
          } catch { }
          continue;
        }
        fullHtml += chunk;

        const currentFullHtml = fullHtml;
        let extractedBreadcrumb: Breadcrumb | null = null;
        if (!titleExtracted && currentFullHtml.includes('</title>')) {
          extractedBreadcrumb = extractTitleFromHtml(currentFullHtml);
          if (extractedBreadcrumb) titleExtracted = true;
        }

        updateTab(tabIndex, tab => ({
          ...tab,
          generatedContent: currentFullHtml,
          loadingMessage: 'Streaming website from Gemini 3.1 Flash',
          ...(extractedBreadcrumb ? { breadcrumb: extractedBreadcrumb } : {}),
        }));
      }

      if (controller.signal.aborted) return;

      const finalBreadcrumb = titleExtracted
        ? (extractTitleFromHtml(fullHtml) || fallbackBreadcrumb)
        : fallbackBreadcrumb;

      const newPage: Page = {
        html: fullHtml,
        breadcrumb: finalBreadcrumb,
        scrollPosition: 0,
        timestamp: Date.now(),
        tokenCount: pageTokenCount,
        prompt,
        contextHtml: currentHtml,
        isGrounded,
        groundingSources: pageGroundingSources,
        searchEntryPointHtml: pageSearchEntryPointHtml,
      };

      updateTab(tabIndex, tab => {
        if (pushHistory) {
          const newHistory = [...tab.history.slice(0, tab.currentIndex + 1), newPage];
          return {
            ...tab,
            history: newHistory,
            currentIndex: newHistory.length - 1,
            breadcrumb: finalBreadcrumb,
            tokenCount: pageTokenCount,
          };
        } else {
          const updated = [...tab.history];
          if (tab.currentIndex >= 0) {
            updated[tab.currentIndex] = newPage;
          }
          return {
            ...tab,
            history: updated,
            breadcrumb: finalBreadcrumb,
            tokenCount: pageTokenCount,
          };
        }
      });

    } catch (e: any) {
      if (e?.name === 'AbortError' || controller.signal.aborted) return;
      console.error('Generation failed', e);
      updateTab(tabIndex, tab => ({
        ...tab,
        breadcrumb: fallbackBreadcrumb,
        generatedContent: `<div class="p-10"><h1>Error</h1><p>Failed to generate page</p></div>`,
      }));
    } finally {
      if (abortControllersRef.current.get(tabId) === controller) {
        updateTab(tabIndex, tab => ({
          ...tab,
          loading: false,
          loadingMessage: '',
        }));
        abortControllersRef.current.delete(tabId);
      }
    }
  }, [isGrounded, activeTabIndex, tabs, updateTab]);

  // -- Stop loading --
  const handleStop = useCallback(() => {
    const tabId = activeTab.id;
    const controller = abortControllersRef.current.get(tabId);
    if (controller) {
      controller.abort();
      abortControllersRef.current.delete(tabId);
    }
    updateTab(activeTabIndex, tab => ({
      ...tab,
      loading: false,
      loadingMessage: '',
    }));
  }, [activeTab, activeTabIndex, updateTab]);

  // ============================================================
  // ALL PAGE GENERATION TRIGGERS
  // ============================================================

  const handleCreate = useCallback((prompt: string) => {
    const fallback: Breadcrumb = { sitename: siteNameFromPrompt(prompt), page: 'Home' };
    generate(prompt, null, fallback, true);
  }, [generate]);

  const handleLinkClick = useCallback((href: string, linkText: string, formState?: FormFieldState[]) => {
    const prompt = `User clicked "${linkText}" (href: ${href})`;
    const isExternal = /^https?:\/\//i.test(href) || /^[a-z0-9-]+\.[a-z]{2,}/i.test(href);

    if (isExternal) {
      const domain = href.replace(/^https?:\/\//, '').split('/')[0];
      const sitename = domain.replace(/^www\./, '').split('.')[0];
      const capitalizedSitename = sitename.charAt(0).toUpperCase() + sitename.slice(1);
      const fallback: Breadcrumb = { sitename: capitalizedSitename, page: 'Home' };
      generate(prompt, null, fallback, true, formState);
    } else {
      const currentSitename = activeTab.breadcrumb.sitename || 'Site';
      const page = parsePageFromHref(href);
      const fallback: Breadcrumb = { sitename: currentSitename, page };
      if (currentPage) {
        generate(prompt, currentPage.html, fallback, true, formState);
      } else {
        generate(prompt, null, fallback, true, formState);
      }
    }
  }, [generate, currentPage, activeTab.breadcrumb]);

  const handleAction = useCallback((intent: string, payload?: string, formState?: FormFieldState[]) => {
    if (!currentPage) return;
    const actionPrompt = payload ? `${intent}: ${payload}` : intent;
    generate(actionPrompt, currentPage.html, activeTab.breadcrumb, false, formState);
  }, [generate, currentPage, activeTab.breadcrumb]);

  const handleOmnibarNavigate = useCallback((type: 'create' | 'edit', prompt: string) => {
    if (type === 'create') {
      const fallback: Breadcrumb = { sitename: prompt, page: 'Home' };
      generate(prompt, null, fallback, true);
    } else {
      if (!currentPage) return;
      const fallback: Breadcrumb = { sitename: activeTab.breadcrumb.sitename, page: prompt };
      generate(prompt, currentPage.html, fallback, false);
    }
  }, [generate, currentPage, activeTab.breadcrumb]);

  const handleBack = useCallback(() => {
    tts.stop();
    if (activeTab.currentIndex > 0) {
      updateTab(activeTabIndex, tab => {
        const newIndex = tab.currentIndex - 1;
        const page = tab.history[newIndex];
        return {
          ...tab,
          currentIndex: newIndex,
          navigationId: tab.navigationId + 1,
          generatedContent: page.html,
          breadcrumb: page.breadcrumb,
          tokenCount: page.tokenCount,
          groundingSources: page.groundingSources || [],
          searchEntryPointHtml: page.searchEntryPointHtml || '',
        };
      });
      // Update grounding to match the page
      const page = activeTab.history[activeTab.currentIndex - 1];
      if (page) setIsGrounded(page.isGrounded);
    }
  }, [activeTab, activeTabIndex, updateTab, tts]);

  const handleForward = useCallback(() => {
    tts.stop();
    if (activeTab.currentIndex < activeTab.history.length - 1) {
      updateTab(activeTabIndex, tab => {
        const newIndex = tab.currentIndex + 1;
        const page = tab.history[newIndex];
        return {
          ...tab,
          currentIndex: newIndex,
          navigationId: tab.navigationId + 1,
          generatedContent: page.html,
          breadcrumb: page.breadcrumb,
          tokenCount: page.tokenCount,
          groundingSources: page.groundingSources || [],
          searchEntryPointHtml: page.searchEntryPointHtml || '',
        };
      });
      const page = activeTab.history[activeTab.currentIndex + 1];
      if (page) setIsGrounded(page.isGrounded);
    }
  }, [activeTab, activeTabIndex, updateTab, tts]);

  const handleJumpToHistory = useCallback((targetIndex: number) => {
    tts.stop();
    if (targetIndex >= 0 && targetIndex < activeTab.history.length) {
      updateTab(activeTabIndex, tab => {
        const page = tab.history[targetIndex];
        return {
          ...tab,
          currentIndex: targetIndex,
          navigationId: tab.navigationId + 1,
          generatedContent: page.html,
          breadcrumb: page.breadcrumb,
          tokenCount: page.tokenCount,
          groundingSources: page.groundingSources || [],
          searchEntryPointHtml: page.searchEntryPointHtml || '',
        };
      });
      const page = activeTab.history[targetIndex];
      if (page) setIsGrounded(page.isGrounded);
    }
  }, [activeTab, activeTabIndex, updateTab, tts]);

  const handleRefresh = useCallback(() => {
    tts.stop();
    if (currentPage) {
      generate(currentPage.prompt, currentPage.contextHtml, currentPage.breadcrumb, false);
    }
  }, [currentPage, generate, tts]);

  const handleHome = useCallback(() => {
    tts.stop();
    // Abort any in-flight request
    const tabId = activeTab.id;
    const controller = abortControllersRef.current.get(tabId);
    if (controller) {
      controller.abort();
      abortControllersRef.current.delete(tabId);
    }

    updateTab(activeTabIndex, tab => ({
      ...tab,
      currentIndex: -1,
      loading: false,
      loadingMessage: '',
      generatedContent: '',
      breadcrumb: { sitename: '', page: '' },
      tokenCount: null,
      groundingSources: [],
      searchEntryPointHtml: '',
    }));
  }, [activeTab, activeTabIndex, updateTab, tts]);

  // ============================================================
  // TAB MANAGEMENT
  // ============================================================

  const handleNewTab = useCallback(() => {
    tts.stop();
    const newTab = createTab();
    setTabs(prev => [...prev, newTab]);
    setActiveTabIndex(tabs.length); // new tab is at the end
  }, [tabs.length, tts]);

  const handleCloseTab = useCallback((index: number) => {
    tts.stop();
    // Abort any in-flight request for the closing tab
    const closingTab = tabs[index];
    const controller = abortControllersRef.current.get(closingTab.id);
    if (controller) {
      controller.abort();
      abortControllersRef.current.delete(closingTab.id);
    }

    if (tabs.length === 1) {
      // Last tab — replace with a fresh one
      const newTab = createTab();
      setTabs([newTab]);
      setActiveTabIndex(0);
    } else {
      setTabs(prev => prev.filter((_, i) => i !== index));
      if (activeTabIndex >= index && activeTabIndex > 0) {
        setActiveTabIndex(prev => prev - 1);
      }
    }
  }, [tabs, activeTabIndex, tts]);

  const handleSwitchTab = useCallback((index: number) => {
    tts.stop();
    setActiveTabIndex(index);
  }, [tts]);

  const isNewTab = activeTab.currentIndex === -1 && !activeTab.loading;
  const displayContent = activeTab.loading ? activeTab.generatedContent : (currentPage?.html || '');
  const hasPageContent = Boolean(!isNewTab && displayContent && displayContent.trim().length > 0);

  const handleToggleTts = useCallback(() => {
    if (!hasPageContent && !tts.isSpeaking) return;
    if (tts.isSpeaking) {
      if (tts.isPaused) {
        tts.resume();
      } else {
        tts.pause();
      }
    } else {
      tts.speak(displayContent);
    }
  }, [hasPageContent, tts, displayContent]);

  const handleLoadHtmlFromDrive = useCallback((html: string, title?: string) => {
    tts.stop();
    const docTitle = title || 'Google Drive Document';
    const breadcrumb: Breadcrumb = {
      sitename: docTitle.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'drive-doc',
      page: 'view',
    };
    const newPage: Page = {
      prompt: `Imported from Google Drive: ${docTitle}`,
      contextHtml: null,
      html,
      breadcrumb,
      tokenCount: { input: 0, output: 0 },
      groundingSources: [],
      searchEntryPointHtml: '',
    };
    updateTab(activeTabIndex, tab => ({
      ...tab,
      loading: false,
      loadingMessage: '',
      generatedContent: '',
      breadcrumb,
      history: [...tab.history.slice(0, tab.currentIndex + 1), newPage],
      currentIndex: tab.currentIndex + 1,
      navigationId: tab.navigationId + 1,
      tokenCount: null,
      groundingSources: [],
      searchEntryPointHtml: '',
    }));
    setIsDriveOpen(false);
  }, [activeTabIndex, updateTab, tts]);

  const handleOpenAiHub = useCallback((tab: AiStudioTab = 'chat') => {
    setAiHubInitialTab(tab);
    setIsAiHubOpen(true);
  }, []);

  const handleInsertAiContent = useCallback((content: string) => {
    // If it's an image URL / Data URL or code snippet, create or edit current page
    if (content.startsWith('data:image') || content.startsWith('http')) {
      // If we are on an active page, ask to append or view
      handleOmnibarNavigate('create', `Create an interactive gallery page featuring this image asset: <img src="${content}" alt="Generated AI Image" style="max-width: 100%; border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.5);" />`);
    } else {
      handleOmnibarNavigate('create', `Create a web application incorporating the following component/logic:\n\n${content}`);
    }
  }, [handleOmnibarNavigate]);

  return (
    <OuterFrame
      tokenCount={activeTab.tokenCount}
      isLoading={activeTab.loading}
      activePage={activePage}
      onPageChange={setActivePage}
      appMode={activePage === 'antigravity' ? 'antigravity' : 'browser'}
      onAppModeChange={(mode) => setActivePage(mode)}
      onOpenDrive={() => setActivePage('drive')}
      onOpenAiHub={(tab) => {
        setAiHubInitialTab(tab || 'chat');
        setActivePage('aihub');
      }}
      onOpenAcpAuth={() => setActivePage('acp')}
    >
      {/* 1. Gmail Full-Screen Workspace */}
      {activePage === 'gmail' && (
        <GmailWorkspace onOpenBrowser={() => setActivePage('browser')} />
      )}

      {/* 2. Google Drive Full-Screen Workspace */}
      {activePage === 'drive' && (
        <GoogleDriveWorkspace
          currentPageHtml={displayContent}
          currentPageTitle={activeTab.breadcrumb.sitename || 'Flash-Lite Generated Page'}
          onLoadHtmlToBrowser={(html, title) => {
            handleLoadHtmlFromDrive(html, title);
            setActivePage('browser');
          }}
        />
      )}

      {/* 3. AntiGravity Autonomous Sandbox */}
      {activePage === 'antigravity' && (
        <AgentSamEnvironment onSwitchToBrowser={() => setActivePage('browser')} />
      )}

      {/* 4. ACP Serve & OAuth Dashboard Workspace */}
      {activePage === 'acp' && (
        <AcpServerWorkspace />
      )}

      {/* 5. AI Studio Multi-Modal Workspace */}
      {activePage === 'aihub' && (
        <div className="flex-1 flex flex-col h-full bg-[#0d1117] text-gray-200">
          <GeminiAiHubModal
            isOpen={true}
            onClose={() => setActivePage('browser')}
            initialTab={aiHubInitialTab}
            onInsertIntoPage={(content) => {
              handleInsertAiContent(content);
              setActivePage('browser');
            }}
          />
        </div>
      )}

      {/* 6. Settings, Unified Models & Observability Console */}
      {activePage === 'settings' && (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          <SettingsShell
            host={settingsHost}
            onClose={() => setActivePage('browser')}
          />
        </div>
      )}

      {/* 7. Repo Architecture & Wireframe Visualizer */}
      {activePage === 'wireframe' && (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          <RepoWireframeVisualizer
            onClose={() => setActivePage('browser')}
          />
        </div>
      )}

      {/* 8. Generative Web Browser (AgentSamAutoBrowserShell) */}
      {activePage === 'browser' && (
        <AgentSamAutoBrowserShell
          breadcrumb={activeTab.breadcrumb}
          isLoading={activeTab.loading}
          loadingMessage={activeTab.loadingMessage}
          onNavigate={handleOmnibarNavigate}
          onBack={handleBack}
          onForward={handleForward}
          onRefresh={handleRefresh}
          onStop={handleStop}
          onHome={handleHome}
          canGoBack={activeTab.currentIndex > 0}
          canGoForward={activeTab.currentIndex < activeTab.history.length - 1}
          groundingSources={activeTab.groundingSources}
          searchEntryPointHtml={activeTab.searchEntryPointHtml}
          tabs={tabs}
          activeTabIndex={activeTabIndex}
          onNewTab={handleNewTab}
          onCloseTab={handleCloseTab}
          onSwitchTab={handleSwitchTab}
          isGrounded={isGrounded}
          onToggleGrounding={() => setIsGrounded(prev => !prev)}
          tts={tts}
          hasPageContent={hasPageContent}
          onToggleTts={handleToggleTts}
          onLaunchAntigravity={() => setActivePage('antigravity')}
          onOpenDrive={() => setActivePage('drive')}
          onOpenAiHub={(tab) => {
            setAiHubInitialTab(tab || 'chat');
            setActivePage('aihub');
          }}
          history={activeTab.history}
          currentHistoryIndex={activeTab.currentIndex}
          onJumpToHistory={handleJumpToHistory}
          currentHtml={displayContent}
          onOpenGmailWorkspace={() => setActivePage('gmail')}
          onOpenDriveWorkspace={() => setActivePage('drive')}
        >
          {isNewTab ? (
            <NewTab
              onCreatePage={handleCreate}
              onLaunchAntigravity={() => setActivePage('antigravity')}
              onOpenDrive={() => setActivePage('drive')}
              onOpenAiHub={(tab) => {
                setAiHubInitialTab(tab || 'chat');
                setActivePage('aihub');
              }}
            />
          ) : (
            <Sandbox
              htmlContent={displayContent}
              onNavigate={handleLinkClick}
              onAction={handleAction}
            />
          )}
        </AgentSamAutoBrowserShell>
      )}

      {/* Quick Google Drive Quick Save Modal (if opened while browsing) */}
      <GoogleDriveModal
        isOpen={isDriveOpen}
        onClose={() => setIsDriveOpen(false)}
        currentPageHtml={displayContent}
        currentPageTitle={activeTab.breadcrumb.sitename || 'Flash-Lite Generated Page'}
        onLoadHtml={handleLoadHtmlFromDrive}
      />

      {/* Quick AI Hub Floating Modal */}
      <GeminiAiHubModal
        isOpen={isAiHubOpen}
        onClose={() => setIsAiHubOpen(false)}
        initialTab={aiHubInitialTab}
        onInsertIntoPage={handleInsertAiContent}
      />

      {/* Quick ACP Auth Floating Modal */}
      <AcpAuthModal
        isOpen={isAcpAuthOpen}
        onClose={() => setIsAcpAuthOpen(false)}
      />
    </OuterFrame>
  );
};

export default App;