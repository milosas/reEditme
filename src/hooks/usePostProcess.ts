import { useState, useRef, useCallback } from 'react';
import { postProcessImage } from '../services/generationService';
import { API_CONFIG } from '../constants/api';
import type { GeneratedImage } from '../types/generation';

interface PostProcessState {
  isProcessing: boolean;
  result: GeneratedImage | null;
  error: string | null;
  creditError: { required: number; balance: number } | null;
}

export function usePostProcess() {
  const [state, setState] = useState<PostProcessState>({
    isProcessing: false,
    result: null,
    error: null,
    creditError: null
  });
  const abortRef = useRef<AbortController | null>(null);

  const process = useCallback(async (
    action: 'background' | 'relight' | 'edit',
    sourceImageUrl: string,
    params: {
      backgroundPrompt?: string;
      lightingStyle?: string;
      editPrompt?: string;
    }
  ) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    // Combine user abort with timeout (same as main generation)
    const timeoutSignal = AbortSignal.timeout(API_CONFIG.timeout);
    const combinedSignal = AbortSignal.any([
      abortRef.current.signal,
      timeoutSignal
    ]);

    setState({ isProcessing: true, result: null, error: null, creditError: null });

    try {
      const data = await postProcessImage(action, sourceImageUrl, params, combinedSignal);

      if (data.images && data.images.length > 0) {
        setState({ isProcessing: false, result: data.images[0], error: null, creditError: null });
        return data.images[0];
      } else {
        setState({ isProcessing: false, result: null, error: 'No result returned', creditError: null });
        return null;
      }
    } catch (err) {
      const error = err as Error;
      if (error.name === 'AbortError') {
        setState({ isProcessing: false, result: null, error: null, creditError: null });
        return null;
      }
      if (error.name === 'TimeoutError') {
        setState({ isProcessing: false, result: null, error: 'Užklausa užtruko per ilgai. Bandykite dar kartą.', creditError: null });
        return null;
      }
      // Handle insufficient credits
      if (error.message?.startsWith('INSUFFICIENT_CREDITS:')) {
        const parts = error.message.split(':');
        setState({
          isProcessing: false, result: null, error: null,
          creditError: { required: parseInt(parts[1]) || 1, balance: parseInt(parts[2]) || 0 }
        });
        return null;
      }
      setState({ isProcessing: false, result: null, error: error.message || 'Post-processing failed', creditError: null });
      return null;
    }
  }, []);

  const clearCreditError = useCallback(() => {
    setState(prev => ({ ...prev, creditError: null }));
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setState({ isProcessing: false, result: null, error: null, creditError: null });
  }, []);

  return {
    ...state,
    process,
    reset,
    clearCreditError
  };
}
