import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle: string;
  action?: ReactNode;
  className?: string;
}

export default function PageHeader({ title, subtitle, action, className = '' }: PageHeaderProps) {
  return (
    <header
      className={`page-header grid min-h-[96px] ${
        action ? 'grid-cols-[auto_minmax(0,1fr)]' : 'grid-cols-[minmax(0,1fr)]'
      } items-center gap-4 pt-6 pb-4 ${className}`}
    >
      {action ? <div className="page-header__action">{action}</div> : null}
      <div className="min-w-0">
        <h1 className="page-header__title text-2xl font-heading font-bold leading-tight tracking-tight text-[var(--color-text-primary)]">
          {title}
        </h1>
        <p className="page-header__subtitle mt-2 text-sm leading-snug text-[var(--color-text-secondary)]">
          {subtitle}
        </p>
      </div>
    </header>
  );
}
