import { useLanguage } from '../../contexts/LanguageContext';
import { useAvatarCreator } from '../../hooks/useAvatarCreator';
import { InsufficientCreditsModal } from '../credits/InsufficientCreditsModal';
import { useState, useEffect, useCallback } from 'react';
import { avatarModelSchema, validateField } from '../../lib/validation';
import {
  GENDER_OPTIONS,
  ETHNICITY_OPTIONS,
  HAIR_LENGTH_OPTIONS,
  HAIR_COLOR_OPTIONS,
  AGE_OPTIONS,
  FRAMING_OPTIONS,
  POSE_OPTIONS,
  MOOD_OPTIONS,
  LIGHTING_OPTIONS,
  BACKGROUND_OPTIONS,
  COLOR_PALETTE_OPTIONS,
  buildTraitDescription,
} from '../../constants/avatarTraits';
import type { TraitOption } from '../../constants/avatarTraits';
import type { Language } from '../../i18n/translations';

const BATCH_POSES = ['standing-front', 'standing-side', 'walking', 'arms-crossed', 'hand-on-hip'];

interface AvatarCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetModelId?: string;
  onSaved?: () => void;
  models: import('../../types/database').AvatarModel[];
  createModel: (name: string, firstPhoto?: File) => Promise<import('../../types/database').AvatarModel | null>;
  addGeneratedPhotoToModel: (modelId: string, base64Data: string, description: string) => Promise<import('../../types/database').CustomAvatar | null>;
  deletePhoto: (photoId: string, storagePath: string, modelId: string) => Promise<void>;
}

