import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { AppData, PersonId } from '../types'
import { createDefaultData } from './defaults'
import { currentYM } from '../lib/format'
import { deriveSession, seal, type Sealed, type Session } from '../lib/crypto'

/** Datos cifrados en este navegador */
export const VAULT_KEY = 'nuestra-independencia:vault'
/** Versión anterior, sin cifrar: se migra al crear la contraseña y luego se borra */
export const LEGACY_KEY = 'nuestra-independencia:v1'

/** Completa campos que versiones anteriores de los datos no tenían. */
export function normalize(parsed: AppData): AppData {
  const defaults = createDefaultData()
  const data = { ...defaults, ...parsed, settings: { ...defaults.settings, ...parsed.settings } }
  for (const id of ['juan', 'me'] as const) data.people[id] = { ...data.people[id], months: data.people[id].months ?? {} }
  return data
}

interface StoreValue {
  data: AppData
  /** Recibe una copia editable de los datos; lo que cambies se guarda. */
  update: (mutate: (draft: AppData) => void) => void
  replace: (next: AppData) => void
  reset: () => void
  ym: string
  setYm: (ym: string) => void
  name: (id: PersonId | 'joint' | 'shared') => string
  saveError: boolean
  /** Copia cifrada con la contraseña actual (para descargar o subir a GitHub) */
  sealCurrent: () => Promise<Sealed>
  changePassword: (password: string) => Promise<void>
  lock: () => void
}

const StoreContext = createContext<StoreValue | null>(null)

export function StoreProvider({ initial, session: initialSession, children }: { initial: AppData; session: Session; children: ReactNode }) {
  const [data, setData] = useState<AppData>(() => normalize(initial))
  const [ym, setYm] = useState(currentYM)
  const [saveError, setSaveError] = useState(false)
  const session = useRef(initialSession)
  const writeId = useRef(0)

  useEffect(() => {
    const id = ++writeId.current
    seal(data, session.current)
      .then((sealed) => {
        // solo escribe el guardado más reciente
        if (id !== writeId.current) return
        localStorage.setItem(VAULT_KEY, JSON.stringify(sealed))
        localStorage.removeItem(LEGACY_KEY)
        setSaveError(false)
      })
      .catch(() => setSaveError(true))
  }, [data])

  const update = useCallback((mutate: (draft: AppData) => void) => {
    setData((prev) => {
      const draft = structuredClone(prev)
      mutate(draft)
      return draft
    })
  }, [])

  const value = useMemo<StoreValue>(
    () => ({
      data,
      update,
      replace: (next) => setData(normalize(next)),
      reset: () => setData(createDefaultData()),
      ym,
      setYm,
      name: (id) => (id === 'joint' ? 'Ambos' : id === 'shared' ? 'Compartida' : data.people[id].name),
      saveError,
      sealCurrent: () => seal(data, session.current),
      changePassword: async (password) => {
        session.current = await deriveSession(password)
        setData((d) => structuredClone(d)) // fuerza un guardado con la nueva clave
      },
      lock: () => window.location.reload(),
    }),
    [data, update, ym, saveError],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore debe usarse dentro de StoreProvider')
  return ctx
}
