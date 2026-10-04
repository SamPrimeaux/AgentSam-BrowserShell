import { GoogleGenAI, Modality } from "@google/genai";

let aiClient: GoogleGenAI | null = null;

function getAi(): GoogleGenAI {
  const apiKey =
    typeof process !== 'undefined' && process.env
      ? process.env.GEMINI_API_KEY
      : undefined;

  if (!apiKey) {
    throw new Error(
      'Direct browser model credentials are disabled. Configure the host/provider bridge instead.',
    );
  }

  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }

  return aiClient;
}

// ==========================================
// 1. GEMINI CHATBOT TYPES & SERVICE
// ==========================================

export type ChatModel = 'gemini-3.1-pro-preview' | 'gemini-3.5-flash' | 'gemini-3.1-flash-lite';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  model?: string;
  tokenUsage?: { input: number; output: number };
}

export interface ChatRolePreset {
  id: string;
  title: string;
  icon: string;
  systemInstruction: string;
}

export const CHAT_ROLE_PRESETS: ChatRolePreset[] = [
  {
    id: 'web-architect',
    title: 'Web Architect & Designer',
    icon: 'web',
    systemInstruction: 'You are an elite frontend architect and web designer. You write clean, modern, accessible HTML/CSS/JS with Tailwind, providing elegant interactive components, responsive designs, and crisp architectural advice.'
  },
  {
    id: 'code-expert',
    title: 'Software Engineer',
    icon: 'code',
    systemInstruction: 'You are a senior full-stack software engineer. Provide clear, robust, performant code snippets with explanations, edge-case analysis, and best practices.'
  },
  {
    id: 'research-analyst',
    title: 'Research & Data Analyst',
    icon: 'analytics',
    systemInstruction: 'You are a rigorous research analyst. Break down complex topics with structured bullet points, factual precision, data synthesis, and objective summaries.'
  },
  {
    id: 'creative-writer',
    title: 'Creative Storyteller & Copywriter',
    icon: 'auto_stories',
    systemInstruction: 'You are a creative writer and storyteller. Craft engaging, evocative copy, catchy headlines, and captivating narratives with rich imagery.'
  },
  {
    id: 'general-assistant',
    title: 'Helpful AI Assistant',
    icon: 'smart_toy',
    systemInstruction: 'You are a versatile, polite, highly capable AI assistant ready to help with any task, query, or creative problem.'
  }
];

export async function* streamChatMessage(
  history: ChatMessage[],
  newMessage: string,
  model: ChatModel = 'gemini-3.5-flash',
  systemInstruction?: string,
  abortSignal?: AbortSignal
): AsyncGenerator<{ chunk: string; inputTokens?: number; outputTokens?: number }> {
  const contents = history.map(msg => ({
    role: msg.role,
    parts: [{ text: msg.text }]
  }));

  contents.push({
    role: 'user',
    parts: [{ text: newMessage }]
  });

  const config: any = {};
  if (systemInstruction) {
    config.systemInstruction = systemInstruction;
  }
  if (abortSignal) {
    config.abortSignal = abortSignal;
  }

  try {
    const responseStream = await getAi().models.generateContentStream({
      model,
      contents,
      config,
    });

    let inputTokens = 0;
    let outputTokens = 0;

    for await (const chunk of responseStream) {
      if (chunk.usageMetadata) {
        inputTokens = chunk.usageMetadata.promptTokenCount || 0;
        outputTokens = chunk.usageMetadata.candidatesTokenCount || 0;
      }
      if (chunk.text) {
        yield { chunk: chunk.text, inputTokens, outputTokens };
      }
    }
  } catch (err: any) {
    console.error('Chat stream error:', err);
    throw err;
  }
}

// ==========================================
// 2. CREATE & EDIT IMAGES (gemini-3.1-flash-image-preview)
// ==========================================

export type ImageAspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4';

export interface GenerateImageOptions {
  prompt: string;
  sourceImageBase64?: string; // If provided -> edit mode
  sourceImageMimeType?: string;
  aspectRatio?: ImageAspectRatio;
}

export interface GeneratedImageResult {
  imageUrl: string; // data:image/png;base64,...
  base64Data: string;
  mimeType: string;
  text?: string;
}

