import React, { useState, useRef, useEffect } from 'react';
import {
  ChatModel,
  ChatMessage,
  CHAT_ROLE_PRESETS,
  ChatRolePreset,
  streamChatMessage
} from '../../services/geminiAiStudioService';

interface GeminiChatbotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertCodeIntoPage?: (code: string) => void;
}

export const GeminiChatbotModal: React.FC<GeminiChatbotModalProps> = ({
  isOpen,
  onClose,
  onInsertCodeIntoPage
}) => {
  const [selectedModel, setSelectedModel] = useState<ChatModel>('gemini-3.5-flash');
  const [selectedRole, setSelectedRole] = useState<string>('web-architect');
  const [customSystemPrompt, setCustomSystemPrompt] = useState<string>('');
  const [isEditingRole, setIsEditingRole] = useState<boolean>(false);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      role: 'model',
      text: "Hello! I'm your Gemini AI companion. You can switch models between **gemini-3.1-flash-lite** (fast), **gemini-3.5-flash** (general), and **gemini-3.1-pro-preview** (complex reasoning), or assign me specific roles below. How can I help you today?",
      timestamp: Date.now(),
      model: 'gemini-3.5-flash'
    }
  ]);

  const [inputPrompt, setInputPrompt] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [activeTokens, setActiveTokens] = useState<{ input: number; output: number }>({ input: 0, output: 0 });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Auto-scroll to bottom of thread
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isStreaming, isOpen]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  const activeRolePreset: ChatRolePreset | undefined = CHAT_ROLE_PRESETS.find(r => r.id === selectedRole);
  const effectiveSystemPrompt = customSystemPrompt || activeRolePreset?.systemInstruction || '';

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputPrompt.trim();
    if (!trimmed || isStreaming) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: trimmed,
      timestamp: Date.now(),
    };

    const modelMsgId = `model-${Date.now()}`;
    const modelMsgPlaceholder: ChatMessage = {
      id: modelMsgId,
      role: 'model',
      text: '',
      timestamp: Date.now(),
      model: selectedModel,
    };

    setMessages(prev => [...prev, userMsg, modelMsgPlaceholder]);
    setInputPrompt('');
    setIsStreaming(true);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      let accumulatedText = '';
      let lastInputTokens = 0;
      let lastOutputTokens = 0;

      const stream = streamChatMessage(
        messages,
        trimmed,
        selectedModel,
        effectiveSystemPrompt,
        abortController.signal
      );

      for await (const update of stream) {
        accumulatedText += update.chunk;
        if (update.inputTokens) lastInputTokens = update.inputTokens;
        if (update.outputTokens) lastOutputTokens = update.outputTokens;

        setActiveTokens({ input: lastInputTokens, output: lastOutputTokens });

        setMessages(prev =>
          prev.map(msg =>
            msg.id === modelMsgId
              ? { ...msg, text: accumulatedText, tokenUsage: { input: lastInputTokens, output: lastOutputTokens } }
              : msg
          )
        );
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setMessages(prev =>
          prev.map(msg =>
            msg.id === modelMsgId
              ? { ...msg, text: `⚠️ Error generating response: ${err.message || err}` }
              : msg
          )
        );
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const handleStopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
    }
  };

  const handleClearHistory = () => {
    if (confirm('Clear entire conversation history?')) {
      setMessages([
        {
          id: 'welcome-new',
          role: 'model',
          text: 'Conversation history cleared. Ready for a new topic!',
          timestamp: Date.now(),
          model: selectedModel
        }
      ]);
    }
  };

  const handleCopyMessage = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (!isOpen) return null;

  return (
    <div className="gemini-modal-backdrop" onClick={onClose}>
      <div className="gemini-modal-container chat-container" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="gemini-modal-header">
          <div className="gemini-header-title-group">
            <div className="gemini-brand-icon chat-icon">
              <span className="material-symbols-outlined" style={{ fontSize: '24px', color: '#8ab4f8' }}>
                voice_chat
              </span>
            </div>
            <div>
              <h2 className="gemini-header-title">Gemini Multi-Turn Chatbot</h2>
              <p className="gemini-header-subtitle">
                Powered by Gemini 3.1 Pro, 3.5 Flash, and 3.1 Flash-Lite
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Model Selector */}
            <div className="gemini-model-badge-selector">
              <span className="material-symbols-outlined text-xs text-sky-400">tune</span>
              <select
                value={selectedModel}
                onChange={e => setSelectedModel(e.target.value as ChatModel)}
                className="gemini-select-pill"
                title="Select Gemini Engine"
              >
                <option value="gemini-3.1-flash-lite">⚡ 3.1 Flash-Lite (Fastest)</option>
                <option value="gemini-3.5-flash">🚀 3.5 Flash (General / Balanced)</option>
                <option value="gemini-3.1-pro-preview">🧠 3.1 Pro Preview (Complex Tasks)</option>
              </select>
            </div>

            <button
              onClick={handleClearHistory}
              className="gemini-btn-subtle"
              title="Clear conversation"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                delete_sweep
              </span>
            </button>

            <button
              onClick={onClose}
              className="gemini-modal-close-btn"
              aria-label="Close Chat"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                close
              </span>
            </button>
          </div>
        </div>

        {/* Roles Toolbar */}
        <div className="gemini-chat-roles-bar">
          <div className="flex items-center gap-1 overflow-x-auto py-1 max-w-full">
            <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider mr-2 whitespace-nowrap">
              Role:
            </span>
            {CHAT_ROLE_PRESETS.map(preset => (
              <button
                key={preset.id}
                onClick={() => {
                  setSelectedRole(preset.id);
                  setCustomSystemPrompt('');
                  setIsEditingRole(false);
                }}
                className={`gemini-role-chip ${selectedRole === preset.id && !customSystemPrompt ? 'active' : ''}`}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                  {preset.icon}
                </span>
                <span>{preset.title}</span>
              </button>
            ))}
            <button
              onClick={() => setIsEditingRole(!isEditingRole)}
              className={`gemini-role-chip custom ${isEditingRole || customSystemPrompt ? 'active' : ''}`}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                edit_note
              </span>
              <span>{customSystemPrompt ? 'Custom Role ✏️' : 'Custom...'}</span>
            </button>
          </div>

          {/* Token telemetry indicator */}
          <div className="text-xs text-gray-400 font-mono flex items-center gap-2 whitespace-nowrap">
            <span className="text-sky-300">In: {activeTokens.input}</span>
            <span className="text-emerald-300">Out: {activeTokens.output}</span>
          </div>
        </div>

        {/* Custom Role Editor Popup/Drawer */}
        {isEditingRole && (
          <div className="gemini-custom-role-drawer">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-sky-400 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">psychology</span>
                CUSTOM SYSTEM INSTRUCTION
              </label>
              <button
                onClick={() => setIsEditingRole(false)}
                className="text-xs text-gray-400 hover:text-white"
              >
                Done
              </button>
            </div>
            <textarea
              value={customSystemPrompt || activeRolePreset?.systemInstruction || ''}
              onChange={e => setCustomSystemPrompt(e.target.value)}
              placeholder="Define specific role guidelines, constraints, and personality for the chatbot..."
              rows={2}
              className="gemini-textarea-styled"
            />
          </div>
        )}

        {/* Message Thread */}
        <div className="gemini-chat-thread">
          {messages.map((msg, index) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id || index}
                className={`gemini-chat-message-row ${isUser ? 'user-row' : 'model-row'}`}
              >
                {!isUser && (
                  <div className="gemini-avatar model-avatar">
                    <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#8ab4f8' }}>
                      smart_toy
                    </span>
                  </div>
                )}

                <div className={`gemini-message-bubble ${isUser ? 'user-bubble' : 'model-bubble'}`}>
                  {/* Model header info */}
                  {!isUser && (
                    <div className="gemini-msg-header">
                      <span className="gemini-msg-model-name">
                        {msg.model ? msg.model.replace('-preview', '') : selectedModel}
                      </span>
                      <span className="gemini-msg-time">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  )}

                  {/* Message Content */}
                  <div className="gemini-msg-body">
                    {msg.text ? (
                      <div className="whitespace-pre-wrap leading-relaxed">{msg.text}</div>
                    ) : isStreaming && index === messages.length - 1 ? (
                      <div className="gemini-thinking-dots">
                        <span className="dot" />
                        <span className="dot" />
                        <span className="dot" />
                      </div>
                    ) : null}
                  </div>

                  {/* Message Action Bar */}
                  <div className="gemini-msg-actions">
                    <button
                      onClick={() => handleCopyMessage(msg.text)}
                      className="gemini-msg-action-btn"
                      title="Copy message"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                        content_copy
                      </span>
                    </button>
                    {!isUser && onInsertCodeIntoPage && msg.text.includes('<') && (
                      <button
                        onClick={() => onInsertCodeIntoPage(msg.text)}
                        className="gemini-msg-action-btn highlight"
                        title="Load into browser tab"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                          open_in_browser
                        </span>
                        <span>Open in Browser</span>
                      </button>
                    )}
                  </div>
                </div>

                {isUser && (
                  <div className="gemini-avatar user-avatar">
                    <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#fff' }}>
                      person
                    </span>
                  </div>
                )}
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="gemini-chat-input-bar">
          <form onSubmit={handleSendMessage} className="gemini-chat-form">
            <textarea
              ref={inputRef}
              value={inputPrompt}
              onChange={e => setInputPrompt(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={`Message Gemini (${selectedModel})... (Press Enter to send, Shift+Enter for new line)`}
              rows={2}
              className="gemini-chat-textarea"
              disabled={isStreaming}
            />

            <div className="gemini-input-actions">
              {isStreaming ? (
                <button
                  type="button"
                  onClick={handleStopStreaming}
                  className="gemini-btn-stop"
                  title="Stop generating"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                    stop
                  </span>
                  <span>Stop</span>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!inputPrompt.trim()}
                  className="gemini-btn-send"
                  title="Send message"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                    send
                  </span>
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
