import type { ImageCountOption, Avatar, Scene, QualityModeOption, GarmentPhotoTypeOption } from '../types';

// Avatar options with reference images (Unsplash free photos)
// imageUrl = small thumbnail for UI display
// fullImageUrl = high-res version sent to FASHN for body pose detection (needs 512px+)
export const AVATARS: Avatar[] = [
  // Female avatars - Full body (3)
  {
    id: 'fashion-woman-full',
    name: 'Mados modelis',
    description: 'Pilnas kūnas, stilinga poza',
    imageUrl: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=200&h=300&fit=crop',
    fullImageUrl: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=768&h=1024&fit=crop',
    promptDescription: 'fashion model woman, full body, stylish pose'
  },
  {
    id: 'elegant-woman-full',
    name: 'Elegantiška moteris',
    description: 'Pilnas kūnas, elegantiškas stilius',
    imageUrl: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=200&h=300&fit=crop',
    fullImageUrl: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=768&h=1024&fit=crop',
    promptDescription: 'elegant woman, full body, sophisticated style'
  },
  {
    id: 'casual-woman-full',
    name: 'Kasdienis stilius',
    description: 'Pilnas kūnas, atsipalaidavusi',
    imageUrl: 'https://images.unsplash.com/photo-1524250502761-1ac6f2e30d43?w=200&h=300&fit=crop',
    fullImageUrl: 'https://images.unsplash.com/photo-1524250502761-1ac6f2e30d43?w=768&h=1024&fit=crop',
    promptDescription: 'casual young woman, full body, relaxed pose'
  },
  // Female avatars - Half body (2)
  {
    id: 'professional-woman-half',
    name: 'Profesionali moteris',
    description: 'Pusė kūno, dalykiškas stilius',
    imageUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=250&fit=crop',
    fullImageUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=768&h=960&fit=crop',
    promptDescription: 'professional woman, waist up, business attire'
  },
  {
    id: 'creative-woman-half',
    name: 'Kūrybinga moteris',
    description: 'Pusė kūno, meninė išraiška',
    imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=250&fit=crop',
    fullImageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=768&h=960&fit=crop',
    promptDescription: 'creative artistic woman, waist up, unique style'
  },
  // Female avatar - Face (1)
  {
    id: 'portrait-woman-face',
    name: 'Portretas moteris',
    description: 'Veido close-up, natūrali grožybė',
    imageUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face',
    fullImageUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=768&h=768&fit=crop',
    promptDescription: 'beautiful woman, face close-up, natural beauty'
  },
  // Male avatars - Full body (2)
  {
    id: 'business-man-full',
    name: 'Verslo vyras',
    description: 'Pilnas kūnas, profesionalus',
    imageUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&h=300&fit=crop',
    fullImageUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=768&h=1024&fit=crop',
    promptDescription: 'business man, full body, professional suit'
  },
  {
    id: 'casual-man-full',
    name: 'Kasdienis vyras',
    description: 'Pilnas kūnas, atsipalaidavęs',
    imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=300&fit=crop',
    fullImageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=768&h=1024&fit=crop',
    promptDescription: 'casual man, full body, relaxed style'
  },
  // Male avatars - Half body (2)
  {
    id: 'athletic-man-half',
    name: 'Sportinis vyras',
    description: 'Pusė kūno, atletiškas',
    imageUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=250&fit=crop',
    fullImageUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=768&h=960&fit=crop',
    promptDescription: 'athletic man, waist up, fit physique'
  },
  {
    id: 'stylish-man-half',
    name: 'Stilingas vyras',
    description: 'Pusė kūno, madinga išvaizda',
    imageUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=250&fit=crop',
    fullImageUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=768&h=960&fit=crop',
    promptDescription: 'stylish man, waist up, fashionable look'
  }
];

// Scene / background options (reused for background post-processing)
export const SCENES: Scene[] = [
  { id: 'studio', name: 'Studija', promptHint: 'clean professional photo studio with neutral white/gray background, soft studio lighting' },
  { id: 'street', name: 'Gatvė', promptHint: 'urban city street background, modern architecture, natural daylight' },
  { id: 'nature', name: 'Gamta', promptHint: 'beautiful natural outdoor setting, green park or garden, soft natural light' },
  { id: 'beach', name: 'Paplūdimys', promptHint: 'tropical beach background, sand and ocean, warm golden light' },
  { id: 'cafe', name: 'Kavinė', promptHint: 'cozy stylish cafe interior background, warm ambient lighting' },
  { id: 'office', name: 'Biuras', promptHint: 'modern office interior background, clean professional setting' },
  { id: 'event', name: 'Renginys', promptHint: 'elegant event venue background, red carpet or gala setting, dramatic lighting' },
];

