import React from 'react';

interface Props { className?: string; count?: number }

const Skeleton: React.FC<Props> = ({ className = '', count = 1 }) => (
  <>
    {Array.from({ length: count }).map((_, i) => (
      <div
        key={i}
        className={`shimmer rounded-lg ${className}`}
        style={{ minHeight: '1rem' }}
      />
    ))}
  </>
);

export const RepoCardSkeleton: React.FC = () => (
  <div className="gradient-border p-4 space-y-3">
    <Skeleton className="h-4 w-1/2" />
    <Skeleton className="h-3 w-3/4" />
    <div className="flex gap-4">
      <Skeleton className="h-3 w-16" />
      <Skeleton className="h-3 w-12" />
    </div>
  </div>
);

export default Skeleton;