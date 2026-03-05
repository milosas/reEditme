interface InstagramPreviewProps {
  text: string;
  imageUrl: string | null;
  isMobile: boolean;
}

export function InstagramPreview({ text, imageUrl, isMobile }: InstagramPreviewProps) {
  return (
    <div className={`bg-white rounded-xl border border-[#E5E5E3] overflow-hidden ${isMobile ? 'max-w-[360px] mx-auto' : ''}`}>
      {/* Header */}
      <div className="flex items-center gap-3 p-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF] p-[2px]">
          <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-xs font-bold text-[#1A1A1A]">
            M
          </div>
        </div>
        <p className="text-sm font-semibold text-[#1A1A1A]">manoverslas</p>
      </div>

      {/* Image */}
      <div className="w-full aspect-[4/5] bg-[#F7F7F5]">
        {imageUrl ? (
          <img src={imageUrl} alt="Post" className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#999] text-sm">
            Paveikslėlis
          </div>
        )}
      </div>

      {/* Action icons */}
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-4">
          <svg className="w-6 h-6 text-[#1A1A1A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          <svg className="w-6 h-6 text-[#1A1A1A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <svg className="w-6 h-6 text-[#1A1A1A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </div>
        <svg className="w-6 h-6 text-[#1A1A1A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
        </svg>
      </div>

      {/* Caption */}
      <div className="px-3 pb-3">
        <p className="text-sm text-[#1A1A1A] leading-relaxed">
          <span className="font-semibold">manoverslas </span>
          <span className="whitespace-pre-wrap">{text || 'Jūsų įrašo tekstas bus rodomas čia...'}</span>
        </p>
      </div>
    </div>
  );
}
