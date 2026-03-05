import { memo, useState } from 'react';
import type { AvatarModel } from '../../types/database';

export const ModelDetailModal = memo(function ModelDetailModal({
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
      <div className="fixed inset-4 md:inset-8 lg:inset-16 bg-white rounded-2xl z-50 flex flex-col overflow-hidden shadow-2xl" role="dialog" aria-label={model.name}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E5E3]">
          <div>
            <h2 className="text-lg font-bold text-[#1A1A1A]">{model.name}</h2>
            <p className="text-sm text-[#999]">{photos.length} {photos.length === 1 ? 'nuotrauka' : 'nuotraukos'}</p>
          </div>
          <button onClick={onClose} className="p-2 text-[#999] hover:text-[#1A1A1A] hover:bg-[#F7F7F5] rounded-lg transition-colors" aria-label="Uždaryti">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
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
                <svg className="w-16 h-16 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
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
                      aria-label={`${model.name} nuotrauka ${i + 1}`}
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
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Sukurti įrašą
                  </button>
                  <button
                    onClick={() => onDownload(selectedPhoto.image_url, model.name)}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-[#1A1A1A] bg-[#F7F7F5] hover:bg-[#EEEEED] rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
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
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
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
