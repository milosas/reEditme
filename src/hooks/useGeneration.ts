import { useState, useRef, useEffect, useCallback } from 'react';
import type { GenerationState, ErrorType } from '../types/generation';
import type { Config, UploadedImage } from '../types';
import { API_CONFIG } from '../constants/api';
import { generateImages } from '../services/generationService';
import { useSupabaseStorage } from './useSupabaseStorage';
import { useAuth } from './useAuth';
import { useCredits, notifyCreditChange } from './useCredits';

const INITIAL_STATE: GenerationState = {
  status: 'idle',
  progress: 'sending',
  results: null,
  error: null
};

export function useGeneration() {
  const [state, setState] = useState<GenerationState>(INITIAL_STATE);
  const [creditError, setCreditError] = useState<{ required: number; balance: number } | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const progressTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const lastParamsRef = useRef<{ config: Config; images: UploadedImage[]; garmentLabels?: (string | null)[] } | null>(null);
  const { user } = useAuth();
  const { isGuest, deductGuestCredits, balance: guestBalance } = useCredits();
  const { saveGeneratedImage } = useSupabaseStorage();

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      progressTimersRef.current.forEach(timer => clearTimeout(timer));
    };
  }, []);

  const generate = useCallback(async (config: Config, images: UploadedImage[], garmentLabels?: (string | null)[]) => {
    // Store params for retry
    lastParamsRef.current = { config, images, garmentLabels };

    // Create new AbortController for this request
    abortControllerRef.current = new AbortController();

    // Clear any existing timers
    progressTimersRef.current.forEach(timer => clearTimeout(timer));
    progressTimersRef.current = [];

    // Set initial loading state
    setState({
      status: 'loading',
      progress: 'sending',
      results: null,
      error: null
    });

    // Create timeout signal (Edge Function does server-side polling)
    const timeoutSignal = AbortSignal.timeout(API_CONFIG.timeout);

    // Combine user abort and timeout signals
    const combinedSignal = AbortSignal.any([
      abortControllerRef.current.signal,
      timeoutSignal
    ]);

    // Set up progress stage timers based on quality mode
    const isPerformance = config.qualityMode === 'performance';
    const isQuality = config.qualityMode === 'quality';

    const timer1Delay = isPerformance ? 5000 : isQuality ? 15000 : 10000;
    const timer2Delay = isPerformance ? 15000 : isQuality ? 50000 : 30000;
    const timer3Delay = isPerformance ? 30000 : isQuality ? 90000 : 60000;

    const timer1 = setTimeout(() => {
      setState(prev => prev.status === 'loading' ? { ...prev, progress: 'generating-1' } : prev);
    }, timer1Delay);

    const timer2 = setTimeout(() => {
      setState(prev => prev.status === 'loading' ? { ...prev, progress: 'generating-2' } : prev);
    }, timer2Delay);

    const timer3 = setTimeout(() => {
      setState(prev => prev.status === 'loading' ? { ...prev, progress: 'generating-3' } : prev);
    }, timer3Delay);

    progressTimersRef.current = [timer1, timer2, timer3];

    try {
      // Guest credit CHECK only — deduction happens after success
      if (isGuest) {
        const TRYON_COST = 3;
        if (guestBalance < TRYON_COST) {
          setCreditError({ required: TRYON_COST, balance: guestBalance });
          setState({ status: 'error', progress: 'sending', results: null, error: 'INSUFFICIENT_CREDITS' });
          progressTimersRef.current.forEach(timer => clearTimeout(timer));
          return;
        }
      }

      // Call Edge Function - it handles fal.ai queue polling
      const data = await generateImages(config, images, combinedSignal, garmentLabels);

      // Clear timers on success
      progressTimersRef.current.forEach(timer => clearTimeout(timer));
      progressTimersRef.current = [];

      // Edge Function returns { success: true, images: [...] }
      if (data.images && Array.isArray(data.images) && data.images.length > 0) {
        setState({
          status: 'success',
          progress: 'complete',
          results: data.images,
          error: null
        });

        // Deduct guest credits AFTER successful generation
        if (isGuest) {
          const TRYON_COST = 3;
          deductGuestCredits(TRYON_COST);
        }
        notifyCreditChange();

        // Save to Supabase if user is authenticated
        if (user) {
          try {
            await Promise.all(
              data.images.map((image) => {
                return saveGeneratedImage({
                  imageUrl: image.url,
                  imageBase64: image.base64,
                  prompt: `virtual try-on: quality=${config.qualityMode}`,
                  config: {
                    avatar: config.avatar?.id ?? null,
                    qualityMode: config.qualityMode,
                    imageCount: config.imageCount
                  }
                });
              })
            );
          } catch (err) {
            console.error('Failed to save images to gallery:', err);
          }
        }
      } else {
        setState({
          status: 'error',
          progress: 'sending',
          results: null,
          error: 'API_ERROR'
        });
      }
    } catch (err: unknown) {
      // Clear progress timers on error
      progressTimersRef.current.forEach(timer => clearTimeout(timer));
      progressTimersRef.current = [];

      // Determine error type
      let errorType: ErrorType;
      const error = err as Error;

      if (error.name === 'TimeoutError') {
        errorType = 'TIMEOUT';
      } else if (error.name === 'AbortError') {
        // User cancelled - reset to idle (silent)
        setState(INITIAL_STATE);
        return;
      } else if (error.message?.startsWith('INSUFFICIENT_CREDITS')) {
        errorType = 'INSUFFICIENT_CREDITS';
        const parts = error.message.split(':');
        setCreditError({
          required: parseInt(parts[1], 10) || 0,
          balance: parseInt(parts[2], 10) || 0,
        });
      } else if (error.message === 'API_ERROR') {
        errorType = 'API_ERROR';
      } else if (error.message === 'AVATAR_LOAD_FAILED') {
        errorType = 'AVATAR_LOAD_FAILED';
      } else if (error.message === 'BAD_IMAGE') {
        errorType = 'BAD_IMAGE';
      } else if (error.message === 'RATE_LIMIT') {
        errorType = 'RATE_LIMIT';
      } else {
        errorType = 'NETWORK';
      }

      setState({
        status: 'error',
        progress: 'sending',
        results: null,
        error: errorType
      });
    }
  }, [user, saveGeneratedImage, isGuest, deductGuestCredits, guestBalance]);

  const cancel = useCallback(() => {
    abortControllerRef.current?.abort();
    progressTimersRef.current.forEach(timer => clearTimeout(timer));
    progressTimersRef.current = [];
    setState(INITIAL_STATE);
  }, []);

  const reset = useCallback(() => {
    progressTimersRef.current.forEach(timer => clearTimeout(timer));
    progressTimersRef.current = [];
    setState(INITIAL_STATE);
  }, []);

  const clearCreditError = useCallback(() => setCreditError(null), []);

  const retry = useCallback(() => {
    if (lastParamsRef.current) {
      const { config, images, garmentLabels } = lastParamsRef.current;
      generate(config, images, garmentLabels);
    }
  }, [generate]);

  return {
    state,
    creditError,
    clearCreditError,
    generate,
    cancel,
    reset,
    retry
  };
}
