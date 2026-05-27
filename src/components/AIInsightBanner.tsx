'use client';

import { useState, type ReactNode } from 'react';
import { X, ArrowRight, Sparkle } from '@phosphor-icons/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';

interface AIInsightBannerProps {
  message: string;
  cta?: { label: string; href?: string; onClick?: () => void };
  dismissible?: boolean;
  /** When true, shows only a short preview of the message. */
  preview?: boolean;
  children?: ReactNode;
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
    <p className="text-base font-semibold text-white/90 leading-relaxed mb-2 last:mb-0">{children}</p>
  ),
  strong: ({ children }) => (
    <strong className="font-bold text-white">{children}</strong>
  ),
  ul: ({ children }) => <ul className="space-y-1 mb-2 last:mb-0">{children}</ul>,
  ol: ({ children }) => (
    <ol className="space-y-1 mb-2 last:mb-0 list-decimal ml-4">{children}</ol>
  ),
  li: ({ children }) => <li className="text-base font-semibold text-white/90 ml-4 list-disc">{children}</li>,
  h1: ({ children }) => (
    <h1 className="text-lg font-extrabold text-white mb-2">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-lg font-extrabold text-white mb-2">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-base font-extrabold text-white mb-1.5">{children}</h3>
  ),
};

export default function AIInsightBanner({
  message,
  cta,
  dismissible = true,
  preview = false,
  children,
}: AIInsightBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const rendered = preview ? buildPreview(message) : message;

  return (
    <div
      role="complementary"
      aria-label="Insight da Mo"
      className="ai-insight-banner relative text-white rounded-[20px] p-5 shadow-md"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
          <Sparkle size={24} weight="fill" className="text-white" />
        </div>

        <div className="flex-1 min-w-0 pr-6">
          <div className="text-sm leading-relaxed">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {rendered}
            </ReactMarkdown>
          </div>

          {(cta || children) && (
            <div className="flex items-center justify-between mt-3">
              {cta && (
                <a
                  href={cta.href ?? '#'}
                  onClick={cta.onClick}
                  className="inline-flex items-center gap-1 text-base font-semibold text-white/80 hover:text-white transition-colors"
                  style={{ minWidth: 44, minHeight: 44 }}
                >
                  {cta.label}
                  <ArrowRight size={14} aria-hidden />
                </a>
              )}
              {children && (
                <div className="flex items-center gap-2">
                  {children}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {dismissible && (
        <button
          onClick={() => setDismissed(true)}
          aria-label="Fechar insight"
          className="absolute top-3 right-3 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/15 transition-all rounded-full"
          style={{ width: 32, height: 32 }}
        >
          <X size={14} aria-hidden />
        </button>
      )}
    </div>
  );
}
