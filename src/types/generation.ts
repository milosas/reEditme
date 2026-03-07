export type GenerationProgress =
  | 'sending'
  | 'generating-1'
  | 'generating-2'
  | 'generating-3'
  | 'complete';

export type ErrorType = 'TIMEOUT' | 'NETWORK' | 'API_ERROR' | 'AVATAR_LOAD_FAILED' | 'INSUFFICIENT_CREDITS';

export interface GeneratedImage {
  url: string;
  base64?: string; // Base64 data URL for CORS-free storage (from Edge Function)
}

export interface GenerationState {
  status: 'idle' | 'loading' | 'success' | 'error';
  progress: GenerationProgress;
  results: GeneratedImage[] | null;
  error: ErrorType | null;
}

export interface GenerationResponse {
  success: boolean;
  images?: GeneratedImage[];
  message?: string;
}
