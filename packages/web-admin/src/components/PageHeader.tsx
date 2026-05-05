import { ReactNode } from 'react';

interface PageHeaderProps {
  breadcrumb: ReactNode;
  onOpenSidebar: () => void;
  children?: ReactNode;
}

function MenuIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12h18" />
      <path d="M3 6h18" />
      <path d="M3 18h18" />
    </svg>
  );
}

export function PageHeader({ breadcrumb, onOpenSidebar, children }: PageHeaderProps) {
  return (
    <div className="border-b border-dark-border bg-dark">
      <div className="flex min-h-16 flex-col gap-3 px-4 py-4 sm:px-6 lg:min-h-[4rem] lg:flex-row lg:items-center lg:justify-between lg:px-8 lg:py-0">
        <div className="flex min-w-0 items-start gap-3 lg:items-center">
          <button
            type="button"
            onClick={onOpenSidebar}
            aria-label="Abrir menu"
            className="rounded-lg border border-dark-border p-2 text-muted transition-colors hover:text-white lg:hidden"
          >
            <MenuIcon />
          </button>
          <div className="min-w-0 break-words text-sm text-muted font-sans">{breadcrumb}</div>
        </div>
        {children && <div className="flex flex-wrap items-center gap-3">{children}</div>}
      </div>
    </div>
  );
}
