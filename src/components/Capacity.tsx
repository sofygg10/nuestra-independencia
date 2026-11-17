import { AlertTriangle, CheckCircle2, HeartHandshake } from 'lucide-react'
import { useStore } from '../store/store'
import { personSummary } from '../lib/finance'
import { cop, pct } from '../lib/format'
import { PERSON_COLOR } from '../lib/colors'
import { cx } from './ui'
import type { PersonId } from '../types'

/** Mensaje de capacidad: si el aporte que le toca cabe en lo que puede dar. */
export function CapacityNote({ id, compact }: { id: PersonId; compact?: boolean }) {
  const { data, ym } = useStore()
  const s = personSummary(data, id, ym)
  const name = s.person.name
  const over = s.remaining < 0
  const noIncome = s.income === 0 && s.contribution === 0

  const tone = noIncome ? 'bg-stone-50 text-stone-600' : over ? 'bg-red-50 text-red-800' : 'bg-emerald-50 text-emerald-900'
  const Icon = noIncome ? HeartHandshake : over ? AlertTriangle : CheckCircle2
  const text = noIncome
    ? `${name} no tiene ingresos este mes: no se le asigna aporte.`
    : over
      ? `${name} se excede por ${cop(-s.remaining)} de lo que puede dar.`
      : `${name} puede ayudar con ${cop(s.remaining)} más.`

  return (
    <div className={cx('flex gap-2.5 rounded-xl px-3 py-2.5 text-sm', tone)}>
      <Icon size={17} className="mt-0.5 shrink-0" />
      <div>
        <div className="font-semibold">{text}</div>
        {!compact && !noIncome && (
          <div className="mt-0.5 text-xs opacity-80">
            {over
              ? 'Pueden bajar su porcentaje en Aportes proporcionales, pasarle un gasto al otro en Gastos del hogar o ajustar su tablita.'
              : 'Es lo que le sobra después de su aporte y de sus propias cosas.'}
          </div>
        )}
      </div>
    </div>
  )
}

/** Tarjetas lado a lado: cuánto le toca a cada uno y si le alcanza. */
export function CapacityCards() {
  const { data, ym } = useStore()
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {(['me', 'juan'] as PersonId[]).map((id) => {
        const s = personSummary(data, id, ym)
        return (
          <div key={id} className="rounded-2xl border border-sage-100 bg-white p-4">
            <div className="flex items-center gap-2">
              <span className="size-2.5 rounded-full" style={{ background: PERSON_COLOR[id] }} />
              <span className="font-semibold text-sage-950">{s.person.name}</span>
              <span className="text-xs text-stone-500">· {pct(s.share, 1)} de lo compartido</span>
              <span className="num ml-auto text-lg font-bold text-sage-950">{cop(s.contribution)}</span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-stone-500 sm:grid-cols-4">
              <span>
                Hogar <b className="num text-sage-950">{cop(s.householdContribution)}</b>
              </span>
              <span>
                Mascotas <b className="num text-sage-950">{cop(s.petsContribution)}</b>
              </span>
              <span>
                Cuotas <b className="num text-sage-950">{cop(s.debtContribution)}</b>
              </span>
              <span>
                Puede dar <b className="num text-sage-950">{cop(s.capacity)}</b>
              </span>
            </div>
            {s.assignedOwn > 0 && <div className="mt-1 text-xs text-stone-500">Incluye {cop(s.assignedOwn)} asignado solo a {s.person.name}.</div>}
            <div className="mt-3">
              <CapacityNote id={id} compact />
            </div>
          </div>
        )
      })}
    </div>
  )
}
