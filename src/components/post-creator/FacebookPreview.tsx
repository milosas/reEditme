interface FacebookPreviewProps {
  text: string;
  imageUrl: string | null;
  isMobile: boolean;
}

export function FacebookPreview({ text, imageUrl, isMobile }: FacebookPreviewProps) {
  return (
    <div className={`bg-white rounded-xl border border-[#E5E5E3] overflow-hidden ${isMobile ? 'max-w-[360px] mx-auto' : ''}`}>
      {/* Header */}
      <div className="flex items-center gap-3 p-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF6B35] to-[#E55A2B] flex items-center justify-center text-white text-sm font-bold">
          M
        </div>
        <div>
          <p className="text-sm font-semibold text-[#1A1A1A]">Mano verslas</p>
          <p className="text-xs text-[#999]">Dabar</p>
        </div>
      </div>

      {/* Text */}
      <div className="px-3 pb-3">
        <p className="text-sm text-[#1A1A1A] whitespace-pre-wrap leading-relaxed">
          {text || 'Jūsų įrašo tekstas bus rodomas čia...'}
        </p>
      </div>

      {/* Image */}
      {imageUrl && (
        <div className="w-full bg-[#F7F7F5] flex items-center justify-center">
          <img src={imageUrl} alt="Post" className="w-full max-h-[500px] object-contain" loading="lazy" />
        </div>
      )}

      {/* Actions bar */}
      <div className="flex items-center justify-around py-2 px-3 border-t border-[#E5E5E3]">
        <button className="flex items-center gap-1.5 text-[#999] text-xs">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
          </svg>
          Patinka
        </button>
        <button className="flex items-center gap-1.5 text-[#999] text-xs">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          Komentuoti
        </button>
        <button className="flex items-center gap-1.5 text-[#999] text-xs">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          Dalintis
        </button>
      </div>
    </div>
  );
}
