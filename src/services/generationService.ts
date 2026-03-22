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
 * Resize image to max dimensions and compress as JPEG to keep payload under Supabase body limit.
 * Returns base64 data URL.
 */
const MAX_IMAGE_DIM = 1024;
const JPEG_QUALITY = 0.82;

function resizeAndCompressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > MAX_IMAGE_DIM || height > MAX_IMAGE_DIM) {
        const scale = MAX_IMAGE_DIM / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image for compression'));
    };
    img.src = url;
  });
}

/**
 * Fetch image URL, resize to max dimensions and compress as JPEG.
 * Used for custom avatars where Edge Function can't access signed URLs.
 * Prevents oversized request bodies that cause Supabase PARSE_ERROR.
 */
async function urlToCompressedBase64(imageUrl: string): Promise<string> {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`);
  }
  const blob = await response.blob();
  const bitmapUrl = URL.createObjectURL(blob);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(bitmapUrl);
      let { width, height } = img;
      if (width > MAX_IMAGE_DIM || height > MAX_IMAGE_DIM) {
        const scale = MAX_IMAGE_DIM / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY));
    };
    img.onerror = () => {
      URL.revokeObjectURL(bitmapUrl);
      reject(new Error('Failed to load image for compression'));
    };
    img.src = bitmapUrl;
  });
}

/**
 * Send try-on generation request to Supabase Edge Function
 * Uses FLUX Kontext Max Multi via fal.ai
 */
export async function generateImages(
  config: Config,
  images: UploadedImage[],
  signal: AbortSignal,
  garmentLabels?: (string | null)[]
): Promise<GenerationResponse> {
  // Resize & compress clothing images to keep request under Supabase body limit (~6MB)
  const base64Images = await Promise.all(
    images.map(img => resizeAndCompressImage(img.file))
  );

  // For custom avatars, convert image URL to base64 (Edge Function can't access signed URLs)
  // For preset avatars, send URL directly (Unsplash URLs are publicly accessible)
  let avatarImageBase64: string | null = null;
  let avatarImageUrl: string | null = null;

  if (config.avatar?.imageUrl) {
    if (config.avatar.isCustom) {
      try {
        avatarImageBase64 = await urlToCompressedBase64(config.avatar.imageUrl);
      } catch (err) {
        throw new Error('AVATAR_LOAD_FAILED');
      }
    } else {
      avatarImageUrl = config.avatar.fullImageUrl || config.avatar.imageUrl;
    }
  }

  const guest = await isGuestUser();

  // Filter out null labels, keep only non-null values aligned with images
  const filteredLabels = garmentLabels
    ? garmentLabels.map(l => l ?? undefined).filter((l): l is string => !!l)
    : undefined;

  const requestBody = {
    mode: 'tryon' as const,
    qualityMode: config.qualityMode,
    imageCount: config.imageCount,
    images: base64Images,
    avatarImageUrl: avatarImageUrl,
    avatarImageBase64: avatarImageBase64,
    avatarIsCustom: config.avatar?.isCustom || false,
    garmentPhotoType: config.garmentPhotoType || 'auto',
    ...(filteredLabels && filteredLabels.length > 0 ? { garmentLabels: filteredLabels } : {}),
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
    // Try to parse error body
    let errorData: { error?: string; required?: number; balance?: number } | null = null;
    try {
      errorData = await response.json();
    } catch {
      // JSON parse failed — fall through to status-based mapping
    }

    // Existing: 402 insufficient credits
    if (response.status === 402 && errorData?.error === 'insufficient_credits') {
      throw new Error(`INSUFFICIENT_CREDITS:${errorData.required}:${errorData.balance}`);
    }

    // Existing: avatar upload failure
    if (errorData?.error?.includes('AVATAR_UPLOAD_FAILED')) {
      throw new Error('AVATAR_LOAD_FAILED');
    }

    // New: map specific HTTP status codes to error types
    if (response.status === 429 || errorData?.error === 'RATE_LIMIT') {
      throw new Error('RATE_LIMIT');
    }
    if (response.status === 408 || errorData?.error === 'TIMEOUT') {
      throw new Error('TIMEOUT');
    }
    if (response.status === 422 || errorData?.error === 'BAD_IMAGE') {
      throw new Error('BAD_IMAGE');
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
  const guest = await isGuestUser();
  const token = await getAuthToken();

  const requestBody = {
    mode: action,
    sourceImageUrl,
    ...params,
    ...(guest ? { guest: true } : {}),
  };

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
    let errorData: { error?: string; message?: string; required?: number; balance?: number } | null = null;
    try {
      errorData = await response.json();
    } catch {
      // ignore
    }

    if (response.status === 402 && errorData?.error === 'insufficient_credits') {
      throw new Error(`INSUFFICIENT_CREDITS:${errorData.required}:${errorData.balance}`);
    }

    throw new Error(errorData?.message || errorData?.error || `API error (${response.status})`);
  }

  const data: GenerationResponse = await response.json();
  if (!data.success) {
    throw new Error(data.message || 'Post-processing failed');
  }
  return data;
}
