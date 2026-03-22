import { API_CONFIG } from '../constants/api';
import { supabase } from '../lib/supabase';
import type { PostConfig, GeneratedPost } from '../types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = API_CONFIG.supabaseAnonKey;

async function getAuthToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || supabaseAnonKey;
}

async function isGuestUser(): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession();
  return !session;
}

class InsufficientCreditsError extends Error {
  required: number;
  balance: number;
  constructor(message: string, required: number, balance: number) {
    super(message);
    this.name = 'InsufficientCreditsError';
    this.required = required;
    this.balance = balance;
  }
}

export { InsufficientCreditsError };

interface GenerateTextParams {
  industry: string;
  prompt: string;
  tone: PostConfig['tone'];
  emoji: PostConfig['emoji'];
  length: PostConfig['length'];
  signal?: AbortSignal;
}

interface GenerateImageParams {
  industry: string;
  prompt: string;
  image_size?: string;
}

/**
 * Generate post text via streaming.
 * Returns the raw Response so the caller can read the SSE stream.
 */
export async function generatePostText(params: GenerateTextParams): Promise<Response> {
  const { signal, ...body } = params;
  const token = await getAuthToken();
  const guest = await isGuestUser();

  const response = await fetch(`${supabaseUrl}/functions/v1/generate-post-text`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'apikey': supabaseAnonKey,
    },
    body: JSON.stringify({ ...body, ...(guest ? { guest: true } : {}) }),
    signal,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    if (response.status === 402 && errorData?.error === 'insufficient_credits') {
      throw new InsufficientCreditsError(
        errorData.message || 'Nepakanka kreditų',
        errorData.required,
        errorData.balance
      );
    }
    throw new Error(errorData?.message || 'Teksto generavimas nepavyko');
  }

  return response;
}

/**
 * Generate a post image via KIE Seedream.
 */
export async function generatePostImage(params: GenerateImageParams): Promise<{ imageUrl: string }> {
  const token = await getAuthToken();
  const guest = await isGuestUser();

  const response = await fetch(`${supabaseUrl}/functions/v1/generate-post-image`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'apikey': supabaseAnonKey,
    },
    body: JSON.stringify({ ...params, ...(guest ? { guest: true } : {}) }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    if (response.status === 402 && errorData?.error === 'insufficient_credits') {
      throw new InsufficientCreditsError(
        errorData.message || 'Nepakanka kreditų',
        errorData.required,
        errorData.balance
      );
    }
    throw new Error(errorData?.message || 'Paveikslėlio generavimas nepavyko');
  }

  const data = await response.json();
  return { imageUrl: data.imageUrl };
}

/**
 * Generate post text from an image via GPT-4o Vision (streaming).
 */
export async function generateTextFromImage(params: {
  imageUrl: string;
  tone: string;
  emoji: string;
  length: string;
  signal?: AbortSignal;
}): Promise<Response> {
  const { signal, ...body } = params;
  const token = await getAuthToken();
  const guest = await isGuestUser();

  const response = await fetch(`${supabaseUrl}/functions/v1/generate-text-from-image`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'apikey': supabaseAnonKey,
    },
    body: JSON.stringify({ ...body, ...(guest ? { guest: true } : {}) }),
    signal,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    if (response.status === 402 && errorData?.error === 'insufficient_credits') {
      throw new InsufficientCreditsError(
        errorData.message || 'Nepakanka kreditų',
        errorData.required,
        errorData.balance
      );
    }
    throw new Error(errorData?.message || 'Teksto generavimas pagal nuotrauką nepavyko');
  }

  return response;
}

/**
 * Parse SSE stream from OpenAI-compatible endpoint into text chunks.
 */
export async function* parseSSEStream(response: Response): AsyncGenerator<string> {
  const reader = response.body?.getReader();
  if (!reader) return;

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;

        const data = trimmed.slice(6);
        if (data === '[DONE]') return;

        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) yield content;
        } catch {
          // Skip malformed JSON lines
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Save a generated post to the database.
 */
export async function savePost(params: {
  text: string | null;
  imageUrl: string | null;
  config: PostConfig;
}): Promise<GeneratedPost | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('generated_posts')
    .insert({
      user_id: user.id,
      text: params.text,
      image_url: params.imageUrl,
      config: params.config,
    })
    .select()
    .single();

  if (error) {
    return null;
  }

  return data;
}

/**
 * Get user's saved posts, paginated.
 */
export async function getUserPosts(limit = 20, offset = 0): Promise<GeneratedPost[]> {
  const { data, error } = await supabase
    .from('generated_posts')
    .select('*')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return [];
  }

  return data || [];
}

/**
 * Delete a post.
 */
export async function deletePost(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('generated_posts')
    .delete()
    .eq('id', id);

  return !error;
}

/**
 * Toggle favorite status.
 */
export async function toggleFavorite(id: string, currentValue: boolean): Promise<boolean> {
  const { error } = await supabase
    .from('generated_posts')
    .update({ is_favorite: !currentValue })
    .eq('id', id);

  return !error;
}
