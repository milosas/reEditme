import { memo } from 'react';

export const PaginationControls = memo(function PaginationControls({
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
