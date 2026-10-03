import React, { useState } from 'react';
import { AgentMessage, ToolReceipt, ToolPermissionRequest, ModelOption } from '@inneranimalmedia/agentsam-contracts';

/**
 * Reusable AgentThread component
 */
export const AgentThread: React.FC<{
  messages: AgentMessage[];
  receipts?: ToolReceipt[];
  onApprovePermission?: (requestId: string) => void;
  pendingRequests?: ToolPermissionRequest[];
}> = ({ messages, receipts = [], onApprovePermission, pendingRequests = [] }) => {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3 font-sans text-xs">
      {messages.map(msg => (
        <div
          key={msg.id}
          className={`p-3 rounded-xl border max-w-2xl ${
            msg.role === 'user'
              ? 'ml-auto bg-blue-950/40 border-blue-800/60 text-blue-100'
              : 'mr-auto bg-[#0d1322] border-gray-800 text-gray-200'
          }`}
        >
          <div className="flex items-center justify-between mb-1 text-[10px] text-gray-500 font-mono">
            <span className="uppercase font-bold">{msg.role}</span>
            <span>{new Date(msg.timestamp).toLocaleTimeString()}</span>
          </div>
          <div className="leading-relaxed whitespace-pre-wrap">
            {typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)}
          </div>
        </div>
      ))}

      {/* Tool Receipts rendered inline */}
      {receipts.map(rcpt => (
        <div key={rcpt.callId} className="p-3 rounded-lg border border-gray-800 bg-black/60 font-mono text-[11px] space-y-1">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">task_alt</span>
              Receipt: {rcpt.tool}
            </span>
            <span>{rcpt.durationMs}ms</span>
          </div>
          {rcpt.stdout && (
            <pre className="text-gray-300 text-[10px] bg-black/40 p-2 rounded border border-gray-900 overflow-x-auto">
              {rcpt.stdout}
            </pre>
          )}
        </div>
      ))}

      {/* Permission Requests */}
      {pendingRequests.map(req => (
        <div key={req.id} className="p-3 rounded-xl border border-yellow-800/80 bg-yellow-950/30 text-yellow-200 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm">shield</span>
              Permission Request: {req.tool}
            </span>
            <span className="px-1.5 py-0.2 rounded bg-yellow-900/60 text-[10px] uppercase font-mono font-bold">
              {req.riskLevel}
            </span>
          </div>
          <p className="text-xs text-yellow-300/80">{req.reason}</p>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => onApprovePermission?.(req.id)}
              className="px-3 py-1 bg-yellow-600 hover:bg-yellow-500 text-black font-bold rounded text-xs transition-colors"
            >
              Authorize Action
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * Reusable Composer component
 */
export const Composer: React.FC<{
  value: string;
  onChange: (val: string) => void;
  onSend: (text: string) => void;
  isLoading?: boolean;
  models: ModelOption[];
  selectedModelId: string;
  onSelectModel: (id: string) => void;
  onToggleVoice?: () => void;
  isVoiceActive?: boolean;
}> = ({
  value,
  onChange,
  onSend,
  isLoading = false,
  models,
  selectedModelId,
  onSelectModel,
  onToggleVoice,
  isVoiceActive = false,
}) => {
  return (
    <div className="p-3 border-t border-gray-800 bg-[#0c101a] space-y-2">
      {/* Top bar of composer: Model selector & options */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="text-gray-500 text-[11px] font-mono">Model:</span>
          <select
            value={selectedModelId}
            onChange={e => onSelectModel(e.target.value)}
            className="bg-gray-900 border border-gray-700/80 rounded px-2 py-0.5 text-xs text-sky-400 font-mono focus:outline-none"
          >
            {models.map(m => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.provider})
              </option>
            ))}
          </select>
        </div>

        {onToggleVoice && (
          <button
            onClick={onToggleVoice}
            className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 transition-all ${
              isVoiceActive ? 'bg-rose-900/50 border-rose-500 text-rose-300 animate-pulse' : 'bg-gray-800 border-gray-700 text-gray-300'
            }`}
          >
            <span className="material-symbols-outlined text-xs">
              {isVoiceActive ? 'mic' : 'mic_none'}
            </span>
          </button>
        )}
      </div>

      {/* Textarea & submit */}
      <div className="flex gap-2">
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if (value.trim()) onSend(value);
            }
          }}
          placeholder="Ask AgentSam or type machine command..."
          rows={2}
          className="flex-1 bg-gray-950 border border-gray-800 focus:border-blue-500 rounded-lg p-2.5 text-xs text-gray-200 placeholder-gray-500 focus:outline-none resize-none font-mono"
        />
        <button
          onClick={() => {
            if (value.trim()) onSend(value);
          }}
          disabled={isLoading || !value.trim()}
          className="px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-lg font-semibold text-xs flex items-center justify-center transition-all shadow-md shadow-blue-900/40"
        >
          {isLoading ? (
            <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
          ) : (
            <span className="material-symbols-outlined text-base">send</span>
          )}
        </button>
      </div>
    </div>
  );
};
