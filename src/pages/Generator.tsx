import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { usePageTitle } from '../hooks/usePageTitle';
import { useCustomAvatars } from '../hooks/useCustomAvatars';
import { useImageUpload } from '../hooks/useImageUpload';
import { useGeneration } from '../hooks/useGeneration';
import { usePostProcess } from '../hooks/usePostProcess';
import { useSupabaseStorage } from '../hooks/useSupabaseStorage';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../contexts/LanguageContext';
import { GuestCreditBanner } from '../components/credits/GuestCreditBanner';
import { AnimatedSection } from '../components/animation/AnimatedSection';
import { ImageUploader } from '../components/upload/ImageUploader';
import { ConfigPanel } from '../components/config/ConfigPanel';
import { Button } from '../components/ui/Button';
import { LoadingOverlay } from '../components/generation/LoadingOverlay';
import { ResultsGallery } from '../components/generation/ResultsGallery';
import { ResultsActions } from '../components/generation/ResultsActions';
import { PostProcessToolbar } from '../components/generation/PostProcessToolbar';
import { ErrorMessage } from '../components/generation/ErrorMessage';
import type { Config, GarmentLabel } from '../types';
import { GARMENT_LABELS } from '../types';
import { InsufficientCreditsModal } from '../components/credits/InsufficientCreditsModal';

