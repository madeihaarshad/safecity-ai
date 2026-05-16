import React, { useEffect, useState } from 'react';

const Toast = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let timer;
    const handleSync = () => {
      setShow(true);
      clearTimeout(timer);
      timer = setTimeout(() => setShow(false), 2000);
    };

    window.addEventListener('data-sync', handleSync);
    return () => {
      window.removeEventListener('data-sync', handleSync);
      clearTimeout(timer);
    };
  }, []);

  if (!show) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] transition-opacity duration-300">
      <div className="bg-[var(--card)] text-[var(--accent)] text-xs font-mono px-4 py-2 rounded-lg shadow-lg border border-[var(--accent)]/20 flex items-center gap-2">
        <span>✓</span> Data synced
      </div>
    </div>
  );
};

export default Toast;
