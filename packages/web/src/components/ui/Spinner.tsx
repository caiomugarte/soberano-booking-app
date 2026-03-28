export function Spinner({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-block w-4 h-4 border-2 border-dark rounded-full border-t-transparent animate-spin ${className}`}
    />
  );
}
