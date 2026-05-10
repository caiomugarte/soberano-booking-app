import { ReactNode, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar.tsx';
import { PageHeader } from './PageHeader.tsx';

interface AppShellProps {
  breadcrumb: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}

export function AppShell({ breadcrumb, actions, children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-dark">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex min-h-screen flex-col lg:pl-60">
        <PageHeader breadcrumb={breadcrumb} onOpenSidebar={() => setSidebarOpen(true)}>
          {actions}
        </PageHeader>
        <main className="flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-6">{children}</main>
      </div>
    </div>
  );
}
