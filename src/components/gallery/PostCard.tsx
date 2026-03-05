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
                aria-label="Kopijuoti tekstą"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
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
              aria-label={confirming ? 'Patvirtinti trynimą' : 'Ištrinti įrašą'}
            >
              {confirming ? (
                <span className="text-xs font-medium px-1">?</span>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
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
