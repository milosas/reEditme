import { useState, useCallback, useEffect, useRef } from 'react';
import type { UploadedImage } from '../types';

const MAX_FILES = 4;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png'];

export function useImageUpload() {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const previewUrlsRef = useRef<string[]>([]);

  // Cleanup ALL preview URLs on unmount - CRITICAL for memory management
  useEffect(() => {
    return () => {
      previewUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  const addImages = useCallback((files: File[]) => {
    // Filter to only valid types and respect max limit
    const validFiles = files
      .filter(f => ACCEPTED_TYPES.includes(f.type))
      .slice(0, MAX_FILES - images.length);

    if (validFiles.length === 0) return;

    const newImages: UploadedImage[] = validFiles.map(file => {
      const previewUrl = URL.createObjectURL(file);
      previewUrlsRef.current.push(previewUrl);
      return { file, previewUrl };
    });

    setImages(prev => [...prev, ...newImages].slice(0, MAX_FILES));
  }, [images.length]);

  const removeImage = useCallback((index: number) => {
    setImages(prev => {
      const removed = prev[index];
      if (removed) {
        URL.revokeObjectURL(removed.previewUrl);
        previewUrlsRef.current = previewUrlsRef.current.filter(
          url => url !== removed.previewUrl
        );
      }
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const clearImages = useCallback(() => {
    images.forEach(img => URL.revokeObjectURL(img.previewUrl));
    previewUrlsRef.current = [];
    setImages([]);
  }, [images]);

  return {
    images,
    addImages,
    removeImage,
    clearImages,
    canAddMore: images.length < MAX_FILES,
    imageCount: images.length,
    hasImages: images.length > 0
  };
}
