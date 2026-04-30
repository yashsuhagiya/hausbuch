"use client";
interface Props {
  onClick: () => void;
}

export function Fab({ onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="New entry (n)"
      aria-label="New entry"
      className="fixed bottom-8 right-8 w-13 h-13 bg-rust text-paper font-display italic text-2xl shadow-lg hover:scale-105 transition-transform"
    >
      +
    </button>
  );
}
