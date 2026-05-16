import React from 'react';

const Loader = ({ fullPage = false }) => {
  const content = (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
      <p className="text-[var(--subtle)] text-sm animate-pulse">Syncing with SafeCity AI...</p>
    </div>
  );

  if (fullPage) {
    return (
      <div className="fixed inset-0 bg-dark z-50 flex items-center justify-center">
        {content}
      </div>
    );
  }

  return <div className="p-12">{content}</div>;
};

export default Loader;
