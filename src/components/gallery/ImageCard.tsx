import { useState, useEffect, useRef } from 'react';
import { downloadImage } from '../../utils/download';
import { formatRelativeTime } from '../../utils/date';
import { useNotes } from '../../hooks/useNotes';
import { NotesEditor } from './NotesEditor';
import type { GeneratedImage } from '../../types/database';

interface ImageCardProps {
  image: GeneratedImage;
  onDelete: (imageId: string, storagePath: string) => Promise<void>;
  onClick: () => void;
  onEdit?: () => void;
  onCreatePost?: () => void;
}

export function ImageCard({ image, onDelete, onClick, onEdit, onCreatePost }: ImageCardProps) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showNoteOverlay, setShowNoteOverlay] = useState(false);
  const confirmTimeoutRef = useRef<number | null>(null);

  // Use notes hook
  const { note, saveNote, deleteNote } = useNotes(image.id);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (confirmTimeoutRef.current) {
        clearTimeout(confirmTimeoutRef.current);
      }
    };
  }, []);

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    const date = new Date(image.created_at).toISOString().split('T')[0];
    const filename = `generated-image-${date}.png`;
    downloadImage(image.image_url, filename);
  };

  const handleDeleteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!confirming) {
      // First click - start confirmation
      setConfirming(true);
      confirmTimeoutRef.current = window.setTimeout(() => {
        setConfirming(false);
      }, 3000);
      return;
    }

    // Second click - perform delete
    if (confirmTimeoutRef.current) {
      clearTimeout(confirmTimeoutRef.current);
    }
    setDeleting(true);

    try {
      await onDelete(image.id, image.storage_path);
    } catch (error) {
      // Error is handled by parent, reset state
      setDeleting(false);
      setConfirming(false);
    }
  };

  const hasNotes = Boolean(note?.note_text);

  return (
    <div
      className={`card-hover group relative aspect-[3/4] rounded-lg overflow-hidden bg-gray-100 cursor-pointer shadow-sm hover:shadow-md transition-all ${
        deleting ? 'animate-fade-out' : ''
      }`}
      onClick={onClick}
    >
      {/* Thumbnail */}
      <img
        src={image.image_url}
        alt="Generated image"
        className="w-full h-full object-cover"
        loading="lazy"
      />

      {/* Hover overlay with actions */}
      <div className="card-actions absolute inset-0 bg-black/40 flex items-center justify-center gap-3">
        {/* Edit button */}
        {onEdit && (
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="p-2 bg-[#FF6B35] rounded-full hover:bg-[#E55A2B] transition-colors"
            title="Edit image"
          >
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          </button>
        )}

        {/* Create post button */}
        {onCreatePost && (
          <button
            onClick={(e) => { e.stopPropagation(); onCreatePost(); }}
            className="p-2 bg-indigo-500 rounded-full hover:bg-indigo-600 transition-colors"
            title="Sukurti įrašą"
          >
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </button>
        )}

        {/* Download button */}
        <button
          onClick={handleDownload}
          className="p-2 bg-white rounded-full hover:bg-gray-100 transition-colors"
          title="Download image"
        >
          <svg
            className="w-5 h-5 text-gray-700"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
        </button>

        {/* Delete button */}
        <button
          onClick={handleDeleteClick}
          className={`p-2 rounded-full transition-colors ${
            confirming
              ? 'bg-red-500 hover:bg-red-600'
              : 'bg-white hover:bg-gray-100'
          }`}
          title={confirming ? 'Click again to confirm' : 'Delete image'}
        >
          {confirming ? (
            <span className="text-white text-xs font-medium px-1">Confirm</span>
          ) : (
            <svg
              className="w-5 h-5 text-gray-700"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          )}
        </button>
      </div>

      {/* Date badge */}
      <div className="absolute bottom-2 left-2">
        <span className="px-2 py-1 text-xs bg-black/60 text-white rounded">
          {formatRelativeTime(image.created_at)}
        </span>
      </div>

      {/* Note icon - always visible, full opacity when note exists */}
      <button
        className={`absolute top-2 right-2 p-1 rounded transition-colors ${
          hasNotes ? 'bg-black/60 hover:bg-black/80' : 'bg-black/40 hover:bg-black/60'
        }`}
        onClick={(e) => {
          e.stopPropagation();
          setShowNoteOverlay(true);
        }}
        title={hasNotes ? 'View/edit note' : 'Add note'}
      >
        <svg
          className="w-4 h-4 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
          />
        </svg>
      </button>

      {/* Note overlay */}
      {showNoteOverlay && (
        <div
          className="absolute inset-0 bg-black/80 flex items-end p-3 z-10"
          onClick={(e) => e.stopPropagation()}
        >
          <NotesEditor
            initialNote={note?.note_text || ''}
            onSave={async (text) => {
              await saveNote(text);
              setShowNoteOverlay(false);
            }}
            onDelete={async () => {
              await deleteNote();
              setShowNoteOverlay(false);
            }}
            onClose={() => setShowNoteOverlay(false)}
            hasExistingNote={Boolean(note)}
          />
        </div>
      )}
    </div>
  );
}