// Quality mode options for FASHN v1.6
export const QUALITY_MODES: QualityModeOption[] = [
  { id: 'performance', name: 'Greita', description: 'Greičiausias rezultatas' },
  { id: 'balanced', name: 'Subalansuota', description: 'Optimalus greičio ir kokybės balansas' },
  { id: 'quality', name: 'Aukšta kokybė', description: 'Geriausia kokybė, ilgiau trunka' }
];

// Garment photo type — tells FASHN how the clothing image was taken
export const GARMENT_PHOTO_TYPES: GarmentPhotoTypeOption[] = [
  { id: 'auto', name: 'Automatinis', description: 'AI atpažins automatiškai' },
  { id: 'flat-lay', name: 'Plokščia nuotrauka', description: 'Drabužis nufotografuotas plokščiai (flat-lay)' },
  { id: 'model', name: 'Ant modelio', description: 'Drabužis nufotografuotas ant žmogaus' },
];

// Lighting preset for relighting post-processing
export interface LightingPreset {
  id: string;
  name: string;
  description: string;
}

// Lighting presets — IDs must match fal.ai Image Apps V2 Relighting `lighting_style` enum exactly
export const LIGHTING_PRESETS: LightingPreset[] = [
  { id: 'natural', name: 'Natūrali', description: 'Natūrali dienos šviesa' },
  { id: 'studio', name: 'Studija', description: 'Profesionalus studijos apšvietimas' },
  { id: 'soft', name: 'Minkšta', description: 'Minkštas tolygus apšvietimas' },
  { id: 'dramatic', name: 'Dramatiškas', description: 'Kontrastingas dramatiškas apšvietimas' },
  { id: 'golden_hour', name: 'Auksinė valanda', description: 'Šilta auksinė šviesa' },
  { id: 'blue_hour', name: 'Mėlyna valanda', description: 'Šalta melsva šviesa' },
  { id: 'sunrise', name: 'Saulėtekis', description: 'Šilta auksinė šviesa iš horizonto' },
  { id: 'sunset', name: 'Saulėlydis', description: 'Šilta oranžinė šviesa' },
  { id: 'neon', name: 'Neonas', description: 'Ryškus neoninių šviesų apšvietimas' },
  { id: 'backlight', name: 'Kontražurinis', description: 'Šviesa iš nugaros pusės' },
  { id: 'side_light', name: 'Šoninis', description: 'Dramatiška šoninė šviesa' },
  { id: 'front_light', name: 'Priekinis', description: 'Šviesa iš priekio' },
  { id: 'rim_light', name: 'Kontūrinis', description: 'Apšviečia objekto kontūrus' },
  { id: 'spotlight', name: 'Prožektorius', description: 'Fokusuota prožektoriaus šviesa' },
  { id: 'candlelight', name: 'Žvakių šviesa', description: 'Šilta mirksinti žvakių šviesa' },
  { id: 'moonlight', name: 'Mėnulio šviesa', description: 'Šalta sidabrinė naktinė šviesa' },
  { id: 'ambient', name: 'Aplinkos', description: 'Tolygus aplinkos apšvietimas' },
];

// Pose presets for Kontext edit post-processing
export interface PosePreset {
  id: string;
  name: string;
  promptHint: string;
}

export const POSE_PRESETS: PosePreset[] = [
  { id: 'arms_crossed', name: 'Sukryžiuotos rankos', promptHint: 'arms crossed confidently' },
  { id: 'hands_in_pockets', name: 'Rankos kišenėse', promptHint: 'hands in pockets, relaxed stance' },
  { id: 'sitting', name: 'Sėdi', promptHint: 'sitting on a chair, relaxed pose' },
  { id: 'leaning', name: 'Atsiremiantis', promptHint: 'leaning against a wall casually' },
  { id: 'walking', name: 'Eina', promptHint: 'walking forward naturally' },
  { id: 'looking_away', name: 'Žiūri į šoną', promptHint: 'looking to the side, profile view' },
  { id: 'hand_on_chin', name: 'Ranka prie smakro', promptHint: 'hand on chin, thinking pose' },
  { id: 'waving', name: 'Mojuoja', promptHint: 'waving hand, friendly gesture' },
  { id: 'thumbs_up', name: 'Nykštys aukštyn', promptHint: 'giving a thumbs up, smiling' },
  { id: 'pointing', name: 'Rodo pirštu', promptHint: 'pointing forward with one hand' },
];

// Image count options (FASHN supports up to 4)
export const IMAGE_COUNTS: ImageCountOption[] = [
  { id: 1, name: '1 nuotrauka', description: 'Greičiau, pigiau' },
  { id: 2, name: '2 nuotraukos', description: 'Daugiau pasirinkimų' },
  { id: 3, name: '3 nuotraukos', description: 'Dar daugiau variantų' },
  { id: 4, name: '4 nuotraukos', description: 'Maksimalus pasirinkimas' }
];
