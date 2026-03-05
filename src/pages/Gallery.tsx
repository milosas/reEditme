import { useState, useRef, useEffect, memo } from 'react';
import { useNavigate } from 'react-router';
import { usePageTitle } from '../hooks/usePageTitle';
import { useGallery } from '../hooks/useGallery';
import { usePostProcess } from '../hooks/usePostProcess';
import { useSupabaseStorage } from '../hooks/useSupabaseStorage';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../contexts/LanguageContext';
import { GalleryGrid } from '../components/gallery/GalleryGrid';
import { GalleryLightbox } from '../components/gallery/GalleryLightbox';
import { EmptyState } from '../components/gallery/EmptyState';
import { PostProcessToolbar } from '../components/generation/PostProcessToolbar';
import { LoginModal } from '../components/auth/LoginModal';
import { formatRelativeTime } from '../utils/date';
import { Skeleton, SkeletonCard, SkeletonPostCard } from '../components/ui/Skeleton';
import type { AvatarModel, GeneratedPost } from '../types/database';

const SectionHeader = memo(function SectionHeader({
  title,
  count,
  isOpen,
  onToggle,
}: {
  title: string;
  count: number;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-3 w-full text-left group py-2"
    >
      <h2 className="text-lg font-semibold text-[#1A1A1A]">{title}</h2>
      <span className="px-2 py-0.5 text-xs font-medium bg-[#F7F7F5] text-[#999999] rounded-full">
        {count}
      </span>
      <svg
        className={`w-4 h-4 text-[#999999] transition-transform ml-auto ${isOpen ? 'rotate-180' : ''}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  );
});

const ModelCard = memo(function ModelCard({ model, onClick }: { model: AvatarModel; onClick: () => void }) {
  const coverPhoto = model.photos?.find(p => p.id === model.cover_photo_id) || model.photos?.[0];
  const photoCount = model.photos?.length || 0;

  return (
    <div
      onClick={onClick}
      className="group relative rounded-lg overflow-hidden bg-gray-100 cursor-pointer shadow-sm hover:shadow-md transition-all"
    >
      {coverPhoto ? (
        <img
          src={coverPhoto.image_url}
          alt={model.name}
          className="w-full aspect-square object-cover object-top"
          loading="lazy"
        />
      ) : (
        <div className="w-full aspect-square flex items-center justify-center bg-[#F7F7F5]">
          <svg className="w-12 h-12 text-[#CCCCCC]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
      )}

      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      {/* Info bar */}
      <div className="absolute bottom-0 left-0 right-0 p-2.5 bg-gradient-to-t from-black/70 to-transparent">
        <p className="text-white text-sm font-medium truncate">{model.name}</p>
        <p className="text-white/70 text-xs">
          {photoCount} {photoCount === 1 ? 'nuotrauka' : 'nuotraukos'}
        </p>
      </div>
    </div>
  );
});

const PostCard = memo(function PostCard({
  post,
  onDelete,
  onCopy,
}: {
  post: GeneratedPost;
  onDelete: (id: string) => void;
  onCopy: (text: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirming) {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 3000);
      return;
    }
    onDelete(post.id);
  };

  return (
    <div className="bg-white border border-[#E5E5E3] rounded-xl overflow-hidden hover:shadow-md transition-all group">
      {/* Post image */}
      {post.image_url && (
        <div className="aspect-[4/5] overflow-hidden bg-gray-100">
          <img
            src={post.image_url}
            alt="Įrašo nuotrauka"
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      )}

      {/* Post text */}
      <div className="p-3">
        {post.text && (
          <p className="text-sm text-[#1A1A1A] line-clamp-3 mb-2 whitespace-pre-wrap">
            {post.text}
          </p>
        )}

        <div className="flex items-center justify-between">
          <span className="text-xs text-[#999999]">
            {formatRelativeTime(post.created_at)}
          </span>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {/* Copy */}
            {post.text && (
              <button
                onClick={(e) => { e.stopPropagation(); onCopy(post.text!); }}
                className="p-1.5 text-[#999999] hover:text-[#1A1A1A] hover:bg-[#F7F7F5] rounded-md transition-colors"
                title="Kopijuoti"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            )}

            {/* Delete */}
            <button
              onClick={handleDelete}
              className={`p-1.5 rounded-md transition-colors ${
                confirming
                  ? 'text-red-500 bg-red-50 hover:bg-red-100'
                  : 'text-[#999999] hover:text-red-500 hover:bg-[#F7F7F5]'
              }`}
              title={confirming ? 'Patvirtinti' : 'Ištrinti'}
            >
              {confirming ? (
                <span className="text-xs font-medium px-1">?</span>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

const ModelDetailModal = memo(function ModelDetailModal({
  model,
  onClose,
  onCreatePost,
  onDownload,
  onDelete,
}: {
  model: AvatarModel;
  onClose: () => void;
  onCreatePost: (imageUrl: string) => void;
  onDownload: (imageUrl: string, name: string) => void;
  onDelete: (modelId: string) => void;
}) {
  const photos = model.photos || [];
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selectedPhoto = photos[selectedIndex];
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    onDelete(model.id);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed inset-4 md:inset-8 lg:inset-16 bg-white rounded-2xl z-50 flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E5E3]">
          <div>
            <h2 className="text-lg font-bold text-[#1A1A1A]">{model.name}</h2>
            <p className="text-sm text-[#999]">{photos.length} {photos.length === 1 ? 'nuotrauka' : 'nuotraukos'}</p>
          </div>
          <button onClick={onClose} className="p-2 text-[#999] hover:text-[#1A1A1A] hover:bg-[#F7F7F5] rounded-lg transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Main photo */}
          <div className="flex-1 flex items-center justify-center p-4 bg-[#F7F7F5] min-h-0">
            {selectedPhoto ? (
              <img
                src={selectedPhoto.image_url}
                alt={model.name}
                className="max-w-full max-h-full object-contain rounded-lg"
              />
            ) : (
              <div className="flex flex-col items-center text-[#999]">
                <svg className="w-16 h-16 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <p className="text-sm">Nėra nuotraukų</p>
              </div>
            )}
          </div>

          {/* Sidebar - photo strip + actions */}
          <div className="md:w-64 border-t md:border-t-0 md:border-l border-[#E5E5E3] flex flex-col">
            {/* Photo strip */}
            {photos.length > 1 && (
              <div className="p-3 border-b border-[#E5E5E3]">
                <p className="text-xs font-medium text-[#999] mb-2">Nuotraukos</p>
                <div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-y-auto md:max-h-48">
                  {photos.map((photo, i) => (
                    <button
                      key={photo.id}
                      onClick={() => setSelectedIndex(i)}
                      className={`shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-all ${
                        i === selectedIndex ? 'border-[#FF6B35] ring-1 ring-[#FF6B35]/30' : 'border-transparent hover:border-[#E5E5E3]'
                      }`}
                    >
                      <img src={photo.image_url} alt={`${model.name} nuotrauka ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="p-4 space-y-2">
              {selectedPhoto && (
                <>
                  <button
                    onClick={() => onCreatePost(selectedPhoto.image_url)}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-600 rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Sukurti įrašą
                  </button>
                  <button
                    onClick={() => onDownload(selectedPhoto.image_url, model.name)}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-[#1A1A1A] bg-[#F7F7F5] hover:bg-[#EEEEED] rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Atsisiųsti
                  </button>
                </>
              )}
              <button
                onClick={handleDelete}
                className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                  confirmDelete
                    ? 'text-white bg-red-500 hover:bg-red-600'
                    : 'text-red-500 bg-red-50 hover:bg-red-100'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                {confirmDelete ? 'Patvirtinti trynimą' : 'Ištrinti modelį'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
});

const PaginationControls = memo(function PaginationControls({
  totalCount,
  visibleCount,
  page,
  pageSize,
  initialCount,
  onShowMore,
  onShowLess,
  onNextPage,
  onPrevPage,
}: {
  totalCount: number;
  visibleCount: number;
  page: number;
  pageSize: number;
  initialCount: number;
  onShowMore: () => void;
  onShowLess: () => void;
  onNextPage: () => void;
  onPrevPage: () => void;
}) {
  const totalPages = Math.ceil(totalCount / pageSize);
  const isCollapsed = visibleCount <= initialCount;

  return (
    <div className="flex items-center justify-center gap-3 mt-4">
      {/* Show more / show less */}
      {isCollapsed && totalCount > initialCount && (
        <button
          onClick={onShowMore}
          className="px-4 py-2 text-sm font-medium text-[#FF6B35] bg-[#FF6B35]/10 hover:bg-[#FF6B35]/20 rounded-lg transition-colors"
        >
          Rodyti daugiau
        </button>
      )}
      {!isCollapsed && (
        <button
          onClick={onShowLess}
          className="px-4 py-2 text-sm font-medium text-[#999999] hover:text-[#1A1A1A] hover:bg-[#F7F7F5] rounded-lg transition-colors"
        >
          Rodyti mažiau
        </button>
      )}

      {/* Page navigation (only when expanded and more than one page) */}
      {!isCollapsed && totalPages > 1 && (
        <>
          <button
            onClick={onPrevPage}
            disabled={page === 0}
            className="px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-[#1A1A1A] hover:bg-[#F7F7F5]"
          >
            Ankstesnis
          </button>
          <span className="text-sm text-[#999999]">
            {page + 1} / {totalPages}
          </span>
          <button
            onClick={onNextPage}
            disabled={page >= totalPages - 1}
            className="px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-[#1A1A1A] hover:bg-[#F7F7F5]"
          >
            Kitas puslapis
          </button>
        </>
      )}
    </div>
  );
});

export default function Gallery() {
  usePageTitle('Galerija/Įrašai');
  const { t } = useLanguage();
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

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

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

  const handleDelete = async (imageId: string, storagePath: string) => {
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

    await deleteImage(imageId, storagePath);

    if (currentIndex >= 0 && totalImages > 1) {
      if (currentIndex >= totalImages - 1) {
        setLightboxIndex(currentIndex - 1);
      }
    } else if (totalImages <= 1) {
      setLightboxIndex(-1);
    }
  };

  const handleCreatePost = (index: number) => {
    const image = images[index];
    if (image) {
      navigate('/post-creator', { state: { galleryImageUrl: image.image_url, galleryImageId: image.id } });
    }
  };

  const handleEdit = (index: number) => {
    setEditingIndex(index);
    setPostProcessResult(null);
    postProcess.reset();
  };

  const handleCloseEdit = () => {
    setEditingIndex(null);
    setPostProcessResult(null);
    postProcess.reset();
  };

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
    }
  };

  const handleBackground = async (prompt: string) => {
    const sourceUrl = getEditingImageUrl();
    if (!sourceUrl) return;
    const result = await postProcess.process('background', sourceUrl, { backgroundPrompt: prompt });
    if (result) {
      setPostProcessResult(result);
      await saveAndRefresh(result, `background: ${prompt}`);
    }
  };

  const handlePose = async (prompt: string) => {
    const sourceUrl = getEditingImageUrl();
    if (!sourceUrl) return;
    const result = await postProcess.process('edit', sourceUrl, { editPrompt: prompt });
    if (result) {
      setPostProcessResult(result);
      await saveAndRefresh(result, `pose: ${prompt}`);
    }
  };

  const handleEditPrompt = async (prompt: string) => {
    const sourceUrl = getEditingImageUrl();
    if (!sourceUrl) return;
    const result = await postProcess.process('edit', sourceUrl, { editPrompt: prompt });
    if (result) {
      setPostProcessResult(result);
      await saveAndRefresh(result, `edit: ${prompt}`);
    }
  };

  const handleModelCreatePost = (imageUrl: string) => {
    setSelectedModel(null);
    navigate('/post-creator', { state: { galleryImageUrl: imageUrl } });
  };

  const handleModelDownload = async (imageUrl: string, name: string) => {
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
  };

  const handleDeleteModel = async (modelId: string) => {
    try {
      const { error } = await (await import('../lib/supabase')).supabase
        .from('avatar_models')
        .delete()
        .eq('id', modelId);
      if (!error) refresh();
    } catch {
      // Error handled silently
    }
  };

  const handleCopyPostText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Silently fail
    }
  };

  const handleDeletePost = async (postId: string) => {
    try {
      await deletePost(postId);
    } catch {
      // Error handled in hook
    }
  };

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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => (
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
            title="Refresh"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    <ModelCard
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
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
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
              title={t.actions?.cancel || 'Uzdaryti'}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            </div>
          )}

          {/* PostProcess toolbar */}
          <PostProcessToolbar
            isProcessing={postProcess.isProcessing}
            onBackground={handleBackground}
            onPose={handlePose}
            onEdit={handleEditPrompt}
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
          onCreatePost={handleModelCreatePost}
          onDownload={handleModelDownload}
          onDelete={handleDeleteModel}
        />
      )}
    </div>
  );
}
