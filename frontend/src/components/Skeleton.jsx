import React from 'react';

export const SkeletonLine = ({ width = 'w-full', height = 'h-4' }) => (
  <div className={`${width} ${height} rounded-md animate-pulse bg-[var(--muted)]/40`} />
);

export const SkeletonCard = () => (
  <div className="rounded-xl border border-[var(--border)] bg-[var(--card)]/40 p-6 flex flex-col gap-3">
    <SkeletonLine width="w-1/3" height="h-3" />
    <SkeletonLine width="w-1/2" height="h-6" />
    <SkeletonLine width="w-1/4" height="h-2" />
  </div>
);

export const SkeletonTable = ({ rows = 5 }) => {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="border-b border-[var(--border)]/50 last:border-b-0 bg-[var(--surface)]/20">
          <td className="px-6 py-4"><SkeletonLine width="w-24" /></td>
          <td className="px-6 py-4"><SkeletonLine width="w-32" /></td>
          <td className="px-6 py-4"><SkeletonLine width="w-16" /></td>
          <td className="px-6 py-4"><SkeletonLine width="w-20" /></td>
          <td className="px-6 py-4"><SkeletonLine width="w-12" /></td>
          <td className="px-6 py-4"><SkeletonLine width="w-12" /></td>
        </tr>
      ))}
    </>
  );
};
