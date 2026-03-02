import { API_CONFIG } from '../constants/api';
import { supabase } from '../lib/supabase';
import type { Config, UploadedImage } from '../types';
import type { GenerationResponse } from '../types/generation';

async function getAuthToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || API_CONFIG.supabaseAnonKey;
}

async function isGuestUser(): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession();
  return !session;
}

/**
 * Convert File to base64 data URL
 */
function imageToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read file as data URL'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Fetch image URL and convert to base64 data URL
 * Used for custom avatars where Edge Function can't access signed URLs
 */
async function urlToBase64(imageUrl: string): Promise<string> {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`);
  }
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert blob to data URL'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Send try-on generation request to Supabase Edge Function
 * Uses FASHN v1.6 via fal.ai
 */
export async function generateImages(
  config: Config,
  images: UploadedImage[],
  signal: AbortSignal
): Promise<GenerationResponse> {
  // Convert uploaded clothing images to base64
  const base64Images = await Promise.all(
    images.map(img => imageToBase64(img.file))
  );

  // For custom avatars, convert image URL to base64 (Edge Function can't access signed URLs)
  // For preset avatars, send URL directly (Unsplash URLs are publicly accessible)
  let avatarImageBase64: string | null = null;
  let avatarImageUrl: string | null = null;

  if (config.avatar?.imageUrl) {
    if (config.avatar.isCustom) {
      try {
        avatarImageBase64 = await urlToBase64(config.avatar.imageUrl);
      } catch (err) {
        throw new Error('AVATAR_LOAD_FAILED');
      }
    } else {
      // Use high-res fullImageUrl for FASHN (needs 512px+ for body pose detection)
      avatarImageUrl = config.avatar.fullImageUrl || config.avatar.imageUrl;
    }
  }

  const guest = await isGuestUser();

  const requestBody = {
    mode: 'tryon' as const,
    qualityMode: config.qualityMode,
    imageCount: config.imageCount,
    images: base64Images,
    avatarImageUrl: avatarImageUrl,
    avatarImageBase64: avatarImageBase64,
    avatarIsCustom: config.avatar?.isCustom || false,
    ...(guest ? { guest: true } : {}),
  };

  const token = await getAuthToken();

  const response = await fetch(API_CONFIG.generateUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'apikey': API_CONFIG.supabaseAnonKey
    },
    body: JSON.stringify(requestBody),
    signal
  });

  if (!response.ok) {
    try {
      const errorData = await response.json();
      if (response.status === 402 && errorData.error === 'insufficient_credits') {
        throw new Error(`INSUFFICIENT_CREDITS:${errorData.required}:${errorData.balance}`);
      }
      if (errorData.error?.includes('AVATAR_UPLOAD_FAILED')) {
        throw new Error('AVATAR_LOAD_FAILED');
      }
    } catch (parseErr) {
      if ((parseErr as Error).message?.startsWith('INSUFFICIENT_CREDITS') || (parseErr as Error).message === 'AVATAR_LOAD_FAILED') {
        throw parseErr;
      }
      // If parsing fails, throw generic error
    }
    throw new Error('API_ERROR');
  }

  const data: GenerationResponse = await response.json();
  return data;
}

/**
 * Send post-processing request to Supabase Edge Function
 */
export async function postProcessImage(
  action: 'background' | 'relight' | 'edit',
  sourceImageUrl: string,
  params: {
    backgroundPrompt?: string;
    lightingStyle?: string;
    editPrompt?: string;
  },
  signal: AbortSignal
): Promise<GenerationResponse> {
  const requestBody = {
    mode: action,
    sourceImageUrl,
    ...params
  };

  const response = await fetch(API_CONFIG.generateUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_CONFIG.supabaseAnonKey}`,
      'apikey': API_CONFIG.supabaseAnonKey
    },
    body: JSON.stringify(requestBody),
    signal
  });

  if (!response.ok) {
    let errorMsg = 'API_ERROR';
    try {
      const errData = await response.json();
      errorMsg = errData.message || errData.error || `API error (${response.status})`;
    } catch {
      errorMsg = `API error (${response.status})`;
    }
    throw new Error(errorMsg);
  }

  const data: GenerationResponse = await response.json();
  if (!data.success) {
    throw new Error(data.message || 'Post-processing failed');
  }
  return data;
}
