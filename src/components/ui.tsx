import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { AlertTriangle, ChevronLeft, ChevronRight, X, type LucideIcon } from 'lucide-react'
import { cop, monthLabel, parseCop } from '../lib/format'
import { shiftYM } from '../lib/finance'
import { PERSON_COLOR } from '../lib/colors'

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(' ')
}

// ───────────── Layout ─────────────

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-sage-950 sm:text-[28px]">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-sm text-stone-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function Card({ children, className, title, subtitle, action }: { children: ReactNode; className?: string; title?: ReactNode; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <section className={cx('animate-fade-up rounded-2xl border border-sage-100 bg-white p-5 shadow-[0_1px_2px_rgba(30,50,40,0.04),0_4px_16px_-8px_rgba(30,50,40,0.08)]', className)}>
      {(title || action) && (
        <header className="mb-4 flex items-start justify-between gap-3">
          <div>
            {title && <h2 className="text-[15px] font-semibold text-sage-950">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-xs text-stone-500">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  )
}

type Tone = 'sage' | 'sand' | 'red' | 'amber' | 'juan' | 'me' | 'neutral'
const toneBg: Record<Tone, string> = {
  sage: 'bg-sage-100 text-sage-700',
  sand: 'bg-sand-100 text-amber-800',
  red: 'bg-red-50 text-red-700',
  amber: 'bg-amber-50 text-amber-700',
  juan: 'bg-emerald-50 text-[#1f7a4d]',
  me: 'bg-fuchsia-50 text-[#a0529c]',
  neutral: 'bg-stone-100 text-stone-600',
}

export function StatCard({ icon: Icon, label, value, hint, tone = 'sage', negative }: { icon: LucideIcon; label: string; value: string; hint?: ReactNode; tone?: Tone; negative?: boolean }) {
  return (
    <div className="animate-fade-up rounded-2xl border border-sage-100 bg-white p-4 shadow-[0_1px_2px_rgba(30,50,40,0.04)] transition hover:-translate-y-0.5 hover:shadow-md sm:p-5">
      <div className="flex items-center gap-2.5">
        <span className={cx('grid size-9 shrink-0 place-items-center rounded-xl', toneBg[tone])}>
          <Icon size={18} strokeWidth={2} />
        </span>
        <span className="text-[13px] font-medium leading-tight text-stone-500">{label}</span>
      </div>
      <div className={cx('num mt-3 text-xl font-bold tracking-tight sm:text-2xl', negative ? 'text-red-700' : 'text-sage-950')}>{value}</div>
      {hint && <div className="mt-1 text-xs text-stone-500">{hint}</div>}
    </div>
  )
}

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: Tone }) {
  return <span className={cx('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold', toneBg[tone])}>{children}</span>
}

export function PersonDot({ id }: { id: 'juan' | 'me' | 'joint' }) {
  return <span className="inline-block size-2.5 shrink-0 rounded-full" style={{ background: PERSON_COLOR[id] }} />
}

