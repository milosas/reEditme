import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { usePageTitle } from '../hooks/usePageTitle';
import { useLanguage } from '../contexts/LanguageContext';
import type { Translations } from '../i18n/translations';
import { useAuth } from '../hooks/useAuth';
import { usePostCreator } from '../hooks/usePostCreator';
import { POST_IMAGE_SIZES } from '../constants/fluxOptions';
import { GuestCreditBanner } from '../components/credits/GuestCreditBanner';
import { AnimatedSection } from '../components/animation/AnimatedSection';
import { PostConfigPanel } from '../components/post-creator/PostConfig';
import { StreamingText } from '../components/post-creator/StreamingText';
import { SocialPreview } from '../components/post-creator/SocialPreview';
import { PostActionButtons } from '../components/post-creator/PostActionButtons';
import { ImageSourceToggle } from '../components/post-creator/ImageSourceToggle';
import { PublishButtons } from '../components/post-creator/PublishButtons';
import { InsufficientCreditsModal } from '../components/credits/InsufficientCreditsModal';

export default function PostCreator() {
  usePageTitle('Turinio kūrimas');
  const { t } = useLanguage();
  const { user } = useAuth();
  const pc = usePostCreator();
  const location = useLocation();

  // Accept gallery image from navigation state
  const galleryImageUrl = (location.state as { galleryImageUrl?: string } | null)?.galleryImageUrl;

  useEffect(() => {
    if (galleryImageUrl) {
      pc.setImageSource('gallery');
      pc.setImagePreview(galleryImageUrl);
      // Clear navigation state so refresh doesn't re-apply
      window.history.replaceState({}, '');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const p = t.postCreatorPage || ({} as Partial<NonNullable<Translations['postCreatorPage']>>);
  const canGenerate = pc.prompt.trim().length >= 3;
  const isLoading = pc.isLoadingText || pc.isLoadingImage;

  // Resolve the displayed image: AI-generated, uploaded, or gallery preview
  const displayImageUrl = pc.generatedImageUrl || (['upload', 'gallery'].includes(pc.imageSource) ? pc.imagePreview : null);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl md:text-3xl font-bold text-[#1A1A1A] mb-2">
        {p.title || 'Post Creator'}
      </h1>
      <p className="text-[#666] mb-8">
        {p.subtitle || 'Generate AI-powered social media posts'}
      </p>

      {/* Guest credit banner */}
      {!user && <GuestCreditBanner />}

      <div className="space-y-6">
        {/* 1. Topic Textarea */}
        <AnimatedSection delay={0}><div>
          <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">
            {p.topicLabel || 'Apie ką bus įrašas, trumpai apibūdinkite'}
          </label>
          <textarea
            value={pc.prompt}
            onChange={(e) => pc.setPrompt(e.target.value)}
            placeholder={p.topicPlaceholder || 'Pvz.: Nauja kolekcija, vasaros nuolaidos, produkto pristatymas...'}
            rows={3}
            className="w-full px-4 py-3 border border-[#E5E5E3] rounded-xl text-sm text-[#1A1A1A] placeholder-[#999] focus:border-[#FF6B35] focus:ring-1 focus:ring-[#FF6B35]/20 outline-none resize-none transition-colors"
          />
        </div></AnimatedSection>

        {/* 2. Image Source */}
        <AnimatedSection delay={0.1}><div>
          <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">
            {p.imageLabel || 'Paveikslėlis'}
          </label>
          <ImageSourceToggle
            imageSource={pc.imageSource}
            onImageSourceChange={pc.setImageSource}
            imagePreview={pc.imagePreview}
            onFileSelect={(file, preview) => {
              pc.setImageFile(file);
              pc.setImagePreview(preview);
            }}
            onFileRemove={() => {
              pc.setImageFile(null);
              pc.setImagePreview(null);
            }}
            isLoadingImage={pc.isLoadingImage}
            labels={{
              upload: p.imageUpload || 'Įkelti',
              ai: p.imageAi || 'AI generuoti',
              uploadHint: p.imageUploadHint || 'JPG, PNG',
              aiHint: p.imageAiHint || 'AI sugeneruos paveikslėlį pagal temą',
              remove: p.imageRemove || 'Pašalinti',
              dragDrop: p.imageDragDrop || 'Paspauskite arba vilkite paveikslėlį',
            }}
          />
        </div></AnimatedSection>

        {/* 2.3. Image size selector (only for AI generation) */}
        {pc.imageSource === 'ai' && (
          <AnimatedSection delay={0.15}><div>
            <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">
              {'Paveikslėlio formatas'}
            </label>
            <div className="flex flex-wrap gap-2">
              {POST_IMAGE_SIZES.map((size) => {
                const isSelected = pc.imageSize === size.id;
                return (
                  <button
                    key={size.id}
                    onClick={() => pc.setImageSize(size.id)}
                    className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                      isSelected
                        ? 'bg-[#FF6B35] text-white'
                        : 'bg-[#F7F7F5] text-[#666666] border border-[#E5E5E3] hover:border-[#FF6B35] hover:text-[#FF6B35]'
                    }`}
                  >
                    {size.name}
                    <span className="ml-1 text-xs opacity-70">{size.description}</span>
                  </button>
                );
              })}
            </div>
          </div></AnimatedSection>
        )}

        {/* 2.5. Generate text from image button */}
        {pc.imagePreview && !pc.generatedText && (
          <button
            onClick={pc.generateFromImage}
            disabled={pc.isGeneratingFromImage || pc.isStreaming}
            className="w-full py-3 border-2 border-dashed border-[#FF6B35]/30 text-[#FF6B35] font-medium rounded-xl hover:bg-[#FFF0EB] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {pc.isGeneratingFromImage ? (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-[#FF6B35] border-t-transparent animate-spin" />
                {p.generatingTextFromImage || 'Generuojamas tekstas...'}
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-xs sm:text-sm">{p.generateTextFromImage || 'Sugeneruoti tekstą pagal nuotrauką'}</span>
              </>
            )}
          </button>
        )}

        {/* 3. Post Config */}
        <AnimatedSection delay={0.2}><div>
          <label className="block text-sm font-medium text-[#1A1A1A] mb-3">
            {p.settingsLabel || 'Nustatymai'}
          </label>
          <div className="bg-[#F7F7F5] rounded-xl p-4">
            <PostConfigPanel
              tone={pc.tone}
              emoji={pc.emoji}
              length={pc.length}
              onToneChange={pc.setTone}
              onEmojiChange={pc.setEmoji}
              onLengthChange={pc.setLength}
              labels={{
                tone: p.toneLabel || 'Tonas',
                emoji: p.emojiLabel || 'Emoji',
                length: p.lengthLabel || 'Ilgis',
                tones: {
                  professional: p.toneProfessional || 'Profesionalus',
                  friendly: p.toneFriendly || 'Draugiškas',
                  motivating: p.toneMotivating || 'Motyvuojantis',
                  humorous: p.toneHumorous || 'Humoristinis',
                },
                emojis: {
                  yes: p.emojiYes || 'Taip',
                  no: p.emojiNo || 'Ne',
                  minimal: p.emojiMinimal || 'Minimaliai',
                },
                lengths: {
                  short: p.lengthShort || 'Trumpas',
                  medium: p.lengthMedium || 'Vidutinis',
                  long: p.lengthLong || 'Ilgas',
                },
              }}
            />
          </div>
        </div></AnimatedSection>

        {/* 4. Generate Button */}
        <button
          onClick={pc.generate}
          disabled={!canGenerate || isLoading}
          className="w-full py-3.5 bg-[#FF6B35] text-white font-semibold rounded-xl hover:bg-[#E55A2B] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
              {p.generating || 'Generuojama...'}
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              {p.generate || 'Generuoti įrašą'}
            </>
          )}
        </button>

        {/* 5. Error Display */}
        {pc.error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-sm text-red-600">{pc.error}</p>
          </div>
        )}

        {/* 6. Streaming Text */}
        {(pc.generatedText || pc.isStreaming) && (
          <div>
            <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
              {p.resultLabel || 'Sugeneruotas tekstas'}
            </label>
            <StreamingText
              text={pc.generatedText}
              isStreaming={pc.isStreaming}
              placeholder={p.resultPlaceholder}
            />
          </div>
        )}

        {/* 7. Social Preview */}
        {pc.generatedText && (
          <div>
            <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
              {p.previewLabel || 'Peržiūra'}
            </label>
            <SocialPreview
              text={pc.generatedText}
              imageUrl={displayImageUrl}
              labels={{
                facebook: p.previewFacebook || 'Facebook',
                instagram: p.previewInstagram || 'Instagram',
                mobile: p.previewMobile || 'Mobilus',
                desktop: p.previewDesktop || 'Kompiuteris',
              }}
            />
          </div>
        )}

        {/* 8. Action Buttons */}
        {pc.generatedText && (
          <PostActionButtons
            onCopy={pc.copyText}
            onRegenerateText={pc.regenerateText}
            onRegenerateImage={pc.regenerateImage}
            isLoadingText={pc.isLoadingText}
            isLoadingImage={pc.isLoadingImage}
            hasText={!!pc.generatedText}
            hasImage={pc.imageSource === 'ai'}
            labels={{
              copy: p.copy || 'Kopijuoti',
              copied: p.copied || 'Nukopijuota!',
              regenerateText: p.regenerateText || 'Naujas tekstas',
              regenerateImage: p.regenerateImage || 'Naujas paveikslėlis',
            }}
          />
        )}

        {/* 10. Social Publishing */}
        {pc.generatedText && (
          <PublishButtons
            text={pc.generatedText}
            imageUrl={displayImageUrl}
          />
        )}

        {/* 11. Save Status */}
        {(pc.isSaving || pc.savedPostId) && (
          <div className="text-center">
            {pc.isSaving ? (
              <p className="text-sm text-[#999] flex items-center justify-center gap-2">
                <div className="w-3 h-3 rounded-full border border-[#999] border-t-transparent animate-spin" />
                {p.saving || 'Saugoma...'}
              </p>
            ) : pc.savedPostId ? (
              <p className="text-sm text-green-600 flex items-center justify-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {p.saved || 'Išsaugota'}
              </p>
            ) : null}
          </div>
        )}
      </div>

      {/* Insufficient credits modal */}
      {pc.creditError && (
        <InsufficientCreditsModal
          isOpen={!!pc.creditError}
          onClose={pc.clearCreditError}
          required={pc.creditError.required}
          balance={pc.creditError.balance}
        />
      )}
    </div>
  );
}
