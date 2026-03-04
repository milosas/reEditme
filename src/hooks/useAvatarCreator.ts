import { useState, useCallback } from 'react';
import { AvatarTraits, DEFAULT_TRAITS, buildAvatarPrompt, buildPosePrompt } from '../constants/avatarTraits';
import type { Language } from '../i18n/translations';
import { supabase } from '../lib/supabase';
import { notifyCreditChange } from './useCredits';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

async function getAuthToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || supabaseAnonKey;
}

interface GenerateResult {
  base64: string;
  imageUrl: string;
}

interface UseAvatarCreatorReturn {
  traits: AvatarTraits;
  specialFeatures: string;
  prompt: string;
  generatedImage: string | null;
  isGenerating: boolean;
  error: string | null;
  setTrait: (key: keyof AvatarTraits, value: string) => void;
  setSpecialFeatures: (value: string) => void;
  setPrompt: (value: string) => void;
  setError: (error: string | null) => void;
  creditError: { required: number; balance: number } | null;
  clearCreditError: () => void;
  generateAvatar: (overrideReferenceUrl?: string) => Promise<GenerateResult | null>;
  setGeneratedImage: (image: string | null) => void;
  clearImage: () => void;
  reset: () => void;
  /** Switch to "add pose" mode: rebuild prompt using base description + pose/mood/framing only */
  setPoseMode: (baseDescription: string, referenceUrl?: string) => void;
}

export function useAvatarCreator(lang: Language = 'en'): UseAvatarCreatorReturn {
  const [traits, setTraits] = useState<AvatarTraits>({ ...DEFAULT_TRAITS });
  const [specialFeatures, setSpecialFeatures] = useState('');
  const [prompt, setPrompt] = useState(() => buildAvatarPrompt(DEFAULT_TRAITS, '', lang));
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creditError, setCreditError] = useState<{ required: number; balance: number } | null>(null);
  // When set, prompt is built from base description + pose/mood/framing only
  const [baseDescription, setBaseDescription] = useState<string | null>(null);
  // Reference image URL for PuLID identity-preserving generation
  const [referenceImageUrl, setReferenceImageUrl] = useState<string | null>(null);

  const rebuildPrompt = useCallback((updatedTraits: AvatarTraits, updatedFeatures: string, base: string | null) => {
    if (base) {
      setPrompt(buildPosePrompt(base, updatedTraits.pose, updatedTraits.mood, updatedTraits.framing, updatedFeatures, lang, updatedTraits.lighting, updatedTraits.background, updatedTraits.colorPalette));
    } else {
      setPrompt(buildAvatarPrompt(updatedTraits, updatedFeatures, lang));
    }
  }, [lang]);

  const setTrait = useCallback((key: keyof AvatarTraits, value: string) => {
    setTraits(prev => {
      const updated = { ...prev, [key]: value };
      rebuildPrompt(updated, specialFeatures, baseDescription);
      return updated;
    });
  }, [specialFeatures, baseDescription, rebuildPrompt]);

  const handleSetSpecialFeatures = useCallback((value: string) => {
    setSpecialFeatures(value);
    rebuildPrompt(traits, value, baseDescription);
  }, [traits, baseDescription, rebuildPrompt]);

  const generateAvatar = useCallback(async (overrideReferenceUrl?: string): Promise<GenerateResult | null> => {
    setIsGenerating(true);
    setError(null);

    try {
      // Always send English prompt to fal.ai for better results
      const englishPrompt = baseDescription
        ? buildPosePrompt(baseDescription, traits.pose, traits.mood, traits.framing, specialFeatures, 'en', traits.lighting, traits.background, traits.colorPalette)
        : buildAvatarPrompt(traits, specialFeatures, 'en');

      const refUrl = overrideReferenceUrl || referenceImageUrl;
      const token = await getAuthToken();

      const response = await fetch(`${supabaseUrl}/functions/v1/generate-avatar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'apikey': supabaseAnonKey,
        },
        body: JSON.stringify({
          prompt: englishPrompt,
          aspect_ratio: traits.framing === 'headshot' ? '1:1' : traits.framing === 'full-body' ? '9:16' : '3:4',
          ...(refUrl ? { reference_image_url: refUrl } : {}),
        }),
      });

      const data = await response.json();

      if (response.status === 402 && data.error === 'insufficient_credits') {
        setCreditError({ required: data.required ?? 0, balance: data.balance ?? 0 });
        return null;
      }

      if (!data.success) {
        throw new Error(data.error || 'Generation failed');
      }

      setGeneratedImage(data.image);
      notifyCreditChange();
      return { base64: data.image, imageUrl: data.imageUrl || '' };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Generation failed';
      setError(message);
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [traits, specialFeatures, baseDescription, referenceImageUrl]);

  const clearImage = useCallback(() => {
    setGeneratedImage(null);
    setError(null);
  }, []);

  const setPoseMode = useCallback((description: string, referenceUrl?: string) => {
    setBaseDescription(description);
    if (referenceUrl) setReferenceImageUrl(referenceUrl);
    setPrompt(buildPosePrompt(description, traits.pose, traits.mood, traits.framing, specialFeatures, lang, traits.lighting, traits.background, traits.colorPalette));
  }, [traits, specialFeatures, lang]);

  const reset = useCallback(() => {
    setTraits({ ...DEFAULT_TRAITS });
    setSpecialFeatures('');
    setBaseDescription(null);
    setReferenceImageUrl(null);
    setPrompt(buildAvatarPrompt(DEFAULT_TRAITS, '', lang));
    setGeneratedImage(null);
    setError(null);
    setCreditError(null);
  }, [lang]);

  return {
    traits,
    specialFeatures,
    prompt,
    generatedImage,
    isGenerating,
    error,
    setTrait,
    setSpecialFeatures: handleSetSpecialFeatures,
    setPrompt,
    setError,
    creditError,
    clearCreditError: useCallback(() => setCreditError(null), []),
    generateAvatar,
    setGeneratedImage,
    clearImage,
    setPoseMode,
    reset,
  };
}