function TraitSelector({
  label,
  options,
  value,
  onChange,
  lang,
  compact,
}: {
  label: string;
  options: TraitOption[];
  value: string;
  onChange: (id: string) => void;
  lang: Language;
  compact?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-[#666666] mb-1.5">{label}</label>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const isSelected = value === option.id;
          return (
            <button
              key={option.id}
              onClick={() => onChange(option.id)}
              className={`${compact ? 'px-2.5 py-1' : 'px-3 py-1.5'} rounded-lg text-xs font-medium transition-all ${
                isSelected
                  ? 'bg-[#FF6B35] text-white'
                  : 'bg-[#F7F7F5] text-[#666666] hover:bg-[#EFEFED] border border-[#E5E5E3]'
              }`}
            >
              {option.labels[lang]}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function AvatarCreatorModal({ isOpen, onClose, targetModelId, onSaved, models, createModel, addGeneratedPhotoToModel, deletePhoto }: AvatarCreatorModalProps) {
  const { language, t } = useLanguage();
  const {
    traits,
    specialFeatures,
    prompt,
    generatedImage,
    isGenerating,
    error,
    setTrait,
    setSpecialFeatures,
    setPrompt,
    setError,
    creditError,
    clearCreditError,
    generateAvatar,
    setGeneratedImage,
    clearImage,
    reset,
  } = useAvatarCreator(language);

  const tc = t.avatarCreator;
  const tm = t.avatarModels;
  const [isSaving, setIsSaving] = useState(false);
  const [isDeletingPhoto, setIsDeletingPhoto] = useState<string | null>(null);
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const [selectedModelId, setSelectedModelId] = useState<string | 'new'>(targetModelId || 'new');
  const [newModelName, setNewModelName] = useState('');
  const [modelNameError, setModelNameError] = useState<string | null>(null);
  const [savedPhotos, setSavedPhotos] = useState<string[]>([]);
  const [createdModelId, setCreatedModelId] = useState<string | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isPoseMode, setIsPoseMode] = useState(false);
  const [modelBaseDescription, setModelBaseDescription] = useState('');

  // Batch generation state
  const [batchCount, setBatchCount] = useState(1);
  const [batchResults, setBatchResults] = useState<Array<{base64: string, description: string}>>([]);
  const [batchProgress, setBatchProgress] = useState(0); // 0 = not started, 1-N = generating Nth photo

  // Simulated progress percentage
  const [progressPercent, setProgressPercent] = useState(0);

  // Modal state: 'selection' | 'generating' | 'result'
  type ModalState = 'selection' | 'generating' | 'result';
  const getModalState = (): ModalState => {
    if (isGenerating || batchProgress > 0) return 'generating';
    if (generatedImage || batchResults.length > 0) return 'result';
    return 'selection';
  };
  const modalState = getModalState();

  const effectiveModelId = createdModelId || (selectedModelId !== 'new' ? selectedModelId : null);
  const safeModels = models || [];
  const currentModel = effectiveModelId ? safeModels.find(m => m.id === effectiveModelId) : null;
  const totalPhotos = currentModel?.photos?.length || 0;
  const canAddMore = totalPhotos < 5;

  // Simulated progress animation during generation
  useEffect(() => {
    if (modalState !== 'generating') {
      setProgressPercent(0);
      return;
    }
    setProgressPercent(0);
    const startTime = Date.now();
    const expectedDuration = batchCount > 1 ? 15000 : 12000; // ms per image estimate
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      // Ease out: fast at start, slows approaching 90%
      const raw = elapsed / expectedDuration;
      const simulated = Math.min(90, raw * 100 * (1 - raw * 0.3));
      setProgressPercent(Math.round(simulated));
    }, 200);
    return () => clearInterval(interval);
  }, [modalState, batchProgress, batchCount]);

  // Jump to 100% briefly when generation completes
  useEffect(() => {
    if (modalState === 'result' && progressPercent > 0 && progressPercent < 100) {
      setProgressPercent(100);
    }
  }, [modalState]);

  // Reset state when modal opens — always creates new model
  useEffect(() => {
    if (!isOpen) return;

    setSavedPhotos([]);
    setCreatedModelId(null);
    setSelectedModelId('new');
    setNewModelName('');
    setModelNameError(null);
    setShowPrompt(false);
    setBatchCount(1);
    setBatchResults([]);
    setBatchProgress(0);
    setIsPoseMode(false);
    setModelBaseDescription('');
    setProgressPercent(0);
  }, [isOpen]);

  const handleClose = () => {
    reset();
    setIsPoseMode(false);
    setModelBaseDescription('');
    setBatchCount(1);
    setBatchResults([]);
    setBatchProgress(0);
    setProgressPercent(0);
    onClose();
  };

  const handleBackToSelection = () => {
    clearImage();
    setBatchResults([]);
    setBatchProgress(0);
    setProgressPercent(0);
  };

  const handleGenerate = useCallback(async () => {
    await generateAvatar();
  }, [generateAvatar]);

  const handleDeletePhoto = async (photoId: string, storagePath: string) => {
    if (!effectiveModelId || isDeletingPhoto) return;
    setIsDeletingPhoto(photoId);
    try {
      await deletePhoto(photoId, storagePath, effectiveModelId);
      setSavedPhotos(prev => prev.filter(id => id !== photoId));
      await onSaved?.();
    } catch (err) {
      console.error('Failed to delete photo:', err);
    } finally {
      setIsDeletingPhoto(null);
    }
  };

  // Batch generation handler
  const handleBatchGenerate = async () => {
    if (batchCount === 1) {
      await handleGenerate();
      return;
    }

    setBatchResults([]);
    setBatchProgress(1);
    setGeneratedImage(null);

    const results: Array<{base64: string, description: string}> = [];
    let referenceUrl: string | null = null;

    for (let i = 0; i < batchCount; i++) {
      setBatchProgress(i + 1);

      // Set pose for this iteration
      const poseId = BATCH_POSES[i % BATCH_POSES.length];
      setTrait('pose', poseId);

      // Small delay to let prompt rebuild
      await new Promise(r => setTimeout(r, 150));

      const result = await generateAvatar(referenceUrl || undefined);
      if (!result) break;

      const description = buildTraitDescription(traits, language);
      results.push({ base64: result.base64, description });
      setBatchResults([...results]);

      // Use first photo's URL as reference for subsequent PuLID generations
      if (i === 0 && result.imageUrl) {
        referenceUrl = result.imageUrl;
      }
    }

    setBatchProgress(0);
    // Clear the single generatedImage so we show batch results grid instead
    setGeneratedImage(null);
  };

  // Save all batch results at once
  const handleBatchSave = async () => {
    if (!effectiveModelId && !isPoseMode && !validateModelName()) return;

    setIsSaving(true);
    setError(null);
    try {
      let modelId = effectiveModelId;
      if (!modelId) {
        const description = batchResults[0]?.description || '';
        const name = newModelName.trim() || description.substring(0, 40);
        const model = await createModel(name);
        if (!model) throw new Error('Failed to create model');
        modelId = model.id;
        setCreatedModelId(model.id);
        setSelectedModelId(model.id);
      }

      for (const result of batchResults) {
        await addGeneratedPhotoToModel(modelId, result.base64, result.description);
      }

      await onSaved?.();
      handleClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save';
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const validateModelName = (): boolean => {
    const trimmed = newModelName.trim();
    // Only validate if user typed something; empty falls back to description
    if (trimmed.length > 0) {
      const err = validateField(avatarModelSchema, 'name', trimmed);
      if (err) {
        setModelNameError(err);
        return false;
      }
    }
    setModelNameError(null);
    return true;
  };

  const handleSaveAndClose = async () => {
    if (!generatedImage) {
      handleClose();
      return;
    }

    if (!effectiveModelId && !isPoseMode && !validateModelName()) return;

    setIsSaving(true);
    setError(null);
    try {
      const description = buildTraitDescription(traits, language);
      let modelId = effectiveModelId;

      if (!modelId) {
        const name = newModelName.trim() || description.substring(0, 40);
        const model = await createModel(name);
        if (!model) throw new Error('Failed to create model');
        modelId = model.id;
      }

      await addGeneratedPhotoToModel(modelId, generatedImage, description);
      await onSaved?.();
      handleClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save model';
      setError(message);
      setIsSaving(false);
    }
  };

  // Escape key to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  const hasSavedAny = savedPhotos.length > 0;
  const isBatchMode = batchCount > 1;
  const isBatchGenerating = batchProgress > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" role="dialog" aria-modal="true" aria-labelledby="avatar-creator-title" onClick={handleClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-[calc(100vw-2rem)] md:max-w-lg max-h-[90vh] overflow-y-auto shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#E5E5E3]">
          <div className="flex items-center gap-3">
            <h2 id="avatar-creator-title" className="text-lg font-semibold text-[#1A1A1A]">
              {isPoseMode ? (tm?.addPose || 'Add pose') : tc.title}
            </h2>
            {(hasSavedAny || totalPhotos > 0) && (
              <span className="px-2.5 py-0.5 rounded-full bg-[#FFF0EB] text-[#FF6B35] text-xs font-semibold">
                {totalPhotos}/5
              </span>
            )}
          </div>
          <button onClick={handleClose} aria-label="Uzdaryti" className="p-1 rounded-lg hover:bg-[#F7F7F5] transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#FF6B35] focus:outline-none">
            <svg className="w-5 h-5 text-[#999999]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Model photos strip */}
        {totalPhotos > 0 && (
          <div className="px-5 pt-4">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-medium text-[#666666]">
                {tm?.savedPhotos || 'Modelio nuotraukos'} ({totalPhotos}/5)
              </label>
              {selectedPhotoId && (
                <button
                  onClick={() => {
                    const photo = currentModel?.photos?.find(p => p.id === selectedPhotoId);
                    if (photo) handleDeletePhoto(photo.id, photo.storage_path);
                  }}
                  disabled={!!isDeletingPhoto}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                >
                  {isDeletingPhoto ? (
                    <span className="w-3 h-3 border border-red-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  )}
                  {tm?.deletePhoto || 'Delete'}
                </button>
              )}
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {currentModel?.photos?.map((photo, i) => (
                <button
                  key={photo.id}
                  onClick={() => setSelectedPhotoId(selectedPhotoId === photo.id ? null : photo.id)}
                  className={`flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden relative transition-all ${
                    selectedPhotoId === photo.id
                      ? 'ring-2 ring-red-500 ring-offset-1'
                      : savedPhotos.includes(photo.id)
                        ? 'border-2 border-[#FF6B35]'
                        : 'border border-[#E5E5E3]'
                  }`}
                >
                  <img src={photo.image_url} alt={`Modelio nuotrauka ${i + 1}`} className="w-full h-full object-cover object-top" />
                  <span className="absolute bottom-0 left-0 bg-black/50 text-white text-[8px] px-1 rounded-tr">{i + 1}</span>
                </button>
              ))}
              {Array.from({ length: Math.max(0, 5 - totalPhotos) }).map((_, i) => (
                <div key={`empty-${i}`} className="flex-shrink-0 w-14 h-14 rounded-lg border-2 border-dashed border-[#E5E5E3] flex items-center justify-center">
                  <span className="text-[10px] text-[#CCCCCC]">{totalPhotos + i + 1}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-5 space-y-4">

          {/* ===== GENERATING STATE ===== */}
          {modalState === 'generating' && (
            <div className="flex flex-col items-center gap-4 py-8">
              {/* Circular progress indicator */}
              <div className="relative w-20 h-20">
                <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="35" fill="none" stroke="#F7F7F5" strokeWidth="6" />
                  <circle
                    cx="40" cy="40" r="35" fill="none" stroke="#FF6B35" strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 35}`}
                    strokeDashoffset={`${2 * Math.PI * 35 * (1 - progressPercent / 100)}`}
                    className="transition-all duration-300 ease-out"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-[#FF6B35]">
                  {progressPercent}%
                </span>
              </div>

              {/* Progress text */}
              <p className="text-sm font-medium text-[#1A1A1A]">
                {isBatchGenerating
                  ? `Generuojama ${batchProgress}/${batchCount}...`
                  : `Generuojama... ${progressPercent}%`}
              </p>
              <p className="text-xs text-[#999999]">Tai gali užtrukti iki 15 sekundžių</p>

              {/* Thumbnails of completed batch photos so far */}
              {batchResults.length > 0 && (
                <div className="flex gap-2 flex-wrap justify-center mt-2">
                  {batchResults.map((result, i) => (
                    <div key={i} className="w-16 h-16 rounded-lg overflow-hidden border-2 border-[#FF6B35]">
                      <img src={result.base64} alt={`Sugeneruota nuotrauka ${i + 1}`} className="w-full h-full object-cover object-top" />
                    </div>
                  ))}
                </div>
              )}

              {/* Error during generation */}
              {error && (
                <div className="w-full p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                  {error}
                </div>
              )}
            </div>
          )}

          {/* ===== RESULT STATE ===== */}
          {modalState === 'result' && (
            <div className="flex flex-col items-center gap-4">
              {/* Success badge */}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-full">
                <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-xs font-medium text-green-700">
                  {batchResults.length > 0
                    ? `Sugeneruota ${batchResults.length} nuotrauk${batchResults.length === 1 ? 'a' : 'os'}`
                    : 'Nuotrauka sugeneruota'}
                </span>
              </div>

              {/* Batch results grid */}
              {batchResults.length > 0 && (
                <div className="w-full">
                  <div className="grid grid-cols-3 gap-2">
                    {batchResults.map((result, i) => (
                      <div key={i} className="aspect-[3/4] rounded-xl overflow-hidden border-2 border-[#FF6B35] shadow-sm">
                        <img src={result.base64} alt={`Sugeneruota nuotrauka ${i + 1}`} className="w-full h-full object-cover object-top" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Single generated image - prominent */}
              {generatedImage && batchResults.length === 0 && (
                <div className="w-56 aspect-[3/4] rounded-xl overflow-hidden border-2 border-[#FF6B35] shadow-lg">
                  <img src={generatedImage} alt="Generated model" className="w-full h-full object-cover object-top" />
                </div>
              )}

              {/* Model name input (for new model) */}
              {!isPoseMode && !createdModelId && (
                <div className="w-full">
                  <label className="block text-xs font-medium text-[#666666] mb-1.5">
                    Modelio pavadinimas
                  </label>
                  <input
                    value={newModelName}
                    onChange={(e) => { setNewModelName(e.target.value); setModelNameError(null); }}
                    onBlur={() => {
                      if (newModelName.trim().length > 0) {
                        const err = validateField(avatarModelSchema, 'name', newModelName.trim());
                        setModelNameError(err);
                      } else {
                        setModelNameError(null);
                      }
                    }}
                    placeholder="Modelio pavadinimas (neprivaloma)"
                    className={`w-full px-3 py-2.5 bg-white border rounded-xl text-sm text-[#1A1A1A] placeholder-[#999999] focus:outline-none focus:border-[#FF6B35] focus:ring-2 focus:ring-[#FF6B35]/10 ${modelNameError ? 'border-red-400' : 'border-[#E5E5E3]'}`}
                  />
                  {modelNameError && <p className="text-xs text-red-500 mt-1">{modelNameError}</p>}
                </div>
              )}

              {/* Error in result state */}
              {error && (
                <div className="w-full p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                  {error}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-3 w-full mt-2">
                <button
                  onClick={handleBackToSelection}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-[#E5E5E3] text-[#666666] text-sm font-medium hover:bg-[#F7F7F5] transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#FF6B35] focus:outline-none"
                >
                  Generuoti dar
                </button>
                <button
                  onClick={batchResults.length > 0 ? handleBatchSave : handleSaveAndClose}
                  disabled={isSaving}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-[#FF6B35] text-white text-sm font-semibold hover:bg-[#E55A2B] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#FF6B35] focus:outline-none"
                >
                  {isSaving ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      {tc.saving}
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {batchResults.length > 1
                        ? `Išsaugoti (${batchResults.length})`
                        : 'Išsaugoti'}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ===== SELECTION STATE ===== */}
          {modalState === 'selection' && (
            <>
              {/* Model name input - always creates new model */}
              {!isPoseMode && !createdModelId && (
                <div>
                  <label className="block text-xs font-medium text-[#666666] mb-1.5">
                    {'Naujo modelio pavadinimas'}
                  </label>
                  <input
                    value={newModelName}
                    onChange={(e) => { setNewModelName(e.target.value); setModelNameError(null); }}
                    onBlur={() => {
                      if (newModelName.trim().length > 0) {
                        const err = validateField(avatarModelSchema, 'name', newModelName.trim());
                        setModelNameError(err);
                      } else {
                        setModelNameError(null);
                      }
                    }}
                    placeholder={'Modelio pavadinimas (neprivaloma)'}
                    className={`w-full px-3 py-2 bg-white border rounded-xl text-sm text-[#1A1A1A] placeholder-[#999999] focus:outline-none focus:border-[#FF6B35] ${modelNameError ? 'border-red-400' : 'border-[#E5E5E3]'}`}
                  />
                  {modelNameError && <p className="text-xs text-red-500 mt-1">{modelNameError}</p>}
                </div>
              )}

              {/* Model identity badge (pose mode) */}
              {isPoseMode && currentModel && (
                <div className="flex items-center gap-2 px-3 py-2 bg-[#F7F7F5] rounded-xl">
                  {currentModel.photos?.[0] && (
                    <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0">
                      <img src={currentModel.photos[0].image_url} alt={`${currentModel.name} avataro peržiūra`} className="w-full h-full object-cover object-top" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#1A1A1A] truncate">{currentModel.name}</p>
                    <p className="text-[10px] text-[#999999] truncate">{modelBaseDescription}</p>
                  </div>
                </div>
              )}

              {/* Identity traits - ONLY when creating new model (not in pose mode) */}
              {!isPoseMode && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <TraitSelector label={tc.gender} options={GENDER_OPTIONS} value={traits.gender} onChange={(v) => setTrait('gender', v)} lang={language} />
                  <TraitSelector label={tc.age} options={AGE_OPTIONS} value={traits.age} onChange={(v) => setTrait('age', v)} lang={language} />
                  <TraitSelector label={tc.ethnicity} options={ETHNICITY_OPTIONS} value={traits.ethnicity} onChange={(v) => setTrait('ethnicity', v)} lang={language} />
                  <TraitSelector label={tc.hairLength || 'Hair length'} options={HAIR_LENGTH_OPTIONS} value={traits.hairLength} onChange={(v) => setTrait('hairLength', v)} lang={language} />
                  {traits.hairLength !== 'bald' && (
                    <TraitSelector label={tc.hairColor || 'Hair color'} options={HAIR_COLOR_OPTIONS} value={traits.hairColor} onChange={(v) => setTrait('hairColor', v)} lang={language} />
                  )}
                </div>
              )}

              {/* Variable traits: Pose, Mood, Framing - always visible */}
              <TraitSelector
                label={tm?.pose || 'Pose'}
                options={POSE_OPTIONS}
                value={traits.pose}
                onChange={(v) => setTrait('pose', v)}
                lang={language}
              />

              <TraitSelector
                label={tm?.mood || 'Mood'}
                options={MOOD_OPTIONS}
                value={traits.mood}
                onChange={(v) => setTrait('mood', v)}
                lang={language}
              />

              <TraitSelector
                label={tc.framing}
                options={FRAMING_OPTIONS}
                value={traits.framing}
                onChange={(v) => setTrait('framing', v)}
                lang={language}
              />

              <TraitSelector
                label={tc.lighting || 'Lighting'}
                options={LIGHTING_OPTIONS}
                value={traits.lighting}
                onChange={(v) => setTrait('lighting', v)}
                lang={language}
                compact
              />

              <TraitSelector
                label={tc.background || 'Background'}
                options={BACKGROUND_OPTIONS}
                value={traits.background}
                onChange={(v) => setTrait('background', v)}
                lang={language}
                compact
              />

              <TraitSelector
                label={tc.colorPalette || 'Color palette'}
                options={COLOR_PALETTE_OPTIONS}
                value={traits.colorPalette}
                onChange={(v) => setTrait('colorPalette', v)}
                lang={language}
                compact
              />

              {/* Special features */}
              <div>
                <label className="block text-xs font-medium text-[#666666] mb-1.5">{tc.specialFeatures}</label>
                <textarea
                  value={specialFeatures}
                  onChange={(e) => setSpecialFeatures(e.target.value)}
                  placeholder={tc.specialFeaturesPlaceholder}
                  rows={2}
                  className="w-full px-3 py-2 bg-white border border-[#E5E5E3] rounded-xl text-[#1A1A1A] placeholder-[#999999] focus:outline-none focus:border-[#FF6B35] focus:ring-2 focus:ring-[#FF6B35]/10 resize-none text-sm"
                />
              </div>

              {/* Batch count selector - only when NOT in pose mode */}
              {!isPoseMode && (
                <div>
                  <label className="block text-xs font-medium text-[#666666] mb-1.5">
                    {tm?.batchCount || 'Kiekis'}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[1, 2, 3, 4, 5].map((count) => (
                      <button
                        key={count}
                        onClick={() => setBatchCount(count)}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          batchCount === count
                            ? 'bg-[#FF6B35] text-white'
                            : 'bg-[#F7F7F5] text-[#666666] hover:bg-[#EFEFED] border border-[#E5E5E3]'
                        }`}
                      >
                        {count}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-[#999999] mt-1">
                    {batchCount === 1
                      ? '4 kreditai'
                      : `${4 + (batchCount - 1) * 4} kreditų (${batchCount} nuotr.)`}
                  </p>
                </div>
              )}

              {/* Prompt preview (collapsible) -- hidden in pose mode */}
              {!isPoseMode && (
                <div>
                  <button
                    onClick={() => setShowPrompt(!showPrompt)}
                    className="flex items-center gap-1.5 text-xs text-[#999999] hover:text-[#666666] transition-colors"
                  >
                    <svg className={`w-3 h-3 transition-transform ${showPrompt ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    {tc.prompt}
                  </button>
                  {showPrompt && (
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      rows={3}
                      className="w-full mt-2 px-3 py-2 bg-[#F7F7F5] border border-[#E5E5E3] rounded-xl text-[#1A1A1A] focus:outline-none focus:border-[#FF6B35] focus:ring-2 focus:ring-[#FF6B35]/10 resize-none text-xs font-mono"
                    />
                  )}
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                  {error}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer - only shown in selection and generating states */}
        {modalState !== 'result' && (
          <div className="flex gap-3 p-5 border-t border-[#E5E5E3]">
            <button
              onClick={handleClose}
              className="px-4 py-2.5 rounded-xl border border-[#E5E5E3] text-[#666666] text-sm font-medium hover:bg-[#F7F7F5] transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#FF6B35] focus:outline-none"
            >
              {hasSavedAny ? (tm?.done || 'Done') : tc.cancel}
            </button>

            {modalState === 'selection' && (
              <button
                onClick={isBatchMode ? handleBatchGenerate : handleGenerate}
                disabled={isGenerating || !canAddMore}
                className="flex-1 px-4 py-2.5 rounded-xl bg-[#FF6B35] text-white text-sm font-medium hover:bg-[#E55A2B] transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#FF6B35] focus:outline-none"
              >
                {!canAddMore
                  ? (tm?.photoLimit || 'Limitas pasiektas')
                  : isBatchMode
                    ? `${tc.generate} (${batchCount})`
                    : tc.generate}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Insufficient credits modal */}
      {creditError && (
        <InsufficientCreditsModal
          isOpen={!!creditError}
          onClose={clearCreditError}
          required={creditError.required}
          balance={creditError.balance}
        />
      )}
    </div>
  );
}