export async function generateOrEditImage(options: GenerateImageOptions): Promise<GeneratedImageResult> {
  const model = 'gemini-3.1-flash-image-preview';

  const parts: any[] = [];

  if (options.sourceImageBase64) {
    // Strip header if data URI is passed
    const cleanBase64 = options.sourceImageBase64.includes(',') 
      ? options.sourceImageBase64.split(',')[1] 
      : options.sourceImageBase64;
      
    parts.push({
      inlineData: {
        data: cleanBase64,
        mimeType: options.sourceImageMimeType || 'image/png',
      }
    });
  }

  parts.push({
    text: options.prompt,
  });

  const config: any = {
    imageConfig: {
      aspectRatio: options.aspectRatio || '1:1',
    }
  };

  try {
    const response = await getAi().models.generateContent({
      model,
      contents: { parts },
      config,
    });

    let foundImageBase64 = '';
    let foundMimeType = 'image/png';
    let responseText = '';

    const candidates = response.candidates;
    if (candidates && candidates.length > 0) {
      const respParts = candidates[0].content?.parts || [];
      for (const part of respParts) {
        if (part.inlineData && part.inlineData.data) {
          foundImageBase64 = part.inlineData.data;
          foundMimeType = part.inlineData.mimeType || 'image/png';
        } else if (part.text) {
          responseText += part.text + ' ';
        }
      }
    }

    if (!foundImageBase64) {
      // Fallback: If model returned text only, check if it described why
      throw new Error(responseText.trim() || 'No image data returned from image generation model.');
    }

    return {
      imageUrl: `data:${foundMimeType};base64,${foundImageBase64}`,
      base64Data: foundImageBase64,
      mimeType: foundMimeType,
      text: responseText.trim(),
    };
  } catch (err: any) {
    console.error('Image generation/edit error:', err);
    throw err;
  }
}

// ==========================================
// 3. VEO VIDEO GENERATION (veo-3.1-fast-generate-preview)
// ==========================================

export type VideoAspectRatio = '16:9' | '9:16';

export interface GenerateVideoOptions {
  prompt: string;
  sourceImageBase64?: string; // If provided -> image-to-video animation
  sourceImageMimeType?: string;
  aspectRatio?: VideoAspectRatio;
  onStatusUpdate?: (status: string) => void;
}

export interface GeneratedVideoResult {
  videoUrl: string;
  operationName: string;
}

export async function generateVeoVideo(options: GenerateVideoOptions): Promise<GeneratedVideoResult> {
  const model = 'veo-3.1-fast-generate-preview';
  const aspectRatio = options.aspectRatio || '16:9';

  options.onStatusUpdate?.('Initializing Veo 3 video generation operation...');

  const requestPayload: any = {
    model,
    prompt: options.prompt,
    config: {
      numberOfVideos: 1,
      resolution: '720p',
      aspectRatio,
    }
  };

  if (options.sourceImageBase64) {
    const cleanBase64 = options.sourceImageBase64.includes(',')
      ? options.sourceImageBase64.split(',')[1]
      : options.sourceImageBase64;

    requestPayload.image = {
      imageBytes: cleanBase64,
      mimeType: options.sourceImageMimeType || 'image/png',
    };
  }

  try {
    options.onStatusUpdate?.('Submitting video request to Veo engine...');
    const operation = await getAi().models.generateVideos(requestPayload);
    const operationName = operation.name;

    options.onStatusUpdate?.('Rendering motion frames with Veo 3.1 Fast...');

    // Polling loop
    let currentOp = operation;
    let attempts = 0;
    const maxAttempts = 40; // ~2-3 minutes max
    const pollInterval = 4000;

    const reassuringMessages = [
      'Synthesizing temporal visual coherence...',
      'Computing high-frame-rate motion vectors...',
      'Simulating realistic lighting & camera physics...',
      'Assembling high-definition video frames...',
      'Finalizing MP4 encoding stream...',
    ];

    while (!currentOp.done && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      attempts++;
      
      const msg = reassuringMessages[attempts % reassuringMessages.length];
      options.onStatusUpdate?.(`${msg} (${attempts * 4}s)`);

      try {
        const { GenerateVideosOperation } = await import('@google/genai');
        const opCheck = new GenerateVideosOperation();
        opCheck.name = operationName;
        currentOp = await getAi().operations.getVideosOperation({ operation: opCheck });
      } catch (pollErr) {
        console.warn('Polling error, retrying:', pollErr);
      }
    }

    if (!currentOp.done) {
      throw new Error('Video generation timed out. Please try again with a shorter prompt.');
    }

    // Extract video URI or data
    const generatedVideo = currentOp.response?.generatedVideos?.[0]?.video;
    const uri = generatedVideo?.uri;

    if (!uri) {
      throw new Error('Video generation completed, but no download URI was returned.');
    }

    options.onStatusUpdate?.('Fetching completed video stream...');

    // Download video via API Key
    const videoFetchRes = await fetch(uri, {
      headers: {
        'x-goog-api-key': process.env.GEMINI_API_KEY || '',
      }
    });

    if (!videoFetchRes.ok) {
      // Direct URL fallback
      return {
        videoUrl: uri,
        operationName,
      };
    }

    const videoBlob = await videoFetchRes.blob();
    const blobUrl = URL.createObjectURL(videoBlob);

    options.onStatusUpdate?.('Video generation complete!');

    return {
      videoUrl: blobUrl,
      operationName,
    };
  } catch (err: any) {
    console.error('Veo video generation error:', err);
    throw err;
  }
}

