import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store.ts';

function TenantsIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const handleLogout = () => {
    onClose();
    logout();
    navigate('/login');
  };

  return (
    <>
      <button
        type="button"
        aria-label="Fechar menu"
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/60 transition-opacity lg:hidden ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-dark-border bg-dark-surface2 transition-transform duration-200 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-start justify-between px-6 pt-6 pb-5 lg:block lg:pt-7 lg:pb-6">
          <div>
            <p className="font-serif text-xl text-gold leading-none">Altion</p>
            <p className="text-muted text-xs mt-1.5">Platform Admin</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar navegação"
            className="rounded-lg p-2 text-muted transition-colors hover:text-white lg:hidden"
          >
            <CloseIcon />
          </button>
        </div>

        <nav className="flex-1 px-3 space-y-0.5">
          <NavLink
            to="/"
            end
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'text-gold border-l-2 border-gold bg-gold/5 pl-[10px]'
                  : 'text-muted hover:text-white'
              }`
            }
          >
            <TenantsIcon />
            Tenants
          </NavLink>
        </nav>

        <div className="px-6 py-5 border-t border-dark-border">
          <p className="text-xs text-muted mb-3">Super Admin</p>
          <button
            onClick={handleLogout}
            className="text-sm text-muted hover:text-red-400 transition-colors"
          >
            Sair
          </button>
        </div>
      </aside>
    </>
  );
}
