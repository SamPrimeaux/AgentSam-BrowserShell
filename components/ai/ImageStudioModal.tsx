import React, { useState, useRef } from 'react';
import {
  ImageAspectRatio,
  generateOrEditImage,
  GeneratedImageResult
} from '../../services/geminiAiStudioService';

interface ImageStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertImageIntoPage?: (imageUrl: string) => void;
}

const PROMPT_SUGGESTIONS = [
  'Futuristic glass skyscraper floating in clouds at sunset, volumetric lighting',
  'Cyberpunk cafe on a rainy neon alley in Tokyo, highly detailed',
  'Cute fluffy red panda astronaut exploring an alien crystal forest',
  'Modern minimalist luxury living room with large glass windows and ocean view',
  'Abstract geometric 3D isometric architecture with pastel gradients'
];

export const ImageStudioModal: React.FC<ImageStudioModalProps> = ({
  isOpen,
  onClose,
  onInsertImageIntoPage
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'edit'>('create');
  const [prompt, setPrompt] = useState<string>('');
  const [aspectRatio, setAspectRatio] = useState<ImageAspectRatio>('1:1');
  const [sourceImageBase64, setSourceImageBase64] = useState<string>('');
  const [sourceImageMimeType, setSourceImageMimeType] = useState<string>('image/png');

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [generatedResult, setGeneratedResult] = useState<GeneratedImageResult | null>(null);

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
        setActiveTab('edit');
        setErrorMessage('');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!prompt.trim() || isLoading) return;

    setIsLoading(true);
    setErrorMessage('');
    setStatusMessage(activeTab === 'edit' 
      ? 'Editing image with Gemini 3.1 Flash Image Preview...' 
      : 'Generating new image with Gemini 3.1 Flash Image Preview...'
    );

    try {
      const result = await generateOrEditImage({
        prompt: prompt.trim(),
        sourceImageBase64: activeTab === 'edit' ? sourceImageBase64 : undefined,
        sourceImageMimeType: activeTab === 'edit' ? sourceImageMimeType : undefined,
        aspectRatio,
      });

      setGeneratedResult(result);
      setStatusMessage('');
    } catch (err: any) {
      console.error('Image Studio error:', err);
      setErrorMessage(err.message || 'Image generation failed. Please try a different prompt.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!generatedResult) return;
    const a = document.createElement('a');
    a.href = generatedResult.imageUrl;
    a.download = `gemini-image-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCopyBase64 = () => {
    if (!generatedResult) return;
    navigator.clipboard.writeText(generatedResult.imageUrl);
    alert('Image Base64 Data URL copied to clipboard!');
  };

  if (!isOpen) return null;

  return (
    <div className="gemini-modal-backdrop" onClick={onClose}>
      <div className="gemini-modal-container image-studio-container" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="gemini-modal-header">
          <div className="gemini-header-title-group">
            <div className="gemini-brand-icon image-icon">
              <span className="material-symbols-outlined" style={{ fontSize: '24px', color: '#ff8bcb' }}>
                image_edit_auto
              </span>
            </div>
            <div>
              <h2 className="gemini-header-title">Create & Edit Images</h2>
              <p className="gemini-header-subtitle">
                Model: <code>gemini-3.1-flash-image-preview</code> (Text-to-Image & Image-to-Image)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="gemini-tab-pill-group">
              <button
                onClick={() => setActiveTab('create')}
                className={`gemini-tab-pill ${activeTab === 'create' ? 'active' : ''}`}
              >
                <span className="material-symbols-outlined text-xs">add_photo_alternate</span>
                <span>Create Image</span>
              </button>
              <button
                onClick={() => setActiveTab('edit')}
                className={`gemini-tab-pill ${activeTab === 'edit' ? 'active' : ''}`}
              >
                <span className="material-symbols-outlined text-xs">edit</span>
                <span>Edit Photo</span>
              </button>
            </div>

            <button onClick={onClose} className="gemini-modal-close-btn" aria-label="Close Image Studio">
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                close
              </span>
            </button>
          </div>
        </div>

        {/* Studio Body Grid */}
        <div className="gemini-image-studio-grid">
          {/* Controls Sidebar */}
          <div className="gemini-studio-sidebar">
            {activeTab === 'edit' && (
              <div className="gemini-upload-zone-wrap">
                <label className="gemini-ctrl-label">SOURCE IMAGE TO EDIT</label>
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
                    <span className="material-symbols-outlined text-2xl text-pink-400 mb-1">cloud_upload</span>
                    <span className="text-xs font-semibold text-gray-200">Click or Drag & Drop Photo</span>
                    <span className="text-[11px] text-gray-400">PNG, JPG, WebP</span>
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
                  {activeTab === 'edit' ? 'EDITING INSTRUCTIONS' : 'PROMPT DESCRIPTION'}
                </label>
                <textarea
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  placeholder={
                    activeTab === 'edit'
                      ? 'e.g. Add glowing sunglasses to the person, make the background a tropical beach sunset'
                      : 'Describe the scene, subject, atmosphere, lighting, and style in detail...'
                  }
                  rows={4}
                  className="gemini-textarea-styled"
                  disabled={isLoading}
                />
              </div>

              {/* Aspect Ratio Selector */}
              <div>
                <label className="gemini-ctrl-label">ASPECT RATIO</label>
                <div className="gemini-aspect-grid">
                  {(['1:1', '16:9', '9:16', '4:3', '3:4'] as ImageAspectRatio[]).map(ratio => (
                    <button
                      key={ratio}
                      type="button"
                      onClick={() => setAspectRatio(ratio)}
                      className={`gemini-aspect-btn ${aspectRatio === ratio ? 'active' : ''}`}
                    >
                      <span className="aspect-label">{ratio}</span>
                      <span className="aspect-desc">
                        {ratio === '1:1' ? 'Square' : ratio === '16:9' ? 'Landscape' : ratio === '9:16' ? 'Portrait' : ratio}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Prompt Starters */}
              {activeTab === 'create' && (
                <div>
                  <label className="gemini-ctrl-label">INSPIRATION PROMPTS</label>
                  <div className="gemini-prompt-chips">
                    {PROMPT_SUGGESTIONS.map((suggestion, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setPrompt(suggestion)}
                        className="gemini-suggestion-chip"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={!prompt.trim() || isLoading || (activeTab === 'edit' && !sourceImageBase64)}
                className="gemini-btn-generate-image"
              >
                {isLoading ? (
                  <>
                    <span className="gemini-spinner-small" />
                    <span>Processing Image...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined">auto_awesome</span>
                    <span>{activeTab === 'edit' ? 'Apply Image Edit' : 'Generate Image'}</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Canvas / Preview Stage */}
          <div className="gemini-studio-preview-pane">
            {isLoading ? (
              <div className="gemini-studio-loading-state">
                <div className="gemini-studio-spinner" />
                <p className="font-semibold text-gray-200 text-sm mt-3">{statusMessage}</p>
                <p className="text-xs text-gray-400 max-w-xs text-center mt-1">
                  Synthesizing pixels with Gemini 3.1 Flash Image Preview...
                </p>
              </div>
            ) : errorMessage ? (
              <div className="gemini-studio-error-state">
                <span className="material-symbols-outlined text-4xl text-rose-400 mb-2">error</span>
                <p className="text-rose-300 font-semibold text-sm">Image Generation Failed</p>
                <p className="text-xs text-gray-400 max-w-sm text-center mt-1">{errorMessage}</p>
              </div>
            ) : generatedResult ? (
              <div className="gemini-image-result-wrapper">
                <div className="gemini-image-result-card">
                  <img
                    src={generatedResult.imageUrl}
                    alt={prompt}
                    className="gemini-result-img"
                  />
                  {generatedResult.text && (
                    <div className="gemini-img-caption">{generatedResult.text}</div>
                  )}
                </div>

                {/* Actions Toolbar */}
                <div className="gemini-image-actions-bar">
                  <button onClick={handleDownload} className="gemini-btn-primary">
                    <span className="material-symbols-outlined text-sm">download</span>
                    <span>Download PNG</span>
                  </button>

                  <button onClick={handleCopyBase64} className="gemini-btn-secondary">
                    <span className="material-symbols-outlined text-sm">content_copy</span>
                    <span>Copy Data URL</span>
                  </button>

                  {onInsertImageIntoPage && (
                    <button
                      onClick={() => {
                        onInsertImageIntoPage(generatedResult.imageUrl);
                        onClose();
                      }}
                      className="gemini-btn-secondary"
                      style={{ borderColor: 'rgba(255, 139, 203, 0.4)', color: '#ff8bcb' }}
                    >
                      <span className="material-symbols-outlined text-sm">open_in_browser</span>
                      <span>Insert into Current Page</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="gemini-studio-empty-state">
                <span className="material-symbols-outlined text-5xl text-gray-600 mb-3">image</span>
                <h3 className="text-base font-semibold text-gray-300">Ready to Create</h3>
                <p className="text-xs text-gray-500 max-w-xs text-center mt-1">
                  Enter a prompt on the left or upload a photo to edit with <code>gemini-3.1-flash-image-preview</code>.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
