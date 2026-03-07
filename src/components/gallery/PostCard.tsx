import { memo, useState } from 'react';
import type { GeneratedPost } from '../../types/database';
import { formatRelativeTime } from '../../utils/date';

export const PostCard = memo(function PostCard({
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
    <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-gray-100 group">
      {/* Image */}
      {post.image_url ? (
        <img
          src={post.image_url}
          alt="Įrašo nuotrauka"
          className="w-full h-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-[#999999]">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      )}

      {/* Bottom gradient overlay with time */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/50 to-transparent px-2 pb-1.5 pt-6">
        <span className="text-[10px] text-white/80">
          {formatRelativeTime(post.created_at)}
        </span>
      </div>

      {/* Hover overlay with actions */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors">
        <div className="absolute top-1.5 right-1.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {post.text && (
            <button
              onClick={(e) => { e.stopPropagation(); onCopy(post.text!); }}
              className="p-1.5 text-white bg-black/40 hover:bg-black/60 rounded-lg transition-colors"
              aria-label="Kopijuoti tekstą"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          )}
          <button
            onClick={handleDelete}
            className={`p-1.5 rounded-lg transition-colors ${
              confirming
                ? 'text-white bg-red-500/80 hover:bg-red-500'
                : 'text-white bg-black/40 hover:bg-red-500/80'
            }`}
            aria-label={confirming ? 'Patvirtinti trynimą' : 'Ištrinti įrašą'}
          >
            {confirming ? (
              <span className="text-[10px] font-bold px-0.5">?</span>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
});