export default function Generator() {
  usePageTitle('Generatorius');
  const { t } = useLanguage();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { avatars: customAvatars } = useCustomAvatars();

  // Image upload state
  const {
    images,
    addImages,
    removeImage,
    clearImages,
    canAddMore,
    hasImages
  } = useImageUpload();

  // Configuration state
  const [config, setConfig] = useState<Config>({
    avatar: null,
    qualityMode: 'balanced',
    imageCount: 1
  });

  // Garment labels per uploaded image
  const [garmentLabels, setGarmentLabels] = useState<(GarmentLabel | null)[]>([]);

  const handleRemoveImage = (index: number) => {
    removeImage(index);
    setGarmentLabels(prev => prev.filter((_, i) => i !== index));
  };

  const handleSetLabel = (index: number, label: GarmentLabel | null) => {
    setGarmentLabels(prev => {
      const next = [...prev];
      next[index] = label;
      return next;
    });
  };

  // Generation state
  const { state, creditError, clearCreditError, generate, cancel, reset } = useGeneration();

  // Post-processing state
  const [selectedResultIndex, setSelectedResultIndex] = useState(0);
  const postProcess = usePostProcess();
  const [postProcessResult, setPostProcessResult] = useState<{ url: string; base64?: string } | null>(null);
  const { saveGeneratedImage } = useSupabaseStorage();

  // Handle avatar selection from URL param (from Avatars page)
  useEffect(() => {
    const selectAvatarId = searchParams.get('selectAvatar');
    if (selectAvatarId && customAvatars.length > 0) {
      const avatar = customAvatars.find(a => a.id === selectAvatarId);
      if (avatar) {
        setConfig(prev => ({
          ...prev,
          avatar: {
            id: avatar.id,
            name: t.customAvatars?.customAvatar || 'Custom Model',
            description: avatar.description || t.customAvatars?.customAvatar || 'Custom model',
            imageUrl: avatar.image_url,
            promptDescription: avatar.description || 'the person shown in the reference image',
            isCustom: true
          }
        }));
        setSearchParams({}, { replace: true });
      }
    }
  }, [searchParams, customAvatars, setSearchParams, t]);

  // Form validation — need avatar + clothing image + all garment types selected
  const allLabelsSet = images.length > 0 && images.every((_, i) => !!garmentLabels[i]);
  const canGenerate = hasImages && config.avatar !== null && allLabelsSet;

  const handleGenerate = () => {
    if (!canGenerate) return;
    const labels = garmentLabels.map(l => l ?? null);
    generate(config, images, labels);
  };

  const handleRegenerate = () => {
    const labels = garmentLabels.map(l => l ?? null);
    generate(config, images, labels);
  };

  const handleNewUpload = () => {
    reset();
    clearImages();
    setGarmentLabels([]);
    postProcess.reset();
    setPostProcessResult(null);
    setSelectedResultIndex(0);
    setConfig({
      avatar: null,
      qualityMode: 'balanced',
      imageCount: 1
    });
  };

  const handleErrorDismiss = () => {
    reset();
  };

  // Get the source image URL for post-processing
  const getSelectedImageUrl = (): string | null => {
    if (!state.results || state.results.length === 0) return null;
    return state.results[selectedResultIndex]?.url || null;
  };

  const savePostProcessResult = async (result: { url: string; base64?: string }, prompt: string) => {
    if (!user) return;
    try {
      await saveGeneratedImage({
        imageUrl: result.url,
        imageBase64: result.base64,
        prompt,
        config: { type: 'post-process' }
      });
    } catch (err) {
      console.error('Failed to save post-processed image:', err);
    }
  };

  const [pendingSavePrompt, setPendingSavePrompt] = useState<string | null>(null);

  const handleApply = async (type: 'background' | 'pose' | 'edit', prompt: string) => {
    const sourceUrl = getSelectedImageUrl();
    if (!sourceUrl) return;

    const action = type === 'background' ? 'background' : 'edit';
    const params = type === 'background'
      ? { backgroundPrompt: prompt }
      : { editPrompt: prompt };

    const result = await postProcess.process(action, sourceUrl, params);
    if (result) {
      setPostProcessResult(result);
      setPendingSavePrompt(`${type}: ${prompt}`);
    }
  };

  const handleSaveResult = async () => {
    if (!postProcessResult || !pendingSavePrompt) return;
    await savePostProcessResult(postProcessResult, pendingSavePrompt);
    setPendingSavePrompt(null);
  };

  return (
    <div className="">
      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Guest credit banner */}
        {!user && <GuestCreditBanner />}

        {state.status === 'success' && state.results && state.results.length > 0 ? (
          <div className="animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-[#1A1A1A]">
                {t.results.title}
              </h2>
            </div>
            <ResultsGallery
              images={state.results}
              selectedIndex={selectedResultIndex}
              onSelectImage={setSelectedResultIndex}
            />

            {/* Info notice */}
            <div className="mt-4 flex flex-col sm:flex-row gap-3">
              <div className="flex items-start gap-2 bg-[#F7F7F5] border border-[#E5E5E3] rounded-xl px-4 py-3 flex-1">
                <svg className="w-4 h-4 text-[#FF6B35] mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div className="text-xs text-[#666666] space-y-0.5">
                  <p>{t.results.downloadHint}</p>
                  <p>{t.results.selectToEdit}</p>
                </div>
              </div>
            </div>

            {/* Post-process result preview */}
            {postProcessResult && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-[#1A1A1A] mb-3">
                  {(t as Record<string, unknown>).postProcess
                    ? ((t as Record<string, unknown>).postProcess as Record<string, string>).result || 'Post-apdorojimo rezultatas'
                    : 'Post-apdorojimo rezultatas'}
                </h3>
                <div className="max-w-md">
                  <img
                    src={postProcessResult.url}
                    alt="Post-processed result"
                    className="w-full h-auto rounded-lg ring-2 ring-[#FF6B35]"
                  />
                </div>
                {pendingSavePrompt && (
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={handleSaveResult}
                      className="px-5 py-2.5 rounded-xl bg-[#10B981] text-white text-sm font-medium hover:bg-[#059669] transition-colors flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Saugoti
                    </button>
                    <button
                      onClick={() => { setPostProcessResult(null); setPendingSavePrompt(null); }}
                      className="px-4 py-2.5 rounded-xl bg-[#F7F7F5] text-[#666666] text-sm font-medium hover:bg-[#EEEEED] transition-colors"
                    >
                      Atmesti
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Post-processing toolbar */}
            <PostProcessToolbar
              isProcessing={postProcess.isProcessing}
              onApply={handleApply}
            />

            {postProcess.error && (
              <p className="mt-2 text-sm text-red-500">{postProcess.error}</p>
            )}

            <ResultsActions
              onRegenerate={handleRegenerate}
              onNewUpload={handleNewUpload}
            />
          </div>
        ) : (
          <div className="flex flex-col md:flex-row gap-6">
            {/* Left Column: Upload */}
            <AnimatedSection direction="left" className="w-full md:w-1/2">
              <div className="bg-white border border-[#E5E5E3] rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-[#1A1A1A] mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-[#FF6B35] flex items-center justify-center text-sm text-white font-bold">
                    1
                  </span>
                  {t.upload.title}
                </h2>

                <ImageUploader
                  onFilesSelected={addImages}
                  canAddMore={canAddMore}
                />

                {/* Garment upload hints */}
                {!hasImages && (
                  <div className="mt-3 p-3 bg-[#F7F7F5] border border-[#E5E5E3] rounded-xl space-y-1.5">
                    <p className="text-xs font-medium text-[#666666]">Patarimai drabužių nuotraukoms:</p>
                    <p className="text-xs text-[#999999] flex items-start gap-1.5">
                      <span className="text-[#FF6B35] mt-0.5 flex-shrink-0">•</span>
                      Plokščias fonas (balta/pilka) — geriausi rezultatai
                    </p>
                    <p className="text-xs text-[#999999] flex items-start gap-1.5">
                      <span className="text-[#FF6B35] mt-0.5 flex-shrink-0">•</span>
                      Drabužis turi būti aiškiai matomas (nelankstytas, nesuspausta)
                    </p>
                    <p className="text-xs text-[#999999] flex items-start gap-1.5">
                      <span className="text-[#FF6B35] mt-0.5 flex-shrink-0">•</span>
                      Galima įkelti iki 4 drabužių — kiekvienas bus uždėtas nuosekliai
                    </p>
                  </div>
                )}

                {/* Garment label selectors — shown inline after each uploaded image */}
                {hasImages ? (
                  <div className="mt-3 space-y-2">
                    {images.map((img, i) => (
                      <div key={img.previewUrl} className="flex items-center gap-3 bg-[#F7F7F5] border border-[#E5E5E3] rounded-xl px-3 py-2">
                        <img
                          src={img.previewUrl}
                          alt={`Drabužis ${i + 1}`}
                          className="w-10 h-10 object-cover rounded-lg flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-[#999999] mb-1">Drabužio tipas</p>
                          <select
                            value={garmentLabels[i] ?? ''}
                            onChange={e => handleSetLabel(i, (e.target.value as GarmentLabel) || null)}
                            className="w-full text-sm bg-white border border-[#E5E5E3] rounded-lg px-2 py-1 text-[#1A1A1A] focus:outline-none focus:border-[#FF6B35] focus:ring-1 focus:ring-[#FF6B35]"
                          >
                            <option value="">— Pasirinkti —</option>
                            {GARMENT_LABELS.map(opt => (
                              <option key={opt.id} value={opt.id}>{opt.name}</option>
                            ))}
                          </select>
                        </div>
                        <button
                          onClick={() => handleRemoveImage(i)}
                          className="p-1.5 text-[#999999] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                          aria-label="Pašalinti"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                    {images.length > 1 && (
                      <p className="text-xs text-[#999999] flex items-center gap-1.5 pt-1">
                        <svg className="w-3.5 h-3.5 text-[#FF6B35] flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        Visi drabužiai bus uždėti ant vieno avataro — vienas rezultatas
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-[#FF6B35]">
                    {t.validation.noImages}
                  </p>
                )}
              </div>
            </AnimatedSection>

            {/* Right Column: Configuration */}
            <AnimatedSection direction="right" delay={0.1} className="w-full md:w-1/2">
              <div className="bg-white border border-[#E5E5E3] rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-[#1A1A1A] mb-2 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-[#1A1A1A] flex items-center justify-center text-sm text-white font-bold">
                    2
                  </span>
                  {t.config.title}
                </h2>
                <p className="text-xs text-[#999999] mb-4 flex items-start gap-1.5">
                  <span className="text-[#FF6B35] mt-0.5 flex-shrink-0">ℹ</span>
                  Modelio nuotrauka turi rodyti <strong className="text-[#666666]">visą kūną</strong> (nuo galvos iki pėdų) — taip drabužiai bus uždėti tiksliau
                </p>
                <ConfigPanel
                  config={config}
                  onConfigChange={setConfig}
                />
              </div>

              {/* Generate Button */}
              <div className="mt-6">
                <Button
                  onClick={handleGenerate}
                  disabled={!canGenerate}
                  className="w-full text-lg py-4"
                >
                  {t.actions.generate}
                </Button>

                {!canGenerate && (
                  <div className="mt-3 space-y-1">
                    {!hasImages && (
                      <p className="text-sm text-[#999999] flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#FF6B35]" />
                        {t.validation.noImages}
                      </p>
                    )}
                    {!config.avatar && (
                      <p className="text-sm text-[#999999] flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#FF6B35]" />
                        {t.validation.noAvatar}
                      </p>
                    )}
                    {hasImages && !allLabelsSet && (
                      <p className="text-sm text-[#999999] flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#FF6B35]" />
                        Pasirinkite drabužio tipą kiekvienai nuotraukai
                      </p>
                    )}
                  </div>
                )}
              </div>
            </AnimatedSection>
          </div>
        )}
      </div>

      {/* Loading Overlay */}
      {state.status === 'loading' && (
        <LoadingOverlay progress={state.progress} onCancel={cancel} />
      )}

      {/* Error Overlay - skip for insufficient credits since we show the modal */}
      {state.status === 'error' && state.error && state.error !== 'INSUFFICIENT_CREDITS' && (
        <ErrorMessage errorType={state.error} onDismiss={handleErrorDismiss} />
      )}

      {/* Insufficient credits modal */}
      {creditError && (
        <InsufficientCreditsModal
          isOpen={!!creditError}
          onClose={() => { clearCreditError(); handleErrorDismiss(); }}
          required={creditError.required}
          balance={creditError.balance}
        />
      )}
    </div>
  );
}
