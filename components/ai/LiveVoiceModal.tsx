import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  AVAILABLE_VOICES,
  VoiceOption,
  LiveVoiceMessage,
  sendVoiceTurn
} from '../../services/geminiAiStudioService';

interface LiveVoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LiveVoiceModal: React.FC<LiveVoiceModalProps> = ({ isOpen, onClose }) => {
  const [selectedVoice, setSelectedVoice] = useState<string>('Zephyr');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  const [conversation, setConversation] = useState<LiveVoiceMessage[]>([
    {
      id: 'intro-1',
      speaker: 'model',
      text: "Hi there! I'm connected via Gemini 3.1 Flash Live Preview. Tap Start Conversation and speak into your microphone to have a real-time voice conversation.",
      timestamp: Date.now(),
    }
  ]);

  const [currentInterimText, setCurrentInterimText] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const audioSourceNodeRef = useRef<AudioBufferSourceNode | null>(null);

  // Stop any ongoing audio playback
  const stopAudioPlayback = useCallback(() => {
    if (audioSourceNodeRef.current) {
      try {
        audioSourceNodeRef.current.stop();
      } catch (e) {
        // ignore
      }
      audioSourceNodeRef.current = null;
    }
    if (window.speechSynthesis && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, []);

  // Play audio base64 or synthesize speech
  const playModelAudio = useCallback(async (text: string, audioBase64?: string) => {
    stopAudioPlayback();
    setIsSpeaking(true);

    if (audioBase64) {
      try {
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
            sampleRate: 24000
          });
        }
        const ctx = audioContextRef.current;
        if (ctx.state === 'suspended') {
          await ctx.resume();
        }

        // Convert base64 to binary
        const binaryString = atob(audioBase64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        // If raw PCM 24kHz
        const numChannels = 1;
        const sampleRate = 24000;
        const int16 = new Int16Array(bytes.buffer, bytes.byteOffset, Math.floor(bytes.byteLength / 2));
        const audioBuffer = ctx.createBuffer(numChannels, int16.length, sampleRate);
        const channelData = audioBuffer.getChannelData(0);

        for (let i = 0; i < int16.length; i++) {
          channelData[i] = int16[i] / 32768.0;
        }

        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        source.onended = () => {
          setIsSpeaking(false);
          audioSourceNodeRef.current = null;
        };
        audioSourceNodeRef.current = source;
        source.start();
        return;
      } catch (audioErr) {
        console.warn('PCM AudioContext decode error, falling back to WebSpeech:', audioErr);
      }
    }

    // Web Speech Fallback
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    } else {
      setIsSpeaking(false);
    }
  }, [stopAudioPlayback]);

  // Handle user speech turn
  const handleUserSpoken = useCallback(async (spokenText: string) => {
    const trimmed = spokenText.trim();
    if (!trimmed) return;

    const userMsg: LiveVoiceMessage = {
      id: `user-${Date.now()}`,
      speaker: 'user',
      text: trimmed,
      timestamp: Date.now(),
    };

    setConversation(prev => [...prev, userMsg]);
    setCurrentInterimText('');

    try {
      const response = await sendVoiceTurn(trimmed, conversation, selectedVoice);

      const modelMsg: LiveVoiceMessage = {
        id: `model-${Date.now()}`,
        speaker: 'model',
        text: response.text,
        timestamp: Date.now(),
      };

      setConversation(prev => [...prev, modelMsg]);
      await playModelAudio(response.text, response.audioBase64);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error processing live voice turn.');
    }
  }, [conversation, selectedVoice, playModelAudio]);

  // Start Voice Session
  const startLiveSession = useCallback(() => {
    setErrorMessage('');
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setErrorMessage('Speech recognition is not supported in this browser. Please use Chrome/Edge or open in a new tab.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsConnected(true);
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            const finalTranscript = event.results[i][0].transcript;
            handleUserSpoken(finalTranscript);
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        setCurrentInterimText(interim);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setErrorMessage('Microphone access was denied. Please allow microphone permissions.');
          setIsConnected(false);
          setIsListening(false);
        }
      };

      recognition.onend = () => {
        if (isConnected && !isMuted) {
          try {
            recognition.start();
          } catch (e) {
            // ignore
          }
        } else {
          setIsListening(false);
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (e: any) {
      setErrorMessage('Failed to start microphone: ' + e.message);
    }
  }, [isConnected, isMuted, handleUserSpoken]);

  // Stop Voice Session
  const stopLiveSession = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // ignore
      }
      recognitionRef.current = null;
    }
    stopAudioPlayback();
    setIsConnected(false);
    setIsListening(false);
    setCurrentInterimText('');
  }, [stopAudioPlayback]);

  // Canvas visualizer animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let phase = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const width = canvas.width;
      const height = canvas.height;
      const centerY = height / 2;

      // Base glow circle in center
      const grad = ctx.createRadialGradient(width / 2, centerY, 10, width / 2, centerY, 80);
      if (isSpeaking) {
        grad.addColorStop(0, 'rgba(138, 180, 248, 0.4)');
        grad.addColorStop(1, 'rgba(138, 180, 248, 0)');
      } else if (isListening) {
        grad.addColorStop(0, 'rgba(129, 201, 149, 0.35)');
        grad.addColorStop(1, 'rgba(129, 201, 149, 0)');
      } else {
        grad.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
        grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      }

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(width / 2, centerY, 80, 0, Math.PI * 2);
      ctx.fill();

      // Waveform bars
      const numBars = 32;
      const barWidth = 4;
      const spacing = 8;
      const startX = (width - (numBars * (barWidth + spacing))) / 2;

      for (let i = 0; i < numBars; i++) {
        let amp = 6;
        if (isSpeaking) {
          amp = 18 + Math.sin(phase + i * 0.4) * 16 + Math.cos(phase * 1.5 + i * 0.2) * 10;
        } else if (isListening) {
          amp = 10 + Math.sin(phase * 0.8 + i * 0.3) * 8;
        }

        const x = startX + i * (barWidth + spacing);
        const barHeight = Math.max(4, amp);
        const y = centerY - barHeight / 2;

        ctx.fillStyle = isSpeaking ? '#8ab4f8' : isListening ? '#81c995' : '#5f6368';
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 2);
        ctx.fill();
      }

      phase += 0.08;
      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isSpeaking, isListening]);

  // Clean up on unmount or close
  useEffect(() => {
    if (!isOpen) {
      stopLiveSession();
    }
  }, [isOpen, stopLiveSession]);

  if (!isOpen) return null;

  return (
    <div className="gemini-modal-backdrop" onClick={onClose}>
      <div className="gemini-modal-container live-voice-container" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="gemini-modal-header">
          <div className="gemini-header-title-group">
            <div className="gemini-brand-icon live-icon">
              <span className="material-symbols-outlined" style={{ fontSize: '24px', color: '#81c995' }}>
                audio_spark
              </span>
            </div>
            <div>
              <h2 className="gemini-header-title">Gemini Live Voice Conversation</h2>
              <p className="gemini-header-subtitle">
                Model: <code>gemini-3.1-flash-live-preview</code> (Real-Time Audio API)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Voice Persona Selector */}
            <div className="gemini-voice-selector-wrap">
              <span className="material-symbols-outlined text-xs text-emerald-400">record_voice_over</span>
              <select
                value={selectedVoice}
                onChange={e => setSelectedVoice(e.target.value)}
                className="gemini-select-pill"
                title="Select Voice Preset"
              >
                {AVAILABLE_VOICES.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.gender})
                  </option>
                ))}
              </select>
            </div>

            <button onClick={onClose} className="gemini-modal-close-btn" aria-label="Close Live Voice">
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                close
              </span>
            </button>
          </div>
        </div>

        {/* Visualizer Hero Section */}
        <div className="gemini-live-visualizer-card">
          <canvas ref={canvasRef} width={540} height={140} className="gemini-live-canvas" />

          {/* Status Badge */}
          <div className="gemini-live-status-row">
            <div className={`gemini-live-status-pill ${isConnected ? (isSpeaking ? 'speaking' : 'listening') : 'idle'}`}>
              <span className="status-indicator-dot" />
              <span>
                {!isConnected
                  ? 'Ready to Connect'
                  : isSpeaking
                  ? `Gemini Speaking (${selectedVoice})...`
                  : 'Listening to your voice...'}
              </span>
            </div>
            {isConnected && (
              <button
                onClick={stopAudioPlayback}
                disabled={!isSpeaking}
                className="gemini-btn-subtle text-xs"
                title="Interrupt / Stop voice response"
              >
                <span className="material-symbols-outlined text-sm">front_hand</span>
                <span>Interrupt</span>
              </button>
            )}
          </div>

          {/* Interim transcript while user speaks */}
          {currentInterimText && (
            <div className="gemini-interim-text-badge">
              <span className="material-symbols-outlined text-xs text-sky-400 animate-pulse">mic</span>
              <span>"{currentInterimText}..."</span>
            </div>
          )}

          {errorMessage && (
            <div className="gemini-error-banner">
              <span className="material-symbols-outlined text-sm">error</span>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Large Live Control Action Bar */}
          <div className="gemini-live-actions-bar">
            {!isConnected ? (
              <button onClick={startLiveSession} className="gemini-live-start-btn">
                <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>
                  mic
                </span>
                <span>Start Live Voice Conversation</span>
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className={`gemini-live-mute-btn ${isMuted ? 'muted' : ''}`}
                  title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                    {isMuted ? 'mic_off' : 'mic'}
                  </span>
                  <span>{isMuted ? 'Unmute' : 'Mute'}</span>
                </button>

                <button onClick={stopLiveSession} className="gemini-live-stop-btn">
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                    call_end
                  </span>
                  <span>End Voice Session</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Live Conversation Transcript Feed */}
        <div className="gemini-live-transcript-section">
          <div className="gemini-section-header">
            <span className="material-symbols-outlined text-sm text-gray-400">forum</span>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Live Transcript & Turn Log
            </span>
          </div>

          <div className="gemini-live-transcript-list">
            {conversation.map(msg => (
              <div
                key={msg.id}
                className={`gemini-live-turn-item ${msg.speaker === 'user' ? 'user-turn' : 'model-turn'}`}
              >
                <div className="gemini-turn-avatar">
                  <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                    {msg.speaker === 'user' ? 'person' : 'smart_toy'}
                  </span>
                </div>
                <div className="gemini-turn-content">
                  <div className="gemini-turn-header">
                    <span className="font-semibold text-xs text-gray-200">
                      {msg.speaker === 'user' ? 'You' : `Gemini Live (${selectedVoice})`}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                  <p className="gemini-turn-text">{msg.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
