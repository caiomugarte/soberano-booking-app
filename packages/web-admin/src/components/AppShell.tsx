import { ReactNode } from 'react';
import { Sidebar } from './Sidebar.tsx';
import { PageHeader } from './PageHeader.tsx';

interface AppShellProps {
  breadcrumb: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}

export function AppShell({ breadcrumb, actions, children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-dark">
      <Sidebar />
      <div className="pl-60 flex flex-col min-h-screen">
        <PageHeader breadcrumb={breadcrumb}>{actions}</PageHeader>
        <main className="px-8 py-6 flex-1">{children}</main>
      </div>
    </div>
  );
}
