'use client';

import { useState } from 'react';
import { X, ArrowRight, Lightbulb } from '@phosphor-icons/react';

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
      className="relative bg-white rounded-[16px] overflow-hidden"
      style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
    >
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#A8C5E0] to-[#5BBF8E]" />

      <div className="flex items-start gap-3 px-5 py-5">
        <div className="w-10 h-10 rounded-full bg-[#EEF6FF] flex items-center justify-center shrink-0">
          <Lightbulb size={20} className="text-[#A8C5E0]" />
        </div>

        <div className="flex-1 min-w-0 pr-6">
          <p className="text-sm text-[#1A1D23] leading-relaxed line-clamp-3">
            {message}
          </p>

          {cta && (
            <a
              href={cta.href ?? '#'}
              onClick={cta.onClick}
              className="inline-flex items-center gap-1 mt-3 text-xs font-semibold text-[#A8C5E0] hover:text-[#7AAECF] transition-colors"
              style={{ minWidth: 44, minHeight: 44 }}
            >
              {cta.label}
              <ArrowRight size={14} aria-hidden />
            </a>
          )}
        </div>
      </div>

      {dismissible && (
        <button
          onClick={() => setDismissed(true)}
          aria-label="Fechar insight"
          className="absolute top-3 right-3 flex items-center justify-center text-[#9CA3AF] hover:text-[#6B7280] hover:bg-[#F8F9FB] transition-all rounded-full"
          style={{ width: 32, height: 32 }}
        >
          <X size={14} aria-hidden />
        </button>
      )}
    </div>
  );
}
