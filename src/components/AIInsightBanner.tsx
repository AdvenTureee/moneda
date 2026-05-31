'use client';

import { useState, type ReactNode } from 'react';
import { X, ArrowSquareOut, Sparkle } from '@phosphor-icons/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';

interface AIInsightBannerProps {
  message: string;
  cta?: { label: string; href?: string; onClick?: () => void };
  dismissible?: boolean;
  /** When true, shows only a short preview of the message. */
  preview?: boolean;
  footerNote?: string;
  children?: ReactNode;
}

const PREVIEW_CHAR_LIMIT = 145;

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
    <p className="text-sm sm:text-base font-semibold text-white/90 leading-[1.6] sm:leading-relaxed mb-1.5 last:mb-0">{children}</p>
  ),
  strong: ({ children }) => (
    <strong className="font-bold text-white">{children}</strong>
  ),
  ul: ({ children }) => <ul className="space-y-1 mb-2 last:mb-0">{children}</ul>,
  ol: ({ children }) => (
    <ol className="space-y-1 mb-2 last:mb-0 list-decimal ml-4">{children}</ol>
  ),
  li: ({ children }) => <li className="text-sm sm:text-base font-semibold text-white/90 ml-4 list-disc">{children}</li>,
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
  footerNote,
  children,
}: AIInsightBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const rendered = preview ? buildPreview(message) : message;

  return (
    <div
      role="complementary"
      aria-label="Insight da Mo"
      className="ai-insight-banner relative text-white rounded-[18px] p-4 shadow-md sm:rounded-[20px] sm:p-5"
    >
      <div className="flex items-start gap-2.5 sm:gap-3">
        <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center shrink-0 sm:h-10 sm:w-10">
          <Sparkle size={22} weight="fill" className="text-white" />
        </div>

        <div className={`flex-1 min-w-0 ${dismissible ? 'pr-6' : 'pr-0'}`}>
          <div className="text-sm leading-relaxed">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {rendered}
            </ReactMarkdown>
          </div>

          {(cta || children) && (
            <div className="mt-2.5 flex items-center justify-between gap-3 sm:mt-3">
              {cta && (
                <a
                  href={cta.href ?? '#'}
                  onClick={cta.onClick}
                  className="inline-flex min-h-8 min-w-[118px] shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-[#BFE1FF]/35 bg-[#173F5F]/70 px-3 py-1.5 text-xs font-extrabold text-[#D9EEFF] shadow-[0_4px_14px_rgba(0,0,0,0.12)] transition-all duration-150 hover:border-[#D9EEFF]/55 hover:bg-[#1F5D86]/80 active:scale-95 sm:min-h-9 sm:min-w-[136px] sm:gap-2 sm:px-3.5 sm:py-2 sm:text-sm"
                >
                  <ArrowSquareOut size={15} weight="bold" aria-hidden />
                  {cta.label}
                </a>
              )}
              {children && (
                <div className="flex shrink-0 items-center justify-end">
                  {children}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {footerNote && (
        <div className="mt-3 border-t border-white/15 pt-2 text-center text-[11px] font-semibold leading-snug text-white/80">
          {footerNote}
        </div>
      )}

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