export function EmptyState({ icon: Icon, title, text, action }: { icon: LucideIcon; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-sage-200 bg-sage-50/50 px-6 py-10 text-center">
      <span className="grid size-12 place-items-center rounded-2xl bg-white text-sage-500 shadow-sm">
        <Icon size={22} />
      </span>
      <p className="mt-3 font-semibold text-sage-900">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm text-stone-500">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function ProgressBar({ value, color, className, label }: { value: number; color?: string; className?: string; label?: string }) {
  const v = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0))
  return (
    <div className={cx('h-2 w-full overflow-hidden rounded-full bg-sage-100', className)} role="progressbar" aria-valuenow={Math.round(v * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${v * 100}%`, background: color ?? 'var(--color-sage-500)' }} />
    </div>
  )
}

// ───────────── Formularios ─────────────

export function Button({ children, variant = 'primary', size = 'md', className, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; size?: 'sm' | 'md' }) {
  const v = {
    primary: 'bg-sage-700 text-white hover:bg-sage-800 shadow-sm',
    secondary: 'bg-white text-sage-800 border border-sage-200 hover:bg-sage-50',
    ghost: 'text-stone-600 hover:bg-sage-50 hover:text-sage-900',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  }[variant]
  const s = size === 'sm' ? 'h-8 px-3 text-xs gap-1.5' : 'h-10 px-4 text-sm gap-2'
  return (
    <button {...rest} className={cx('inline-flex items-center justify-center rounded-xl font-semibold transition disabled:cursor-not-allowed disabled:opacity-50', v, s, className)}>
      {children}
    </button>
  )
}

export function IconButton({ icon: Icon, label, onClick, tone = 'neutral' }: { icon: LucideIcon; label: string; onClick: () => void; tone?: 'neutral' | 'danger' }) {
  return (
    <button type="button" onClick={onClick} title={label} aria-label={label} className={cx('grid size-8 place-items-center rounded-lg transition', tone === 'danger' ? 'text-stone-400 hover:bg-red-50 hover:text-red-600' : 'text-stone-400 hover:bg-sage-50 hover:text-sage-800')}>
      <Icon size={16} />
    </button>
  )
}

export function Field({ label, children, hint, error, className }: { label: string; children: ReactNode; hint?: string; error?: string; className?: string }) {
  return (
    <label className={cx('block', className)}>
      <span className="mb-1.5 block text-xs font-semibold text-stone-600">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-xs text-red-600">{error}</span> : hint ? <span className="mt-1 block text-xs text-stone-400">{hint}</span> : null}
    </label>
  )
}

export const inputClass = 'h-10 w-full rounded-xl border border-sage-200 bg-white px-3 text-sm text-sage-950 outline-none transition placeholder:text-stone-400 focus:border-sage-500 focus:ring-4 focus:ring-sage-100'

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(inputClass, props.className)} />
}

export function Select({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={cx(inputClass, 'appearance-none bg-[url("data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A//www.w3.org/2000/svg%27%20width%3D%2716%27%20height%3D%2716%27%20fill%3D%27none%27%20stroke%3D%27%2364896d%27%20stroke-width%3D%272%27%3E%3Cpath%20d%3D%27m4%206%204%204%204-4%27/%3E%3C/svg%3E")] bg-[position:right_10px_center] bg-no-repeat pr-8', props.className)}>
      {children}
    </select>
  )
}

/** Campo de pesos: muestra $1.200.000 y entrega un número. */
export function MoneyInput({ value, onChange, className, placeholder = '$0', ...rest }: { value: number; onChange: (v: number) => void; className?: string; placeholder?: string } & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  const [text, setText] = useState(value ? cop(value) : '')
  const focused = useRef(false)
  useEffect(() => {
    if (!focused.current) setText(value ? cop(value) : '')
  }, [value])
  return (
    <input
      {...rest}
      inputMode="numeric"
      placeholder={placeholder}
      value={text}
      onFocus={() => (focused.current = true)}
      onBlur={() => {
        focused.current = false
        setText(value ? cop(value) : '')
      }}
      onChange={(e) => {
        const n = parseCop(e.target.value)
        setText(n ? cop(n) : '')
        onChange(n)
      }}
      className={cx(inputClass, 'num', className)}
    />
  )
}

export function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode }[] }) {
  return (
    <div className="inline-flex rounded-xl bg-sage-100/70 p-1">
      {options.map((o) => (
        <button key={o.value} type="button" onClick={() => onChange(o.value)} className={cx('rounded-lg px-3 py-1.5 text-xs font-semibold transition', value === o.value ? 'bg-white text-sage-900 shadow-sm' : 'text-stone-500 hover:text-sage-800')}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function MonthPicker({ ym, onChange }: { ym: string; onChange: (ym: string) => void }) {
  return (
    <div className="flex items-center gap-1 rounded-xl border border-sage-200 bg-white p-1 shadow-sm">
      <IconButton icon={ChevronLeft} label="Mes anterior" onClick={() => onChange(shiftYM(ym, -1))} />
      <label className="relative">
        <span className="block min-w-32 px-1 text-center text-sm font-semibold capitalize text-sage-900">{monthLabel(ym)}</span>
        <input type="month" value={ym} onChange={(e) => e.target.value && onChange(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" aria-label="Elegir mes y año" />
      </label>
      <IconButton icon={ChevronRight} label="Mes siguiente" onClick={() => onChange(shiftYM(ym, 1))} />
    </div>
  )
}

// ───────────── Modal & confirmación ─────────────

export function Modal({ open, onClose, title, children, footer, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-sage-950/30 backdrop-blur-[2px] sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title} className={cx('animate-fade-up flex max-h-[92vh] w-full flex-col rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl', wide ? 'sm:max-w-2xl' : 'sm:max-w-lg')}>
        <div className="flex items-center justify-between border-b border-sage-100 px-5 py-4">
          <h3 className="font-semibold text-sage-950">{title}</h3>
          <IconButton icon={X} label="Cerrar" onClick={onClose} />
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-sage-100 px-5 py-3">{footer}</div>}
      </div>
    </div>
  )
}

type ConfirmFn = (opts: { title: string; message: ReactNode; confirmLabel?: string }) => Promise<boolean>
const ConfirmContext = createContext<ConfirmFn>(async () => false)

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ title: string; message: ReactNode; confirmLabel?: string; resolve: (v: boolean) => void } | null>(null)
  const confirm = useCallback<ConfirmFn>((opts) => new Promise((resolve) => setState({ ...opts, resolve })), [])
  const close = (v: boolean) => {
    state?.resolve(v)
    setState(null)
  }
  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal
        open={!!state}
        onClose={() => close(false)}
        title={state?.title ?? ''}
        footer={
          <>
            <Button variant="secondary" onClick={() => close(false)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={() => close(true)} autoFocus>
              {state?.confirmLabel ?? 'Eliminar'}
            </Button>
          </>
        }
      >
        <div className="flex gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-red-50 text-red-600">
            <AlertTriangle size={20} />
          </span>
          <div className="text-sm text-stone-600">{state?.message}</div>
        </div>
      </Modal>
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  return useContext(ConfirmContext)
}

// ───────────── Gráficos ─────────────

export function ChartTooltip({ active, payload, label, formatter = cop }: { active?: boolean; payload?: { name?: string; value?: number; color?: string; payload?: { fill?: string } }[]; label?: string; formatter?: (v: number) => string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-sage-100 bg-white/95 px-3 py-2 text-xs shadow-lg backdrop-blur">
      {label && <div className="mb-1 font-semibold capitalize text-sage-950">{label}</div>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 py-0.5">
          <span className="size-2.5 rounded-sm" style={{ background: p.color ?? p.payload?.fill }} />
          <span className="text-stone-500">{p.name}</span>
          <span className="num ml-auto pl-3 font-semibold text-sage-950">{formatter(Number(p.value) || 0)}</span>
        </div>
      ))}
    </div>
  )
}

export function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-stone-600">
      {items.map((i) => (
        <span key={i.label} className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm" style={{ background: i.color }} />
          {i.label}
        </span>
      ))}
    </div>
  )
}

/** Fila etiqueta / valor para resúmenes. */
export function Row({ label, value, strong, tone, icon }: { label: ReactNode; value: ReactNode; strong?: boolean; tone?: 'neg' | 'pos'; icon?: ReactNode }) {
  return (
    <div className={cx('flex items-center justify-between gap-3 py-2', strong && 'border-t border-sage-100 pt-3')}>
      <span className={cx('flex items-center gap-2 text-sm', strong ? 'font-semibold text-sage-950' : 'text-stone-600')}>
        {icon}
        {label}
      </span>
      <span className={cx('num text-sm', strong ? 'text-base font-bold' : 'font-semibold', tone === 'neg' ? 'text-red-700' : tone === 'pos' ? 'text-sage-700' : 'text-sage-950')}>{value}</span>
    </div>
  )
}
