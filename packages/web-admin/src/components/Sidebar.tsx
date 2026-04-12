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

export function Sidebar() {
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="fixed inset-y-0 left-0 w-60 bg-dark-surface2 border-r border-dark-border flex flex-col z-40">
      <div className="px-6 pt-7 pb-6">
        <p className="font-serif text-xl text-gold leading-none">Altion</p>
        <p className="text-muted text-xs mt-1.5">Platform Admin</p>
      </div>

      <nav className="flex-1 px-3 space-y-0.5">
        <NavLink
          to="/"
          end
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
  );
}
