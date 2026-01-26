
export interface ASRResponse {
  text: string;
  segments?: {
    start: number;
    end: number;
    text: string;
    speaker?: string; // Speaker ID for diarization
    emotion?: string[]; // e.g. ["happy", "neutral"]
    events?: string[];  // e.g. ["applause", "laughter"]
  }[];
  language?: string;
}

export interface TTSResponse {
  audio: Blob | Buffer;
  format?: string;
}

export interface OCRBlock {
  text: string;
  confidence: number;
  box: number[][]; // [x1, y1, x2, y2] or polygon points
  type?: 'text' | 'table' | 'formula';
}

export interface OCRResponse {
  text: string; // Full concatenated text
  blocks: OCRBlock[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fullRawResponse?: any; // Provider specific response
}

export interface RerankResult {
  index: number;
  relevance_score: number;
  document?: string;
}

export interface EmbeddingsOptions {
  dimensions?: number;
  instruction?: string;
}

export interface ASROptions {
  language?: string;
  prompt?: string;
  responseFormat?: 'json' | 'text' | 'srt' | 'vtt';
  diarization?: boolean;
}

export interface TTSOptions {
  voice?: string;
  speed?: number;
  responseFormat?: 'mp3' | 'opus' | 'wav' | 'pcm';
}

export interface OCROptions {
  mode?: 'fast' | 'accurate';
}

export interface RerankOptions {
  top_k?: number;
  return_documents?: boolean;
}

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tools?: any[];
}

export interface ChatResponse {
  content: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  toolCalls?: any[];
}
