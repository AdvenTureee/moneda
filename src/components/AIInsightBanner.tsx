'use client';

import { useState } from 'react';
import { X, ArrowRight, Lightbulb } from '@phosphor-icons/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';

interface AIInsightBannerProps {
  message: string;
  cta?: { label: string; href?: string; onClick?: () => void };
  dismissible?: boolean;
  /** When true, shows only a short preview of the message. */
  preview?: boolean;
}

const PREVIEW_CHAR_LIMIT = 240;

function buildPreview(markdown: string): string {
  const firstBlock = markdown.split(/\n\s*\n/)[0]?.trim() ?? '';
  if (firstBlock.length <= PREVIEW_CHAR_LIMIT) return firstBlock;
  const slice = firstBlock.slice(0, PREVIEW_CHAR_LIMIT);
  const lastSpace = slice.lastIndexOf(' ');
  const trimmed = lastSpace > PREVIEW_CHAR_LIMIT * 0.6 ? slice.slice(0, lastSpace) : slice;
  return trimmed.trimEnd() + '…';
}

const markdownComponents: Components = {
  p: ({ children }) => (
    <p className="text-sm text-[#1A1D23] leading-relaxed mb-2 last:mb-0">{children}</p>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-[#1A1D23]">{children}</strong>
  ),
  ul: ({ children }) => <ul className="space-y-1 mb-2 last:mb-0">{children}</ul>,
  ol: ({ children }) => (
    <ol className="space-y-1 mb-2 last:mb-0 list-decimal ml-4">{children}</ol>
  ),
  li: ({ children }) => <li className="text-sm text-[#1A1D23] ml-4 list-disc">{children}</li>,
  h1: ({ children }) => (
    <h1 className="text-base font-heading text-[#1A1D23] mb-2">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-base font-heading text-[#1A1D23] mb-2">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-sm font-heading text-[#1A1D23] mb-1.5">{children}</h3>
  ),
};

export default function AIInsightBanner({
  message,
  cta,
  dismissible = true,
  preview = false,
}: AIInsightBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const rendered = preview ? buildPreview(message) : message;

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
          <div className="text-sm text-[#1A1D23] leading-relaxed">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {rendered}
            </ReactMarkdown>
          </div>

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
