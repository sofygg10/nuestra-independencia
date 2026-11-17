import { useEffect, useState, type ReactNode } from 'react'
import { Eye, EyeOff, Lock as LockIcon, ShieldCheck } from 'lucide-react'
import { deriveSession, isSealed, unseal, type Sealed, type Session } from '../lib/crypto'
import { LEGACY_KEY, StoreProvider, VAULT_KEY } from '../store/store'
import { createDefaultData } from '../store/defaults'
import { formatDate } from '../lib/format'
import { Button, inputClass } from './ui'
import type { AppData } from '../types'

/** Copia cifrada publicada junto a la página (se sube a GitHub en public/) */
const REMOTE_FILE = `${import.meta.env.BASE_URL}datos.cifrados.json`

type Mode = { kind: 'loading' } | { kind: 'create'; legacy: AppData | null } | { kind: 'unlock'; local: Sealed | null; remote: Sealed | null }

function readLocal(): { vault: Sealed | null; legacy: AppData | null } {
  try {
    const v = localStorage.getItem(VAULT_KEY)
    const vault = v ? JSON.parse(v) : null
    const l = localStorage.getItem(LEGACY_KEY)
    return { vault: isSealed(vault) ? vault : null, legacy: l ? (JSON.parse(l) as AppData) : null }
  } catch {
    return { vault: null, legacy: null }
  }
}

async function readRemote(): Promise<Sealed | null> {
  try {
    const res = await fetch(REMOTE_FILE, { cache: 'no-store' })
    if (!res.ok) return null
    const json = await res.json()
    return isSealed(json) ? json : null
  } catch {
    return null
  }
}

/** Pide la contraseña antes de mostrar cualquier dato. */
export function Gate({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<Mode>({ kind: 'loading' })
  const [ready, setReady] = useState<{ data: AppData; session: Session } | null>(null)

  useEffect(() => {
    const { vault, legacy } = readLocal()
    readRemote().then((remote) => {
      if (vault || remote) setMode({ kind: 'unlock', local: vault, remote })
      else setMode({ kind: 'create', legacy })
    })
  }, [])

  if (ready)
    return (
      <StoreProvider initial={ready.data} session={ready.session}>
        {children}
      </StoreProvider>
    )
  if (mode.kind === 'loading') return <Shell>Cargando…</Shell>
  if (mode.kind === 'create') return <CreatePassword legacy={mode.legacy} onDone={setReady} />
  return <Unlock local={mode.local} remote={mode.remote} onDone={setReady} onReset={() => setMode({ kind: 'create', legacy: null })} />
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen place-items-center bg-sand-50 px-4">
      <div className="animate-fade-up w-full max-w-sm rounded-3xl border border-sage-100 bg-white p-7 shadow-xl">
        <div className="mb-5 flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-sage-700 text-xl">🌿</span>
          <div className="leading-tight">
            <div className="font-bold text-sage-950">Nuestra</div>
            <div className="text-sm font-semibold text-sage-600">Independencia</div>
          </div>
        </div>
        {children}
      </div>
    </div>
  )
}

function PasswordInput({ value, onChange, placeholder, autoFocus }: { value: string; onChange: (v: string) => void; placeholder: string; autoFocus?: boolean }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input type={show ? 'text' : 'password'} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} autoFocus={autoFocus} className={`${inputClass} pr-10`} autoComplete="current-password" />
      <button type="button" onClick={() => setShow(!show)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-sage-700" aria-label={show ? 'Ocultar' : 'Mostrar'}>
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  )
}

function CreatePassword({ legacy, onDone }: { legacy: AppData | null; onDone: (r: { data: AppData; session: Session }) => void }) {
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (pw.length < 6) return setError('Usa al menos 6 caracteres.')
    if (pw !== pw2) return setError('Las contraseñas no coinciden.')
    setBusy(true)
    onDone({ data: legacy ?? createDefaultData(), session: await deriveSession(pw) })
  }

  return (
    <Shell>
      <form onSubmit={submit} className="space-y-3">
        <h1 className="flex items-center gap-2 text-lg font-bold text-sage-950">
          <ShieldCheck size={20} className="text-sage-600" /> Crea tu contraseña
        </h1>
        <p className="text-sm text-stone-500">{legacy ? 'Tus datos de este navegador se van a cifrar con esta contraseña.' : 'Con ella se cifran todos los datos.'} Nadie más la conoce: si la olvidas, los datos cifrados no se pueden recuperar.</p>
        <PasswordInput value={pw} onChange={setPw} placeholder="Contraseña" autoFocus />
        <PasswordInput value={pw2} onChange={setPw2} placeholder="Repite la contraseña" />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button className="w-full" disabled={busy}>
          {busy ? 'Cifrando…' : 'Entrar'}
        </Button>
      </form>
    </Shell>
  )
}

function Unlock({ local, remote, onDone, onReset }: { local: Sealed | null; remote: Sealed | null; onDone: (r: { data: AppData; session: Session }) => void; onReset: () => void }) {
  const [pw, setPw] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  // Se abre la copia más reciente: la de este navegador o la publicada en GitHub
  const newest = local && remote ? (remote.savedAt > local.savedAt ? remote : local) : (local ?? remote)!
  const fromRemote = newest === remote

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const { value, session } = await unseal<AppData>(newest, pw)
      onDone({ data: value, session })
    } catch {
      setError('Contraseña incorrecta.')
      setBusy(false)
    }
  }

  return (
    <Shell>
      <form onSubmit={submit} className="space-y-3">
        <h1 className="flex items-center gap-2 text-lg font-bold text-sage-950">
          <LockIcon size={19} className="text-sage-600" /> Escribe tu contraseña
        </h1>
        <p className="text-xs text-stone-500">
          {fromRemote ? 'Se abrirá la copia guardada en GitHub' : 'Se abrirán los datos de este navegador'} ({formatDate(newest.savedAt.slice(0, 10))}).
        </p>
        <PasswordInput value={pw} onChange={setPw} placeholder="Contraseña" autoFocus />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button className="w-full" disabled={busy || !pw}>
          {busy ? 'Abriendo…' : 'Abrir'}
        </Button>
        {!remote && (
          <button
            type="button"
            className="w-full pt-2 text-center text-xs text-stone-400 underline"
            onClick={() => {
              if (window.confirm('¿Olvidaste la contraseña? Se borrarán los datos cifrados de este navegador y empezarás de cero (podrás importar una copia sin cifrar). ¿Continuar?')) {
                localStorage.removeItem(VAULT_KEY)
                onReset()
              }
            }}
          >
            Olvidé mi contraseña
          </button>
        )}
      </form>
    </Shell>
  )
}
