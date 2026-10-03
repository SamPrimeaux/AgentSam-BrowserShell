import React, { useState, useEffect } from 'react';
import { GeminiChatbotModal } from './GeminiChatbotModal';
import { LiveVoiceModal } from './LiveVoiceModal';
import { ImageStudioModal } from './ImageStudioModal';
import { VeoVideoModal } from './VeoVideoModal';

export type AiStudioTab = 'chat' | 'voice' | 'image' | 'video' | 'animate';

interface GeminiAiHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: AiStudioTab;
  onInsertIntoPage?: (content: string) => void;
}

export const GeminiAiHubModal: React.FC<GeminiAiHubModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'chat',
  onInsertIntoPage
}) => {
  const [activeTab, setActiveTab] = useState<AiStudioTab>(initialTab);

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  return (
    <div className="gemini-ai-hub-wrapper">
      {/* Top Global Quick Switcher Bar */}
      <div className="gemini-global-hub-switcher" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-1.5 p-1 bg-[#1e1f20] border border-[#3c4043] rounded-full shadow-2xl">
          <button
            onClick={() => setActiveTab('chat')}
            className={`gemini-hub-nav-pill ${activeTab === 'chat' ? 'active chat' : ''}`}
            title="Gemini Multi-Turn Chatbot"
          >
            <span className="material-symbols-outlined text-sm">voice_chat</span>
            <span>Gemini Chat</span>
          </button>

          <button
            onClick={() => setActiveTab('voice')}
            className={`gemini-hub-nav-pill ${activeTab === 'voice' ? 'active voice' : ''}`}
            title="Live Voice Conversation (Live API)"
          >
            <span className="material-symbols-outlined text-sm">audio_spark</span>
            <span>Live Voice</span>
          </button>

          <button
            onClick={() => setActiveTab('image')}
            className={`gemini-hub-nav-pill ${activeTab === 'image' ? 'active image' : ''}`}
            title="Create & Edit Images"
          >
            <span className="material-symbols-outlined text-sm">image_edit_auto</span>
            <span>Create & Edit Images</span>
          </button>

          <button
            onClick={() => setActiveTab('video')}
            className={`gemini-hub-nav-pill ${activeTab === 'video' ? 'active video' : ''}`}
            title="Generate Video from Text (Veo 3)"
          >
            <span className="material-symbols-outlined text-sm">video_spark</span>
            <span>Veo 3 Video</span>
          </button>

          <button
            onClick={() => setActiveTab('animate')}
            className={`gemini-hub-nav-pill ${activeTab === 'animate' ? 'active animate' : ''}`}
            title="Animate Photo into Video (Veo 3)"
          >
            <span className="material-symbols-outlined text-sm">movie</span>
            <span>Animate Photo</span>
          </button>
        </div>
      </div>

      {/* Render Active Studio */}
      {activeTab === 'chat' && (
        <GeminiChatbotModal
          isOpen={true}
          onClose={onClose}
          onInsertCodeIntoPage={onInsertIntoPage}
        />
      )}

      {activeTab === 'voice' && (
        <LiveVoiceModal
          isOpen={true}
          onClose={onClose}
        />
      )}

      {activeTab === 'image' && (
        <ImageStudioModal
          isOpen={true}
          onClose={onClose}
          onInsertImageIntoPage={onInsertIntoPage}
        />
      )}

      {activeTab === 'video' && (
        <VeoVideoModal
          isOpen={true}
          onClose={onClose}
          initialMode="text"
        />
      )}

      {activeTab === 'animate' && (
        <VeoVideoModal
          isOpen={true}
          onClose={onClose}
          initialMode="image"
        />
      )}
    </div>
  );
};
