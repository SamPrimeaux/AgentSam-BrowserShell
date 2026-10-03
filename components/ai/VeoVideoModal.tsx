import React, { useState, useRef } from 'react';
import {
  VideoAspectRatio,
  generateVeoVideo,
  GeneratedVideoResult
} from '../../services/geminiAiStudioService';

interface VeoVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'text' | 'image';
}

const VEO_PROMPT_PRESETS = [
  'Cinematic drone shot flying through a neon futuristic metropolis with flying cars, photorealistic 8K, golden hour',
  'Macro shot of colorful iridescent ink drops exploding in water in ultra slow-motion',
  'Cozy cabin in a snowy pine forest with northern lights dancing across the starry night sky',
  'Camera pans across a turquoise ocean wave curling on a pristine tropical beach at sunrise',
  'Cyberpunk samurai walking down a rain-slicked Tokyo street reflecting neon signs, cinematic depth of field'
];

export const VeoVideoModal: React.FC<VeoVideoModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'text'
}) => {
  const [videoMode, setVideoMode] = useState<'text' | 'image'>(initialMode);
  const [prompt, setPrompt] = useState<string>('');
  const [aspectRatio, setAspectRatio] = useState<VideoAspectRatio>('16:9');
  const [sourceImageBase64, setSourceImageBase64] = useState<string>('');
  const [sourceImageMimeType, setSourceImageMimeType] = useState<string>('image/png');

  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [videoResult, setVideoResult] = useState<GeneratedVideoResult | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please upload a valid image file (PNG, JPG, WebP).');
      return;
    }

    setSourceImageMimeType(file.type);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setSourceImageBase64(reader.result);
        setVideoMode('image');
        setErrorMessage('');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    setErrorMessage('');
    setStatusMessage('Initiating Veo 3.1 video generation pipeline...');

    try {
      const result = await generateVeoVideo({
        prompt: prompt.trim(),
        sourceImageBase64: videoMode === 'image' ? sourceImageBase64 : undefined,
        sourceImageMimeType: videoMode === 'image' ? sourceImageMimeType : undefined,
        aspectRatio,
        onStatusUpdate: (msg) => setStatusMessage(msg),
      });

      setVideoResult(result);
      setStatusMessage('');
    } catch (err: any) {
      console.error('Veo Video generation error:', err);
      setErrorMessage(err.message || 'Veo video generation encountered an error. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!videoResult) return;
    const a = document.createElement('a');
    a.href = videoResult.videoUrl;
    a.download = `veo-video-${Date.now()}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (!isOpen) return null;

  return (
    <div className="gemini-modal-backdrop" onClick={onClose}>
      <div className="gemini-modal-container veo-studio-container" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="gemini-modal-header">
          <div className="gemini-header-title-group">
            <div className="gemini-brand-icon veo-icon">
              <span className="material-symbols-outlined" style={{ fontSize: '24px', color: '#c58af9' }}>
                movie
              </span>
            </div>
            <div>
              <h2 className="gemini-header-title">Veo 3 Video Generation & Animation</h2>
              <p className="gemini-header-subtitle">
                Model: <code>veo-3.1-fast-generate-preview</code> (Text-to-Video & Image Animation)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="gemini-tab-pill-group">
              <button
                onClick={() => setVideoMode('text')}
                className={`gemini-tab-pill ${videoMode === 'text' ? 'active' : ''}`}
              >
                <span className="material-symbols-outlined text-xs">video_spark</span>
                <span>Text to Video</span>
              </button>
              <button
                onClick={() => setVideoMode('image')}
                className={`gemini-tab-pill ${videoMode === 'image' ? 'active' : ''}`}
              >
                <span className="material-symbols-outlined text-xs">animation</span>
                <span>Animate Photo</span>
              </button>
            </div>

            <button onClick={onClose} className="gemini-modal-close-btn" aria-label="Close Veo Video Studio">
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                close
              </span>
            </button>
          </div>
        </div>

        {/* Studio Grid */}
        <div className="gemini-image-studio-grid">
          {/* Controls Sidebar */}
          <div className="gemini-studio-sidebar">
            {videoMode === 'image' && (
              <div className="gemini-upload-zone-wrap">
                <label className="gemini-ctrl-label">PHOTO TO ANIMATE INTO VIDEO</label>
                {sourceImageBase64 ? (
                  <div className="gemini-uploaded-preview">
                    <img src={sourceImageBase64} alt="Source upload" className="gemini-uploaded-img" />
                    <button
                      type="button"
                      onClick={() => setSourceImageBase64('')}
                      className="gemini-remove-upload-btn"
                      title="Remove image"
                    >
                      <span className="material-symbols-outlined text-xs">close</span>
                    </button>
                  </div>
                ) : (
                  <div
                    className="gemini-dropzone"
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => {
                      e.preventDefault();
                      if (e.dataTransfer.files?.[0]) handleFileUpload(e.dataTransfer.files[0]);
                    }}
                  >
                    <span className="material-symbols-outlined text-2xl text-purple-400 mb-1">add_to_photos</span>
                    <span className="text-xs font-semibold text-gray-200">Upload Photo to Animate</span>
                    <span className="text-[11px] text-gray-400">Veo will bring this photo to life</span>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                  className="hidden"
                />
              </div>
            )}

            {/* Prompt Form */}
            <form onSubmit={handleGenerate} className="gemini-studio-form">
              <div>
                <label className="gemini-ctrl-label">
                  {videoMode === 'image' ? 'ANIMATION & MOTION PROMPT' : 'VEO VIDEO PROMPT'}
                </label>
                <textarea
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  placeholder={
                    videoMode === 'image'
                      ? 'e.g. Camera slowly zooms into the scene as the water ripples and clouds drift softly across the sky...'
                      : 'e.g. Cinematic aerial shot over a futuristic neo-cyberpunk Tokyo, glowing skyscrapers and flying vehicles...'
                  }
                  rows={4}
                  className="gemini-textarea-styled"
                  disabled={isGenerating}
                />
              </div>

              {/* Aspect Ratio Selector */}
              <div>
                <label className="gemini-ctrl-label">VIDEO ASPECT RATIO</label>
                <div className="gemini-aspect-grid">
                  {(['16:9', '9:16'] as VideoAspectRatio[]).map(ratio => (
                    <button
                      key={ratio}
                      type="button"
                      onClick={() => setAspectRatio(ratio)}
                      className={`gemini-aspect-btn ${aspectRatio === ratio ? 'active' : ''}`}
                    >
                      <span className="aspect-label">{ratio}</span>
                      <span className="aspect-desc">
                        {ratio === '16:9' ? 'Landscape (16:9)' : 'Portrait / Vertical (9:16)'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Prompt Starters */}
              {videoMode === 'text' && (
                <div>
                  <label className="gemini-ctrl-label">VEO INSPIRATION PROMPTS</label>
                  <div className="gemini-prompt-chips">
                    {VEO_PROMPT_PRESETS.map((preset, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setPrompt(preset)}
                        className="gemini-suggestion-chip"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Generate Button */}
              <button
                type="submit"
                disabled={!prompt.trim() || isGenerating || (videoMode === 'image' && !sourceImageBase64)}
                className="gemini-btn-generate-veo"
              >
                {isGenerating ? (
                  <>
                    <span className="gemini-spinner-small" />
                    <span>Rendering Veo Video...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined">movie_creation</span>
                    <span>{videoMode === 'image' ? 'Animate Photo into Video' : 'Generate Veo 3 Video'}</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Video Preview / Output Pane */}
          <div className="gemini-studio-preview-pane">
            {isGenerating ? (
              <div className="gemini-studio-loading-state">
                <div className="gemini-veo-spinner" />
                <p className="font-semibold text-gray-200 text-sm mt-4">Veo 3.1 Neural Video Synthesis</p>
                <div className="gemini-veo-status-badge mt-2">
                  <span className="material-symbols-outlined text-xs text-purple-400 animate-spin">sync</span>
                  <span>{statusMessage || 'Computing high-frame-rate motion vectors...'}</span>
                </div>
                <p className="text-xs text-gray-500 max-w-sm text-center mt-3 leading-relaxed">
                  Video generation utilizes dense temporal diffusion. Quality video takes approximately 30-90 seconds. Please keep this tab open.
                </p>
              </div>
            ) : errorMessage ? (
              <div className="gemini-studio-error-state">
                <span className="material-symbols-outlined text-4xl text-rose-400 mb-2">error</span>
                <p className="text-rose-300 font-semibold text-sm">Video Generation Error</p>
                <p className="text-xs text-gray-400 max-w-sm text-center mt-1">{errorMessage}</p>
              </div>
            ) : videoResult ? (
              <div className="gemini-video-result-wrapper">
                <div className={`gemini-video-player-card ${aspectRatio === '9:16' ? 'portrait' : 'landscape'}`}>
                  <video
                    src={videoResult.videoUrl}
                    controls
                    autoPlay
                    loop
                    playsInline
                    className="gemini-result-video"
                  />
                </div>

                {/* Video Actions */}
                <div className="gemini-image-actions-bar">
                  <button onClick={handleDownload} className="gemini-btn-primary">
                    <span className="material-symbols-outlined text-sm">download</span>
                    <span>Download MP4 Video</span>
                  </button>

                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(prompt);
                      alert('Prompt copied to clipboard!');
                    }}
                    className="gemini-btn-secondary"
                  >
                    <span className="material-symbols-outlined text-sm">content_copy</span>
                    <span>Copy Prompt</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="gemini-studio-empty-state">
                <span className="material-symbols-outlined text-5xl text-gray-600 mb-3">movie</span>
                <h3 className="text-base font-semibold text-gray-300">Veo 3 Video Studio</h3>
                <p className="text-xs text-gray-500 max-w-xs text-center mt-1">
                  Generate cinematic high-definition videos from text or animate existing photos using <code>veo-3.1-fast-generate-preview</code>.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
