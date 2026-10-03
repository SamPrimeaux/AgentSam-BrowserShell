import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  BackendType,
  BACKEND_CONFIGS,
  MissionStep,
  MissionReport,
  PresetMission,
  TaskContract,
  LiteralSpan,
  GoapPlan,
  GoapWorldState,
  GoapAction,
} from '../types/agentSam';
import { PRESET_MISSIONS, generateStepsForMission } from '../data/missionPresets';
import { AcpService } from '../services/acpService';
import { AcpAuthModal } from './auth/AcpAuthModal';
import { AuthStatusResponse } from '../backend/agentsam/acp/types';
import { compileTaskContract, extractLiteralSpans } from '../backend/agentsam/taskContract';
import { planGoapSequence } from '../backend/agentsam/goap/planner';

interface AgentSamEnvironmentProps {
  onSwitchToBrowser?: () => void;
}

export const AgentSamEnvironment: React.FC<AgentSamEnvironmentProps> = ({ onSwitchToBrowser }) => {
  // Navigation & Sub-views: 'stream' | 'contract' | 'goap_plan' | 'network' | 'artifacts' | 'benchmark'
  const [activeTab, setActiveTab] = useState<'stream' | 'contract' | 'goap_plan' | 'network' | 'artifacts' | 'benchmark'>('stream');

  // Backend target
  const [selectedBackend, setSelectedBackend] = useState<BackendType>('antigravity');
  const [selectedMissionId, setSelectedMissionId] = useState<string>('identity-authority-audit');
  
  // Natural Language & Voice Input
  const [promptInput, setPromptInput] = useState<string>('');
  const [isVoiceListening, setIsVoiceListening] = useState<boolean>(false);
  const [voiceVolume, setVoiceVolume] = useState<number>(0);
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);
  const [speechSupported, setSpeechSupported] = useState<boolean>(false);
  const [voiceNarration, setVoiceNarration] = useState<boolean>(true);

  // Task Contract State (AgentSam output)
  const [activeContract, setActiveContract] = useState<TaskContract | null>(null);
  const [activePlan, setActivePlan] = useState<GoapPlan | null>(null);
  const [contractCompileSuccess, setContractCompileSuccess] = useState<boolean>(false);

  // Execution state (agentsam GOAP Engine)
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [expandedStepIds, setExpandedStepIds] = useState<Record<string, boolean>>({});
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1); // 1x, 2x, 4x, 0 = instant
  const [worldState, setWorldState] = useState<GoapWorldState>({
    env_ready: false,
    firewall_verified: false,
    auth_inventory_complete: false,
    ast_audited: false,
    consolidation_computed: false,
    svg_generated: false,
    report_sealed: false,
    mission_complete: false,
  });

  // Auth & System state
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authStatus, setAuthStatus] = useState<AuthStatusResponse | null>(null);

  const streamEndRef = useRef<HTMLDivElement>(null);
  const stepTimerRef = useRef<number | null>(null);
  const recognitionRef = useRef<any>(null);

  // Selected preset mission definition
  const currentMission = useMemo(() => {
    return PRESET_MISSIONS.find(m => m.id === selectedMissionId) || PRESET_MISSIONS[0];
  }, [selectedMissionId]);

  // Active prompt
  const effectivePrompt = isCustomMode ? promptInput : currentMission.prompt;

  // Real-time Literal Spans extracted from effective prompt
  const liveLiteralSpans = useMemo(() => {
    return extractLiteralSpans(effectivePrompt);
  }, [effectivePrompt]);

  // Generated steps & report for current backend & mission
  const { steps: allSteps, report: missionReport } = useMemo(() => {
    return generateStepsForMission(selectedMissionId, selectedBackend);
  }, [selectedMissionId, selectedBackend]);

  // Steps to display based on progress
  const visibleSteps = useMemo(() => {
    return allSteps.slice(0, currentStepIndex);
  }, [allSteps, currentStepIndex]);

  // Cumulative token and cost metrics
  const telemetry = useMemo(() => {
    let input = 0;
    let output = 0;
    let thinking = 0;
    let durationMs = 0;
    let toolCallsCount = 0;
    let terminalCallsCount = 0;

    visibleSteps.forEach(s => {
      input += s.tokens.input;
      output += s.tokens.output;
      thinking += s.tokens.thinking;
      durationMs += s.durationMs;
      if (s.phase === 'tool_call' || s.phase === 'artifact_generation') toolCallsCount++;
      if (s.terminal) terminalCallsCount++;
    });

    const totalTokens = input + output + thinking;
    const modelCost = ((input / 1_000_000) * 0.75) + (((output + thinking) / 1_000_000) * 3.75);
    const computeHours = durationMs / (1000 * 60 * 60);
    const computeCost = selectedBackend === 'antigravity'
      ? 0.0
      : computeHours * BACKEND_CONFIGS[selectedBackend].computeCostPerHour;

    return {
      input,
      output,
      thinking,
      totalTokens,
      durationMs,
      toolCallsCount,
      terminalCallsCount,
      modelCost,
      computeCost,
      totalCost: modelCost + computeCost,
      isCompleted: currentStepIndex >= allSteps.length,
    };
  }, [visibleSteps, selectedBackend, currentStepIndex, allSteps.length]);

  // Compile initial task contract & GOAP plan on mount or prompt switch
  useEffect(() => {
    const contract = compileTaskContract(effectivePrompt, selectedBackend, {
      inputMode: isCustomMode ? 'text' : 'preset',
      targetRepo: currentMission.targetRepo,
    });
    setActiveContract(contract);
    const plan = planGoapSequence(contract);
    setActivePlan(plan);
  }, [effectivePrompt, selectedBackend, isCustomMode, currentMission]);

  // Check Web Speech API availability
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
    }
    AcpService.getAuthStatus().then(setAuthStatus);
  }, []);

  // Web Speech Audio Transcription Setup
  const handleToggleVoice = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech Recognition is not supported in this browser. Please type your mission prompt.');
      return;
    }

    if (isVoiceListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsVoiceListening(false);
      setVoiceVolume(0);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsVoiceListening(true);
        setIsCustomMode(true);
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript) {
          setPromptInput(prev => (prev ? `${prev} ${transcript}` : transcript));
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsVoiceListening(false);
      };

      recognition.onend = () => {
        setIsVoiceListening(false);
        setVoiceVolume(0);
      };

      recognition.start();
      recognitionRef.current = recognition;

      // Simulated audio waveform volume pulsing
      const interval = setInterval(() => {
        if (!isVoiceListening) {
          clearInterval(interval);
          return;
        }
        setVoiceVolume(Math.random() * 80 + 20);
      }, 100);
    } catch (e) {
      console.error(e);
      setIsVoiceListening(false);
    }
  };

  // Compile button handler with animation feedback
  const handleCompileContract = () => {
    const contract = compileTaskContract(effectivePrompt, selectedBackend, {
      inputMode: isVoiceListening ? 'voice' : (isCustomMode ? 'text' : 'preset'),
      targetRepo: currentMission.targetRepo,
    });
    setActiveContract(contract);
    const plan = planGoapSequence(contract);
    setActivePlan(plan);
    setContractCompileSuccess(true);
    setTimeout(() => setContractCompileSuccess(false), 3000);

    if (voiceNarration && 'speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(`Contract compiled: ${contract.title}. All literal spans preserved.`);
      utterance.rate = 1.1;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Auto-expand newly appearing steps
  useEffect(() => {
    if (visibleSteps.length > 0) {
      const latestStep = visibleSteps[visibleSteps.length - 1];
      setExpandedStepIds(prev => ({
        ...prev,
        [latestStep.id]: true,
      }));

      // Update simulated world state based on step
      if (latestStep.phase === 'env_init') {
        setWorldState(prev => ({ ...prev, env_ready: true }));
      } else if (latestStep.phase === 'terminal') {
        setWorldState(prev => ({ ...prev, auth_inventory_complete: true }));
      } else if (latestStep.phase === 'tool_call') {
        setWorldState(prev => ({ ...prev, ast_audited: true }));
      } else if (latestStep.phase === 'thought' && latestStep.title.includes('Consolidation')) {
        setWorldState(prev => ({ ...prev, consolidation_computed: true }));
      } else if (latestStep.phase === 'artifact_generation') {
        setWorldState(prev => ({ ...prev, svg_generated: true, report_sealed: true, mission_complete: true }));
      }

      // Voice narration of step progress
      if (voiceNarration && isRunning && 'speechSynthesis' in window) {
        const text = `${latestStep.title}`;
        const u = new SpeechSynthesisUtterance(text);
        u.rate = 1.2;
        u.volume = 0.6;
        window.speechSynthesis.speak(u);
      }
    }
  }, [visibleSteps.length]);

  // Auto-scroll stream to bottom when running
  useEffect(() => {
    if (isRunning && streamEndRef.current) {
      streamEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [visibleSteps.length, isRunning]);

  // Execution loop timer
  useEffect(() => {
    if (!isRunning || isPaused) {
      if (stepTimerRef.current) clearTimeout(stepTimerRef.current);
      return;
    }

    if (currentStepIndex >= allSteps.length) {
      setIsRunning(false);
      return;
    }

    const currentStep = allSteps[currentStepIndex];
    const delay = playbackSpeed === 0 ? 50 : Math.max(250, currentStep.durationMs / playbackSpeed);

    stepTimerRef.current = window.setTimeout(() => {
      setCurrentStepIndex(prev => prev + 1);
    }, delay);

    return () => {
      if (stepTimerRef.current) clearTimeout(stepTimerRef.current);
    };
  }, [isRunning, isPaused, currentStepIndex, allSteps, playbackSpeed]);

  const handleStartMission = () => {
    if (!activeContract) {
      handleCompileContract();
    }
    setCurrentStepIndex(1);
    setIsRunning(true);
    setIsPaused(false);
  };

  const handlePauseResume = () => {
    setIsPaused(prev => !prev);
  };

  const handleReset = () => {
    setIsRunning(false);
    setIsPaused(false);
    setCurrentStepIndex(0);
    setWorldState({
      env_ready: false,
      firewall_verified: false,
      auth_inventory_complete: false,
      ast_audited: false,
      consolidation_computed: false,
      svg_generated: false,
      report_sealed: false,
      mission_complete: false,
    });
  };

  const handleStepForward = () => {
    if (currentStepIndex < allSteps.length) {
      setCurrentStepIndex(prev => prev + 1);
    }
  };

  const toggleStepExpanded = (id: string) => {
    setExpandedStepIds(prev => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0d14] text-gray-100 font-sans select-none overflow-hidden">
      {/* 1. TOP DUAL-ENGINE ARCHITECTURE BAR */}
      <header className="flex-shrink-0 bg-[#0d121f] border-b border-gray-800/80 px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-purple-900/40 border border-blue-700/50 rounded-lg">
            <span className="text-blue-400 font-black tracking-wider text-xs flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm animate-pulse text-sky-400">psychology</span>
              AgentSam
            </span>
            <span className="text-gray-500 text-xs font-mono">➜</span>
            <span className="text-purple-300 font-semibold text-xs tracking-wider flex items-center gap-1">
              <span className="material-symbols-outlined text-sm text-purple-400">verified_user</span>
              TaskContract
            </span>
            <span className="text-gray-500 text-xs font-mono">➜</span>
            <span className="text-emerald-400 font-bold text-xs tracking-wider flex items-center gap-1">
              <span className="material-symbols-outlined text-sm text-emerald-400">precision_manufacturing</span>
              agentsam (GOAP)
            </span>
          </div>

          <div className="hidden lg:flex items-center gap-2 text-xs text-gray-400">
            <span className="px-2 py-0.5 rounded bg-gray-800/80 text-gray-300 border border-gray-700/60 font-mono">
              {BACKEND_CONFIGS[selectedBackend].name}
            </span>
            <span className="text-gray-600">•</span>
            <span className="text-emerald-400 font-mono text-[11px] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-ping"></span>
              {activeContract?.sha256Signature.substring(0, 16)}...
            </span>
          </div>
        </div>

        {/* Global Controls & Auth */}
        <div className="flex items-center gap-2">
          {/* Voice Narration Toggle */}
          <button
            onClick={() => setVoiceNarration(prev => !prev)}
            title={voiceNarration ? 'Voice Narration: ON' : 'Voice Narration: OFF'}
            className={`px-2.5 py-1 text-xs rounded border flex items-center gap-1.5 transition-all ${
              voiceNarration
                ? 'bg-purple-900/40 border-purple-600/70 text-purple-200'
                : 'bg-gray-800/60 border-gray-700 text-gray-400'
            }`}
          >
            <span className="material-symbols-outlined text-sm">
              {voiceNarration ? 'volume_up' : 'volume_off'}
            </span>
            <span className="hidden sm:inline">Narration</span>
          </button>

          {/* Auth Status & Account Manager */}
          <button
            onClick={() => setIsAuthModalOpen(true)}
            className="px-2.5 py-1 text-xs rounded border border-gray-700/80 bg-gray-800/60 hover:bg-gray-700/60 text-gray-200 flex items-center gap-1.5 transition-colors"
          >
            <span className="material-symbols-outlined text-sm text-yellow-400">key</span>
            <span>Auth & ACP Serve</span>
            {authStatus?.authenticated && (
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            )}
          </button>

          {onSwitchToBrowser && (
            <button
              onClick={onSwitchToBrowser}
              className="px-2.5 py-1 text-xs rounded border border-blue-700/60 bg-blue-900/30 hover:bg-blue-800/40 text-blue-200 flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-sm">open_in_new</span>
              <span>Web Browser</span>
            </button>
          )}
        </div>
      </header>

      {/* 2. PROMPT & VOICE INPUT WITH LITERAL SPAN PRESERVATION */}
      <section className="flex-shrink-0 bg-[#0f1422] border-b border-gray-800/80 p-3.5">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch">
          {/* Mode & Preset Selector */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setIsCustomMode(false)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                !isCustomMode
                  ? 'bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-900/30'
                  : 'bg-gray-800/60 border-gray-700 text-gray-300 hover:bg-gray-700/60'
              }`}
            >
              Preset Missions
            </button>
            <button
              onClick={() => setIsCustomMode(true)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                isCustomMode
                  ? 'bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-900/30'
                  : 'bg-gray-800/60 border-gray-700 text-gray-300 hover:bg-gray-700/60'
              }`}
            >
              Custom Voice / Text
            </button>

            {!isCustomMode ? (
              <select
                value={selectedMissionId}
                onChange={e => {
                  setSelectedMissionId(e.target.value);
                  handleReset();
                }}
                className="bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-blue-500 font-mono"
              >
                {PRESET_MISSIONS.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.title}
                  </option>
                ))}
              </select>
            ) : null}

            {/* Target Execution Backend Selector */}
            <div className="flex items-center gap-1.5 bg-gray-900/90 border border-gray-700/80 rounded-lg px-2 py-1">
              <span className="text-[11px] text-gray-400 font-medium">Lane:</span>
              <select
                value={selectedBackend}
                onChange={e => {
                  setSelectedBackend(e.target.value as BackendType);
                  handleReset();
                }}
                className="bg-transparent text-xs text-sky-400 font-semibold focus:outline-none cursor-pointer"
              >
                <option value="antigravity">Google Antigravity (Managed)</option>
                <option value="cloudflare">Cloudflare Containers (Workers Paid)</option>
                <option value="local_pty">Local Mac (localpty loop)</option>
                <option value="gcp_vm">GCP Compute Engine (e2-standard-2)</option>
              </select>
            </div>
          </div>

          {/* Natural Language Prompt & Speech-to-Text Input */}
          <div className="flex-1 flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={isCustomMode ? promptInput : currentMission.prompt.split('\n')[0]}
                onChange={e => {
                  setIsCustomMode(true);
                  setPromptInput(e.target.value);
                }}
                placeholder={speechSupported ? 'Type natural language intent or press the mic for voice dictation...' : 'Type natural language intent...'}
                className="w-full bg-gray-950/80 border border-gray-700/80 focus:border-blue-500 rounded-lg px-3.5 py-2 text-xs text-gray-200 placeholder-gray-500 font-mono focus:outline-none shadow-inner"
              />
              {isVoiceListening && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>
                  <span className="text-[10px] text-rose-400 font-mono font-bold uppercase tracking-wider">Listening</span>
                </div>
              )}
            </div>

            {/* Voice Input Button */}
            <button
              onClick={handleToggleVoice}
              title={isVoiceListening ? 'Stop Listening' : 'Dictate with Voice'}
              className={`p-2 rounded-lg border transition-all flex items-center justify-center ${
                isVoiceListening
                  ? 'bg-rose-600/30 border-rose-500 text-rose-300 animate-pulse'
                  : 'bg-gray-800/70 border-gray-700 hover:bg-gray-700 text-gray-300'
              }`}
            >
              <span className="material-symbols-outlined text-sm">
                {isVoiceListening ? 'mic' : 'mic_none'}
              </span>
            </button>

            {/* Compile TaskContract Button */}
            <button
              onClick={handleCompileContract}
              className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-all flex items-center gap-1.5 shadow-md ${
                contractCompileSuccess
                  ? 'bg-emerald-600 border-emerald-500 text-white'
                  : 'bg-gradient-to-r from-indigo-600 to-purple-600 border-indigo-500 hover:from-indigo-500 hover:to-purple-500 text-white shadow-indigo-900/30'
              }`}
            >
              <span className="material-symbols-outlined text-sm">
                {contractCompileSuccess ? 'check_circle' : 'gavel'}
              </span>
              <span>{contractCompileSuccess ? 'Contract Verified' : 'Compile Contract'}</span>
            </button>
          </div>
        </div>

        {/* 3. LITERAL SPAN PRESERVATION RIBBON */}
        <div className="mt-2.5 pt-2 border-t border-gray-800/60 flex items-center gap-2 overflow-x-auto text-[11px]">
          <span className="text-gray-400 font-medium whitespace-nowrap flex items-center gap-1">
            <span className="material-symbols-outlined text-xs text-sky-400">data_object</span>
            Literal Spans ({liveLiteralSpans.length}):
          </span>

          {liveLiteralSpans.length === 0 ? (
            <span className="text-gray-500 italic text-[11px]">No explicit constraints or literal entities detected.</span>
          ) : (
            <div className="flex items-center gap-1.5 flex-nowrap">
              {liveLiteralSpans.map(span => (
                <div
                  key={span.id}
                  title={`[Offset ${span.startIndex}..${span.endIndex}] Rule: ${span.enforcementRule}`}
                  className={`px-2 py-0.5 rounded border font-mono text-[10px] flex items-center gap-1 cursor-help whitespace-nowrap transition-transform hover:scale-105 ${
                    span.category === 'constraint'
                      ? 'bg-rose-950/60 border-rose-700/60 text-rose-300'
                      : span.category === 'repo'
                      ? 'bg-indigo-950/60 border-indigo-700/60 text-indigo-300'
                      : span.category === 'domain'
                      ? 'bg-emerald-950/60 border-emerald-700/60 text-emerald-300'
                      : span.category === 'path'
                      ? 'bg-sky-950/60 border-sky-700/60 text-sky-300'
                      : 'bg-amber-950/60 border-amber-700/60 text-amber-300'
                  }`}
                >
                  <span className="opacity-75 uppercase text-[9px] font-bold">[{span.category}]</span>
                  <span>"{span.text}"</span>
                </div>
              ))}
            </div>
          )}

          <div className="ml-auto flex items-center gap-1.5 text-gray-500 text-[10px] whitespace-nowrap">
            <span className="text-emerald-400 font-semibold flex items-center gap-0.5">
              <span className="material-symbols-outlined text-xs">lock</span>
              Zero-Drift Invariant
            </span>
          </div>
        </div>
      </section>

      {/* 4. MAIN WORKSPACE VIEW WITH SUB-NAVIGATION TABS */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* LEFT COLUMN: Sub-Views & Execution Viewport */}
        <section className="flex-1 flex flex-col min-w-0 border-r border-gray-800/80 bg-[#0b0e17]">
          {/* Sub-View Tabs */}
          <div className="flex-shrink-0 bg-[#0d1220] border-b border-gray-800 px-3 py-1.5 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setActiveTab('stream')}
                className={`px-3 py-1 text-xs rounded-md font-medium flex items-center gap-1.5 transition-all ${
                  activeTab === 'stream'
                    ? 'bg-blue-600/30 border border-blue-500/60 text-blue-200'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/40'
                }`}
              >
                <span className="material-symbols-outlined text-xs">terminal</span>
                <span>Execution Stream</span>
                {visibleSteps.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full bg-blue-900/60 text-[10px] text-blue-300 font-mono">
                    {visibleSteps.length}/{allSteps.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('contract')}
                className={`px-3 py-1 text-xs rounded-md font-medium flex items-center gap-1.5 transition-all ${
                  activeTab === 'contract'
                    ? 'bg-purple-600/30 border border-purple-500/60 text-purple-200'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/40'
                }`}
              >
                <span className="material-symbols-outlined text-xs">verified_user</span>
                <span>TaskContract & Boundaries</span>
              </button>

              <button
                onClick={() => setActiveTab('goap_plan')}
                className={`px-3 py-1 text-xs rounded-md font-medium flex items-center gap-1.5 transition-all ${
                  activeTab === 'goap_plan'
                    ? 'bg-emerald-600/30 border border-emerald-500/60 text-emerald-200'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/40'
                }`}
              >
                <span className="material-symbols-outlined text-xs">account_tree</span>
                <span>GOAP Planner Graph</span>
              </button>

              <button
                onClick={() => setActiveTab('network')}
                className={`px-3 py-1 text-xs rounded-md font-medium flex items-center gap-1.5 transition-all ${
                  activeTab === 'network'
                    ? 'bg-amber-600/30 border border-amber-500/60 text-amber-200'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/40'
                }`}
              >
                <span className="material-symbols-outlined text-xs">security</span>
                <span>Network Egress Firewall</span>
              </button>

              <button
                onClick={() => setActiveTab('artifacts')}
                className={`px-3 py-1 text-xs rounded-md font-medium flex items-center gap-1.5 transition-all ${
                  activeTab === 'artifacts'
                    ? 'bg-sky-600/30 border border-sky-500/60 text-sky-200'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/40'
                }`}
              >
                <span className="material-symbols-outlined text-xs">schema</span>
                <span>SVG Architecture Map</span>
              </button>
            </div>

            {/* Playback & Step Controls */}
            <div className="flex items-center gap-1.5">
              {!isRunning ? (
                <button
                  onClick={handleStartMission}
                  disabled={telemetry.isCompleted}
                  className="px-3 py-1 text-xs font-semibold rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white flex items-center gap-1 transition-all shadow-sm"
                >
                  <span className="material-symbols-outlined text-xs">play_arrow</span>
                  <span>{currentStepIndex === 0 ? 'Run Autonomous Loop' : 'Resume'}</span>
                </button>
              ) : (
                <button
                  onClick={handlePauseResume}
                  className="px-3 py-1 text-xs font-semibold rounded bg-amber-600 hover:bg-amber-500 text-white flex items-center gap-1 transition-all"
                >
                  <span className="material-symbols-outlined text-xs">
                    {isPaused ? 'play_arrow' : 'pause'}
                  </span>
                  <span>{isPaused ? 'Resume' : 'Pause'}</span>
                </button>
              )}

              <button
                onClick={handleStepForward}
                disabled={isRunning || currentStepIndex >= allSteps.length}
                title="Execute Single Step"
                className="px-2 py-1 text-xs rounded border border-gray-700 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-gray-200 flex items-center"
              >
                <span className="material-symbols-outlined text-xs">step</span>
              </button>

              <button
                onClick={handleReset}
                title="Reset Execution Loop"
                className="px-2 py-1 text-xs rounded border border-gray-700 bg-gray-800 hover:bg-gray-700 text-gray-300 flex items-center"
              >
                <span className="material-symbols-outlined text-xs">restart_alt</span>
              </button>

              {/* Speed toggle */}
              <div className="flex items-center bg-gray-900 border border-gray-700/80 rounded px-1.5 py-0.5 text-[11px] font-mono">
                <span className="text-gray-500 mr-1">Speed:</span>
                {[1, 2, 4, 0].map(s => (
                  <button
                    key={s}
                    onClick={() => setPlaybackSpeed(s)}
                    className={`px-1.5 py-0.5 rounded ${
                      playbackSpeed === s ? 'bg-blue-600 text-white font-bold' : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    {s === 0 ? 'MAX' : `${s}x`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* VIEWPORT 1: Autonomous Execution Stream */}
          {activeTab === 'stream' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-xs">
              {visibleSteps.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 text-gray-500">
                  <span className="material-symbols-outlined text-5xl mb-3 text-gray-600 animate-bounce">
                    rocket_launch
                  </span>
                  <h3 className="text-base font-semibold text-gray-300 mb-1">
                    Ready to Execute Mission
                  </h3>
                  <p className="text-xs max-w-md text-gray-400 mb-4">
                    The deterministic GOAP machine is loaded with verified TaskContract permissions. Click "Run Autonomous Loop" or step through individual actions.
                  </p>
                  <button
                    onClick={handleStartMission}
                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold flex items-center gap-2 shadow-lg shadow-blue-900/30"
                  >
                    <span className="material-symbols-outlined text-sm">play_arrow</span>
                    <span>Launch Sandbox Execution</span>
                  </button>
                </div>
              ) : (
                <>
                  {visibleSteps.map((step, idx) => {
                    const isExpanded = expandedStepIds[step.id] ?? true;
                    return (
                      <div
                        key={step.id}
                        className={`rounded-lg border transition-all ${
                          idx === visibleSteps.length - 1 && isRunning
                            ? 'border-blue-500/80 bg-blue-950/20 shadow-md shadow-blue-900/10'
                            : 'border-gray-800/80 bg-[#0e1320]/60'
                        }`}
                      >
                        {/* Step Header */}
                        <div
                          onClick={() => toggleStepExpanded(step.id)}
                          className="px-3.5 py-2.5 flex items-center justify-between cursor-pointer hover:bg-gray-800/40 select-none"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="text-gray-500 font-mono text-[11px]">
                              #{step.stepNumber.toString().padStart(2, '0')}
                            </span>
                            <span className="text-gray-400 font-mono text-[11px]">{step.timestamp}</span>

                            <span
                              className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide border ${
                                step.phase === 'env_init'
                                  ? 'bg-cyan-950 border-cyan-700/60 text-cyan-300'
                                  : step.phase === 'thought'
                                  ? 'bg-purple-950 border-purple-700/60 text-purple-300'
                                  : step.phase === 'terminal'
                                  ? 'bg-emerald-950 border-emerald-700/60 text-emerald-300'
                                  : step.phase === 'tool_call'
                                  ? 'bg-blue-950 border-blue-700/60 text-blue-300'
                                  : step.phase === 'verification'
                                  ? 'bg-amber-950 border-amber-700/60 text-amber-300'
                                  : 'bg-rose-950 border-rose-700/60 text-rose-300'
                              }`}
                            >
                              {step.phase}
                            </span>

                            <span className="font-semibold text-gray-200 text-xs">{step.title}</span>
                          </div>

                          <div className="flex items-center gap-3 text-gray-400 text-[11px]">
                            <span>{step.durationMs}ms</span>
                            <span className="text-gray-500">•</span>
                            <span className="text-sky-400">
                              {(step.tokens.input + step.tokens.output + step.tokens.thinking).toLocaleString()} tok
                            </span>
                            <span className="material-symbols-outlined text-xs">
                              {isExpanded ? 'expand_less' : 'expand_more'}
                            </span>
                          </div>
                        </div>

                        {/* Step Details Body */}
                        {isExpanded && (
                          <div className="px-3.5 pb-3 pt-1 border-t border-gray-800/40 space-y-2.5">
                            {step.thoughtContent && (
                              <div className="bg-[#121828]/80 p-2.5 rounded border border-gray-800 text-gray-300 text-xs leading-relaxed whitespace-pre-wrap font-sans">
                                {step.thoughtContent}
                              </div>
                            )}

                            {step.terminal && (
                              <div className="bg-black/80 rounded border border-gray-800 p-2.5 space-y-1.5">
                                <div className="flex items-center justify-between text-gray-400 text-[11px]">
                                  <span className="text-emerald-400 flex items-center gap-1">
                                    <span className="text-gray-500">$</span> {step.terminal.command}
                                  </span>
                                  <span className="text-[10px] text-gray-500 font-mono">
                                    exit: {step.terminal.exitCode} ({step.terminal.durationMs}ms)
                                  </span>
                                </div>
                                <pre className="text-gray-300 text-[11px] overflow-x-auto whitespace-pre-wrap font-mono p-1 bg-black/40 rounded border border-gray-900">
                                  {step.terminal.stdout}
                                </pre>
                              </div>
                            )}

                            {step.network && (
                              <div className="bg-[#101b2b]/60 rounded border border-blue-900/40 p-2 text-[11px] flex items-center justify-between">
                                <span className="text-blue-300">
                                  PROBE {step.network.method} https://{step.network.host}{step.network.endpoint}
                                </span>
                                <span className="text-emerald-400 font-semibold">
                                  [200 OK] {step.network.reason}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <div ref={streamEndRef} />
                </>
              )}
            </div>
          )}

          {/* VIEWPORT 2: TaskContract & Security Boundary Inspector */}
          {activeTab === 'contract' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-xs">
              {activeContract ? (
                <div className="space-y-4">
                  {/* Contract Header Card */}
                  <div className="p-4 rounded-xl border border-purple-800/60 bg-gradient-to-br from-purple-950/40 via-indigo-950/20 to-[#0e1320] shadow-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-purple-400">verified_user</span>
                        <h3 className="text-sm font-bold text-gray-100">{activeContract.title}</h3>
                        <span className="px-2 py-0.5 rounded bg-purple-900/60 text-purple-300 border border-purple-700/60 text-[10px]">
                          {activeContract.version}
                        </span>
                      </div>
                      <span className="font-mono text-emerald-400 text-xs font-bold">
                        {activeContract.sha256Signature}
                      </span>
                    </div>

                    <p className="text-gray-300 text-xs font-sans leading-relaxed mb-3">
                      {activeContract.goal}
                    </p>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px] pt-3 border-t border-purple-900/40 font-mono">
                      <div>
                        <span className="text-gray-500 block">TARGET REPO:</span>
                        <span className="text-indigo-300 font-semibold">{activeContract.targetRepo}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block">TARGET BACKEND:</span>
                        <span className="text-sky-300 font-semibold">{activeContract.backend}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block">COMPILER:</span>
                        <span className="text-purple-300 font-semibold">AgentSam (Cognitive)</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block">EXECUTOR:</span>
                        <span className="text-emerald-300 font-semibold">agentsam (GOAP)</span>
                      </div>
                    </div>
                  </div>

                  {/* Explicit Permissions Matrix */}
                  <div className="p-4 rounded-xl border border-gray-800 bg-[#0e1422]">
                    <h4 className="text-xs font-bold text-gray-200 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-yellow-400">security</span>
                      Explicit Permissions Matrix
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      {/* FS READ */}
                      <div className="p-3 rounded-lg border border-gray-800 bg-gray-900/70">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-semibold text-gray-300">Filesystem Read:</span>
                          <span className="text-emerald-400 font-bold">ALLOWED</span>
                        </div>
                        <div className="text-[11px] text-gray-400">
                          Allowed Paths: <span className="text-sky-300">{activeContract.permissions.readPaths.join(', ')}</span>
                        </div>
                      </div>

                      {/* FS WRITE */}
                      <div className="p-3 rounded-lg border border-gray-800 bg-gray-900/70">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-semibold text-gray-300">Filesystem Write:</span>
                          <span className={activeContract.permissions.allowFsWrite ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                            {activeContract.permissions.allowFsWrite ? 'ALLOWED' : 'STRICTLY FORBIDDEN'}
                          </span>
                        </div>
                        <div className="text-[11px] text-gray-400">
                          {activeContract.permissions.allowFsWrite
                            ? `Permitted dirs: ${activeContract.permissions.writePaths.join(', ')}`
                            : 'All mutative file operations (write, append, delete) are locked.'}
                        </div>
                      </div>

                      {/* NETWORK EGRESS */}
                      <div className="p-3 rounded-lg border border-gray-800 bg-gray-900/70">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-semibold text-gray-300">Network Egress:</span>
                          <span className="text-emerald-400 font-bold">STRICT ALLOWLIST</span>
                        </div>
                        <div className="text-[11px] text-gray-400">
                          Permitted domains: {activeContract.permissions.allowlistDomains.join(', ')}
                        </div>
                      </div>

                      {/* TERMINAL EXECUTION */}
                      <div className="p-3 rounded-lg border border-gray-800 bg-gray-900/70">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-semibold text-gray-300">Shell Commands:</span>
                          <span className="text-emerald-400 font-bold">AUDIT TOOLS ONLY</span>
                        </div>
                        <div className="text-[11px] text-gray-400">
                          Whitelisted binaries: {activeContract.permissions.allowedCommands.join(', ')}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Verification Criteria */}
                  <div className="p-4 rounded-xl border border-gray-800 bg-[#0e1422]">
                    <h4 className="text-xs font-bold text-gray-200 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-emerald-400">task_alt</span>
                      Verification Criteria
                    </h4>
                    <ul className="space-y-1.5 text-xs text-gray-300">
                      {activeContract.verificationCriteria.map((c, idx) => (
                        <li key={idx} className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-xs text-emerald-400">check</span>
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* VIEWPORT 3: GOAP Planner Graph & State Transitions */}
          {activeTab === 'goap_plan' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-xs">
              {activePlan ? (
                <div className="space-y-4">
                  {/* Plan Overview */}
                  <div className="p-4 rounded-xl border border-emerald-800/60 bg-gradient-to-br from-emerald-950/30 via-slate-950 to-[#0e1320]">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-emerald-400">account_tree</span>
                        <h3 className="text-sm font-bold text-gray-100">GOAP A* Planned Action Graph</h3>
                        <span className="px-2 py-0.5 rounded bg-emerald-900/60 text-emerald-300 text-[10px]">
                          Plan ID: {activePlan.planId}
                        </span>
                      </div>
                      <span className="text-emerald-400 font-bold">
                        Total Heuristic Cost: {activePlan.totalCost}
                      </span>
                    </div>
                    <p className="text-gray-300 text-xs font-sans">
                      Deterministic sequence synthesized from Goal State requirements and action preconditions.
                    </p>
                  </div>

                  {/* Action Sequence Nodes */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                      Optimal Action Sequence ({activePlan.actions.length} Actions)
                    </h4>
                    {activePlan.actions.map((act, idx) => {
                      const isExecuted = idx < currentStepIndex;
                      return (
                        <div
                          key={act.id}
                          className={`p-3 rounded-lg border transition-all ${
                            isExecuted
                              ? 'bg-emerald-950/20 border-emerald-700/60'
                              : 'bg-gray-900/60 border-gray-800'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center font-bold text-[10px] text-gray-300">
                                {idx + 1}
                              </span>
                              <span className="font-bold text-gray-200 text-xs">{act.name}</span>
                              <span className="px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 text-[9px] uppercase">
                                {act.phase}
                              </span>
                            </div>
                            <span className="text-gray-400 font-mono text-[11px]">Cost: {act.cost}</span>
                          </div>

                          <p className="text-gray-400 text-[11px] mb-2">{act.description}</p>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[10px] bg-black/40 p-2 rounded border border-gray-900">
                            <div>
                              <span className="text-gray-500 block">PRECONDITIONS:</span>
                              <span className="text-purple-300">
                                {JSON.stringify(act.preconditions)}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500 block">EFFECTS:</span>
                              <span className="text-emerald-300">
                                {JSON.stringify(act.effects)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Live World State Transitions */}
                  <div className="p-4 rounded-xl border border-gray-800 bg-[#0e1422]">
                    <h4 className="text-xs font-bold text-gray-200 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-sky-400">tune</span>
                      Live World State Invariants
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                      {Object.entries(worldState).map(([k, v]) => (
                        <div key={k} className="p-2 rounded bg-gray-900/80 border border-gray-800">
                          <span className="text-gray-400 font-mono text-[10px] block truncate">{k}</span>
                          <span className={`font-bold font-mono ${v ? 'text-emerald-400' : 'text-gray-600'}`}>
                            {v ? 'TRUE' : 'FALSE'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* VIEWPORT 4: Network Egress Firewall Logs */}
          {activeTab === 'network' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-xs">
              <div className="p-4 rounded-xl border border-amber-800/60 bg-[#161208]">
                <h3 className="text-sm font-bold text-amber-300 mb-1 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm">security</span>
                  Network Egress Policy & Firewall Verification
                </h3>
                <p className="text-gray-300 text-xs font-sans">
                  All sandbox connections are inspected by the kernel egress filter. Outbound requests outside the designated package allowlist are immediately blocked and logged.
                </p>
              </div>

              <div className="space-y-2">
                {[
                  { host: 'files.pythonhosted.org', ip: '151.101.1.63', status: 200, rule: 'PASS (Allowlisted Registry)' },
                  { host: 'registry.npmjs.org', ip: '104.16.16.35', status: 200, rule: 'PASS (Allowlisted Registry)' },
                  { host: 'github.com', ip: '140.82.113.3', status: 200, rule: 'PASS (Version Control Root)' },
                  { host: '198.51.100.44', ip: '198.51.100.44', status: 403, rule: 'DROP (Arbitrary IP Exfiltration Blocked)' },
                  { host: 'unknown-exfil.org', ip: '203.0.113.99', status: 403, rule: 'DROP (Egress Policy Violation)' },
                ].map((log, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded-lg border flex items-center justify-between ${
                      log.status === 200
                        ? 'bg-emerald-950/20 border-emerald-800/60 text-emerald-300'
                        : 'bg-rose-950/20 border-rose-800/60 text-rose-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm">
                        {log.status === 200 ? 'check_circle' : 'block'}
                      </span>
                      <span className="font-bold">{log.host}</span>
                      <span className="text-gray-500 font-mono text-[10px]">({log.ip})</span>
                    </div>
                    <span className="font-semibold text-xs">{log.rule}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VIEWPORT 5: SVG Architecture Map */}
          {activeTab === 'artifacts' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs font-mono">
              <div className="p-4 rounded-xl border border-sky-800/60 bg-[#0d1626]">
                <h3 className="text-sm font-bold text-sky-300 mb-1 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm">schema</span>
                  Generated Architecture Map & Consolidation Topology
                </h3>
                <p className="text-gray-300 text-xs font-sans">
                  Synthesized vector topology showing single authoritative ACP identity boundary.
                </p>
              </div>

              {/* Render SVG */}
              <div
                className="bg-black/90 p-4 rounded-xl border border-gray-800 flex items-center justify-center overflow-x-auto"
                dangerouslySetInnerHTML={{ __html: missionReport.architectureSvg }}
              />
            </div>
          )}
        </section>

        {/* RIGHT COLUMN: Live Telemetry & Mission Cockpit */}
        <aside className="w-full md:w-80 lg:w-96 flex-shrink-0 bg-[#0c101c] p-4 flex flex-col gap-4 overflow-y-auto border-t md:border-t-0 md:border-l border-gray-800/80">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-200 tracking-wider">
            <span className="material-symbols-outlined text-sm text-sky-400">analytics</span>
            <span>LIVE TELEMETRY COCKPIT</span>
          </div>

          {/* Realtime Numbers */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-3 rounded-xl border border-gray-800 bg-[#0e1422]">
              <span className="text-[10px] text-gray-400 uppercase font-mono block">TOTAL TOKENS</span>
              <span className="text-base text-sky-400 font-bold font-mono">
                {telemetry.totalTokens.toLocaleString()}
              </span>
              <div className="text-[10px] text-gray-500 font-mono mt-1">
                In: {telemetry.input.toLocaleString()} | Out: {telemetry.output.toLocaleString()}
              </div>
            </div>

            <div className="p-3 rounded-xl border border-gray-800 bg-[#0e1422]">
              <span className="text-[10px] text-gray-400 uppercase font-mono block">ESTIMATED RUN COST</span>
              <span className="text-base text-emerald-400 font-bold font-mono">
                ${telemetry.totalCost.toFixed(4)}
              </span>
              <div className="text-[10px] text-gray-500 font-mono mt-1">
                Model: ${telemetry.modelCost.toFixed(4)}
              </div>
            </div>

            <div className="p-3 rounded-xl border border-gray-800 bg-[#0e1422]">
              <span className="text-[10px] text-gray-400 uppercase font-mono block">DURATION</span>
              <span className="text-base text-gray-200 font-bold font-mono">
                {(telemetry.durationMs / 1000).toFixed(2)}s
              </span>
              <div className="text-[10px] text-gray-500 font-mono mt-1">
                Steps: {visibleSteps.length}/{allSteps.length}
              </div>
            </div>

            <div className="p-3 rounded-xl border border-gray-800 bg-[#0e1422]">
              <span className="text-[10px] text-gray-400 uppercase font-mono block">TOOL CALLS</span>
              <span className="text-base text-indigo-300 font-bold font-mono">
                {telemetry.toolCallsCount + telemetry.terminalCallsCount}
              </span>
              <div className="text-[10px] text-gray-500 font-mono mt-1">
                Term: {telemetry.terminalCallsCount} | AST: {telemetry.toolCallsCount}
              </div>
            </div>
          </div>

          {/* Pricing Model Reference */}
          <div className="p-3 rounded-xl border border-gray-800/80 bg-[#0e1422] space-y-1.5 text-xs font-mono">
            <div className="text-gray-300 font-bold text-[11px] mb-1">Gemini 3.7 Flash Model Rates</div>
            <div className="flex justify-between text-gray-400 text-[11px]">
              <span>Input Tokens:</span>
              <span className="text-gray-200">$0.75 / 1M</span>
            </div>
            <div className="flex justify-between text-gray-400 text-[11px]">
              <span>Output & Thinking:</span>
              <span className="text-gray-200">$3.75 / 1M</span>
            </div>
            <div className="flex justify-between text-gray-400 text-[11px] pt-1 border-t border-gray-800">
              <span>{BACKEND_CONFIGS[selectedBackend].name}:</span>
              <span className="text-emerald-400 font-bold">
                ${BACKEND_CONFIGS[selectedBackend].computeCostPerHour.toFixed(3)}/hr
              </span>
            </div>
          </div>

          {/* Quick Shortcuts */}
          <div className="space-y-1.5">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
              Shortcuts & Artifacts
            </div>
            <button
              onClick={() => setActiveTab('contract')}
              className="w-full px-3 py-2 rounded-lg border border-purple-800/60 bg-purple-950/20 hover:bg-purple-900/30 text-purple-200 text-xs flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">verified_user</span>
                <span>Inspect TaskContract</span>
              </span>
              <span className="material-symbols-outlined text-xs">arrow_forward</span>
            </button>

            <button
              onClick={() => setActiveTab('goap_plan')}
              className="w-full px-3 py-2 rounded-lg border border-emerald-800/60 bg-emerald-950/20 hover:bg-emerald-900/30 text-emerald-200 text-xs flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">account_tree</span>
                <span>View GOAP Graph</span>
              </span>
              <span className="material-symbols-outlined text-xs">arrow_forward</span>
            </button>

            <button
              onClick={() => setActiveTab('artifacts')}
              className="w-full px-3 py-2 rounded-lg border border-sky-800/60 bg-sky-950/20 hover:bg-sky-900/30 text-sky-200 text-xs flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">schema</span>
                <span>Architecture SVG</span>
              </span>
              <span className="material-symbols-outlined text-xs">arrow_forward</span>
            </button>
          </div>
        </aside>
      </div>

      {/* ACP Auth & OAuth Credentials Modal */}
      <AcpAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthChange={() => {
          AcpService.getAuthStatus().then(setAuthStatus);
        }}
      />
    </div>
  );
};
