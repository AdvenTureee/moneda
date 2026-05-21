'use client';

import { useState } from 'react';
import { X, ArrowRight } from '@phosphor-icons/react';
import Icon from '@/components/Icon';

interface AIInsightBannerProps {
  message: string;
  cta?: { label: string; href?: string; onClick?: () => void };
  dismissible?: boolean;
}

export default function AIInsightBanner({
  message,
  cta,
  dismissible = true,
}: AIInsightBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div
      role="complementary"
      aria-label="Insight do Grana"
      className="relative rounded-[16px] p-4 overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #EEF6FF, #E8F5EF)',
        border: '1px solid rgba(168, 197, 224, 0.3)',
      }}
    >
      <div className="flex items-start gap-2 pr-6">
        <Icon name="Lightbulb" size={20} className="shrink-0 mt-0.5" aria-hidden />
        <p className="text-sm text-[#1A1D23] leading-relaxed line-clamp-3">
          {message}
        </p>
      </div>

      {cta && (
        <a
          href={cta.href ?? '#'}
          onClick={cta.onClick}
          className="flex items-center gap-1 mt-2 ml-7 text-sm font-semibold text-[#A8C5E0] hover:text-[#7AAECF] transition-colors"
          style={{ minWidth: 44, minHeight: 44 }}
        >
          {cta.label}
          <ArrowRight size={14} aria-hidden />
        </a>
      )}

      {dismissible && (
        <button
          onClick={() => setDismissed(true)}
          aria-label="Fechar insight"
          className="absolute top-2 right-2 flex items-center justify-center text-[#9CA3AF] hover:text-[#6B7280] transition-colors rounded-full"
          style={{ width: 44, height: 44 }}
        >
          <X size={16} aria-hidden />
        </button>
      )}
    </div>
  );
}
