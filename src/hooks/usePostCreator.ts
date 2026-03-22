import { useState, useCallback, useRef } from 'react';
import type { PostConfig } from '../types/database';
import {
  generatePostText,
  generatePostImage,
  generateTextFromImage,
  parseSSEStream,
  savePost,
  InsufficientCreditsError,
} from '../services/postService';
import { useAuth } from './useAuth';
import { useCredits, notifyCreditChange } from './useCredits';

export type ImageSource = 'upload' | 'ai' | 'gallery';

interface UsePostCreatorReturn {
  // Form state
  prompt: string;
  setPrompt: (v: string) => void;
  tone: PostConfig['tone'];
  setTone: (v: PostConfig['tone']) => void;
  emoji: PostConfig['emoji'];
  setEmoji: (v: PostConfig['emoji']) => void;
  length: PostConfig['length'];
  setLength: (v: PostConfig['length']) => void;

  // Image
  imageSource: ImageSource;
  setImageSource: (v: ImageSource) => void;
  imageFile: File | null;
  setImageFile: (f: File | null) => void;
  imagePreview: string | null;
  setImagePreview: (v: string | null) => void;
  generatedImageUrl: string | null;
  imageSize: string;
  setImageSize: (v: string) => void;

  // Output
  generatedText: string;
  isStreaming: boolean;
  isLoadingText: boolean;
  isLoadingImage: boolean;
  error: string | null;
  isSaving: boolean;
  savedPostId: string | null;

  // Credit error (for InsufficientCreditsModal)
  creditError: { required: number; balance: number } | null;
  clearCreditError: () => void;

  // Generate text from image
  isGeneratingFromImage: boolean;
  generateFromImage: () => Promise<void>;

  // Actions
  generate: () => Promise<void>;
  regenerateText: () => Promise<void>;
  regenerateImage: () => Promise<void>;
  copyText: () => Promise<boolean>;
  cancel: () => void;
  reset: () => void;
}

