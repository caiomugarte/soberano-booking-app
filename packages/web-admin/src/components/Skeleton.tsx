interface SkeletonProps {
  height?: string;
  width?: string;
  className?: string;
}

export function Skeleton({ height = 'h-4', width = 'w-full', className = '' }: SkeletonProps) {
  return (
    <div className={`animate-pulse bg-dark-surface2 rounded ${height} ${width} ${className}`} />
  );
}
