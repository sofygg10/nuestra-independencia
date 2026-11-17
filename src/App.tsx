import { useEffect, useState } from 'react'
import {
  Calculator,
  CreditCard,
  FlaskConical,
  Home,
  LayoutDashboard,
  Lock,
  Menu,
  PackageOpen,
  PiggyBank,
  Settings as SettingsIcon,
  User,
  UserRound,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useStore } from './store/store'
import { cx } from './components/ui'
import Dashboard from './pages/Dashboard'
import PersonPage from './pages/PersonPage'
import Contributions from './pages/Contributions'
import Expenses from './pages/Expenses'
import Debts from './pages/Debts'
import Purchases from './pages/Purchases'
import Goals from './pages/Goals'
import Simulator from './pages/Simulator'
import SettingsPage from './pages/Settings'

type Route = 'resumen' | 'juan' | 'yo' | 'aportes' | 'gastos' | 'deudas' | 'compras' | 'metas' | 'simulador' | 'configuracion'

export function navigate(route: Route) {
  window.location.hash = `/${route}`
}

function useRoute(): Route {
  const read = () => (window.location.hash.replace('#/', '') || 'resumen') as Route
  const [route, setRoute] = useState<Route>(read)
  useEffect(() => {
    const on = () => {
      setRoute(read())
      window.scrollTo({ top: 0 })
    }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return route
}

export default function App() {
  const route = useRoute()
  const { data, saveError, lock } = useStore()
  const [open, setOpen] = useState(false)

  const nav: { id: Route; label: string; icon: LucideIcon }[] = [
    { id: 'resumen', label: 'Resumen general', icon: LayoutDashboard },
    { id: 'juan', label: `Finanzas de ${data.people.juan.name}`, icon: User },
    { id: 'yo', label: 'Mis finanzas', icon: UserRound },
    { id: 'aportes', label: 'Aportes proporcionales', icon: Calculator },
    { id: 'gastos', label: 'Gastos del hogar', icon: Home },
    { id: 'deudas', label: 'Deudas y cuotas', icon: CreditCard },
    { id: 'compras', label: 'Compras de independencia', icon: PackageOpen },
    { id: 'metas', label: 'Ahorros y metas', icon: PiggyBank },
    { id: 'simulador', label: 'Simulador financiero', icon: FlaskConical },
    { id: 'configuracion', label: 'Configuración', icon: SettingsIcon },
  ]

  const page = {
    resumen: <Dashboard />,
    juan: <PersonPage id="juan" />,
    yo: <PersonPage id="me" />,
    aportes: <Contributions />,
    gastos: <Expenses />,
    deudas: <Debts />,
    compras: <Purchases />,
    metas: <Goals />,
    simulador: <Simulator />,
    configuracion: <SettingsPage />,
  }[route] ?? <Dashboard />

  const sidebar = (
    <nav className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-5 pb-6 pt-6">
        <span className="grid size-10 place-items-center rounded-2xl bg-sage-700 text-xl shadow-sm">🌿</span>
        <div className="leading-tight">
          <div className="font-bold text-sage-950">Nuestra</div>
          <div className="text-sm font-semibold text-sage-600">Independencia</div>
        </div>
      </div>
      <ul className="flex-1 space-y-0.5 overflow-y-auto px-3">
        {nav.map((n, i) => (
          <li key={n.id}>
            <a
              href={`#/${n.id}`}
              onClick={() => setOpen(false)}
              className={cx(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                route === n.id ? 'bg-sage-700 text-white shadow-sm' : 'text-stone-600 hover:bg-sage-100/70 hover:text-sage-900',
              )}
            >
              <n.icon size={18} strokeWidth={route === n.id ? 2.2 : 1.8} />
              <span className="flex-1 truncate">{n.label}</span>
              <span className={cx('text-[10px] tabular-nums', route === n.id ? 'text-sage-200' : 'text-stone-300')}>{i + 1}</span>
            </a>
          </li>
        ))}
      </ul>
      <div className="m-3 rounded-2xl bg-sand-100 p-4 text-xs text-stone-600">
        <div className="font-semibold text-sage-900">
          {data.people.juan.name} & {data.people.me.name}
        </div>
        <div className="mt-1">Datos cifrados con tu contraseña.</div>
        <button onClick={lock} className="mt-2 inline-flex items-center gap-1.5 font-semibold text-sage-700 hover:text-sage-900">
          <Lock size={13} /> Bloquear
        </button>
      </div>
    </nav>
  )

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-sage-100 bg-white/80 backdrop-blur lg:block">{sidebar}</aside>

      {/* Barra superior móvil */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-sage-100 bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center gap-2 font-bold text-sage-950">
          <span className="text-lg">🌿</span> Nuestra Independencia
        </div>
        <button onClick={() => setOpen(true)} className="grid size-10 place-items-center rounded-xl text-sage-800 hover:bg-sage-50" aria-label="Abrir menú">
          <Menu size={20} />
        </button>
      </header>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-sage-950/30" onClick={() => setOpen(false)} />
          <aside className="animate-fade-up absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-white shadow-2xl">
            <button onClick={() => setOpen(false)} className="absolute right-3 top-6 grid size-9 place-items-center rounded-xl text-stone-500 hover:bg-sage-50" aria-label="Cerrar menú">
              <X size={18} />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      <main className="lg:pl-64">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10" key={route}>
          {saveError && <div className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">No se pudieron guardar los cambios en este navegador (almacenamiento lleno o bloqueado). Exporta una copia desde Configuración.</div>}
          {page}
        </div>
      </main>
    </div>
  )
}
