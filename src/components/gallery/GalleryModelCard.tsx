import { memo } from 'react';
import type { AvatarModel } from '../../types/database';

export const GalleryModelCard = memo(function GalleryModelCard({ model, onClick }: { model: AvatarModel; onClick: () => void }) {
  const coverPhoto = model.photos?.find(p => p.id === model.cover_photo_id) || model.photos?.[0];
  const photoCount = model.photos?.length || 0;

  return (
    <div
      onClick={onClick}
      className="group relative rounded-lg overflow-hidden bg-gray-100 cursor-pointer shadow-sm hover:shadow-md transition-all"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
      aria-label={`${model.name} — ${photoCount} nuotraukos`}
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
          <svg className="w-12 h-12 text-[#CCCCCC]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
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
