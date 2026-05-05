import { NavLink } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'
import { ROUTES } from '@/config/routes'
import { useUIStore } from '@/stores/ui.store'

const navItems = [
  { to: ROUTES.DASHBOARD, label: 'Agenda', icon: '📅' },
  { to: ROUTES.PATIENTS, label: 'Pacientes', icon: '👥' },
  { to: ROUTES.FINANCIAL, label: 'Financeiro', icon: '💰' },
  { to: ROUTES.SETTINGS, label: 'Configurações', icon: '⚙️' },
]

export function Sidebar() {
  const { user, logout } = useAuthStore()
  const sidebarOpen = useUIStore((s) => s.sidebarOpen)
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen)

  function closeSidebar() {
    setSidebarOpen(false)
  }

  function handleLogout() {
    closeSidebar()
    logout()
  }

  return (
    <>
      <button
        type="button"
        aria-label="Fechar menu"
        onClick={closeSidebar}
        className={`fixed inset-0 z-40 bg-slate-950/45 transition-opacity lg:hidden ${
          sidebarOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-screen w-64 flex-col bg-sidebar text-white transition-transform duration-200 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-start justify-between gap-3 border-b border-white/10 px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 shadow-lg shadow-primary-500/30">
              <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2.5c-1.5 0-2.8.5-3.8 1.3C7.2 4.6 6.5 5.8 6.2 7.2c-.5-.2-1-.3-1.5-.3C3.2 6.9 2 8.1 2 9.6c0 1 .5 1.8 1.2 2.3-.5.7-.7 1.5-.7 2.4 0 2 1.4 3.6 3.2 3.9.3 1.5 1.6 2.6 3.1 2.6.5 0 1-.1 1.4-.4.5.6 1.2 1.1 2 1.1"/>
                <path d="M12 2.5c1.5 0 2.8.5 3.8 1.3.9.8 1.6 2 1.9 3.4.5-.2 1-.3 1.5-.3 1.5 0 2.7 1.2 2.7 2.7 0 1-.5 1.8-1.2 2.3.5.7.7 1.5.7 2.4 0 2-1.4 3.6-3.2 3.9-.3 1.5-1.6 2.6-3.1 2.6-.5 0-1-.1-1.4-.4-.5.6-1.2 1.1-2 1.1"/>
                <path d="M12 2.5v19"/>
                <path d="M8 8.5c1.3 0 2.5.5 3.5 1.5"/>
                <path d="M16 8.5c-1.3 0-2.5.5-3.5 1.5"/>
                <path d="M7 14c1.5 0 3 .7 4 2"/>
                <path d="M17 14c-1.5 0-3 .7-4 2"/>
              </svg>
            </div>
            <div>
              <div className="text-sm font-semibold">Bruno</div>
              <div className="text-xs text-gray-400">Painel do Psicólogo</div>
            </div>
          </div>
          <button
            type="button"
            onClick={closeSidebar}
            aria-label="Fechar navegação"
            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-white/5 hover:text-white lg:hidden"
          >
            ✕
          </button>
        </div>

        <nav className="flex-1 px-3 py-4">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === '/'}
                  onClick={closeSidebar}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                      isActive
                        ? 'bg-primary-500/20 text-primary-200 font-medium'
                        : 'text-gray-300 hover:bg-white/5 hover:text-white'
                    }`
                  }
                >
                  <span className="text-base">{item.icon}</span>
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="border-t border-white/10 px-5 py-4">
          <div className="mb-2 text-xs text-gray-400">{user?.name}</div>
          <button
            onClick={handleLogout}
            className="text-xs text-gray-400 transition-colors hover:text-white"
          >
            Sair
          </button>
        </div>
      </aside>
    </>
  )
}
