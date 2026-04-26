import { ReactNode } from 'react';

interface PageHeaderProps {
  breadcrumb: ReactNode;
  children?: ReactNode;
}

export function PageHeader({ breadcrumb, children }: PageHeaderProps) {
  return (
    <div className="h-16 border-b border-dark-border flex items-center justify-between px-8 bg-dark">
      <div className="text-sm text-muted font-sans">{breadcrumb}</div>
      {children && <div>{children}</div>}
    </div>
  );
}
