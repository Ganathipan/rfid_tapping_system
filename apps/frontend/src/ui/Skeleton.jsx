import React from 'react';
import clsx from 'clsx';

/**
 * Skeleton loading placeholder
 * Props:
 *  - variant: 'rect' | 'text' | 'circle'
 *  - width / height: tailwind size classes or inline style numbers
 *  - lines (for text variant)
 */
export function Skeleton({ variant = 'rect', width, height, className, style, lines = 1 }) {
  if (variant === 'text') {
    return (
      <div className={clsx('space-y-2', className)} style={style}>
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className="h-3 w-full rounded bg-white/10 animate-pulse" style={{ animationDelay: `${i*80}ms` }} />
        ))}
      </div>
    );
  }
  if (variant === 'circle') {
    return (
      <div className={clsx('rounded-full bg-white/10 animate-pulse', className)} style={{ width, height, ...style }} />
    );
  }
  return (
    <div className={clsx('rounded-md bg-white/10 animate-pulse', className)} style={{ width, height, ...style }} />
  );
}

export function SkeletonGrid({ count = 8, className }) {
  return (
    <div className={clsx('grid gap-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-3 rounded-md border border-white/10 bg-white/5 flex flex-col gap-2">
          <div className="h-3 w-12 bg-white/10 rounded animate-pulse" style={{ animationDelay: `${i*40}ms` }} />
          <div className="h-6 w-8 bg-white/10 rounded animate-pulse" style={{ animationDelay: `${i*40}ms` }} />
        </div>
      ))}
    </div>
  );
}
