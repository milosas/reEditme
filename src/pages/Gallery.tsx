import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { usePageTitle } from '../hooks/usePageTitle';
import { useGallery } from '../hooks/useGallery';
import { usePostProcess } from '../hooks/usePostProcess';
import { useSupabaseStorage } from '../hooks/useSupabaseStorage';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../hooks/useToast';
import { GalleryGrid } from '../components/gallery/GalleryGrid';
import { GalleryLightbox } from '../components/gallery/GalleryLightbox';
import { EmptyState } from '../components/gallery/EmptyState';
import { SectionHeader } from '../components/gallery/SectionHeader';
import { GalleryModelCard } from '../components/gallery/GalleryModelCard';
import { PostCard } from '../components/gallery/PostCard';
import { ModelDetailModal } from '../components/gallery/ModelDetailModal';
import { PaginationControls } from '../components/gallery/PaginationControls';
import { PostProcessToolbar } from '../components/generation/PostProcessToolbar';
import { LoginModal } from '../components/auth/LoginModal';
import { Skeleton, SkeletonCard, SkeletonPostCard } from '../components/ui/Skeleton';
import type { AvatarModel } from '../types/database';

export default function Gallery() {
  usePageTitle('Galerija/Įrašai');
  const { t } = useLanguage();
  const { showToast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const { images, models, posts, loading: galleryLoading, error, deleteImage, deletePost, refresh } = useGallery();
  const navigate = useNavigate();

  const [lightboxIndex, setLightboxIndex] = useState(-1);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<AvatarModel | null>(null);

  // Section collapse state
  const [openSections, setOpenSections] = useState({
    generated: true,
    models: true,
    posts: true,
  });

  const toggleSection = useCallback((section: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  }, []);

  // Pagination state per section
  const INITIAL_COUNT = 4;
  const PAGE_SIZE = 50;

  const [photosVisible, setPhotosVisible] = useState(INITIAL_COUNT);
  const [photosPage, setPhotosPage] = useState(0);

  const [modelsVisible, setModelsVisible] = useState(INITIAL_COUNT);
  const [modelsPage, setModelsPage] = useState(0);

  const [postsVisible, setPostsVisible] = useState(INITIAL_COUNT);
  const [postsPage, setPostsPage] = useState(0);

  // Editing state
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const postProcess = usePostProcess();
  const [postProcessResult, setPostProcessResult] = useState<{ url: string; base64?: string } | null>(null);
  const editSectionRef = useRef<HTMLDivElement>(null);
  const { saveGeneratedImage } = useSupabaseStorage();

  const loading = authLoading || galleryLoading;

  // Scroll to edit section when it appears
  useEffect(() => {
    if (editingIndex !== null && editSectionRef.current) {
      editSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [editingIndex]);

  const handleDelete = useCallback(async (imageId: string, storagePath: string) => {
    const currentIndex = lightboxIndex;
    const totalImages = images.length;

    // Clear editing if deleted image was being edited
    if (editingIndex !== null) {
      const deletedIndex = images.findIndex(img => img.id === imageId);
      if (deletedIndex === editingIndex) {
        setEditingIndex(null);
        setPostProcessResult(null);
        postProcess.reset();
      } else if (deletedIndex < editingIndex) {
        setEditingIndex(editingIndex - 1);
      }
    }

    try {
      await deleteImage(imageId, storagePath);
    } catch {
      showToast('Nepavyko ištrinti nuotraukos', 'error');
      return;
    }

    if (currentIndex >= 0 && totalImages > 1) {
      if (currentIndex >= totalImages - 1) {
        setLightboxIndex(currentIndex - 1);
      }
    } else if (totalImages <= 1) {
      setLightboxIndex(-1);
    }
  }, [lightboxIndex, images, editingIndex, deleteImage, postProcess, showToast]);

  const handleCreatePost = useCallback((index: number) => {
    const image = images[index];
    if (image) {
      navigate('/post-creator', { state: { galleryImageUrl: image.image_url, galleryImageId: image.id } });
    }
  }, [images, navigate]);

  const handleEdit = useCallback((index: number) => {
    setEditingIndex(index);
    setPostProcessResult(null);
    postProcess.reset();
  }, [postProcess]);

  const handleCloseEdit = useCallback(() => {
    setEditingIndex(null);
    setPostProcessResult(null);
    setPendingSavePrompt(null);
    postProcess.reset();
  }, [postProcess]);

  const getEditingImageUrl = (): string | null => {
    if (editingIndex === null || !images[editingIndex]) return null;
    return images[editingIndex].image_url;
  };

  const saveAndRefresh = async (result: { url: string; base64?: string }, prompt: string) => {
    if (!user) return;
    try {
      await saveGeneratedImage({
        imageUrl: result.url,
        imageBase64: result.base64,
        prompt,
        config: { type: 'post-process' }
      });
      refresh();
    } catch (err) {
      console.error('Failed to save post-processed image:', err);
      showToast('Nepavyko išsaugoti redaguotos nuotraukos', 'error');
    }
  };

  const [pendingSavePrompt, setPendingSavePrompt] = useState<string | null>(null);

  const handleApply = useCallback(async (type: 'background' | 'pose' | 'edit', prompt: string) => {
    const sourceUrl = getEditingImageUrl();
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
  }, [editingIndex, images, postProcess]);

  const handleSaveResult = useCallback(async () => {
    if (!postProcessResult || !pendingSavePrompt) return;
    await saveAndRefresh(postProcessResult, pendingSavePrompt);
    setPendingSavePrompt(null);
    showToast('Nuotrauka išsaugota', 'success');
  }, [postProcessResult, pendingSavePrompt, saveAndRefresh, showToast]);

  const handleModelTryOn = useCallback((imageUrl: string) => {
    setSelectedModel(null);
    // Find the avatar model that owns this photo to pass its ID to Generator
    const ownerModel = models.find(m => m.photos?.some(p => p.image_url === imageUrl));
    if (ownerModel) {
      navigate(`/generator?selectAvatar=${ownerModel.id}`);
    } else {
      navigate('/generator');
    }
  }, [navigate, models]);

  const handleModelDownload = useCallback(async (imageUrl: string, name: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name}-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      window.open(imageUrl, '_blank');
    }
  }, []);

  const handleDeleteModel = useCallback(async (modelId: string) => {
    try {
      const { error } = await (await import('../lib/supabase')).supabase
        .from('avatar_models')
        .delete()
        .eq('id', modelId);
      if (!error) {
        refresh();
      } else {
        showToast('Nepavyko ištrinti modelio', 'error');
      }
    } catch {
      showToast('Nepavyko ištrinti modelio', 'error');
    }
  }, [refresh, showToast]);

  const handleCopyPostText = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast('Tekstas nukopijuotas', 'success');
    } catch {
      showToast('Nepavyko nukopijuoti teksto', 'error');
    }
  }, [showToast]);

  const handleDeletePost = useCallback(async (postId: string) => {
    try {
      await deletePost(postId);
    } catch {
      showToast('Nepavyko ištrinti įrašo', 'error');
    }
  }, [deletePost, showToast]);

  const pp = (t as Record<string, unknown>).postProcess as Record<string, string> | undefined;

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-5 w-20" />
        </div>
        {/* Skeleton: generated photos */}
        <div className="mb-8">
          <Skeleton className="h-6 w-56 mb-4" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {[0, 1, 2, 3].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
        {/* Skeleton: models */}
        <div className="mb-8">
          <Skeleton className="h-6 w-32 mb-4" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="rounded-lg overflow-hidden">
                <div className="skeleton w-full aspect-square" />
              </div>
            ))}
          </div>
        </div>
        {/* Skeleton: posts */}
        <div>
          <Skeleton className="h-6 w-28 mb-4" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {[0, 1, 2, 3].map((i) => (
              <SkeletonPostCard key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl md:text-3xl font-bold text-[#1A1A1A] mb-6">
          {t.gallery?.title || 'My Gallery'}
        </h1>
        <div className="bg-white border border-[#E5E5E3] rounded-2xl p-6">
          <EmptyState type="guest" onAction={() => setIsLoginModalOpen(true)} />
        </div>
        <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl md:text-3xl font-bold text-[#1A1A1A] mb-6">
          {t.gallery?.title || 'My Gallery'}
        </h1>
        <div className="bg-white border border-[#E5E5E3] rounded-2xl p-6">
          <div className="flex flex-col items-center justify-center py-16">
            <p className="text-red-500 mb-4">{t.gallery?.error || 'Failed to load gallery'}</p>
            <button
              onClick={refresh}
              className="px-6 py-3 bg-[#FF6B35] text-white rounded-full hover:bg-[#E55A2B] transition-all"
            >
              {t.actions?.regenerate || 'Try Again'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const totalItems = images.length + models.length + posts.length;

  if (totalItems === 0) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl md:text-3xl font-bold text-[#1A1A1A] mb-6">
          {t.gallery?.title || 'My Gallery'}
        </h1>
        <div className="bg-white border border-[#E5E5E3] rounded-2xl p-6">
          <EmptyState type="empty" onAction={() => navigate('/')} />
        </div>
      </div>
    );
  }

  const editingImage = editingIndex !== null ? images[editingIndex] : null;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-[#1A1A1A]">
          {t.gallery?.title || 'My Gallery'}
        </h1>
        <div className="flex items-center gap-3">
          <p className="text-[#999999] text-sm">
            {totalItems} {totalItems === 1 ? 'item' : 'items'}
          </p>
          <button
            onClick={refresh}
            className="p-2 text-[#999999] hover:text-[#1A1A1A] hover:bg-[#F7F7F5] rounded-lg transition-all"
            aria-label="Atnaujinti"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* ===== Section 1: Sugeneruotos nuotraukos (Generated photos) ===== */}
      {images.length > 0 && (() => {
        const start = photosPage * PAGE_SIZE;
        const sliced = images.slice(start, start + photosVisible);
        return (
          <div className="mb-8">
            <SectionHeader
              title="Sugeneruotos nuotraukos"
              count={images.length}
              isOpen={openSections.generated}
              onToggle={() => toggleSection('generated')}
            />
            {openSections.generated && (
              <div className="mt-3">
                <GalleryGrid
                  images={sliced}
                  indexOffset={start}
                  onImageClick={(index) => setLightboxIndex(index)}
                  onDelete={handleDelete}
                  onEdit={handleEdit}
                  onCreatePost={handleCreatePost}
                />
                <PaginationControls
                  totalCount={images.length}
                  visibleCount={photosVisible}
                  page={photosPage}
                  pageSize={PAGE_SIZE}
                  initialCount={INITIAL_COUNT}
                  onShowMore={() => setPhotosVisible(PAGE_SIZE)}
                  onShowLess={() => { setPhotosVisible(INITIAL_COUNT); setPhotosPage(0); }}
                  onNextPage={() => setPhotosPage(p => p + 1)}
                  onPrevPage={() => setPhotosPage(p => Math.max(0, p - 1))}
                />
              </div>
            )}
          </div>
        );
      })()}

      {/* ===== Section 2: Modeliai (Models) ===== */}
      {models.length > 0 && (() => {
        const start = modelsPage * PAGE_SIZE;
        const slicedModels = models.slice(start, start + modelsVisible);
        return (
          <div className="mb-8">
            <SectionHeader
              title="Modeliai"
              count={models.length}
              isOpen={openSections.models}
              onToggle={() => toggleSection('models')}
            />
            {openSections.models && (
              <div className="mt-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {slicedModels.map((model) => (
                    <GalleryModelCard
                      key={model.id}
                      model={model}
                      onClick={() => setSelectedModel(model)}
                    />
                  ))}
                </div>
                <PaginationControls
                  totalCount={models.length}
                  visibleCount={modelsVisible}
                  page={modelsPage}
                  pageSize={PAGE_SIZE}
                  initialCount={INITIAL_COUNT}
                  onShowMore={() => setModelsVisible(PAGE_SIZE)}
                  onShowLess={() => { setModelsVisible(INITIAL_COUNT); setModelsPage(0); }}
                  onNextPage={() => setModelsPage(p => p + 1)}
                  onPrevPage={() => setModelsPage(p => Math.max(0, p - 1))}
                />
              </div>
            )}
          </div>
        );
      })()}

      {/* ===== Section 3: Įrašai (Posts) ===== */}
      {posts.length > 0 && (() => {
        const start = postsPage * PAGE_SIZE;
        const slicedPosts = posts.slice(start, start + postsVisible);
        return (
          <div className="mb-8">
            <SectionHeader
              title="Įrašai"
              count={posts.length}
              isOpen={openSections.posts}
              onToggle={() => toggleSection('posts')}
            />
            {openSections.posts && (
              <div className="mt-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {slicedPosts.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      onDelete={handleDeletePost}
                      onCopy={handleCopyPostText}
                    />
                  ))}
                </div>
                <PaginationControls
                  totalCount={posts.length}
                  visibleCount={postsVisible}
                  page={postsPage}
                  pageSize={PAGE_SIZE}
                  initialCount={INITIAL_COUNT}
                  onShowMore={() => setPostsVisible(PAGE_SIZE)}
                  onShowLess={() => { setPostsVisible(INITIAL_COUNT); setPostsPage(0); }}
                  onNextPage={() => setPostsPage(p => p + 1)}
                  onPrevPage={() => setPostsPage(p => Math.max(0, p - 1))}
                />
              </div>
            )}
          </div>
        );
      })()}

      {/* Edit section -- appears when Edit icon is clicked on a photo */}
      {editingImage && (
        <div ref={editSectionRef} className="mt-8">
          {/* Editing header with preview */}
          <div className="flex items-center gap-4 mb-2">
            <div className="w-14 h-14 rounded-xl overflow-hidden bg-[#F7F7F5] flex-shrink-0 ring-2 ring-[#FF6B35]">
              <img
                src={editingImage.image_url}
                alt="Redaguojama nuotrauka"
                className="w-full h-full object-cover object-top"
              />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-[#1A1A1A]">
                {pp?.title || 'Redaguoti nuotrauka'}
              </h3>
            </div>
            <button
              onClick={handleCloseEdit}
              className="p-2 text-[#999999] hover:text-[#1A1A1A] hover:bg-[#F7F7F5] rounded-lg transition-colors"
              aria-label={t.actions?.cancel || 'Uždaryti'}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Post-process result */}
          {postProcessResult && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-[#1A1A1A] mb-2">
                {pp?.result || 'Redaguota nuotrauka'}
              </h4>
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
                    {pp?.save || 'Saugoti'}
                  </button>
                  <button
                    onClick={() => { setPostProcessResult(null); setPendingSavePrompt(null); }}
                    className="px-4 py-2.5 rounded-xl bg-[#F7F7F5] text-[#666666] text-sm font-medium hover:bg-[#EEEEED] transition-colors"
                  >
                    {pp?.discard || 'Atmesti'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* PostProcess toolbar */}
          <PostProcessToolbar
            isProcessing={postProcess.isProcessing}
            onApply={handleApply}
          />

          {postProcess.error && (
            <p className="mt-2 text-sm text-red-500">{postProcess.error}</p>
          )}
        </div>
      )}

      <GalleryLightbox
        images={images}
        open={lightboxIndex >= 0}
        index={lightboxIndex >= 0 ? lightboxIndex : 0}
        onClose={() => setLightboxIndex(-1)}
        onIndexChange={setLightboxIndex}
        onDelete={handleDelete}
      />

      {selectedModel && (
        <ModelDetailModal
          model={selectedModel}
          onClose={() => setSelectedModel(null)}
          onCreatePost={handleModelTryOn}
          onDownload={handleModelDownload}
          onDelete={handleDeleteModel}
        />
      )}
    </div>
  );
}
