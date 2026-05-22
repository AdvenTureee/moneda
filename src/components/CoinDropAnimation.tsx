'use client';

import { useEffect, useState } from 'react';
import Mo from './Mo';

interface CoinDropAnimationProps {
  onComplete?: () => void;
}

export default function CoinDropAnimation({
  onComplete,
}: CoinDropAnimationProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onComplete?.();
    }, 700);
    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
      <div className="animate-coin-drop">
        <Mo variant="happy" size={80} />
      </div>
    </div>
  );
}