export function usePostCreator(): UsePostCreatorReturn {
  const { user } = useAuth();
  const { isGuest, deductGuestCredits, balance: guestBalance } = useCredits();

  // Form state
  const industry = 'general';
  const [prompt, setPrompt] = useState('');
  const [tone, setTone] = useState<PostConfig['tone']>('friendly');
  const [emoji, setEmoji] = useState<PostConfig['emoji']>('minimal');
  const [length, setLength] = useState<PostConfig['length']>('medium');

  // Image state
  const [imageSource, setImageSource] = useState<ImageSource>('upload');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState('square_hd');

  // Output state
  const [generatedText, setGeneratedText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoadingText, setIsLoadingText] = useState(false);
  const [isLoadingImage, setIsLoadingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedPostId, setSavedPostId] = useState<string | null>(null);

  const [isGeneratingFromImage, setIsGeneratingFromImage] = useState(false);
  const [creditError, setCreditError] = useState<{ required: number; balance: number } | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const generateFromImage = useCallback(async () => {
    if (!imagePreview) return;

    // Guest credit check for text_from_image (cost: 1)
    if (isGuest) {
      const cost = 1;
      if (guestBalance < cost) {
        setCreditError({ required: cost, balance: guestBalance });
        return;
      }
      if (!deductGuestCredits(cost)) {
        setCreditError({ required: cost, balance: guestBalance });
        return;
      }
    }

    setIsGeneratingFromImage(true);
    setIsStreaming(true);
    setGeneratedText('');
    setError(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await generateTextFromImage({
        imageUrl: imagePreview,
        tone,
        emoji,
        length,
        signal: controller.signal,
      });

      let fullText = '';
      for await (const chunk of parseSSEStream(response)) {
        if (controller.signal.aborted) break;
        fullText += chunk;
        setGeneratedText(fullText);
      }
      notifyCreditChange();
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        if (err instanceof InsufficientCreditsError) {
          setCreditError({ required: err.required, balance: err.balance });
        } else {
          setError((err as Error).message || 'Teksto generavimas pagal nuotrauką nepavyko');
        }
      }
    } finally {
      setIsGeneratingFromImage(false);
      setIsStreaming(false);
    }
  }, [imagePreview, tone, emoji, length, isGuest, guestBalance, deductGuestCredits]);

  const getConfig = useCallback((): PostConfig => ({
    industry,
    prompt,
    tone,
    emoji,
    length,
  }), [industry, prompt, tone, emoji, length]);

  const streamText = useCallback(async (signal: AbortSignal) => {
    // Guest credit check for post_text (cost: 1)
    if (isGuest) {
      const cost = 1;
      if (guestBalance < cost) {
        setCreditError({ required: cost, balance: guestBalance });
        return null;
      }
      if (!deductGuestCredits(cost)) {
        setCreditError({ required: cost, balance: guestBalance });
        return null;
      }
    }

    setIsLoadingText(true);
    setIsStreaming(true);
    setGeneratedText('');
    setError(null);

    try {
      const response = await generatePostText({
        industry, prompt, tone, emoji, length, signal,
      });

      let fullText = '';
      for await (const chunk of parseSSEStream(response)) {
        if (signal.aborted) break;
        fullText += chunk;
        setGeneratedText(fullText);
      }

      notifyCreditChange();
      return fullText;
    } catch (err) {
      if ((err as Error).name === 'AbortError') return null;
      if (err instanceof InsufficientCreditsError) {
        setCreditError({ required: err.required, balance: err.balance });
        return null;
      }
      throw err;
    } finally {
      setIsLoadingText(false);
      setIsStreaming(false);
    }
  }, [industry, prompt, tone, emoji, length, isGuest, guestBalance, deductGuestCredits]);

  const generateImage = useCallback(async () => {
    // Guest credit check for post_image (cost: 3)
    if (isGuest) {
      const cost = 3;
      if (guestBalance < cost) {
        setCreditError({ required: cost, balance: guestBalance });
        return null;
      }
      if (!deductGuestCredits(cost)) {
        setCreditError({ required: cost, balance: guestBalance });
        return null;
      }
    }

    setIsLoadingImage(true);
    try {
      const result = await generatePostImage({ industry, prompt, image_size: imageSize });
      setGeneratedImageUrl(result.imageUrl);
      notifyCreditChange();
      return result.imageUrl;
    } catch (err) {
      if (err instanceof InsufficientCreditsError) {
        setCreditError({ required: err.required, balance: err.balance });
        return null;
      }
      throw err;
    } finally {
      setIsLoadingImage(false);
    }
  }, [industry, prompt, isGuest, guestBalance, deductGuestCredits]);

  const doSave = useCallback(async (text: string | null, imageUrl: string | null) => {
    if (!user) return;
    setIsSaving(true);
    try {
      const saved = await savePost({
        text,
        imageUrl,
        config: getConfig(),
      });
      if (saved) setSavedPostId(saved.id);
    } finally {
      setIsSaving(false);
    }
  }, [user, getConfig]);

  const generate = useCallback(async () => {
    setError(null);
    setSavedPostId(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const shouldGenerateImage = imageSource === 'ai';

      const results = await Promise.allSettled([
        streamText(controller.signal),
        ...(shouldGenerateImage ? [generateImage()] : []),
      ]);

      const textResult = results[0];
      const imageResult = shouldGenerateImage ? results[1] : null;

      let finalText: string | null = null;
      let finalImageUrl: string | null = null;

      if (textResult.status === 'fulfilled' && textResult.value) {
        finalText = textResult.value as string;
      } else if (textResult.status === 'rejected') {
        setError(textResult.reason?.message || 'Teksto generavimas nepavyko');
      }

      if (imageResult) {
        if (imageResult.status === 'fulfilled') {
          finalImageUrl = imageResult.value as string;
        } else if (imageResult.status === 'rejected') {
          setError(prev => prev
            ? prev + ' | ' + (imageResult.reason?.message || 'Paveikslėlio generavimas nepavyko')
            : imageResult.reason?.message || 'Paveikslėlio generavimas nepavyko'
          );
        }
      }

      // Use uploaded/gallery image URL
      if ((imageSource === 'upload' || imageSource === 'gallery') && imagePreview) {
        finalImageUrl = imagePreview;
      }

      // Auto-save if we have at least text
      if (finalText) {
        await doSave(finalText, finalImageUrl);
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setError((err as Error).message || 'Generavimo klaida');
      }
    }
  }, [imageSource, imagePreview, streamText, generateImage, doSave]);

  const regenerateText = useCallback(async () => {
    const controller = new AbortController();
    abortControllerRef.current = controller;
    try {
      await streamText(controller.signal);
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setError((err as Error).message || 'Teksto generavimas nepavyko');
      }
    }
  }, [streamText]);

  const regenerateImage = useCallback(async () => {
    try {
      await generateImage();
    } catch (err) {
      setError((err as Error).message || 'Paveikslėlio generavimas nepavyko');
    }
  }, [generateImage]);

  const copyText = useCallback(async (): Promise<boolean> => {
    if (!generatedText) return false;
    try {
      await navigator.clipboard.writeText(generatedText);
      return true;
    } catch {
      return false;
    }
  }, [generatedText]);

  const cancel = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  const reset = useCallback(() => {
    cancel();
    setGeneratedText('');
    setGeneratedImageUrl(null);
    setError(null);
    setCreditError(null);
    setSavedPostId(null);
    setIsLoadingText(false);
    setIsLoadingImage(false);
    setIsStreaming(false);
    setIsSaving(false);
  }, [cancel]);

  return {
    prompt, setPrompt,
    tone, setTone,
    emoji, setEmoji,
    length, setLength,
    imageSource, setImageSource,
    imageFile, setImageFile,
    imagePreview, setImagePreview,
    generatedImageUrl,
    imageSize, setImageSize,
    generatedText,
    isStreaming,
    isLoadingText,
    isLoadingImage,
    error,
    isSaving,
    savedPostId,
    creditError,
    clearCreditError: () => setCreditError(null),
    isGeneratingFromImage,
    generateFromImage,
    generate,
    regenerateText,
    regenerateImage,
    copyText,
    cancel,
    reset,
  };
}
