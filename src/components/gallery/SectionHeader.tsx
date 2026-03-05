import { memo } from 'react';

export const SectionHeader = memo(function SectionHeader({
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
      aria-expanded={isOpen}
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
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  );
});
