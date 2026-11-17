const copFormatter = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 })

/** $1.200.000 — negative values as -$1.200.000 */
export function cop(value: number): string {
  if (!Number.isFinite(value)) return '$0'
  const rounded = Math.round(value)
  const sign = rounded < 0 ? '-' : ''
  return `${sign}$${copFormatter.format(Math.abs(rounded))}`
}

/** Compact: $1,2 M / $480 mil */
export function copShort(value: number): string {
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toLocaleString('es-CO', { maximumFractionDigits: 1 })} M`
  if (abs >= 1_000) return `${sign}$${Math.round(abs / 1_000)} mil`
  return cop(value)
}

/** Parses "1.200.000", "$ 1200000", "1,5" → number (digits only, COP has no cents) */
export function parseCop(text: string): number {
  const digits = text.replace(/[^\d]/g, '')
  return digits ? Number(digits) : 0
}

export function pct(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return '0 %'
  return `${(value * 100).toLocaleString('es-CO', { maximumFractionDigits: digits, minimumFractionDigits: 0 })} %`
}

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

export function monthName(m: number) {
  return MONTHS[m]
}

export function monthLabel(ym: string) {
  const [y, m] = ym.split('-').map(Number)
  return `${MONTHS[m - 1]} ${y}`
}

export function formatDate(iso: string) {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m) return iso
  return `${d ? `${d} ` : ''}${MONTHS[m - 1].slice(0, 3)} ${y}`
}

export function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function currentYM() {
  return todayISO().slice(0, 7)
}

export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
}
