// Avatar with image for model
export interface Avatar {
  id: string;
  name: string;
  description: string;
  imageUrl: string; // Small thumbnail for UI display
  fullImageUrl?: string; // High-res URL for FASHN body pose detection (512px+)
  promptDescription: string; // How to describe in prompt
  isCustom?: boolean; // true for custom avatars
}

// Clothing type (kept for backward compat with existing gallery items)
export interface ClothingType {
  id: string;
  name: string;
  description: string;
  promptHint: string;
  imageUrl: string;
}

// Model mood/expression (kept for backward compat with existing gallery items)
export interface Mood {
  id: string;
  name: string;
  promptHint: string; // English hint for AI prompt
}

// Scene / background (reused for background post-processing)
export interface Scene {
  id: string;
  name: string;
  promptHint: string; // English hint for AI prompt
}

export interface UploadedImage {
  file: File;
  previewUrl: string;
}

// Image count options
export type ImageCount = 1 | 2 | 3 | 4;

export interface ImageCountOption {
  id: ImageCount;
  name: string;
  description: string;
}

// Quality mode for FASHN v1.6 try-on
export type QualityMode = 'performance' | 'balanced' | 'quality';

export interface QualityModeOption {
  id: QualityMode;
  name: string;
  description: string;
}

// Garment photo type — how the clothing image was taken
export type GarmentPhotoType = 'auto' | 'flat-lay' | 'model';

export interface GarmentPhotoTypeOption {
  id: GarmentPhotoType;
  name: string;
  description: string;
}

export type GarmentLabel = 'top' | 'bottom' | 'dress' | 'shoes' | 'bag' | 'accessory';

export interface GarmentLabelOption {
  id: GarmentLabel;
  name: string;     // Lithuanian display name
  prompt: string;   // English for AI prompt
}

export const GARMENT_LABELS: GarmentLabelOption[] = [
  { id: 'top',       name: 'Viršus',          prompt: 'top' },
  { id: 'bottom',    name: 'Kelnės/Sijonas',  prompt: 'trousers/skirt' },
  { id: 'dress',     name: 'Suknelė',         prompt: 'dress' },
  { id: 'shoes',     name: 'Batai',           prompt: 'shoes' },
  { id: 'bag',       name: 'Krepšys',         prompt: 'bag' },
  { id: 'accessory', name: 'Aksesuaras',      prompt: 'accessory' },
];

export interface Config {
  avatar: Avatar | null;
  qualityMode: QualityMode;
  imageCount: ImageCount;
  garmentPhotoType: GarmentPhotoType;
}