// ==========================================
// 4. LIVE VOICE CONVERSATIONS (gemini-3.1-flash-live-preview)
// ==========================================

export interface VoiceOption {
  id: string;
  name: string;
  gender: string;
  description: string;
}

export const AVAILABLE_VOICES: VoiceOption[] = [
  { id: 'Zephyr', name: 'Zephyr', gender: 'Dynamic', description: 'Clear, modern, and engaging tone' },
  { id: 'Puck', name: 'Puck', gender: 'Playful', description: 'Energetic, friendly, and lively' },
  { id: 'Charon', name: 'Charon', gender: 'Deep', description: 'Resonant, authoritative, and calm' },
  { id: 'Kore', name: 'Kore', gender: 'Warm', description: 'Smooth, approachable, and soothing' },
  { id: 'Fenrir', name: 'Fenrir', gender: 'Crisp', description: 'Direct, focused, and articulate' },
];

export interface LiveVoiceMessage {
  id: string;
  speaker: 'user' | 'model';
  text: string;
  audioBlobUrl?: string;
  timestamp: number;
}

/**
 * Generates speech response using Live / TTS API for voice conversation turn
 */
export async function sendVoiceTurn(
  transcript: string,
  history: LiveVoiceMessage[],
  voiceName: string = 'Zephyr',
  systemInstruction: string = 'You are a warm, knowledgeable, concise conversational voice assistant. Keep answers brief, natural, and conversational.'
): Promise<{ text: string; audioBase64?: string }> {
  const model = 'gemini-3.1-flash-live-preview';

  try {
    // Multi-modal turn generation with audio response
    const promptContents = history.slice(-6).map(h => ({
      role: h.speaker,
      parts: [{ text: h.text }]
    }));

    promptContents.push({
      role: 'user',
      parts: [{ text: transcript }]
    });

    const response = await getAi().models.generateContent({
      model,
      contents: promptContents,
      config: {
        systemInstruction,
        responseModalities: [Modality.AUDIO, Modality.TEXT],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName }
          }
        }
      }
    });

    let replyText = '';
    let replyAudioBase64 = '';

    const parts = response.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.text) {
        replyText += part.text + ' ';
      }
      if (part.inlineData?.data) {
        replyAudioBase64 = part.inlineData.data;
      }
    }

    if (!replyText && replyAudioBase64) {
      replyText = '(Voice response received)';
    }

    return {
      text: replyText.trim(),
      audioBase64: replyAudioBase64,
    };
  } catch (err) {
    console.warn('Live preview audio response fallback to standard text generation:', err);
    // Fallback to text model + Web Speech TTS
    const fallbackResp = await getAi().models.generateContent({
      model: 'gemini-3.5-flash',
      contents: transcript,
      config: { systemInstruction }
    });
    return {
      text: fallbackResp.text || 'I understood you.',
    };
  }
}
